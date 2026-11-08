import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { query } from "../../db/pool.js";
import { assertBranchAccess, businessScopeCondition, businessScopeParams, isBusinessAdmin } from "../../middleware/auth.js";
import { badRequest } from "../../utils/http.js";

export const reportsRouter = Router();

function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolvePeriod(period = "this_month", customStart, customEnd) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (period === "custom") {
    const s = customStart || formatLocalDate(new Date(year, month, 1));
    const e = customEnd || formatLocalDate(now);
    return {
      key: "custom",
      label: `Custom Period (${s} to ${e})`,
      startDate: s,
      endDate: e
    };
  }

  if (period === "this_month") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      key: "this_month",
      label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end)
    };
  }

  if (period === "last_month") {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      key: "last_month",
      label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end)
    };
  }

  if (period === "this_quarter") {
    const qIndex = Math.floor(month / 3);
    const startMonth = qIndex * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0);
    return {
      key: "this_quarter",
      label: `Q${qIndex + 1} ${year} (${start.toLocaleDateString("en-US", { month: "short" })} - ${end.toLocaleDateString("en-US", { month: "short" })})`,
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end)
    };
  }

  if (period === "last_quarter") {
    let qIndex = Math.floor(month / 3) - 1;
    let qYear = year;
    if (qIndex < 0) {
      qIndex = 3;
      qYear -= 1;
    }
    const startMonth = qIndex * 3;
    const start = new Date(qYear, startMonth, 1);
    const end = new Date(qYear, startMonth + 3, 0);
    return {
      key: "last_quarter",
      label: `Q${qIndex + 1} ${qYear} (${start.toLocaleDateString("en-US", { month: "short" })} - ${end.toLocaleDateString("en-US", { month: "short" })})`,
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end)
    };
  }

  if (period === "this_year") {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return {
      key: "this_year",
      label: `Full Year ${year}`,
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end)
    };
  }

  // Fallback: this month
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    key: "this_month",
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end)
  };
}

reportsRouter.get(
  "/inventory",
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT b.name AS branch_name, mm.company, mm.model_name, COUNT(*) AS quantity, COALESCE(SUM(mu.cost_price), 0) AS stock_value
       FROM mobile_units mu
       JOIN branches b ON b.id = mu.branch_id
       JOIN mobile_models mm ON mm.id = mu.model_id
       WHERE mu.current_status = 'in_stock'
         AND ${businessScopeCondition(req.user, "b")}
       GROUP BY b.name, mm.company, mm.model_name
       ORDER BY b.name, mm.company, mm.model_name`,
      businessScopeParams(req.user)
    );
    res.json(rows);
  })
);

reportsRouter.get(
  "/receivables",
  asyncHandler(async (req, res) => {
    const scopeParams = businessScopeParams(req.user);
    const invoiceRows = await query(
      `SELECT r.*, so.invoice_number, p.name AS party_name, 'sale_invoice' AS record_type
       FROM receivables r
       JOIN branches b ON b.id = r.branch_id
       JOIN sale_orders so ON so.id = r.sale_order_id
       LEFT JOIN parties p ON p.id = r.party_id
       WHERE r.balance_amount > 0
         AND ${businessScopeCondition(req.user, "b")}
       ORDER BY r.due_date IS NULL, r.due_date, r.created_at DESC`,
      scopeParams
    );

    const openingRows = await query(
      `SELECT
         p.id AS id,
         NULL AS sale_order_id,
         p.id AS party_id,
         p.branch_id,
         p.opening_balance AS total_amount,
         0 AS paid_amount,
         p.opening_balance AS balance_amount,
         p.opening_balance_date AS due_date,
         'pending' AS status,
         p.created_at,
         'OPENING-BAL' AS invoice_number,
         p.name AS party_name,
         'opening_balance' AS record_type
       FROM parties p
       WHERE p.business_id = :businessId
         AND p.opening_balance > 0
         AND (p.opening_balance_type = 'receivable' OR (p.opening_balance_type IS NULL AND p.party_type = 'customer'))
         ${req.user.branch_id && !isBusinessAdmin(req.user) ? "AND (p.branch_id = :userBranchId OR p.branch_id IS NULL)" : ""}`,
      scopeParams
    );

    res.json([...invoiceRows, ...openingRows]);
  })
);

reportsRouter.get(
  "/payables",
  asyncHandler(async (req, res) => {
    const scopeParams = businessScopeParams(req.user);
    const orderRows = await query(
      `SELECT pbl.*, po.invoice_number, p.name AS party_name, 'purchase_invoice' AS record_type
       FROM payables pbl
       JOIN branches b ON b.id = pbl.branch_id
       JOIN purchase_orders po ON po.id = pbl.purchase_order_id
       LEFT JOIN parties p ON p.id = pbl.party_id
       WHERE pbl.balance_amount > 0
         AND ${businessScopeCondition(req.user, "b")}
       ORDER BY pbl.due_date IS NULL, pbl.due_date, pbl.created_at DESC`,
      scopeParams
    );

    const openingRows = await query(
      `SELECT
         p.id AS id,
         NULL AS purchase_order_id,
         p.id AS party_id,
         p.branch_id,
         p.opening_balance AS total_amount,
         0 AS paid_amount,
         p.opening_balance AS balance_amount,
         p.opening_balance_date AS due_date,
         'pending' AS status,
         p.created_at,
         'OPENING-BAL' AS invoice_number,
         p.name AS party_name,
         'opening_balance' AS record_type
       FROM parties p
       WHERE p.business_id = :businessId
         AND p.opening_balance > 0
         AND (p.opening_balance_type = 'payable' OR (p.opening_balance_type IS NULL AND p.party_type = 'vendor'))
         ${req.user.branch_id && !isBusinessAdmin(req.user) ? "AND (p.branch_id = :userBranchId OR p.branch_id IS NULL)" : ""}`,
      scopeParams
    );

    res.json([...orderRows, ...openingRows]);
  })
);

// =========================================================================
// 4. BRANCH DIVIDEND PAYOUT & PROFIT DISTRIBUTION REPORT
// =========================================================================
reportsRouter.get(
  "/dividends",
  asyncHandler(async (req, res) => {
    let branchId = req.query.branchId;
    if (!branchId) {
      branchId = req.user.branch_id;
    }
    if (!branchId) {
      const [firstBranch] = await query(
        "SELECT id, name FROM branches WHERE business_id = ? ORDER BY id ASC LIMIT 1",
        [req.user.business_id]
      );
      if (!firstBranch) {
        throw badRequest("No active branches found for this company");
      }
      branchId = firstBranch.id;
    }

    await assertBranchAccess(req.user, branchId);

    const [branch] = await query(
      "SELECT id, name, code, address FROM branches WHERE id = ? AND business_id = ?",
      [branchId, req.user.business_id]
    );
    if (!branch) {
      throw badRequest("Branch not found");
    }

    const { period = "this_month", startDate, endDate } = req.query;
    const resolvedPeriod = resolvePeriod(period, startDate, endDate);

    // 1. Sales & Revenue
    const [salesRow] = await query(
      `SELECT 
         COALESCE(SUM(so.total_amount), 0) AS gross_sales,
         COALESCE(SUM(so.tax_amount), 0) AS total_tax,
         COALESCE(SUM(so.discount_amount), 0) AS total_discounts,
         COALESCE(SUM(so.subtotal), 0) AS net_sales,
         COUNT(DISTINCT so.id) AS total_orders
       FROM sale_orders so
       WHERE so.branch_id = :branchId
         AND so.sale_date >= :startDate
         AND so.sale_date <= :endDate
         AND COALESCE(so.is_deleted, 0) = 0`,
      { branchId, startDate: resolvedPeriod.startDate, endDate: resolvedPeriod.endDate }
    );

    // 2. Cost of Goods Sold (COGS)
    const [cogsRow] = await query(
      `SELECT 
         COALESCE(SUM(CASE 
           WHEN soi.mobile_unit_id IS NOT NULL THEN COALESCE(mu.cost_price, 0)
           WHEN soi.product_id IS NOT NULL THEN COALESCE(p.cost_price, 0) * COALESCE(soi.quantity, 1)
           ELSE 0
         END), 0) AS total_cogs
       FROM sale_order_items soi
       JOIN sale_orders so ON so.id = soi.sale_order_id
       LEFT JOIN mobile_units mu ON mu.id = soi.mobile_unit_id
       LEFT JOIN products p ON p.id = soi.product_id
       WHERE so.branch_id = :branchId
         AND so.sale_date >= :startDate
         AND so.sale_date <= :endDate
         AND COALESCE(so.is_deleted, 0) = 0`,
      { branchId, startDate: resolvedPeriod.startDate, endDate: resolvedPeriod.endDate }
    );

    // 3. Customer Sale Returns (Refunds)
    const [returnsRow] = await query(
      `SELECT 
         COALESCE(SUM(r.total_refund_amount), 0) AS total_refunds,
         COUNT(r.id) AS return_count
       FROM order_returns r
       WHERE r.business_id = :businessId
         AND r.branch_id = :branchId
         AND r.return_type = 'customer_return'
         AND r.return_date >= :startDate
         AND r.return_date <= :endDate`,
      { businessId: req.user.business_id, branchId, startDate: resolvedPeriod.startDate, endDate: resolvedPeriod.endDate }
    );

    // 4. Operating Expenses (including salaries)
    const [expensesRow] = await query(
      `SELECT 
         COALESCE(SUM(e.amount), 0) AS total_expenses,
         COUNT(e.id) AS expense_count
       FROM expenses e
       WHERE e.branch_id = :branchId
         AND e.expense_date >= :startDate
         AND e.expense_date <= :endDate
         AND COALESCE(e.is_deleted, 0) = 0`,
      { branchId, startDate: resolvedPeriod.startDate, endDate: resolvedPeriod.endDate }
    );

    // 5. Expense Breakdown by Category
    const expenseBreakdown = await query(
      `SELECT 
         COALESCE(e.category, 'other') AS category,
         COALESCE(SUM(e.amount), 0) AS amount,
         COUNT(e.id) AS count
       FROM expenses e
       WHERE e.branch_id = :branchId
         AND e.expense_date >= :startDate
         AND e.expense_date <= :endDate
         AND COALESCE(e.is_deleted, 0) = 0
       GROUP BY COALESCE(e.category, 'other')
       ORDER BY amount DESC`,
      { branchId, startDate: resolvedPeriod.startDate, endDate: resolvedPeriod.endDate }
    );

    // 6. Delivered Repairs Income
    const [repairsRow] = await query(
      `SELECT 
         COALESCE(SUM(rt.actual_cost), 0) AS repair_revenue,
         COUNT(rt.id) AS repair_count
       FROM repair_tickets rt
       WHERE rt.branch_id = :branchId
         AND rt.status = 'delivered'
         AND (
           (rt.delivered_date IS NOT NULL AND rt.delivered_date >= :startDate AND rt.delivered_date <= :endDate)
           OR (rt.delivered_date IS NULL AND rt.received_date >= :startDate AND rt.received_date <= :endDate)
         )`,
      { branchId, startDate: resolvedPeriod.startDate, endDate: resolvedPeriod.endDate }
    );

    // 7. Calculate Financial Totals
    const grossSales = Number(salesRow?.gross_sales || 0);
    const netSales = Number(salesRow?.net_sales || 0);
    const totalTax = Number(salesRow?.total_tax || 0);
    const totalOrders = Number(salesRow?.total_orders || 0);
    const totalCogs = Number(cogsRow?.total_cogs || 0);
    const saleRefunds = Number(returnsRow?.total_refunds || 0);
    const totalExpenses = Number(expensesRow?.total_expenses || 0);
    const repairRevenue = Number(repairsRow?.repair_revenue || 0);

    const adjustedRevenue = Math.max(0, netSales - saleRefunds) + repairRevenue;
    const grossProfit = adjustedRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPct = adjustedRevenue > 0 ? ((grossProfit / adjustedRevenue) * 100).toFixed(2) : "0.00";
    const netMarginPct = adjustedRevenue > 0 ? ((netProfit / adjustedRevenue) * 100).toFixed(2) : "0.00";

    // 8. Fetch Partner Equity & Dividend Shares for this Branch
    const partnerShares = await query(
      `SELECT 
         p.id AS partner_id,
         p.name AS partner_name,
         p.phone,
         p.cnic,
         COALESCE(pbs.share_percentage, 0) AS share_percentage
       FROM partners p
       LEFT JOIN partner_branch_shares pbs 
         ON pbs.partner_id = p.id AND pbs.branch_id = :branchId
       WHERE p.business_id = :businessId 
         AND p.is_active = 1
       ORDER BY pbs.share_percentage DESC, p.name ASC`,
      { businessId: req.user.business_id, branchId }
    );

    const resolvedPeriodLabel = resolvedPeriod?.label || (period === "this_month" ? "This Month" : period);

    // Fetch already disbursed dividends for this branch and period
    const paidDividends = await query(
      `SELECT pt.partner_id, pt.voucher_number, pt.amount, pt.payment_method, pt.transaction_date, pt.created_at
       FROM partner_transactions pt
       WHERE pt.business_id = :businessId 
         AND pt.branch_id = :branchId 
         AND pt.transaction_type = 'dividend_payout'
         AND pt.period_label = :periodLabel`,
      { businessId: req.user.business_id, branchId, periodLabel: resolvedPeriodLabel }
    );

    const isProfitable = netProfit > 0;
    let totalConfiguredShare = 0;
    let totalDividendPayable = 0;

    const partnerDistributions = partnerShares.map((p) => {
      const sharePct = Number(p.share_percentage || 0);
      totalConfiguredShare += sharePct;

      const dividendAmount = isProfitable ? Number(((netProfit * sharePct) / 100).toFixed(2)) : 0;
      const lossShareAmount = !isProfitable ? Number(((Math.abs(netProfit) * sharePct) / 100).toFixed(2)) : 0;

      if (isProfitable) {
        totalDividendPayable += dividendAmount;
      }

      const paid = paidDividends.find((pd) => pd.partner_id === p.partner_id);
      const isPaid = !!paid;

      return {
        partnerId: p.partner_id,
        partnerName: p.partner_name,
        phone: p.phone,
        cnic: p.cnic,
        sharePercentage: sharePct,
        dividendAmount,
        lossShareAmount,
        status: !isProfitable 
          ? "Loss Allocated" 
          : isPaid 
          ? "Disbursed" 
          : dividendAmount > 0 
          ? "Payable" 
          : "No Equity",
        isDisbursed: isPaid,
        disbursementVoucher: paid ? paid.voucher_number : null,
        disbursementDate: paid ? paid.transaction_date : null,
        disbursementMethod: paid ? paid.payment_method : null
      };
    });

    const totalDividendDisbursed = Number(
      partnerDistributions
        .filter((p) => p.isDisbursed)
        .reduce((s, p) => s + p.dividendAmount, 0)
        .toFixed(2)
    );

    const retainedEarnings = isProfitable ? Math.max(0, Number((netProfit - totalDividendPayable).toFixed(2))) : 0;

    res.json({
      branch,
      period: resolvedPeriod,
      financials: {
        grossSales,
        netSales,
        totalTax,
        totalOrders,
        saleRefunds,
        repairRevenue,
        adjustedRevenue,
        totalCogs,
        grossProfit,
        grossMarginPct,
        totalExpenses,
        expenseBreakdown,
        netProfit,
        netMarginPct,
        isProfitable
      },
      dividends: {
        partnerDistributions,
        totalConfiguredShare: Number(totalConfiguredShare.toFixed(2)),
        totalDividendPayable: Number(totalDividendPayable.toFixed(2)),
        totalDividendDisbursed,
        retainedEarnings
      }
    });
  })
);

// =========================================================================
// 5. PROFIT & LOSS (INCOME STATEMENT) REPORT
// =========================================================================
reportsRouter.get(
  "/pnl",
  asyncHandler(async (req, res) => {
    let branchId = req.query.branchId;
    let branch = null;
    let branchCondition = "";
    const params = { businessId: req.user.business_id };

    if (branchId && branchId !== "all") {
      await assertBranchAccess(req.user, branchId);
      const [foundBranch] = await query(
        "SELECT id, name, code, address FROM branches WHERE id = ? AND business_id = ?",
        [branchId, req.user.business_id]
      );
      if (foundBranch) {
        branch = foundBranch;
        branchCondition = "AND so.branch_id = :branchId";
        params.branchId = branchId;
      }
    } else if (req.user.branch_id) {
      branchId = req.user.branch_id;
      const [foundBranch] = await query(
        "SELECT id, name, code, address FROM branches WHERE id = ? AND business_id = ?",
        [branchId, req.user.business_id]
      );
      branch = foundBranch;
      branchCondition = "AND so.branch_id = :branchId";
      params.branchId = branchId;
    } else {
      branch = { id: "all", name: "All Store Outlets", code: "ALL" };
    }

    const { period = "this_month", startDate, endDate } = req.query;
    const resolvedPeriod = resolvePeriod(period, startDate, endDate);
    params.startDate = resolvedPeriod.startDate;
    params.endDate = resolvedPeriod.endDate;

    // 1. Sales & Revenue
    const [salesRow] = await query(
      `SELECT 
         COALESCE(SUM(so.total_amount), 0) AS gross_sales,
         COALESCE(SUM(so.tax_amount), 0) AS total_tax,
         COALESCE(SUM(so.discount_amount), 0) AS total_discounts,
         COALESCE(SUM(so.subtotal), 0) AS net_sales,
         COUNT(DISTINCT so.id) AS total_orders
       FROM sale_orders so
       JOIN branches b ON b.id = so.branch_id
       WHERE b.business_id = :businessId
         ${branchCondition}
         AND so.sale_date >= :startDate
         AND so.sale_date <= :endDate
         AND COALESCE(so.is_deleted, 0) = 0`,
      params
    );

    // 2. Cost of Goods Sold (COGS)
    const [cogsRow] = await query(
      `SELECT 
         COALESCE(SUM(CASE 
           WHEN soi.mobile_unit_id IS NOT NULL THEN COALESCE(mu.cost_price, 0)
           WHEN soi.product_id IS NOT NULL THEN COALESCE(p.cost_price, 0) * COALESCE(soi.quantity, 1)
           ELSE 0
         END), 0) AS total_cogs
       FROM sale_order_items soi
       JOIN sale_orders so ON so.id = soi.sale_order_id
       JOIN branches b ON b.id = so.branch_id
       LEFT JOIN mobile_units mu ON mu.id = soi.mobile_unit_id
       LEFT JOIN products p ON p.id = soi.product_id
       WHERE b.business_id = :businessId
         ${branchCondition}
         AND so.sale_date >= :startDate
         AND so.sale_date <= :endDate
         AND COALESCE(so.is_deleted, 0) = 0`,
      params
    );

    // 3. Customer Sale Returns (Refunds)
    const retBranchCond = branchId && branchId !== "all" ? "AND r.branch_id = :branchId" : "";
    const [returnsRow] = await query(
      `SELECT 
         COALESCE(SUM(r.total_refund_amount), 0) AS total_refunds,
         COUNT(r.id) AS return_count
       FROM order_returns r
       WHERE r.business_id = :businessId
         ${retBranchCond}
         AND r.return_type = 'customer_return'
         AND r.return_date >= :startDate
         AND r.return_date <= :endDate`,
      params
    );

    // 4. Operating Expenses
    const expBranchCond = branchId && branchId !== "all" ? "AND e.branch_id = :branchId" : "";
    const [expensesRow] = await query(
      `SELECT 
         COALESCE(SUM(e.amount), 0) AS total_expenses,
         COUNT(e.id) AS expense_count
       FROM expenses e
       JOIN branches b ON b.id = e.branch_id
       WHERE b.business_id = :businessId
         ${expBranchCond}
         AND e.expense_date >= :startDate
         AND e.expense_date <= :endDate
         AND COALESCE(e.is_deleted, 0) = 0`,
      params
    );

    // 5. Expense Breakdown by Category
    const expenseBreakdown = await query(
      `SELECT 
         COALESCE(e.category, 'other') AS category,
         COALESCE(SUM(e.amount), 0) AS amount,
         COUNT(e.id) AS count
       FROM expenses e
       JOIN branches b ON b.id = e.branch_id
       WHERE b.business_id = :businessId
         ${expBranchCond}
         AND e.expense_date >= :startDate
         AND e.expense_date <= :endDate
         AND COALESCE(e.is_deleted, 0) = 0
       GROUP BY COALESCE(e.category, 'other')
       ORDER BY amount DESC`,
      params
    );

    // 6. Delivered Repairs Income
    const repBranchCond = branchId && branchId !== "all" ? "AND rt.branch_id = :branchId" : "";
    const [repairsRow] = await query(
      `SELECT 
         COALESCE(SUM(rt.actual_cost), 0) AS repair_revenue,
         COUNT(rt.id) AS repair_count
       FROM repair_tickets rt
       WHERE rt.business_id = :businessId
         ${repBranchCond}
         AND rt.status = 'delivered'
         AND (
           (rt.delivered_date IS NOT NULL AND rt.delivered_date >= :startDate AND rt.delivered_date <= :endDate)
           OR (rt.delivered_date IS NULL AND rt.received_date >= :startDate AND rt.received_date <= :endDate)
         )`,
      params
    );

    const grossSales = Number(salesRow?.gross_sales || 0);
    const netSales = Number(salesRow?.net_sales || 0);
    const totalTax = Number(salesRow?.total_tax || 0);
    const totalOrders = Number(salesRow?.total_orders || 0);
    const totalCogs = Number(cogsRow?.total_cogs || 0);
    const saleRefunds = Number(returnsRow?.total_refunds || 0);
    const totalExpenses = Number(expensesRow?.total_expenses || 0);
    const repairRevenue = Number(repairsRow?.repair_revenue || 0);

    const adjustedRevenue = Math.max(0, netSales - saleRefunds) + repairRevenue;
    const grossProfit = adjustedRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPct = adjustedRevenue > 0 ? ((grossProfit / adjustedRevenue) * 100).toFixed(2) : "0.00";
    const netMarginPct = adjustedRevenue > 0 ? ((netProfit / adjustedRevenue) * 100).toFixed(2) : "0.00";

    res.json({
      branch,
      period: resolvedPeriod,
      financials: {
        grossSales,
        netSales,
        totalTax,
        totalOrders,
        saleRefunds,
        repairRevenue,
        adjustedRevenue,
        totalCogs,
        grossProfit,
        grossMarginPct,
        totalExpenses,
        expenseBreakdown,
        netProfit,
        netMarginPct,
        isProfitable: netProfit > 0
      }
    });
  })
);
