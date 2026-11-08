import { useEffect, useState } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { SearchableSelect } from "../components/SearchableSelect.jsx";
import {
  TableActionHeader,
  TableActionCell,
  TableActionButton
} from "../components/TableActionColumn.jsx";

export function TopPaymentsPage({ initialStatus = "all" }) {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialStatus || "all");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Dropdown lists
  const [companiesList, setCompaniesList] = useState([]);
  const [plansList, setPlansList] = useState([]);
  const [branchesForCompany, setBranchesForCompany] = useState([]);

  // Modals
  const [activeApproveModal, setActiveApproveModal] = useState(null); // payment object
  const [activeRejectModal, setActiveRejectModal] = useState(null); // payment object
  const [rejectionReason, setRejectionReason] = useState("");

  // Edit & Delete Payment Modals
  const [editingPayment, setEditingPayment] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    paymentMethod: "Bank Transfer",
    evidenceReference: "",
    paymentDate: "",
    durationValue: 1,
    durationUnit: "month",
    notes: ""
  });
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Log Payment Modal
  const [showLogPaymentModal, setShowLogPaymentModal] = useState(false);
  const [logForm, setLogForm] = useState({
    businessId: "",
    branchId: "",
    planId: "",
    amount: "",
    paymentMethod: "Bank Transfer",
    evidenceReference: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    durationValue: 1,
    durationUnit: "month",
    notes: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.businesses().then(setCompaniesList).catch(() => {});
    api.subscriptionPlans().then(setPlansList).catch(() => {});
  }, []);

  useEffect(() => {
    loadPayments();
  }, [pagination.page, pagination.pageSize, statusFilter, companyFilter, planFilter, fromDate, toDate]);

  async function loadPayments() {
    setLoading(true);
    setError("");
    try {
      let q = `?page=${pagination.page}&pageSize=${pagination.pageSize}&status=${statusFilter}&search=${encodeURIComponent(search)}`;
      if (companyFilter) q += `&businessId=${companyFilter}`;
      if (planFilter) q += `&planId=${planFilter}`;
      if (fromDate) q += `&fromDate=${fromDate}`;
      if (toDate) q += `&toDate=${toDate}`;

      const res = await api.topPayments(q);
      if (res.data && res.pagination) {
        setPayments(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompanySelectForLog(businessId) {
    setLogForm((f) => ({ ...f, businessId, branchId: "" }));
    if (!businessId) {
      setBranchesForCompany([]);
      return;
    }
    try {
      const branches = await api.topBusinessBranches(businessId);
      setBranchesForCompany(branches);
      if (branches.length > 0) {
        const firstBranch = branches[0];
        const assignedPlan = plansList.find((p) => Number(p.id) === Number(firstBranch.plan_id)) || plansList[0];
        setLogForm((f) => ({
          ...f,
          businessId,
          branchId: firstBranch.id,
          planId: assignedPlan?.id || 1,
          amount: assignedPlan ? assignedPlan.price : f.amount,
          durationValue: assignedPlan?.duration_value || 1,
          durationUnit: assignedPlan?.duration_unit || "month"
        }));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogPayment(e) {
    e.preventDefault();
    if (!logForm.businessId || !logForm.branchId) {
      setError("Please select both company and branch");
      return;
    }
    const selectedBranch = branchesForCompany.find((b) => Number(b.id) === Number(logForm.branchId));
    const assignedPlan = plansList.find((p) => Number(p.id) === Number(selectedBranch?.plan_id)) || plansList[0];
    const fixedAmount = assignedPlan ? Number(assignedPlan.price) : Number(logForm.amount);
    const fixedPlanId = assignedPlan ? Number(assignedPlan.id) : undefined;
    const fixedDurationVal = assignedPlan ? Number(assignedPlan.duration_value || 1) : 1;
    const fixedDurationUnit = assignedPlan ? (assignedPlan.duration_unit || "month") : "month";

    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const created = await api.topSubmitPayment({
        ...logForm,
        businessId: Number(logForm.businessId),
        branchId: Number(logForm.branchId),
        planId: fixedPlanId,
        amount: fixedAmount,
        durationValue: fixedDurationVal,
        durationUnit: fixedDurationUnit
      });
      setMessage(`Payment of PKR ${Number(created.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} logged for '${created.branch_name}'. Status is awaiting verification.`);
      setShowLogPaymentModal(false);
      setLogForm({
        businessId: "",
        branchId: "",
        planId: "",
        amount: "",
        paymentMethod: "Bank Transfer",
        evidenceReference: "",
        paymentDate: new Date().toISOString().slice(0, 10),
        durationValue: 1,
        durationUnit: "month",
        notes: ""
      });
      loadPayments();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(paymentId) {
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await api.topApprovePayment(paymentId);
      setMessage(res.message || "Payment verified and subscription extended successfully");
      setActiveApproveModal(null);
      loadPayments();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError("Please enter a reason for payment rejection");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await api.topRejectPayment(activeRejectModal.id, rejectionReason.trim());
      setMessage(res.message || "Payment marked as rejected");
      setActiveRejectModal(null);
      setRejectionReason("");
      loadPayments();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditModal(payment) {
    setEditingPayment(payment);
    setEditForm({
      amount: payment.amount || "",
      paymentMethod: payment.payment_method || "Bank Transfer",
      evidenceReference: payment.evidence_reference || "",
      paymentDate: payment.payment_date || (payment.submitted_at ? new Date(payment.submitted_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
      durationValue: payment.duration_value || 1,
      durationUnit: payment.duration_unit || "month",
      notes: payment.notes || ""
    });
  }

  async function handleUpdatePayment(e) {
    e.preventDefault();
    if (!editingPayment) return;
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await api.topUpdatePayment(editingPayment.id, {
        amount: Number(editForm.amount),
        paymentMethod: editForm.paymentMethod,
        evidenceReference: editForm.evidenceReference,
        paymentDate: editForm.paymentDate,
        durationValue: Number(editForm.durationValue),
        durationUnit: editForm.durationUnit,
        notes: editForm.notes
      });
      setMessage(res.message || "Payment record updated successfully");
      setEditingPayment(null);
      loadPayments();
    } catch (err) {
      setError(err.message || "Failed to update payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePayment(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!paymentToDelete) return;
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await api.topDeletePayment(paymentToDelete.id);
      setMessage(res.message || "Payment record deleted successfully");
      setPaymentToDelete(null);
      loadPayments();
    } catch (err) {
      setError(err.message || "Failed to delete payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="topadmin-management-page">
      <div className="management-header">
        <div>
          <h1>Subscription Payments & Verification</h1>
          <p className="muted">
            Inspect customer payment submissions, verify attached evidence, calculate safe subscription extensions, and audit payment records.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            if (companiesList.length > 0 && !logForm.businessId) {
              handleCompanySelectForLog(companiesList[0].id);
            }
            setShowLogPaymentModal(true);
          }}
        >
          ➕ Record / Submit Payment
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {/* Status Filter Tabs */}
      <div className="payment-status-tabs">
        <button
          type="button"
          className={`tab-pill ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("all");
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        >
          All Payments
        </button>
        <button
          type="button"
          className={`tab-pill warning-tab ${statusFilter === "submitted" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("submitted");
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        >
          ⏳ Awaiting Verification
        </button>
        <button
          type="button"
          className={`tab-pill positive-tab ${statusFilter === "verified" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("verified");
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        >
          ✅ Verified Payments
        </button>
        <button
          type="button"
          className={`tab-pill danger-tab ${statusFilter === "rejected" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("rejected");
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        >
          ❌ Rejected Payments
        </button>
        <button
          type="button"
          className={`tab-pill overdue-tab ${statusFilter === "overdue" ? "active" : ""}`}
          onClick={() => {
            setStatusFilter("overdue");
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        >
          ⚠️ Overdue Subscriptions
        </button>
      </div>

      <SectionCard
        title={
          statusFilter === "submitted"
            ? "Payments Awaiting TOP Admin Verification"
            : statusFilter === "verified"
            ? "Verified Subscription Payments"
            : statusFilter === "rejected"
            ? "Rejected Payment Submissions"
            : statusFilter === "overdue"
            ? "Overdue Subscription Payments"
            : "All Subscription Payment Submissions"
        }
        subtitle="Review amounts, payment receipts, deposit evidence, and approve or reject submissions."
      >
        {/* Filtering Toolbar */}
        <div className="table-filter-bar wrap">
          <div className="search-field">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search reference, business, branch, method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadPayments()}
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearch("");
                  setTimeout(loadPayments, 0);
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-group">
            <label>
              <span>Company:</span>
              <SearchableSelect
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="All Companies"
              >
                <option value="">All Companies</option>
                {companiesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SearchableSelect>
            </label>

            <label>
              <span>Package:</span>
              <SearchableSelect
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="All Packages"
              >
                <option value="">All Packages</option>
                {plansList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SearchableSelect>
            </label>

            <label>
              <span>From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <label>
              <span>To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>

            <button
              type="button"
              className="secondary-btn btn-sm"
              onClick={loadPayments}
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Payments Table */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading payments...</p>
          </div>
        ) : payments.length > 0 ? (
          <div className="table-wrapper" style={{ overflowX: "auto", width: "100%" }}>
            <table className="data-table" style={{ minWidth: "980px", width: "100%" }}>
              <thead>
                <tr>
                  <th>Business & Branch</th>
                  <th>Package & Duration</th>
                  <th>Amount</th>
                  <th>Method & Reference</th>
                  <th>Date</th>
                  <th>Branch Validity</th>
                  <th>Status</th>
                  <TableActionHeader />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const durationDisplay = `${p.duration_value || 1} ${p.duration_unit || "month"}${Number(p.duration_value) > 1 ? "s" : ""}`;
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.business_name}</strong>
                        <p className="small muted">{p.branch_name} ({p.branch_code})</p>
                      </td>
                      <td>
                        <span className="badge muted-badge">{p.plan_name}</span>
                        <p className="small muted">{durationDisplay}</p>
                      </td>
                      <td>
                        <strong className="text-positive text-large">
                          PKR {Number(p.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>
                        <span>{p.payment_method || "Bank Wire"}</span>
                        {p.evidence_reference ? (
                          <p className="font-mono small text-muted font-bold" title="Payment reference / slip #">
                            📄 {p.evidence_reference}
                          </p>
                        ) : (
                          <p className="small muted">No reference</p>
                        )}
                        {p.notes && <p className="small muted font-italic">"{p.notes}"</p>}
                      </td>
                      <td className="small">
                        <span>{p.payment_date || (p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : "N/A")}</span>
                        {p.submitted_by_name && <p className="muted small">by {p.submitted_by_name}</p>}
                      </td>
                      <td className="small">
                        {p.period_end_date ? (
                          <div>
                            <span className="text-positive">Extended to:</span>
                            <strong> {new Date(p.period_end_date).toLocaleDateString()}</strong>
                          </div>
                        ) : p.current_period_ends_on ? (
                          <div>
                            <span>Current: {new Date(p.current_period_ends_on).toLocaleDateString()}</span>
                            <span className="small muted block">({p.subscription_status})</span>
                          </div>
                        ) : (
                          <span className="muted">Expired / Trial</span>
                        )}
                      </td>
                      <td>
                        {p.status === "submitted" && (
                          <span className="status-pill status-warning pulse">Awaiting Verification</span>
                        )}
                        {p.status === "verified" && (
                          <div>
                            <span className="status-pill status-success">Verified</span>
                            {p.verified_by_name && (
                              <p className="small muted">by {p.verified_by_name}</p>
                            )}
                          </div>
                        )}
                        {p.status === "rejected" && (
                          <div>
                            <span className="status-pill status-danger">Rejected</span>
                            {p.rejection_reason && (
                              <p className="small text-danger" title={p.rejection_reason}>
                                "{p.rejection_reason}"
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <TableActionCell>
                        {p.status === "submitted" && (
                          <>
                            <TableActionButton
                              variant="extend"
                              icon="✓"
                              label="Approve"
                              onClick={() => setActiveApproveModal(p)}
                              title="Approve payment and extend subscription"
                            />
                            <TableActionButton
                              variant="cancel"
                              icon="✕"
                              label="Reject"
                              onClick={() => {
                                setRejectionReason("");
                                setActiveRejectModal(p);
                              }}
                              title="Reject payment submission"
                            />
                          </>
                        )}
                        {p.status === "rejected" && (
                          <TableActionButton
                            variant="extend"
                            icon="🔄"
                            label="Re-Verify"
                            onClick={() => setActiveApproveModal(p)}
                            title="Re-verify payment and extend subscription"
                          />
                        )}
                        <TableActionButton
                          variant="edit"
                          icon="✏️"
                          label="Edit"
                          onClick={() => openEditModal(p)}
                          title="Edit payment details (amount, reference, notes, dates)"
                        />
                        <TableActionButton
                          variant="delete"
                          icon="🗑️"
                          label="Delete"
                          onClick={() => setPaymentToDelete(p)}
                          title="Delete this payment record"
                        />
                      </TableActionCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <PaginationBar
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => setPagination((p) => ({ ...p, page: newPage }))}
              onPageSizeChange={(newSize) => setPagination((p) => ({ ...p, pageSize: newSize, page: 1 }))}
            />
          </div>
        ) : (
          <div className="empty-state-card">
            <span className="empty-icon">💳</span>
            <p>No subscription payment records match your filters.</p>
          </div>
        )}
      </SectionCard>

      {/* ========================================================
          MODAL: APPROVE PAYMENT & EXTEND SUBSCRIPTION
          ======================================================== */}
      {activeApproveModal && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setActiveApproveModal(null)}>
          <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Verify Payment & Extend Subscription</h3>
                <p className="muted small">Payment #{activeApproveModal.id} - {activeApproveModal.business_name}</p>
              </div>
              <button
                type="button"
                className="close-btn"
                disabled={isSubmitting}
                onClick={() => setActiveApproveModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="info-callout">
                <p>
                  Confirming this verification will record receipt of{" "}
                  <strong className="text-positive">PKR {Number(activeApproveModal.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> via{" "}
                  <strong>{activeApproveModal.payment_method || "Bank Wire"}</strong> and automatically calculate the extension for{" "}
                  <strong>{activeApproveModal.branch_name}</strong>.
                </p>
              </div>

              <div className="detail-list">
                <div className="detail-item">
                  <span className="muted">Branch / Company:</span>
                  <strong>{activeApproveModal.branch_name} ({activeApproveModal.business_name})</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Package:</span>
                  <strong>{activeApproveModal.plan_name} (PKR {Number(activeApproveModal.plan_price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} / {activeApproveModal.billing_period || "month"})</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Extension Period:</span>
                  <strong>{activeApproveModal.duration_value || 1} {activeApproveModal.duration_unit || "month"}{Number(activeApproveModal.duration_value) > 1 ? "s" : ""}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Evidence Reference / Slip:</span>
                  <span className="font-mono text-positive">{activeApproveModal.evidence_reference || "No slip reference"}</span>
                </div>
                <div className="detail-item">
                  <span className="muted">Current Branch Expiry:</span>
                  <span>{activeApproveModal.current_period_ends_on ? new Date(activeApproveModal.current_period_ends_on).toLocaleDateString() : "Expired / Inactive"}</span>
                </div>
                <div className="detail-item">
                  <span className="muted">Submission Date:</span>
                  <span>{activeApproveModal.payment_date || (activeApproveModal.submitted_at ? new Date(activeApproveModal.submitted_at).toLocaleDateString() : "N/A")}</span>
                </div>
              </div>

              <div className="calculation-preview-box">
                <h4>🧮 Extension Calculation Rule:</h4>
                <p className="small">
                  • <strong>Fair Unused Period Preservation:</strong> If the branch subscription is currently active with days remaining, the extension adds {activeApproveModal.duration_value || 1} {activeApproveModal.duration_unit || "month"}(s) directly to the existing expiry date.
                </p>
                <p className="small">
                  • <strong>Expired Subscription Rule:</strong> If the branch subscription has already lapsed or expired, the extension begins from today.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                disabled={isSubmitting}
                onClick={() => setActiveApproveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={isSubmitting}
                onClick={() => handleApprove(activeApproveModal.id)}
              >
                {isSubmitting ? "Verifying..." : "Approve & Extend Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REJECT PAYMENT
          ======================================================== */}
      {activeRejectModal && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setActiveRejectModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleReject}>
              <div className="modal-header">
                <div>
                  <h3>Reject Subscription Payment</h3>
                  <p className="muted small">Payment #{activeRejectModal.id} - PKR {Number(activeRejectModal.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setActiveRejectModal(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <p>
                  Please specify why this payment for{" "}
                  <strong>{activeRejectModal.branch_name}</strong> is being rejected. This reason will be recorded for audit history and displayed on the account.
                </p>

                <label className="form-group">
                  <span>Rejection Reason *</span>
                  <textarea
                    rows={3}
                    placeholder="e.g. Deposit amount does not match package fee, transaction ID could not be found, blurred receipt..."
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
                  onClick={() => setActiveRejectModal(null)}
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

      {/* ========================================================
          MODAL: RECORD / SUBMIT PAYMENT
          ======================================================== */}
      {showLogPaymentModal && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setShowLogPaymentModal(false)}>
          <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleLogPayment}>
              <div className="modal-header">
                <div>
                  <h3>Record Subscription Payment Submission</h3>
                  <p className="muted small">Log a payment receipt on behalf of a subscriber branch.</p>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setShowLogPaymentModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid modal-compact-form">
                <label>
                  <span>Company *</span>
                  <SearchableSelect
                    value={logForm.businessId}
                    onChange={(e) => handleCompanySelectForLog(e.target.value)}
                    placeholder="Search company by name or code..."
                    required
                  >
                    <option value="">Select Company</option>
                    {companiesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </SearchableSelect>
                </label>

                <label>
                  <span>Store Branch *</span>
                  <SearchableSelect
                    value={logForm.branchId}
                    onChange={(e) => {
                      const branchId = e.target.value;
                      const selectedBranch = branchesForCompany.find((b) => Number(b.id) === Number(branchId));
                      const assignedPlan = plansList.find((p) => Number(p.id) === Number(selectedBranch?.plan_id)) || plansList[0];
                      setLogForm({
                        ...logForm,
                        branchId,
                        planId: assignedPlan ? assignedPlan.id : logForm.planId,
                        amount: assignedPlan ? assignedPlan.price : logForm.amount,
                        durationValue: assignedPlan ? (assignedPlan.duration_value || 1) : logForm.durationValue,
                        durationUnit: assignedPlan ? (assignedPlan.duration_unit || "month") : logForm.durationUnit
                      });
                    }}
                    placeholder="Search branch by name or code..."
                    required
                  >
                    <option value="">Select Branch</option>
                    {branchesForCompany.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </SearchableSelect>
                </label>

                {/* Fixed Package & Price Display derived directly from the chosen branch */}
                {(() => {
                  const selectedBranch = branchesForCompany.find((b) => Number(b.id) === Number(logForm.branchId));
                  const assignedPlan = plansList.find((p) => Number(p.id) === Number(selectedBranch?.plan_id)) || plansList[0];

                  return (
                    <>
                      <label>
                        <span>Assigned Package (Fixed for Branch)</span>
                        <div
                          style={{
                            padding: "0.75rem 0.9rem",
                            background: "var(--surface-strong)",
                            border: "1px solid var(--border)",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.5rem"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span>🔒</span>
                            <strong>{assignedPlan ? assignedPlan.name : "Default Package"}</strong>
                          </div>
                          <span className="status-pill status-info" style={{ fontSize: "0.72rem" }}>
                            ⏱️ {assignedPlan?.duration_value || 1} {assignedPlan?.duration_unit || "month"}(s)
                          </span>
                        </div>
                        <span className="small muted" style={{ display: "block", marginTop: "0.25rem" }}>
                          Package is fixed for this branch. Cannot be changed here.
                        </span>
                      </label>

                      <label>
                        <span>Fixed Package Price (PKR) *</span>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            value={assignedPlan ? `PKR ${Number(assignedPlan.price).toLocaleString()}` : "PKR 0"}
                            readOnly
                            disabled
                            style={{
                              background: "var(--surface-strong)",
                              cursor: "not-allowed",
                              fontWeight: 700,
                              color: "var(--text)"
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              right: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "0.75rem",
                              color: "var(--muted)",
                              fontWeight: 600
                            }}
                          >
                            🔒 Fixed Price
                          </span>
                        </div>
                        <span className="small muted" style={{ display: "block", marginTop: "0.25rem" }}>
                          Price is fixed from the active package. Cannot be changed here.
                        </span>
                      </label>
                    </>
                  );
                })()}

                <label>
                  <span>Payment Method *</span>
                  <select
                    value={logForm.paymentMethod}
                    onChange={(e) => setLogForm({ ...logForm, paymentMethod: e.target.value })}
                  >
                    <option value="Bank Transfer">Bank Wire / Transfer</option>
                    <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                    <option value="Cash Deposit">Cash Deposit</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </label>

                <label>
                  <span>Deposit Slip / Reference *</span>
                  <input
                    placeholder="e.g. TXN-10982348"
                    value={logForm.evidenceReference}
                    onChange={(e) => setLogForm({ ...logForm, evidenceReference: e.target.value })}
                    required
                  />
                </label>

                <label>
                  <span>Payment Date</span>
                  <input
                    type="date"
                    value={logForm.paymentDate}
                    onChange={(e) => setLogForm({ ...logForm, paymentDate: e.target.value })}
                  />
                </label>

                {(() => {
                  const selectedBranch = branchesForCompany.find((b) => Number(b.id) === Number(logForm.branchId));
                  const assignedPlan = plansList.find((p) => Number(p.id) === Number(selectedBranch?.plan_id)) || plansList[0];
                  const val = Number(assignedPlan?.duration_value) || 1;
                  const unit = (assignedPlan?.duration_unit || "month").toLowerCase();

                  return (
                    <div>
                      <span className="field-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem" }}>
                        Duration Granted (Fixed)
                      </span>
                      <div
                        style={{
                          padding: "0.75rem 0.9rem",
                          background: "var(--surface-strong)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontWeight: 600,
                          color: "var(--text)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>⏱️</span>
                          <span>{val} {unit}(s)</span>
                        </div>
                        <span className="small muted">🔒 Locked to Package</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Live Calculated Expiry & Due Date Info */}
                {(() => {
                  const selBranch = branchesForCompany.find((b) => Number(b.id) === Number(logForm.branchId));
                  const assignedPlan = plansList.find((p) => Number(p.id) === Number(selBranch?.plan_id)) || plansList[0];
                  const currentExp = selBranch?.current_period_ends_on;
                  const isFutureExp = currentExp && new Date(currentExp) > new Date();
                  const baseDate = isFutureExp ? new Date(currentExp) : (logForm.paymentDate ? new Date(logForm.paymentDate) : new Date());
                  const val = Number(assignedPlan?.duration_value) || 1;
                  const unit = (assignedPlan?.duration_unit || "month").toLowerCase();
                  const nextDue = new Date(baseDate);
                  if (unit === "year") nextDue.setFullYear(nextDue.getFullYear() + val);
                  else if (unit === "day") nextDue.setDate(nextDue.getDate() + val);
                  else nextDue.setMonth(nextDue.getMonth() + val);
                  const nextDueStr = !isNaN(nextDue.getTime()) ? nextDue.toISOString().slice(0, 10) : "";

                  return (
                    <div className="full-span" style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.25)", borderRadius: "8px", padding: "0.75rem", fontSize: "0.85rem" }}>
                      <div>
                        📅 <strong>Calculated Expiry & Next Due Date:</strong> <span style={{ color: "var(--primary)", fontWeight: 700 }}>{nextDueStr || "N/A"}</span>
                      </div>
                      <div className="muted small" style={{ marginTop: "0.25rem" }}>
                        Payment covers <strong>{val} {unit}(s)</strong> of access
                        {isFutureExp ? ` (added directly to current active expiry: ${currentExp.slice(0, 10)})` : " (effective from payment date)"}.
                      </div>
                    </div>
                  );
                })()}

                <label className="full-span">
                  <span>Additional Notes</span>
                  <input
                    placeholder="Optional notes or teller reference..."
                    value={logForm.notes}
                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setShowLogPaymentModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Payment for Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT PAYMENT
          ======================================================== */}
      {editingPayment && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setEditingPayment(null)}>
          <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleUpdatePayment}>
              <div className="modal-header">
                <div>
                  <h3>Edit Subscription Payment</h3>
                  <p className="muted small">
                    Payment #{editingPayment.id} — {editingPayment.branch_name} ({editingPayment.business_name})
                  </p>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setEditingPayment(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid modal-compact-form">
                <label>
                  <span>Amount (PKR) *</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    required
                  />
                </label>

                <label>
                  <span>Payment Method *</span>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                  >
                    <option value="Bank Transfer">Bank Wire / Transfer</option>
                    <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                    <option value="Cash Deposit">Cash Deposit</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Wire Transfer">Wire Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  <span>Deposit Slip / Reference</span>
                  <input
                    placeholder="e.g. TXN-10982348"
                    value={editForm.evidenceReference}
                    onChange={(e) => setEditForm({ ...editForm, evidenceReference: e.target.value })}
                  />
                </label>

                <label>
                  <span>Payment Date</span>
                  <input
                    type="date"
                    value={editForm.paymentDate}
                    onChange={(e) => setEditForm({ ...editForm, paymentDate: e.target.value })}
                  />
                </label>

                <label>
                  <span>Duration Value</span>
                  <input
                    type="number"
                    min="1"
                    value={editForm.durationValue}
                    onChange={(e) => setEditForm({ ...editForm, durationValue: e.target.value })}
                  />
                </label>

                <label>
                  <span>Duration Unit</span>
                  <select
                    value={editForm.durationUnit}
                    onChange={(e) => setEditForm({ ...editForm, durationUnit: e.target.value })}
                  >
                    <option value="day">Day(s)</option>
                    <option value="month">Month(s)</option>
                    <option value="year">Year(s)</option>
                  </select>
                </label>

                <label className="full-span">
                  <span>Additional Notes</span>
                  <input
                    placeholder="Optional notes or teller reference..."
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setEditingPayment(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DELETE PAYMENT CONFIRMATION
          ======================================================== */}
      {paymentToDelete && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setPaymentToDelete(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Delete Payment Record</h3>
                <p className="muted small">Payment #{paymentToDelete.id}</p>
              </div>
              <button
                type="button"
                className="close-btn"
                disabled={isSubmitting}
                onClick={() => setPaymentToDelete(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to delete the payment record of{" "}
                <strong className="text-positive">
                  PKR {Number(paymentToDelete.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </strong>{" "}
                for <strong>{paymentToDelete.branch_name}</strong> ({paymentToDelete.business_name})?
              </p>

              {paymentToDelete.status === "verified" && (
                <div className="alert error" style={{ marginTop: "1rem" }}>
                  ⚠️ <strong>Warning:</strong> This payment was already verified. Deleting it will recalculate and revert the branch subscription validity accordingly.
                </div>
              )}

              <div className="detail-list" style={{ marginTop: "1rem" }}>
                <div className="detail-item">
                  <span className="muted">Status:</span>
                  <span className="status-pill status-info">{paymentToDelete.status}</span>
                </div>
                <div className="detail-item">
                  <span className="muted">Reference:</span>
                  <span>{paymentToDelete.evidence_reference || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="muted">Method:</span>
                  <span>{paymentToDelete.payment_method || "N/A"}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                disabled={isSubmitting}
                onClick={() => setPaymentToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                disabled={isSubmitting}
                onClick={handleDeletePayment}
              >
                {isSubmitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
