import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { SearchableSelect } from "../components/SearchableSelect.jsx";

function formatDate(val) {
  if (!val) return "N/A";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
  } catch {
    return String(val);
  }
}

function timeAgo(val) {
  if (!val) return "";
  try {
    const now = Date.now();
    const then = new Date(val).getTime();
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return "";
  }
}

function formatRoleName(role) {
  if (!role) return "Staff";
  switch (role) {
    case "top_admin":
      return "SaaS Super Admin";
    case "business_super_admin":
      return "Company Super Admin";
    case "admin":
      return "Branch Admin";
    case "manager":
      return "Branch Manager";
    case "cashier":
      return "Cashier / Staff";
    default:
      return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function getRoleBadgeClass(role) {
  switch (role) {
    case "top_admin":
      return "role-badge-top-admin";
    case "business_super_admin":
      return "role-badge-company-admin";
    case "cashier":
      return "role-badge-cashier";
    default:
      return "role-badge-default";
  }
}

function getStatusBadge(status) {
  switch (status) {
    case "success":
      return {
        label: "Success",
        icon: "✓",
        className: "login-status-success"
      };
    case "failed_password":
      return {
        label: "Wrong Password",
        icon: "✕",
        className: "login-status-failed"
      };
    case "account_locked":
      return {
        label: "Account Locked",
        icon: "🔒",
        className: "login-status-locked"
      };
    case "rate_limited":
      return {
        label: "Rate Limited",
        icon: "⏳",
        className: "login-status-ratelimit"
      };
    case "mfa_failed":
      return {
        label: "MFA Failed",
        icon: "🛡️",
        className: "login-status-mfa"
      };
    default:
      return {
        label: status || "Unknown",
        icon: "•",
        className: "login-status-default"
      };
  }
}

function getDeviceIcon(deviceType) {
  const dt = (deviceType || "").toLowerCase();
  if (dt.includes("mobile")) return "📱";
  if (dt.includes("tablet")) return "📟";
  if (dt.includes("bot") || dt.includes("api")) return "🤖";
  return "💻";
}

export function TopLoginLogsPage({ context }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all"); // 'all', 'today', '7days', '30days'

  // Summary stats
  const [stats, setStats] = useState({
    totalToday: 0,
    successToday: 0,
    failedToday: 0,
    uniqueUsersToday: 0,
    uniqueIpsToday: 0,
    topSystems: [],
    topOs: [],
    topBrowsers: []
  });

  const [companies, setCompanies] = useState([]);
  const [inspectItem, setInspectItem] = useState(null);
  const [copiedIp, setCopiedIp] = useState(null);

  // Load Companies list for dropdown filter
  useEffect(() => {
    api
      .businesses()
      .then((data) => setCompanies(Array.isArray(data) ? data : data.businesses || []))
      .catch(() => {});
  }, []);

  // Calculate Date bounds based on quick dateRange
  const { startDate, endDate } = useMemo(() => {
    if (dateRange === "today") {
      const todayStr = new Date().toISOString().slice(0, 10);
      return { startDate: todayStr, endDate: todayStr };
    }
    if (dateRange === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString().slice(0, 10), endDate: "" };
    }
    if (dateRange === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { startDate: d.toISOString().slice(0, 10), endDate: "" };
    }
    return { startDate: "", endDate: "" };
  }, [dateRange]);

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (businessFilter && businessFilter !== "all") params.set("businessId", businessFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await api.topLoginLogs(`?${params.toString()}`);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || "Failed to load user login activity logs");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.topLoginLogsStats();
      if (data) setStats(data);
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, limit, statusFilter, roleFilter, businessFilter, dateRange]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // 30s live stats poll
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleCopyIp = (ip) => {
    navigator.clipboard?.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  return (
    <div className="top-admin-container">
      {/* 1. Header Section */}
      <div className="top-admin-header-row">
        <div>
          <h1 className="top-admin-title">
            <span className="title-icon">🛡️</span> User Login & System Forensics
          </h1>
          <p className="top-admin-subtitle">
            Immutable tracking of when, from which system, browser, OS, and IP address all users authenticate across the platform.
          </p>
        </div>
        <div className="top-admin-actions">
          <div className="live-status-pill">
            <span className="live-indicator-dot"></span> Live Auditing
          </div>
          <button
            className="secondary-btn refresh-btn"
            onClick={() => {
              loadLogs();
              loadStats();
            }}
            disabled={loading}
          >
            <span>🔄</span> {loading ? "Refreshing..." : "Refresh Logs"}
          </button>
        </div>
      </div>

      {error && <div className="alert-error-banner">⚠️ {error}</div>}

      {/* 2. Top Summary KPI Cards */}
      <div className="login-stats-grid">
        <div className="login-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Total Logins Today</span>
            <span className="stat-icon-wrap icon-blue">🌐</span>
          </div>
          <div className="stat-number">{stats.totalToday.toLocaleString()}</div>
          <div className="stat-subtext">Across all companies & staff</div>
        </div>

        <div className="login-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Successful Logins</span>
            <span className="stat-icon-wrap icon-green">✅</span>
          </div>
          <div className="stat-number stat-text-green">{stats.successToday.toLocaleString()}</div>
          <div className="stat-subtext">Authenticated successfully</div>
        </div>

        <div className="login-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Failed / Locked Attempts</span>
            <span className="stat-icon-wrap icon-red">⚠️</span>
          </div>
          <div className="stat-number stat-text-red">{stats.failedToday.toLocaleString()}</div>
          <div className="stat-subtext">Wrong passwords or lockouts</div>
        </div>

        <div className="login-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Unique Active Users</span>
            <span className="stat-icon-wrap icon-purple">👥</span>
          </div>
          <div className="stat-number">{stats.uniqueUsersToday.toLocaleString()}</div>
          <div className="stat-subtext">Active accounts today</div>
        </div>

        <div className="login-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Unique IP Addresses</span>
            <span className="stat-icon-wrap icon-amber">💻</span>
          </div>
          <div className="stat-number">{stats.uniqueIpsToday.toLocaleString()}</div>
          <div className="stat-subtext">Distinct network locations</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="table-controls-card">
        <form onSubmit={handleSearchSubmit} className="login-filter-row">
          <div className="search-input-group">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search user email, name, IP address, device, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-input search-field"
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-select-group">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="select-input filter-dropdown"
            >
              <option value="all">All Login Statuses</option>
              <option value="success">✅ Success Only</option>
              <option value="failed_password">❌ Failed Password</option>
              <option value="account_locked">🔒 Account Locked</option>
              <option value="rate_limited">⏳ Rate Limited</option>
              <option value="mfa_failed">🛡️ MFA Failed</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="select-input filter-dropdown"
            >
              <option value="all">All User Roles</option>
              <option value="top_admin">SaaS Super Admin</option>
              <option value="business_super_admin">Company Super Admin</option>
              <option value="admin">Branch Admin</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier / Staff</option>
            </select>

            {/* Company Filter with in-place search combobox */}
            <SearchableSelect
              value={businessFilter === "all" ? "" : businessFilter}
              onChange={(e) => {
                setBusinessFilter(e.target.value || "all");
                setPage(1);
              }}
              placeholder="All Companies"
              className="searchable-company-select"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id} sublabel={c.code ? `Code: ${c.code}` : undefined}>
                  {c.name} {c.code ? `(${c.code})` : ""}
                </option>
              ))}
            </SearchableSelect>

            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              className="select-input filter-dropdown"
            >
              <option value="all">All Time History</option>
              <option value="today">Today Only</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </form>
      </div>

      {/* 4. Main Login Activity Table */}
      <div className="table-responsive-wrapper">
        <table className="custom-data-table">
          <thead>
            <tr>
              <th style={{ width: "160px" }}>Date & Time</th>
              <th>User Account</th>
              <th>Company & Branch</th>
              <th>System & Hardware</th>
              <th>Browser & OS</th>
              <th>IP Address</th>
              <th style={{ width: "130px" }}>Status</th>
              <th style={{ width: "90px", textAlign: "center" }}>Forensics</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-table-cell">
                  <div className="table-spinner"></div> Loading login security logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-table-cell">
                  No login activity logs found matching the selected filters.
                </td>
              </tr>
            ) : (
              logs.map((row) => {
                const badge = getStatusBadge(row.status);
                const devIcon = getDeviceIcon(row.device_type);
                return (
                  <tr key={row.id} className={row.status !== "success" ? "row-flagged" : ""}>
                    {/* Timestamp */}
                    <td>
                      <div className="timestamp-primary">{formatDate(row.created_at)}</div>
                      <div className="timestamp-relative">{timeAgo(row.created_at)}</div>
                    </td>

                    {/* User Identity */}
                    <td>
                      <div className="user-primary-name">{row.full_name || "Unknown User"}</div>
                      <div className="user-primary-email">{row.email}</div>
                      <span className={`role-pill ${getRoleBadgeClass(row.role_name)}`}>
                        {formatRoleName(row.role_name)}
                      </span>
                    </td>

                    {/* Business & Branch */}
                    <td>
                      {row.business_name ? (
                        <>
                          <div className="company-text">{row.business_name}</div>
                          {row.branch_name && (
                            <span className="branch-tag">📍 {row.branch_name}</span>
                          )}
                        </>
                      ) : (
                        <span className="saas-platform-tag">🌐 SaaS Administration</span>
                      )}
                    </td>

                    {/* System Summary */}
                    <td>
                      <div className="system-summary-box">
                        <span className="device-icon">{devIcon}</span>
                        <span className="system-summary-text" title={row.system_summary}>
                          {row.system_summary || "Unknown System"}
                        </span>
                      </div>
                      <span className="device-type-tag">{row.device_type || "Desktop"}</span>
                    </td>

                    {/* Browser & OS */}
                    <td>
                      <div className="browser-os-box">
                        <span className="os-badge">{row.os || "OS N/A"}</span>
                        <span className="browser-badge">{row.browser || "Browser N/A"}</span>
                      </div>
                    </td>

                    {/* IP Address */}
                    <td>
                      <div className="ip-cell">
                        <span className="ip-mono-text">{row.ip_address}</span>
                        <button
                          type="button"
                          className="copy-ip-btn"
                          title="Copy IP Address"
                          onClick={() => handleCopyIp(row.ip_address)}
                        >
                          {copiedIp === row.ip_address ? "✓" : "📋"}
                        </button>
                      </div>
                      {row.ip_address === "127.0.0.1" || row.ip_address === "::1" || row.ip_address?.startsWith("::ffff:127.0.0.1") ? (
                        <span className="ip-type-pill ip-local">Localhost</span>
                      ) : (
                        <span className="ip-type-pill ip-remote">Network IP</span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`login-status-badge ${badge.className}`}>
                        <span className="badge-icon">{badge.icon}</span> {badge.label}
                      </span>
                      {row.failure_reason && (
                        <div className="failure-reason-hint" title={row.failure_reason}>
                          {row.failure_reason}
                        </div>
                      )}
                    </td>

                    {/* Action: Inspect */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="inspect-btn"
                        title="View Full Technical Details"
                        onClick={() => setInspectItem(row)}
                      >
                        🔍 Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Pagination Bar */}
      {totalPages > 1 && (
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}

      {/* 6. Technical Forensics Modal */}
      {inspectItem && (
        <div className="modal-backdrop" onClick={() => setInspectItem(null)}>
          <div className="modal-dialog forensic-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span>🛡️</span> Login Forensics Inspection • Record #{inspectItem.id}
              </h3>
              <button type="button" className="close-btn" onClick={() => setInspectItem(null)}>
                ✕
              </button>
            </div>

            <div className="forensic-modal-body">
              {/* User and Status Hero */}
              <div className="forensic-hero-card">
                <div>
                  <div className="forensic-hero-name">{inspectItem.full_name || "Unknown User"}</div>
                  <div className="forensic-hero-email">{inspectItem.email}</div>
                  <div className="forensic-hero-tags">
                    <span className={`role-pill ${getRoleBadgeClass(inspectItem.role_name)}`}>
                      {formatRoleName(inspectItem.role_name)}
                    </span>
                    {inspectItem.business_name && (
                      <span className="branch-tag">🏢 {inspectItem.business_name}</span>
                    )}
                    {inspectItem.branch_name && (
                      <span className="branch-tag">📍 {inspectItem.branch_name}</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className={`login-status-badge ${getStatusBadge(inspectItem.status).className}`}>
                    {getStatusBadge(inspectItem.status).icon} {getStatusBadge(inspectItem.status).label}
                  </span>
                </div>
              </div>

              {/* Forensic Key Details Grid */}
              <div className="forensic-details-grid">
                <div className="forensic-field">
                  <span className="field-label">Timestamp</span>
                  <span className="field-value">{formatDate(inspectItem.created_at)}</span>
                  <span className="field-subtext">{inspectItem.created_at}</span>
                </div>

                <div className="forensic-field">
                  <span className="field-label">Client IP Address</span>
                  <div className="ip-cell">
                    <span className="field-value ip-mono-text">{inspectItem.ip_address}</span>
                    <button
                      type="button"
                      className="copy-ip-btn"
                      onClick={() => handleCopyIp(inspectItem.ip_address)}
                    >
                      {copiedIp === inspectItem.ip_address ? "✓ Copied" : "📋 Copy"}
                    </button>
                  </div>
                </div>

                <div className="forensic-field">
                  <span className="field-label">Operating System</span>
                  <span className="field-value">{inspectItem.os || "Unknown"}</span>
                </div>

                <div className="forensic-field">
                  <span className="field-label">Web Browser</span>
                  <span className="field-value">{inspectItem.browser || "Unknown"}</span>
                </div>

                <div className="forensic-field">
                  <span className="field-label">System Summary</span>
                  <span className="field-value">{inspectItem.system_summary}</span>
                </div>

                <div className="forensic-field">
                  <span className="field-label">Device Classification</span>
                  <span className="field-value">{inspectItem.device_type || "Desktop"}</span>
                </div>

                {inspectItem.failure_reason && (
                  <div className="forensic-field full-width alert-danger-field">
                    <span className="field-label">Failure / Security Reason</span>
                    <span className="field-value failure-text">{inspectItem.failure_reason}</span>
                  </div>
                )}

                <div className="forensic-field full-width">
                  <span className="field-label">Raw User-Agent Header</span>
                  <pre className="user-agent-pre">{inspectItem.user_agent || "No User-Agent provided"}</pre>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setInspectItem(null)}
              >
                Close Forensics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
