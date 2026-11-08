import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { ToggleSwitch } from "../components/ToggleSwitch.jsx";
import { SearchableSelect } from "../components/SearchableSelect.jsx";

export function TopAdminsPage({ initialBusinessId = "", onOpenMfaSetup, context, canActivate, initialAdmins = null }) {
  const [admins, setAdmins] = useState(initialAdmins || []);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: initialAdmins ? initialAdmins.length : 0, totalPages: 1 });
  const [loading, setLoading] = useState(initialAdmins === null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loggedInUser = context?.user || context?.session;
  const userRole =
    loggedInUser?.role_name ||
    loggedInUser?.role ||
    (typeof loggedInUser?.role === "object" ? loggedInUser?.role?.name : "");

  const hasPermission = useMemo(() => {
    if (canActivate !== undefined) return Boolean(canActivate);
    if (context?.canActivate !== undefined) return Boolean(context.canActivate);
    if (context?.canActivateProfiles !== undefined) return Boolean(context.canActivateProfiles);
    if (loggedInUser?.can_activate_profiles !== undefined) return Boolean(loggedInUser.can_activate_profiles);
    if (loggedInUser?.canActivateProfiles !== undefined) return Boolean(loggedInUser.canActivateProfiles);
    if (context?.can) {
      const allowed = context.can("top_admins", "activate") ?? context.can("company_admins", "activate");
      if (allowed !== undefined && allowed !== null) return Boolean(allowed);
    }
    // Default: SaaS Top Admin has permission
    return userRole === "top_admin" || Boolean(loggedInUser?.is_top_admin) || Boolean(loggedInUser?.isTopAdmin);
  }, [canActivate, context, loggedInUser, userRole]);

  const currentUserId = context?.user?.id || context?.session?.id;

  // Filters
  const [search, setSearch] = useState("");
  const [businessFilter, setBusinessFilter] = useState(initialBusinessId || "");
  const [statusFilter, setStatusFilter] = useState("all");

  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    businessId: initialBusinessId || "",
    fullName: "",
    email: "",
    password: "",
    branchId: "",
    forceReplace: false
  });
  const [createWarning, setCreateWarning] = useState("");

  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    password: "",
    isActive: 1,
    branchId: ""
  });

  // Delete / Deactivate dialog state
  const [deletingAdmin, setDeletingAdmin] = useState(null); // admin object
  const [deleteConflict, setDeleteConflict] = useState(null); // error object from backend with relatedCount
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.businesses().then(setCompaniesList).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialAdmins === null) {
      loadAdmins();
    }
  }, [pagination.page, pagination.pageSize, businessFilter, statusFilter]);

  async function loadAdmins() {
    setLoading(true);
    setError("");
    try {
      let q = `?page=${pagination.page}&pageSize=${pagination.pageSize}&status=${statusFilter}&search=${encodeURIComponent(search)}`;
      if (businessFilter) q += `&businessId=${businessFilter}`;

      const res = await api.topCompanyAdmins(q);
      if (res.data && res.pagination) {
        setAdmins(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message || "Failed to load company administrators");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompanySelectForCreate(businessId) {
    setCreateForm((f) => ({ ...f, businessId, branchId: "" }));
    setCreateWarning("");
    if (!businessId) {
      setBranchesList([]);
      return;
    }
    try {
      const branches = await api.topBusinessBranches(businessId);
      setBranchesList(branches);
      // Check if this company already has an active admin
      const existing = admins.find((a) => Number(a.business_id) === Number(businessId) && Number(a.is_active) === 1);
      if (existing) {
        setCreateWarning(
          `Company already has active primary admin (${existing.full_name} - ${existing.email}). Check 'Replace primary admin' to deactivate them upon creation.`
        );
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function handleOpenCreateModal() {
    const defaultBizId = companiesList.length > 0 ? companiesList[0].id : "";
    setCreateForm({
      businessId: defaultBizId,
      fullName: "",
      email: "",
      password: "",
      branchId: "",
      forceReplace: false
    });
    setCreateWarning("");
    setError("");
    if (defaultBizId) {
      handleCompanySelectForCreate(defaultBizId);
    }
    setShowCreateModal(true);
  }

  async function handleCreateAdmin(e) {
    e.preventDefault();
    if (!createForm.businessId || !createForm.fullName || !createForm.email || !createForm.password) {
      setError("Please fill all required fields");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const created = await api.topCreateCompanyAdmin({
        businessId: Number(createForm.businessId),
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        branchId: createForm.branchId ? Number(createForm.branchId) : null,
        forceReplace: Boolean(createForm.forceReplace)
      });
      setMessage(`Company administrator '${created.full_name}' created successfully`);
      setShowCreateModal(false);
      setCreateForm({
        businessId: "",
        fullName: "",
        email: "",
        password: "",
        branchId: "",
        forceReplace: false
      });
      setCreateWarning("");
      loadAdmins();
    } catch (err) {
      if (err.status === 409 || err.message?.includes("already has an active primary administrator")) {
        setCreateWarning(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditAdmin(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        fullName: editForm.fullName.trim(),
        isActive: Number(editForm.isActive),
        branchId: editForm.branchId ? Number(editForm.branchId) : null
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const updated = await api.topUpdateCompanyAdmin(editingAdmin.id, payload);
      setMessage(`Administrator '${updated.full_name}' updated successfully`);
      setEditingAdmin(null);
      loadAdmins();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(admin) {
    if (isSubmitting) return;
    const newStatus = admin.is_active ? 0 : 1;
    setError("");
    setMessage("");
    // In-place local state update so the toggle switch flips immediately
    setAdmins((prev) =>
      prev.map((a) => {
        if (Number(a.id) === Number(admin.id)) {
          return { ...a, is_active: newStatus };
        }
        // If activating, backend enforces 1 active admin per company:
        if (newStatus && Number(a.business_id) === Number(admin.business_id)) {
          return { ...a, is_active: 0 };
        }
        return a;
      })
    );
    try {
      const updated = await api.topToggleCompanyAdmin(admin.id, Boolean(newStatus));
      setMessage(`Administrator '${updated?.full_name || admin.full_name}' is now ${newStatus ? "Active" : "Inactive"}`);
      await loadAdmins();
    } catch (err) {
      setError(err.message || `Failed to ${newStatus ? "activate" : "deactivate"} administrator`);
      await loadAdmins();
    }
  }

  async function handleDeleteAdmin(forceDeactivate = false) {
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await api.topDeleteCompanyAdmin(deletingAdmin.id, {
        deactivateIfHasRecords: forceDeactivate
      });
      setMessage(res.message);
      setDeletingAdmin(null);
      setDeleteConflict(null);
      loadAdmins();
    } catch (err) {
      if (err.data?.hasRecords || err.message?.includes("associated business")) {
        setDeleteConflict(err.data || { error: err.message, hasRecords: true });
      } else {
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="topadmin-management-page">
      <div className="management-header">
        <div>
          <h1>Company Administrator Management</h1>
          <p className="muted">
            Manage primary business administrator accounts, enforce one active administrator per company, reassign credentials, and audit safe deactivations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          {onOpenMfaSetup && (
            <button
              type="button"
              className="secondary-btn"
              onClick={onOpenMfaSetup}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              title="Configure Two-Factor Authentication"
            >
              <span>🔐</span> Setup 2FA / MFA
            </button>
          )}
          <button
            type="button"
            className="primary-btn"
            onClick={handleOpenCreateModal}
          >
            ➕ Add Company Administrator
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <SectionCard
        title="Registered Company Administrators"
        subtitle="Primary executive accounts managing their respective store operations."
      >
        {/* Filters Toolbar */}
        <div className="table-filter-bar">
          <div className="search-field">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search administrator name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadAdmins()}
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearch("");
                  setTimeout(loadAdmins, 0);
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
                value={businessFilter}
                onChange={(e) => {
                  setBusinessFilter(e.target.value);
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
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <option value="all">All</option>
                <option value="active">Active Administrators</option>
                <option value="inactive">Inactive / Deactivated</option>
              </select>
            </label>

            <button
              type="button"
              className="secondary-btn btn-sm"
              onClick={loadAdmins}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Admins Table */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading company administrators...</p>
          </div>
        ) : admins.length > 0 ? (
          <div className="table-wrapper" style={{ overflowX: "auto", width: "100%" }}>
            <table className="data-table" style={{ minWidth: "900px", width: "100%" }}>
              <thead>
                <tr>
                  <th>Administrator Name & Email</th>
                  <th>Assigned Company</th>
                  <th>Primary Branch</th>
                  <th>Role</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: "right", width: "130px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => {
                  const isSelf = Number(currentUserId) === Number(a.id);
                  const isActive = Boolean(a.is_active);
                  const isProtected = Boolean(
                    a.is_protected ||
                    a.is_system ||
                    a.protected ||
                    a.system ||
                    a.is_immutable ||
                    a.is_break_glass ||
                    a.is_primary_protected ||
                    (isSelf && isActive)
                  );

                  let isDisabled = false;
                  let tooltip = isActive ? "Click to deactivate" : "Click to activate";

                  if (isProtected) {
                    isDisabled = true;
                    tooltip = "This account cannot be changed";
                  } else if (!hasPermission) {
                    isDisabled = true;
                    tooltip = isActive
                      ? "You don't have permission to deactivate this administrator"
                      : "You don't have permission to activate this administrator";
                  }

                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="user-table-chip">
                          <div className="avatar-chip">
                            {a.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{a.full_name}</strong>
                            <p className="font-mono text-muted small">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{a.business_name || "Unassigned"}</strong>
                        {a.business_code && (
                          <p className="font-mono small muted">{a.business_code}</p>
                        )}
                      </td>
                      <td>
                        <span>{a.branch_name || "All Branches / HQ"}</span>
                      </td>
                      <td>
                        <span className="badge muted-badge">Company Admin</span>
                      </td>
                      <td className="small muted">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td style={{ textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <div className="saas-table-action-group">
                          {/* 1. ACTIVATION TOGGLE SWITCH */}
                          <span
                            className={`saas-toggle-wrapper ${isDisabled ? "is-disabled" : ""}`}
                            title={tooltip}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              cursor: isDisabled ? "not-allowed" : "pointer"
                            }}
                          >
                            <ToggleSwitch
                              checked={isActive}
                              onChange={() => handleToggleStatus(a)}
                              onLabel=""
                              offLabel=""
                              size="sm"
                              disabled={isDisabled || isSubmitting}
                              title={tooltip}
                              ariaLabel={tooltip}
                            />
                          </span>

                          {/* 2. EDIT and DELETE BUTTONS — stacked vertically */}
                          <div className="saas-table-actions-vertical">
                            <button
                              type="button"
                              className="btn-sm saas-btn-edit"
                              disabled={isSubmitting || isProtected}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAdmin(a);
                                setEditForm({
                                  fullName: a.full_name,
                                  email: a.email,
                                  password: "",
                                  isActive: a.is_active,
                                  branchId: a.branch_id || ""
                                });
                              }}
                              title="Edit administrator credentials"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-sm saas-btn-delete"
                              disabled={isSubmitting || isProtected || isSelf}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingAdmin(a);
                                setDeleteConflict(null);
                              }}
                              title={
                                isProtected || isSelf
                                  ? (isSelf ? "You cannot delete your own profile" : "This account cannot be changed")
                                  : "Delete or safely deactivate administrator"
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
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
            <span className="empty-icon">👥</span>
            <p>No company administrators found matching your filter.</p>
          </div>
        )}
      </SectionCard>

      {/* ========================================================
          MODAL: CREATE COMPANY ADMINISTRATOR
          ======================================================== */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setShowCreateModal(false)}>
          <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateAdmin} autoComplete="off">
              <div className="modal-header">
                <div>
                  <h3>Provision Company Administrator</h3>
                  <p className="muted small">Assign a primary executive user to a company.</p>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setShowCreateModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid">
                <label className="full-span">
                  <span>Assigned Company *</span>
                  <SearchableSelect
                    value={createForm.businessId}
                    onChange={(e) => handleCompanySelectForCreate(e.target.value)}
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

                {createWarning && (
                  <div className="full-span alert warning">
                    <p>{createWarning}</p>
                    <label className="checkbox-label" style={{ marginTop: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={createForm.forceReplace}
                        onChange={(e) => setCreateForm({ ...createForm, forceReplace: e.target.checked })}
                      />
                      <span><strong>Replace primary admin</strong> (deactivates previous admin account safely)</span>
                    </label>
                  </div>
                )}

                <label>
                  <span>Administrator Full Name *</span>
                  <input
                    placeholder="e.g. Asad Mahmood"
                    autoComplete="off"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    required
                  />
                </label>

                <label>
                  <span>Login Email *</span>
                  <input
                    type="email"
                    placeholder="e.g. manager@store.com"
                    autoComplete="off"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </label>

                <label>
                  <span>Password *</span>
                  <input
                    type="password"
                    placeholder="Create a secure password"
                    autoComplete="new-password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                  />
                </label>

                <label>
                  <span>Primary Branch (Optional)</span>
                  <SearchableSelect
                    value={createForm.branchId}
                    onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                    placeholder="Search branch or HQ..."
                  >
                    <option value="">All Branches / Company HQ</option>
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </SearchableSelect>
                </label>

                <p className="full-span small muted notice-text">
                  🛡️ Security Note: The company administrator is granted access only to their assigned company and branches. They cannot view or manage any other company's records or access the TOP Admin SaaS panel.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Provisioning..." : "Create Administrator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT COMPANY ADMINISTRATOR
          ======================================================== */}
      {editingAdmin && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setEditingAdmin(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEditAdmin}>
              <div className="modal-header">
                <div>
                  <h3>Edit Administrator Details</h3>
                  <p className="muted small">{editingAdmin.business_name}</p>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setEditingAdmin(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid">
                <label className="full-span">
                  <span>Full Name *</span>
                  <input
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    required
                  />
                </label>

                <label className="full-span">
                  <span>Login Email Address</span>
                  <input
                    type="email"
                    value={editForm.email}
                    disabled
                    readOnly
                    title="Login email cannot be changed after account creation"
                    style={{ opacity: 0.75, cursor: "not-allowed" }}
                  />
                  <small className="muted" style={{ fontSize: "0.76rem", marginTop: "0.25rem", display: "block" }}>
                    Login email cannot be changed once the account has been created.
                  </small>
                </label>

                <label className="full-span">
                  <span>Reset Password (leave blank to keep current)</span>
                  <input
                    type="password"
                    placeholder="New password..."
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  />
                </label>

                <div className="full-span form-toggle-row">
                  <div>
                    <strong>Active Primary Status</strong>
                    <span className="muted small">Active administrator for this business (setting active deactivates current admin)</span>
                  </div>
                  <ToggleSwitch
                    checked={Number(editForm.isActive) === 1}
                    onChange={(val) => setEditForm({ ...editForm, isActive: val ? 1 : 0 })}
                    onLabel="Active Primary"
                    offLabel="Inactive"
                    size="md"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setEditingAdmin(null)}
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
          MODAL: SAFE DELETE / DEACTIVATE CONFIRMATION
          ======================================================== */}
      {deletingAdmin && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setDeletingAdmin(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Remove or Deactivate Administrator</h3>
              <button
                type="button"
                className="close-btn"
                disabled={isSubmitting}
                onClick={() => setDeletingAdmin(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {deleteConflict ? (
                <div className="conflict-alert-box">
                  <div className="alert warning">
                    <strong>⚠️ Historical Business Records Detected</strong>
                    <p style={{ marginTop: "0.5rem" }}>{deleteConflict.error}</p>
                  </div>
                  <p className="small muted" style={{ marginTop: "0.75rem" }}>
                    To preserve financial audit trails, invoice signatures, and cash drawer reconciliations, this user account should be <strong>deactivated</strong> instead of deleted. Deactivation immediately cuts off login access while safely preserving all business history.
                  </p>
                </div>
              ) : (
                <p>
                  Are you sure you want to remove administrator{" "}
                  <strong>{deletingAdmin.full_name}</strong> ({deletingAdmin.email}) for{" "}
                  <strong>{deletingAdmin.business_name}</strong>?
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                disabled={isSubmitting}
                onClick={() => {
                  setDeletingAdmin(null);
                  setDeleteConflict(null);
                }}
              >
                Cancel
              </button>

              {deleteConflict ? (
                <button
                  type="button"
                  className="warning-btn"
                  disabled={isSubmitting}
                  onClick={() => handleDeleteAdmin(true)}
                >
                  {isSubmitting ? "Deactivating..." : "Deactivate Account Safely"}
                </button>
              ) : (
                <button
                  type="button"
                  className="danger-btn"
                  disabled={isSubmitting}
                  onClick={() => handleDeleteAdmin(false)}
                >
                  {isSubmitting ? "Checking..." : "Permanently Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
