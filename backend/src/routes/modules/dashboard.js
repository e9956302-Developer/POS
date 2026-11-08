import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { query } from "../../db/pool.js";
import { todayString } from "../../utils/http.js";
import { assertBranchAccess, businessScopeCondition, businessScopeParams } from "../../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const date = req.query.date || todayString();
    const branchId = req.query.branchId;
    if (branchId) {
      await assertBranchAccess(req.user, branchId, null, { allowExpiredForAdmin: true });
    }
    const branchFilter = branchId ? " AND b.id = :branchId" : "";
    const params = { ...businessScopeParams(req.user), ...(branchId ? { branchId } : {}), date };

    const [[sales]] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(total_amount), 0) AS totalSales,
                COALESCE(SUM(paid_amount), 0) AS collected
         FROM sale_orders so
         JOIN branches b ON b.id = so.branch_id
         WHERE so.sale_date = :date
           AND COALESCE(so.is_deleted, 0) = 0
           AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
        params
      )
    ]);

    const [[purchases], [expenses], [stock], [receivables], [payables], notifications] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(total_amount), 0) AS totalPurchases,
                COALESCE(SUM(paid_amount), 0) AS paidOut
         FROM purchase_orders po
         JOIN branches b ON b.id = po.branch_id
         WHERE po.purchase_date = :date
           AND COALESCE(po.is_deleted, 0) = 0
           AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
        params
      ),
      query(
        `SELECT COALESCE(SUM(amount), 0) AS totalExpenses
         FROM expenses e
         JOIN branches b ON b.id = e.branch_id
         WHERE e.expense_date = :date
           AND COALESCE(e.is_deleted, 0) = 0
           AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
        params
      ),
      query(
        `SELECT COUNT(*) AS inHandCount,
                COALESCE(SUM(cost_price), 0) AS stockValue
         FROM mobile_units mu
         JOIN branches b ON b.id = mu.branch_id
         WHERE mu.current_status = 'in_stock'
           AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
        params
      ),
      query(
        `SELECT COALESCE(SUM(balance_amount), 0) AS pendingReceivables,
                COALESCE(SUM(CASE WHEN due_date = :date THEN balance_amount ELSE 0 END), 0) AS dueToday,
                COALESCE(SUM(CASE WHEN due_date < :date THEN balance_amount ELSE 0 END), 0) AS overdue
         FROM receivables r
         JOIN branches b ON b.id = r.branch_id
         WHERE r.balance_amount > 0
           AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
        params
      ),
      query(
        `SELECT COALESCE(SUM(balance_amount), 0) AS pendingPayables
         FROM payables p
         JOIN branches b ON b.id = p.branch_id
         WHERE p.balance_amount > 0
           AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
        params
      ),
      query(
        `SELECT n.*, b.name AS branch_name, b.code AS branch_code
         FROM notifications n
         JOIN branches b ON b.id = n.branch_id
         WHERE n.is_read = 0
           AND ${businessScopeCondition(req.user, "b")}${branchFilter}
         ORDER BY n.created_at DESC LIMIT 10`,
        params
      )
    ]);

    res.json({
      date,
      sales,
      purchases,
      expenses,
      stock,
      receivables,
      payables,
      notifications
    });
  })
);

