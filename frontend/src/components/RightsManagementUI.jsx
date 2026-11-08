import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getForms,
  getRights,
  saveRights,
  makePermissionKey,
  isPackagePageAllowed,
  CATEGORIES,
  RIGHT_DEFINITIONS
} from "../services/rightsManagementService.js";

export function RightsManagementUI({
  initialTargetType = "role",
  initialTargetId = "manager",
  userList = [],
  subscriptionPlanName = "Active SaaS Plan",
  allowedPages = null,
  onSaved,
  onCancel
}) {
  // Target Selection state
  const [targetType, setTargetType] = useState(initialTargetType); // "role" | "user"
  const [targetId, setTargetId] = useState(initialTargetId);

  // Forms and Rights state
  const [forms, setForms] = useState([]);
  const [initialRights, setInitialRights] = useState({});
  const [currentRights, setCurrentRights] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [fetchedAllowedPages, setFetchedAllowedPages] = useState(null);

  // Effective allowed pages from prop or fallback to API
  const effectiveAllowedPages = useMemo(() => {
    if (Array.isArray(allowedPages)) return allowedPages;
    if (Array.isArray(fetchedAllowedPages)) return fetchedAllowedPages;
    return null;
  }, [allowedPages, fetchedAllowedPages]);

  // Package gating check for individual forms
  const isFormInPackage = useCallback(
    (form) => {
      if (!effectiveAllowedPages || effectiveAllowedPages.length === 0) return true;
      return isPackagePageAllowed(form.moduleKey || form.id, effectiveAllowedPages);
    },
    [effectiveAllowedPages]
  );

  // UI View and Filtering states
  const [layoutMode, setLayoutMode] = useState("matrix"); // "matrix" | "cards" | "accordion"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "modified" | "granted" | "denied"
  const [collapsedCards, setCollapsedCards] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Modals state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySource, setCopySource] = useState("manager");

  // Fetch package allowed pages if not provided via props
  useEffect(() => {
    if (!allowedPages) {
      import("../api.js").then(({ api }) => {
        api.businessRolePermissions().then((resp) => {
          if (resp?.allowedPages && Array.isArray(resp.allowedPages)) {
            setFetchedAllowedPages(resp.allowedPages);
          }
        }).catch(() => {});
      });
    }
  }, [allowedPages]);

  // Load forms on mount or when target or package changes
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const loadedForms = await getForms();
        setForms(loadedForms);
        const rights = await getRights(targetType, targetId, effectiveAllowedPages);
        setInitialRights({ ...rights });
        setCurrentRights({ ...rights });
      } catch (err) {
        console.error("Failed to load forms/rights:", err);
        setStatusMessage({ type: "error", text: "Failed to load permissions: " + err.message });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [targetType, targetId, effectiveAllowedPages]);

  // Handle changing target
  const handleTargetChange = useCallback((newType, newId) => {
    setTargetType(newType);
    setTargetId(newId);
    setStatusMessage(null);
  }, []);

  // Compute changes diff
  const changes = useMemo(() => {
    const diff = [];
    if (!forms.length) return diff;

    forms.forEach((form) => {
      form.rights.forEach((rightKey) => {
        const key = makePermissionKey(form.id, rightKey);
        const originalVal = Boolean(initialRights[key]);
        const currentVal = Boolean(currentRights[key]);

        if (originalVal !== currentVal) {
          diff.push({
            key,
            formId: form.id,
            formName: form.name,
            formIcon: form.icon,
            category: form.category,
            rightKey,
            rightLabel: RIGHT_DEFINITIONS.find((r) => r.key === rightKey)?.label || rightKey,
            previousState: originalVal,
            newState: currentVal,
            type: currentVal ? "granted" : "revoked"
          });
        }
      });
    });

    return diff;
  }, [forms, initialRights, currentRights]);

  const hasChanges = changes.length > 0;
  const grantedChangesCount = changes.filter((c) => c.type === "granted").length;
  const revokedChangesCount = changes.filter((c) => c.type === "revoked").length;

  // Toggle single right
  const toggleRight = useCallback((formId, rightKey) => {
    const form = forms.find((f) => f.id === formId);
    if (form && !isFormInPackage(form)) {
      setStatusMessage({
        type: "warning",
        text: `Cannot grant access to "${form.name}" because it is not included in your company's active subscription package.`
      });
      return;
    }
    const key = makePermissionKey(formId, rightKey);
    setCurrentRights((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, [forms, isFormInPackage]);

  // Form-level bulk actions
  const setFormAllRights = useCallback((form, value) => {
    if (value && !isFormInPackage(form)) {
      setStatusMessage({
        type: "warning",
        text: `Cannot grant access to "${form.name}" because it is not included in your company's active subscription package.`
      });
      return;
    }
    setCurrentRights((prev) => {
      const next = { ...prev };
      form.rights.forEach((r) => {
        next[makePermissionKey(form.id, r)] = value;
      });
      return next;
    });
  }, [isFormInPackage]);

  const invertFormRights = useCallback((form) => {
    if (!isFormInPackage(form)) return;
    setCurrentRights((prev) => {
      const next = { ...prev };
      form.rights.forEach((r) => {
        const k = makePermissionKey(form.id, r);
        next[k] = !prev[k];
      });
      return next;
    });
  }, [isFormInPackage]);

  // Filtered forms calculation
  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      // Category filter
      if (selectedCategory !== "All" && form.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = form.name.toLowerCase().includes(q);
        const matchesDesc = form.description?.toLowerCase().includes(q);
        const matchesCategory = form.category.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCategory) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const grantedCount = form.rights.filter((r) => currentRights[makePermissionKey(form.id, r)]).length;
        const total = form.rights.length;
        const formHasModified = form.rights.some(
          (r) => Boolean(initialRights[makePermissionKey(form.id, r)]) !== Boolean(currentRights[makePermissionKey(form.id, r)])
        );

        if (statusFilter === "modified" && !formHasModified) return false;
        if (statusFilter === "granted" && grantedCount === 0) return false;
        if (statusFilter === "denied" && grantedCount === total) return false;
      }

      return true;
    });
  }, [forms, selectedCategory, searchQuery, statusFilter, currentRights, initialRights]);

  // Global bulk actions across currently filtered forms
  const handleBulkGrantAll = useCallback(() => {
    setCurrentRights((prev) => {
      const next = { ...prev };
      filteredForms.forEach((form) => {
        if (!isFormInPackage(form)) return; // Exclude non-package forms
        form.rights.forEach((r) => {
          next[makePermissionKey(form.id, r)] = true;
        });
      });
      return next;
    });
  }, [filteredForms, isFormInPackage]);

  const handleBulkRevokeAll = useCallback(() => {
    setCurrentRights((prev) => {
      const next = { ...prev };
      filteredForms.forEach((form) => {
        form.rights.forEach((r) => {
          next[makePermissionKey(form.id, r)] = false;
        });
      });
      return next;
    });
  }, [filteredForms]);

  const handleBulkInvertAll = useCallback(() => {
    setCurrentRights((prev) => {
      const next = { ...prev };
      filteredForms.forEach((form) => {
        if (!isFormInPackage(form)) return; // Exclude non-package forms
        form.rights.forEach((r) => {
          const k = makePermissionKey(form.id, r);
          next[k] = !prev[k];
        });
      });
      return next;
    });
  }, [filteredForms, isFormInPackage]);

  const handleResetToInitial = useCallback(() => {
    setCurrentRights({ ...initialRights });
    setStatusMessage({ type: "info", text: "Reset all changes to last saved state." });
  }, [initialRights]);

  // Copy Rights from another source
  const handleCopyRights = useCallback(async () => {
    try {
      setIsLoading(true);
      let sourceRights = {};
      if (["manager", "cashier", "admin"].includes(copySource)) {
        sourceRights = await getRights("role", copySource);
      } else {
        sourceRights = await getRights("user", copySource);
      }

      setCurrentRights((prev) => ({
        ...prev,
        ...sourceRights
      }));

      setShowCopyModal(false);
      setStatusMessage({
        type: "info",
        text: `Permissions copied successfully from ${copySource}. Review changes and click Save.`
      });
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to copy permissions: " + err.message });
    } finally {
      setIsLoading(false);
    }
  }, [copySource]);

  // Save changes
  const handleConfirmSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Pre-validation: verify that no non-package modules are enabled
      if (Array.isArray(effectiveAllowedPages) && effectiveAllowedPages.length > 0) {
        const invalidModules = new Set();
        Object.entries(currentRights).forEach(([key, val]) => {
          if (Boolean(val)) {
            const [formId] = key.split(":");
            const form = forms.find((f) => f.id === formId);
            if (form && !isPackagePageAllowed(form.moduleKey || form.id, effectiveAllowedPages)) {
              invalidModules.add(form.id);
            }
          }
        });
        if (invalidModules.size > 0) {
          const list = Array.from(invalidModules).join(", ");
          throw new Error(`These modules are not in your package: ${list}. They are not included in your company's subscription package authorized by SaaS Top Admin.`);
        }
      }

      await saveRights(targetType, targetId, currentRights);
      setInitialRights({ ...currentRights });
      setShowSummaryModal(false);
      setStatusMessage({
        type: "success",
        text: `Successfully saved ${changes.length} permission changes for ${targetType === "role" ? targetId.toUpperCase() : "selected user"}!`
      });
      if (typeof onSaved === "function") {
        try {
          await onSaved(currentRights);
        } catch (cbErr) {
          console.error("Error in onSaved callback:", cbErr);
        }
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to save permissions: " + err.message });
    } finally {
      setIsSaving(false);
    }
  }, [targetType, targetId, currentRights, changes.length, onSaved, effectiveAllowedPages, forms]);

  // Helpers for UI display
  const targetLabel = useMemo(() => {
    if (targetType === "role") {
      if (targetId === "manager") return "Store Manager (All Outlets)";
      if (targetId === "cashier") return "Cashier / Front-Desk Staff";
      return targetId.toUpperCase() + " Role";
    }
    const found = userList.find((u) => String(u.id) === String(targetId));
    return found ? `${found.full_name} (${found.email})` : `User #${targetId}`;
  }, [targetType, targetId, userList]);

  // Grouped by Category for Accordion mode
  const formsByCategory = useMemo(() => {
    const grouped = {};
    filteredForms.forEach((form) => {
      if (!grouped[form.category]) grouped[form.category] = [];
      grouped[form.category].push(form);
    });
    return grouped;
  }, [filteredForms]);

  return (
    <div className="rights-management-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* 1. TOP TARGET SELECTOR BAR */}
      <div
        className="rights-target-bar"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", fontWeight: 700 }}>
              Configuring Rights For:
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              <div className="segmented-control" style={{ display: "inline-flex", background: "var(--surface-strong)", borderRadius: "6px", padding: "2px" }}>
                <button
                  type="button"
                  className={`segment-btn ${targetType === "role" ? "active" : ""}`}
                  onClick={() => handleTargetChange("role", "manager")}
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.85rem",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: targetType === "role" ? "var(--primary)" : "transparent",
                    color: targetType === "role" ? "#fff" : "var(--text)",
                    fontWeight: targetType === "role" ? 600 : 400
                  }}
                >
                  🛡️ Company Role
                </button>
                <button
                  type="button"
                  className={`segment-btn ${targetType === "user" ? "active" : ""}`}
                  onClick={() => handleTargetChange("user", userList[0]?.id || "1")}
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.85rem",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: targetType === "user" ? "var(--primary)" : "transparent",
                    color: targetType === "user" ? "#fff" : "var(--text)",
                    fontWeight: targetType === "user" ? 600 : 400
                  }}
                >
                  👤 Individual Staff User
                </button>
              </div>

              {targetType === "role" ? (
                <select
                  value={targetId}
                  onChange={(e) => handleTargetChange("role", e.target.value)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--input-bg)",
                    color: "var(--text)",
                    fontWeight: 600
                  }}
                >
                  <option value="manager">👔 Branch Manager</option>
                  <option value="cashier">🏷️ Cashier</option>
                </select>
              ) : (
                <select
                  value={targetId}
                  onChange={(e) => handleTargetChange("user", e.target.value)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--input-bg)",
                    color: "var(--text)",
                    fontWeight: 600,
                    maxWidth: "260px"
                  }}
                >
                  {userList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role_name || u.roleName})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div
            className="target-badge"
            style={{
              padding: "0.4rem 0.75rem",
              background: "var(--surface-strong)",
              borderRadius: "6px",
              borderLeft: "3px solid var(--primary)",
              fontSize: "0.85rem"
            }}
          >
            <span style={{ color: "var(--muted)", marginRight: "0.4rem" }}>Target:</span>
            <strong>{targetLabel}</strong>
          </div>
        </div>

        {/* COPY RIGHTS & REFRESH */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            className="secondary-btn btn-sm"
            onClick={() => setShowCopyModal(true)}
            title="Copy all rights from another role or staff member"
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <span>📋 Copy From...</span>
          </button>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            📦 {subscriptionPlanName} ({forms.length} entities registered)
          </span>
        </div>
      </div>

      {/* STATUS NOTIFICATION ALERT */}
      {statusMessage && (
        <div
          className={`alert ${statusMessage.type === "error" ? "error" : statusMessage.type === "success" ? "success" : "info"}`}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0 }}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. TOOLBAR: SEARCH, CATEGORIES, LAYOUT SWITCHER, & BULK ACTIONS */}
      <div
        className="rights-controls-bar"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0.85rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}
      >
        {/* Top row: search + status + layout switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1 1 320px" }}>
            <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
              <input
                type="text"
                placeholder="🔍 Search 50+ forms (e.g. sales, payroll, stock)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.45rem 2rem 0.45rem 0.75rem",
                  fontSize: "0.88rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--input-bg)",
                  color: "var(--text)"
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)"
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--input-bg)",
                color: "var(--text)",
                fontSize: "0.85rem"
              }}
            >
              <option value="all">Filter: All Statuses</option>
              <option value="modified">Filter: Modified Only {hasChanges ? `(${changes.length})` : ""}</option>
              <option value="granted">Filter: Has Granted</option>
              <option value="denied">Filter: Has Denied</option>
            </select>
          </div>

          {/* LAYOUT PICKER SEGMENTED CONTROL */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600 }}>Layout:</span>
            <div
              className="segmented-control"
              style={{
                display: "inline-flex",
                background: "var(--surface-strong)",
                borderRadius: "6px",
                padding: "2px"
              }}
            >
              <button
                type="button"
                onClick={() => setLayoutMode("matrix")}
                title="Dense Matrix Table: Form rows with sticky headers and columns"
                style={{
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.82rem",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: layoutMode === "matrix" ? "var(--primary)" : "transparent",
                  color: layoutMode === "matrix" ? "#fff" : "var(--text)",
                  fontWeight: layoutMode === "matrix" ? 600 : 400
                }}
              >
                ▦ Dense Matrix (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("cards")}
                title="Collapsible Cards Grid: Compact box per form with quick toggles"
                style={{
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.82rem",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: layoutMode === "cards" ? "var(--primary)" : "transparent",
                  color: layoutMode === "cards" ? "#fff" : "var(--text)",
                  fontWeight: layoutMode === "cards" ? 600 : 400
                }}
              >
                🗂️ Compact Cards
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("accordion")}
                title="Grouped Categories: Accordion sections by operational domain"
                style={{
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.82rem",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: layoutMode === "accordion" ? "var(--primary)" : "transparent",
                  color: layoutMode === "accordion" ? "#fff" : "var(--text)",
                  fontWeight: layoutMode === "accordion" ? 600 : 400
                }}
              >
                📑 Grouped Categories
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row: Category Filter Tabs & Bulk Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          {/* CATEGORY PILLS */}
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
            {CATEGORIES.map((cat) => {
              const count = cat === "All" ? forms.length : forms.filter((f) => f.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.78rem",
                    borderRadius: "16px",
                    border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border)",
                    background: isSelected ? "var(--primary)" : "var(--surface-strong)",
                    color: isSelected ? "#fff" : "var(--text)",
                    cursor: "pointer",
                    fontWeight: isSelected ? 600 : 400
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* BULK ACTIONS ACROSS CURRENT FILTER */}
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginRight: "0.25rem" }}>
              Bulk ({filteredForms.length}):
            </span>
            <button
              type="button"
              className="btn-sm ghost-btn"
              onClick={handleBulkGrantAll}
              title="Grant all rights across matching forms"
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
            >
              ✅ Grant All
            </button>
            <button
              type="button"
              className="btn-sm ghost-btn"
              onClick={handleBulkRevokeAll}
              title="Revoke all rights across matching forms"
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
            >
              🔒 Revoke All
            </button>
            <button
              type="button"
              className="btn-sm ghost-btn"
              onClick={handleBulkInvertAll}
              title="Invert current granted/denied states"
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
            >
              🔄 Invert
            </button>
            {hasChanges && (
              <button
                type="button"
                className="btn-sm ghost-btn"
                onClick={handleResetToInitial}
                title="Discard unsaved changes and reset to last saved state"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", color: "var(--warning)" }}
              >
                ↩️ Reset ({changes.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE VIEW */}
      {isLoading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
          <div className="spinner" style={{ marginBottom: "0.75rem" }} />
          Loading 50+ entity permissions...
        </div>
      ) : filteredForms.length === 0 ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: "8px",
            padding: "3rem",
            textAlign: "center"
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
          <h4 style={{ margin: 0 }}>No matching forms found</h4>
          <p className="muted" style={{ margin: "0.5rem 0 1rem 0" }}>
            Try clearing your search query or selecting a different domain category.
          </p>
          <button
            type="button"
            className="secondary-btn btn-sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setStatusFilter("all");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : layoutMode === "matrix" ? (
        /* ======================================================== */
        /* OPTION A: DENSE MATRIX / TABLE LAYOUT                     */
        /* (Most compact, frozen sticky headers & sticky left col)  */
        /* ======================================================== */
        <div
          className="table-wrap rights-matrix-wrap"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "auto",
            maxHeight: "calc(100vh - 360px)",
            position: "relative"
          }}
        >
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, zIndex: 3, background: "var(--surface-strong)" }}>
                {/* STICKY FROZEN CORNER CELL */}
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    top: 0,
                    zIndex: 4,
                    background: "var(--surface-strong)",
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    minWidth: "260px",
                    maxWidth: "320px",
                    borderBottom: "2px solid var(--border)",
                    boxShadow: "2px 0 6px rgba(0,0,0,0.06)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Entity Form ({filteredForms.length})</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400 }}>Quick Actions</span>
                  </div>
                </th>

                {/* RIGHTS COLUMNS */}
                {RIGHT_DEFINITIONS.map((right) => (
                  <th
                    key={right.key}
                    style={{
                      padding: "0.6rem 0.5rem",
                      textAlign: "center",
                      borderBottom: "2px solid var(--border)",
                      minWidth: "90px",
                      background: "var(--surface-strong)"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                      <span style={{ fontSize: "0.9rem" }}>{right.icon}</span>
                      <strong style={{ fontSize: "0.8rem", color: right.color }}>{right.label}</strong>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredForms.map((form, index) => {
                const isAllowed = isFormInPackage(form);
                const formHasModified = form.rights.some((r) => {
                  const k = makePermissionKey(form.id, r);
                  return Boolean(initialRights[k]) !== Boolean(currentRights[k]);
                });

                return (
                  <tr
                    key={form.id}
                    style={{
                      background: formHasModified
                        ? "rgba(245, 158, 11, 0.05)"
                        : index % 2 === 0
                        ? "var(--surface)"
                        : "var(--surface-strong)",
                      opacity: isAllowed ? 1 : 0.55,
                      transition: "background 0.15s ease"
                    }}
                  >
                    {/* STICKY FROZEN LEFT COLUMN FOR FORM NAME */}
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 2,
                        background: formHasModified
                          ? "var(--surface)"
                          : index % 2 === 0
                          ? "var(--surface)"
                          : "var(--surface-strong)",
                        padding: "0.6rem 1rem",
                        borderBottom: "1px solid var(--border)",
                        boxShadow: "2px 0 6px rgba(0,0,0,0.06)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                          <span style={{ fontSize: "1.1rem" }}>{form.icon}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                              <strong style={{ fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {form.name}
                              </strong>
                              {!isAllowed ? (
                                <span
                                  className="package-not-allowed-badge"
                                  style={{
                                    fontSize: "0.68rem",
                                    background: "rgba(239, 68, 68, 0.15)",
                                    color: "var(--danger)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    padding: "1px 6px",
                                    borderRadius: "10px",
                                    fontWeight: 600,
                                    whiteSpace: "nowrap"
                                  }}
                                  title="Not in your company's subscription package authorized by SaaS Top Admin"
                                >
                                  🔒 Not in your package
                                </span>
                              ) : formHasModified ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: "var(--warning)",
                                    flexShrink: 0
                                  }}
                                  title="Unsaved changes on this form"
                                />
                              ) : null}
                            </div>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--muted)",
                                display: "block",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {form.category}
                            </span>
                          </div>
                        </div>

                        {/* ROW QUICK BULK ACTIONS */}
                        <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                          <button
                            type="button"
                            disabled={!isAllowed}
                            onClick={() => setFormAllRights(form, true)}
                            title={isAllowed ? "Grant all available rights for this form" : "Not in your package"}
                            style={{
                              padding: "2px 6px",
                              fontSize: "0.68rem",
                              borderRadius: "3px",
                              border: "1px solid var(--border)",
                              background: "transparent",
                              cursor: isAllowed ? "pointer" : "not-allowed",
                              opacity: isAllowed ? 1 : 0.4,
                              color: "var(--positive)"
                            }}
                          >
                            All
                          </button>
                          <button
                            type="button"
                            disabled={!isAllowed}
                            onClick={() => setFormAllRights(form, false)}
                            title={isAllowed ? "Revoke all rights for this form" : "Not in your package"}
                            style={{
                              padding: "2px 6px",
                              fontSize: "0.68rem",
                              borderRadius: "3px",
                              border: "1px solid var(--border)",
                              background: "transparent",
                              cursor: isAllowed ? "pointer" : "not-allowed",
                              opacity: isAllowed ? 1 : 0.4,
                              color: "var(--muted)"
                            }}
                          >
                            None
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* RIGHTS CELLS WITH COMPACT SEGMENTED PILLS */}
                    {RIGHT_DEFINITIONS.map((right) => {
                      const isSupported = form.rights.includes(right.key);
                      const key = makePermissionKey(form.id, right.key);
                      const isGranted = Boolean(currentRights[key]);
                      const isInitialGranted = Boolean(initialRights[key]);
                      const isModified = isSupported && isGranted !== isInitialGranted;

                      return (
                        <td
                          key={right.key}
                          style={{
                            padding: "0.4rem 0.5rem",
                            textAlign: "center",
                            borderBottom: "1px solid var(--border)"
                          }}
                        >
                          {isSupported ? (
                            <button
                              type="button"
                              role="switch"
                              disabled={!isAllowed}
                              aria-checked={isGranted}
                              aria-label={`${form.name} ${right.label}: ${!isAllowed ? "Not in your package" : (isGranted ? "Granted" : "Denied")}`}
                              onClick={() => toggleRight(form.id, right.key)}
                              title={!isAllowed ? "Not in your package: Upgrade subscription to grant this permission" : undefined}
                              style={{
                                width: "68px",
                                height: "28px",
                                padding: "2px 6px",
                                borderRadius: "14px",
                                border: !isAllowed
                                  ? "1px dashed var(--border)"
                                  : isModified
                                  ? "2px solid var(--warning)"
                                  : isGranted
                                  ? "1px solid var(--positive)"
                                  : "1px solid var(--border)",
                                background: !isAllowed
                                  ? "var(--surface-strong)"
                                  : isGranted
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : "var(--surface-strong)",
                                color: !isAllowed
                                  ? "var(--muted)"
                                  : isGranted
                                  ? "var(--positive)"
                                  : "var(--muted)",
                                cursor: isAllowed ? "pointer" : "not-allowed",
                                opacity: isAllowed ? 1 : 0.45,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                transition: "all 0.12s ease",
                                outline: "none"
                              }}
                            >
                              <span>{!isAllowed ? "🔒" : isGranted ? "✓" : "✕"}</span>
                              <span>{!isAllowed ? "LOCK" : isGranted ? "ON" : "OFF"}</span>
                              {isAllowed && isModified && (
                                <span
                                  style={{
                                    width: "5px",
                                    height: "5px",
                                    borderRadius: "50%",
                                    background: "var(--warning)"
                                  }}
                                  title="Modified"
                                />
                              )}
                            </button>
                          ) : (
                            <span style={{ color: "var(--muted)", opacity: 0.35, fontSize: "0.85rem" }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : layoutMode === "cards" ? (
        /* ======================================================== */
        /* OPTION B: COLLAPSIBLE CARDS GRID LAYOUT                   */
        /* (Clean card per form with compact toggles inside)        */
        /* ======================================================== */
        <div
          className="rights-cards-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
            gap: "0.75rem"
          }}
        >
          {filteredForms.map((form) => {
            const isAllowed = isFormInPackage(form);
            const isCollapsed = Boolean(collapsedCards[form.id]);
            const formHasModified = form.rights.some((r) => {
              const k = makePermissionKey(form.id, r);
              return Boolean(initialRights[k]) !== Boolean(currentRights[k]);
            });
            const grantedCount = form.rights.filter((r) => currentRights[makePermissionKey(form.id, r)]).length;

            return (
              <div
                key={form.id}
                className="rights-card"
                style={{
                  background: "var(--surface)",
                  border: !isAllowed
                    ? "1px dashed var(--border)"
                    : formHasModified
                    ? "1px solid var(--warning)"
                    : "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                  opacity: isAllowed ? 1 : 0.6,
                  boxShadow: formHasModified && isAllowed ? "0 0 0 1px var(--warning)" : "none",
                  transition: "border 0.15s ease"
                }}
              >
                {/* CARD HEADER */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", flex: 1, minWidth: 0 }}
                    onClick={() =>
                      setCollapsedCards((prev) => ({
                        ...prev,
                        [form.id]: !prev[form.id]
                      }))
                    }
                  >
                    <span style={{ fontSize: "1.2rem" }}>{form.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {form.name}
                        </strong>
                        {!isAllowed ? (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "var(--danger)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              fontWeight: 600
                            }}
                          >
                            🔒 Not in your package
                          </span>
                        ) : formHasModified ? (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              background: "rgba(245, 158, 11, 0.2)",
                              color: "var(--warning)",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              fontWeight: 600
                            }}
                          >
                            MODIFIED
                          </span>
                        ) : null}
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "block" }}>
                        {form.category} • {grantedCount}/{form.rights.length} Granted
                      </span>
                    </div>
                  </div>

                  {/* CARD ACTIONS: COLLAPSE & QUICK ALL/NONE */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                      type="button"
                      disabled={!isAllowed}
                      onClick={() => setFormAllRights(form, true)}
                      title={isAllowed ? "Grant all" : "Not in your package"}
                      style={{
                        padding: "2px 5px",
                        fontSize: "0.68rem",
                        borderRadius: "3px",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        cursor: isAllowed ? "pointer" : "not-allowed",
                        opacity: isAllowed ? 1 : 0.4,
                        color: "var(--positive)"
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      disabled={!isAllowed}
                      onClick={() => setFormAllRights(form, false)}
                      title={isAllowed ? "Revoke all" : "Not in your package"}
                      style={{
                        padding: "2px 5px",
                        fontSize: "0.68rem",
                        borderRadius: "3px",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        cursor: isAllowed ? "pointer" : "not-allowed",
                        opacity: isAllowed ? 1 : 0.4,
                        color: "var(--muted)"
                      }}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedCards((prev) => ({
                          ...prev,
                          [form.id]: !prev[form.id]
                        }))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        fontSize: "0.75rem",
                        padding: "2px 4px"
                      }}
                    >
                      {isCollapsed ? "▼" : "▲"}
                    </button>
                  </div>
                </div>

                {/* CARD BODY: COMPACT RIGHTS TOGGLES (COLLAPSIBLE) */}
                {!isCollapsed && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.4rem",
                      paddingTop: "0.4rem",
                      borderTop: "1px solid var(--border)"
                    }}
                  >
                    {form.rights.map((rightKey) => {
                      const def = RIGHT_DEFINITIONS.find((r) => r.key === rightKey);
                      const key = makePermissionKey(form.id, rightKey);
                      const isGranted = Boolean(currentRights[key]);
                      const isInitial = Boolean(initialRights[key]);
                      const isMod = isGranted !== isInitial;

                      return (
                        <button
                          key={rightKey}
                          type="button"
                          role="switch"
                          disabled={!isAllowed}
                          aria-checked={isGranted}
                          aria-label={`${form.name} ${def?.label || rightKey}: ${!isAllowed ? "Not in your package" : (isGranted ? "Granted" : "Denied")}`}
                          onClick={() => toggleRight(form.id, rightKey)}
                          title={!isAllowed ? "Not in your package: Upgrade subscription to grant this permission" : undefined}
                          style={{
                            padding: "0.3rem 0.6rem",
                            borderRadius: "6px",
                            border: !isAllowed
                              ? "1px dashed var(--border)"
                              : isMod
                              ? "2px solid var(--warning)"
                              : isGranted
                              ? "1px solid var(--positive)"
                              : "1px solid var(--border)",
                            background: !isAllowed
                              ? "var(--surface-strong)"
                              : isGranted
                              ? "rgba(16, 185, 129, 0.12)"
                              : "var(--surface-strong)",
                            color: !isAllowed
                              ? "var(--muted)"
                              : isGranted
                              ? "var(--positive)"
                              : "var(--muted)",
                            cursor: isAllowed ? "pointer" : "not-allowed",
                            opacity: isAllowed ? 1 : 0.45,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "0.78rem",
                            fontWeight: isGranted ? 600 : 400,
                            transition: "all 0.12s ease"
                          }}
                        >
                          <span>{!isAllowed ? "🔒" : def?.icon}</span>
                          <span>{def?.label || rightKey}</span>
                          <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{!isAllowed ? "LOCK" : isGranted ? "✓" : "✕"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================== */
        /* OPTION C: GROUPED CATEGORIES ACCORDION VIEW               */
        /* (Forms grouped by domain with category-wide bulk actions) */
        /* ======================================================== */
        <div className="rights-accordion-stack" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {Object.entries(formsByCategory).map(([categoryName, catForms]) => {
            const isCatCollapsed = Boolean(collapsedCategories[categoryName]);
            const totalRightsInCat = catForms.reduce((sum, f) => sum + f.rights.length, 0);
            const grantedRightsInCat = catForms.reduce(
              (sum, f) => sum + f.rights.filter((r) => currentRights[makePermissionKey(f.id, r)]).length,
              0
            );

            return (
              <div
                key={categoryName}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  overflow: "hidden"
                }}
              >
                {/* CATEGORY HEADER */}
                <div
                  style={{
                    background: "var(--surface-strong)",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    borderBottom: isCatCollapsed ? "none" : "1px solid var(--border)"
                  }}
                  onClick={() =>
                    setCollapsedCategories((prev) => ({
                      ...prev,
                      [categoryName]: !prev[categoryName]
                    }))
                  }
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "0.85rem" }}>{isCatCollapsed ? "▶" : "▼"}</span>
                    <strong>{categoryName}</strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                      ({catForms.length} forms • {grantedRightsInCat}/{totalRightsInCat} Rights Active)
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn-sm ghost-btn"
                      onClick={() => {
                        setCurrentRights((prev) => {
                          const next = { ...prev };
                          catForms.forEach((f) => {
                            if (!isFormInPackage(f)) return; // Exclude non-package forms
                            f.rights.forEach((r) => {
                              next[makePermissionKey(f.id, r)] = true;
                            });
                          });
                          return next;
                        });
                      }}
                      style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem" }}
                    >
                      Grant All in {categoryName}
                    </button>
                    <button
                      type="button"
                      className="btn-sm ghost-btn"
                      onClick={() => {
                        setCurrentRights((prev) => {
                          const next = { ...prev };
                          catForms.forEach((f) => {
                            f.rights.forEach((r) => {
                              next[makePermissionKey(f.id, r)] = false;
                            });
                          });
                          return next;
                        });
                      }}
                      style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem" }}
                    >
                      Revoke All
                    </button>
                  </div>
                </div>

                {/* CATEGORY CONTENT */}
                {!isCatCollapsed && (
                  <div style={{ padding: "0.75rem 1rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "0.6rem" }}>
                    {catForms.map((form) => {
                      const isAllowed = isFormInPackage(form);
                      return (
                        <div
                          key={form.id}
                          style={{
                            background: "var(--surface-strong)",
                            border: !isAllowed ? "1px dashed var(--border)" : "1px solid var(--border)",
                            borderRadius: "6px",
                            padding: "0.5rem 0.75rem",
                            opacity: isAllowed ? 1 : 0.6
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                              {form.icon} {form.name}
                              {!isAllowed && (
                                <span style={{ fontSize: "0.65rem", color: "var(--danger)", background: "rgba(239,68,68,0.15)", padding: "1px 5px", borderRadius: "4px" }}>
                                  🔒 Not in your package
                                </span>
                              )}
                            </span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                            {form.rights.map((r) => {
                              const def = RIGHT_DEFINITIONS.find((rd) => rd.key === r);
                              const k = makePermissionKey(form.id, r);
                              const isGranted = Boolean(currentRights[k]);
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  role="switch"
                                  disabled={!isAllowed}
                                  aria-checked={isGranted}
                                  onClick={() => toggleRight(form.id, r)}
                                  title={!isAllowed ? "Not in your package" : undefined}
                                  style={{
                                    padding: "0.2rem 0.45rem",
                                    fontSize: "0.72rem",
                                    borderRadius: "4px",
                                    border: isGranted ? "1px solid var(--positive)" : "1px solid var(--border)",
                                    background: isGranted ? "rgba(16, 185, 129, 0.15)" : "var(--surface)",
                                    color: isGranted ? "var(--positive)" : "var(--muted)",
                                    cursor: isAllowed ? "pointer" : "not-allowed",
                                    opacity: isAllowed ? 1 : 0.45
                                  }}
                                >
                                  {def?.icon} {def?.label || r} {isGranted ? "✓" : ""}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. STICKY BOTTOM SAVE ACTION BAR */}
      <div
        className="rights-save-bar"
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 10,
          background: "var(--surface)",
          border: hasChanges ? "2px solid var(--warning)" : "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0.85rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.15)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {hasChanges ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>⚠️</span>
              <div>
                <strong style={{ fontSize: "0.9rem", color: "var(--warning)" }}>
                  {changes.length} Unsaved Permission Modification{changes.length === 1 ? "" : "s"}
                </strong>
                <p className="muted" style={{ margin: "2px 0 0 0", fontSize: "0.78rem" }}>
                  +{grantedChangesCount} granted, -{revokedChangesCount} revoked for {targetLabel}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "var(--positive)", fontSize: "1.1rem" }}>✓</span>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                All rights are saved and in sync for <strong>{targetLabel}</strong>.
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {hasChanges && (
            <button
              type="button"
              className="ghost-btn"
              onClick={handleResetToInitial}
              style={{ fontSize: "0.85rem", padding: "0.5rem 0.85rem" }}
            >
              Discard Changes
            </button>
          )}

          <button
            type="button"
            className="primary-btn"
            disabled={!hasChanges || isSaving}
            onClick={() => setShowSummaryModal(true)}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: hasChanges ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "none"
            }}
          >
            <span>{isSaving ? "Saving..." : "💾 Review & Save Rights"}</span>
            {hasChanges && (
              <span
                style={{
                  background: "rgba(255,255,255,0.25)",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontSize: "0.75rem",
                  fontWeight: 700
                }}
              >
                {changes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 5. SUMMARY OF CHANGED RIGHTS MODAL BEFORE SAVING */}
      {showSummaryModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem"
          }}
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            className="modal-card"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                  🛡️ Review Permission Modifications
                </h3>
                <p className="muted" style={{ margin: "3px 0 0 0", fontSize: "0.8rem" }}>
                  Please confirm the following modifications for <strong>{targetLabel}</strong> before applying.
                </p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowSummaryModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            {/* MODAL STATS STRIP */}
            <div
              style={{
                background: "var(--surface-strong)",
                padding: "0.75rem 1.25rem",
                display: "flex",
                gap: "1.5rem",
                fontSize: "0.85rem",
                borderBottom: "1px solid var(--border)"
              }}
            >
              <div>
                Total Changed: <strong>{changes.length}</strong>
              </div>
              <div style={{ color: "var(--positive)" }}>
                Newly Granted: <strong>+{grantedChangesCount}</strong>
              </div>
              <div style={{ color: "var(--danger)" }}>
                Revoked / Denied: <strong>-{revokedChangesCount}</strong>
              </div>
            </div>

            {/* MODAL DIFF LIST */}
            <div style={{ padding: "1rem 1.25rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {changes.length === 0 ? (
                <p className="muted" style={{ textAlign: "center", padding: "1rem" }}>No changes detected.</p>
              ) : (
                changes.map((change) => (
                  <div
                    key={change.key}
                    style={{
                      background: "var(--surface-strong)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "0.5rem 0.85rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>{change.formIcon}</span>
                      <div>
                        <strong style={{ fontSize: "0.85rem" }}>{change.formName}</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "block" }}>
                          {change.category}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>{change.rightLabel}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem" }}>
                        <span style={{ color: change.previousState ? "var(--positive)" : "var(--muted)", textDecoration: "line-through" }}>
                          {change.previousState ? "Granted" : "Denied"}
                        </span>
                        <span>➔</span>
                        <span
                          style={{
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: change.newState ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            color: change.newState ? "var(--positive)" : "var(--danger)"
                          }}
                        >
                          {change.newState ? "GRANTED" : "REVOKED"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* MODAL ACTIONS */}
            <div
              style={{
                padding: "0.85rem 1.25rem",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem"
              }}
            >
              <button
                type="button"
                className="ghost-btn"
                disabled={isSaving}
                onClick={() => setShowSummaryModal(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={isSaving}
                onClick={handleConfirmSave}
              >
                {isSaving ? "Saving..." : `Confirm & Apply ${changes.length} Changes`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. BONUS: COPY RIGHTS FROM ANOTHER ROLE OR USER MODAL */}
      {showCopyModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem"
          }}
          onClick={() => setShowCopyModal(false)}
        >
          <div
            className="modal-card"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "520px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>📋 Copy Rights Template</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowCopyModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
              Select a role template or existing staff member to duplicate their exact rights matrix into <strong>{targetLabel}</strong>.
            </p>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
              <span>Copy From Source:</span>
              <select
                value={copySource}
                onChange={(e) => setCopySource(e.target.value)}
                style={{
                  padding: "0.55rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--input-bg)",
                  color: "var(--text)",
                  fontSize: "0.9rem"
                }}
              >
                <optgroup label="Standard Role Templates">
                  <option value="manager">👔 Branch Manager Default Rights</option>
                  <option value="cashier">🏷️ Cashier Default Rights</option>
                </optgroup>
                {userList.length > 0 && (
                  <optgroup label="Staff Accounts">
                    {userList.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.full_name} ({u.role_name || u.roleName})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>

            <div className="alert info" style={{ fontSize: "0.8rem", margin: 0 }}>
              💡 Copied rights will be loaded into the workspace as unsaved changes so you can review and adjust them before clicking Save.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button type="button" className="ghost-btn" onClick={() => setShowCopyModal(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleCopyRights}>
                Apply & Review Copied Rights
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
