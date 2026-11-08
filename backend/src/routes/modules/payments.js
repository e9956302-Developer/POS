import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { withTransaction } from "../../db/pool.js";
import { assertBranchAccess } from "../../middleware/auth.js";
import { createAuditLog } from "../../services/audit.js";

export const paymentsRouter = Router();

paymentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { referenceType, referenceId, branchId, paymentMethod, amount, paymentDate, notes } = req.body;
    const idempotencyKey = (req.headers["idempotency-key"] || req.body.idempotencyKey || "").toString().trim() || null;

    if (!referenceType || !referenceId || !branchId || !paymentMethod || !amount || !paymentDate) {
      throw badRequest("referenceType, referenceId, branchId, paymentMethod, amount and paymentDate are required");
    }
    if (!["sale", "purchase"].includes(referenceType)) {
      throw badRequest("referenceType must be sale or purchase");
    }
    if (Number(amount) <= 0) {
      throw badRequest("Payment amount must be greater than zero");
    }

    const result = await withTransaction(async (connection) => {
      const isSale = referenceType === "sale";
      const ledgerTable = isSale ? "receivables" : "payables";
      const orderTable = isSale ? "sale_orders" : "purchase_orders";
      const direction = isSale ? "in" : "out";

      const [entries] = await connection.execute(
        `SELECT * FROM ${ledgerTable}
         WHERE ${isSale ? "sale_order_id" : "purchase_order_id"} = ?
         FOR UPDATE`,
        [referenceId]
      );

      if (!entries.length) {
        throw badRequest(`No ${ledgerTable} entry found for this order`);
      }

      const ledger = entries[0];
      await assertBranchAccess(req.user, ledger.branch_id, connection);
      if (Number(branchId) !== Number(ledger.branch_id)) {
        throw badRequest("Payment branch does not match the referenced order");
      }

      if (idempotencyKey) {
        const [existingPayments] = await connection.execute(
          `SELECT id
           FROM payments
           WHERE created_by = ?
             AND idempotency_key = ?
           LIMIT 1`,
          [req.user.id, idempotencyKey]
        );
        if (existingPayments.length) {
          return {
            paidAmount: Number(ledger.paid_amount),
            balanceAmount: Number(ledger.balance_amount),
            status: ledger.status,
            duplicate: true
          };
        }
      }

      const nextPaid = Number(ledger.paid_amount) + Number(amount);
      const nextBalance = Number(ledger.total_amount) - nextPaid;
      if (nextBalance < 0) {
        throw badRequest("Payment is greater than pending balance");
      }
      const status = nextBalance <= 0 ? "paid" : nextPaid > 0 ? "partial" : "pending";

      await connection.execute(
        `INSERT INTO payments
        (reference_type, reference_id, direction, branch_id, party_id, payment_method, amount, payment_date, idempotency_key, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          referenceType,
          referenceId,
          direction,
          ledger.branch_id,
          ledger.party_id || null,
          paymentMethod,
          amount,
          paymentDate,
          idempotencyKey,
          notes || null,
          req.user.id
        ]
      );

      await connection.execute(
        `UPDATE ${ledgerTable}
         SET paid_amount = ?, balance_amount = ?, status = ?
         WHERE id = ?`,
        [nextPaid, nextBalance, status, ledger.id]
      );

      await connection.execute(
        `UPDATE ${orderTable}
         SET paid_amount = ?, balance_amount = ?
         WHERE id = ?`,
        [nextPaid, nextBalance, referenceId]
      );

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "create_payment",
        entityType: referenceType,
        entityId: referenceId,
        details: { amount, paymentMethod }
      });

      return { paidAmount: nextPaid, balanceAmount: nextBalance, status };
    });

    res.status(201).json(result);
  })
);
