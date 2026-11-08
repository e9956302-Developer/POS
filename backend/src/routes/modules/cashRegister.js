import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest, todayString } from "../../utils/http.js";
import { query } from "../../db/pool.js";
import { assertBranchAccess, requirePermission } from "../../middleware/auth.js";

export const cashRegisterRouter = Router();

async function cashSummary(branchId, date) {
  const [payments] = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END), 0) AS cashIn,
       COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END), 0) AS cashOut
     FROM payments
     WHERE branch_id = :branchId
       AND payment_date = :date
       AND payment_method = 'cash'`,
    { branchId, date }
  );

  const [expenses] = await query(
    `SELECT COALESCE(SUM(amount), 0) AS expenses
     FROM expenses
     WHERE branch_id = :branchId
       AND expense_date = :date
       AND COALESCE(is_deleted, 0) = 0`,
    { branchId, date }
  );

  return {
    cashIn: Number(payments.cashIn || 0),
    cashOut: Number(payments.cashOut || 0),
    expenses: Number(expenses.expenses || 0)
  };
}

cashRegisterRouter.get(
  "/session",
  asyncHandler(async (req, res) => {
    const branchId = req.query.branchId || req.user.branch_id;
    const date = req.query.date || todayString();
    await assertBranchAccess(req.user, branchId);

    const [session] = await query(
      `SELECT *
       FROM cash_register_sessions
       WHERE branch_id = :branchId
         AND business_date = :date`,
      { branchId, date }
    );
    const summary = await cashSummary(branchId, date);
    const openingCash = Number(session?.opening_cash || 0);
    const expectedCash = openingCash + summary.cashIn - summary.cashOut - summary.expenses;

    res.json({ session: session || null, summary: { ...summary, openingCash, expectedCash } });
  })
);

cashRegisterRouter.post(
  "/open",
  requirePermission("cash_register", "create"),
  asyncHandler(async (req, res) => {
    const { branchId, businessDate = todayString(), openingCash = 0, notes } = req.body;
    await assertBranchAccess(req.user, branchId);

    const result = await query(
      `INSERT INTO cash_register_sessions
       (business_id, branch_id, business_date, opening_cash, status, opened_by, notes)
       VALUES (:businessId, :branchId, :businessDate, :openingCash, 'open', :openedBy, :notes)`,
      {
        businessId: req.user.business_id,
        branchId,
        businessDate,
        openingCash,
        openedBy: req.user.id,
        notes: notes || null
      }
    );

    const [session] = await query(`SELECT * FROM cash_register_sessions WHERE id = :id`, { id: result.insertId });
    res.status(201).json(session);
  })
);

cashRegisterRouter.post(
  "/close",
  requirePermission("cash_register", "close"),
  asyncHandler(async (req, res) => {
    const { branchId, businessDate = todayString(), actualCash, notes } = req.body;
    if (actualCash === undefined || actualCash === null || Number(actualCash) < 0) {
      throw badRequest("actualCash is required");
    }
    await assertBranchAccess(req.user, branchId);

    const [session] = await query(
      `SELECT *
       FROM cash_register_sessions
       WHERE branch_id = :branchId
         AND business_date = :businessDate`,
      { branchId, businessDate }
    );
    if (!session) {
      throw badRequest("Cash register session is not open for this date");
    }
    if (session.status !== "open") {
      throw badRequest("Cash register session is already closed");
    }

    const summary = await cashSummary(branchId, businessDate);
    const expectedCash = Number(session.opening_cash) + summary.cashIn - summary.cashOut - summary.expenses;
    const discrepancy = Number(actualCash) - expectedCash;

    await query(
      `UPDATE cash_register_sessions
       SET expected_cash = :expectedCash,
           actual_cash = :actualCash,
           discrepancy = :discrepancy,
           status = 'pending_verification',
           closed_by = :closedBy,
           closed_at = CURRENT_TIMESTAMP,
           notes = :notes
       WHERE id = :id`,
      {
        id: session.id,
        expectedCash,
        actualCash,
        discrepancy,
        closedBy: req.user.id,
        notes: notes || session.notes
      }
    );

    const [saved] = await query(`SELECT * FROM cash_register_sessions WHERE id = :id`, { id: session.id });
    res.json(saved);
  })
);

cashRegisterRouter.post(
  "/:id/verify",
  requirePermission("cash_register", "verify"),
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE cash_register_sessions
       SET status = 'closed', verified_by = :verifiedBy, verified_at = CURRENT_TIMESTAMP
       WHERE id = :id
         AND business_id = :businessId
         AND status = 'pending_verification'`,
      { id: req.params.id, businessId: req.user.business_id, verifiedBy: req.user.id }
    );

    const [session] = await query(
      `SELECT *
       FROM cash_register_sessions
       WHERE id = :id
         AND business_id = :businessId`,
      { id: req.params.id, businessId: req.user.business_id }
    );
    res.json(session);
  })
);
