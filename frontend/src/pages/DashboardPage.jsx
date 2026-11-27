import { useEffect, useState } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { BarChart, DonutChart } from "../components/Charts.jsx";

export function DashboardPage({ context, onNavigate }) {
  const [branchId, setBranchId] = useState(context.session.branch_id || context.session.branchId || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api.dashboard(date, branchId)
      .then(setSummary)
      .catch((loadError) => setError(loadError.message));
  }, [date, branchId]);

  const selectedBranch = context.branches?.find((b) => String(b.id) === String(branchId));
  const isSelectedBranchExpired = selectedBranch && (selectedBranch.is_expired || selectedBranch.effective_status === "expired");

  if (!summary && error) {
    return (
      <div className="page-grid">
        <SectionCard
          title="Daily Dashboard"
          subtitle="Current day sales, purchases, stock, dues, and reminders."
          action={
            <div className="toolbar">
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                <option value="">All branches</option>
                {context.branches?.map((branch) => {
                  const isExp = branch.is_expired || branch.isExpired || branch.effective_status === "expired" || branch.subscription_status === "expired";
                  return (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}{isExp ? " [Expired]" : ""}
                    </option>
                  );
                })}
              </select>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          }
        >
          <div className="alert error">{error}</div>
        </SectionCard>
      </div>
    );
  }

  if (!summary) {
    return <div className="panel-loading">Loading dashboard...</div>;
  }

  const comparisonChartData = [
    { label: "Sales", value: Number(summary.sales?.totalSales || 0) },
    { label: "Collected", value: Number(summary.sales?.collected || 0) },
    ...(summary.profit
      ? [
          { label: "COGS", value: Number(summary.profit.totalCogs || 0) },
          { label: "Gross Profit", value: Math.max(0, Number(summary.profit.grossProfit || 0)) },
          { label: "Net Profit", value: Math.max(0, Number(summary.profit.netProfit || 0)) }
        ]
      : []),
    { label: "Purchases", value: Number(summary.purchases?.totalPurchases || 0) },
    { label: "Expenses", value: Number(summary.expenses?.totalExpenses || 0) }
  ];

  const financialFlowDonut = [
    { label: "Cash Collected", value: Number(summary.sales?.collected || 0), color: "#10b981" },
    { label: "Receivables Pending", value: Number(summary.receivables?.pendingReceivables || 0), color: "#3b82f6" },
    { label: "Purchases Paid", value: Number(summary.purchases?.paidOut || 0), color: "#f59e0b" },
    { label: "Expenses", value: Number(summary.expenses?.totalExpenses || 0), color: "#ef4444" }
  ].filter((d) => d.value > 0);

  return (
    <div className="page-grid">
      <SectionCard
        title="Daily Dashboard"
        subtitle="Current day sales, purchases, stock, dues, and reminders."
        action={
          <div className="toolbar">
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              <option value="">All branches</option>
              {context.branches?.map((branch) => {
                const isExp = branch.is_expired || branch.isExpired || branch.effective_status === "expired" || branch.subscription_status === "expired";
                return (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}{isExp ? " [Expired]" : ""}
                  </option>
                );
              })}
            </select>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        }
      >
        {isSelectedBranchExpired && (
          <div
            className="alert-banner"
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem"
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>🏢</span>
            <div style={{ fontSize: "0.88rem" }}>
              <strong>Notice:</strong> Branch <strong>{selectedBranch.name} ({selectedBranch.code})</strong> subscription is currently expired. Operational checkout and inventory modifications are restricted for staff, but comprehensive dashboard metrics, historical sales, and financial balances remain fully accessible to the Company Admin.
            </div>
          </div>
        )}
        {error ? <div className="alert error">{error}</div> : null}
        <div className="stats-grid">
          {summary.profit && (
            <>
              <StatCard
                label="Net Operating Profit"
                value={`PKR ${Number(summary.profit.netProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                tone={summary.profit.isProfitable ? "positive" : "danger"}
                badge={summary.profit.isProfitable ? "PROFIT" : "LOSS"}
                subtitle={`Net Margin: ${summary.profit.netMarginPct}% • MTD: PKR ${Number(summary.profit.mtd?.netProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              />
              <StatCard
                label="Gross Trading Profit"
                value={`PKR ${Number(summary.profit.grossProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                tone={summary.profit.grossProfit >= 0 ? "positive" : "danger"}
                subtitle={`Gross Margin: ${summary.profit.grossMarginPct}% on Turnover`}
              />
              <StatCard
                label="Cost of Goods Sold (COGS)"
                value={`PKR ${Number(summary.profit.totalCogs).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                tone="warning"
                subtitle="Cost of items sold today"
              />
            </>
          )}
          <StatCard label="Total Sales" value={`PKR ${Number(summary.sales.totalSales).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="positive" />
          <StatCard label="Total Purchases" value={`PKR ${Number(summary.purchases.totalPurchases).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
          <StatCard label="Collections Received" value={`PKR ${Number(summary.sales.collected).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="positive" />
          <StatCard label="Payments Made" value={`PKR ${Number(summary.purchases.paidOut).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
          <StatCard label="Total Expenses" value={`PKR ${Number(summary.expenses.totalExpenses).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="warning" />
          <StatCard label="Inventory In Hand" value={`${summary.stock.inHandCount} units`} />
          <StatCard label="Stock Value" value={`PKR ${Number(summary.stock.stockValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
          <StatCard label="Pending Receivables" value={`PKR ${Number(summary.receivables.pendingReceivables).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="positive" />
          <StatCard label="Pending Payables" value={`PKR ${Number(summary.payables.pendingPayables).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="warning" />
          <StatCard label="Due Today" value={`PKR ${Number(summary.receivables.dueToday).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="warning" />
          <StatCard label="Overdue" value={`PKR ${Number(summary.receivables.overdue).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="danger" />
        </div>
      </SectionCard>

      {/* Company Admin Profit & Margins Executive Center */}
      {summary.profit && (
        <SectionCard
          title="Company Profitability & Trading Margin Audit"
          subtitle={`Audited daily profit equation and Month-to-Date (MTD) cumulative yield for ${date}.`}
          action={
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="secondary-btn btn-sm"
                onClick={() => onNavigate && onNavigate("reports_profit")}
                style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                title="Open comprehensive Profit Report in Reports section"
              >
                <span>💰</span> Open Full Profit Report →
              </button>
            </div>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            {/* Daily Profit Breakdown Card */}
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "16px",
                background: "var(--card-bg, rgba(255, 255, 255, 0.02))",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>📅 Daily Profit Waterfall ({date})</span>
                <span
                  className={`status-pill ${summary.profit.isProfitable ? "status-success" : "status-danger"}`}
                  style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                >
                  {summary.profit.isProfitable ? "● Net Profitable" : "⚠️ Operating Loss"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.88rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Gross Billed Sales:</span>
                  <strong>PKR {Number(summary.profit.grossSales).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                </div>
                {summary.profit.saleRefunds > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}>
                    <span>Less: Customer Refunds:</span>
                    <span>-PKR {Number(summary.profit.saleRefunds).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {summary.profit.repairRevenue > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981" }}>
                    <span>Add: Delivered Repairs:</span>
                    <span>+PKR {Number(summary.profit.repairRevenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border)", paddingTop: "6px" }}>
                  <span className="muted">Net Operating Turnover:</span>
                  <strong style={{ color: "#3b82f6" }}>PKR {Number(summary.profit.netTurnover).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#f59e0b" }}>
                  <span>Less: Cost of Goods (COGS):</span>
                  <span>-PKR {Number(summary.profit.totalCogs).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "6px" }}>
                  <span>Gross Trading Profit:</span>
                  <strong style={{ color: summary.profit.grossProfit >= 0 ? "#10b981" : "#ef4444" }}>
                    PKR {Number(summary.profit.grossProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span style={{ fontSize: "0.75rem", marginLeft: "6px", opacity: 0.85 }}>({summary.profit.grossMarginPct}%)</span>
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}>
                  <span>Less: Operating Expenses:</span>
                  <span>-PKR {Number(summary.profit.totalExpenses).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "2px solid var(--border)",
                    paddingTop: "8px",
                    marginTop: "4px",
                    fontSize: "1.05rem"
                  }}
                >
                  <strong>Net Operating Profit:</strong>
                  <strong style={{ color: summary.profit.netProfit >= 0 ? "#10b981" : "#ef4444" }}>
                    PKR {Number(summary.profit.netProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span style={{ fontSize: "0.78rem", marginLeft: "6px", opacity: 0.85 }}>({summary.profit.netMarginPct}%)</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* MTD Cumulative Performance Card */}
            {summary.profit.mtd && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "16px",
                  background: "var(--card-bg, rgba(255, 255, 255, 0.02))",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>📈 Month-to-Date (MTD) Profit Performance</span>
                  <span
                    className={`status-pill ${summary.profit.mtd.isProfitable ? "status-success" : "status-danger"}`}
                    style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                  >
                    MTD: {summary.profit.mtd.isProfitable ? "Profitable" : "Loss"}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.88rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">MTD Net Turnover:</span>
                    <strong>PKR {Number(summary.profit.mtd.netTurnover).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#f59e0b" }}>
                    <span>MTD Total COGS:</span>
                    <span>-PKR {Number(summary.profit.mtd.totalCogs).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "6px" }}>
                    <span>MTD Gross Trading Profit:</span>
                    <strong style={{ color: summary.profit.mtd.grossProfit >= 0 ? "#10b981" : "#ef4444" }}>
                      PKR {Number(summary.profit.mtd.grossProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      <span style={{ fontSize: "0.75rem", marginLeft: "6px", opacity: 0.85 }}>({summary.profit.mtd.grossMarginPct}%)</span>
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}>
                    <span>MTD Operating Expenses:</span>
                    <span>-PKR {Number(summary.profit.mtd.expenses).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "2px solid var(--border)",
                      paddingTop: "8px",
                      marginTop: "4px",
                      fontSize: "1.05rem"
                    }}
                  >
                    <strong>MTD Net Operating Profit:</strong>
                    <strong style={{ color: summary.profit.mtd.netProfit >= 0 ? "#10b981" : "#ef4444" }}>
                      PKR {Number(summary.profit.mtd.netProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      <span style={{ fontSize: "0.78rem", marginLeft: "6px", opacity: 0.85 }}>({summary.profit.mtd.netMarginPct}%)</span>
                    </strong>
                  </div>
                  <div style={{ marginTop: "10px", fontSize: "0.8rem", color: "var(--text-muted)", background: "rgba(59, 130, 246, 0.05)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(59, 130, 246, 0.15)" }}>
                    💡 <strong>Profit Margin Tip:</strong> Net profit margin measures the actual profit kept from each rupee of turnover after accounting for cost of goods sold and operating overheads.
                  </div>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Visual Analytics Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        <SectionCard title="Financial Flow Comparison" subtitle="Daily turnover, procurement, and overhead metrics.">
          <BarChart data={comparisonChartData} height={220} color="#3b82f6" />
        </SectionCard>

        <SectionCard title="Cash & Working Capital Balance" subtitle="Breakdown of collections, dues, and operating expenses.">
          <DonutChart data={financialFlowDonut} size={180} />
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* Branch Subscription Health Card */}
        {context.branches && context.branches.length > 0 && (
          <SectionCard
            title="Branch Subscriptions Health"
            subtitle="Current SaaS license and renewal status per store location."
          >
            <div className="stack-list">
              {context.branches.map((b) => {
                const isExp = b.is_expired || b.effective_status === "expired";
                const isGrace = b.is_grace || b.effective_status === "grace";
                const isTrial = b.effective_status === "trialing";
                const isSoon = b.is_expiring_soon;

                return (
                  <div
                    key={b.id}
                    className="list-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderLeft: isExp ? "4px solid #ef4444" : isGrace ? "4px solid #f59e0b" : "4px solid #10b981",
                      paddingLeft: "12px"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong>{b.name}</strong>
                        <span className="small muted font-mono">({b.code})</span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted, #64748b)", marginTop: "2px" }}>
                        Package: {b.plan_name || "Starter"}
                        {b.current_period_ends_on && ` • Ends: ${new Date(b.current_period_ends_on).toLocaleDateString()}`}
                        {b.trial_ends_on && !b.current_period_ends_on && ` • Trial: ${new Date(b.trial_ends_on).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div>
                      {isExp ? (
                        <span className="status-pill status-danger" style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                          ⛔ Expired
                        </span>
                      ) : isGrace ? (
                        <span className="status-pill status-warning" style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                          ⚠️ Grace Period
                        </span>
                      ) : isSoon ? (
                        <span className="status-pill status-warning" style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                          ⚠️ Expiring Soon ({b.days_left}d)
                        </span>
                      ) : isTrial ? (
                        <span className="status-pill status-info" style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                          Trial ({b.days_left !== null ? `${b.days_left}d left` : "Active"})
                        </span>
                      ) : (
                        <span className="status-pill status-success" style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                          ● Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        <SectionCard title="Unread Notifications" subtitle="Branch alerts, due dates, and reminders.">
          <div className="stack-list">
            {summary.notifications.length ? (
              summary.notifications.map((notification) => (
                <article key={notification.id} className="list-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <strong>{notification.title}</strong>
                      {notification.branch_name && (
                        <span
                          className="badge"
                          style={{
                            fontSize: "0.72rem",
                            padding: "1px 6px",
                            background: "rgba(59, 130, 246, 0.1)",
                            color: "#3b82f6",
                            border: "1px solid rgba(59, 130, 246, 0.25)",
                            borderRadius: "4px"
                          }}
                        >
                          🏢 {notification.branch_name} {notification.branch_code ? `(${notification.branch_code})` : ""}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted, #64748b)" }}>{notification.message}</p>
                  </div>
                  <span className="muted small" style={{ whiteSpace: "nowrap" }}>{notification.due_date || "No due date"}</span>
                </article>
              ))
            ) : (
              <p className="muted">No pending notifications.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
