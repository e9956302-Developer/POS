import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { query, withTransaction } from "../../db/pool.js";
import { createAuditLog } from "../../services/audit.js";
import {
  assertBranchAccess,
  businessScopeCondition,
  businessScopeParams,
  requirePermission
} from "../../middleware/auth.js";

export const expensesRouter = Router();

expensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { branchId, from, to, search, category } = req.query;
    let sql = `
      SELECT e.*
      FROM expenses e
      JOIN branches b ON b.id = e.branch_id
      WHERE ${businessScopeCondition(req.user, "b")}
        AND COALESCE(e.is_deleted, 0) = 0`;
    const params = businessScopeParams(req.user);

    if (branchId) {
      await assertBranchAccess(req.user, branchId);
      sql += ` AND e.branch_id = :branchId`;
      params.branchId = branchId;
    }
    if (category) {
      sql += ` AND e.category = :category`;
      params.category = category;
    }
    if (from) {
      sql += ` AND e.expense_date >= :from`;
      params.from = from;
    }
    if (to) {
      sql += ` AND e.expense_date <= :to`;
      params.to = to;
    }
    if (search) {
      sql += ` AND (e.title LIKE :search1 OR e.notes LIKE :search2 OR e.category LIKE :search3)`;
      params.search1 = `%${search}%`;
      params.search2 = `%${search}%`;
      params.search3 = `%${search}%`;
    }

    sql += ` ORDER BY e.expense_date DESC, e.id DESC`;
    res.json(await query(sql, params));
  })
);

expensesRouter.post(
  "/batch",
  requirePermission("expenses", "create"),
  asyncHandler(async (req, res) => {
    const { branchId, expenses } = req.body;
    if (!branchId || !Array.isArray(expenses) || expenses.length === 0) {
      throw badRequest("branchId and expenses are required");
    }
    await assertBranchAccess(req.user, branchId);

    const invalidExpense = expenses.find(
      (expense) =>
        !expense.category ||
        !expense.title ||
        !expense.expenseDate ||
        !expense.amount ||
        Number(expense.amount) <= 0
    );

    if (invalidExpense) {
      throw badRequest("Each expense needs category, title, expenseDate and amount");
    }

    const expenseIds = await withTransaction(async (connection) => {
      const savedIds = [];

      for (const expense of expenses) {
        const [result] = await connection.execute(
          `INSERT INTO expenses (branch_id, category, title, expense_date, amount, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            branchId,
            expense.category,
            expense.title,
            expense.expenseDate,
            expense.amount,
            expense.notes || null,
            req.user.id
          ]
        );
        savedIds.push(result.insertId);
      }

      return savedIds;
    });

    const idParams = Object.fromEntries(expenseIds.map((id, index) => [`id${index}`, id]));
    const placeholders = expenseIds.map((_, index) => `:id${index}`).join(", ");
    const saved = await query(`SELECT * FROM expenses WHERE id IN (${placeholders}) ORDER BY id DESC`, idParams);
    res.status(201).json({ expenses: saved });
  })
);

expensesRouter.post(
  "/",
  requirePermission("expenses", "create"),
  asyncHandler(async (req, res) => {
    const { branchId, category, title, expenseDate, amount, notes } = req.body;
    if (!branchId || !category || !title || !expenseDate || !amount) {
      throw badRequest("branchId, category, title, expenseDate and amount are required");
    }
    await assertBranchAccess(req.user, branchId);

    const result = await query(
      `INSERT INTO expenses (branch_id, category, title, expense_date, amount, notes, created_by)
       VALUES (:branchId, :category, :title, :expenseDate, :amount, :notes, :createdBy)`,
      { branchId, category, title, expenseDate, amount, notes, createdBy: req.user.id }
    );

    const [saved] = await query(`SELECT * FROM expenses WHERE id = :id`, { id: result.insertId });
    res.status(201).json(saved);
  })
);

expensesRouter.put(
  "/:id",
  requirePermission("expenses", "edit"),
  asyncHandler(async (req, res) => {
    const [expense] = await query(
      `SELECT e.*, b.business_id
       FROM expenses e
       JOIN branches b ON b.id = e.branch_id
       WHERE e.id = :id AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );
    if (!expense || expense.is_deleted) {
      throw badRequest("Expense not found or deleted");
    }

    const { category, title, expenseDate, amount, notes, branchId } = req.body;
    const targetBranchId = branchId ? Number(branchId) : expense.branch_id;
    if (branchId) {
      await assertBranchAccess(req.user, targetBranchId);
    }

    await query(
      `UPDATE expenses
       SET branch_id = :branchId,
           category = COALESCE(:category, category),
           title = COALESCE(:title, title),
           expense_date = COALESCE(:expenseDate, expense_date),
           amount = COALESCE(:amount, amount),
           notes = :notes
       WHERE id = :id`,
      {
        id: expense.id,
        branchId: targetBranchId,
        category: category || expense.category,
        title: title ? String(title).trim() : expense.title,
        expenseDate: expenseDate || expense.expense_date,
        amount: amount !== undefined ? Number(amount) : expense.amount,
        notes: notes !== undefined ? (notes ? String(notes).trim() : null) : expense.notes
      }
    );

    const [updated] = await query(`SELECT * FROM expenses WHERE id = :id`, { id: expense.id });
    res.json(updated);
  })
);

expensesRouter.delete(
  "/:id",
  requirePermission("expenses", "delete"),
  asyncHandler(async (req, res) => {
    const { reason = "Expense record deleted by staff" } = req.body || {};
    const [expense] = await query(
      `SELECT e.*, b.business_id
       FROM expenses e
       JOIN branches b ON b.id = e.branch_id
       WHERE e.id = :id AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );
    if (!expense) {
      const error = new Error("Expense not found");
      error.status = 404;
      throw error;
    }
    if (expense.is_deleted) {
      throw badRequest("Expense is already deleted");
    }

    await withTransaction(async (connection) => {
      await connection.execute(
        `UPDATE expenses
         SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?, deletion_reason = ?
         WHERE id = ?`,
        [req.user.id, reason, expense.id]
      );

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "delete",
        entityType: "expense",
        entityId: expense.id,
        details: { title: expense.title, amount: expense.amount, reason }
      });
    });

    res.json({ message: "Expense deleted successfully", id: expense.id });
  })
);

