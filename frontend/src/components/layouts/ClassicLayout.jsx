import React, { useState, useEffect } from "react";
import { ThemeSwitcher } from "../ThemeSwitcher.jsx";
import { LanguageSwitcher } from "../LanguageSwitcher.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

export function ClassicLayout({
  session,
  companyName,
  companyCode,
  companyLogo,
  isTopAdmin,
  isCompanyAdmin,
  isBranchPortal,
  canSwitchBranch,
  currentBranchId,
  currentBranchName,
  branches,
  handleSwitchBranch,
  activeTab,
  setActiveTab,
  setError,
  tabs,
  pageBreadcrumb,
  theme,
  hasThemeAccess,
  hasLanguageAccess = true,
  handleCycleTheme,
  handleSelectTheme,
  THEMES,
  notifications,
  unreadNotifCount,
  notifDropdownOpen,
  setNotifDropdownOpen,
  notifBellRef,
  handleMarkAllRead,
  handleMarkNotifRead,
  userDropdownOpen,
  setUserDropdownOpen,
  userMenuRef,
  handleOpenEditProfile,
  setShowMfaModal,
  setShowLogoutConfirm,
  availedPackages = [],
  children
}) {
  const { isRtl, t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [purchaseMenuOpen, setPurchaseMenuOpen] = useState(false);
  const [saleMenuOpen, setSaleMenuOpen] = useState(false);
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(false);
  const [partiesMenuOpen, setPartiesMenuOpen] = useState(false);
  const [expensesMenuOpen, setExpensesMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(true);
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(true);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSalesPage = activeTab === "sales" || activeTab.startsWith("sales_");

  const isPurchaseActive = activeTab === "purchases" || activeTab.startsWith("purchases_");
  const isSaleActive = activeTab === "sales" || activeTab.startsWith("sales_");
  const isInventoryActive = activeTab === "inventory" || activeTab.startsWith("inventory_");
  const isPartiesActive = activeTab === "parties" || activeTab.startsWith("parties_");
  const isExpensesActive = activeTab === "expenses" || activeTab.startsWith("expenses_");
  const isAdminActive = activeTab === "admin" || activeTab.startsWith("admin_");
  const isEmployeeActive = activeTab === "employees" || activeTab.startsWith("employees_");
  const isReportActive = activeTab === "reports" || activeTab.startsWith("reports_");

  function toggleSidebar() {
    setIsCollapsed(!isCollapsed);
  }

  return (
    <div className={`app-shell layout-classic ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Mobile Sticky Topbar */}
      <div className="mobile-topbar">
        <button
          className="menu-toggle-btn"
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <div className="mobile-brand">
          <img src="/logo.png" alt="DigitalMarkaz360" className="mobile-logo-img" />
          <span>{session.business_name || session.businessName || (isTopAdmin ? "SaaS Top Admin" : "DigitalMarkaz360")}</span>
        </div>
        {hasLanguageAccess && <LanguageSwitcher compact />}
        <button
          className="ghost-btn"
          type="button"
          onClick={handleCycleTheme}
          title={hasThemeAccess ? "Cycle theme" : "Theme selection locked (Upgrade package)"}
        >
          {hasThemeAccess ? (THEMES.find((t) => t.key === theme)?.label || "🎨 Theme") : "🔒 Theme"}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}>
        {/* Frozen Header: Logo, Website Name, Tagline & Collapse Toggle */}
        <div className="sidebar-header">
          <div className="brand-lockup">
            <img src="/logo.png" alt="DigitalMarkaz360" className="sidebar-logo-img" title="DigitalMarkaz360" />
            <div className="brand-text">
              <h1>DigitalMarkaz360</h1>
              <p className="sidebar-tagline">Poora Karobar, Ek Markaz</p>
            </div>
          </div>
          <button
            className="collapse-toggle-btn"
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand sidebar (Wide view)" : "Collapse sidebar (Icon view)"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? "»" : "«"}
          </button>
        </div>

        {/* Scrollable Body: Everything else (Nav Items + Footer) is scrollable */}
        <div className="sidebar-scrollable-body">
          <nav className="nav-list">
            {tabs.map((tab) => {
              const isTabActive =
                tab.key === activeTab ||
                (tab.key === "purchases" && isPurchaseActive) ||
                (tab.key === "sales" && isSaleActive) ||
                (tab.key === "inventory" && isInventoryActive) ||
                (tab.key === "parties" && isPartiesActive) ||
                (tab.key === "expenses" && isExpensesActive) ||
                (tab.key === "admin" && isAdminActive) ||
                (tab.key === "employees" && isEmployeeActive) ||
                (tab.key === "reports" && isReportActive);

              if (tab.subItems) {
                const isGroupOpen =
                  tab.key === "purchases"
                    ? purchaseMenuOpen
                    : tab.key === "sales"
                    ? saleMenuOpen
                    : tab.key === "inventory"
                    ? inventoryMenuOpen
                    : tab.key === "parties"
                    ? partiesMenuOpen
                    : tab.key === "expenses"
                    ? expensesMenuOpen
                    : tab.key === "admin"
                    ? adminMenuOpen
                    : tab.key === "employees"
                    ? employeeMenuOpen
                    : reportMenuOpen;
                const setGroupOpen =
                  tab.key === "purchases"
                    ? setPurchaseMenuOpen
                    : tab.key === "sales"
                    ? setSaleMenuOpen
                    : tab.key === "inventory"
                    ? setInventoryMenuOpen
                    : tab.key === "parties"
                    ? setPartiesMenuOpen
                    : tab.key === "expenses"
                    ? setExpensesMenuOpen
                    : tab.key === "admin"
                    ? setAdminMenuOpen
                    : tab.key === "employees"
                    ? setEmployeeMenuOpen
                    : setReportMenuOpen;
                const defaultSubKey =
                  tab.key === "purchases"
                    ? (tab.subItems?.[0]?.key || "purchases_new")
                    : tab.key === "sales"
                    ? (tab.subItems?.[0]?.key || "sales_new")
                    : tab.key === "inventory"
                    ? (tab.subItems?.[0]?.key || "inventory_imei")
                    : tab.key === "parties"
                    ? (tab.subItems?.[0]?.key || "parties_new")
                    : tab.key === "expenses"
                    ? (tab.subItems?.[0]?.key || "expenses_entry")
                    : tab.key === "admin"
                    ? "admin_branches"
                    : tab.key === "employees"
                    ? "employees_attendance"
                    : "reports_pnl";
                const isManualToggle = ["sales", "purchases", "inventory", "parties", "expenses"].includes(tab.key);

                return (
                  <div key={tab.key} className="nav-group">
                    <button
                      className={`nav-item ${isTabActive ? "active" : ""}`}
                      type="button"
                      aria-expanded={Boolean(isGroupOpen)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                          if (isManualToggle) {
                            e.preventDefault();
                            setError("");
                            if (isCollapsed) {
                              setIsCollapsed(false);
                              setGroupOpen(true);
                              return;
                            }
                            setGroupOpen(!isGroupOpen);
                          }
                        }
                      }}
                      onClick={() => {
                        setError("");
                        if (isManualToggle) {
                          if (isCollapsed) {
                            setIsCollapsed(false);
                            setGroupOpen(true);
                            return;
                          }
                          setGroupOpen(!isGroupOpen);
                          return;
                        }
                        if (isCollapsed) {
                          setIsCollapsed(false);
                          setGroupOpen(true);
                          if (!activeTab.startsWith(`${tab.key}_`)) {
                            setActiveTab(defaultSubKey);
                          }
                          return;
                        }
                        const isAlreadyInGroup = activeTab === tab.key || activeTab.startsWith(`${tab.key}_`);
                        if (!isAlreadyInGroup) {
                          setGroupOpen(true);
                          setActiveTab(defaultSubKey);
                        } else {
                          setGroupOpen(!isGroupOpen);
                        }
                      }}
                      title={tab.label}
                    >
                      <span className="nav-icon">{tab.icon}</span>
                      <span className="nav-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                        <span>{tab.label}</span>
                        {!isCollapsed && (
                          <span
                            className="nav-arrow"
                            style={{
                              fontSize: "0.7rem",
                              transition: "transform 0.2s ease",
                              transform: isGroupOpen ? "rotate(90deg)" : (isRtl ? "rotate(180deg)" : "rotate(0deg)")
                            }}
                          >
                            ▶
                          </span>
                        )}
                      </span>
                    </button>

                    {/* Sliding Sub-Menu */}
                    {isGroupOpen && !isCollapsed && (
                      <div className="sub-nav-list">
                        {tab.subItems.map((sub) => {
                          const isSubActive =
                            activeTab === sub.key ||
                            (activeTab === tab.key && sub.key === defaultSubKey);
                          return (
                            <button
                              key={sub.key}
                              type="button"
                              className={`nav-item sub-nav-item ${isSubActive ? "active" : ""}`}
                              onClick={() => {
                                setError("");
                                setActiveTab(sub.key);
                                setMobileMenuOpen(false);
                              }}
                              title={sub.label}
                            >
                              <span style={{ fontSize: "0.95rem" }}>{sub.icon}</span>
                              <span className="nav-label">{sub.label}</span>
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
                  className={tab.key === activeTab ? "nav-item active" : "nav-item"}
                  onClick={() => {
                    setError("");
                    setActiveTab(tab.key);
                    setMobileMenuOpen(false);
                  }}
                  title={tab.label}
                  type="button"
                >
                  <span className="nav-icon">{tab.icon}</span>
                  <span className="nav-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-footer-expanded">
              {!isSalesPage && (
                <>
                  <div className="theme-section">
                    {hasLanguageAccess && (
                      <>
                        <label className="sidebar-section-label">
                          🌐 Language / زبان
                        </label>
                        <LanguageSwitcher hasAccess={hasLanguageAccess} />
                      </>
                    )}
                  </div>

                  <div className="theme-section">
                    <label className="sidebar-section-label">
                      🎨 Theme {!hasThemeAccess && <span className="small muted">(Locked)</span>}
                    </label>
                    <ThemeSwitcher
                      currentTheme={theme}
                      onSelectTheme={handleSelectTheme}
                      isLocked={!hasThemeAccess}
                    />
                  </div>

                  {availedPackages.length > 0 && (
                    <div className="sidebar-packages-card">
                      <div className="sidebar-packages-header">
                        <span className="sidebar-packages-icon">📦</span>
                        <span className="sidebar-packages-label">Availing Packages</span>
                      </div>
                      <div className="sidebar-packages-list">
                        {availedPackages.map((pkg, idx) => (
                          <div key={idx} className="sidebar-package-item">
                            <div className="sidebar-package-main">
                              <span className="sidebar-package-name" title={pkg.name}>
                                {pkg.name}
                              </span>
                              {pkg.branchCount > 1 && (
                                <span className="sidebar-package-branches">({pkg.branchCount} br)</span>
                              )}
                            </div>
                            <span className={`status-pill ${pkg.statusClass}`} style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                              {pkg.statusLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button className="secondary-btn logout-btn" onClick={() => setShowLogoutConfirm(true)} title="Logout">
                <span>🚪</span> Logout
              </button>
            </div>

            <div className="sidebar-footer-collapsed">
              {!isSalesPage && (
                <>
                  {hasLanguageAccess && <LanguageSwitcher compact />}
                  <ThemeSwitcher
                    currentTheme={theme}
                    onSelectTheme={handleSelectTheme}
                    collapsed
                    isLocked={!hasThemeAccess}
                  />
                  {availedPackages.length > 0 && (
                    <div
                      className="sidebar-package-collapsed-badge"
                      title={`Availing Packages: ${availedPackages.map((p) => p.name).join(", ")}`}
                    >
                      📦
                    </div>
                  )}
                </>
              )}
              <button
                className="secondary-btn logout-btn-icon"
                onClick={() => setShowLogoutConfirm(true)}
                title={`Logout (${session.full_name || session.fullName})`}
                aria-label="Logout"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-viewport">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="top-navbar-left">
            <div className="top-identity-block">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="top-company-logo-img"
                />
              ) : (
                <div className="top-company-icon-box">
                  {isTopAdmin ? "🌐" : "🏢"}
                </div>
              )}

              <div className="top-identity-text">
                <div className="top-company-row">
                  <span className="top-company-name-text" title={companyName}>
                    {companyName}
                  </span>
                  {companyCode && (
                    <span className="top-company-code-badge" title={`Company Code: ${companyCode}`}>
                      {companyCode}
                    </span>
                  )}
                  {!isTopAdmin && (
                    <span className="top-status-pill" title="Subscription Status: Active Enterprise">
                      ● {t("common.active", "Active")} Enterprise
                    </span>
                  )}
                </div>

                {isBranchPortal && (
                  <div className="top-branch-row">
                    <span className="top-branch-prefix">{t("common.branch", "Branch")}:</span>
                    {canSwitchBranch ? (
                      <select
                        className="top-branch-select"
                        value={currentBranchId || ""}
                        onChange={(e) => handleSwitchBranch(e.target.value)}
                        title={`Active Branch: ${currentBranchName}`}
                      >
                        {branches.map((b) => {
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
                      <span className="top-branch-text" title={`Branch: ${currentBranchName}`}>
                        {currentBranchName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="top-navbar-right">
            {hasLanguageAccess && <LanguageSwitcher />}
            <button
              className="top-theme-btn"
              type="button"
              onClick={handleCycleTheme}
              title={hasThemeAccess ? `Theme: ${THEMES.find((t) => t.key === theme)?.name}` : "Theme selection locked"}
            >
              {hasThemeAccess ? (THEMES.find((t) => t.key === theme)?.label || "🎨 Theme") : "🔒 Theme (Locked)"}
            </button>

            {!isTopAdmin && (
              <div className="notification-bell-container" ref={notifBellRef}>
                <button
                  className="notification-bell-btn"
                  type="button"
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  title={unreadNotifCount > 0 ? `${unreadNotifCount} unread notifications` : "Notifications"}
                >
                  🔔
                  {unreadNotifCount > 0 && (
                    <span className="notification-badge">{unreadNotifCount > 99 ? "99+" : unreadNotifCount}</span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <span>🔔 Notifications</span>
                      {unreadNotifCount > 0 && (
                        <button className="mark-all-read" type="button" onClick={handleMarkAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔕</div>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((notif) => (
                        <div
                          key={notif.id}
                          className={`notification-item ${!notif.is_read && !notif.isRead ? "unread" : ""}`}
                          onClick={() => handleMarkNotifRead(notif)}
                        >
                          <span className="notif-icon">
                            {notif.notification_type === "package_changed" || notif.type === "package_changed" || notif.reference_type === "subscription" ? "📦" : notif.type === "low_stock" || notif.notification_type === "low_stock" ? "⚠️" : notif.type === "due_date" || notif.notification_type === "due_date" ? "📅" : "🔔"}
                          </span>
                          <div className="notif-content">
                            <p className="notif-title">{notif.title}</p>
                            <p className="notif-message">{notif.message}</p>
                            {(notif.due_date || notif.created_at) && (
                              <span className="notif-time">
                                {notif.due_date ? `Due: ${notif.due_date}` : notif.created_at}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              className="top-logout-btn"
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title={`Logout (${session.full_name || session.fullName})`}
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>

            <div className="top-user-menu-container" ref={userMenuRef}>
              <div
                className={`top-user-chip clickable ${userDropdownOpen ? "active" : ""}`}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                title="Account Menu"
              >
                <span className="top-user-avatar">
                  {(session.full_name || session.fullName || "U").charAt(0).toUpperCase()}
                </span>
                <span className="top-user-name">{session.full_name || session.fullName}</span>
                <span className="dropdown-caret" style={{ fontSize: "0.7rem", opacity: 0.7 }}>▾</span>
              </div>

              {userDropdownOpen && (
                <div className="top-user-dropdown-menu">
                  <div className="top-user-dropdown-header">
                    <p className="top-user-dropdown-name">{session.full_name || session.fullName}</p>
                    <p className="top-user-dropdown-email">{session.email}</p>
                    <span className="top-user-dropdown-role">{session.role_name || session.roleName}</span>
                    {session.business_name && (
                      <p className="small muted" style={{ margin: "4px 0 0 0", fontSize: "0.74rem" }}>
                        🏢 {session.business_name}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="top-user-dropdown-item"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setActiveTab("dashboard");
                    }}
                  >
                    <span>🔔</span> View All Notifications
                  </button>

                  <button
                    type="button"
                    className="top-user-dropdown-item"
                    onClick={handleOpenEditProfile}
                  >
                    <span>✏️</span> Edit Profile
                  </button>

                  <button
                    type="button"
                    className="top-user-dropdown-item"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setShowMfaModal(true);
                    }}
                    title="Configure Multi-Factor Authentication"
                  >
                    <span>{session.mfa_enabled || session.mfaEnabled ? "🔐" : "🛡️"}</span>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
                      <span>Two-Factor Auth</span>
                      <span
                        className={`badge ${session.mfa_enabled || session.mfaEnabled ? "badge-success" : "badge-neutral"}`}
                        style={{ fontSize: "0.68rem", padding: "1px 6px" }}
                      >
                        {session.mfa_enabled || session.mfaEnabled ? "Active" : "Setup"}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="top-user-dropdown-item danger-item"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ROW 2: Slim Page Indicator Bar */}
        <div className="page-breadcrumb-bar">
          <div className="page-breadcrumb-content">
            {pageBreadcrumb.isNested ? (
              <div className="breadcrumb-trail">
                <span className="breadcrumb-parent">
                  {pageBreadcrumb.parentIcon && <span className="breadcrumb-icon">{pageBreadcrumb.parentIcon}</span>}
                  <span>{pageBreadcrumb.parent}</span>
                </span>
                <span className="breadcrumb-separator">›</span>
                <span className="breadcrumb-current">
                  {pageBreadcrumb.currentIcon && <span className="breadcrumb-icon">{pageBreadcrumb.currentIcon}</span>}
                  <span>{pageBreadcrumb.current}</span>
                </span>
              </div>
            ) : (
              <div className="breadcrumb-trail">
                <span className="breadcrumb-current">
                  {pageBreadcrumb.currentIcon && <span className="breadcrumb-icon">{pageBreadcrumb.currentIcon}</span>}
                  <span>{pageBreadcrumb.current}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Frame */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
