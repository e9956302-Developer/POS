import React, { useState } from "react";
import { ThemeSwitcher } from "../ThemeSwitcher.jsx";
import { LanguageSwitcher } from "../LanguageSwitcher.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

export function ModernLayout({
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
  const [openGroups, setOpenGroups] = useState({
    employees: true,
    reports: true,
    admin: true
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function toggleGroup(groupKey) {
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  }

  return (
    <div className={`modern-layout-root ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="modern-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Modern Compact Sidebar (240px expanded / 68px collapsed) */}
      <aside className={`modern-sidebar ${isCollapsed ? "collapsed" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="modern-sidebar-inner">
          {/* Sidebar Brand Header */}
          <div className="modern-sidebar-header">
            <div className="modern-brand-box">
              <span className="modern-brand-icon">⚡</span>
              {!isCollapsed && (
                <div className="modern-brand-text">
                  <span className="modern-brand-title">POS Compact</span>
                  <span className="modern-brand-badge">PRO</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="modern-collapse-toggle"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar (240px)" : "Compact Sidebar (68px)"}
              aria-label="Toggle compact sidebar"
            >
              {isCollapsed ? "❯" : "❮"}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="modern-nav-menu">
            {tabs.map((tab) => {
              if (tab.subItems && tab.subItems.length > 0) {
                const isGroupOpen = openGroups[tab.key] ?? false;
                const isGroupActive = activeTab === tab.key || activeTab.startsWith(`${tab.key}_`);
                const defaultSubKey = tab.subItems[0].key;

                return (
                  <div key={tab.key} className={`modern-nav-group ${isGroupActive ? "group-active" : ""}`}>
                    <button
                      type="button"
                      className={`modern-nav-item modern-nav-parent ${isGroupActive ? "active" : ""}`}
                      onClick={() => {
                        setError("");
                        if (isCollapsed) {
                          setIsCollapsed(false);
                          setOpenGroups((prev) => ({ ...prev, [tab.key]: true }));
                          if (!activeTab.startsWith(`${tab.key}_`)) {
                            setActiveTab(defaultSubKey);
                          }
                          return;
                        }
                        const isAlreadyInGroup = activeTab === tab.key || activeTab.startsWith(`${tab.key}_`);
                        if (!isAlreadyInGroup) {
                          setOpenGroups((prev) => ({ ...prev, [tab.key]: true }));
                          setActiveTab(defaultSubKey);
                        } else {
                          toggleGroup(tab.key);
                        }
                      }}
                      title={tab.label}
                    >
                      <span className="modern-nav-icon">{tab.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span className="modern-nav-label">{tab.label}</span>
                          <span
                            className="modern-nav-arrow"
                            style={{
                              transform: isGroupOpen ? "rotate(90deg)" : (isRtl ? "rotate(180deg)" : "rotate(0deg)")
                            }}
                          >
                            ›
                          </span>
                        </>
                      )}
                    </button>

                    {/* Sub-menu accordion directly inside sidebar */}
                    {isGroupOpen && !isCollapsed && (
                      <div className="modern-sub-nav-list">
                        {tab.subItems.map((sub) => {
                          const isSubActive =
                            activeTab === sub.key ||
                            (activeTab === tab.key && sub.key === defaultSubKey);
                          return (
                            <button
                              key={sub.key}
                              type="button"
                              className={`modern-sub-nav-item ${isSubActive ? "active" : ""}`}
                              onClick={() => {
                                setError("");
                                setActiveTab(sub.key);
                                setMobileMenuOpen(false);
                              }}
                              title={sub.label}
                            >
                              <span className="modern-sub-nav-bullet" />
                              <span className="modern-sub-nav-icon">{sub.icon}</span>
                              <span className="modern-sub-nav-label">{sub.label}</span>
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
                  className={`modern-nav-item ${tab.key === activeTab ? "active" : ""}`}
                  onClick={() => {
                    setError("");
                    setActiveTab(tab.key);
                    setMobileMenuOpen(false);
                  }}
                  title={tab.label}
                  type="button"
                >
                  <span className="modern-nav-icon">{tab.icon}</span>
                  {!isCollapsed && <span className="modern-nav-label">{tab.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="modern-sidebar-footer">
            {!isCollapsed ? (
              <div className="modern-footer-expanded">
                <div className="modern-footer-theme" style={{ marginBottom: "0.5rem" }}>
                  <LanguageSwitcher />
                </div>
                <div className="modern-footer-theme">
                  <ThemeSwitcher
                    currentTheme={theme}
                    onSelectTheme={handleSelectTheme}
                    isLocked={!hasThemeAccess}
                  />
                </div>

                {availedPackages.length > 0 && (
                  <div className="modern-package-chip" title={availedPackages.map((p) => p.name).join(", ")}>
                    <span className="pkg-icon">📦</span>
                    <span className="pkg-name">{availedPackages[0]?.name}</span>
                    {availedPackages.length > 1 && <span className="pkg-more">+{availedPackages.length - 1}</span>}
                  </div>
                )}

                <button
                  type="button"
                  className="modern-logout-btn"
                  onClick={() => setShowLogoutConfirm(true)}
                  title="Logout"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="modern-footer-collapsed">
                <LanguageSwitcher compact />
                <ThemeSwitcher
                  currentTheme={theme}
                  onSelectTheme={handleSelectTheme}
                  collapsed
                  isLocked={!hasThemeAccess}
                />
                <button
                  type="button"
                  className="modern-logout-btn-icon"
                  onClick={() => setShowLogoutConfirm(true)}
                  title={`Logout (${session.full_name || session.fullName})`}
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
      <div className="modern-main-viewport">
        {/* ROW 1: Header (Height: 52px, sleek, professional) */}
        <header className="modern-row1-header">
          <div className="modern-row1-left">
            <button
              type="button"
              className="modern-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Open Navigation"
              aria-label="Open menu"
            >
              ☰
            </button>

            <div className="modern-identity-cluster">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="modern-company-logo" />
              ) : (
                <div className="modern-company-badge-icon">
                  {isTopAdmin ? "🌐" : "🏢"}
                </div>
              )}

              <div className="modern-identity-meta">
                <div className="modern-identity-title-row">
                  <span className="modern-company-title" title={companyName}>
                    {companyName}
                  </span>
                  {companyCode && (
                    <span className="modern-code-pill" title={`Company Code: ${companyCode}`}>
                      {companyCode}
                    </span>
                  )}
                  {!isTopAdmin && (
                    <span className="modern-active-pill" title="Subscription Status: Active">
                      {t("common.active", "Active")}
                    </span>
                  )}
                </div>

                {/* Branch name & switch dropdown: ONLY in branch portal */}
                {isBranchPortal && (
                  <div className="modern-branch-row">
                    <span className="modern-branch-tag">{t("common.branch", "Branch")}:</span>
                    {canSwitchBranch ? (
                      <select
                        className="modern-branch-select"
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
                      <span className="modern-branch-name" title={`Branch: ${currentBranchName}`}>
                        {currentBranchName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modern-row1-right">
            <LanguageSwitcher />
            {/* Theme Toggle Button */}
            <button
              type="button"
              className="modern-header-action-btn modern-theme-btn"
              onClick={handleCycleTheme}
              title={hasThemeAccess ? `Theme: ${THEMES.find((t) => t.key === theme)?.name}` : "Theme selection locked"}
            >
              {hasThemeAccess ? (THEMES.find((t) => t.key === theme)?.label || "🎨 Theme") : "🔒 Theme"}
            </button>

            {/* Notifications */}
            {!isTopAdmin && (
              <div className="notification-bell-container" ref={notifBellRef}>
                <button
                  type="button"
                  className="modern-header-action-btn modern-notif-btn"
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  title={unreadNotifCount > 0 ? `${unreadNotifCount} unread notifications` : "Notifications"}
                >
                  🔔
                  {unreadNotifCount > 0 && (
                    <span className="modern-notif-badge">{unreadNotifCount > 99 ? "99+" : unreadNotifCount}</span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="notification-dropdown modern-notif-dropdown">
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
                            {notif.type === "low_stock" ? "📦" : notif.type === "due_date" ? "📅" : "🔔"}
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

            {/* User Profile Chip */}
            <div className="top-user-menu-container" ref={userMenuRef}>
              <div
                className={`modern-user-chip clickable ${userDropdownOpen ? "active" : ""}`}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                title="Account Menu"
              >
                <span className="modern-user-avatar">
                  {(session.full_name || session.fullName || "U").charAt(0).toUpperCase()}
                </span>
                <span className="modern-user-name">{session.full_name || session.fullName}</span>
                <span className="modern-caret">▾</span>
              </div>

              {userDropdownOpen && (
                <div className="top-user-dropdown-menu modern-user-dropdown">
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

        {/* ROW 2: Slim Breadcrumb Panel (Height: 34px) */}
        <div className="modern-row2-breadcrumb-bar">
          <div className="modern-breadcrumb-container">
            {pageBreadcrumb.isNested ? (
              <div className="modern-breadcrumb-trail">
                <span className="modern-breadcrumb-parent">
                  {pageBreadcrumb.parentIcon && <span className="modern-bc-icon">{pageBreadcrumb.parentIcon}</span>}
                  <span>{pageBreadcrumb.parent}</span>
                </span>
                <span className="modern-breadcrumb-sep">/</span>
                <span className="modern-breadcrumb-active">
                  {pageBreadcrumb.currentIcon && <span className="modern-bc-icon">{pageBreadcrumb.currentIcon}</span>}
                  <span>{pageBreadcrumb.current}</span>
                </span>
              </div>
            ) : (
              <div className="modern-breadcrumb-trail">
                <span className="modern-breadcrumb-active">
                  {pageBreadcrumb.currentIcon && <span className="modern-bc-icon">{pageBreadcrumb.currentIcon}</span>}
                  <span>{pageBreadcrumb.current}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <main className="modern-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
