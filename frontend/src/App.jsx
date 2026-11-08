import { useEffect, useMemo, useRef, useState } from "react";
import { api, clearToken, setToken, getToken } from "./api.js";
import { AdminPage } from "./pages/AdminPage.jsx";
import { CashRegisterPage } from "./pages/CashRegisterPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { ExpensesPage } from "./pages/ExpensesPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";
import { InvoicesPage } from "./pages/InvoicesPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { PartiesPage } from "./pages/PartiesPage.jsx";
import { PurchasesPage } from "./pages/PurchasesPage.jsx";
import { SalesPage } from "./pages/SalesPage.jsx";

import { TopDashboard } from "./pages/TopDashboard.jsx";
import { TopBusinessesPage } from "./pages/TopBusinessesPage.jsx";
import { TopPackagesPage } from "./pages/TopPackagesPage.jsx";
import { TopPackageAccessPage } from "./pages/TopPackageAccessPage.jsx";
import { TopPaymentsPage } from "./pages/TopPaymentsPage.jsx";
import { TopAdminsPage } from "./pages/TopAdminsPage.jsx";
import { TopSaasAdminsPage } from "./pages/TopSaasAdminsPage.jsx";
import { TopLoginLogsPage } from "./pages/TopLoginLogsPage.jsx";
import { TopDeletedTransactionsPage } from "./pages/TopDeletedTransactionsPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { RepairsPage } from "./pages/RepairsPage.jsx";
import { EmployeesPage } from "./pages/EmployeesPage.jsx";
import { MfaSetupModal } from "./components/MfaSetupModal.jsx";
import { LayoutProvider, useLayout } from "./context/LayoutContext.jsx";
import { ClassicLayout } from "./components/layouts/ClassicLayout.jsx";
import { ModernLayout } from "./components/layouts/ModernLayout.jsx";
import { TopSettingsPage } from "./pages/TopSettingsPage.jsx";
import { SessionExpiredModal } from "./components/SessionExpiredModal.jsx";
import { useLanguage } from "./context/LanguageContext.jsx";

export const ADMIN_SUB_PAGES = [
  { key: "admin_branches", subKey: "branches", label: "Branches & Outlets", icon: "🏢" },
  { key: "admin_users", subKey: "users", label: "Staff Accounts", icon: "👥" },
  { key: "admin_roles", subKey: "roles", label: "Roles & Permissions", icon: "🛡️" },
  { key: "admin_partners", subKey: "partners", label: "Partners & Equity", icon: "🤝" },
  { key: "admin_company", subKey: "company", label: "Company Profile & Logo", icon: "🏬" },
  { key: "admin_themes", subKey: "themes", label: "Brand Themes", icon: "🎨" }
];

export const EMPLOYEE_SUB_PAGES = [
  { key: "employees_attendance", subKey: "attendance", label: "Monthly Attendance", icon: "📅" },
  { key: "employees_advances", subKey: "advances", label: "Advances & Loans", icon: "💸" },
  { key: "employees_payroll", subKey: "payroll", label: "Salaries & Payroll", icon: "💵" },
  { key: "employees_batch_salary", subKey: "batch_salary", label: "Batch Monthly Salary", icon: "⚡" },
  { key: "employees_staff", subKey: "staff", label: "Staff Roster & Add Staff", icon: "👔" },
  { key: "employees_daily", subKey: "daily", label: "Daily Roll Call", icon: "📋" }
];

export const REPORT_SUB_PAGES = [
  { key: "reports_pnl", subKey: "pnl", label: "Profit & Loss", icon: "📊" },
  { key: "reports_sales", subKey: "sales", label: "Sales & Turnover", icon: "📈" },
  { key: "reports_expenses", subKey: "expenses", label: "Operating Expenses", icon: "📉" },
  { key: "reports_inventory", subKey: "inventory", label: "Inventory Valuation", icon: "📦" },
  { key: "reports_receivables", subKey: "receivables", label: "Accounts Receivable", icon: "💳" },
  { key: "reports_payables", subKey: "payables", label: "Accounts Payable", icon: "🚚" },
  { key: "reports_payroll", subKey: "payroll", label: "Salaries & Payroll", icon: "💵" },
  { key: "reports_dividends", subKey: "dividends", label: "Partner Dividends", icon: "🤝" }
];

export const tabs = [
  { key: "dashboard", label: "Dashboard", pageKey: "dashboard", icon: "📊" },
  { key: "purchases", label: "Purchases", pageKey: "purchases", icon: "🛒" },
  { key: "sales", label: "Sales", pageKey: "sales", icon: "💰" },
  { key: "cash_register", label: "Cash Register", pageKey: "cash_register", icon: "💵" },
  { key: "inventory", label: "Inventory", pageKey: "inventory", icon: "📦" },
  { key: "parties", label: "Parties", pageKey: "parties", icon: "👥" },
  { key: "expenses", label: "Expenses", pageKey: "expenses", icon: "📉" },
  { key: "invoices", label: "Invoices", pageKey: "invoices", icon: "🧾" },
  { key: "repairs", label: "Repairs", pageKey: "repairs", icon: "🔧" },
  {
    key: "employees",
    label: "Salaries & Payroll",
    pageKey: "employees",
    icon: "💵",
    subItems: EMPLOYEE_SUB_PAGES
  },
  {
    key: "reports",
    label: "Reports",
    pageKey: "reports",
    icon: "📈",
    subItems: REPORT_SUB_PAGES
  },
  {
    key: "admin",
    label: "Admin",
    pageKey: "admin",
    icon: "⚙️",
    subItems: ADMIN_SUB_PAGES
  }
];

export const TOP_ADMIN_TABS = [
  { key: "top_dashboard", label: "Overview", pageKey: "top_dashboard", icon: "📊" },
  { key: "top_businesses", label: "Businesses & Branches", pageKey: "top_businesses", icon: "🏢" },
  { key: "top_packages", label: "Subscription Packages", pageKey: "top_packages", icon: "📦" },
  { key: "top_subscriptions", label: "Assign Branch Packages", pageKey: "top_subscriptions", icon: "🏪" },
  { key: "top_payments", label: "Pending Payments", pageKey: "top_payments", icon: "💳" },
  { key: "top_saas_admins", label: "SaaS Super Admins", pageKey: "top_saas_admins", icon: "🛡️" },
  { key: "top_admins", label: "Company Administrators", pageKey: "top_admins", icon: "👥" },
  { key: "top_login_logs", label: "User Login History", pageKey: "top_login_logs", icon: "📜" },
  { key: "top_deleted_transactions", label: "Deleted Transactions", pageKey: "top_deleted_transactions", icon: "🗑️" },
  { key: "top_settings", label: "Platform & Layout", pageKey: "top_settings", icon: "⚙️" }
];

export function roleName(user) {
  return user?.role_name || user?.roleName;
}

export function getVisibleTabs(user) {
  if (!user) return [];
  const role = roleName(user);
  const isTopAdmin = role === "top_admin";
  const isCompanyAdmin = ["business_super_admin", "admin"].includes(role);

  if (isTopAdmin) {
    return TOP_ADMIN_TABS;
  }
  if (isCompanyAdmin) {
    return tabs.filter((tab) => ["dashboard", "reports", "admin"].includes(tab.key));
  }
  return tabs.filter((tab) => {
    if (tab.key === "admin") {
      return ["business_super_admin", "admin"].includes(roleName(user));
    }
    return canUse(user, tab.pageKey);
  });
}

export const SUB_ENTITY_MAP = {
  models: "inventory",
  products: "inventory",
  categories: "inventory",
  stock_adjustments: "inventory",
  qr_tags: "inventory",
  imei_history: "inventory",
  transfers: "inventory",
  stock_transfers: "inventory",
  quotations: "sales",
  deliveries: "sales",
  loyalty_discounts: "sales",
  promotions: "sales",
  sale_returns: "sales",
  order_returns: "sales",
  purchase_returns: "purchases",
  supplier_prices: "purchases",
  salaries: "employees",
  attendance: "employees",
  advances: "employees",
  commissions: "employees",
  pnl: "reports",
  reports_inventory: "reports",
  reports_receivables: "reports",
  reports_payables: "reports",
  reports_sales: "reports",
  reports_expenses: "reports",
  reports_payroll: "reports",
  reports_dividends: "reports",
  inventory_valuation: "reports",
  receivables: "reports",
  payables: "reports",
  technician_workbench: "repairs",
  warranty_claims: "repairs",
  bank_accounts: "cash_register"
};

export function canUse(user, pageKey, actionKey = "view") {
  if (!user) return false;
  const role = roleName(user);

  if (role === "top_admin") {
    return pageKey.startsWith("top_") || pageKey === "admin";
  }

  // Enforce branch subscription plan package entitlements if configured
  let allowedPages =
    user?.allowedPages ||
    user?.allowed_pages ||
    user?.subscriptionPlan?.allowedPages ||
    user?.subscription_plan?.allowed_pages;
  if (typeof allowedPages === "string") {
    try {
      allowedPages = JSON.parse(allowedPages);
    } catch {
      allowedPages = null;
    }
  }
  if (Array.isArray(allowedPages) && allowedPages.length > 0) {
    let isPackageAllowed = allowedPages.includes(pageKey);
    if (!isPackageAllowed) {
      if (pageKey === "reports" || pageKey.startsWith("reports_")) {
        isPackageAllowed =
          allowedPages.includes("reports") ||
          allowedPages.includes(pageKey) ||
          allowedPages.includes("reports_inventory") ||
          allowedPages.includes("reports_receivables") ||
          allowedPages.includes("reports_payables") ||
          allowedPages.includes("admin") ||
          ["business_super_admin", "admin"].includes(role);
      } else if (pageKey === "branches") {
        isPackageAllowed = allowedPages.includes("admin") || ["business_super_admin", "admin"].includes(role);
      } else if (pageKey === "employees") {
        isPackageAllowed =
          allowedPages.includes("employees") ||
          allowedPages.includes("salaries") ||
          allowedPages.includes("payroll") ||
          allowedPages.includes("staff") ||
          allowedPages.includes("admin") ||
          ["business_super_admin", "admin"].includes(role);
      } else if (pageKey === "repairs") {
        isPackageAllowed =
          allowedPages.includes("repairs") ||
          allowedPages.includes("admin") ||
          ["business_super_admin", "admin"].includes(role);
      } else if (pageKey === "products" || pageKey === "categories" || pageKey === "models") {
        isPackageAllowed =
          allowedPages.includes("inventory") ||
          allowedPages.includes("sales") ||
          allowedPages.includes("purchases") ||
          allowedPages.includes("repairs") ||
          allowedPages.includes("admin") ||
          ["business_super_admin", "admin"].includes(role);
      } else if (["business_super_admin", "admin"].includes(role)) {
        isPackageAllowed = true;
      }
    }
    if (!isPackageAllowed) {
      return false;
    }
  }

  // Branch-level operational modules:
  // Purchases, Sales, Cash Register, Inventory, Parties, Expenses, Invoices, Repairs, Salaries & Payroll (employees)
  const BRANCH_OPERATIONAL_PAGES = [
    "purchases",
    "sales",
    "cash_register",
    "inventory",
    "parties",
    "expenses",
    "invoices",
    "repairs",
    "employees"
  ];

  // Company Admin Panel:
  // Company Admins govern the business and only access Dashboard, Reports, and Admin Management.
  // All operational pages are branch-only operations and cannot be directly executed by Company Admin.
  if (["business_super_admin", "admin"].includes(role)) {
    if (["create", "close", "reopen", "verify"].includes(actionKey) && (BRANCH_OPERATIONAL_PAGES.includes(pageKey) || pageKey.startsWith("employees_") || pageKey === "returns")) {
      return false;
    }
    return true;
  }

  // Global view allowances:
  if (pageKey === "notifications" && actionKey === "view") {
    return true;
  }
  if (pageKey === "branches" && actionKey === "view") {
    return true;
  }

  // Staff roles (manager, cashier, etc.):
  // 1. Direct permission check in user.permissions
  const effectivePageKey = (pageKey.startsWith("reports_") && !user?.permissions?.some(r => (r.page_key || r.pageKey) === pageKey)) ? "reports" : pageKey;
  const directPermission = user?.permissions?.find(
    (row) => (row.page_key || row.pageKey) === effectivePageKey && (row.action_key || row.actionKey) === actionKey
  );
  if (directPermission !== undefined) {
    return Boolean(directPermission.is_allowed ?? directPermission.isAllowed);
  }

  // 2. Catalog viewing allowance for operational staff
  if ((pageKey === "products" || pageKey === "categories" || pageKey === "models") && actionKey === "view") {
    const hasAnyOps = user?.permissions?.some(
      (p) => ["inventory", "sales", "purchases", "invoices", "repairs", "cash_register"].includes(p.page_key || p.pageKey) && Boolean(p.is_allowed ?? p.isAllowed)
    );
    if (hasAnyOps || ["manager", "cashier"].includes(role)) {
      return true;
    }
  }

  // 3. Parent module mapped permission check in user.permissions
  const parentModule = SUB_ENTITY_MAP[pageKey];
  if (parentModule) {
    const parentPermission = user?.permissions?.find(
      (row) => (row.page_key || row.pageKey) === parentModule && (row.action_key || row.actionKey) === actionKey
    );
    if (parentPermission !== undefined) {
      return Boolean(parentPermission.is_allowed ?? parentPermission.isAllowed);
    }
  }

  // 4. Fallback defaults for manager/cashier
  if (role === "manager") {
    const managerDefaultPages = [
      "dashboard", "sales", "purchases", "cash_register",
      "inventory", "parties", "expenses", "invoices",
      "repairs", "employees", "reports"
    ];
    const targetModule = parentModule || pageKey;
    if (actionKey === "view") {
      return managerDefaultPages.includes(targetModule) || pageKey.startsWith("reports_");
    }
    if (actionKey === "create" || actionKey === "edit") {
      return managerDefaultPages.includes(targetModule);
    }
    if (actionKey === "delete") {
      return ["sales", "purchases", "inventory", "parties", "expenses", "invoices", "repairs"].includes(targetModule);
    }
    if (actionKey === "close" || actionKey === "verify") {
      return targetModule === "cash_register";
    }
    if (actionKey === "payment") {
      return targetModule === "invoices";
    }
    return false;
  }

  if (role === "cashier") {
    const cashierDefaultPages = [
      "dashboard", "sales", "cash_register", "invoices",
      "parties", "repairs", "employees", "inventory"
    ];
    const targetModule = parentModule || pageKey;
    if (actionKey === "view") {
      return cashierDefaultPages.includes(targetModule);
    }
    if (actionKey === "create" || actionKey === "payment" || actionKey === "close") {
      return ["sales", "cash_register", "invoices", "parties", "repairs"].includes(targetModule);
    }
    return false;
  }

  return false;
}

export function canUseTheme(user) {
  if (!user) return true;
  const role = roleName(user);
  if (role === "top_admin" || ["business_super_admin", "admin"].includes(role)) return true;

  // Enforce branch subscription plan package entitlements if configured
  let allowedPages =
    user?.allowedPages ||
    user?.allowed_pages ||
    user?.subscriptionPlan?.allowedPages ||
    user?.subscription_plan?.allowed_pages;
  if (typeof allowedPages === "string") {
    try {
      allowedPages = JSON.parse(allowedPages);
    } catch {
      allowedPages = null;
    }
  }
  if (Array.isArray(allowedPages)) {
    return allowedPages.includes("theme_selection");
  }
  return true;
}

export function getThemeStorageKey(user) {
  if (!user || !user.id) return "mp_theme_guest";
  const bizId = user.business_id || user.businessId || "0";
  const brId = user.branch_id || user.branchId || "0";
  return `mp_theme_biz_${bizId}_br_${brId}_user_${user.id}`;
}

import { THEMES, ThemeSwitcher } from "./components/ThemeSwitcher.jsx";
export { THEMES, ThemeSwitcher };

export function BranchSubscriptionExpiredScreen({ branch, expiredOn, onLogout }) {
  const formattedDate = expiredOn || "earlier";
  const branchName = branch?.name || branch?.branch_name || "This Branch";
  const branchCode = branch?.code || branch?.branch_code || "";

  return (
    <div
      className="subscription-expired-screen"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg, #0b0f19)",
        color: "var(--text, #f1f5f9)",
        padding: "1.5rem",
        boxSizing: "border-box"
      }}
    >
      <div
        className="subscription-expired-card"
        style={{
          maxWidth: "560px",
          width: "100%",
          background: "var(--surface, #131b2e)",
          border: "1px solid var(--border, #223048)",
          borderRadius: "16px",
          padding: "2.5rem 2rem",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
          position: "relative"
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.15)",
            border: "2px solid rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem auto",
            fontSize: "2rem"
          }}
        >
          ⏸️
        </div>

        <span
          className="badge badge-danger"
          style={{
            fontSize: "0.8rem",
            padding: "0.35rem 0.85rem",
            marginBottom: "1rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem"
          }}
        >
          🏢 {branchName} {branchCode ? `(${branchCode})` : ""} — SUBSCRIPTION EXPIRED
        </span>

        <h2
          style={{
            fontSize: "1.6rem",
            margin: "0.5rem 0 1rem 0",
            fontWeight: 800,
            color: "var(--text, #f1f5f9)"
          }}
        >
          Branch Operations Paused
        </h2>

        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "10px",
            padding: "1.25rem",
            margin: "1.25rem 0 2rem 0",
            fontSize: "1.05rem",
            lineHeight: 1.55,
            color: "var(--text, #f1f5f9)"
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>
            This branch's subscription expired on {formattedDate}.
          </p>
          <p style={{ margin: 0, color: "var(--text-muted, #94a3b8)" }}>
            All operations are paused. Please contact your Company Admin to renew.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            className="btn btn-danger btn-lg"
            style={{
              minWidth: "180px",
              padding: "0.85rem 2rem",
              fontSize: "1.05rem",
              fontWeight: 700,
              cursor: "pointer",
              borderRadius: "8px"
            }}
            onClick={onLogout}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { language, isRtl, t, formatCurrency } = useLanguage();
  const { isModernCompact } = useLayout();
  const [session, setSession] = useState(null);
  const [guestView, setGuestView] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.toLowerCase();
        const path = window.location.pathname.toLowerCase();
        if (hash.includes("login") || path === "/login" || path.endsWith("/login")) {
          return "login";
        }
      }
    } catch {}
    return "landing";
  });

  useEffect(() => {
    function handleHashChange() {
      try {
        const hash = window.location.hash.toLowerCase();
        const path = window.location.pathname.toLowerCase();
        if (hash.includes("login") || path === "/login" || path.endsWith("/login")) {
          setGuestView("login");
        } else if (hash.includes("landing") || hash === "" || hash === "#") {
          setGuestView("landing");
        }
      } catch {}
    }
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);
  const [subscriptionExpiredData, setSubscriptionExpiredData] = useState(null);
  const [sessionExpiredData, setSessionExpiredData] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [branches, setBranches] = useState([]);
  const [models, setModels] = useState([]);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("mp_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mp_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    function handleSubExpired(e) {
      setSubscriptionExpiredData(e.detail);
    }
    window.addEventListener("pos:subscription_expired", handleSubExpired);
    return () => window.removeEventListener("pos:subscription_expired", handleSubExpired);
  }, []);

  useEffect(() => {
    function handleSessionExpired(e) {
      setSessionExpiredData(e.detail || { message: "Your session has expired. Please log in again to continue." });
    }
    window.addEventListener("pos:session_expired", handleSessionExpired);
    return () => window.removeEventListener("pos:session_expired", handleSessionExpired);
  }, []);

  // Periodic client-side check to proactively detect expired JWT tokens while user is idle
  useEffect(() => {
    if (!session) return;
    const checkTokenExpiry = () => {
      const token = getToken();
      if (!token) return;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.exp && Date.now() >= payload.exp * 1000) {
            window.dispatchEvent(
              new CustomEvent("pos:session_expired", {
                detail: { message: "Your session has expired. Please log in again to continue." }
              })
            );
          }
        }
      } catch {
        // ignore
      }
    };
    const timer = setInterval(checkTokenExpiry, 30000);
    return () => clearInterval(timer);
  }, [session]);

  // Load user's scoped theme whenever session changes (login or app load)
  useEffect(() => {
    if (!session) {
      try {
        const guestTheme = localStorage.getItem("mp_theme_guest") || "dark";
        setTheme(guestTheme);
        document.documentElement.setAttribute("data-theme", guestTheme);
      } catch {}
      return;
    }
    const userKey = getThemeStorageKey(session);
    try {
      const savedTheme = localStorage.getItem(userKey);
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else {
        setTheme("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, [session?.id, session?.business_id, session?.businessId, session?.branch_id, session?.branchId]);

  // Persist theme changes to this specific user's scoped storage key
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (!session) {
      try {
        localStorage.setItem("mp_theme_guest", theme);
      } catch {}
      return;
    }
    const userKey = getThemeStorageKey(session);
    try {
      localStorage.setItem(userKey, theme);
    } catch {
      // ignore
    }
  }, [theme, session?.id]);

  useEffect(() => {
    if (!getToken()) return;
    api.me()
      .then((data) => setSession(data.user))
      .catch((err) => {
        clearToken();
        if (err?.message) {
          setError(err.message);
        }
      });
  }, [refreshKey]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (roleName(session) === "top_admin") {
      setBranches([]);
      setModels([]);
      setParties([]);
      setProducts([]);
      return;
    }

    Promise.all([api.branches(), api.models(), api.parties(), api.products().catch(() => [])])
      .then(([branchRows, modelRows, partyRows, productRows]) => {
        setBranches(branchRows);
        setModels(modelRows);
        setParties(partyRows);
        setProducts(productRows || []);
      })
      .catch((loadError) => setError(loadError.message));
  }, [session, refreshKey]);

  const hasThemeAccess = canUseTheme(session);

  const handleSelectTheme = (newTheme) => {
    if (!hasThemeAccess) {
      setError("Theme selection is restricted to subscription packages with Theme Customization. Please upgrade your package.");
      return;
    }
    setTheme(newTheme);
  };

  const handleCycleTheme = () => {
    if (!hasThemeAccess) {
      setError("Theme selection is restricted to subscription packages with Theme Customization. Please upgrade your package.");
      return;
    }
    const idx = THEMES.findIndex((t) => t.key === theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next.key);
  };

  const userRole = roleName(session);
  const isTopAdmin = userRole === "top_admin";
  const isCompanyAdmin = ["business_super_admin", "admin"].includes(userRole);
  const isBranchPortal = !isTopAdmin && !isCompanyAdmin;

  const handleSwitchBranch = (newBranchId) => {
    const selected = branches.find((b) => String(b.id) === String(newBranchId));
    if (selected) {
      const isBranchExp =
        selected.is_expired ||
        selected.isExpired ||
        selected.effective_status === "expired" ||
        selected.subscription_status === "expired";
      if (isBranchExp) {
        setError(`Branch "${selected.name}" subscription is expired and cannot be selected.`);
        return;
      }
      setSession((prev) => ({
        ...prev,
        branch_id: selected.id,
        branchId: selected.id,
        branch_name: selected.name,
        branchName: selected.name,
        branch_code: selected.code,
        branchCode: selected.code
      }));
    }
  };

  // When on branch manager/cashier portal, only show branches in drop down list which he is allocated to
  const allocatedBranches = useMemo(() => {
    if (isTopAdmin || isCompanyAdmin) return branches;
    const userAllocatedBranchId = session?.branch_id || session?.branchId;
    if (userAllocatedBranchId) {
      const matched = branches.filter((b) => Number(b.id) === Number(userAllocatedBranchId));
      if (matched.length > 0) return matched;
      return [
        {
          id: userAllocatedBranchId,
          name: session?.branch_name || session?.branchName || "Assigned Branch",
          code: session?.branch_code || session?.branchCode || ""
        }
      ];
    }
    return branches;
  }, [branches, session, isTopAdmin, isCompanyAdmin]);

  const canSwitchBranch = useMemo(() => {
    return isBranchPortal && allocatedBranches && allocatedBranches.length > 1;
  }, [isBranchPortal, allocatedBranches]);

  const currentBranchId = useMemo(() => {
    if (session?.branch_id || session?.branchId) return session?.branch_id || session?.branchId;
    if (allocatedBranches && allocatedBranches.length > 0) return allocatedBranches[0].id;
    return null;
  }, [session, allocatedBranches]);

  const currentBranchName = useMemo(() => {
    if (session?.branch_name) return session.branch_name;
    if (session?.branchName) return session.branchName;
    if (currentBranchId) {
      const found = allocatedBranches.find((b) => Number(b.id) === Number(currentBranchId));
      if (found) return found.name;
    }
    if (allocatedBranches.length === 1) return allocatedBranches[0].name;
    if (allocatedBranches.length > 1) return allocatedBranches[0].name;
    return isTopAdmin ? "All Tenants" : "Main Branch";
  }, [session, currentBranchId, allocatedBranches, isTopAdmin]);

  const companyName = session?.business_name || session?.businessName || (isTopAdmin ? "SaaS Top Admin" : "Company");
  const companyCode = session?.business_code || session?.businessCode || (isTopAdmin ? "ROOT" : "");
  const companyLogo = session?.business_logo || session?.logo_url || session?.businessLogo || null;

  if (typeof window !== "undefined") {
    window.__POS_COMPANY_NAME__ = companyName;
    window.__POS_COMPANY_LOGO__ = companyLogo;
  }

  const context = useMemo(
    () => ({
      session,
      companyName,
      companyLogo,
      branches: allocatedBranches,
      models,
      setModels,
      parties,
      products,
      setProducts,
      theme,
      setTheme: handleSelectTheme,
      hasThemeAccess,
      language,
      isRtl,
      t,
      formatCurrency,
      canUseTheme: () => hasThemeAccess,
      can: (pageKey, actionKey = "view") => canUse(session, pageKey, actionKey),
      refreshAll: () => setRefreshKey((value) => value + 1),
      switchBranch: handleSwitchBranch,
      error,
      setError,
      clearError: () => setError("")
    }),
    [session, companyName, companyLogo, allocatedBranches, models, parties, products, setProducts, theme, hasThemeAccess, error, language]
  );

  const [topNavParams, setTopNavParams] = useState({});

  // Availing package(s) information for the sidebar
  const availedPackages = useMemo(() => {
    if (isTopAdmin) {
      return [
        {
          name: "SaaS Platform Owner",
          statusLabel: "Master",
          statusClass: "status-success",
          branchCount: 0
        }
      ];
    }

    if (branches && branches.length > 0) {
      const planMap = new Map();
      branches.forEach((b) => {
        const pName = b.plan_name || session?.subscriptionPlan?.name || "Starter Monthly";
        const effectiveStatus = b.effective_status || b.subscription_status || "active";
        if (planMap.has(pName)) {
          const item = planMap.get(pName);
          item.branchCount += 1;
        } else {
          let statusLabel = "Active";
          let statusClass = "status-success";
          if (effectiveStatus === "trialing") {
            statusLabel = "Trial";
            statusClass = "status-info";
          } else if (effectiveStatus === "grace") {
            statusLabel = "Grace";
            statusClass = "status-warning";
          } else if (effectiveStatus === "expired" || effectiveStatus === "suspended") {
            statusLabel = "Expired";
            statusClass = "status-danger";
          } else if (b.days_left !== null && b.days_left <= 7 && b.days_left >= 0) {
            statusLabel = `${b.days_left}d left`;
            statusClass = "status-warning";
          }
          planMap.set(pName, {
            name: pName,
            statusLabel,
            statusClass,
            branchCount: 1
          });
        }
      });
      return Array.from(planMap.values());
    }

    const defaultPlanName = session?.subscriptionPlan?.name || "Starter Monthly";
    const status = session?.subscriptionPlan?.status || "active";
    let statusLabel = "Active";
    let statusClass = "status-success";
    if (status === "trialing") {
      statusLabel = "Trial";
      statusClass = "status-info";
    } else if (status === "expired" || status === "suspended") {
      statusLabel = "Expired";
      statusClass = "status-danger";
    } else if (session?.subscriptionPlan?.daysLeft !== null && session?.subscriptionPlan?.daysLeft <= 7 && session?.subscriptionPlan?.daysLeft >= 0) {
      statusLabel = `${session.subscriptionPlan.daysLeft}d left`;
      statusClass = "status-warning";
    }

    return [
      {
        name: defaultPlanName,
        statusLabel,
        statusClass,
        branchCount: 1
      }
    ];
  }, [isTopAdmin, session, branches]);

  // Automatically clear error notifications on tab/page change
  useEffect(() => {
    setError("");
  }, [activeTab]);

  // Auto-dismiss errors after timeout
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError("");
    }, 8000);
    return () => clearTimeout(timer);
  }, [error]);

  // User profile & logout confirmation
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user panel when clicking elsewhere on the page
  useEffect(() => {
    if (!userDropdownOpen) return;
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [userDropdownOpen]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ fullName: "", email: "", password: "" });
  const [editProfileError, setEditProfileError] = useState("");
  const [editProfileSuccess, setEditProfileSuccess] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifBellRef = useRef(null);

  // Fetch notifications periodically
  useEffect(() => {
    if (!session || isTopAdmin) return;
    const fetchNotifications = () => {
      api.notifications()
        .then((data) => {
          const items = Array.isArray(data) ? data : (data?.notifications || data?.rows || []);
          setNotifications(items);
        })
        .catch(() => {});
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [session, isTopAdmin]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    if (!notifDropdownOpen) return;
    function handleClickOutside(event) {
      if (notifBellRef.current && !notifBellRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [notifDropdownOpen]);

  const unreadNotifCount = notifications.filter(n => !n.is_read && !n.isRead).length;

  function handleMarkNotifRead(notif) {
    if (notif.is_read || notif.isRead) return;
    api.markNotificationRead(notif.id)
      .then(() => {
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, is_read: 1, isRead: 1 } : n)
        );
      })
      .catch(() => {});
  }

  function handleMarkAllRead() {
    const unread = notifications.filter(n => !n.is_read && !n.isRead);
    Promise.all(unread.map(n => api.markNotificationRead(n.id).catch(() => {})))
      .then(() => {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: 1, isRead: 1 }))
        );
      });
  }

  function handleOpenEditProfile() {
    setEditProfileError("");
    setEditProfileSuccess("");
    setEditProfileForm({
      fullName: session?.full_name || session?.fullName || "",
      email: session?.email || "",
      password: ""
    });
    setUserDropdownOpen(false);
    setShowEditProfileModal(true);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setEditProfileError("");
    setEditProfileSuccess("");
    setIsSavingProfile(true);
    try {
      const payload = { fullName: editProfileForm.fullName.trim() };
      if (editProfileForm.password && editProfileForm.password.trim()) {
        payload.password = editProfileForm.password.trim();
      }
      const res = await api.updateProfile(payload);
      setSession(res.user);
      setEditProfileSuccess("Profile updated successfully!");
      setTimeout(() => {
        setShowEditProfileModal(false);
        setEditProfileSuccess("");
      }, 1200);
    } catch (err) {
      setEditProfileError(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleConfirmLogout() {
    setShowLogoutConfirm(false);
    handleLogout();
  }

  function handleTopNavigate(tabKey, params = {}) {
    setError("");
    setTopNavParams(params);
    setActiveTab(tabKey);
  }

  const [adminMenuOpen, setAdminMenuOpen] = useState(() => {
    return activeTab === "admin" || activeTab.startsWith("admin_");
  });

  const isAdminActive = activeTab === "admin" || activeTab.startsWith("admin_");
  const activeAdminSub = activeTab.startsWith("admin_") ? activeTab.replace("admin_", "") : "branches";

  useEffect(() => {
    if (isAdminActive) {
      setAdminMenuOpen(true);
    }
  }, [isAdminActive]);

  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(() => {
    return activeTab === "employees" || activeTab.startsWith("employees_");
  });

  const isEmployeeActive = activeTab === "employees" || activeTab.startsWith("employees_");
  const activeEmployeeSub = activeTab.startsWith("employees_") ? activeTab.replace("employees_", "") : "attendance";

  useEffect(() => {
    if (isEmployeeActive) {
      setEmployeeMenuOpen(true);
    }
  }, [isEmployeeActive]);

  const [reportMenuOpen, setReportMenuOpen] = useState(() => {
    return activeTab === "reports" || activeTab.startsWith("reports_");
  });

  const isReportActive = activeTab === "reports" || activeTab.startsWith("reports_");
  const activeReportSub = activeTab.startsWith("reports_") ? activeTab.replace("reports_", "") : "pnl";

  useEffect(() => {
    if (isReportActive) {
      setReportMenuOpen(true);
    }
  }, [isReportActive]);

  const visibleTabs = useMemo(() => {
    return getVisibleTabs(session);
  }, [session]);

  const localizedTabs = useMemo(() => {
    return visibleTabs.map((tab) => {
      const translatedLabel = t(`nav.${tab.key}`, tab.label);
      let translatedSubItems = tab.subItems;
      if (tab.subItems) {
        translatedSubItems = tab.subItems.map((sub) => ({
          ...sub,
          label: t(`nav.${sub.key}`, sub.label)
        }));
      }
      return {
        ...tab,
        label: translatedLabel,
        subItems: translatedSubItems
      };
    });
  }, [visibleTabs, t, language]);

  const branchSubscriptionAlerts = useMemo(() => {
    if (!branches || !branches.length) return [];
    return branches.filter(
      (b) =>
        b.is_expired ||
        b.effective_status === "expired" ||
        b.is_grace ||
        b.effective_status === "grace"
    );
  }, [branches]);

  useEffect(() => {
    if (
      session &&
      visibleTabs.length &&
      !visibleTabs.some(
        (tab) =>
          tab.key === activeTab ||
          (tab.key === "admin" && activeTab.startsWith("admin_")) ||
          (!isCompanyAdmin && tab.key === "employees" && activeTab.startsWith("employees_")) ||
          (tab.key === "reports" && activeTab.startsWith("reports_")) ||
          (["purchases", "sales", "expenses"].includes(activeTab) && canUse(session, activeTab))
      )
    ) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [activeTab, session, visibleTabs, isCompanyAdmin]);

  // When a parent menu key is selected directly, land on its first sub-page
  useEffect(() => {
    if (activeTab === "admin") {
      setActiveTab("admin_branches");
    } else if (activeTab === "reports") {
      setActiveTab("reports_pnl");
    } else if (activeTab === "employees") {
      setActiveTab("employees_attendance");
    }
  }, [activeTab]);

  const activeTabItem = useMemo(() => {
    if (activeTab.startsWith("admin_")) {
      const sub = ADMIN_SUB_PAGES.find((s) => s.key === activeTab);
      if (sub) {
        return { key: sub.key, label: `${t("nav.admin", "Admin")}: ${t(`nav.${sub.key}`, sub.label)}`, icon: sub.icon };
      }
    }
    if (activeTab.startsWith("employees_")) {
      const sub = EMPLOYEE_SUB_PAGES.find((s) => s.key === activeTab);
      if (sub) {
        return { key: sub.key, label: `${t("nav.employees", "Salaries & Payroll")}: ${t(`nav.${sub.key}`, sub.label)}`, icon: sub.icon };
      }
    }
    if (activeTab.startsWith("reports_")) {
      const sub = REPORT_SUB_PAGES.find((s) => s.key === activeTab);
      if (sub) {
        return { key: sub.key, label: `${t("nav.reports", "Reports")}: ${t(`nav.${sub.key}`, sub.label)}`, icon: sub.icon };
      }
    }
    const found = visibleTabs.find((t) => t.key === activeTab) || visibleTabs[0] || tabs[0];
    return { ...found, label: t(`nav.${found.key}`, found.label) };
  }, [activeTab, visibleTabs, t, language]);

  const pageBreadcrumb = useMemo(() => {
    // 1. Admin subpages
    if (activeTab === "admin" || activeTab.startsWith("admin_")) {
      const subKey = activeTab.startsWith("admin_") ? activeTab : `admin_${activeAdminSub || "branches"}`;
      const sub = ADMIN_SUB_PAGES.find((s) => s.key === subKey) || ADMIN_SUB_PAGES[0];
      return {
        parent: t("nav.admin", "Admin"),
        parentIcon: "⚙️",
        current: t(`nav.${sub.key}`, sub.label),
        currentIcon: sub.icon,
        isNested: true
      };
    }

    // 2. Employees / Salaries subpages
    if (activeTab === "employees" || activeTab.startsWith("employees_")) {
      const subKey = activeTab.startsWith("employees_") ? activeTab : `employees_${activeEmployeeSub || "attendance"}`;
      const sub = EMPLOYEE_SUB_PAGES.find((s) => s.key === subKey) || EMPLOYEE_SUB_PAGES[0];
      return {
        parent: t("nav.employees", "Salaries & Payroll"),
        parentIcon: "💵",
        current: t(`nav.${sub.key}`, sub.label),
        currentIcon: sub.icon,
        isNested: true
      };
    }

    // 3. Reports subpages
    if (activeTab === "reports" || activeTab.startsWith("reports_")) {
      const subKey = activeTab.startsWith("reports_") ? activeTab : `reports_${activeReportSub || "pnl"}`;
      const sub = REPORT_SUB_PAGES.find((s) => s.key === subKey) || REPORT_SUB_PAGES[0];
      return {
        parent: t("nav.reports", "Reports"),
        parentIcon: "📈",
        current: t(`nav.${sub.key}`, sub.label),
        currentIcon: sub.icon,
        isNested: true
      };
    }

    // 4. SaaS Top Admin tabs
    if (isTopAdmin) {
      const topTab = TOP_ADMIN_TABS.find((t) => t.key === activeTab);
      if (topTab) {
        return {
          parent: t("nav.top_dashboard", "SaaS Platform"),
          parentIcon: "🛡️",
          current: t(`nav.${topTab.key}`, topTab.label),
          currentIcon: topTab.icon,
          isNested: true
        };
      }
    }

    // 5. Standard single-level operational pages
    const currentTab = tabs.find((t) => t.key === activeTab) || tabs[0];
    return {
      parent: null,
      parentIcon: null,
      current: t(`nav.${currentTab.key}`, currentTab.label),
      currentIcon: currentTab?.icon || "📄",
      isNested: false
    };
  }, [activeTab, activeAdminSub, activeEmployeeSub, activeReportSub, isTopAdmin, t, language]);

  async function handleLogin(credentials) {
    setError("");
    setSubscriptionExpiredData(null);
    const result = await api.login(credentials);
    if (result?.mfaRequired || result?.mfaSetupRequired) {
      return result;
    }
    setToken(result.token);
    setSession(result.user);
    return result;
  }

  function handleCompleteLogin(loginResult) {
    setError("");
    setSubscriptionExpiredData(null);
    setToken(loginResult.token);
    setSession(loginResult.user);
  }

  function handleGoToLogin() {
    try {
      window.location.hash = "login";
    } catch {}
    setGuestView("login");
  }

  function handleBackToLanding() {
    try {
      window.location.hash = "";
    } catch {}
    setGuestView("landing");
  }

  function handleLogout() {
    clearToken();
    setSession(null);
    setSubscriptionExpiredData(null);
    setSessionExpiredData(null);
    try {
      window.location.hash = "";
    } catch {}
    setGuestView("landing");
  }

  function handleSessionExpiredOk() {
    setSessionExpiredData(null);
    clearToken();
    setSession(null);
    setSubscriptionExpiredData(null);
    setError("");
    try {
      if (typeof window !== "undefined") {
        window.location.hash = "login";
        if (window.location.pathname !== "/" && window.location.pathname !== "/login") {
          window.history.replaceState(null, "", "/#login");
        }
      }
    } catch {}
    setGuestView("login");
  }

  if (!session) {
    return (
      <>
        {guestView === "login" ? (
          <LoginPage
            onLogin={handleLogin}
            onCompleteLogin={handleCompleteLogin}
            error={error}
            onBackToLanding={handleBackToLanding}
          />
        ) : (
          <LandingPage
            onGoToLogin={handleGoToLogin}
            onQuickDemoLogin={handleLogin}
          />
        )}
        {sessionExpiredData && (
          <SessionExpiredModal
            message={sessionExpiredData.message}
            onOk={handleSessionExpiredOk}
          />
        )}
      </>
    );
  }

  // Branch Subscription Expired check for branch users
  const isBranchExpired =
    !isTopAdmin &&
    !isCompanyAdmin &&
    (subscriptionExpiredData !== null ||
      session?.subscriptionPlan?.isExpired ||
      session?.subscriptionPlan?.status === "expired" ||
      (currentBranchId &&
        branches.some(
          (b) =>
            Number(b.id) === Number(currentBranchId) &&
            (b.is_expired || b.isExpired || b.effective_status === "expired" || b.subscription_status === "expired")
        )));

  if (isBranchExpired) {
    const expiredOn =
      subscriptionExpiredData?.expiredOn ||
      session?.subscriptionPlan?.expiredOn ||
      session?.subscriptionPlan?.currentPeriodEndsOn ||
      (currentBranchId && branches.find((b) => Number(b.id) === Number(currentBranchId))?.current_period_ends_on);
    const branchInfo = subscriptionExpiredData?.branch || {
      id: currentBranchId,
      name: currentBranchName,
      code: session?.branch_code || session?.branchCode || ""
    };

    return (
      <>
        <BranchSubscriptionExpiredScreen
          branch={branchInfo}
          expiredOn={expiredOn}
          onLogout={handleLogout}
        />
        {sessionExpiredData && (
          <SessionExpiredModal
            message={sessionExpiredData.message}
            onOk={handleSessionExpiredOk}
          />
        )}
      </>
    );
  }

  const LayoutShell = isModernCompact ? ModernLayout : ClassicLayout;

  return (
    <>
      <LayoutShell
        session={session}
        companyName={companyName}
        companyCode={companyCode}
        companyLogo={companyLogo}
        isTopAdmin={isTopAdmin}
        isCompanyAdmin={isCompanyAdmin}
        isBranchPortal={isBranchPortal}
        canSwitchBranch={canSwitchBranch}
        currentBranchId={currentBranchId}
        currentBranchName={currentBranchName}
        branches={allocatedBranches}
        handleSwitchBranch={handleSwitchBranch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setError={setError}
        tabs={localizedTabs}
        pageBreadcrumb={pageBreadcrumb}
        theme={theme}
        hasThemeAccess={hasThemeAccess}
        handleCycleTheme={handleCycleTheme}
        handleSelectTheme={handleSelectTheme}
        THEMES={THEMES}
        notifications={notifications}
        unreadNotifCount={unreadNotifCount}
        notifDropdownOpen={notifDropdownOpen}
        setNotifDropdownOpen={setNotifDropdownOpen}
        notifBellRef={notifBellRef}
        handleMarkAllRead={handleMarkAllRead}
        handleMarkNotifRead={handleMarkNotifRead}
        userDropdownOpen={userDropdownOpen}
        setUserDropdownOpen={setUserDropdownOpen}
        userMenuRef={userMenuRef}
        handleOpenEditProfile={handleOpenEditProfile}
        setShowMfaModal={setShowMfaModal}
        setShowLogoutConfirm={setShowLogoutConfirm}
        availedPackages={availedPackages}
      >
          {error ? (
            <div
              className="alert error"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {(error.toLowerCase().includes("session") && (error.toLowerCase().includes("expired") || error.toLowerCase().includes("login"))) ? (
                  <button
                    type="button"
                    className="primary-btn btn-sm"
                    onClick={handleSessionExpiredOk}
                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem", background: "#ef4444", borderColor: "#dc2626" }}
                  >
                    OK
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (error.toLowerCase().includes("session") && (error.toLowerCase().includes("expired") || error.toLowerCase().includes("login"))) {
                      handleSessionExpiredOk();
                    } else {
                      setError("");
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    padding: "0 0.5rem",
                    lineHeight: 1
                  }}
                  title="Dismiss"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : null}
          {/* Expiring Soon Warning Banner for Branch Users */}
          {session?.subscriptionPlan?.isExpiringSoon && !isTopAdmin && !isCompanyAdmin && (
            <div
              className="alert-banner alert-warning"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
                padding: "0.85rem 1.25rem",
                borderRadius: "10px"
              }}
            >
              <span style={{ fontSize: "1.3rem" }}>⚠️</span>
              <div>
                <strong>Subscription Expiring Soon:</strong> This branch's subscription expires on{" "}
                {session.subscriptionPlan.currentPeriodEndsOn || `${session.subscriptionPlan.daysLeft} days`}.
              </div>
            </div>
          )}
          {/* Branch-Specific Subscription Alert Notice for Company Admin */}
          {branchSubscriptionAlerts.length > 0 && ["business_super_admin", "admin"].includes(roleName(session)) && (
            <div
              className="alert-banner alert-warning"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1rem",
                padding: "0.85rem 1.25rem",
                borderRadius: "10px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.3rem" }}>⚠️</span>
                <div>
                  <strong style={{ display: "block", marginBottom: "2px" }}>
                    Branch Subscription Notice ({branchSubscriptionAlerts.length} branch{branchSubscriptionAlerts.length > 1 ? "es" : ""}):
                  </strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                    {branchSubscriptionAlerts.map((b) => (
                      <span
                        key={b.id}
                        className="badge"
                        style={{
                          background: b.effective_status === "expired" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: b.effective_status === "expired" ? "#ef4444" : "#f59e0b",
                          border: `1px solid ${b.effective_status === "expired" ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "0.82rem"
                        }}
                      >
                        🏢 {b.name} ({b.code}) — {b.effective_status === "expired" ? "Subscription Expired" : "Grace Period"}
                      </span>
                    ))}
                    <span className="small muted" style={{ marginLeft: "4px" }}>
                      Other active store branches continue operating normally.
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="secondary-btn btn-sm"
                style={{ whiteSpace: "nowrap" }}
                onClick={() => {
                  setActiveTab("admin_branches");
                }}
              >
                Manage Branches →
              </button>
            </div>
          )}
          {activeTab === "top_dashboard" ? (
            <TopDashboard context={context} onNavigate={handleTopNavigate} />
          ) : null}
          {activeTab === "top_businesses" ? (
            <TopBusinessesPage
              context={context}
              initialView={topNavParams.view || "companies"}
              initialStatus={topNavParams.status || "all"}
              onNavigate={handleTopNavigate}
            />
          ) : null}
          {activeTab === "top_packages" || activeTab === "top_package_access" ? (
            <TopPackagesPage context={context} initialView="packages" />
          ) : null}
          {activeTab === "top_subscriptions" ? (
            <TopPackagesPage context={context} initialView="subscriptions" />
          ) : null}
          {activeTab === "top_payments" ? (
            <TopPaymentsPage
              context={context}
              initialStatus={topNavParams.status || "all"}
            />
          ) : null}
          {activeTab === "top_saas_admins" ? (
            <TopSaasAdminsPage
              context={context}
              onOpenMfaSetup={() => setShowMfaModal(true)}
            />
          ) : null}
          {activeTab === "top_admins" ? (
            <TopAdminsPage
              context={context}
              initialBusinessId={topNavParams.businessId || ""}
              onOpenMfaSetup={() => setShowMfaModal(true)}
            />
          ) : null}
          {activeTab === "top_deleted_transactions" ? (
            <TopDeletedTransactionsPage context={context} />
          ) : null}
          {activeTab === "top_login_logs" ? (
            <TopLoginLogsPage context={context} />
          ) : null}
          {activeTab === "top_settings" ? (
            <TopSettingsPage context={context} />
          ) : null}
          {activeTab === "dashboard" ? <DashboardPage context={context} /> : null}
          {activeTab === "purchases" && canUse(session, "purchases") ? <PurchasesPage context={context} /> : null}
          {activeTab === "sales" && canUse(session, "sales") ? <SalesPage context={context} /> : null}
          {activeTab === "cash_register" && !isCompanyAdmin && canUse(session, "cash_register") ? <CashRegisterPage context={context} /> : null}
          {activeTab === "inventory" && !isCompanyAdmin && canUse(session, "inventory") ? <InventoryPage context={context} /> : null}
          {activeTab === "parties" && !isCompanyAdmin && canUse(session, "parties") ? <PartiesPage context={context} /> : null}
          {activeTab === "expenses" && canUse(session, "expenses") ? <ExpensesPage context={context} /> : null}
          {activeTab === "invoices" && !isCompanyAdmin && canUse(session, "invoices") ? <InvoicesPage context={context} /> : null}
          {activeTab === "repairs" && !isCompanyAdmin && canUse(session, "repairs") ? <RepairsPage context={context} /> : null}
          {isEmployeeActive && !isCompanyAdmin && canUse(session, "employees") ? (
            <EmployeesPage
              context={context}
              activeSubPage={activeEmployeeSub}
              onNavigateSubPage={(subKey) => {
                setError("");
                setActiveTab(`employees_${subKey}`);
              }}
            />
          ) : null}
          {isReportActive ? (
            <ReportsPage
              context={context}
              activeSubPage={activeReportSub}
              onNavigateSubPage={(subKey) => {
                setError("");
                setActiveTab(`reports_${subKey}`);
              }}
            />
          ) : null}
          {isAdminActive ? (
            <AdminPage
              context={context}
              activeSubPage={activeAdminSub}
              onNavigateSubPage={(subKey) => {
                setError("");
                setActiveTab(`admin_${subKey}`);
              }}
            />
          ) : null}
      </LayoutShell>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="modal-backdrop" onClick={() => !isSavingProfile && setShowEditProfileModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveProfile}>
              <div className="modal-header">
                <h3>Edit Profile</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSavingProfile}
                  onClick={() => setShowEditProfileModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid modal-compact-form">
                {editProfileError && <div className="alert error full-span">{editProfileError}</div>}
                {editProfileSuccess && <div className="alert success full-span">{editProfileSuccess}</div>}

                <label className="full-span">
                  <span>Full Name *</span>
                  <input
                    type="text"
                    value={editProfileForm.fullName}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, fullName: e.target.value })}
                    required
                  />
                </label>

                <label className="full-span">
                  <span>Email Address (Account Login)</span>
                  <input
                    type="email"
                    value={editProfileForm.email}
                    disabled
                    readOnly
                    title="Email address cannot be changed after account creation"
                    style={{ opacity: 0.75, cursor: "not-allowed" }}
                  />
                  <small className="muted" style={{ fontSize: "0.76rem", marginTop: "0.25rem", display: "block" }}>
                    Email address cannot be changed once login credentials have been created.
                  </small>
                </label>

                <label className="full-span">
                  <span>New Password (optional)</span>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={editProfileForm.password}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, password: e.target.value })}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSavingProfile}
                  onClick={() => setShowEditProfileModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSavingProfile}>
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h3>Confirm Logout</h3>
              <button type="button" className="close-btn" onClick={() => setShowLogoutConfirm(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🚪</div>
              <h4 style={{ margin: "0 0 0.5rem 0" }}>Do you want to perform this?</h4>
              <p className="muted" style={{ margin: 0, fontSize: "0.95rem" }}>
                Are you sure you want to log out of your session, <strong>{session.full_name || session.fullName}</strong>?
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{ background: "#ef4444", borderColor: "#dc2626" }}
                onClick={handleConfirmLogout}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Factor Authentication (2FA/MFA) Setup & Management Modal */}
      {showMfaModal && (
        <MfaSetupModal
          isOpen={showMfaModal}
          onClose={() => setShowMfaModal(false)}
          user={session}
          onMfaUpdated={(enabled) => {
            setSession((prev) => ({
              ...prev,
              mfa_enabled: enabled ? 1 : 0,
              mfaEnabled: Boolean(enabled)
            }));
          }}
        />
      )}

      {/* Session Expired Modal (All portals: SaaS Admin, Company Admin, Manager, Cashier) */}
      {sessionExpiredData && (
        <SessionExpiredModal
          message={sessionExpiredData.message}
          onOk={handleSessionExpiredOk}
        />
      )}
    </>
  );
}

export function App() {
  return (
    <LayoutProvider>
      <AppContent />
    </LayoutProvider>
  );
}

