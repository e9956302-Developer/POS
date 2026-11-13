import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";
import { AdaptiveTable } from "../components/AdaptiveTable.jsx";
import { ToggleSwitch } from "../components/ToggleSwitch.jsx";

export function TopSaasAdminsPage({ context, onOpenMfaSetup, canActivate, initialAdmins = null }) {
  const [admins, setAdmins] = useState(initialAdmins || []);
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
      const allowed = context.can("top_saas_admins", "activate");
      if (allowed !== undefined && allowed !== null) return Boolean(allowed);
    }
    // Default: SaaS Top Admin has permission
    return userRole === "top_admin" || Boolean(loggedInUser?.is_top_admin) || Boolean(loggedInUser?.isTopAdmin);
  }, [canActivate, context, loggedInUser, userRole]);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: "", email: "", password: "" });

  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", password: "" });

  const [deletingAdmin, setDeletingAdmin] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  useEffect(() => {
    function handleMfaUpdated(e) {
      const { userId, enabled } = e.detail || {};
      if (userId !== undefined && userId !== null) {
        setAdmins((prev) =>
          prev.map((a) =>
            Number(a.id) === Number(userId) ? { ...a, mfa_enabled: enabled ? 1 : 0 } : a
          )
        );
      }
    }
    window.addEventListener("mfa:updated", handleMfaUpdated);
    return () => window.removeEventListener("mfa:updated", handleMfaUpdated);
  }, []);

  async function loadAdmins() {
    setLoading(true);
    setError("");
    try {
      const data = await api.topSaasAdmins();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load SaaS administrators");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.password) {
      setError("Please fill all required fields");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await api.topCreateSaasAdmin({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password
      });
      setMessage(res.message || "SaaS Super Admin provisioned successfully!");
      setShowCreateModal(false);
      setCreateForm({ fullName: "", email: "", password: "" });
      await loadAdmins();
    } catch (err) {
      setError(err.message || "Failed to create SaaS admin");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editingAdmin) return;
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const payload = { fullName: editForm.fullName.trim() };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      const res = await api.topUpdateSaasAdmin(editingAdmin.id, payload);
      setMessage(res.message || "SaaS Super Admin updated successfully");
      setEditingAdmin(null);
      await loadAdmins();
    } catch (err) {
      setError(err.message || "Failed to update SaaS admin");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(admin) {
    if (isSubmitting) return;
    const newStatus = admin.is_active ? 0 : 1;
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await api.topToggleSaasAdmin(admin.id, Boolean(newStatus));
      // Immediately update in-place in local state so button flips without full reload delay
      setAdmins((prev) =>
        prev.map((a) => (Number(a.id) === Number(admin.id) ? { ...a, is_active: newStatus } : a))
      );
      setMessage(res.message || `SaaS Super Admin '${admin.full_name}' is now ${newStatus ? "active" : "inactive"}`);
      await loadAdmins();
    } catch (err) {
      setError(err.message || `Failed to ${newStatus ? "activate" : "deactivate"} administrator`);
    } finally {
      setIsSubmitting(false);
    }
  }
  const handleActivate = handleToggleStatus;

  async function handleDeleteConfirm() {
    if (!deletingAdmin) return;
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await api.topDeleteSaasAdmin(deletingAdmin.id);
      setMessage(res.message || "Administrator permanently deleted");
      setDeletingAdmin(null);
      await loadAdmins();
    } catch (err) {
      setError(err.message || "Failed to delete administrator");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filtered List
  const filteredAdmins = useMemo(() => {
    return admins.filter((adm) => {
      if (statusFilter === "active" && !adm.is_active) return false;
      if (statusFilter === "inactive" && adm.is_active) return false;
      if (typeFilter === "break_glass" && !adm.is_break_glass) return false;
      if (typeFilter === "standard" && adm.is_break_glass) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = (adm.full_name || "").toLowerCase().includes(q);
        const emailMatch = (adm.email || "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [admins, statusFilter, typeFilter, search]);

  // Metric stats
  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => a.is_active).length;
    const mfa = admins.filter((a) => a.mfa_enabled).length;
    const breakGlass = admins.filter((a) => a.is_break_glass).length;
    return { total, active, mfa, breakGlass };
  }, [admins]);

  const currentUserId = context?.user?.id || context?.session?.id;

  return (
    <div className="topadmin-management-page">
      {/* Top Page Header */}
      <div className="management-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.8rem" }}>🛡️</span>
            <h1>SaaS Platform Super Administrators</h1>
          </div>
          <p className="muted" style={{ marginTop: "0.25rem", maxWidth: "800px" }}>
            Root-level platform owners with unrestricted global cross-tenant privileges, security vault access, and package licensing management.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          {onOpenMfaSetup && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onOpenMfaSetup(loggedInUser)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              title="Configure Two-Factor Authentication for your account"
            >
              <span>🔐</span> Setup 2FA / MFA
            </button>
          )}
          <button
            type="button"
            className="primary-btn"
            onClick={() => setShowCreateModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span>➕</span> Provision SaaS Super Admin
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="metrics-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">👑</span>
            <span className="metric-badge positive">{stats.active} Active</span>
          </div>
          <div className="metric-value">{stats.total}</div>
          <div className="metric-label">Total Platform Admins</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🔐</span>
            <span className="metric-badge positive">{stats.mfa} Protected</span>
          </div>
          <div className="metric-value">{stats.mfa}</div>
          <div className="metric-label">2FA / MFA Enrolled</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🚨</span>
            <span className="metric-badge warning">{stats.breakGlass} Vault</span>
          </div>
          <div className="metric-value">{stats.breakGlass}</div>
          <div className="metric-label">Emergency Break-Glass</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🌐</span>
            <span className="metric-badge neutral">Global Master</span>
          </div>
          <div className="metric-value">All Stores</div>
          <div className="metric-label">Scope & Access Level</div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <SectionCard
        title="Registered SaaS Platform Super Admins"
        subtitle="Platform root users with top_admin master privileges across all businesses and branches."
      >
        {/* Filters Toolbar */}
        <div className="table-filter-bar">
          <div className="search-field">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search administrator by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearch("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-group">
            <label>
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </label>

            <label>
              <span>Account Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Account Types</option>
                <option value="standard">Standard Platform Admins</option>
                <option value="break_glass">Emergency Break-Glass</option>
              </select>
            </label>

            <button
              type="button"
              className="secondary-btn btn-sm"
              onClick={loadAdmins}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* SaaS Super Admins Table */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading SaaS Super Admins...</p>
          </div>
        ) : (
          <AdaptiveTable
            columns={[
              {
                key: "full_name",
                label: "Administrator",
                priority: 1,
                minWidth: "160px",
                tooltip: (adm) => `${adm.full_name} (${adm.email})`,
                render: (_, adm) => {
                  const isSelf = Number(currentUserId) === Number(adm.id);
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: adm.is_break_glass ? "#dc2626" : "var(--primary-color, #2563eb)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: "0.82rem",
                          flexShrink: 0
                        }}
                      >
                        {adm.full_name ? adm.full_name.charAt(0).toUpperCase() : "A"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                          <strong style={{ fontSize: "0.85rem", color: "var(--text, #1e293b)" }}>{adm.full_name}</strong>
                          {isSelf && (
                            <span className="badge badge-info" style={{ fontSize: "0.68rem", padding: "0.1rem 0.35rem" }}>
                              You
                            </span>
                          )}
                        </div>
                        <div className="small muted" style={{ fontSize: "0.76rem", wordBreak: "break-all" }}>
                          {adm.email}
                        </div>
                      </div>
                    </div>
                  );
                }
              },
              {
                key: "is_break_glass",
                label: "Type",
                priority: 2,
                width: "1%",
                render: (_, adm) =>
                  adm.is_break_glass ? (
                    <span className="badge badge-warning" title="Emergency Break-Glass Account" style={{ whiteSpace: "nowrap", fontSize: "0.76rem" }}>
                      🚨 Break-Glass
                    </span>
                  ) : (
                    <span className="badge badge-neutral" style={{ whiteSpace: "nowrap", fontSize: "0.76rem" }}>
                      Standard
                    </span>
                  )
              },
              {
                key: "mfa_enabled",
                label: "2FA / MFA",
                priority: 2,
                width: "1%",
                render: (_, adm) => (
                  <span
                    className={`badge ${adm.mfa_enabled ? "badge-success" : "badge-neutral"}`}
                    style={{
                      whiteSpace: "nowrap",
                      fontSize: "0.76rem",
                      cursor: onOpenMfaSetup ? "pointer" : "default"
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenMfaSetup) {
                        onOpenMfaSetup(adm);
                      }
                    }}
                    title={
                      onOpenMfaSetup
                        ? `Click to configure 2FA for ${adm.full_name || adm.email}`
                        : adm.mfa_enabled ? "MFA Protected" : "Password Only"
                    }
                  >
                    {adm.mfa_enabled ? "🔐 MFA Enabled" : "🔓 Password Only"}
                  </span>
                )
              },
              {
                key: "privilege",
                label: "Scope",
                priority: 2,
                width: "1%",
                render: () => (
                  <span className="badge badge-info" style={{ fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.76rem" }}>
                    🌐 SaaS Root
                  </span>
                )
              },
              {
                key: "created_at",
                label: "Created",
                priority: 3,
                width: "1%",
                render: (val) => (
                  <span style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                    {val ? new Date(val).toLocaleDateString() : "—"}
                  </span>
                )
              },
              {
                key: "last_login_at",
                label: "Last Activity",
                priority: 3,
                width: "1%",
                render: (val) => {
                  if (!val) {
                    return <span className="muted" style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>Never</span>;
                  }
                  const d = new Date(val);
                  return (
                    <div style={{ lineHeight: 1.25, whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 500 }}>{d.toLocaleDateString()}</div>
                      <div className="small muted" style={{ fontSize: "0.72rem" }}>
                        {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                }
              }
            ]}
            data={filteredAdmins}
            keyField="id"
            emptyMessage="No SaaS Platform Super Admins found matching criteria."
            actions={(adm) => {
              const isSelf = Number(currentUserId) === Number(adm.id);
              const isActive = Boolean(adm.is_active);
              const isProtected = Boolean(
                adm.is_break_glass ||
                adm.is_protected ||
                adm.is_system ||
                adm.protected ||
                adm.system ||
                adm.is_immutable ||
                (isSelf && isActive)
              );

              let isDisabled = false;
              let tooltip = isActive ? "Click to deactivate" : "Click to activate";

              if (isProtected) {
                isDisabled = true;
                tooltip = "This profile cannot be changed";
              } else if (!hasPermission) {
                isDisabled = true;
                tooltip = isActive
                  ? "You don't have permission to deactivate this profile"
                  : "You don't have permission to activate this profile";
              }

              return (
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
                      onChange={() => handleToggleStatus(adm)}
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
                      disabled={isSubmitting || adm.is_break_glass}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAdmin(adm);
                        setEditForm({ fullName: adm.full_name || "", password: "" });
                      }}
                      title={adm.is_break_glass ? "Break-glass accounts cannot be edited" : "Edit administrator details"}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-sm saas-btn-delete"
                      disabled={isSubmitting || isProtected || isSelf}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingAdmin(adm);
                      }}
                      title={
                        isProtected || isSelf
                          ? (isSelf ? "You cannot delete your own profile" : "This profile cannot be changed")
                          : "Delete administrator profile"
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            }}
            actionsHeader="Actions"
            actionsWidth="130px"
            onRowClick={(adm) => {
              if (!adm.is_break_glass) {
                setEditingAdmin(adm);
                setEditForm({ fullName: adm.full_name || "", password: "" });
              }
            }}
          />
        )}
      </SectionCard>

      {/* ========================================================
          MODAL: CREATE SAAS SUPER ADMIN
          ======================================================== */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreate} autoComplete="off">
              <div className="modal-header">
                <div>
                  <h3>Provision SaaS Platform Super Admin</h3>
                  <p className="muted small">Add a new root-level administrator with global system access.</p>
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
                <div className="full-span alert info" style={{ margin: "0 0 1rem 0" }}>
                  <strong>🛡️ High Privilege Account:</strong> SaaS Super Admins have complete access to all store tenants, subscription packages, and system audit logs.
                </div>

                <label className="full-span">
                  <span>Administrator Full Name *</span>
                  <input
                    placeholder="e.g. Platform Super Administrator"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    required
                    autoFocus
                  />
                </label>

                <label className="full-span">
                  <span>Login Email *</span>
                  <input
                    type="email"
                    placeholder="e.g. admin@platform.local"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </label>

                <label className="full-span">
                  <span>Master Password *</span>
                  <input
                    type="password"
                    placeholder="Create a strong, secure master password (min 8 chars)"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                  />
                </label>
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
                  {isSubmitting ? "Provisioning..." : "Provision SaaS Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT SAAS SUPER ADMIN
          ======================================================== */}
      {editingAdmin && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setEditingAdmin(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEdit} autoComplete="off">
              <div className="modal-header">
                <div>
                  <h3>Edit SaaS Super Admin</h3>
                  <p className="muted small">{editingAdmin.email}</p>
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
                  <span>New Password (leave blank to keep current)</span>
                  <input
                    type="password"
                    placeholder="Enter new password (optional, min 8 chars)"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  />
                </label>

                {onOpenMfaSetup && (
                  <div
                    className="full-span"
                    style={{
                      marginTop: "0.25rem",
                      padding: "0.75rem 0.9rem",
                      background: "var(--bg-card-hover, rgba(0,0,0,0.02))",
                      borderRadius: "6px",
                      border: "1px solid var(--border, #e2e8f0)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Two-Factor Authentication (2FA / MFA)</div>
                      <div className="small muted">
                        Status: {editingAdmin.mfa_enabled ? "🔐 Enrolled & Protected" : "🔓 Password Only (Not Enrolled)"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="secondary-btn btn-sm"
                      onClick={() => {
                        const target = editingAdmin;
                        setEditingAdmin(null);
                        onOpenMfaSetup(target);
                      }}
                    >
                      {editingAdmin.mfa_enabled ? "🔐 Manage 2FA" : "⚡ Setup 2FA"}
                    </button>
                  </div>
                )}
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
          MODAL: DELETE CONFIRMATION
          ======================================================== */}
      {deletingAdmin && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setDeletingAdmin(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Confirm Account Deletion</h3>
                <p className="muted small">Permanent removal of SaaS administrator</p>
              </div>
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
              <div className="alert warning" style={{ margin: 0 }}>
                Are you sure you want to permanently delete SaaS Super Admin <strong>{deletingAdmin.full_name}</strong> ({deletingAdmin.email})?
                <p className="small" style={{ marginTop: "0.5rem" }}>
                  This action is permanent and cannot be undone. All active sessions for this account will be revoked immediately.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                disabled={isSubmitting}
                onClick={() => setDeletingAdmin(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                disabled={isSubmitting}
                onClick={handleDeleteConfirm}
              >
                {isSubmitting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
