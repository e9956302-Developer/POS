import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";
import { BarChart, DonutChart } from "../components/Charts.jsx";
import { exportToCSV } from "../utils/export.js";
import { openWhatsAppReminder } from "../utils/whatsapp.js";
import { SalaryVoucherModal } from "../components/SalaryVoucherModal.jsx";
import { PartnerVoucherModal } from "../components/PartnerVoucherModal.jsx";
import { ReportLetterhead, AccountingSummaryRibbon, ReportSignatures } from "../components/ReportTemplate.jsx";

export const REPORT_TABS = [
  { key: "pnl", subKey: "pnl", label: "Profit & Loss", icon: "📊", subtitle: "Official Income Statement & Margins" },
  { key: "sales", subKey: "sales", label: "Sales & Turnover", icon: "📈", subtitle: "Daily Turnover & Sales Trajectory" },
  { key: "expenses", subKey: "expenses", label: "Operating Expenses", icon: "📉", subtitle: "Shop Overheads & Itemized Ledger" },
  { key: "inventory", subKey: "inventory", label: "Inventory Valuation", icon: "📦", subtitle: "Physical Stock Asset Audit" },
  { key: "receivables", subKey: "receivables", label: "Accounts Receivable", icon: "💳", subtitle: "Customer Debts & Aging Schedule" },
  { key: "payables", subKey: "payables", label: "Accounts Payable", icon: "🚚", subtitle: "Supplier Procurement Liabilities" },
  { key: "salaries", subKey: "payroll", label: "Salaries & Payroll", icon: "💵", subtitle: "Staff Payroll Disbursement Ledger" },
  { key: "dividends", subKey: "dividends", label: "Partner Dividends", icon: "🤝", subtitle: "Branch Equity & Profit Allocation" }
];

export function ReportsPage({ context, activeSubPage, onNavigateSubPage }) {
  const [activeTab, setActiveTab] = useState(() => {
    if (activeSubPage) {
      return activeSubPage === "payroll" ? "salaries" : activeSubPage;
    }
    return "pnl";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showSalesChart, setShowSalesChart] = useState(false);
  const [showBrandChart, setShowBrandChart] = useState(false);

  // Sync activeTab with activeSubPage from sidebar
  useEffect(() => {
    if (activeSubPage) {
      const target = activeSubPage === "payroll" ? "salaries" : activeSubPage;
      if (target !== activeTab) {
        setActiveTab(target);
      }
    }
  }, [activeSubPage]);

  function handleTabChange(tabKey) {
    setActiveTab(tabKey);
    if (onNavigateSubPage) {
      const subKey = tabKey === "salaries" ? "payroll" : tabKey;
      onNavigateSubPage(subKey);
    }
  }

  const defaultBranchId = context?.session?.branch_id || context?.session?.branchId || (context?.branches?.[0]?.id ? String(context.branches[0].id) : "all");

  // Filter States
  const [reportBranchId, setReportBranchId] = useState(defaultBranchId);
  const [reportPeriod, setReportPeriod] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Data States
  const [pnlData, setPnlData] = useState(null);
  const [expenseList, setExpenseList] = useState([]);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [dividendData, setDividendData] = useState(null);
  const [inventoryReport, setInventoryReport] = useState([]);
  const [receivablesReport, setReceivablesReport] = useState([]);
  const [payablesReport, setPayablesReport] = useState([]);
  const [salesReport, setSalesReport] = useState([]);

  // Salaries & Payroll Report States
  const [salaryReport, setSalaryReport] = useState([]);
  const [salaryMonthFilter, setSalaryMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [salaryTimeScope, setSalaryTimeScope] = useState("month"); // "month" | "all"
  const [salarySearch, setSalarySearch] = useState("");
  const [viewingSalaryVoucher, setViewingSalaryVoucher] = useState(null);

  // Partner Dividends & Voucher States
  const [viewingPartnerVoucher, setViewingPartnerVoucher] = useState(null);
  const [disbursingTarget, setDisbursingTarget] = useState(null);
  const [disburseForm, setDisburseForm] = useState({ paymentMethod: "cash", referenceDetails: "", notes: "" });
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [disburseSuccessMsg, setDisburseSuccessMsg] = useState("");

  const [search, setSearch] = useState("");

  const companyName = context?.companyName || context?.session?.business_name || context?.session?.businessName || "DigitalMarkaz360";
  const companyLogo = context?.companyLogo || context?.session?.business_logo || context?.session?.logo_url || (typeof window !== "undefined" && window.__POS_COMPANY_LOGO__) || null;
  const branchName = context?.session?.branch_name || context?.session?.branchName || "All Outlets";
  const softwareName = context?.session?.business_software_name || context?.session?.software_name || "DigitalMarkaz360";

  const activeBranchName = useMemo(() => {
    if (reportBranchId === "all") return "All Store Outlets";
    const b = context.branches?.find((item) => String(item.id) === String(reportBranchId));
    return b?.name || branchName;
  }, [reportBranchId, context.branches, branchName]);

  const activeBranch = useMemo(() => {
    if (!reportBranchId || reportBranchId === "all") return null;
    return context.branches?.find((item) => String(item.id) === String(reportBranchId)) || null;
  }, [reportBranchId, context.branches]);

  const currentPeriodLabel = useMemo(() => {
    if (activeTab === "pnl") return pnlData?.period?.label || (reportPeriod === "this_month" ? "This Month" : reportPeriod);
    if (activeTab === "dividends") return dividendData?.period?.label || "Current Period";
    if (activeTab === "salaries") return salaryTimeScope === "month" ? `Month: ${salaryMonthFilter}` : "All Historical Months";
    if (activeTab === "expenses") return pnlData?.period?.label || (reportPeriod === "this_month" ? "This Month" : reportPeriod);
    if (activeTab === "sales") return "Recent Turnover Trajectory";
    return `As of ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })}`;
  }, [activeTab, pnlData, dividendData, salaryTimeScope, salaryMonthFilter, reportPeriod]);

  const exportMeta = {
    companyName,
    branchName: activeBranchName,
    softwareName,
    reportTitle:
      activeTab === "pnl"
        ? `Profit & Loss Statement (${pnlData?.period?.label || "Report"})`
        : activeTab === "expenses"
        ? "Operating Expenses Breakdown"
        : activeTab === "dividends"
        ? `Branch Dividend Payout & Profit Distribution (${dividendData?.period?.label || "Report"})`
        : activeTab === "inventory"
        ? "Inventory Valuation Report"
        : activeTab === "receivables"
        ? "Customer Receivables Ledger"
        : activeTab === "payables"
        ? "Supplier Accounts Payable Report"
        : activeTab === "salaries"
        ? `Staff Salaries & Payroll Disbursement Ledger (${salaryTimeScope === "month" ? salaryMonthFilter : "All Months"})`
        : "Revenue Trajectory Report"
  };

  useEffect(() => {
    loadActiveReport();
  }, [activeTab, reportBranchId, reportPeriod, salaryMonthFilter, salaryTimeScope]);

  async function loadActiveReport() {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (reportBranchId && reportBranchId !== "all") q.append("branchId", String(reportBranchId));
      if (reportPeriod) q.append("period", reportPeriod);
      if (reportPeriod === "custom" && customStart) q.append("startDate", customStart);
      if (reportPeriod === "custom" && customEnd) q.append("endDate", customEnd);

      if (activeTab === "pnl") {
        const data = await api.reportPnL(`?${q.toString()}`);
        setPnlData(data);
      } else if (activeTab === "dividends") {
        const data = await api.reportDividends(`?${q.toString()}`);
        setDividendData(data);
      } else if (activeTab === "expenses") {
        const expQuery = new URLSearchParams();
        if (reportBranchId && reportBranchId !== "all") expQuery.append("branchId", String(reportBranchId));
        if (pnlData?.period?.startDate) expQuery.append("from", pnlData.period.startDate);
        if (pnlData?.period?.endDate) expQuery.append("to", pnlData.period.endDate);
        const data = await api.expenses(`?${expQuery.toString()}`);
        setExpenseList(Array.isArray(data) ? data : []);
      } else if (activeTab === "inventory") {
        const data = await api.reportInventory();
        setInventoryReport(Array.isArray(data) ? data : (data.rows || []));
      } else if (activeTab === "receivables") {
        const data = await api.reportReceivables();
        setReceivablesReport(Array.isArray(data) ? data : (data.rows || []));
      } else if (activeTab === "payables") {
        const data = await api.reportPayables();
        setPayablesReport(Array.isArray(data) ? data : (data.rows || []));
      } else if (activeTab === "sales") {
        const data = await api.sales("?limit=100");
        setSalesReport(data.data || (Array.isArray(data) ? data : []));
      } else if (activeTab === "salaries") {
        const salParams = new URLSearchParams();
        if (reportBranchId && reportBranchId !== "all") salParams.append("branchId", String(reportBranchId));
        if (salaryTimeScope === "month" && salaryMonthFilter) salParams.append("month", salaryMonthFilter);
        const salData = await api.salaries(salParams.toString() ? `?${salParams.toString()}` : "");
        setSalaryReport(Array.isArray(salData) ? salData : []);
      }
    } catch (err) {
      setError(err.message || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  }

  // --- INVENTORY SUMMARY ---
  const invSummary = useMemo(() => {
    let totalUnits = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;
    const brandMap = {};

    for (const item of inventoryReport) {
      const qty = Number(item.total_units || item.in_stock_count || item.quantity || 1);
      const cost = Number(item.avg_cost || item.cost_price || 0);
      const price = Number(item.avg_price || item.selling_price || 0);
      totalUnits += qty;
      totalCostVal += qty * cost;
      totalRetailVal += qty * price;

      const brand = item.company || item.brand || "Other";
      brandMap[brand] = (brandMap[brand] || 0) + qty;
    }

    const brandChartData = Object.entries(brandMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalUnits,
      totalCostVal,
      totalRetailVal,
      projectedProfit: totalRetailVal - totalCostVal,
      brandChartData
    };
  }, [inventoryReport]);

  // --- RECEIVABLES SUMMARY ---
  const recSummary = useMemo(() => {
    let totalBalance = 0;
    let overdueCount = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const r of receivablesReport) {
      const bal = Number(r.balance_due || r.balance || 0);
      totalBalance += bal;
      if (r.due_date && r.due_date < today) {
        overdueCount++;
      }
    }

    return { totalBalance, overdueCount, totalParties: receivablesReport.length };
  }, [receivablesReport]);

  // --- PAYABLES SUMMARY ---
  const paySummary = useMemo(() => {
    let totalPayable = 0;
    for (const p of payablesReport) {
      totalPayable += Number(p.balance_due || p.balance || 0);
    }
    return { totalPayable, totalVendors: payablesReport.length };
  }, [payablesReport]);

  // --- SALES TREND DATA ---
  const salesChartData = useMemo(() => {
    const dayMap = {};
    for (const s of salesReport.slice(0, 40)) {
      const day = (s.sale_date || "").slice(5); // MM-DD
      if (day) {
        dayMap[day] = (dayMap[day] || 0) + Number(s.final_total || s.total_amount || 0);
      }
    }
    return Object.entries(dayMap)
      .map(([label, value]) => ({ label, value }))
      .slice(-10);
  }, [salesReport]);

  function triggerPrint() {
    window.print();
  }

  function handleExportPnLCSV() {
    if (!pnlData) return;
    const fin = pnlData.financials;
    const rows = [
      { LineItem: "Gross Sales Revenue", Amount: Math.round(fin.grossSales) },
      { LineItem: "Less: Customer Sale Returns / Refunds", Amount: -Math.round(fin.saleRefunds) },
      { LineItem: "Add: Delivered Repair Service Income", Amount: Math.round(fin.repairRevenue) },
      { LineItem: "Net Operating Trading Revenue", Amount: Math.round(fin.adjustedRevenue) },
      { LineItem: "Less: Cost of Goods Sold (COGS)", Amount: -Math.round(fin.totalCogs) },
      { LineItem: "Gross Trading Profit", Amount: Math.round(fin.grossProfit) },
      { LineItem: "Gross Profit Margin (%)", Amount: `${fin.grossMarginPct}%` },
      ...(fin.expenseBreakdown || []).map((e) => ({
        LineItem: `Operating Expense: ${e.category}`,
        Amount: -Math.round(Number(e.amount || 0))
      })),
      { LineItem: "Total Operating Expenses & Payroll", Amount: -Math.round(fin.totalExpenses) },
      { LineItem: "Net Operating Profit / (Loss)", Amount: Math.round(fin.netProfit) },
      { LineItem: "Net Profit Margin (%)", Amount: `${fin.netMarginPct}%` }
    ];

    exportToCSV("Profit_And_Loss_Statement", rows, [], exportMeta);
  }

  function handleExportDividendCSV() {
    if (!dividendData) return;
    const exportRows = (dividendData.dividends?.partnerDistributions || []).map((p) => ({
      "Partner Name": p.partnerName,
      "Phone": p.phone || "—",
      "CNIC": p.cnic || "—",
      "Branch Equity Share (%)": `${p.sharePercentage.toFixed(2)}%`,
      "Net Dividend Payout (Rs.)": Math.round(p.dividendAmount || 0),
      "Loss Share Allocated (Rs.)": Math.round(p.lossShareAmount || 0),
      "Distribution Status": p.status
    }));

    exportToCSV("Branch_Dividend_Payout_Report", exportRows, [], exportMeta);
  }

  async function handleDisburseSubmit(e) {
    e.preventDefault();
    const branchId = dividendData?.branch?.id || reportBranchId;
    if (!branchId || branchId === "all") {
      setError("Please select a specific store branch before disbursing dividends.");
      return;
    }
    setIsDisbursing(true);
    setError("");
    try {
      const payload = {
        periodLabel: dividendData?.period?.label || "Current Period",
        paymentMethod: disburseForm.paymentMethod,
        referenceDetails: disburseForm.referenceDetails.trim() || undefined,
        notes: disburseForm.notes.trim() || undefined
      };
      if (disbursingTarget && !disbursingTarget.all && disbursingTarget.partnerId) {
        payload.partnerId = disbursingTarget.partnerId;
      }

      const result = await api.disburseBranchDividends(branchId, payload);
      setDisburseSuccessMsg(
        result.transactions?.length > 1
          ? `Successfully disbursed dividends to ${result.transactions.length} partners (${result.vouchers?.join(", ")})`
          : `Successfully disbursed dividend (${result.vouchers?.[0] || result.transactions?.[0]?.voucher_number || "Voucher Generated"})`
      );
      setDisbursingTarget(null);
      setDisburseForm({ paymentMethod: "cash", referenceDetails: "", notes: "" });
      // Reload active report
      loadActiveReport();
      // If single transaction, show voucher immediately
      if (result.transactions?.length === 1) {
        setViewingPartnerVoucher(result.transactions[0]);
      }
    } catch (err) {
      setError(err.message || "Failed to disburse dividends.");
    } finally {
      setIsDisbursing(false);
    }
  }

  // --- OPERATING EXPENSES FILTERED LEDGER ---
  const filteredExpenses = useMemo(() => {
    return expenseList.filter((exp) => {
      if (expenseCategoryFilter !== "all" && exp.category !== expenseCategoryFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (exp.title && exp.title.toLowerCase().includes(q)) ||
        (exp.notes && exp.notes.toLowerCase().includes(q)) ||
        (exp.category && exp.category.toLowerCase().includes(q))
      );
    });
  }, [expenseList, expenseCategoryFilter, search]);

  const totalFilteredExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  // --- SALARIES & PAYROLL SUMMARY ---
  const filteredSalaryReport = useMemo(() => {
    if (!salarySearch.trim()) return salaryReport;
    const q = salarySearch.toLowerCase().trim();
    return salaryReport.filter(
      (s) =>
        s.employee_name?.toLowerCase().includes(q) ||
        String(s.employee_id).includes(q) ||
        s.designation?.toLowerCase().includes(q) ||
        s.branch_name?.toLowerCase().includes(q) ||
        s.payment_method?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
    );
  }, [salaryReport, salarySearch]);

  const salSummary = useMemo(() => {
    let totalBase = 0;
    let totalBonus = 0;
    let totalAdvance = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const s of salaryReport) {
      totalBase += Number(s.base_salary || 0);
      totalBonus += Number(s.bonus || 0);
      totalAdvance += Number(s.advance_deduction || 0);
      totalDeductions += Number(s.deductions || 0);
      totalNet += Number(s.net_salary || 0);
    }

    return {
      count: salaryReport.length,
      totalBase,
      totalBonus,
      totalAdvance,
      totalDeductions,
      totalNet
    };
  }, [salaryReport]);

  function handleExportSalaryCSV() {
    const cols = [
      { key: "id", label: "VOUCHER #" },
      { key: "salary_month", label: "SALARY MONTH" },
      { key: "payment_date", label: "PAYMENT DATE" },
      { key: "employee_name", label: "EMPLOYEE NAME" },
      { key: "designation", label: "DESIGNATION" },
      { key: "branch_name", label: "BRANCH" },
      { key: "base_salary", label: "BASE SALARY" },
      { key: "bonus", label: "BONUS (+)" },
      { key: "advance_deduction", label: "ADVANCE DEDUCTED (-)" },
      { key: "deductions", label: "OTHER DEDUCTIONS (-)" },
      { key: "net_salary", label: "NET SALARY PAID" },
      { key: "payment_method", label: "PAYMENT METHOD" },
      { key: "paid_by_name", label: "AUTHORIZED BY" },
      { key: "notes", label: "NOTES" }
    ];
    exportToCSV(
      `Salary_Payroll_Report_${salaryTimeScope === "month" ? salaryMonthFilter : "All_Months"}`,
      filteredSalaryReport,
      cols,
      {
        ...exportMeta,
        reportTitle: `Salaries & Payroll Disbursement Report (${salaryTimeScope === "month" ? `Month: ${salaryMonthFilter}` : "All Historical Records"})`
      }
    );
  }

  function handleActiveExport() {
    if (activeTab === "pnl") {
      handleExportPnLCSV();
    } else if (activeTab === "dividends") {
      handleExportDividendCSV();
    } else if (activeTab === "expenses") {
      exportToCSV("Expenses_Ledger_Report", filteredExpenses, [], exportMeta);
    } else if (activeTab === "inventory") {
      exportToCSV("Inventory_Valuation_Report", inventoryReport, [], exportMeta);
    } else if (activeTab === "receivables") {
      exportToCSV("Customer_Receivables_Report", receivablesReport, [], exportMeta);
    } else if (activeTab === "payables") {
      exportToCSV("Supplier_Payables_Report", payablesReport, [], exportMeta);
    } else if (activeTab === "sales") {
      exportToCSV("Sales_Revenue_Ledger", salesReport, [], exportMeta);
    } else if (activeTab === "salaries") {
      handleExportSalaryCSV();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Accounting Filter & Action Bar */}

      {/* 2. Streamlined Accounting Filter & Action Bar */}
      <div className="accounting-filter-toolbar no-print">
        <div className="accounting-filter-controls">
          {/* Store / Branch Selector */}
          <label className="accounting-filter-label">
            <span>🏢 Store:</span>
            <select
              value={reportBranchId}
              onChange={(e) => setReportBranchId(e.target.value)}
              className="accounting-filter-select"
            >
              <option value="all">🌐 All Store Outlets</option>
              {context.branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </label>

          {/* Period Selector for P&L, Expenses, Dividends, Sales */}
          {["pnl", "expenses", "dividends", "sales"].includes(activeTab) && (
            <div className="accounting-period-pills">
              {[
                { key: "this_month", label: "This Month" },
                { key: "last_month", label: "Last Month" },
                { key: "this_quarter", label: "This Quarter" },
                { key: "last_quarter", label: "Last Quarter" },
                { key: "this_year", label: "Full Year" },
                { key: "custom", label: "Custom" }
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`accounting-period-pill ${reportPeriod === p.key ? "active" : ""}`}
                  onClick={() => setReportPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Custom Date Inputs */}
          {reportPeriod === "custom" && ["pnl", "expenses", "dividends", "sales"].includes(activeTab) && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="accounting-filter-input"
              />
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="accounting-filter-input"
              />
              <button
                type="button"
                className="primary-btn btn-sm"
                onClick={loadActiveReport}
              >
                Apply
              </button>
            </div>
          )}

          {/* Scope & Month selector for Salaries */}
          {activeTab === "salaries" && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <select
                value={salaryTimeScope}
                onChange={(e) => setSalaryTimeScope(e.target.value)}
                className="accounting-filter-select"
              >
                <option value="month">Specific Month</option>
                <option value="all">All Historical Months</option>
              </select>
              {salaryTimeScope === "month" && (
                <input
                  type="month"
                  value={salaryMonthFilter}
                  onChange={(e) => setSalaryMonthFilter(e.target.value)}
                  className="accounting-filter-input"
                />
              )}
            </div>
          )}
        </div>

        {/* Accounting Action Buttons */}
        <div className="accounting-toolbar-actions">
          <button
            type="button"
            className="secondary-btn btn-sm"
            onClick={triggerPrint}
            title="Print formal accounting statement on A4 or export to PDF"
          >
            🖨️ Print Statement (A4)
          </button>
          <button
            type="button"
            className="secondary-btn btn-sm"
            onClick={handleActiveExport}
            title="Download CSV statement"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* 3. Executive Corporate Letterhead for Statement Presentation */}
      <ReportLetterhead
        context={context}
        activeBranchName={activeBranchName}
        activeBranch={activeBranch}
        periodLabel={currentPeriodLabel}
        title={
          activeTab === "pnl"
            ? "STATEMENT OF PROFIT & LOSS / COMPREHENSIVE INCOME"
            : activeTab === "expenses"
            ? "OPERATING EXPENSES & OVERHEADS AUDIT LEDGER"
            : activeTab === "dividends"
            ? "BRANCH EQUITY & PARTNER DIVIDEND DISTRIBUTION"
            : activeTab === "inventory"
            ? "INVENTORY ASSET VALUATION & STOCK LEVEL AUDIT"
            : activeTab === "receivables"
            ? "ACCOUNTS RECEIVABLE & DEBT AGING SCHEDULE"
            : activeTab === "payables"
            ? "SUPPLIER ACCOUNTS PAYABLE & PROCUREMENT AGING"
            : activeTab === "salaries"
            ? "EXECUTIVE SALARIES & PAYROLL DISBURSEMENT STATEMENT"
            : "SALES REVENUE & TURNOVER ANALYTICS REPORT"
        }
        subtitle={
          activeTab === "pnl"
            ? "Official Audited Income Statement & Profit Margins"
            : activeTab === "expenses"
            ? "Detailed Chronological Audit of Operating Costs & Overhead Expenses"
            : activeTab === "dividends"
            ? "Partner Dividend Allocations Computed From Certified Net Profit"
            : activeTab === "inventory"
            ? "Physical Stock Valuation & Potential Retail Turnover Audit"
            : activeTab === "receivables"
            ? "Outstanding Customer Credit Balances & Aging Analysis"
            : activeTab === "payables"
            ? "Outstanding Supplier Procurement Liabilities & Settlement Schedule"
            : activeTab === "salaries"
            ? "Itemized Payroll Audit with Bonuses, Advances & Net Cash Disbursed"
            : "Daily Turnover Performance, Volume & Payment Channels"
        }
        docRef={
          activeTab === "pnl" ? `REP-PNL-${(reportPeriod || "CUR").toUpperCase()}` :
          activeTab === "salaries" ? `REP-PAYROLL-${salaryTimeScope === "month" ? salaryMonthFilter.replace("-", "") : "ALL"}` :
          activeTab === "dividends" ? `REP-DIV-${reportBranchId}` :
          activeTab === "inventory" ? "REP-INV-ASSETS" :
          activeTab === "receivables" ? "REP-AR-AGING" :
          activeTab === "payables" ? "REP-AP-LEDGER" :
          activeTab === "expenses" ? "REP-EXP-AUDIT" :
          "REP-REV-TRAJECTORY"
        }
      />

      {error && <div className="alert-banner alert-error no-print">{error}</div>}

      {/* ======================================================== */}
      {/* TAB 1: PROFIT & LOSS (INCOME STATEMENT) */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* TAB 1: PROFIT & LOSS (INCOME STATEMENT) */}
      {/* ======================================================== */}
      {activeTab === "pnl" && (
        <>
          {/* Executive P&L Key Financial Metrics */}
          <AccountingSummaryRibbon
            title="Executive Income & Margin Summary"
            items={[
              {
                label: "Net Operating Turnover",
                value: `Rs. ${Math.round(pnlData?.financials?.adjustedRevenue || 0).toLocaleString()}`,
                subtitle: `${pnlData?.financials?.totalOrders || 0} orders • Refunds: Rs. ${Math.round(pnlData?.financials?.saleRefunds || 0).toLocaleString()}`,
                tone: "info"
              },
              {
                label: "Cost of Goods Sold (COGS)",
                value: `(Rs. ${Math.round(pnlData?.financials?.totalCogs || 0).toLocaleString()})`,
                subtitle: `Gross Profit: Rs. ${Math.round(pnlData?.financials?.grossProfit || 0).toLocaleString()}`,
                tone: "warning"
              },
              {
                label: "Gross Trading Margin",
                value: `${pnlData?.financials?.grossMarginPct || "0.00"}%`,
                subtitle: `Gross Profit / Net Revenue`,
                tone: (pnlData?.financials?.grossProfit || 0) >= 0 ? "success" : "danger"
              },
              {
                label: "Operating Overheads",
                value: `(Rs. ${Math.round(pnlData?.financials?.totalExpenses || 0).toLocaleString()})`,
                subtitle: `${pnlData?.financials?.expenseBreakdown?.length || 0} cost heads audited`,
                tone: "danger"
              },
              {
                label: "Net Operating Profit / (Loss)",
                value: `Rs. ${Math.round(pnlData?.financials?.netProfit || 0).toLocaleString()}`,
                subtitle: `Net Margin: ${pnlData?.financials?.netMarginPct || "0.00"}%`,
                tone: (pnlData?.financials?.netProfit || 0) >= 0 ? "success" : "danger",
                badge: (pnlData?.financials?.netProfit || 0) >= 0 ? "NET PROFIT" : "NET LOSS"
              }
            ]}
          />

          {/* Detailed Accounting Income Statement */}
          <SectionCard
            title={`Profit & Loss Statement — ${pnlData?.branch?.name || activeBranchName}`}
            subtitle={`Official Income Statement covering ${pnlData?.period?.label || "Period"}.`}
            action={
              <div style={{ display: "flex", gap: "8px" }} className="no-print">
                <button className="secondary-btn btn-sm" onClick={triggerPrint} title="Print statement">
                  🖨️ Print
                </button>
                <button className="secondary-btn btn-sm" onClick={handleExportPnLCSV}>
                  📥 Export CSV
                </button>
              </div>
            }
          >
            <div className="table-responsive">
              <table className="accounting-data-table">
                <thead>
                  <tr>
                    <th style={{ width: "65%" }}>Financial Line Item</th>
                    <th style={{ textAlign: "right", width: "20%" }}>Amount (PKR)</th>
                    <th style={{ textAlign: "right", width: "15%" }}>% of Net Turnover</th>
                  </tr>
                </thead>
                <tbody>
                  {/* REVENUE SECTION */}
                  <tr style={{ background: "rgba(59, 130, 246, 0.04)", fontWeight: "700" }}>
                    <td colSpan={3}>1. OPERATING REVENUE & TURNOVER</td>
                  </tr>
                  <tr>
                    <td className="accounting-indent-1">Gross Billed Sales</td>
                    <td className="num-cell">
                      Rs. {Math.round(pnlData?.financials?.grossSales || 0).toLocaleString()}
                    </td>
                    <td className="num-cell muted">—</td>
                  </tr>
                  <tr>
                    <td className="accounting-indent-1 negative-amount">
                      Less: Customer Sale Returns / Refunds
                    </td>
                    <td className="num-cell negative-amount">
                      (Rs. {Math.round(pnlData?.financials?.saleRefunds || 0).toLocaleString()})
                    </td>
                    <td className="num-cell muted">—</td>
                  </tr>
                  <tr>
                    <td className="accounting-indent-1 positive-amount">
                      Add: Delivered Repair Service Revenue
                    </td>
                    <td className="num-cell positive-amount">
                      +Rs. {Math.round(pnlData?.financials?.repairRevenue || 0).toLocaleString()}
                    </td>
                    <td className="num-cell muted">—</td>
                  </tr>
                  <tr className="accounting-subtotal-row">
                    <td>TOTAL NET OPERATING TURNOVER</td>
                    <td className="num-cell" style={{ fontSize: "1rem" }}>
                      Rs. {Math.round(pnlData?.financials?.adjustedRevenue || 0).toLocaleString()}
                    </td>
                    <td className="num-cell">100.00%</td>
                  </tr>

                  {/* COGS SECTION */}
                  <tr style={{ background: "rgba(245, 158, 11, 0.04)", fontWeight: "700" }}>
                    <td colSpan={3}>2. COST OF GOODS SOLD (COGS)</td>
                  </tr>
                  <tr>
                    <td className="accounting-indent-1 negative-amount">
                      Cost of Sold Handsets (IMEI) & Accessory Stock
                    </td>
                    <td className="num-cell negative-amount">
                      (Rs. {Math.round(pnlData?.financials?.totalCogs || 0).toLocaleString()})
                    </td>
                    <td className="num-cell">
                      {(pnlData?.financials?.adjustedRevenue || 0) > 0
                        ? `${(((pnlData?.financials?.totalCogs || 0) / pnlData.financials.adjustedRevenue) * 100).toFixed(2)}%`
                        : "0.00%"}
                    </td>
                  </tr>
                  <tr className="accounting-subtotal-row">
                    <td>GROSS TRADING PROFIT</td>
                    <td className={`num-cell ${(pnlData?.financials?.grossProfit || 0) >= 0 ? "positive-amount" : "negative-amount"}`}>
                      Rs. {Math.round(pnlData?.financials?.grossProfit || 0).toLocaleString()}
                    </td>
                    <td className="num-cell" style={{ fontWeight: "700" }}>
                      {pnlData?.financials?.grossMarginPct || "0.00"}%
                    </td>
                  </tr>

                  {/* OPERATING EXPENSES SECTION */}
                  <tr style={{ background: "rgba(239, 68, 68, 0.04)", fontWeight: "700" }}>
                    <td colSpan={3}>3. OPERATING EXPENSES & OVERHEADS</td>
                  </tr>
                  {(pnlData?.financials?.expenseBreakdown || []).map((exp, idx) => (
                    <tr key={idx}>
                      <td className="accounting-indent-1" style={{ textTransform: "capitalize" }}>
                        {exp.category === "salaries" ? "👔 Staff Salaries & Payroll" :
                         exp.category === "rent" ? "🏢 Shop Rent" :
                         exp.category === "utilities" ? "⚡ Utilities & Bills" :
                         exp.category === "marketing" ? "📢 Advertising & Marketing" :
                         exp.category === "maintenance" ? "🔧 Maintenance & Repairs" :
                         `📦 ${exp.category}`}
                      </td>
                      <td className="num-cell negative-amount">
                        (Rs. {Math.round(Number(exp.amount || 0)).toLocaleString()})
                      </td>
                      <td className="num-cell muted">
                        {(pnlData?.financials?.adjustedRevenue || 0) > 0
                          ? `${((Number(exp.amount || 0) / pnlData.financials.adjustedRevenue) * 100).toFixed(2)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="accounting-subtotal-row">
                    <td>TOTAL OPERATING EXPENSES</td>
                    <td className="num-cell negative-amount">
                      (Rs. {Math.round(pnlData?.financials?.totalExpenses || 0).toLocaleString()})
                    </td>
                    <td className="num-cell">
                      {(pnlData?.financials?.adjustedRevenue || 0) > 0
                        ? `${(((pnlData?.financials?.totalExpenses || 0) / pnlData.financials.adjustedRevenue) * 100).toFixed(2)}%`
                        : "0.00%"}
                    </td>
                  </tr>

                  {/* NET OPERATING PROFIT / LOSS - DOUBLE UNDERLINE */}
                  <tr className="accounting-grand-total-row">
                    <td>NET OPERATING PROFIT / (LOSS)</td>
                    <td className={`num-cell ${(pnlData?.financials?.netProfit || 0) >= 0 ? "positive-amount" : "negative-amount"}`}>
                      Rs. {Math.round(pnlData?.financials?.netProfit || 0).toLocaleString()}
                    </td>
                    <td className={`num-cell ${(pnlData?.financials?.netProfit || 0) >= 0 ? "positive-amount" : "negative-amount"}`}>
                      {pnlData?.financials?.netMarginPct || "0.00"}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Audit Verification & Authorization Signatures Block */}
          <ReportSignatures docType="Income Statement & Operating Financial Audit" />
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: OPERATING EXPENSES REPORT */}
      {/* ======================================================== */}
      {activeTab === "expenses" && (
        <>
          {/* Executive Expense Key Financial Metrics */}
          <AccountingSummaryRibbon
            title="Operating Expenses & Overheads Summary"
            items={[
              {
                label: "Total Operating Overheads",
                value: `Rs. ${Math.round(totalFilteredExpenseAmount).toLocaleString()}`,
                subtitle: `${filteredExpenses.length} entries recorded`,
                tone: "danger"
              },
              {
                label: "Audited Ledger Entries",
                value: `${filteredExpenses.length} Records`,
                subtitle: expenseCategoryFilter === "all" ? "All active categories" : `Category: ${expenseCategoryFilter}`,
                tone: "info"
              },
              {
                label: "Active Cost Heads",
                value: `${new Set(filteredExpenses.map((e) => e.category)).size} Categories`,
                subtitle: "Rent, utilities, payroll, repairs",
                tone: "neutral"
              },
              {
                label: "Average Cost / Entry",
                value: `Rs. ${filteredExpenses.length > 0 ? Math.round(totalFilteredExpenseAmount / filteredExpenses.length).toLocaleString() : 0}`,
                subtitle: "Operational cost intensity",
                tone: "warning"
              }
            ]}
          />

          <SectionCard
            title="Operating Expenses Ledger"
            subtitle="Full itemized audit log of shop expenses and operating costs."
            action={
              <div style={{ display: "flex", gap: "8px" }} className="no-print">
                <button className="secondary-btn btn-sm" onClick={triggerPrint} title="Print expenses">
                  🖨️ Print
                </button>
                <button
                  className="secondary-btn btn-sm"
                  onClick={() => exportToCSV("Expenses_Ledger_Report", filteredExpenses, [], exportMeta)}
                >
                  📥 Export CSV
                </button>
              </div>
            }
          >
            {/* Filter by Category & Search */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "1rem", flexWrap: "wrap" }} className="no-print">
              <label style={{ flex: 1, minWidth: "200px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search expense title, notes, or branch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="accounting-filter-input"
                  style={{ width: "100%" }}
                />
              </label>
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="accounting-filter-select"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(expenseList.map((e) => e.category))).filter(Boolean).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-responsive">
              <table className="accounting-data-table">
                <thead>
                  <tr>
                    <th style={{ width: "15%" }}>Expense Date</th>
                    <th style={{ width: "20%" }}>Category</th>
                    <th style={{ width: "45%" }}>Title / Description / Notes</th>
                    <th style={{ width: "20%", textAlign: "right" }}>Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        No operating expenses found for this branch and period filter.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem" }}>
                          {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <span
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.78rem",
                              fontWeight: "600",
                              textTransform: "capitalize"
                            }}
                          >
                            {exp.category}
                          </span>
                        </td>
                        <td>
                          <strong>{exp.title || exp.category}</strong>
                          {exp.notes && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>{exp.notes}</div>}
                        </td>
                        <td className="num-cell negative-amount" style={{ fontWeight: "700" }}>
                          Rs. {Math.round(Number(exp.amount || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="accounting-grand-total-row">
                    <td colSpan={3} style={{ fontWeight: "800" }}>
                      GRAND TOTAL OPERATING EXPENSES ({filteredExpenses.length} Records)
                    </td>
                    <td className="num-cell negative-amount" style={{ fontSize: "1.05rem", fontWeight: "900" }}>
                      Rs. {Math.round(totalFilteredExpenseAmount).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          {/* Audit Verification & Authorization Signatures Block */}
          <ReportSignatures docType="Operating Overheads & Expenses Audit Ledger" />
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 3: BRANCH DIVIDEND PAYOUT & PROFIT DISTRIBUTION */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* TAB 3: BRANCH DIVIDEND PAYOUT & PROFIT DISTRIBUTION */}
      {/* ======================================================== */}
      {activeTab === "dividends" && (
        <>
          {/* Executive Dividend Distribution Financial Metrics */}
          <AccountingSummaryRibbon
            title="Equity & Dividend Distribution Summary"
            items={[
              {
                label: "Net Distributable Income",
                value: `Rs. ${Math.round(dividendData?.financials?.netProfit || 0).toLocaleString()}`,
                subtitle: `Net Margin: ${dividendData?.financials?.netMarginPct || "0.00"}%`,
                tone: (dividendData?.financials?.netProfit || 0) >= 0 ? "success" : "danger",
                badge: (dividendData?.financials?.netProfit || 0) >= 0 ? "NET PROFIT" : "NET LOSS"
              },
              {
                label: "Net Trading Revenue",
                value: `Rs. ${Math.round(dividendData?.financials?.adjustedRevenue || 0).toLocaleString()}`,
                subtitle: `${dividendData?.financials?.totalOrders || 0} orders billed`,
                tone: "info"
              },
              {
                label: "Configured Equity",
                value: `${dividendData?.dividends?.totalConfiguredShare?.toFixed(2) || "0.00"}%`,
                subtitle: `${dividendData?.dividends?.partnerDistributions?.length || 0} partners configured`,
                tone: dividendData?.dividends?.totalConfiguredShare === 100 ? "success" : "warning"
              },
              {
                label: "Total Dividend Disbursed",
                value: `Rs. ${Math.round(dividendData?.dividends?.totalDividendDisbursed || 0).toLocaleString()}`,
                subtitle: (dividendData?.dividends?.totalDividendPayable || 0) > (dividendData?.dividends?.totalDividendDisbursed || 0)
                  ? `Rs. ${Math.round((dividendData?.dividends?.totalDividendPayable || 0) - (dividendData?.dividends?.totalDividendDisbursed || 0)).toLocaleString()} pending`
                  : "All settled",
                tone: "success"
              }
            ]}
          />

          {disburseSuccessMsg && (
            <div className="alert success no-print" style={{ marginBottom: "1rem" }}>
              ✓ {disburseSuccessMsg}
            </div>
          )}

          {/* Partner Dividend Allocation Table */}
          <SectionCard
            title={`Partner Dividend Shares — ${dividendData?.branch?.name || activeBranchName}`}
            subtitle={`Profit distribution calculated from certified equity share percentages for ${dividendData?.period?.label || "Period"}.`}
            action={
              <div style={{ display: "flex", gap: "8px" }} className="no-print">
                {dividendData?.financials?.netProfit > 0 &&
                  (dividendData?.dividends?.partnerDistributions || []).some((p) => !p.isDisbursed && p.dividendAmount > 0) && (
                    <button
                      type="button"
                      className="primary-btn btn-sm"
                      onClick={() => {
                        setDisbursingTarget({ all: true });
                        setDisburseSuccessMsg("");
                      }}
                      title="Disburse dividends for all eligible partners in this branch period"
                    >
                      💰 Disburse All
                    </button>
                  )}
                <button className="secondary-btn btn-sm" onClick={triggerPrint} title="Print report">
                  🖨️ Print
                </button>
                <button className="secondary-btn btn-sm" onClick={handleExportDividendCSV}>
                  📥 Export CSV
                </button>
              </div>
            }
          >
            <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
              <table className="accounting-data-table" style={{ minWidth: "860px", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: "150px", whiteSpace: "nowrap" }}>Partner Name</th>
                    <th style={{ minWidth: "130px", whiteSpace: "nowrap" }}>CNIC / Phone</th>
                    <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Equity Share (%)</th>
                    <th style={{ minWidth: "140px", textAlign: "right", whiteSpace: "nowrap" }}>Profit / Loss Share (PKR)</th>
                    <th style={{ minWidth: "140px", textAlign: "right", whiteSpace: "nowrap" }}>Dividend Payout (PKR)</th>
                    <th style={{ minWidth: "90px", textAlign: "center", whiteSpace: "nowrap" }}>Status</th>
                    <th className="no-print" style={{ minWidth: "90px", textAlign: "center", whiteSpace: "nowrap" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(dividendData?.dividends?.partnerDistributions || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                        No equity partners configured for this branch. Go to <strong>Admin ➔ Partners & Equity</strong> to assign branch equity shares.
                      </td>
                    </tr>
                  ) : (
                    dividendData.dividends.partnerDistributions.map((partner) => (
                      <tr key={partner.partnerId}>
                        <td style={{ fontWeight: "700" }}>
                          {partner.partnerName}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem" }}>
                          <div>{partner.phone || "—"}</div>
                          {partner.cnic && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{partner.cnic}</div>}
                        </td>
                        <td className="num-cell" style={{ fontWeight: "700" }}>
                          {partner.sharePercentage.toFixed(2)}%
                        </td>
                        <td
                          className={`num-cell ${(dividendData?.financials?.netProfit || 0) >= 0 ? "positive-amount" : "negative-amount"}`}
                        >
                          {(dividendData?.financials?.netProfit || 0) >= 0
                            ? `+Rs. ${Math.round(partner.dividendAmount).toLocaleString()}`
                            : `-Rs. ${Math.round(partner.lossShareAmount).toLocaleString()}`}
                        </td>
                        <td
                          className="num-cell"
                          style={{
                            fontWeight: "800",
                            color: partner.dividendAmount > 0 ? "var(--positive, #10b981)" : "var(--text-muted)"
                          }}
                        >
                          Rs. {Math.round(partner.dividendAmount).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {partner.isDisbursed ? (
                            <span
                              className="status-pill status-success"
                              title={`Disbursed on ${partner.disbursementDate || "record"}`}
                            >
                              ✓ Disbursed
                            </span>
                          ) : partner.dividendAmount > 0 ? (
                            <span className="status-pill status-warning">Payable</span>
                          ) : (
                            <span className="status-pill status-neutral">No Payout</span>
                          )}
                        </td>
                        <td className="no-print" style={{ textAlign: "center" }}>
                          {partner.isDisbursed ? (
                            <button
                              type="button"
                              className="ghost-btn btn-sm"
                              onClick={() =>
                                setViewingPartnerVoucher({
                                  voucher_number: partner.disbursementVoucher,
                                  transaction_type: "dividend_payout",
                                  amount: partner.dividendAmount,
                                  partner_name: partner.partnerName,
                                  branch_name: dividendData?.branch?.name || activeBranchName,
                                  period_label: dividendData?.period?.label,
                                  payment_method: partner.disbursementMethod || "cash",
                                  transaction_date: partner.disbursementDate || new Date().toISOString().slice(0, 10)
                                })
                              }
                              title="View & print official dividend payout voucher slip"
                            >
                              🧾 Slip
                            </button>
                          ) : partner.dividendAmount > 0 ? (
                            <button
                              type="button"
                              className="primary-btn btn-sm"
                              onClick={() => {
                                setDisbursingTarget(partner);
                                setDisburseSuccessMsg("");
                              }}
                              title="Disburse dividend to partner"
                            >
                              💸 Pay Out
                            </button>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="accounting-grand-total-row">
                    <td colSpan={2} style={{ fontWeight: "800" }}>GRAND TOTAL BRANCH DISTRIBUTION</td>
                    <td className="num-cell" style={{ fontWeight: "800" }}>
                      {dividendData?.dividends?.totalConfiguredShare?.toFixed(2) || "0.00"}%
                    </td>
                    <td className={`num-cell ${(dividendData?.financials?.netProfit || 0) >= 0 ? "positive-amount" : "negative-amount"}`} style={{ fontWeight: "800" }}>
                      Rs. {Math.round(dividendData?.financials?.netProfit || 0).toLocaleString()}
                    </td>
                    <td className="num-cell positive-amount" style={{ fontSize: "1.05rem", fontWeight: "900" }}>
                      Rs. {Math.round(dividendData?.dividends?.totalDividendPayable || 0).toLocaleString()}
                    </td>
                    <td colSpan={2} className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          {/* Audit Verification & Authorization Signatures Block */}
          <ReportSignatures docType="Partner Dividend Distribution & Equity Certification" />
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 4: INVENTORY ASSET VALUATION */}
      {/* ======================================================== */}
      {activeTab === "inventory" && (
        <>
          {/* Executive Inventory Asset Accounting Ribbon */}
          <AccountingSummaryRibbon
            items={[
              {
                label: "Total In-Stock Units",
                value: `${invSummary.totalUnits.toLocaleString()} Pcs`,
                aux: `${inventoryReport.length} Audited Models`
              },
              {
                label: "Total Cost Valuation",
                value: `Rs. ${Math.round(invSummary.totalCostVal).toLocaleString()}`,
                aux: "Capital Invested"
              },
              {
                label: "Projected Retail Turnover",
                value: `Rs. ${Math.round(invSummary.totalRetailVal).toLocaleString()}`,
                aux: "Est. Gross Sales"
              },
              {
                label: "Unrealized Margin",
                value: `Rs. ${Math.round(invSummary.projectedProfit).toLocaleString()}`,
                tone: "positive",
                aux: invSummary.totalRetailVal > 0 ? `${((invSummary.projectedProfit / invSummary.totalRetailVal) * 100).toFixed(1)}% Margin` : undefined
              }
            ]}
          />

          {showBrandChart && (
            <div className="no-print" style={{ marginBottom: "16px" }}>
              <SectionCard
                title="Brand Distribution (Auxiliary Chart)"
                subtitle="Stock count segmented by manufacturer."
                action={
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    onClick={() => setShowBrandChart(false)}
                  >
                    ✕ Close Chart
                  </button>
                }
              >
                <div style={{ display: "flex", justifyContent: "center", padding: "10px" }}>
                  <DonutChart data={invSummary.brandChartData} size={190} />
                </div>
              </SectionCard>
            </div>
          )}

          <SectionCard
            title="Inventory Asset Valuation Schedule"
            subtitle="Itemized audit of handset stock on hand, unit quantities, and verified cost valuation."
            action={
              <div style={{ display: "flex", gap: "8px" }} className="no-print">
                <button
                  type="button"
                  className="ghost-btn btn-sm"
                  onClick={() => setShowBrandChart(!showBrandChart)}
                  title="Toggle brand distribution chart"
                >
                  {showBrandChart ? "Hide Chart" : "📊 Brand Chart"}
                </button>
                <button className="ghost-btn btn-sm" onClick={triggerPrint} title="Print inventory valuation">
                  🖨️ Print
                </button>
                <button
                  className="ghost-btn btn-sm"
                  onClick={() => exportToCSV("Inventory_Valuation_Report", inventoryReport, [], exportMeta)}
                >
                  📥 Export CSV
                </button>
              </div>
            }
          >
            <div style={{ marginBottom: "12px" }} className="no-print">
              <input
                type="text"
                placeholder="🔍 Filter by brand, model, or branch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)" }}
              />
            </div>

            <div className="table-responsive">
              <table className="accounting-data-table">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Branch Outlet</th>
                    <th style={{ width: "20%" }}>Brand / Manufacturer</th>
                    <th style={{ width: "35%" }}>Model & Specification</th>
                    <th style={{ width: "10%", textAlign: "right" }}>In-Stock Qty</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Cost Valuation (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport
                    .filter((r) => {
                      if (!search) return true;
                      const q = search.toLowerCase();
                      return (
                        (r.branch_name && r.branch_name.toLowerCase().includes(q)) ||
                        (r.company && r.company.toLowerCase().includes(q)) ||
                        (r.model_name && r.model_name.toLowerCase().includes(q))
                      );
                    })
                    .map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.branch_name || "Main Branch"}</td>
                        <td style={{ fontWeight: "700" }}>{row.company}</td>
                        <td>{row.model_name}</td>
                        <td className="num-cell" style={{ fontWeight: "600" }}>{row.quantity}</td>
                        <td className="num-cell" style={{ fontWeight: "700" }}>
                          Rs. {Math.round(Number(row.stock_value || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="accounting-grand-total-row">
                    <td colSpan={3} style={{ fontWeight: "800" }}>
                      GRAND TOTAL INVENTORY ASSET VALUATION
                    </td>
                    <td className="num-cell" style={{ fontWeight: "900" }}>
                      {invSummary.totalUnits.toLocaleString()} Pcs
                    </td>
                    <td className="num-cell" style={{ fontWeight: "900", fontSize: "1.05rem" }}>
                      Rs. {Math.round(invSummary.totalCostVal).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          {/* Audit Verification & Authorization Signatures Block */}
          <ReportSignatures docType="Inventory Stock Valuation & Asset Verification Audit" />
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 5: CUSTOMER RECEIVABLES */}
      {/* ======================================================== */}
      {activeTab === "receivables" && (
        <>
          <AccountingSummaryRibbon
            items={[
              {
                label: "Total Accounts Receivable",
                value: `Rs. ${Math.round(recSummary.totalBalance).toLocaleString()}`,
                tone: "negative",
                aux: `${recSummary.totalParties} Active Debtors`
              },
              {
                label: "Overdue Invoices",
                value: `${recSummary.overdueCount} Invoices`,
                tone: recSummary.overdueCount > 0 ? "negative" : "positive",
                aux: recSummary.overdueCount > 0 ? "Maturity Elapsed" : "All On-Schedule"
              },
              {
                label: "Average Debtor Exposure",
                value: `Rs. ${recSummary.totalParties > 0 ? Math.round(recSummary.totalBalance / recSummary.totalParties).toLocaleString() : 0}`,
                aux: "Per Debtor Client"
              },
              {
                label: "Debtor Portfolio Status",
                value: recSummary.overdueCount === 0 ? "100% Current" : `${recSummary.overdueCount} Delinquent`,
                tone: recSummary.overdueCount === 0 ? "positive" : "negative"
              }
            ]}
          />

          <SectionCard
            title="Customer Accounts Receivable & Credit Aging Schedule"
            subtitle="Itemized audit of outstanding sales credits, debtor contact records, and scheduled maturity dates."
            action={
              <div style={{ display: "flex", gap: "8px" }} className="no-print">
                <button
                  className="ghost-btn btn-sm"
                  onClick={triggerPrint}
                  title="Print customer receivables"
                >
                  🖨️ Print
                </button>
                <button
                  className="ghost-btn btn-sm"
                  onClick={() => exportToCSV("Customer_Receivables_Report", receivablesReport, [], exportMeta)}
                >
                  📥 Export CSV
                </button>
              </div>
            }
          >
            <div style={{ marginBottom: "12px" }} className="no-print">
              <input
                type="text"
                placeholder="🔍 Search debtor name, phone, or invoice #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)" }}
              />
            </div>

            <div className="table-responsive">
              <table className="accounting-data-table">
                <thead>
                  <tr>
                    <th style={{ width: "24%" }}>Customer Debtor</th>
                    <th style={{ width: "16%" }}>Phone Number</th>
                    <th style={{ width: "14%" }}>Invoice Reference</th>
                    <th style={{ width: "18%", textAlign: "right" }}>Balance Due (PKR)</th>
                    <th style={{ width: "14%" }}>Due Date</th>
                    <th style={{ width: "14%" }}>Aging Status</th>
                    <th className="no-print" style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {receivablesReport.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                        No outstanding customer receivable balances on record.
                      </td>
                    </tr>
                  ) : (
                    receivablesReport
                      .filter((r) => {
                        if (!search) return true;
                        const q = search.toLowerCase();
                        return (
                          (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
                          (r.party_name && r.party_name.toLowerCase().includes(q)) ||
                          (r.invoice_number && r.invoice_number.toLowerCase().includes(q))
                        );
                      })
                      .map((row, idx) => {
                        const bal = Number(row.balance_due || row.balance || 0);
                        const isOverdue = row.due_date && row.due_date < new Date().toISOString().slice(0, 10);
                        const name = row.customer_name || row.party_name || "Customer";
                        const phone = row.phone || row.customer_phone || "";

                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: "700" }} className="cell-truncate" title={name}>{name}</td>
                            <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem" }}>{phone || "—"}</td>
                            <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: "600" }}>{row.invoice_number || `#${row.id}`}</td>
                            <td className="num-cell negative-amount" style={{ fontWeight: "700" }}>
                              Rs. {bal.toLocaleString()}
                            </td>
                            <td>{row.due_date || "—"}</td>
                            <td>
                              {isOverdue ? (
                                <span className="status-pill status-danger">⚠️ Overdue</span>
                              ) : (
                                <span className="status-pill status-warning">Pending</span>
                              )}
                            </td>
                            <td className="no-print" style={{ textAlign: "center" }}>
                              {phone ? (
                                <button
                                  className="ghost-btn"
                                  style={{
                                    padding: "3px 8px",
                                    fontSize: "0.75rem",
                                    color: "#10b981",
                                    borderColor: "#10b981"
                                  }}
                                  onClick={() =>
                                    openWhatsAppReminder({
                                      phone,
                                      customerName: name,
                                      invoiceNumber: row.invoice_number,
                                      balance: bal,
                                      dueDate: row.due_date,
                                      shopName: companyName
                                    })
                                  }
                                >
                                  💬 WhatsApp
                                </button>
                              ) : (
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
                <tfoot>
                  <tr className="accounting-grand-total-row">
                    <td colSpan={3} style={{ fontWeight: "800" }}>
                      GRAND TOTAL ACCOUNTS RECEIVABLE ({receivablesReport.length} Debtors)
                    </td>
                    <td className="num-cell negative-amount" style={{ fontWeight: "900", fontSize: "1.05rem" }}>
                      Rs. {Math.round(recSummary.totalBalance).toLocaleString()}
                    </td>
                    <td colSpan={2} style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {recSummary.overdueCount} invoice(s) past maturity
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <ReportSignatures docType="Customer Accounts Receivable & Credit Schedule Audit" />
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 6: SUPPLIER PAYABLES */}
      {/* ======================================================== */}
      {activeTab === "payables" && (
        <>
          <AccountingSummaryRibbon
            items={[
              {
                label: "Total Accounts Payable",
                value: `Rs. ${Math.round(paySummary.totalPayable).toLocaleString()}`,
                tone: "negative",
                aux: "Procurement Liabilities"
              },
              {
                label: "Creditor Vendors",
                value: `${paySummary.totalVendors} Suppliers`,
                aux: "Active Vendor Accounts"
              },
              {
                label: "Average Liability / Supplier",
                value: `Rs. ${paySummary.totalVendors > 0 ? Math.round(paySummary.totalPayable / paySummary.totalVendors).toLocaleString() : 0}`,
                aux: "Per Vendor Exposure"
              },
              {
                label: "Payable Ledger Status",
                value: paySummary.totalPayable > 0 ? "Outstanding Balances" : "All Accounts Cleared",
                tone: paySummary.totalPayable > 0 ? "negative" : "positive"
              }
            ]}
          />

          <SectionCard
            title="Supplier Accounts Payable & Procurement Liabilities Ledger"
            subtitle="Itemized audit of outstanding trade balances owed to parts distributors, phone suppliers, and vendors."
            action={
              <div style={{ display: "flex", gap: "8px" }} className="no-print">
                <button
                  className="ghost-btn btn-sm"
                  onClick={triggerPrint}
                  title="Print supplier payables"
                >
                  🖨️ Print
                </button>
                <button
                  className="ghost-btn btn-sm"
                  onClick={() => exportToCSV("Supplier_Payables_Report", payablesReport, [], exportMeta)}
                >
                  📥 Export CSV
                </button>
              </div>
            }
          >
            <div style={{ marginBottom: "12px" }} className="no-print">
              <input
                type="text"
                placeholder="🔍 Search vendor name, contact, or PO/bill #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)" }}
              />
            </div>

            <div className="table-responsive">
              <table className="accounting-data-table">
                <thead>
                  <tr>
                    <th style={{ width: "28%" }}>Supplier / Vendor Entity</th>
                    <th style={{ width: "18%" }}>Contact Phone</th>
                    <th style={{ width: "22%" }}>Purchase Order / Bill Reference</th>
                    <th style={{ width: "18%", textAlign: "right" }}>Balance Due (PKR)</th>
                    <th style={{ width: "14%" }}>Maturity Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payablesReport.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                        No outstanding supplier payable liabilities found.
                      </td>
                    </tr>
                  ) : (
                    payablesReport
                      .filter((row) => {
                        if (!search) return true;
                        const q = search.toLowerCase();
                        return (
                          (row.vendor_name && row.vendor_name.toLowerCase().includes(q)) ||
                          (row.party_name && row.party_name.toLowerCase().includes(q)) ||
                          (row.phone && row.phone.toLowerCase().includes(q)) ||
                          (row.invoice_number && row.invoice_number.toLowerCase().includes(q))
                        );
                      })
                      .map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: "700" }} className="cell-truncate" title={row.vendor_name || row.party_name || "Supplier"}>
                            {row.vendor_name || row.party_name || "Supplier"}
                          </td>
                          <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem" }}>{row.phone || "—"}</td>
                          <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: "600" }}>{row.invoice_number || `#${row.id}`}</td>
                          <td className="num-cell negative-amount" style={{ fontWeight: "700" }}>
                            Rs. {Number(row.balance_due || row.balance || 0).toLocaleString()}
                          </td>
                          <td>{row.due_date || "—"}</td>
                        </tr>
                      ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="accounting-grand-total-row">
                    <td colSpan={3} style={{ fontWeight: "800" }}>
                      GRAND TOTAL SUPPLIER TRADE PAYABLES ({payablesReport.length} Vendors)
                    </td>
                    <td className="num-cell negative-amount" style={{ fontWeight: "900", fontSize: "1.05rem" }}>
                      Rs. {Math.round(paySummary.totalPayable).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <ReportSignatures docType="Supplier Accounts Payable & Procurement Liability Audit" />
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 7: REVENUE & SALES TURNOVER */}
      {/* ======================================================== */}
      {activeTab === "sales" && (
        <>
          {(() => {
            const totalSalesRev = salesReport.reduce((s, r) => s + Number(r.final_total || r.total_amount || 0), 0);
            const avgSaleVal = salesReport.length > 0 ? Math.round(totalSalesRev / salesReport.length) : 0;
            return (
              <AccountingSummaryRibbon
                items={[
                  {
                    label: "Audited Turnover Sample",
                    value: `Rs. ${Math.round(totalSalesRev).toLocaleString()}`,
                    aux: "Gross POS Volume"
                  },
                  {
                    label: "Billed Transactions Count",
                    value: `${salesReport.length} Orders`,
                    aux: "Customer Checkout Events"
                  },
                  {
                    label: "Average Order Value (AOV)",
                    value: `Rs. ${avgSaleVal.toLocaleString()}`,
                    aux: "Ticket Size Per Sale"
                  },
                  {
                    label: "Operational Velocity",
                    value: "Active Trading",
                    tone: "positive",
                    aux: "Point-of-Sale Register"
                  }
                ]}
              />
            );
          })()}

          {showSalesChart && (
            <div className="no-print" style={{ marginBottom: "16px" }}>
              <SectionCard
                title="Revenue Trajectory Chart (Auxiliary)"
                subtitle="Daily transaction turnover progression."
                action={
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    onClick={() => setShowSalesChart(false)}
                  >
                    ✕ Close Chart
                  </button>
                }
              >
                <div style={{ padding: "10px 0" }}>
                  <BarChart data={salesChartData} height={220} color="#3b82f6" title="Recent Turnover Trend (Rs.)" />
                </div>
              </SectionCard>
            </div>
          )}

          <SectionCard
            title="Sales Revenue & Point-of-Sale Turnover Ledger"
            subtitle="Itemized audit of recent sales orders, payment channels, invoice reference numbers, and billed totals."
            action={
              <div style={{ display: "flex", gap: "8px" }} className="no-print">
                <button
                  type="button"
                  className="ghost-btn btn-sm"
                  onClick={() => setShowSalesChart(!showSalesChart)}
                  title="Toggle turnover bar chart"
                >
                  {showSalesChart ? "Hide Chart" : "📊 Turnover Chart"}
                </button>
                <button
                  className="ghost-btn btn-sm"
                  onClick={triggerPrint}
                  title="Print revenue report"
                >
                  🖨️ Print
                </button>
                <button
                  className="ghost-btn btn-sm"
                  onClick={() => exportToCSV("Sales_Turnover_Report", salesReport, [], exportMeta)}
                  title="Export sales ledger to CSV"
                >
                  📥 Export CSV
                </button>
              </div>
            }
          >
            <div style={{ marginBottom: "12px" }} className="no-print">
              <input
                type="text"
                placeholder="🔍 Search invoice #, customer name, phone, or payment method..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)" }}
              />
            </div>

            <div className="table-responsive">
              <table className="accounting-data-table">
                <thead>
                  <tr>
                    <th style={{ width: "16%" }}>Transaction Date</th>
                    <th style={{ width: "14%" }}>Invoice Reference</th>
                    <th style={{ width: "25%" }}>Customer Account</th>
                    <th style={{ width: "15%" }}>Payment Channel</th>
                    <th style={{ width: "12%", textAlign: "center" }}>Status</th>
                    <th style={{ width: "18%", textAlign: "right" }}>Billed Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReport.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                        No sales transactions recorded on file.
                      </td>
                    </tr>
                  ) : (
                    salesReport
                      .filter((sale) => {
                        if (!search) return true;
                        const q = search.toLowerCase();
                        return (
                          (sale.invoice_number && sale.invoice_number.toLowerCase().includes(q)) ||
                          (sale.customer_name && sale.customer_name.toLowerCase().includes(q)) ||
                          (sale.customer_phone && sale.customer_phone.toLowerCase().includes(q)) ||
                          (sale.payment_method && sale.payment_method.toLowerCase().includes(q))
                        );
                      })
                      .slice(0, 50)
                      .map((sale, idx) => {
                        const amount = Number(sale.final_total || sale.total_amount || 0);
                        return (
                          <tr key={sale.id || idx}>
                            <td>{sale.sale_date ? new Date(sale.sale_date).toLocaleString() : "—"}</td>
                            <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: "700" }}>{sale.invoice_number || `#${sale.id}`}</td>
                            <td>
                              <strong>{sale.customer_name || "Walk-in Customer"}</strong>
                              {sale.customer_phone && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{sale.customer_phone}</div>}
                            </td>
                            <td>
                              <span className="status-pill status-info">
                                {String(sale.payment_method || "cash").toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className="status-pill status-positive">Settled</span>
                            </td>
                            <td className="num-cell" style={{ fontWeight: "700" }}>
                              Rs. {Math.round(amount).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
                <tfoot>
                  <tr className="accounting-grand-total-row">
                    <td colSpan={5} style={{ fontWeight: "800" }}>
                      GRAND TOTAL SAMPLED SALES REVENUE ({salesReport.slice(0, 50).length} Orders)
                    </td>
                    <td className="num-cell" style={{ fontWeight: "900", fontSize: "1.05rem" }}>
                      Rs. {Math.round(salesReport.slice(0, 50).reduce((s, r) => s + Number(r.final_total || r.total_amount || 0), 0)).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <ReportSignatures docType="Sales Revenue & Turnover Verification Audit" />
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 8: SALARIES & PAYROLL REPORT */}
      {/* ======================================================== */}
      {activeTab === "salaries" && (
        <>
          {/* Summary Executive Accounting Ribbon */}
          <AccountingSummaryRibbon
            items={[
              {
                label: "Total Net Payroll Disbursed",
                value: `Rs. ${Math.round(salSummary.totalNet).toLocaleString()}`,
                tone: "positive",
                aux: `${salSummary.count} Vouchers Audited`
              },
              {
                label: "Gross Base Salaries",
                value: `Rs. ${Math.round(salSummary.totalBase).toLocaleString()}`,
                aux: "Contractual Wages"
              },
              {
                label: "Performance Bonuses",
                value: `+Rs. ${Math.round(salSummary.totalBonus).toLocaleString()}`,
                tone: "positive",
                aux: "Incentives Awarded"
              },
              {
                label: "Advance Recoveries",
                value: `-Rs. ${Math.round(salSummary.totalAdvance).toLocaleString()}`,
                tone: "negative",
                aux: "Repayments Deducted"
              },
              {
                label: "Statutory Deductions",
                value: `-Rs. ${Math.round(salSummary.totalDeductions).toLocaleString()}`,
                tone: "negative",
                aux: "Withholdings & Penalties"
              }
            ]}
          />

          <SectionCard
            title="Staff Salaries & Payroll Disbursement Ledger"
            subtitle="Itemized audit of employee monthly base salaries, bonuses, advance deductions, and net payouts."
            action={
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }} className="no-print">
                <button
                  type="button"
                  className="ghost-btn btn-sm"
                  onClick={loadActiveReport}
                  title="Refresh records"
                >
                  🔄 Refresh
                </button>

                <button
                  type="button"
                  className="ghost-btn btn-sm"
                  onClick={triggerPrint}
                  title="Print salary report"
                >
                  🖨️ Print
                </button>

                <button
                  type="button"
                  className="ghost-btn btn-sm"
                  onClick={handleExportSalaryCSV}
                  disabled={filteredSalaryReport.length === 0}
                  title="Export to CSV spreadsheet"
                >
                  📥 Export CSV
                </button>
              </div>
            }
          >
            {/* Filter Search */}
            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }} className="no-print">
              <input
                type="text"
                placeholder="🔍 Search disbursed records by staff name, ID, or notes..."
                value={salarySearch}
                onChange={(e) => setSalarySearch(e.target.value)}
                className="input-text"
                style={{ maxWidth: "380px" }}
              />
              <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                Showing {filteredSalaryReport.length} of {salaryReport.length} record(s) {salaryTimeScope === "month" ? `for ${salaryMonthFilter}` : "across all months"}
              </span>
            </div>

            {/* Historical Salaries Accounting Table */}
            <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
              <table className="accounting-data-table" style={{ minWidth: "1350px", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "40px", minWidth: "40px", textAlign: "center", whiteSpace: "nowrap" }}>#</th>
                    <th style={{ minWidth: "110px", whiteSpace: "nowrap" }}>Payment Date</th>
                    <th style={{ minWidth: "110px", whiteSpace: "nowrap" }}>Salary Month</th>
                    <th style={{ minWidth: "150px", whiteSpace: "nowrap" }}>Employee Staff</th>
                    <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>Designation</th>
                    <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>Branch Outlet</th>
                    <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Base Salary</th>
                    <th style={{ minWidth: "100px", textAlign: "right", whiteSpace: "nowrap" }}>Bonus (+)</th>
                    <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Advance (-)</th>
                    <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Other Ded. (-)</th>
                    <th style={{ minWidth: "120px", textAlign: "right", whiteSpace: "nowrap" }}>Net Disbursed</th>
                    <th style={{ minWidth: "100px", whiteSpace: "nowrap" }}>Method</th>
                    <th style={{ minWidth: "150px", whiteSpace: "nowrap" }}>Audit Notes</th>
                    <th style={{ minWidth: "65px", textAlign: "center", whiteSpace: "nowrap" }} className="no-print">Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="14" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                        ⏳ Loading disbursed salary audit records...
                      </td>
                    </tr>
                  ) : filteredSalaryReport.length === 0 ? (
                    <tr>
                      <td colSpan="14" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                        <div style={{ fontWeight: "700", fontSize: "1rem", color: "var(--text-primary)" }}>
                          {salaryTimeScope === "month"
                            ? `No Salary Records Found For ${salaryMonthFilter}`
                            : "No Historical Salary Disbursements Found"}
                        </div>
                        <p style={{ margin: "4px 0 12px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {salaryTimeScope === "month"
                            ? `Salaries for ${salaryMonthFilter} have not been recorded or disbursed yet.`
                            : "No salary disbursements have been entered into the system."}
                        </p>
                        {salaryTimeScope === "month" && (
                          <button
                            type="button"
                            className="ghost-btn btn-sm"
                            onClick={() => setSalaryTimeScope("all")}
                          >
                            🗓️ View All Months History
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredSalaryReport.map((s, idx) => (
                      <tr key={s.id}>
                        <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                          {idx + 1}
                        </td>
                        <td>{s.payment_date}</td>
                        <td style={{ fontWeight: "700" }}>{s.salary_month}</td>
                        <td>
                          <div style={{ fontWeight: "700" }}>{s.employee_name}</div>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: #{s.employee_id}</span>
                        </td>
                        <td>{s.designation}</td>
                        <td>{s.branch_name}</td>
                        <td className="num-cell">Rs. {Number(s.base_salary || 0).toLocaleString()}</td>
                        <td className="num-cell positive-amount">
                          {Number(s.bonus || 0) > 0 ? `+Rs. ${Number(s.bonus).toLocaleString()}` : "Rs. 0"}
                        </td>
                        <td className="num-cell negative-amount">
                          {Number(s.advance_deduction || 0) > 0 ? `-Rs. ${Number(s.advance_deduction).toLocaleString()}` : "Rs. 0"}
                        </td>
                        <td className="num-cell negative-amount">
                          {Number(s.deductions || 0) > 0 ? `-Rs. ${Number(s.deductions).toLocaleString()}` : "Rs. 0"}
                        </td>
                        <td className="num-cell" style={{ fontWeight: "800" }}>
                          Rs. {Number(s.net_salary || 0).toLocaleString()}
                        </td>
                        <td>
                          <span className="status-pill status-info">
                            {String(s.payment_method || "cash").toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          <div>{s.notes || "—"}</div>
                          {s.paid_by_name && (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>By: {s.paid_by_name}</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }} className="no-print">
                          <button
                            type="button"
                            className="ghost-btn btn-sm"
                            onClick={() => setViewingSalaryVoucher(s)}
                            title="View & print official salary payment voucher slip"
                          >
                            🧾 Slip
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="accounting-grand-total-row">
                    <td colSpan={6} style={{ fontWeight: "800" }}>
                      GRAND TOTAL PAYROLL DISBURSEMENT ({filteredSalaryReport.length} Staff)
                    </td>
                    <td className="num-cell" style={{ fontWeight: "700" }}>
                      Rs. {Math.round(filteredSalaryReport.reduce((s, r) => s + Number(r.base_salary || 0), 0)).toLocaleString()}
                    </td>
                    <td className="num-cell positive-amount" style={{ fontWeight: "700" }}>
                      +Rs. {Math.round(filteredSalaryReport.reduce((s, r) => s + Number(r.bonus || 0), 0)).toLocaleString()}
                    </td>
                    <td className="num-cell negative-amount" style={{ fontWeight: "700" }}>
                      -Rs. {Math.round(filteredSalaryReport.reduce((s, r) => s + Number(r.advance_deduction || 0), 0)).toLocaleString()}
                    </td>
                    <td className="num-cell negative-amount" style={{ fontWeight: "700" }}>
                      -Rs. {Math.round(filteredSalaryReport.reduce((s, r) => s + Number(r.deductions || 0), 0)).toLocaleString()}
                    </td>
                    <td className="num-cell" style={{ fontWeight: "900", fontSize: "1.05rem" }}>
                      Rs. {Math.round(filteredSalaryReport.reduce((s, r) => s + Number(r.net_salary || 0), 0)).toLocaleString()}
                    </td>
                    <td colSpan={2} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Audit Certified
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <ReportSignatures docType="Staff Salaries & Payroll Disbursement Audit" />
        </>
      )}

      {/* Official Printable Salary Voucher Slip Modal */}
      {viewingSalaryVoucher && (
        <SalaryVoucherModal
          voucher={viewingSalaryVoucher}
          onClose={() => setViewingSalaryVoucher(null)}
          shopName={companyName}
          companyLogo={companyLogo}
        />
      )}

      {/* MODAL: DISBURSE DIVIDEND */}
      {disbursingTarget && (
        <div className="modal-backdrop" onClick={() => !isDisbursing && setDisbursingTarget(null)} style={{ zIndex: 1100 }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleDisburseSubmit}>
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>
                    💸 {disbursingTarget.all ? "Batch Disburse Branch Dividends" : `Disburse Dividend: ${disbursingTarget.partnerName}`}
                  </h3>
                  <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
                    Branch: <strong>{dividendData?.branch?.name || activeBranchName}</strong> | Period: <strong>{dividendData?.period?.label}</strong>
                  </p>
                </div>
                <button type="button" className="close-btn" onClick={() => !isDisbursing && setDisbursingTarget(null)}>
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid">
                {error && <div className="alert error">{error}</div>}

                <div
                  style={{
                    background: "var(--surface-strong)",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block" }}>
                      {disbursingTarget.all ? "Total Undisbursed Dividends Payable:" : `Payable to ${disbursingTarget.partnerName}:`}
                    </span>
                    <strong style={{ fontSize: "1.25rem", color: "var(--positive)", fontWeight: "800" }}>
                      Rs. {Math.round(
                        disbursingTarget.all
                          ? (dividendData?.dividends?.partnerDistributions || [])
                              .filter((p) => !p.isDisbursed && p.dividendAmount > 0)
                              .reduce((s, p) => s + p.dividendAmount, 0)
                          : disbursingTarget.dividendAmount
                      ).toLocaleString()}
                    </strong>
                  </div>
                  <span
                    style={{
                      background: "var(--positive-bg)",
                      color: "var(--positive)",
                      border: "1px solid var(--positive-border, transparent)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontWeight: "700",
                      fontSize: "0.78rem"
                    }}
                  >
                    Certified Net Profit
                  </span>
                </div>

                <label>
                  <span style={{ fontWeight: "700", fontSize: "0.86rem" }}>Payment Channel:</span>
                  <select
                    value={disburseForm.paymentMethod}
                    onChange={(e) => setDisburseForm({ ...disburseForm, paymentMethod: e.target.value })}
                    className="input-select"
                    style={{ width: "100%", padding: "8px 10px", marginTop: "4px" }}
                  >
                    <option value="cash">Cash In Hand / Till Drawer</option>
                    <option value="bank_transfer">Online Bank Transfer / IBFT</option>
                    <option value="cheque">Bank Cheque / Pay Order</option>
                  </select>
                </label>

                <label>
                  <span style={{ fontWeight: "700", fontSize: "0.86rem" }}>Reference / Cheque # (Optional):</span>
                  <input
                    type="text"
                    placeholder="e.g. IBFT-98472 or Cheque # 40182"
                    value={disburseForm.referenceDetails}
                    onChange={(e) => setDisburseForm({ ...disburseForm, referenceDetails: e.target.value })}
                    className="input-text"
                    style={{ width: "100%", padding: "8px 10px", marginTop: "4px" }}
                  />
                </label>

                <label>
                  <span style={{ fontWeight: "700", fontSize: "0.86rem" }}>Remarks / Notes:</span>
                  <textarea
                    rows={2}
                    placeholder="e.g. Approved monthly partner dividend payout"
                    value={disburseForm.notes}
                    onChange={(e) => setDisburseForm({ ...disburseForm, notes: e.target.value })}
                    className="input-text"
                    style={{ width: "100%", padding: "8px 10px", marginTop: "4px", resize: "vertical" }}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setDisbursingTarget(null)} disabled={isDisbursing}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isDisbursing}>
                  {isDisbursing ? "Disbursing..." : "Confirm & Generate Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable Partner Voucher Slip Modal */}
      {viewingPartnerVoucher && (
        <PartnerVoucherModal
          voucher={viewingPartnerVoucher}
          onClose={() => setViewingPartnerVoucher(null)}
          shopName={companyName}
          companyLogo={companyLogo}
        />
      )}
    </div>
  );
}
