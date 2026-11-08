import { useEffect, useState } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";

export function TopDashboard({ context, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Quick Action Modal states
  const [activePaymentModal, setActivePaymentModal] = useState(null); // { payment, mode: 'approve' | 'reject' }
  const [rejectionReason, setRejectionReason] = useState("");
  const [extendingBranch, setExtendingBranch] = useState(null); // { branchId, branchName, date }
  const [extensionDate, setExtensionDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError("");
    try {
      const data = await api.topDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovePayment(paymentId) {
    setIsSubmitting(true);
    setError("");
    setActionMessage("");
    try {
      const res = await api.topApprovePayment(paymentId);
      setActionMessage(res.message || "Payment verified and subscription extended successfully");
      setActivePaymentModal(null);
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRejectPayment(e) {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setActionMessage("");
    try {
      const res = await api.topRejectPayment(activePaymentModal.payment.id, rejectionReason.trim());
      setActionMessage(res.message || "Payment has been rejected");
      setActivePaymentModal(null);
      setRejectionReason("");
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExtendBranchSubscription(e) {
    e.preventDefault();
    if (!extensionDate) {
      setError("Please select an extension date");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setActionMessage("");
    try {
      await api.extendBranchSubscription(extendingBranch.branch_id, extensionDate);
      setActionMessage(`Subscription for ${extendingBranch.branch_name} extended to ${extensionDate}`);
      setExtendingBranch(null);
      setExtensionDate("");
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading && !stats) {
    return (
      <div className="page-grid">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading SaaS Platform Overview...</p>
        </div>
      </div>
    );
  }

  const biz = stats?.businesses || { total: 0, active: 0, inactive: 0 };
  const branches = stats?.branches || { total: 0, active: 0, inactive: 0 };
  const admins = stats?.companyAdmins || { total: 0, active: 0, inactive: 0 };
  const pkgs = stats?.packages || { total: 0, active: 0 };
  const subs = stats?.subscriptions || {
    total: 0,
    active: 0,
    trialing: 0,
    grace: 0,
    suspended: 0,
    expired: 0,
    expiringSoon: 0,
    overdue: 0
  };
  const payments = stats?.payments || {
    pendingCount: 0,
    pendingAmount: 0,
    verifiedCount: 0,
    verifiedRevenue: 0,
    rejectedCount: 0
  };

  return (
    <div className="topadmin-dashboard">
      {/* Header Banner */}
      <div className="dashboard-hero">
        <div className="hero-text">
          <h1>SaaS Platform Control Center</h1>
          <p className="muted">
            Global real-time overview of MobilePOS client businesses, branch subscriptions, revenue, and pending verifications.
          </p>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={loadDashboardData}
            title="Refresh dashboard numbers"
          >
            🔄 Refresh Stats
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => onNavigate && onNavigate("top_businesses")}
          >
            🏢 Manage Businesses
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {actionMessage && <div className="alert success">{actionMessage}</div>}

      {/* Primary KPI Metrics Grid */}
      <div className="metrics-grid">
        {/* Total Businesses */}
        <div
          className="metric-card interactive"
          onClick={() => onNavigate && onNavigate("top_businesses")}
          role="button"
          tabIndex={0}
        >
          <div className="metric-header">
            <span className="metric-icon">🏢</span>
            <span className="metric-badge positive">{biz.active} Active</span>
          </div>
          <div className="metric-value">{biz.total}</div>
          <div className="metric-label">Registered Companies</div>
          <div className="metric-footer">
            <span>{biz.inactive} Inactive / Disabled</span>
            <span className="arrow-link">View »</span>
          </div>
        </div>

        {/* Total Branches */}
        <div
          className="metric-card interactive"
          onClick={() => onNavigate && onNavigate("top_businesses", { view: "branches" })}
          role="button"
          tabIndex={0}
        >
          <div className="metric-header">
            <span className="metric-icon">🏬</span>
            <span className="metric-badge positive">{branches.active} Active</span>
          </div>
          <div className="metric-value">{branches.total}</div>
          <div className="metric-label">Store Branches</div>
          <div className="metric-footer">
            <span>{branches.inactive} Inactive locations</span>
            <span className="arrow-link">View »</span>
          </div>
        </div>

        {/* Total Company Admins */}
        <div
          className="metric-card interactive"
          onClick={() => onNavigate && onNavigate("top_admins")}
          role="button"
          tabIndex={0}
        >
          <div className="metric-header">
            <span className="metric-icon">👥</span>
            <span className="metric-badge positive">{admins.active} Active</span>
          </div>
          <div className="metric-value">{admins.total}</div>
          <div className="metric-label">Company Administrators</div>
          <div className="metric-footer">
            <span>{admins.inactive} Inactive accounts</span>
            <span className="arrow-link">View »</span>
          </div>
        </div>

        {/* Subscription Packages */}
        <div
          className="metric-card interactive"
          onClick={() => onNavigate && onNavigate("top_packages")}
          role="button"
          tabIndex={0}
        >
          <div className="metric-header">
            <span className="metric-icon">📦</span>
            <span className="metric-badge accent">{pkgs.active} Enabled</span>
          </div>
          <div className="metric-value">{pkgs.total}</div>
          <div className="metric-label">Subscription Packages</div>
          <div className="metric-footer">
            <span>Configurable plans</span>
            <span className="arrow-link">Manage »</span>
          </div>
        </div>

        {/* Pending Payments - Highlighted */}
        <div
          className={`metric-card interactive ${payments.pendingCount > 0 ? "highlight-warning" : ""}`}
          onClick={() => onNavigate && onNavigate("top_payments", { status: "submitted" })}
          role="button"
          tabIndex={0}
        >
          <div className="metric-header">
            <span className="metric-icon">⏳</span>
            {payments.pendingCount > 0 && (
              <span className="metric-badge warning pulse">{payments.pendingCount} Needs Review</span>
            )}
          </div>
          <div className="metric-value">PKR {Number(payments.pendingAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <div className="metric-label">Pending Verification ({payments.pendingCount} payments)</div>
          <div className="metric-footer">
            <span>Awaiting approval</span>
            <span className="arrow-link">Verify Now »</span>
          </div>
        </div>

        {/* Total Verified Revenue */}
        <div
          className="metric-card interactive"
          onClick={() => onNavigate && onNavigate("top_payments", { status: "verified" })}
          role="button"
          tabIndex={0}
        >
          <div className="metric-header">
            <span className="metric-icon">💰</span>
            <span className="metric-badge positive">{payments.verifiedCount} Verified</span>
          </div>
          <div className="metric-value">PKR {Number(payments.verifiedRevenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <div className="metric-label">Total Verified Revenue</div>
          <div className="metric-footer">
            <span>{payments.rejectedCount} Rejected payments</span>
            <span className="arrow-link">History »</span>
          </div>
        </div>
      </div>

      {/* Subscription Health Summary Bar */}
      <div className="subscription-health-strip">
        <div className="strip-title">
          <span>📡 Subscription Health</span>
          <span className="muted">{subs.total} Total Branch Subscriptions</span>
        </div>
        <div className="strip-pills">
          <div
            className="health-pill active-pill interactive"
            onClick={() => onNavigate && onNavigate("top_businesses", { view: "branches", status: "active" })}
            title="Active paid subscriptions"
          >
            <span className="dot" />
            <span className="label">Active:</span>
            <strong>{subs.active}</strong>
          </div>
          <div
            className="health-pill trialing-pill interactive"
            onClick={() => onNavigate && onNavigate("top_businesses", { view: "branches", status: "trialing" })}
            title="Free trial subscriptions"
          >
            <span className="dot" />
            <span className="label">Trialing:</span>
            <strong>{subs.trialing}</strong>
          </div>
          <div
            className="health-pill expiring-pill interactive"
            onClick={() => onNavigate && onNavigate("top_businesses", { view: "branches" })}
            title="Expiring within 14 days"
          >
            <span className="dot" />
            <span className="label">Expiring Soon:</span>
            <strong>{subs.expiringSoon}</strong>
          </div>
          <div
            className="health-pill overdue-pill interactive"
            onClick={() => onNavigate && onNavigate("top_businesses", { view: "branches", status: "overdue" })}
            title="Overdue or in grace period"
          >
            <span className="dot" />
            <span className="label">Overdue / Grace:</span>
            <strong>{subs.overdue}</strong>
          </div>
          <div
            className="health-pill suspended-pill interactive"
            onClick={() => onNavigate && onNavigate("top_businesses", { view: "branches", status: "inactive" })}
            title="Suspended subscriptions"
          >
            <span className="dot" />
            <span className="label">Suspended:</span>
            <strong>{subs.suspended}</strong>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Actionable Sections */}
      <div className="dashboard-grid-two">
        {/* Left Column: Pending Payments Awaiting Verification */}
        <SectionCard
          title="Pending Payments Awaiting Verification"
          subtitle="Review submitted payment receipts and verify or reject them."
          action={
            <button
              type="button"
              className="ghost-btn"
              onClick={() => onNavigate && onNavigate("top_payments", { status: "submitted" })}
            >
              All Payments ({payments.pendingCount}) »
            </button>
          }
        >
          {stats?.recentPendingPayments && stats.recentPendingPayments.length > 0 ? (
            <div className="table-wrapper">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Business / Branch</th>
                    <th>Package</th>
                    <th>Amount</th>
                    <th>Method & Ref</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPendingPayments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.business_name}</strong>
                        <p className="muted small">{p.branch_name}</p>
                      </td>
                      <td>
                        <span className="badge muted-badge">{p.plan_name}</span>
                      </td>
                      <td>
                        <strong className="text-positive">PKR {Number(p.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                      </td>
                      <td>
                        <span>{p.payment_method || "Transfer"}</span>
                        {p.evidence_reference && (
                          <p className="muted small font-mono">{p.evidence_reference}</p>
                        )}
                      </td>
                      <td className="small muted">
                        {p.payment_date || (p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : "N/A")}
                      </td>
                      <td>
                        <div className="action-button-group">
                          <button
                            type="button"
                            className="btn-sm btn-approve"
                            onClick={() => setActivePaymentModal({ payment: p, mode: "approve" })}
                            title="Verify and extend branch subscription"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn-sm btn-reject"
                            onClick={() => {
                              setRejectionReason("");
                              setActivePaymentModal({ payment: p, mode: "reject" });
                            }}
                            title="Reject payment with recorded reason"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-card">
              <span className="empty-icon">🎉</span>
              <p>No pending payments awaiting verification right now.</p>
              <button
                type="button"
                className="secondary-btn btn-sm"
                onClick={() => onNavigate && onNavigate("top_payments")}
              >
                View Payment Records
              </button>
            </div>
          )}
        </SectionCard>

        {/* Right Column: Upcoming Renewals & Overdue Branches */}
        <SectionCard
          title="Upcoming Renewals & Overdue Branches"
          subtitle="Branches with subscriptions expiring soon or overdue."
          action={
            <button
              type="button"
              className="ghost-btn"
              onClick={() => onNavigate && onNavigate("top_businesses", { view: "branches", status: "overdue" })}
            >
              All Overdue »
            </button>
          }
        >
          {stats?.upcomingRenewals && stats.upcomingRenewals.length > 0 ? (
            <div className="table-wrapper">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Branch / Business</th>
                    <th>Package</th>
                    <th>Status</th>
                    <th>Valid Through</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.upcomingRenewals.map((r) => {
                    const expiryDate = r.current_period_ends_on || r.trial_ends_on;
                    const isOverdue = r.is_overdue === 1 || (r.days_left !== null && r.days_left < 0);
                    return (
                      <tr key={r.branch_id} className={isOverdue ? "row-highlight-danger" : ""}>
                        <td>
                          <strong>{r.branch_name}</strong>
                          <p className="muted small">{r.business_name}</p>
                        </td>
                        <td>
                          <span className="badge muted-badge">{r.plan_name}</span>
                        </td>
                        <td>
                          {isOverdue ? (
                            <span className="status-pill status-danger">Overdue</span>
                          ) : r.days_left !== null && r.days_left <= 7 ? (
                            <span className="status-pill status-warning">In {r.days_left}d</span>
                          ) : (
                            <span className="status-pill status-info">{r.subscription_status}</span>
                          )}
                        </td>
                        <td className="small">
                          {expiryDate ? new Date(expiryDate).toLocaleDateString() : "Expired"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-sm secondary-btn"
                            onClick={() => {
                              setExtendingBranch(r);
                              const futureDate = new Date();
                              futureDate.setMonth(futureDate.getMonth() + 1);
                              setExtensionDate(futureDate.toISOString().slice(0, 10));
                            }}
                          >
                            Extend
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-card">
              <span className="empty-icon">✅</span>
              <p>All active branch subscriptions are in good standing.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Verified Subscription Revenue Streams */}
      <SectionCard
        title="Verified Subscription Revenue Streams"
        subtitle="Monthly breakdown of subscription payments received across platform businesses."
        action={
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onNavigate && onNavigate("top_payments", { status: "verified" })}
          >
            Payment History »
          </button>
        }
      >
        {stats?.revenueByMonth && stats.revenueByMonth.length > 0 ? (
          <div className="revenue-history-grid">
            {stats.revenueByMonth.map((m) => (
              <div key={m.month} className="revenue-month-card">
                <span className="month-name">{m.month}</span>
                <strong className="month-amount">PKR {Number(m.total_revenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                <span className="month-count muted small">{m.payments_count} payments</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <p className="muted">No verified payments in recent months.</p>
          </div>
        )}
      </SectionCard>

      {/* MODAL: Approve Payment */}
      {activePaymentModal?.mode === "approve" && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setActivePaymentModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Verify & Approve Subscription Payment</h3>
              <button
                type="button"
                className="close-btn"
                disabled={isSubmitting}
                onClick={() => setActivePaymentModal(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="info-callout">
                <p>
                  Approving this payment will automatically verify receipt of{" "}
                  <strong>PKR {Number(activePaymentModal.payment.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> and extend the
                  subscription for <strong>{activePaymentModal.payment.branch_name}</strong> (
                  {activePaymentModal.payment.business_name}).
                </p>
              </div>

              <div className="detail-list">
                <div className="detail-item">
                  <span className="muted">Package:</span>
                  <strong>{activePaymentModal.payment.plan_name}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Payment Method:</span>
                  <strong>{activePaymentModal.payment.payment_method || "N/A"}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Reference / Proof:</span>
                  <span className="font-mono">{activePaymentModal.payment.evidence_reference || "None provided"}</span>
                </div>
                <div className="detail-item">
                  <span className="muted">Current Period Ends On:</span>
                  <span>{activePaymentModal.payment.current_period_ends_on || "Expired"}</span>
                </div>
              </div>

              <p className="small muted notice-text">
                * Note: Remaining paid subscription period will be safely preserved. If the branch is currently active, the extension begins from the existing expiry date.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                disabled={isSubmitting}
                onClick={() => setActivePaymentModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={isSubmitting}
                onClick={() => handleApprovePayment(activePaymentModal.payment.id)}
              >
                {isSubmitting ? "Verifying..." : "Confirm & Extend Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject Payment */}
      {activePaymentModal?.mode === "reject" && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setActivePaymentModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleRejectPayment}>
              <div className="modal-header">
                <h3>Reject Subscription Payment</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setActivePaymentModal(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Record a rejection for this payment of{" "}
                  <strong>PKR {Number(activePaymentModal.payment.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> for{" "}
                  <strong>{activePaymentModal.payment.branch_name}</strong>.
                </p>

                <label className="form-group">
                  <span>Reason for Rejection *</span>
                  <textarea
                    rows={3}
                    placeholder="e.g. Invalid transaction ID, receipt illegible, incorrect amount..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setActivePaymentModal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="danger-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Extend Branch Subscription */}
      {extendingBranch && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setExtendingBranch(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleExtendBranchSubscription}>
              <div className="modal-header">
                <h3>Extend Branch Subscription</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setExtendingBranch(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Extend subscription for <strong>{extendingBranch.branch_name}</strong> (
                  {extendingBranch.business_name}).
                </p>

                <label className="form-group">
                  <span>New Subscription End Date *</span>
                  <input
                    type="date"
                    value={extensionDate}
                    onChange={(e) => setExtensionDate(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setExtendingBranch(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Extending..." : "Save Extension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
