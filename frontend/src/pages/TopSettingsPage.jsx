import { useState, useEffect } from "react";
import { api } from "../api.js";
import { useLayout } from "../context/LayoutContext.jsx";

export function TopSettingsPage({ context }) {
  const { activeLayout, setLayout } = useLayout();
  const [layoutData, setLayoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingLayout, setPendingLayout] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await api.getAdminPlatformLayout();
      setLayoutData(data);
      if (data?.active_layout) {
        setLayout(data.active_layout);
      }
    } catch (err) {
      setError(err.message || "Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function handleSelectLayout(newLayout) {
    if (newLayout === activeLayout) return;
    setPendingLayout(newLayout);
  }

  async function handleConfirmSwitch() {
    if (!pendingLayout) return;
    setIsUpdating(true);
    setError("");
    setMessage("");

    try {
      const res = await api.updatePlatformLayout(pendingLayout);
      setLayout(pendingLayout);
      setLayoutData((prev) => ({
        ...prev,
        active_layout: pendingLayout,
        updated_at: new Date().toISOString(),
        changer_name: context?.session?.full_name || "You",
        changer_email: context?.session?.email || ""
      }));
      setMessage(res.message || `Platform layout updated to ${pendingLayout === "modern_compact" ? "Modern Compact" : "Classic"}.`);
      setPendingLayout(null);
    } catch (err) {
      setError(err.message || "Failed to update platform layout");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="top-settings-page">
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>⚙️</span> Platform Settings & Website Layout
          </h2>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            Configure global platform-wide parameters and UI architecture for all companies, branches, and portals.
          </p>
        </div>
      </div>

      {message && (
        <div className="alert success" style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>✅</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="alert error" style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Website Layout Section */}
      <div className="section-card" style={{ marginBottom: "2rem" }}>
        <div className="section-card-header" style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🎨</span> Global Website Layout Architecture
          </h3>
          <p className="muted" style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem" }}>
            Switch the active UI layout for the ENTIRE web application (all companies, all branches, all users) with a single click. End users cannot override this server-side policy.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem auto" }} />
            <p className="muted">Fetching platform settings...</p>
          </div>
        ) : (
          <div>
            <div className="layout-options-grid">
              {/* Option 1: Classic Layout */}
              <div
                className={`layout-card ${activeLayout === "classic" ? "active-layout" : "selectable-layout"}`}
                onClick={() => handleSelectLayout("classic")}
              >
                <div className="layout-card-badge-row">
                  {activeLayout === "classic" ? (
                    <span className="badge badge-success" style={{ padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
                      ● ACTIVE PLATFORM LAYOUT
                    </span>
                  ) : (
                    <span className="badge badge-neutral" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                      Click to Activate
                    </span>
                  )}
                </div>

                {/* Visual Preview SVG: Classic Layout */}
                <div className="layout-thumbnail">
                  <svg viewBox="0 0 320 180" width="100%" height="160" xmlns="http://www.w3.org/2000/svg">
                    <rect width="320" height="180" rx="8" fill="#1e293b" />
                    {/* Classic 260px Sidebar */}
                    <rect x="0" y="0" width="75" height="180" rx="8" fill="#0f172a" />
                    <rect x="10" y="15" width="55" height="14" rx="3" fill="#38bdf8" opacity="0.8" />
                    <rect x="10" y="40" width="55" height="9" rx="2" fill="#64748b" />
                    <rect x="10" y="55" width="55" height="9" rx="2" fill="#64748b" />
                    <rect x="10" y="70" width="55" height="9" rx="2" fill="#38bdf8" />
                    <rect x="10" y="85" width="55" height="9" rx="2" fill="#64748b" />
                    <rect x="10" y="100" width="55" height="9" rx="2" fill="#64748b" />
                    <rect x="10" y="150" width="55" height="14" rx="3" fill="#334155" />
                    {/* Row 1 Header */}
                    <rect x="85" y="10" width="225" height="24" rx="4" fill="#0f172a" />
                    <rect x="95" y="17" width="60" height="10" rx="2" fill="#94a3b8" />
                    <circle cx="280" cy="22" r="6" fill="#38bdf8" />
                    <circle cx="298" cy="22" r="7" fill="#64748b" />
                    {/* Row 2 Breadcrumb */}
                    <rect x="85" y="40" width="225" height="14" rx="3" fill="#1e293b" stroke="#334155" />
                    <rect x="95" y="44" width="45" height="6" rx="2" fill="#64748b" />
                    {/* Content Cards */}
                    <rect x="85" y="60" width="108" height="50" rx="6" fill="#0f172a" stroke="#334155" />
                    <rect x="201" y="60" width="109" height="50" rx="6" fill="#0f172a" stroke="#334155" />
                    {/* Table Area */}
                    <rect x="85" y="118" width="225" height="52" rx="6" fill="#0f172a" stroke="#334155" />
                    <rect x="95" y="125" width="205" height="10" rx="2" fill="#334155" />
                    <rect x="95" y="140" width="205" height="8" rx="2" fill="#1e293b" />
                    <rect x="95" y="152" width="205" height="8" rx="2" fill="#1e293b" />
                  </svg>
                </div>

                <div className="layout-card-info">
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem" }}>Classic Layout</h4>
                  <p className="muted" style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.45 }}>
                    Traditional spacious UI with full 260px expanded sidebar, generous spacing, and standard card padding.
                  </p>
                  <ul className="layout-specs-list">
                    <li>✓ 260px full width navigation</li>
                    <li>✓ Traditional card margins & shadows</li>
                    <li>✓ Standard height table rows (~52px)</li>
                    <li>✓ In-page sub-navigation tabs</li>
                  </ul>
                </div>

                <button
                  type="button"
                  className={activeLayout === "classic" ? "primary-btn active-btn" : "secondary-btn"}
                  style={{ width: "100%", marginTop: "1rem" }}
                  onClick={() => handleSelectLayout("classic")}
                  disabled={activeLayout === "classic"}
                >
                  {activeLayout === "classic" ? "✓ Currently Active" : "Apply Classic Layout"}
                </button>
              </div>

              {/* Option 2: Modern Compact Layout */}
              <div
                className={`layout-card ${activeLayout === "modern_compact" ? "active-layout" : "selectable-layout"}`}
                onClick={() => handleSelectLayout("modern_compact")}
              >
                <div className="layout-card-badge-row">
                  {activeLayout === "modern_compact" ? (
                    <span className="badge badge-success" style={{ padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
                      ● ACTIVE PLATFORM LAYOUT
                    </span>
                  ) : (
                    <span className="badge badge-neutral" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                      Click to Activate
                    </span>
                  )}
                </div>

                {/* Visual Preview SVG: Modern Compact Layout */}
                <div className="layout-thumbnail">
                  <svg viewBox="0 0 320 180" width="100%" height="160" xmlns="http://www.w3.org/2000/svg">
                    <rect width="320" height="180" rx="8" fill="#090d16" />
                    {/* Compact 240px Sidebar */}
                    <rect x="0" y="0" width="60" height="180" rx="8" fill="#111827" stroke="#1f293d" />
                    <rect x="8" y="12" width="44" height="12" rx="3" fill="#0ea5e9" />
                    {/* Compact nav links */}
                    <rect x="8" y="32" width="44" height="7" rx="2" fill="#64748b" />
                    <rect x="8" y="43" width="44" height="7" rx="2" fill="#0ea5e9" />
                    {/* Nested sub-menu item */}
                    <rect x="14" y="53" width="38" height="6" rx="2" fill="#38bdf8" opacity="0.9" />
                    <rect x="14" y="62" width="38" height="6" rx="2" fill="#475569" />
                    <rect x="8" y="73" width="44" height="7" rx="2" fill="#64748b" />
                    <rect x="8" y="84" width="44" height="7" rx="2" fill="#64748b" />
                    <rect x="8" y="95" width="44" height="7" rx="2" fill="#64748b" />
                    <rect x="8" y="106" width="44" height="7" rx="2" fill="#64748b" />
                    <rect x="8" y="152" width="44" height="14" rx="4" fill="#1f293d" />
                    {/* Row 1 Header (52px equivalent, slim) */}
                    <rect x="68" y="8" width="244" height="20" rx="4" fill="#111827" stroke="#1f293d" />
                    <rect x="76" y="14" width="70" height="8" rx="2" fill="#e2e8f0" />
                    <circle cx="286" cy="18" r="5" fill="#0ea5e9" />
                    <circle cx="300" cy="18" r="6" fill="#38bdf8" />
                    {/* Row 2 Breadcrumb (34px equivalent, slim) */}
                    <rect x="68" y="32" width="244" height="12" rx="2" fill="#090d16" />
                    <rect x="76" y="35" width="50" height="5" rx="1.5" fill="#0ea5e9" opacity="0.8" />
                    {/* High Density Content Grid */}
                    <rect x="68" y="48" width="58" height="34" rx="4" fill="#111827" stroke="#1f293d" />
                    <rect x="130" y="48" width="58" height="34" rx="4" fill="#111827" stroke="#1f293d" />
                    <rect x="192" y="48" width="58" height="34" rx="4" fill="#111827" stroke="#1f293d" />
                    <rect x="254" y="48" width="58" height="34" rx="4" fill="#111827" stroke="#1f293d" />
                    {/* High Density Table with Sticky Header */}
                    <rect x="68" y="88" width="244" height="82" rx="5" fill="#111827" stroke="#1f293d" />
                    <rect x="72" y="92" width="236" height="12" rx="2" fill="#1e293b" />
                    <rect x="72" y="107" width="236" height="8" rx="1.5" fill="#090d16" />
                    <rect x="72" y="118" width="236" height="8" rx="1.5" fill="#111827" />
                    <rect x="72" y="129" width="236" height="8" rx="1.5" fill="#090d16" />
                    <rect x="72" y="140" width="236" height="8" rx="1.5" fill="#111827" />
                    <rect x="72" y="151" width="236" height="8" rx="1.5" fill="#090d16" />
                    <rect x="72" y="162" width="236" height="8" rx="1.5" fill="#111827" />
                  </svg>
                </div>

                <div className="layout-card-info">
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem" }}>Modern Compact</h4>
                  <p className="muted" style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.45 }}>
                    High-density modern UI designed for maximum information visibility without scrolling or feeling cramped.
                  </p>
                  <ul className="layout-specs-list">
                    <li>✓ 240px / 68px compact sidebar with inline accordions</li>
                    <li>✓ 4px base density grid & subtle 1px borders</li>
                    <li>✓ Compact sticky-header tables with uniform action buttons</li>
                    <li>✓ Zero horizontal overflow guaranteed at all screen sizes</li>
                  </ul>
                </div>

                <button
                  type="button"
                  className={activeLayout === "modern_compact" ? "primary-btn active-btn" : "secondary-btn"}
                  style={{ width: "100%", marginTop: "1rem" }}
                  onClick={() => handleSelectLayout("modern_compact")}
                  disabled={activeLayout === "modern_compact"}
                >
                  {activeLayout === "modern_compact" ? "✓ Currently Active" : "Apply Modern Compact"}
                </button>
              </div>
            </div>

            {/* Layout Governance & Audit Trail Metadata */}
            <div className="layout-metadata-box" style={{ marginTop: "1.75rem", padding: "1rem 1.25rem", borderRadius: "8px", background: "var(--surface-subtle, rgba(0,0,0,0.03))", border: "1px solid var(--border-color, #e2e8f0)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <span className="small muted" style={{ display: "block", textTransform: "uppercase", fontSize: "0.72rem", fontWeight: 700 }}>
                    Global Server Configuration
                  </span>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "2px" }}>
                    Active Layout: <span style={{ color: "var(--primary, #0ea5e9)" }}>{activeLayout === "modern_compact" ? "Modern Compact (layout-modern-compact)" : "Classic (layout-classic)"}</span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span className="small muted" style={{ display: "block", fontSize: "0.75rem" }}>
                    Last Configured By: {layoutData?.changer_name || "Platform Setup"} {layoutData?.changer_email ? `(${layoutData.changer_email})` : ""}
                  </span>
                  <span className="small muted" style={{ display: "block", fontSize: "0.75rem" }}>
                    Updated At: {layoutData?.updated_at ? new Date(layoutData.updated_at).toLocaleString() : "Initial deployment"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {pendingLayout && (
        <div className="modal-backdrop" onClick={() => !isUpdating && setPendingLayout(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <h3>Confirm Global Layout Switch</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => !isUpdating && setPendingLayout(null)}
                disabled={isUpdating}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: "1.5rem" }}>
              <div style={{ textAlign: "center", marginBottom: "1rem", fontSize: "2.5rem" }}>
                {pendingLayout === "modern_compact" ? "⚡" : "📱"}
              </div>
              <h4 style={{ textAlign: "center", margin: "0 0 0.75rem 0" }}>
                Apply {pendingLayout === "modern_compact" ? "Modern Compact" : "Classic"} layout for all users?
              </h4>
              <p className="muted" style={{ fontSize: "0.9rem", lineHeight: 1.5, margin: 0 }}>
                This is a global server-level setting that updates the layout for <strong>all companies, branches, and user portals</strong> across the platform.
              </p>
              <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "6px", background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.2)", fontSize: "0.82rem" }}>
                ℹ️ <strong>Note:</strong> Active user sessions will pick up the change immediately upon navigation or refresh. No user will be logged out and no in-progress work will be interrupted.
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setPendingLayout(null)}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmSwitch}
                disabled={isUpdating}
              >
                {isUpdating ? "Applying Global Layout..." : "Confirm & Apply Layout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
