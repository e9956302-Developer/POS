import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { query } from "../../db/pool.js";
import { todayString } from "../../utils/http.js";
import { assertBranchAccess, businessScopeCondition, businessScopeParams, isBusinessAdmin } from "../../middleware/auth.js";

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
                COALESCE(SUM(paid_amount), 0) AS collected,
                COALESCE(SUM(subtotal), 0) AS subtotal,
                COALESCE(SUM(discount_amount), 0) AS totalDiscounts,
                COALESCE(SUM(tax_amount), 0) AS totalTax,
                COUNT(DISTINCT so.id) AS orderCount
         FROM sale_orders so
         JOIN branches b ON b.id = so.branch_id
         WHERE so.sale_date = :date
           AND COALESCE(so.is_deleted, 0) = 0
           AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
        params
      )
    ]);

    const canViewProfit = isBusinessAdmin(req.user) || req.user.role_name === "top_admin";
    const monthStart = `${date.slice(0, 7)}-01`;
    const mtdParams = { ...params, monthStart };

    const [
      [purchases],
      [expenses],
      [stock],
      [receivables],
      [payables],
      notifications,
      cogsResult,
      refundsResult,
      repairsResult,
      mtdSalesResult,
      mtdCogsResult,
      mtdRefundsResult,
      mtdRepairsResult,
      mtdExpensesResult
    ] = await Promise.all([
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
      ),
      // --- Profit queries (only if authorized) ---
      canViewProfit
        ? query(
            `SELECT COALESCE(SUM(CASE 
               WHEN soi.mobile_unit_id IS NOT NULL THEN COALESCE(mu.cost_price, 0)
               WHEN soi.product_id IS NOT NULL THEN COALESCE(p.cost_price, 0) * COALESCE(soi.quantity, 1)
               ELSE 0
             END), 0) AS totalCogs
             FROM sale_order_items soi
             JOIN sale_orders so ON so.id = soi.sale_order_id
             JOIN branches b ON b.id = so.branch_id
             LEFT JOIN mobile_units mu ON mu.id = soi.mobile_unit_id
             LEFT JOIN products p ON p.id = soi.product_id
             WHERE so.sale_date = :date
               AND COALESCE(so.is_deleted, 0) = 0
               AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
            params
          )
        : Promise.resolve([{ totalCogs: 0 }]),
      canViewProfit
        ? query(
            `SELECT COALESCE(SUM(r.total_refund_amount), 0) AS totalRefunds,
                    COUNT(r.id) AS returnCount
             FROM order_returns r
             JOIN branches b ON b.id = r.branch_id
             WHERE r.return_date = :date
               AND r.return_type = 'customer_return'
               AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
            params
          )
        : Promise.resolve([{ totalRefunds: 0, returnCount: 0 }]),
      canViewProfit
        ? query(
            `SELECT COALESCE(SUM(rt.actual_cost), 0) AS repairRevenue,
                    COUNT(rt.id) AS repairCount
             FROM repair_tickets rt
             JOIN branches b ON b.id = rt.branch_id
             WHERE rt.status = 'delivered'
               AND (
                 (rt.delivered_date IS NOT NULL AND rt.delivered_date = :date)
                 OR (rt.delivered_date IS NULL AND rt.received_date = :date)
               )
               AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
            params
          )
        : Promise.resolve([{ repairRevenue: 0, repairCount: 0 }]),
      // --- Month to Date (MTD) Profit queries ---
      canViewProfit
        ? query(
            `SELECT COALESCE(SUM(so.total_amount), 0) AS totalSales,
                    COUNT(DISTINCT so.id) AS orderCount
             FROM sale_orders so
             JOIN branches b ON b.id = so.branch_id
             WHERE so.sale_date >= :monthStart AND so.sale_date <= :date
               AND COALESCE(so.is_deleted, 0) = 0
               AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
            mtdParams
          )
        : Promise.resolve([{ totalSales: 0, orderCount: 0 }]),
      canViewProfit
        ? query(
            `SELECT COALESCE(SUM(CASE 
               WHEN soi.mobile_unit_id IS NOT NULL THEN COALESCE(mu.cost_price, 0)
               WHEN soi.product_id IS NOT NULL THEN COALESCE(p.cost_price, 0) * COALESCE(soi.quantity, 1)
               ELSE 0
             END), 0) AS totalCogs
             FROM sale_order_items soi
             JOIN sale_orders so ON so.id = soi.sale_order_id
             JOIN branches b ON b.id = so.branch_id
             LEFT JOIN mobile_units mu ON mu.id = soi.mobile_unit_id
             LEFT JOIN products p ON p.id = soi.product_id
             WHERE so.sale_date >= :monthStart AND so.sale_date <= :date
               AND COALESCE(so.is_deleted, 0) = 0
               AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
            mtdParams
          )
        : Promise.resolve([{ totalCogs: 0 }]),
      canViewProfit
        ? query(
            `SELECT COALESCE(SUM(r.total_refund_amount), 0) AS totalRefunds
             FROM order_returns r
             JOIN branches b ON b.id = r.branch_id
             WHERE r.return_date >= :monthStart AND r.return_date <= :date
               AND r.return_type = 'customer_return'
               AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
            mtdParams
          )
        : Promise.resolve([{ totalRefunds: 0 }]),
      canViewProfit
        ? query(
            `SELECT COALESCE(SUM(rt.actual_cost), 0) AS repairRevenue
             FROM repair_tickets rt
             JOIN branches b ON b.id = rt.branch_id
             WHERE rt.status = 'delivered'
               AND (
                 (rt.delivered_date IS NOT NULL AND rt.delivered_date >= :monthStart AND rt.delivered_date <= :date)
                 OR (rt.delivered_date IS NULL AND rt.received_date >= :monthStart AND rt.received_date <= :date)
               )
               AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
            mtdParams
          )
        : Promise.resolve([{ repairRevenue: 0 }]),
      canViewProfit
        ? query(
            `SELECT COALESCE(SUM(amount), 0) AS totalExpenses
             FROM expenses e
             JOIN branches b ON b.id = e.branch_id
             WHERE e.expense_date >= :monthStart AND e.expense_date <= :date
               AND COALESCE(e.is_deleted, 0) = 0
               AND ${businessScopeCondition(req.user, "b")}${branchFilter}`,
            mtdParams
          )
        : Promise.resolve([{ totalExpenses: 0 }])
    ]);

    let profit = null;
    if (canViewProfit) {
      const cogsRow = cogsResult[0] || {};
      const refundsRow = refundsResult[0] || {};
      const repairsRow = repairsResult[0] || {};
      const mtdSalesRow = mtdSalesResult[0] || {};
      const mtdCogsRow = mtdCogsResult[0] || {};
      const mtdRefundsRow = mtdRefundsResult[0] || {};
      const mtdRepairsRow = mtdRepairsResult[0] || {};
      const mtdExpensesRow = mtdExpensesResult[0] || {};

      const dailyGrossSales = Number(sales.totalSales || 0);
      const dailyRefunds = Number(refundsRow?.totalRefunds || 0);
      const dailyRepairs = Number(repairsRow?.repairRevenue || 0);
      const dailyNetTurnover = Math.max(0, dailyGrossSales - dailyRefunds) + dailyRepairs;
      const dailyCogs = Number(cogsRow?.totalCogs || 0);
      const dailyGrossProfit = dailyNetTurnover - dailyCogs;
      const dailyExpenses = Number(expenses.totalExpenses || 0);
      const dailyNetProfit = dailyGrossProfit - dailyExpenses;
      const dailyGrossMarginPct = dailyNetTurnover > 0 ? ((dailyGrossProfit / dailyNetTurnover) * 100).toFixed(2) : "0.00";
      const dailyNetMarginPct = dailyNetTurnover > 0 ? ((dailyNetProfit / dailyNetTurnover) * 100).toFixed(2) : "0.00";

      const mtdSales = Number(mtdSalesRow?.totalSales || 0);
      const mtdRefunds = Number(mtdRefundsRow?.totalRefunds || 0);
      const mtdRepairs = Number(mtdRepairsRow?.repairRevenue || 0);
      const mtdNetTurnover = Math.max(0, mtdSales - mtdRefunds) + mtdRepairs;
      const mtdCogs = Number(mtdCogsRow?.totalCogs || 0);
      const mtdGrossProfit = mtdNetTurnover - mtdCogs;
      const mtdExpenses = Number(mtdExpensesRow?.totalExpenses || 0);
      const mtdNetProfit = mtdGrossProfit - mtdExpenses;
      const mtdGrossMarginPct = mtdNetTurnover > 0 ? ((mtdGrossProfit / mtdNetTurnover) * 100).toFixed(2) : "0.00";
      const mtdNetMarginPct = mtdNetTurnover > 0 ? ((mtdNetProfit / mtdNetTurnover) * 100).toFixed(2) : "0.00";

      profit = {
        grossSales: dailyGrossSales,
        saleRefunds: dailyRefunds,
        repairRevenue: dailyRepairs,
        netTurnover: dailyNetTurnover,
        totalCogs: dailyCogs,
        grossProfit: dailyGrossProfit,
        grossMarginPct: dailyGrossMarginPct,
        totalExpenses: dailyExpenses,
        netProfit: dailyNetProfit,
        netMarginPct: dailyNetMarginPct,
        isProfitable: dailyNetProfit >= 0,
        mtd: {
          monthStart,
          sales: mtdSales,
          refunds: mtdRefunds,
          repairs: mtdRepairs,
          netTurnover: mtdNetTurnover,
          totalCogs: mtdCogs,
          grossProfit: mtdGrossProfit,
          grossMarginPct: mtdGrossMarginPct,
          expenses: mtdExpenses,
          netProfit: mtdNetProfit,
          netMarginPct: mtdNetMarginPct,
          isProfitable: mtdNetProfit >= 0
        }
      };
    }

    res.json({
      date,
      sales,
      purchases,
      expenses,
      stock,
      receivables,
      payables,
      notifications,
      profit
    });
  })
);

