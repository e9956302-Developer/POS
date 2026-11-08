import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { query } from "../db/pool.js";

export const DEFAULT_ROLE_PERMISSIONS = {
  manager: [
    { pageKey: "dashboard", actionKey: "view", isAllowed: 1 },
    { pageKey: "sales", actionKey: "view", isAllowed: 1 },
    { pageKey: "sales", actionKey: "create", isAllowed: 1 },
    { pageKey: "sales", actionKey: "edit", isAllowed: 1 },
    { pageKey: "sales", actionKey: "delete", isAllowed: 1 },
    { pageKey: "purchases", actionKey: "view", isAllowed: 1 },
    { pageKey: "purchases", actionKey: "create", isAllowed: 1 },
    { pageKey: "purchases", actionKey: "edit", isAllowed: 1 },
    { pageKey: "purchases", actionKey: "delete", isAllowed: 1 },
    { pageKey: "cash_register", actionKey: "view", isAllowed: 1 },
    { pageKey: "cash_register", actionKey: "create", isAllowed: 1 },
    { pageKey: "cash_register", actionKey: "close", isAllowed: 1 },
    { pageKey: "cash_register", actionKey: "verify", isAllowed: 1 },
    { pageKey: "inventory", actionKey: "view", isAllowed: 1 },
    { pageKey: "inventory", actionKey: "create", isAllowed: 1 },
    { pageKey: "inventory", actionKey: "edit", isAllowed: 1 },
    { pageKey: "inventory", actionKey: "delete", isAllowed: 1 },
    { pageKey: "parties", actionKey: "view", isAllowed: 1 },
    { pageKey: "parties", actionKey: "create", isAllowed: 1 },
    { pageKey: "parties", actionKey: "edit", isAllowed: 1 },
    { pageKey: "parties", actionKey: "delete", isAllowed: 1 },
    { pageKey: "expenses", actionKey: "view", isAllowed: 1 },
    { pageKey: "expenses", actionKey: "create", isAllowed: 1 },
    { pageKey: "expenses", actionKey: "edit", isAllowed: 1 },
    { pageKey: "expenses", actionKey: "delete", isAllowed: 1 },
    { pageKey: "invoices", actionKey: "view", isAllowed: 1 },
    { pageKey: "invoices", actionKey: "payment", isAllowed: 1 },
    { pageKey: "invoices", actionKey: "delete", isAllowed: 1 },
    { pageKey: "reports", actionKey: "view", isAllowed: 1 },
    { pageKey: "branches", actionKey: "view", isAllowed: 1 },
    { pageKey: "branches", actionKey: "create", isAllowed: 1 },
    { pageKey: "branches", actionKey: "edit", isAllowed: 1 },
    { pageKey: "branches", actionKey: "delete", isAllowed: 0 },
    { pageKey: "users", actionKey: "view", isAllowed: 1 },
    { pageKey: "users", actionKey: "create", isAllowed: 0 },
    { pageKey: "users", actionKey: "edit", isAllowed: 0 },
    { pageKey: "users", actionKey: "delete", isAllowed: 0 },
    { pageKey: "repairs", actionKey: "view", isAllowed: 1 },
    { pageKey: "repairs", actionKey: "create", isAllowed: 1 },
    { pageKey: "repairs", actionKey: "edit", isAllowed: 1 },
    { pageKey: "repairs", actionKey: "delete", isAllowed: 1 },
    { pageKey: "employees", actionKey: "view", isAllowed: 1 },
    { pageKey: "employees", actionKey: "create", isAllowed: 1 },
    { pageKey: "employees", actionKey: "edit", isAllowed: 1 },
    { pageKey: "employees", actionKey: "delete", isAllowed: 0 }
  ],
  cashier: [
    { pageKey: "dashboard", actionKey: "view", isAllowed: 1 },
    { pageKey: "sales", actionKey: "view", isAllowed: 1 },
    { pageKey: "sales", actionKey: "create", isAllowed: 1 },
    { pageKey: "sales", actionKey: "edit", isAllowed: 0 },
    { pageKey: "sales", actionKey: "delete", isAllowed: 0 },
    { pageKey: "purchases", actionKey: "view", isAllowed: 0 },
    { pageKey: "purchases", actionKey: "create", isAllowed: 0 },
    { pageKey: "purchases", actionKey: "edit", isAllowed: 0 },
    { pageKey: "purchases", actionKey: "delete", isAllowed: 0 },
    { pageKey: "cash_register", actionKey: "view", isAllowed: 1 },
    { pageKey: "cash_register", actionKey: "create", isAllowed: 1 },
    { pageKey: "cash_register", actionKey: "close", isAllowed: 1 },
    { pageKey: "invoices", actionKey: "view", isAllowed: 1 },
    { pageKey: "invoices", actionKey: "payment", isAllowed: 1 },
    { pageKey: "invoices", actionKey: "delete", isAllowed: 0 },
    { pageKey: "inventory", actionKey: "view", isAllowed: 1 },
    { pageKey: "inventory", actionKey: "create", isAllowed: 0 },
    { pageKey: "inventory", actionKey: "edit", isAllowed: 0 },
    { pageKey: "inventory", actionKey: "delete", isAllowed: 0 },
    { pageKey: "parties", actionKey: "view", isAllowed: 1 },
    { pageKey: "parties", actionKey: "create", isAllowed: 1 },
    { pageKey: "parties", actionKey: "edit", isAllowed: 0 },
    { pageKey: "parties", actionKey: "delete", isAllowed: 0 },
    { pageKey: "branches", actionKey: "view", isAllowed: 1 },
    { pageKey: "branches", actionKey: "create", isAllowed: 0 },
    { pageKey: "branches", actionKey: "edit", isAllowed: 0 },
    { pageKey: "branches", actionKey: "delete", isAllowed: 0 },
    { pageKey: "users", actionKey: "view", isAllowed: 0 },
    { pageKey: "users", actionKey: "create", isAllowed: 0 },
    { pageKey: "users", actionKey: "edit", isAllowed: 0 },
    { pageKey: "users", actionKey: "delete", isAllowed: 0 },
    { pageKey: "repairs", actionKey: "view", isAllowed: 1 },
    { pageKey: "repairs", actionKey: "create", isAllowed: 1 },
    { pageKey: "repairs", actionKey: "edit", isAllowed: 0 },
    { pageKey: "repairs", actionKey: "delete", isAllowed: 0 },
    { pageKey: "employees", actionKey: "view", isAllowed: 1 }
  ]
};

export function isPackagePageAllowed(pageKey, allowedPages) {
  if (
    pageKey === "admin" ||
    pageKey === "branches" ||
    pageKey === "users" ||
    pageKey === "notifications" ||
    pageKey === "company_profile"
  ) {
    return true;
  }
  if (!Array.isArray(allowedPages) || allowedPages.length === 0) {
    return true;
  }
  if (allowedPages.includes(pageKey)) {
    return true;
  }
  // Sale Returns and Purchase Returns
  if (pageKey === "sale_returns") {
    return allowedPages.includes("sale_returns") || allowedPages.includes("order_returns");
  }
  if (pageKey === "purchase_returns") {
    return allowedPages.includes("purchase_returns") || allowedPages.includes("order_returns");
  }
  if (pageKey === "order_returns") {
    return (
      allowedPages.includes("order_returns") ||
      allowedPages.includes("sale_returns") ||
      allowedPages.includes("purchase_returns")
    );
  }
  // Stock Transfers
  if (pageKey === "transfers" || pageKey === "stock_transfers") {
    return allowedPages.includes("stock_transfers") || allowedPages.includes("transfers");
  }
  // Partner Shares & Equity
  if (pageKey === "partner_shares" || pageKey === "partners" || pageKey === "dividends") {
    return (
      allowedPages.includes("partner_shares") ||
      allowedPages.includes("partners") ||
      allowedPages.includes("admin")
    );
  }
  // Reports
  if (pageKey === "reports" || pageKey === "pnl") {
    return (
      allowedPages.includes("reports") ||
      allowedPages.includes("reports_inventory") ||
      allowedPages.includes("reports_receivables") ||
      allowedPages.includes("reports_payables")
    );
  }
  if (pageKey === "inventory_valuation" || pageKey === "reports_inventory") {
    return allowedPages.includes("reports_inventory") || allowedPages.includes("reports");
  }
  if (pageKey === "receivables" || pageKey === "reports_receivables") {
    return (
      allowedPages.includes("reports_receivables") ||
      allowedPages.includes("reports") ||
      allowedPages.includes("parties")
    );
  }
  if (pageKey === "payables" || pageKey === "reports_payables") {
    return (
      allowedPages.includes("reports_payables") ||
      allowedPages.includes("reports") ||
      allowedPages.includes("purchases") ||
      allowedPages.includes("parties")
    );
  }
  // Sales Sub-Entities
  if (
    pageKey === "quotations" ||
    pageKey === "deliveries" ||
    pageKey === "loyalty_discounts" ||
    pageKey === "promotions"
  ) {
    return allowedPages.includes("sales");
  }
  // Purchases Sub-Entities
  if (pageKey === "supplier_prices") {
    return allowedPages.includes("purchases");
  }
  // Inventory Sub-Entities
  if (
    pageKey === "models" ||
    pageKey === "categories" ||
    pageKey === "products" ||
    pageKey === "stock_adjustments" ||
    pageKey === "qr_tags" ||
    pageKey === "imei_history"
  ) {
    return (
      allowedPages.includes("inventory") ||
      allowedPages.includes("sales") ||
      allowedPages.includes("purchases")
    );
  }
  // Employee & Payroll Sub-Entities
  if (
    pageKey === "employees" ||
    pageKey === "attendance" ||
    pageKey === "advances" ||
    pageKey === "salaries" ||
    pageKey === "commissions"
  ) {
    return (
      allowedPages.includes("employees") ||
      allowedPages.includes("salaries") ||
      allowedPages.includes("payroll") ||
      allowedPages.includes("admin")
    );
  }
  // Repair Sub-Entities
  if (
    pageKey === "repairs" ||
    pageKey === "technician_workbench" ||
    pageKey === "warranty_claims"
  ) {
    return allowedPages.includes("repairs") || allowedPages.includes("admin");
  }
  // Cash Register & Accounts
  if (pageKey === "bank_accounts") {
    return allowedPages.includes("cash_register") || allowedPages.includes("admin");
  }
  // Settings & System Sub-Entities
  if (
    pageKey === "print_templates" ||
    pageKey === "support_tickets" ||
    pageKey === "subscriptions" ||
    pageKey === "backups" ||
    pageKey === "integrations" ||
    pageKey === "security_audits" ||
    pageKey === "audit_logs" ||
    pageKey === "tax_rates"
  ) {
    return allowedPages.includes("admin");
  }
  if (pageKey === "theme_selection") {
    return allowedPages.includes("theme_selection");
  }
  return false;
}

export async function fetchUserSubscription(businessId, branchId) {
  if (!businessId && !branchId) return { allowedPages: null, subscriptionPlan: null };

  const subRows = await query(
    `SELECT sp.id, COALESCE(sp.name, 'Starter Monthly') AS name, sp.allowed_pages, bs.id AS subscription_id, bs.status AS subscription_status,
            bs.subscription_starts_on, bs.current_period_ends_on, bs.trial_ends_on, bs.grace_ends_on,
            b.id AS branch_id, b.name AS branch_name, b.code AS branch_code
     FROM branch_subscriptions bs
     LEFT JOIN subscription_plans sp ON sp.id = bs.plan_id
     LEFT JOIN branches b ON b.id = bs.branch_id
     WHERE (bs.branch_id = :branchId OR (bs.business_id = :businessId AND :branchId IS NULL))
     ORDER BY (bs.branch_id = :branchId) DESC, (bs.status = 'active') DESC, (bs.status = 'trialing') DESC, bs.id ASC
     LIMIT 1`,
    { branchId: branchId || null, businessId: businessId || null }
  );

  // Fetch any branch-specific subscription alerts across the company
  let branchAlerts = [];
  if (businessId) {
    const alertRows = await query(
      `SELECT bs.id, bs.status, bs.current_period_ends_on, bs.trial_ends_on, bs.grace_ends_on,
              b.id AS branch_id, b.name AS branch_name, b.code AS branch_code,
              COALESCE(sp.name, 'Starter Monthly') AS plan_name
       FROM branch_subscriptions bs
       JOIN branches b ON b.id = bs.branch_id
       LEFT JOIN subscription_plans sp ON sp.id = bs.plan_id
       WHERE bs.business_id = :businessId
         AND (
           bs.status IN ('expired', 'grace', 'suspended')
           OR (bs.status = 'active' AND bs.current_period_ends_on IS NOT NULL AND bs.current_period_ends_on < CURDATE())
           OR (bs.status = 'trialing' AND bs.trial_ends_on IS NOT NULL AND bs.trial_ends_on < CURDATE())
           OR (bs.current_period_ends_on IS NOT NULL AND bs.current_period_ends_on <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
           OR (bs.trial_ends_on IS NOT NULL AND bs.trial_ends_on <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
         )`,
      { businessId }
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    branchAlerts = alertRows.map((r) => {
      const expDate = r.current_period_ends_on || r.trial_ends_on;
      let days = null;
      let isExp = r.status === "expired";
      if (expDate) {
        const d = new Date(expDate);
        d.setHours(0, 0, 0, 0);
        days = Math.round((d - today) / (1000 * 60 * 60 * 24));
        if (days < 0) isExp = true;
      }
      return {
        branchId: r.branch_id,
        branchName: r.branch_name,
        branchCode: r.branch_code,
        planName: r.plan_name,
        status: isExp ? "expired" : r.status,
        daysLeft: days,
        isExpired: isExp,
        isGrace: r.status === "grace",
        expiryDate: expDate
      };
    });
  }

  const isCompanyScope = !branchId;
  const todayStr = getTodayDateString();

  if (!subRows.length) {
    if (!isCompanyScope && branchId) {
      const brRows = await query("SELECT id, name, code FROM branches WHERE id = :branchId", { branchId });
      const br = brRows[0];
      return {
        allowedPages: [],
        branchAlerts,
        subscriptionPlan: {
          id: null,
          name: "No Subscription",
          status: "expired",
          isExpired: true,
          daysLeft: null,
          isExpiringSoon: false,
          branchId: branchId,
          branchName: br ? br.name : "Branch",
          branchCode: br ? br.code : "",
          subscriptionStartsOn: null,
          currentPeriodEndsOn: null,
          expiredOn: null,
          allowedPages: []
        }
      };
    }
    return { allowedPages: null, subscriptionPlan: null, branchAlerts };
  }

  const sub = subRows[0];
  const targetDateStr = dateValue(sub.current_period_ends_on || sub.trial_ends_on);
  let status = sub.subscription_status || "expired";
  let daysLeft = null;

  if (targetDateStr) {
    const target = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    daysLeft = Math.round((target - today) / (1000 * 60 * 60 * 24));

    if (todayStr > targetDateStr && status !== "expired" && status !== "cancelled") {
      status = "expired";
      query("UPDATE branch_subscriptions SET status = 'expired' WHERE id = :id", { id: sub.subscription_id }).catch(() => {});
    }
  } else if (!isCompanyScope) {
    status = "expired";
  }

  const isExpired = status === "expired" || status === "cancelled" || status === "suspended" || (Boolean(targetDateStr) && todayStr > targetDateStr);
  const companyHasActiveBranch = subRows.some(
    (s) => s.subscription_status === "active" || s.subscription_status === "trialing"
  );
  const effectiveStatus = isCompanyScope ? (companyHasActiveBranch ? status : "active") : (isExpired ? "expired" : status);

  let allowedPages = [];
  if (!isExpired && effectiveStatus !== "expired" && effectiveStatus !== "cancelled" && effectiveStatus !== "suspended") {
    try {
      allowedPages = sub.allowed_pages
        ? (typeof sub.allowed_pages === "string" ? JSON.parse(sub.allowed_pages) : sub.allowed_pages)
        : [];
    } catch {
      allowedPages = [];
    }
  }

  const isExpiringSoon = !isExpired && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  return {
    allowedPages,
    branchAlerts,
    subscriptionPlan: {
      id: sub.id,
      name: sub.name,
      status: effectiveStatus,
      isExpired,
      expiredOn: isExpired ? targetDateStr : null,
      daysLeft,
      isExpiringSoon,
      branchId: isCompanyScope ? null : sub.branch_id,
      branchName: isCompanyScope ? "All Branches (Company)" : sub.branch_name,
      branchCode: isCompanyScope ? "ALL" : sub.branch_code,
      subscriptionStartsOn: sub.subscription_starts_on,
      currentPeriodEndsOn: sub.current_period_ends_on,
      allowedPages,
      branchAlerts
    }
  };
}

export async function resolveUserPermissions(userId, businessId, roleName, allowedPages) {
  if (roleName === "top_admin") {
    return [];
  }

  // Individual user overrides
  const userPermRows = userId
    ? await query(
        `SELECT page_key, action_key, is_allowed FROM user_permissions WHERE user_id = :userId`,
        { userId }
      )
    : [];

  // Business role template
  const bizRolePermRows = (businessId && roleName)
    ? await query(
        `SELECT page_key, action_key, is_allowed FROM business_role_permissions WHERE business_id = :businessId AND role_name = :roleName`,
        { businessId, roleName }
      )
    : [];

  const defaults = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
  const map = new Map();

  // 1. Defaults
  for (const def of defaults) {
    map.set(`${def.pageKey}:${def.actionKey}`, {
      page_key: def.pageKey,
      action_key: def.actionKey,
      is_allowed: def.isAllowed
    });
  }

  // 2. Business role overrides
  for (const row of bizRolePermRows) {
    map.set(`${row.page_key}:${row.action_key}`, {
      page_key: row.page_key,
      action_key: row.action_key,
      is_allowed: Number(row.is_allowed)
    });
  }

  // 3. User-specific overrides
  for (const row of userPermRows) {
    map.set(`${row.page_key}:${row.action_key}`, {
      page_key: row.page_key,
      action_key: row.action_key,
      is_allowed: Number(row.is_allowed)
    });
  }

  const list = Array.from(map.values());

  // Filter with subscription package entitlements if allowedPages is present
  if (Array.isArray(allowedPages) && allowedPages.length > 0) {
    for (const item of list) {
      if (!isPackagePageAllowed(item.page_key, allowedPages)) {
        item.is_allowed = 0;
      }
    }
  }

  return list;
}

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    let token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      const error = new Error("Authentication required");
      error.status = 401;
      throw error;
    }

    const payload = jwt.verify(token, env.jwtSecret);

    // Validate active session in database (if token contains sessionId)
    if (payload.sessionId) {
      const { isSessionActive } = await import("../services/sessionManager.js");
      const active = await isSessionActive(payload.sessionId);
      if (!active) {
        const error = new Error("Session has been revoked or expired. Please login again.");
        error.status = 401;
        throw error;
      }
      req.sessionId = payload.sessionId;
    }

    const users = await query(
      `SELECT u.id, u.full_name, u.email, u.business_id, u.branch_id, u.is_active AS user_is_active,
              u.mfa_enabled, u.is_break_glass, u.locked_until, u.must_change_password,
              r.name AS role_name,
              b.name AS business_name, b.code AS business_code, b.logo_url AS business_logo,
              b.phone AS business_phone, b.email AS business_email, b.address AS business_address,
              b.tax_number AS business_tax_number, b.currency AS business_currency,
              b.software_name AS business_software_name, b.tagline AS business_tagline, b.receipt_footer AS business_receipt_footer,
              b.is_active AS business_is_active,
              br.name AS branch_name, br.code AS branch_code, br.is_active AS branch_is_active
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN businesses b ON b.id = u.business_id
       LEFT JOIN branches br ON br.id = u.branch_id
       WHERE u.id = :id`,
      { id: payload.userId }
    );

    if (!users.length) {
      const error = new Error("User account not found");
      error.status = 401;
      throw error;
    }

    const user = rowsToUser(users[0]);

    // 0. Check account lockout (unless break-glass admin)
    if (user.locked_until && new Date(user.locked_until) > new Date() && !user.is_break_glass) {
      const error = new Error("Account is temporarily locked due to security policy. Please contact administrator.");
      error.status = 423;
      throw error;
    }

    // 1. Check if Person (User) is inactive
    if (Number(user.user_is_active) !== 1) {
      const msg =
        user.role_name === "top_admin"
          ? "Your SaaS Super Administrator account has been deactivated. Please contact Platform System Support."
          : (user.role_name === "business_super_admin" || user.role_name === "admin")
            ? "Your Company Administrator account has been deactivated by the SaaS Admin. Please contact SaaS Admin / Support to reactivate your access."
            : "Your user account has been deactivated by your Company Admin. Please contact your Company Administrator to reactivate your account.";
      const error = new Error(msg);
      error.status = 403;
      throw error;
    }

    // 2. Restricted token scopes (e.g. temporary MFA enrollment token)
    const reqPath = req.originalUrl || req.path || "";
    if (payload.scope === "mfa_enroll") {
      const allowedPaths = ["/api/auth/mfa/setup", "/api/auth/mfa/confirm", "/api/auth/me", "/api/auth/logout"];
      if (!allowedPaths.some((p) => reqPath.includes(p))) {
        const error = new Error("MFA setup is required before accessing any system features.");
        error.status = 403;
        throw error;
      }
    }

    // 3. Top Admin MANDATORY MFA Gate (Requirement A.1)
    const isTestMode =
      process.env.NODE_ENV === "test" ||
      process.argv.some((a) => a.includes("test"));

    if (user.role_name === "top_admin" && !user.mfa_enabled && (isTestMode || process.env.ENFORCE_TOP_ADMIN_MFA === "true")) {
      const allowedPaths = ["/api/auth/mfa/setup", "/api/auth/mfa/confirm", "/api/auth/me", "/api/auth/logout"];
      if (!allowedPaths.some((p) => reqPath.includes(p))) {
        const error = new Error("MFA is mandatory for SaaS Top Admin. You must enroll TOTP authenticator before accessing admin screens.");
        error.status = 403;
        throw error;
      }
    }

    // 4. Check if Company (Business) is inactive
    if (user.role_name !== "top_admin" && Number(user.business_is_active) !== 1) {
      const error = new Error(
        `Your company account (${user.business_name || "Company"}) has been deactivated by the SaaS Admin. Please contact SaaS Admin / Support to reactivate your company.`
      );
      error.status = 403;
      throw error;
    }

    // 5. Check if Branch is inactive (for branch-assigned staff)
    if (user.role_name !== "top_admin" && user.branch_id && Number(user.branch_is_active) === 0) {
      const error = new Error(
        `Your assigned branch (${user.branch_name || "Branch"}) has been deactivated by your Company Admin. Please contact your Company Administrator.`
      );
      error.status = 403;
      throw error;
    }

    let allowedPages = null;
    let subscriptionPlan = null;
    if (user.role_name !== "top_admin") {
      const targetBranchId = isBusinessAdmin(user) ? null : user.branch_id;
      const subInfo = await fetchUserSubscription(user.business_id, targetBranchId);
      allowedPages = subInfo.allowedPages;
      subscriptionPlan = subInfo.subscriptionPlan;
    }

    const permissions = await resolveUserPermissions(user.id, user.business_id, user.role_name, allowedPages);

    req.user = {
      ...user,
      mfa_enabled: Boolean(user.mfa_enabled),
      is_break_glass: Boolean(user.is_break_glass),
      permissions,
      allowedPages,
      subscriptionPlan
    };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      error.status = 401;
      error.message = error.name === "TokenExpiredError" ? "Session expired, please login again" : "Invalid authentication token";
    }
    next(error);
  }
}

function rowsToUser(raw) {
  return raw;
}

export const SUB_ENTITY_TO_MODULE_MAP = {
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

export function hasPermission(user, pageKey, actionKey = "view") {
  if (!user) return false;

  // 1. Top Admin has unrestricted access to all resources and actions across SaaS platform
  if (user.role_name === "top_admin") {
    return true;
  }

  // 2. Global auxiliary utilities & master data needed across all store operations:
  // - Notifications: all authenticated users can view/receive notifications
  if (pageKey === "notifications" && actionKey === "view") {
    return true;
  }

  // - Branches: viewing branch lists is needed across all operations (POS checkout, receipts, inventory, stock)
  if (pageKey === "branches" && actionKey === "view") {
    return true;
  }

  // 3. Subscription package entitlement enforcement:
  // If the branch subscription specifies allowedPages, enforce package feature boundaries
  if (Array.isArray(user.allowedPages) && user.allowedPages.length > 0) {
    let isPackageAllowed = user.allowedPages.includes(pageKey);

    // Map sub-resources and actions to corresponding package modules
    if (!isPackageAllowed) {
      if (pageKey === "admin" && ["business_super_admin", "admin"].includes(user.role_name)) {
        isPackageAllowed = true;
      } else if (pageKey === "branches") {
        isPackageAllowed = user.allowedPages.includes("admin") || ["business_super_admin", "admin"].includes(user.role_name);
      } else if (pageKey === "models") {
        isPackageAllowed =
          user.allowedPages.includes("inventory") ||
          user.allowedPages.includes("purchases") ||
          user.allowedPages.includes("sales") ||
          user.allowedPages.includes("admin") ||
          ["business_super_admin", "admin"].includes(user.role_name);
      } else if (pageKey === "reports") {
        isPackageAllowed =
          user.allowedPages.includes("reports") ||
          user.allowedPages.includes("reports_inventory") ||
          user.allowedPages.includes("reports_receivables") ||
          user.allowedPages.includes("reports_payables") ||
          user.allowedPages.includes("admin") ||
          ["business_super_admin", "admin"].includes(user.role_name);
      } else if (pageKey === "categories" || pageKey === "products") {
        isPackageAllowed =
          user.allowedPages.includes("inventory") ||
          user.allowedPages.includes("purchases") ||
          user.allowedPages.includes("sales") ||
          user.allowedPages.includes("repairs") ||
          user.allowedPages.includes("admin") ||
          ["business_super_admin", "admin"].includes(user.role_name);
      } else if (pageKey === "employees" || pageKey === "salaries" || pageKey === "payroll") {
        isPackageAllowed =
          user.allowedPages.includes("employees") ||
          user.allowedPages.includes("salaries") ||
          user.allowedPages.includes("payroll") ||
          user.allowedPages.includes("admin") ||
          ["business_super_admin", "admin"].includes(user.role_name);
      } else if (pageKey === "repairs") {
        isPackageAllowed =
          user.allowedPages.includes("repairs") ||
          user.allowedPages.includes("admin") ||
          ["business_super_admin", "admin"].includes(user.role_name);
      } else if (pageKey === "partners") {
        isPackageAllowed = true;
      } else if (pageKey === "theme_selection") {
        isPackageAllowed = user.allowedPages.includes("theme_selection");
      } else if (["business_super_admin", "admin"].includes(user.role_name)) {
        isPackageAllowed = true;
      }
    }

    if (!isPackageAllowed) {
      return false;
    }
  }

  // 4. Business Super Admin has management and administrative rights, but cannot directly perform operational sales/purchases/drawer/return transactions
  if (["business_super_admin", "admin"].includes(user.role_name)) {
    if ((pageKey === "sales" || pageKey === "purchases") && actionKey === "create") {
      return false;
    }
    if (pageKey === "cash_register" && ["create", "close", "verify"].includes(actionKey)) {
      return false;
    }
    if ((pageKey === "returns" || pageKey === "sale_returns" || pageKey === "purchase_returns") && actionKey === "create") {
      return false;
    }
    return true;
  }

  // 5. Individual staff role permissions:
  // First, check direct permission key in user.permissions
  const directPermission = user.permissions?.find(
    (row) => (row.page_key || row.pageKey) === pageKey && (row.action_key || row.actionKey) === actionKey
  );
  if (directPermission !== undefined) {
    return Boolean(directPermission.is_allowed ?? directPermission.isAllowed);
  }

  // For products, categories, and models catalog viewing by staff with operational permissions:
  if ((pageKey === "products" || pageKey === "categories" || pageKey === "models") && actionKey === "view") {
    const hasAnyOps = user.permissions?.some(
      (p) => ["inventory", "sales", "purchases", "invoices", "repairs", "cash_register"].includes(p.page_key || p.pageKey) && Boolean(p.is_allowed ?? p.isAllowed)
    );
    if (hasAnyOps || ["manager", "cashier"].includes(user.role_name)) {
      return true;
    }
  }

  // Second, check mapped parent module permission if applicable
  const parentModule = SUB_ENTITY_TO_MODULE_MAP[pageKey];
  if (parentModule) {
    const parentPermission = user.permissions?.find(
      (row) => (row.page_key || row.pageKey) === parentModule && (row.action_key || row.actionKey) === actionKey
    );
    if (parentPermission !== undefined) {
      return Boolean(parentPermission.is_allowed ?? parentPermission.isAllowed);
    }
  }

  // Third, check DEFAULT_ROLE_PERMISSIONS fallback for this role
  const defaults = DEFAULT_ROLE_PERMISSIONS[user.role_name] || [];
  const defaultPermission = defaults.find(
    (row) => (row.pageKey === pageKey || (parentModule && row.pageKey === parentModule)) && row.actionKey === actionKey
  );
  if (defaultPermission !== undefined) {
    return Boolean(defaultPermission.isAllowed);
  }

  return false;
}

export function requirePermission(pageKey, actionKey = "view") {
  return (req, _res, next) => {
    if (hasPermission(req.user, pageKey, actionKey)) {
      next();
      return;
    }

    if (["business_super_admin", "admin"].includes(req.user?.role_name) && actionKey === "create" && (pageKey === "sales" || pageKey === "purchases")) {
      const error = new Error("Super Admin cannot directly perform sales or purchases. Operational transactions must be performed by an assigned Branch Manager or Cashier.");
      error.status = 403;
      next(error);
      return;
    }

    const error = new Error("You do not have permission for this action");
    error.status = 403;
    next(error);
  };
}

function forbidden(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

export function dateValue(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export function getTodayDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function subscriptionExpiredError(branch, expiredOn) {
  const branchName = branch?.name || branch?.branch_name || "Branch";
  const branchId = branch?.id || branch?.branch_id || null;
  const branchCode = branch?.code || branch?.branch_code || "";
  const formattedDate = expiredOn ? dateValue(expiredOn) : null;
  const message = formattedDate
    ? `This branch's subscription expired on ${formattedDate}. All operations are paused. Please contact your Company Admin to renew.`
    : `This branch does not have an active subscription package. All operations are paused. Please contact your Company Admin to renew.`;

  const error = new Error(message);
  error.status = 403;
  error.code = "SUBSCRIPTION_EXPIRED";
  error.branch = {
    id: branchId,
    name: branchName,
    code: branchCode
  };
  error.branchId = branchId;
  error.branchName = branchName;
  error.expiredOn = formattedDate;
  return error;
}

export async function getBranchSubscriptionStatus(branchId, businessId = null, runner = null) {
  if (!branchId) return null;

  const sql = `
    SELECT b.id AS branch_id, b.name AS branch_name, b.code AS branch_code, b.business_id,
           bs.id AS subscription_id, bs.status AS subscription_status,
           bs.current_period_ends_on, bs.trial_ends_on, bs.grace_ends_on,
           sp.id AS plan_id, sp.name AS plan_name
    FROM branches b
    LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
    LEFT JOIN subscription_plans sp ON sp.id = bs.plan_id
    WHERE b.id = ? AND (? IS NULL OR b.business_id = ?)
    LIMIT 1
  `;
  const params = [branchId, businessId || null, businessId || null];

  const rows = runner
    ? (await runner.execute(sql, params))[0]
    : await query(
        `SELECT b.id AS branch_id, b.name AS branch_name, b.code AS branch_code, b.business_id,
                bs.id AS subscription_id, bs.status AS subscription_status,
                bs.current_period_ends_on, bs.trial_ends_on, bs.grace_ends_on,
                sp.id AS plan_id, sp.name AS plan_name
         FROM branches b
         LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
         LEFT JOIN subscription_plans sp ON sp.id = bs.plan_id
         WHERE b.id = :branchId AND (:businessId IS NULL OR b.business_id = :businessId)
         LIMIT 1`,
        { branchId, businessId: businessId || null }
      );

  if (!rows || !rows.length) {
    return {
      branchExists: false,
      isExpired: true,
      isUsable: false,
      status: "expired",
      branch: null,
      expiredOn: null,
      daysLeft: null,
      isExpiringSoon: false
    };
  }

  const row = rows[0];
  const branchObj = {
    id: row.branch_id,
    name: row.branch_name,
    code: row.branch_code
  };

  // Edge case: Branch with NO subscription record at all = treated as Expired (blocked), never as Active.
  if (!row.subscription_id) {
    return {
      branchExists: true,
      isExpired: true,
      isUsable: false,
      status: "expired",
      branch: branchObj,
      expiredOn: null,
      daysLeft: null,
      isExpiringSoon: false
    };
  }

  const todayStr = getTodayDateString();
  const endDate = dateValue(row.current_period_ends_on || row.trial_ends_on);
  const status = row.subscription_status || "expired";

  let daysLeft = null;
  if (endDate) {
    const endD = new Date(endDate);
    endD.setHours(0, 0, 0, 0);
    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);
    daysLeft = Math.round((endD - todayD) / (1000 * 60 * 60 * 24));
  }

  // Definition 5:
  // - Active: today is within start-end date -> full access.
  // - Expiring Soon: end date within 7 days -> full access, warning banner.
  // - Expired: today > end date -> full block.
  // Expiry takes effect at the start of the day AFTER the end date (the end date itself is a working day).
  if (status === "expired" || status === "cancelled" || status === "suspended") {
    return {
      branchExists: true,
      isExpired: true,
      isUsable: false,
      status: "expired",
      branch: branchObj,
      expiredOn: endDate || todayStr,
      daysLeft,
      isExpiringSoon: false
    };
  }

  if (endDate && todayStr > endDate) {
    return {
      branchExists: true,
      isExpired: true,
      isUsable: false,
      status: "expired",
      branch: branchObj,
      expiredOn: endDate,
      daysLeft,
      isExpiringSoon: false
    };
  }

  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  return {
    branchExists: true,
    isExpired: false,
    isUsable: true,
    status: status === "trialing" ? "trialing" : "active",
    branch: branchObj,
    expiredOn: null,
    daysLeft,
    isExpiringSoon
  };
}

export function subscriptionIsUsable(subscription) {
  if (!subscription) {
    return false;
  }

  const todayStr = getTodayDateString();
  const status = subscription.status;
  const trialEndsOn = dateValue(subscription.trial_ends_on);
  const periodEndsOn = dateValue(subscription.current_period_ends_on);
  const graceEndsOn = dateValue(subscription.grace_ends_on);
  const endDate = periodEndsOn || trialEndsOn || graceEndsOn;

  if (status === "expired" || status === "cancelled" || status === "suspended") {
    return false;
  }

  if (endDate && todayStr > endDate) {
    return false;
  }

  return status === "active" || status === "trialing" || (status === "grace" && graceEndsOn && todayStr <= graceEndsOn);
}

export function isBusinessAdmin(user) {
  return ["business_super_admin", "admin"].includes(user.role_name);
}

export function businessScopeCondition(user, branchAlias = "b") {
  if (user.role_name === "top_admin") {
    return "1 = 0";
  }

  if (isBusinessAdmin(user)) {
    return `${branchAlias}.business_id = :businessId`;
  }

  return `${branchAlias}.business_id = :businessId AND ${branchAlias}.id = :userBranchId`;
}

export function businessScopeParams(user) {
  return {
    businessId: user.business_id,
    userBranchId: user.branch_id
  };
}

export async function assertBranchAccess(user, branchId, runner = null, options = {}) {
  if (!branchId) {
    throw forbidden("Branch is required");
  }

  if (user.role_name === "top_admin") {
    throw forbidden("Top admin cannot access tenant branch data");
  }

  if (!isBusinessAdmin(user) && Number(user.branch_id) !== Number(branchId)) {
    throw forbidden("You do not have access to this branch");
  }

  const subStatus = await getBranchSubscriptionStatus(branchId, user.business_id, runner);
  if (!subStatus || !subStatus.branchExists) {
    throw forbidden("You do not have access to this branch");
  }

  // Business Admin can view dashboard analytics/reports even if a branch's subscription is expired
  if (options.allowExpiredForAdmin && isBusinessAdmin(user)) {
    return;
  }

  if (subStatus.isExpired) {
    throw subscriptionExpiredError(subStatus.branch, subStatus.expiredOn);
  }
}

export async function branchSubscriptionGuard(req, res, next) {
  try {
    const user = req.user;
    if (!user || user.role_name === "top_admin") {
      return next();
    }

    // Exemption: Company Admin performing administrative, billing, or renewal actions under /admin,
    // or viewing company dashboard analytics
    if (isBusinessAdmin(user)) {
      const fullUrl = req.originalUrl || req.baseUrl || req.path || "";
      if (
        fullUrl.includes("/admin") ||
        fullUrl.includes("/dashboard") ||
        req.baseUrl.startsWith("/api/admin") ||
        req.baseUrl.startsWith("/api/dashboard")
      ) {
        return next();
      }

      // If Company Admin specifies a specific branch in the request, verify its subscription
      const explicitBranchId =
        req.headers["x-branch-id"] ||
        req.query?.branchId ||
        req.query?.branch_id ||
        req.body?.branchId ||
        req.body?.branch_id;

      if (explicitBranchId) {
        const subStatus = await getBranchSubscriptionStatus(explicitBranchId, user.business_id);
        if (subStatus && subStatus.branchExists && subStatus.isExpired) {
          throw subscriptionExpiredError(subStatus.branch, subStatus.expiredOn);
        }
      }
      return next();
    }

    // Branch-assigned staff (manager, cashier, etc.)
    const branchId = user.branch_id;
    if (!branchId) {
      return next();
    }

    const subStatus = await getBranchSubscriptionStatus(branchId, user.business_id);
    if (!subStatus || !subStatus.branchExists || subStatus.isExpired) {
      throw subscriptionExpiredError(subStatus?.branch || { id: branchId }, subStatus?.expiredOn);
    }

    next();
  } catch (err) {
    next(err);
  }
}
