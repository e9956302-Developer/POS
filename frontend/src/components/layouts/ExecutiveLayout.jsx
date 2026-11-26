import React, { useState, useEffect } from "react";
import { ThemeSwitcher } from "../ThemeSwitcher.jsx";
import { LanguageSwitcher } from "../LanguageSwitcher.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

export function ExecutiveLayout({
  session = {},
  companyName = "DigitalMarkaz360",
  companyCode = "",
  companyLogo = null,
  isTopAdmin = false,
  isCompanyAdmin = false,
  isBranchPortal = false,
  canSwitchBranch = false,
  currentBranchId = null,
  currentBranchName = "",
  branches = [],
  handleSwitchBranch = () => {},
  activeTab = "dashboard",
  setActiveTab = () => {},
  activePurchaseSub = "new",
  setError = () => {},
  tabs = [],
  pageBreadcrumb = null,
  theme = "dark",
  hasThemeAccess = true,
  hasLanguageAccess = true,
  handleCycleTheme = () => {},
  handleSelectTheme = () => {},
  THEMES = [],
  notifications = [],
  unreadNotifCount = 0,
  notifDropdownOpen = false,
  setNotifDropdownOpen = () => {},
  notifBellRef = null,
  handleMarkAllRead = () => {},
  handleMarkNotifRead = () => {},
  userDropdownOpen = false,
  setUserDropdownOpen = () => {},
  userMenuRef = null,
  handleOpenEditProfile = () => {},
  setShowMfaModal = () => {},
  setShowLogoutConfirm = () => {},
  availedPackages = [],
  children
}) {
  const { isRtl, t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({ reports: false });
  const [manuallyClosedGroups, setManuallyClosedGroups] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [railOverlayOpen, setRailOverlayOpen] = useState(false);
  const [railFlyoutTab, setRailFlyoutTab] = useState(null);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 100 });

  useEffect(() => {
    setManuallyClosedGroups({});
  }, [activeTab]);

  const isSalesPage = activeTab === "sales" || activeTab.startsWith("sales_");
  const isPurchaseCounter = activeTab === "purchases_new" || (activeTab === "purchases" && activePurchaseSub !== "history");
  const isSaleCounter = activeTab === "sales_new" || activeTab === "sales_checkout" || activeTab === "sales";
  const isCounter = isPurchaseCounter || isSaleCounter;
  const isRail = isCounter && !railOverlayOpen;

  useEffect(() => {
    if (!isCounter) {
      setRailOverlayOpen(false);
      setRailFlyoutTab(null);
    }
  }, [isCounter]);

  const safeTabs = Array.isArray(tabs) ? tabs : [];
  const safeBranches = Array.isArray(branches) ? branches : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  // Active top tab and sub-items detection
  const activeParentTab = safeTabs.find(
    (t) => t.key === activeTab || (t.subItems && t.subItems.some((s) => s.key === activeTab))
  );

  const userName = session?.full_name || session?.fullName || "User";
  const userEmail = session?.email || "";
  const userRole = session?.role_name || session?.roleName || session?.role || (isTopAdmin ? "Top Admin" : "Staff");
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className={`executive-layout-root ${isCollapsed || isCounter ? "sidebar-collapsed" : ""} ${isCounter ? "pos-counter-active" : ""}`}>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="executive-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {railOverlayOpen && (
        <div
          className="rail-overlay-backdrop"
          onClick={() => setRailOverlayOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1040, background: "rgba(0,0,0,0.4)" }}
        />
      )}

      {/* Floating Obsidian & Gold Sidebar */}
      <aside className={`executive-sidebar ${isCollapsed || isRail ? "collapsed" : ""} ${isRail ? "is-rail" : ""} ${railOverlayOpen ? "rail-overlay" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="executive-sidebar-inner">
          {/* Brand Header with Gold Accent */}
          <div className="executive-sidebar-header">
            <div className="executive-brand-box">
              <span className="executive-brand-icon">💎</span>
              {!isCollapsed && !isRail && (
                <div className="executive-brand-text">
                  <span className="executive-brand-title">POS Executive</span>
                  <span className="executive-brand-badge">LUXURY</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="executive-collapse-toggle"
              onClick={() => {
                if (isCounter) {
                  setRailOverlayOpen(!railOverlayOpen);
                } else {
                  setIsCollapsed(!isCollapsed);
                }
              }}
              title={isRail ? "Expand Sidebar" : (isCollapsed ? "Expand Sidebar" : "Collapse Sidebar")}
              aria-label="Toggle executive sidebar"
            >
              {isRail ? "❯" : (isCollapsed ? "❯" : "❮")}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="executive-nav-menu">
            {safeTabs.map((tab) => {
              if (tab.subItems && tab.subItems.length > 0) {
                const isGroupActive =
                  activeTab === tab.key ||
                  activeTab.startsWith(`${tab.key}_`) ||
                  tab.subItems.some((s) => s.key === activeTab);
                const defaultSubKey = tab.subItems[0].key;
                const isManualClosed = Boolean(manuallyClosedGroups[tab.key]);
                // Sub menu items are ONLY shown when related page is active, otherwise show main menu items only
                const isGroupOpen = Boolean(isGroupActive && !isManualClosed);

                return (
                  <div key={tab.key} className={`executive-nav-group ${isGroupActive ? "group-active" : ""}`}>
                    <button
                      type="button"
                      className={`executive-nav-item executive-nav-parent ${isGroupActive ? "active" : ""}`}
                      aria-expanded={Boolean(isGroupOpen)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                          e.preventDefault();
                          setError("");
                          if (isRail) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setFlyoutPosition({ top: Math.max(10, Math.min(window.innerHeight - 200, rect.top)) });
                            setRailFlyoutTab(railFlyoutTab === tab.key ? null : tab.key);
                            return;
                          }
                          if (isCollapsed) {
                            setIsCollapsed(false);
                          }
                          if (!isGroupActive) {
                            setManuallyClosedGroups({});
                            setActiveTab(defaultSubKey);
                            setMobileMenuOpen(false);
                          } else {
                            setManuallyClosedGroups((prev) => ({ ...prev, [tab.key]: !isManualClosed }));
                          }
                        }
                      }}
                      onClick={(e) => {
                        setError("");
                        if (isRail) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setFlyoutPosition({ top: Math.max(10, Math.min(window.innerHeight - 200, rect.top)) });
                          setRailFlyoutTab(railFlyoutTab === tab.key ? null : tab.key);
                          return;
                        }
                        if (isCollapsed) {
                          setIsCollapsed(false);
                        }
                        if (!isGroupActive) {
                          setManuallyClosedGroups({});
                          setActiveTab(defaultSubKey);
                          setMobileMenuOpen(false);
                        } else {
                          setManuallyClosedGroups((prev) => ({ ...prev, [tab.key]: !isManualClosed }));
                        }
                      }}
                      title={tab.label}
                    >
                      <span className="executive-nav-icon">{tab.icon}</span>
                      {!isCollapsed && !isRail && (
                        <>
                          <span className="executive-nav-label">{tab.label}</span>
                          <span
                            className="executive-nav-arrow"
                            style={{
                              transform: isGroupOpen ? "rotate(90deg)" : (isRtl ? "rotate(180deg)" : "rotate(0deg)")
                            }}
                          >
                            ›
                          </span>
                        </>
                      )}
                    </button>

                    {/* Accordion Sub-items */}
                    {isGroupOpen && !isCollapsed && !isRail && (
                      <div className="executive-sub-nav-list">
                        {tab.subItems.map((sub) => {
                          const isSubActive =
                            activeTab === sub.key ||
                            (activeTab === tab.key && sub.key === defaultSubKey);
                          return (
                            <button
                              key={sub.key}
                              type="button"
                              className={`executive-sub-nav-item ${isSubActive ? "active" : ""}`}
                              onClick={() => {
                                setError("");
                                setActiveTab(sub.key);
                                setMobileMenuOpen(false);
                              }}
                              title={sub.label}
                            >
                              <span className="executive-sub-nav-bullet" />
                              <span className="executive-sub-nav-icon">{sub.icon}</span>
                              <span className="executive-sub-nav-label">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={tab.key}
                  className={`executive-nav-item ${tab.key === activeTab ? "active" : ""}`}
                  onClick={() => {
                    setError("");
                    setManuallyClosedGroups({});
                    setRailFlyoutTab(null);
                    setActiveTab(tab.key);
                    setMobileMenuOpen(false);
                  }}
                  title={tab.label}
                  type="button"
                >
                  <span className="executive-nav-icon">{tab.icon}</span>
                  {!isCollapsed && !isRail && <span className="executive-nav-label">{tab.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Rail Flyout Sub-menu Panel */}
          {isRail && railFlyoutTab && (() => {
            const tabObj = safeTabs.find((t) => t.key === railFlyoutTab);
            if (!tabObj || !tabObj.subItems) return null;
            return (
              <>
                <div
                  className="rail-flyout-backdrop"
                  onClick={() => setRailFlyoutTab(null)}
                  style={{ position: "fixed", inset: 0, zIndex: 1040 }}
                />
                <div
                  className="sidebar-rail-flyout"
                  style={{
                    position: "fixed",
                    left: isRtl ? "auto" : "72px",
                    right: isRtl ? "72px" : "auto",
                    top: `${flyoutPosition.top}px`,
                    zIndex: 1050,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    padding: "6px",
                    minWidth: "220px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, padding: "4px 8px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}>
                    {tabObj.icon} {tabObj.label}
                  </div>
                  {tabObj.subItems.map((sub) => {
                    const isSubActive =
                      activeTab === sub.key ||
                      (activeTab === tabObj.key && sub.key === tabObj.subItems[0].key);
                    return (
                      <button
                        key={sub.key}
                        type="button"
                        className={`executive-sub-nav-item ${isSubActive ? "active" : ""}`}
                        onClick={() => {
                          setError("");
                          setActiveTab(sub.key);
                          setRailFlyoutTab(null);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          fontSize: "0.82rem",
                          fontWeight: isSubActive ? 700 : 500,
                          background: isSubActive ? "var(--primary-subtle, rgba(56, 189, 248, 0.15))" : "transparent",
                          color: isSubActive ? "var(--primary, #38bdf8)" : "var(--text)",
                          border: "none",
                          cursor: "pointer",
                          textAlign: isRtl ? "right" : "left"
                        }}
                      >
                        <span className="executive-sub-nav-icon">{sub.icon}</span>
                        <span className="executive-sub-nav-label">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* Sidebar Footer */}
          <div className="executive-sidebar-footer">
            {!isCollapsed ? (
              <div className="executive-footer-expanded">
                {!isSalesPage && (
                  <>
                    <div className="executive-footer-theme" style={{ marginBottom: "0.5rem" }}>
                      {hasLanguageAccess && <LanguageSwitcher hasAccess={hasLanguageAccess} />}
                    </div>
                    <div className="executive-footer-theme">
                      <ThemeSwitcher
                        currentTheme={theme}
                        onSelectTheme={handleSelectTheme}
                        isLocked={!hasThemeAccess}
                      />
                    </div>

                    {availedPackages.length > 0 && (
                      <div className="executive-package-chip" title={availedPackages.map((p) => p.name).join(", ")}>
                        <span className="pkg-icon">👑</span>
                        <span className="pkg-name">{availedPackages[0]?.name}</span>
                        {availedPackages.length > 1 && <span className="pkg-more">+{availedPackages.length - 1}</span>}
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  className="executive-logout-btn"
                  onClick={() => setShowLogoutConfirm(true)}
                  title="Logout"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="executive-footer-collapsed">
                {!isSalesPage && (
                  <>
                    {hasLanguageAccess && <LanguageSwitcher compact />}
                    <ThemeSwitcher
                      currentTheme={theme}
                      onSelectTheme={handleSelectTheme}
                      collapsed
                      isLocked={!hasThemeAccess}
                    />
                  </>
                )}
                <button
                  type="button"
                  className="executive-logout-btn-icon"
                  onClick={() => setShowLogoutConfirm(true)}
                  title={`Logout (${userName})`}
                  aria-label="Logout"
                >
                  🚪
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="executive-main-viewport">
        {/* ROW 1: Floating Glass Header */}
        <header className="executive-header">
          <div className="executive-header-left">
            <button
              type="button"
              className="executive-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Open Navigation"
              aria-label="Open menu"
            >
              ☰
            </button>

            <div className="executive-identity-cluster">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="executive-company-logo" />
              ) : (
                <div className="executive-company-badge-icon">
                  {isTopAdmin ? "👑" : "🏢"}
                </div>
              )}

              <div className="executive-identity-meta">
                <div className="executive-identity-title-row">
                  <span className="executive-company-title" title={companyName}>
                    {companyName}
                  </span>
                  {companyCode && (
                    <span className="executive-code-pill" title={`Company Code: ${companyCode}`}>
                      {companyCode}
                    </span>
                  )}
                  {!isTopAdmin && (
                    <span className="executive-active-pill" title="Subscription Status: Active">
                      ● {t("common.active", "Active")}
                    </span>
                  )}
                </div>

                {isBranchPortal && (
                  <div className="executive-branch-row">
                    <span className="executive-branch-tag">{t("common.branch", "Branch")}:</span>
                    {canSwitchBranch ? (
                      <select
                        className="executive-branch-select"
                        value={currentBranchId || ""}
                        onChange={(e) => handleSwitchBranch(e.target.value)}
                        title={`Active Branch: ${currentBranchName}`}
                      >
                        {safeBranches.map((b) => {
                          const isBranchExp =
                            b.is_expired ||
                            b.isExpired ||
                            b.effective_status === "expired" ||
                            b.subscription_status === "expired";
                          return (
                            <option
                              key={b.id}
                              value={b.id}
                              disabled={isBranchExp}
                              style={isBranchExp ? { color: "#ef4444", opacity: 0.6 } : {}}
                            >
                              {b.name} {b.code ? `(${b.code})` : ""}{isBranchExp ? " [Expired]" : ""}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <span className="executive-branch-static">{currentBranchName}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="executive-header-right">
            {/* Header Language Switcher */}
            {hasLanguageAccess && <LanguageSwitcher />}

            {/* Theme Toggle Button */}
            <button
              type="button"
              className="executive-icon-btn executive-theme-btn"
              onClick={handleCycleTheme}
              style={{ padding: "0 8px", width: "auto", fontSize: "0.8rem", color: "#fbbf24" }}
              title={hasThemeAccess ? `Theme: ${THEMES.find((t) => t.key === theme)?.name}` : "Theme selection locked"}
            >
              {hasThemeAccess ? (THEMES.find((t) => t.key === theme)?.label || "🎨 Theme") : "🔒 Theme"}
            </button>

            {/* Notifications Dropdown */}
            {!isTopAdmin && (
              <div className="executive-dropdown-anchor" ref={notifBellRef}>
                <button
                  type="button"
                  className={`executive-icon-btn ${unreadNotifCount > 0 ? "has-unread" : ""}`}
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <span className="executive-bell-icon">🔔</span>
                  {unreadNotifCount > 0 && (
                    <span className="executive-notif-pill">
                      {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="executive-notif-dropdown">
                    <div className="executive-notif-dropdown-header">
                      <h4>Notifications</h4>
                      {unreadNotifCount > 0 && (
                        <button
                          type="button"
                          className="executive-mark-read-btn"
                          onClick={handleMarkAllRead}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="executive-notif-list">
                      {safeNotifications.length > 0 ? (
                        safeNotifications.slice(0, 15).map((n) => (
                          <div
                            key={n.id}
                            className={`executive-notif-item ${!n.is_read && !n.isRead ? "unread" : ""}`}
                            onClick={() => handleMarkNotifRead(n)}
                          >
                            <div className="executive-notif-title">{n.title}</div>
                            <div className="executive-notif-message">{n.message}</div>
                            <div className="executive-notif-time">
                              {n.due_date ? `Due: ${n.due_date}` : n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="executive-notif-empty">No notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile Menu */}
            <div className="executive-dropdown-anchor" ref={userMenuRef}>
              <button
                type="button"
                className="executive-user-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                title="User menu"
              >
                <div className="executive-user-avatar">
                  {userInitial}
                </div>
                <div className="executive-user-meta">
                  <span className="executive-user-name">
                    {userName}
                  </span>
                  <span className="executive-user-role">
                    {userRole}
                  </span>
                </div>
                <span className="executive-dropdown-caret">▾</span>
              </button>

              {userDropdownOpen && (
                <div className="executive-user-dropdown">
                  <div className="executive-user-dropdown-header">
                    <div className="name">{userName}</div>
                    <div className="email">{userEmail}</div>
                    <div className="role" style={{ fontSize: "0.7rem", color: "#fbbf24", marginTop: "2px" }}>{userRole}</div>
                    {session?.business_name && (
                      <div className="biz" style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                        🏢 {session.business_name}
                      </div>
                    )}
                  </div>
                  <div className="executive-user-dropdown-body">
                    <button
                      type="button"
                      className="executive-dropdown-item"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setActiveTab("dashboard");
                      }}
                    >
                      <span>📊</span>
                      <span>Dashboard Overview</span>
                    </button>
                    <button
                      type="button"
                      className="executive-dropdown-item"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleOpenEditProfile();
                      }}
                    >
                      <span>👤</span>
                      <span>Edit Profile</span>
                    </button>
                    <button
                      type="button"
                      className="executive-dropdown-item"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setShowMfaModal(true);
                      }}
                    >
                      <span>🛡️</span>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
                        <span>Two-Factor Auth</span>
                        <span
                          className={`badge ${session?.mfa_enabled || session?.mfaEnabled ? "badge-success" : "badge-neutral"}`}
                          style={{ fontSize: "0.68rem", padding: "1px 6px" }}
                        >
                          {session?.mfa_enabled || session?.mfaEnabled ? "Active" : "Setup"}
                        </span>
                      </span>
                    </button>
                    <div className="executive-dropdown-divider" />
                    <button
                      type="button"
                      className="executive-dropdown-item logout"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ROW 2: Breadcrumb & Context Bar */}
        <div className="executive-row2-bar">
          <div className="executive-breadcrumb-trail">
            <span className="executive-breadcrumb-home">💎</span>
            {pageBreadcrumb && typeof pageBreadcrumb === "object" ? (
              pageBreadcrumb.isNested ? (
                <>
                  <span className="executive-breadcrumb-parent">
                    {pageBreadcrumb.parentIcon && <span style={{ marginRight: "4px" }}>{pageBreadcrumb.parentIcon}</span>}
                    <span>{pageBreadcrumb.parent}</span>
                  </span>
                  <span className="executive-breadcrumb-sep">/</span>
                  <span className="executive-breadcrumb-active">
                    {pageBreadcrumb.currentIcon && <span style={{ marginRight: "4px" }}>{pageBreadcrumb.currentIcon}</span>}
                    <span>{pageBreadcrumb.current}</span>
                  </span>
                </>
              ) : (
                <span className="executive-breadcrumb-active">
                  {pageBreadcrumb.currentIcon && <span style={{ marginRight: "4px" }}>{pageBreadcrumb.currentIcon}</span>}
                  <span>{pageBreadcrumb.current || activeTab}</span>
                </span>
              )
            ) : (
              <span className="executive-breadcrumb-active">
                {String(pageBreadcrumb || activeTab || "Dashboard")}
              </span>
            )}
          </div>

          {activeParentTab && activeParentTab.subItems && activeParentTab.subItems.length > 0 && (
            <div className="executive-subnav-strip">
              {activeParentTab.subItems.map((sub) => {
                const isSubActive = activeTab === sub.key;
                return (
                  <button
                    key={sub.key}
                    type="button"
                    className={`executive-strip-btn ${isSubActive ? "active" : ""}`}
                    onClick={() => {
                      setError("");
                      setActiveTab(sub.key);
                    }}
                  >
                    <span>{sub.icon}</span>
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Container */}
        <main className="executive-content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
