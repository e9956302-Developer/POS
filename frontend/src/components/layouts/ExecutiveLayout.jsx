import React, { useState } from "react";
import { ThemeSwitcher } from "../ThemeSwitcher.jsx";
import { LanguageSwitcher } from "../LanguageSwitcher.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

export function ExecutiveLayout({
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

  // Active top tab and sub-items detection
  const activeParentTab = tabs.find(
    (t) => t.key === activeTab || (t.subItems && t.subItems.some((s) => s.key === activeTab))
  );

  return (
    <div className={`executive-layout-root ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="executive-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Floating Obsidian & Gold Sidebar */}
      <aside className={`executive-sidebar ${isCollapsed ? "collapsed" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="executive-sidebar-inner">
          {/* Brand Header with Gold Accent */}
          <div className="executive-sidebar-header">
            <div className="executive-brand-box">
              <span className="executive-brand-icon">💎</span>
              {!isCollapsed && (
                <div className="executive-brand-text">
                  <span className="executive-brand-title">POS Executive</span>
                  <span className="executive-brand-badge">LUXURY</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="executive-collapse-toggle"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle executive sidebar"
            >
              {isCollapsed ? "❯" : "❮"}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="executive-nav-menu">
            {tabs.map((tab) => {
              if (tab.subItems && tab.subItems.length > 0) {
                const isGroupOpen = openGroups[tab.key] ?? false;
                const isGroupActive = activeTab === tab.key || activeTab.startsWith(`${tab.key}_`);
                const defaultSubKey = tab.subItems[0].key;

                return (
                  <div key={tab.key} className={`executive-nav-group ${isGroupActive ? "group-active" : ""}`}>
                    <button
                      type="button"
                      className={`executive-nav-item executive-nav-parent ${isGroupActive ? "active" : ""}`}
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
                      <span className="executive-nav-icon">{tab.icon}</span>
                      {!isCollapsed && (
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
                    {isGroupOpen && !isCollapsed && (
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
                    setActiveTab(tab.key);
                    setMobileMenuOpen(false);
                  }}
                  title={tab.label}
                  type="button"
                >
                  <span className="executive-nav-icon">{tab.icon}</span>
                  {!isCollapsed && <span className="executive-nav-label">{tab.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="executive-sidebar-footer">
            {!isCollapsed ? (
              <div className="executive-footer-expanded">
                <div className="executive-footer-theme" style={{ marginBottom: "0.5rem" }}>
                  <LanguageSwitcher />
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
                <LanguageSwitcher compact />
                <ThemeSwitcher
                  currentTheme={theme}
                  onSelectTheme={handleSelectTheme}
                  collapsed
                  isLocked={!hasThemeAccess}
                />
                <button
                  type="button"
                  className="executive-logout-btn-icon"
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
                      <span className="executive-branch-static">{currentBranchName}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="executive-header-right">
            {/* Notifications Dropdown */}
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
                    {notifications && notifications.length > 0 ? (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`executive-notif-item ${!n.is_read ? "unread" : ""}`}
                          onClick={() => handleMarkNotifRead(n.id)}
                        >
                          <div className="executive-notif-title">{n.title}</div>
                          <div className="executive-notif-message">{n.message}</div>
                          <div className="executive-notif-time">
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
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

            {/* User Profile Menu */}
            <div className="executive-dropdown-anchor" ref={userMenuRef}>
              <button
                type="button"
                className="executive-user-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                title="User menu"
              >
                <div className="executive-user-avatar">
                  {(session.full_name || session.fullName || "U").charAt(0).toUpperCase()}
                </div>
                <div className="executive-user-meta">
                  <span className="executive-user-name">
                    {session.full_name || session.fullName}
                  </span>
                  <span className="executive-user-role">
                    {session.roleName || session.role || (isTopAdmin ? "Top Admin" : "User")}
                  </span>
                </div>
                <span className="executive-dropdown-caret">▾</span>
              </button>

              {userDropdownOpen && (
                <div className="executive-user-dropdown">
                  <div className="executive-user-dropdown-header">
                    <div className="name">{session.full_name || session.fullName}</div>
                    <div className="email">{session.email}</div>
                  </div>
                  <div className="executive-user-dropdown-body">
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
                      <span>Security & MFA</span>
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
            <span className="executive-breadcrumb-sep">/</span>
            <span className="executive-breadcrumb-active">{pageBreadcrumb || activeTab}</span>
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
