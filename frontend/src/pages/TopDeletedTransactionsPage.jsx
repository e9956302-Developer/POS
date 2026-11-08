import { useEffect, useState } from "react";
import { api } from "../api.js";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { SectionCard } from "../components/SectionCard.jsx";

function formatPKR(val) {
  const num = Number(val || 0);
  return `PKR ${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDate(val) {
  if (!val) return "N/A";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(val);
  }
}

function formatRoleName(role) {
  if (!role) return "Staff";
  switch (role) {
    case "top_admin":
      return "SaaS Admin";
    case "business_super_admin":
      return "Company Admin";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "cashier":
      return "Cashier";
    default:
      return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function TopDeletedTransactionsPage({ context }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [stats, setStats] = useState({
    totalDeleted: 0,
    voidedSalesCount: 0,
    voidedSalesAmount: 0,
    voidedPurchasesCount: 0,
    voidedPurchasesAmount: 0,
    voidedExpensesCount: 0,
    voidedExpensesAmount: 0
  });

  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [limit, setLimit] = useState(20);
  const [companies, setCompanies] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [businessFilter, setBusinessFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [inspectItem, setInspectItem] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [restoreItem, setRestoreItem] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    // Load companies for the filter
    api.businesses()
      .then((data) => setCompanies(Array.isArray(data) ? data : data.businesses || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadDeletedTransactions();
  }, [typeFilter, businessFilter, page, limit]);

  async function loadDeletedTransactions() {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set("search", search.trim());
      if (typeFilter !== "all") q.set("type", typeFilter);
      if (businessFilter) q.set("businessId", businessFilter);
      q.set("page", String(page));
      q.set("limit", String(limit));

      const queryStr = q.toString() ? `?${q.toString()}` : "";
      const res = await api.topDeletedTransactions(queryStr);
      setStats(res.stats || {});
      setTransactions(res.transactions || []);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || "Failed to load deleted transactions");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    loadDeletedTransactions();
  }

  async function handleInspect(item) {
    setInspectLoading(true);
    setError("");
    try {
      const full = await api.topDeletedTransaction(item.transaction_type, item.id);
      setInspectItem(full);
    } catch (err) {
      setError(err.message || "Failed to inspect transaction");
    } finally {
      setInspectLoading(false);
    }
  }

  async function handleConfirmRestore() {
    if (!restoreItem) return;
    setIsRestoring(true);
    setError("");
    try {
      await api.topRestoreTransaction(restoreItem.transaction_type, restoreItem.id);
      setSuccessMsg(`Transaction #${restoreItem.reference_no || restoreItem.id} restored successfully!`);
      setRestoreItem(null);
      if (inspectItem && inspectItem.id === restoreItem.id) {
        setInspectItem(null);
      }
      loadDeletedTransactions();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setError(err.message || "Failed to restore transaction");
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div className="topadmin-management-page">
      {/* Management Header */}
      <div className="management-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              fontSize: "1.5rem",
              flexShrink: 0
            }}
          >
            🗑️
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              Deleted Transactions Audit & Restoration
            </h1>
            <p className="muted" style={{ margin: "0.25rem 0 0 0", fontSize: "0.88rem" }}>
              Inspect transactions voided or deleted by company branch staff, view staff audit details, and restore records.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={loadDeletedTransactions}
          disabled={loading}
          title="Refresh deleted records"
        >
          🔄 Refresh
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {successMsg && <div className="alert success">{successMsg}</div>}

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="muted small">Total Deleted</span>
          <strong style={{ fontSize: "1.45rem", color: "var(--text)" }}>{stats.totalDeleted || 0}</strong>
          <span className="muted small">All subscriber companies</span>
        </div>

        <div className="stat-card">
          <span className="muted small">Voided Sales Volume</span>
          <strong style={{ fontSize: "1.35rem", color: "#f87171" }}>{formatPKR(stats.voidedSalesAmount)}</strong>
          <span className="muted small">{stats.voidedSalesCount || 0} voided sale invoices</span>
        </div>

        <div className="stat-card">
          <span className="muted small">Voided Purchases Volume</span>
          <strong style={{ fontSize: "1.35rem", color: "#fb923c" }}>{formatPKR(stats.voidedPurchasesAmount)}</strong>
          <span className="muted small">{stats.voidedPurchasesCount || 0} voided purchase bills</span>
        </div>

        <div className="stat-card">
          <span className="muted small">Voided Expenses</span>
          <strong style={{ fontSize: "1.35rem", color: "#a855f7" }}>{formatPKR(stats.voidedExpensesAmount)}</strong>
          <span className="muted small">{stats.voidedExpensesCount || 0} voided expense items</span>
        </div>
      </div>

      {/* Main Table Card */}
      <SectionCard
        title={`Deleted Records List (${pagination.total || 0})`}
        subtitle="Click Inspect to review line items, IMEIs, and audit history, or Restore to reactivate."
      >
        {/* Responsive Filter Toolbar */}
        <form className="table-filter-bar wrap" onSubmit={handleSearchSubmit}>
          <div className="search-field">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by invoice #, party, reason, staff name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-group">
            <label>
              <span>Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Types</option>
                <option value="sale">Voided Sales</option>
                <option value="purchase">Voided Purchases</option>
                <option value="expense">Voided Expenses</option>
              </select>
            </label>

            <label>
              <span>Company:</span>
              <select
                value={businessFilter}
                onChange={(e) => {
                  setBusinessFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="primary-btn btn-sm" disabled={loading}>
              Filter
            </button>

            {(search || typeFilter !== "all" || businessFilter) && (
              <button
                type="button"
                className="ghost-btn btn-sm"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setBusinessFilter("");
                  setPage(1);
                }}
              >
                Reset
              </button>
            )}
          </div>
        </form>

        {/* Records Table */}
        {loading ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center" }} className="muted">
            <p>Loading deleted transactions audit trail...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center" }} className="muted">
            <p style={{ fontSize: "2.2rem", margin: "0 0 0.5rem 0" }}>🛡️</p>
            <h3 style={{ margin: "0 0 0.35rem 0" }}>No deleted transactions found</h3>
            <p style={{ margin: 0 }}>No records match the current filters or no transactions have been deleted yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="deleted-records-table">
              <thead>
                <tr>
                  <th style={{ width: "23%" }}>Transaction</th>
                  <th style={{ width: "18%" }}>Company / Branch</th>
                  <th style={{ width: "13%" }}>Amount</th>
                  <th style={{ width: "14%" }}>Deleted Timing</th>
                  <th style={{ width: "16%" }}>Deleted By</th>
                  <th style={{ width: "16%" }}>Reason</th>
                  <th className="sticky-actions-cell" style={{ textAlign: "right", minWidth: "140px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => {
                  const typeLabel =
                    item.transaction_type === "sale"
                      ? "Sale"
                      : item.transaction_type === "purchase"
                      ? "Purchase"
                      : "Expense";
                  const typeClass =
                    item.transaction_type === "sale"
                      ? "badge-danger"
                      : item.transaction_type === "purchase"
                      ? "badge-warning"
                      : "badge-purple";

                  return (
                    <tr key={`${item.transaction_type}-${item.id}`}>
                      {/* Transaction Column: Badge + Reference # + Party */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                            <span className={`badge ${typeClass}`}>
                              {typeLabel}
                            </span>
                            <strong style={{ color: "var(--text)", wordBreak: "break-all" }}>
                              {item.reference_no || `#${item.id}`}
                            </strong>
                          </div>
                          {item.party_name && (
                            <span className="muted small" style={{ fontSize: "0.78rem" }}>
                              {item.party_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Company & Branch Column */}
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.86rem", color: "var(--text)" }}>
                            {item.business_name}
                          </div>
                          <div className="muted small" style={{ fontSize: "0.76rem" }}>
                            {item.branch_name} ({item.branch_code})
                          </div>
                        </div>
                      </td>

                      {/* Amount Column */}
                      <td>
                        <div>
                          <strong style={{ color: "var(--text)", fontSize: "0.92rem", whiteSpace: "nowrap" }}>
                            {formatPKR(item.amount)}
                          </strong>
                          {item.item_count > 0 && (
                            <div className="muted small" style={{ fontSize: "0.75rem" }}>
                              {item.item_count} items
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Deleted Timing Column */}
                      <td>
                        <div>
                          <div style={{ fontSize: "0.84rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {formatDate(item.deleted_at)}
                          </div>
                          <div className="muted small" style={{ fontSize: "0.74rem", whiteSpace: "nowrap" }}>
                            Txn: {item.transaction_date ? String(item.transaction_date).slice(0, 10) : "N/A"}
                          </div>
                        </div>
                      </td>

                      {/* Deleted By Staff Column: Normal, clean, professional layout */}
                      <td>
                        <div className="staff-audit-cell">
                          <div className="staff-audit-avatar">
                            {(item.deleted_by_name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="staff-audit-meta">
                            <span className="staff-audit-name" title={item.deleted_by_name || "Staff User"}>
                              {item.deleted_by_name || "Staff User"}
                            </span>
                            <span className="staff-audit-role">
                              {formatRoleName(item.deleted_by_role)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Deletion Reason Column */}
                      <td>
                        <div
                          className="deletion-reason-bubble"
                          title={item.deletion_reason || "No reason specified"}
                        >
                          {item.deletion_reason || "No reason specified"}
                        </div>
                      </td>

                      {/* Actions Column: Pinned sticky, always completely visible on page */}
                      <td className="sticky-actions-cell">
                        <div className="table-actions-group">
                          <button
                            type="button"
                            className="secondary-btn btn-sm"
                            style={{ padding: "0.32rem 0.6rem", fontSize: "0.8rem" }}
                            onClick={() => handleInspect(item)}
                            title="Inspect items & audit"
                          >
                            👁️ Inspect
                          </button>
                          <button
                            type="button"
                            className="primary-btn btn-sm"
                            style={{
                              padding: "0.32rem 0.6rem",
                              fontSize: "0.8rem",
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              borderColor: "#10b981",
                              color: "#fff"
                            }}
                            onClick={() => setRestoreItem(item)}
                            title="Restore transaction"
                          >
                            ♻️ Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <PaginationBar
          page={pagination.page || page}
          pageSize={pagination.limit || limit}
          total={pagination.total || 0}
          totalPages={pagination.totalPages || 1}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setLimit(s);
            setPage(1);
          }}
        />
      </SectionCard>

      {/* INSPECT TRANSACTION MODAL */}
      {inspectItem && (
        <div className="modal-backdrop" onClick={() => setInspectItem(null)}>
          <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "95vw" }}>
            <div className="modal-header">
              <div>
                <h3>
                  {inspectItem.transactionType === "sale" ? "Sale Invoice" : inspectItem.transactionType === "purchase" ? "Purchase Bill" : "Expense Details"} #{inspectItem.invoice_number || inspectItem.title || inspectItem.id}
                </h3>
                <span className="badge badge-danger">DELETED / VOIDED</span>
              </div>
              <button type="button" className="close-btn" onClick={() => setInspectItem(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: "68vh", overflowY: "auto" }}>
              {/* Audit Warning Box */}
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "10px",
                  padding: "1rem",
                  marginBottom: "1.25rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <strong style={{ color: "#ef4444" }}>🗑️ Deletion Audit Record</strong>
                  <span className="muted small">{formatDate(inspectItem.deleted_at)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", fontSize: "0.9rem" }}>
                  <div>
                    <span className="muted small">Deleted By:</span>{" "}
                    <strong>{inspectItem.deleted_by_name || "Unknown Staff"}</strong> ({inspectItem.deleted_by_role || "User"})
                    <div className="muted small">{inspectItem.deleted_by_email || ""}</div>
                  </div>
                  <div>
                    <span className="muted small">Reason Provided:</span>
                    <div style={{ marginTop: "0.2rem", fontWeight: "600", color: "#f87171" }}>
                      "{inspectItem.deletion_reason || "No reason specified"}"
                    </div>
                  </div>
                </div>
              </div>

              {/* Company & Order Info */}
              <div className="detail-meta-grid" style={{ marginBottom: "1.25rem" }}>
                <div className="meta-card">
                  <span className="muted small">Company</span>
                  <strong>{inspectItem.business_name}</strong>
                  <span className="muted small">Code: {inspectItem.business_code}</span>
                </div>
                <div className="meta-card">
                  <span className="muted small">Store Branch</span>
                  <strong>{inspectItem.branch_name}</strong>
                  <span className="muted small">Code: {inspectItem.branch_code}</span>
                </div>
                <div className="meta-card">
                  <span className="muted small">Party / Contact</span>
                  <strong>{inspectItem.customer_name || inspectItem.vendor_name || inspectItem.category || "N/A"}</strong>
                  <span className="muted small">{inspectItem.customer_phone || inspectItem.vendor_phone || ""}</span>
                </div>
                <div className="meta-card">
                  <span className="muted small">Total Volume</span>
                  <strong style={{ color: "var(--primary)" }}>{formatPKR(inspectItem.total_amount || inspectItem.amount)}</strong>
                  <span className="muted small">{inspectItem.payment_method || "Cash"}</span>
                </div>
              </div>

              {/* Items Table if Sale or Purchase */}
              {Array.isArray(inspectItem.items) && inspectItem.items.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ marginBottom: "0.5rem" }}>Transaction Line Items & Inventory</h4>
                  <div className="table-wrap" style={{ overflowX: "auto", width: "100%" }}>
                    <table style={{ minWidth: "680px", width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "45px", minWidth: "45px", textAlign: "center", whiteSpace: "nowrap" }}>#</th>
                          <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>Product / Model</th>
                          <th style={{ minWidth: "130px", whiteSpace: "nowrap" }}>Variant / Storage</th>
                          <th style={{ minWidth: "140px", whiteSpace: "nowrap" }}>IMEI / Serial</th>
                          <th style={{ minWidth: "65px", textAlign: "center", whiteSpace: "nowrap" }}>Qty</th>
                          <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Unit Price</th>
                          <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectItem.items.map((it, idx) => (
                          <tr key={it.id || idx}>
                            <td>{idx + 1}</td>
                            <td>
                              <strong>{it.company ? `${it.company} ${it.model_name}` : (it.product_name || "Accessory")}</strong>
                              {it.product_sku && <div className="muted small">SKU: {it.product_sku}</div>}
                            </td>
                            <td>
                              {it.variant || it.color || it.storage ? (
                                <span>{[it.variant, it.color, it.storage].filter(Boolean).join(" • ")}</span>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                            <td>
                              {it.imei ? (
                                <span className="badge" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem" }}>
                                  {it.imei}
                                </span>
                              ) : (
                                <span className="muted">N/A</span>
                              )}
                            </td>
                            <td>{it.quantity || 1}</td>
                            <td>{formatPKR(it.unit_price || it.unit_cost)}</td>
                            <td><strong>{formatPKR((Number(it.quantity || 1) * Number(it.unit_price || it.unit_cost || 0)))}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setInspectItem(null)}>
                Close
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  borderColor: "#10b981"
                }}
                onClick={() => {
                  setRestoreItem(inspectItem);
                  setInspectItem(null);
                }}
              >
                ♻️ Restore This Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreItem && (
        <div className="modal-backdrop" onClick={() => !isRestoring && setRestoreItem(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Transaction Restoration</h3>
              <button
                type="button"
                className="close-btn"
                disabled={isRestoring}
                onClick={() => setRestoreItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "10px",
                  padding: "1rem",
                  marginBottom: "1rem"
                }}
              >
                <h4 style={{ color: "#10b981", margin: "0 0 0.5rem 0" }}>♻️ Restoring to Active Status</h4>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  You are about to restore transaction <strong>#{restoreItem.reference_no || restoreItem.id}</strong> belonging to <strong>{restoreItem.business_name}</strong>.
                </p>
              </div>

              <div style={{ fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div>
                  <span className="muted">Transaction Type:</span>{" "}
                  <strong>{restoreItem.transaction_type?.toUpperCase()}</strong>
                </div>
                <div>
                  <span className="muted">Amount:</span>{" "}
                  <strong>{formatPKR(restoreItem.amount || restoreItem.total_amount)}</strong>
                </div>
                <div>
                  <span className="muted">Originally Deleted By:</span>{" "}
                  <strong>{restoreItem.deleted_by_name || "Unknown Staff"}</strong>
                </div>
                <div>
                  <span className="muted">Original Deletion Reason:</span>{" "}
                  <em>"{restoreItem.deletion_reason || "None"}"</em>
                </div>

                <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: "var(--surface-strong)", borderRadius: "8px" }}>
                  <strong>What will happen upon restoration:</strong>
                  <ul style={{ margin: "0.35rem 0 0 1.25rem", padding: 0, fontSize: "0.85rem" }}>
                    <li>The transaction will be set back to active (`is_deleted = 0`).</li>
                    <li>Associated stock/inventory and mobile IMEI unit statuses will be restored.</li>
                    <li>The action will be recorded in the system audit trail with your admin credentials.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                disabled={isRestoring}
                onClick={() => setRestoreItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={isRestoring}
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  borderColor: "#10b981"
                }}
                onClick={handleConfirmRestore}
              >
                {isRestoring ? "Restoring..." : "Yes, Restore Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
