import { api } from "../api.js";

/**
 * Single authoritative system module catalog for both subscription package assignment
 * and employee permissions management. Stable keys across backend and frontend.
 */
export const SYSTEM_MODULES = [
  { key: "dashboard", label: "Dashboard Overview", category: "Core POS Modules", icon: "📊", description: "Real-time revenue, order metrics, and business KPIs" },
  { key: "sales", label: "POS Sales Counter", category: "Core POS Modules", icon: "💰", description: "Counter checkout, barcode/IMEI scanning, and receipts" },
  { key: "sale_returns", label: "Customer Sale Returns", category: "Core POS Modules", icon: "↩️", description: "Customer sale returns, refunds, restock IMEIs, and credit notes" },
  { key: "purchases", label: "Vendor Purchases", category: "Core POS Modules", icon: "🛒", description: "Vendor bills, purchase orders, and IMEI intake" },
  { key: "purchase_returns", label: "Vendor Purchase Returns", category: "Core POS Modules", icon: "🔄", description: "Vendor returns, defective stock returns, and credit adjustments" },
  { key: "inventory", label: "Inventory Management", category: "Core POS Modules", icon: "📦", description: "IMEI units tracker, accessories, pricing, stock alerts" },
  { key: "cash_register", label: "Cash Register", category: "Core POS Modules", icon: "💵", description: "Opening/closing drawer cash, discrepancy verification" },
  { key: "parties", label: "Customer & Vendor Parties", category: "Core POS Modules", icon: "👥", description: "Contact profiles, credit balance, and ledger records" },
  { key: "expenses", label: "Expense Management", category: "Core POS Modules", icon: "📉", description: "Operating costs, salary payments, bills, and petty cash" },
  { key: "invoices", label: "Invoice History & Collections", category: "Core POS Modules", icon: "🧾", description: "Invoice archive, print receipts, and collection tracking" },
  { key: "employees", label: "Salaries & Payroll", category: "Core POS Modules", icon: "💵", description: "Employee roster, monthly attendance, salary disbursals" },
  { key: "repairs", label: "Repair Services Counter", category: "Core POS Modules", icon: "🔧", description: "Repair tickets, technician assignments, spare parts" },
  { key: "admin", label: "Business Administration", category: "Core POS Modules", icon: "⚙️", description: "Staff accounts, role permissions, and branch settings" },
  { key: "reports_inventory", label: "Inventory Valuation Reports", category: "Reports & Audits", icon: "📋", description: "Stock balance valuation, dead-stock, depreciation" },
  { key: "reports_receivables", label: "Receivables & Aging Analysis", category: "Reports & Audits", icon: "📈", description: "Customer debts, overdue payment reminders" },
  { key: "reports_payables", label: "Payables & Supplier Outflow", category: "Reports & Audits", icon: "📑", description: "Vendor liabilities, purchase order payables" },
  { key: "stock_transfers", label: "Inter-Branch Stock Transfers", category: "Advanced Operations", icon: "🔄", description: "Dispatch, transfer, and receive inventory across stores" },
  { key: "partner_shares", label: "Partner Equity & Dividends", category: "Advanced Operations", icon: "🤝", description: "Branch equity shares, profit margins, distribution" },
  { key: "theme_selection", label: "Theme Customization & Colors", category: "Appearance & Branding", icon: "🎨", description: "Allow users to customize UI color themes" }
];

export const FORM_TO_MODULE_MAP = {
  sales: "sales",
  purchases: "purchases",
  invoices: "invoices",
  sale_returns: "sale_returns",
  purchase_returns: "purchase_returns",
  quotations: "sales",
  deliveries: "sales",
  inventory: "inventory",
  models: "inventory",
  categories: "inventory",
  products: "inventory",
  transfers: "stock_transfers",
  stock_transfers: "stock_transfers",
  stock_adjustments: "inventory",
  qr_tags: "inventory",
  imei_history: "inventory",
  cash_register: "cash_register",
  expenses: "expenses",
  parties: "parties",
  receivables: "reports_receivables",
  payables: "reports_payables",
  bank_accounts: "cash_register",
  pnl: "dashboard",
  tax_rates: "admin",
  users: "admin",
  employees: "employees",
  attendance: "employees",
  advances: "employees",
  salaries: "employees",
  commissions: "employees",
  repairs: "repairs",
  technician_workbench: "repairs",
  warranty_claims: "repairs",
  dashboard: "dashboard",
  reports: "reports",
  inventory_valuation: "reports_inventory",
  dividends: "partner_shares",
  security_audits: "admin",
  audit_logs: "admin",
  branches: "admin",
  partners: "partner_shares",
  company_profile: "admin",
  loyalty_discounts: "sales",
  promotions: "sales",
  supplier_prices: "purchases",
  print_templates: "admin",
  notifications: "admin",
  support_tickets: "admin",
  subscriptions: "admin",
  backups: "admin",
  integrations: "admin"
};

/**
 * Universal package gating check: returns true if pageKey/moduleKey is authorized
 * by the company's active subscription package.
 */
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
  // Products, Categories and Models needed across sales, purchases, inventory, repairs
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
      allowedPages.includes("purchases") ||
      allowedPages.includes("repairs") ||
      allowedPages.includes("admin")
    );
  }
  // Check form-to-module mapping
  const mappedModule = FORM_TO_MODULE_MAP[pageKey];
  if (mappedModule && mappedModule !== pageKey) {
    return isPackagePageAllowed(mappedModule, allowedPages);
  }
  return false;
}

/**
 * Full registry of 50 entity forms in the Mobile POS & ERP platform.
 * Fully extensible and grouped into logical operational domains.
 */
export const ENTITY_FORMS = [
  // 1. Sales & POS Domain
  {
    id: "sales",
    name: "Sales & POS Checkout",
    category: "Sales & Orders",
    icon: "🛒",
    description: "Counter sales, barcode/IMEI scanning, discounts and line items",
    rights: ["view", "create", "edit", "delete", "export", "approve"]
  },
  {
    id: "purchases",
    name: "Vendor Purchases",
    category: "Sales & Orders",
    icon: "📥",
    description: "Stock procurement, PO line items, and unit costs",
    rights: ["view", "create", "edit", "delete", "export", "approve"]
  },
  {
    id: "invoices",
    name: "Invoices & Billing History",
    category: "Sales & Orders",
    icon: "🧾",
    description: "Past customer invoices, thermal receipts, and reprints",
    rights: ["view", "create", "edit", "delete", "export"]
  },
  {
    id: "sale_returns",
    name: "Customer Sale Returns",
    category: "Sales & Orders",
    icon: "↩️",
    description: "Returns for refund, restocking fees, and credit notes",
    rights: ["view", "create", "edit", "delete", "approve"]
  },
  {
    id: "purchase_returns",
    name: "Purchase Returns to Vendor",
    category: "Sales & Orders",
    icon: "🔄",
    description: "Defective stock returns and vendor credit adjustments",
    rights: ["view", "create", "edit", "delete", "approve"]
  },
  {
    id: "quotations",
    name: "Sales Quotations & Estimates",
    category: "Sales & Orders",
    icon: "📄",
    description: "Price quotations and commercial proposals",
    rights: ["view", "create", "edit", "delete", "export"]
  },
  {
    id: "deliveries",
    name: "Delivery & Order Dispatch",
    category: "Sales & Orders",
    icon: "🚚",
    description: "Outbound delivery tracking and rider manifests",
    rights: ["view", "create", "edit", "delete"]
  },

  // 2. Inventory & Catalog Domain
  {
    id: "inventory",
    name: "Inventory & Serialized Handsets",
    category: "Inventory & Catalog",
    icon: "📱",
    description: "Handset inventory, IMEI lookups, status tracking",
    rights: ["view", "create", "edit", "delete", "export"]
  },
  {
    id: "models",
    name: "Mobile Models & Specs",
    category: "Inventory & Catalog",
    icon: "🏷️",
    description: "Handset master catalog, variants, and colors",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "categories",
    name: "Product Categories",
    category: "Inventory & Catalog",
    icon: "📂",
    description: "Hierarchy groups for accessories and spare parts",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "products",
    name: "Accessories & Spare Parts",
    category: "Inventory & Catalog",
    icon: "🎧",
    description: "Non-serialized retail products, chargers, glass, parts",
    rights: ["view", "create", "edit", "delete", "export"]
  },
  {
    id: "transfers",
    name: "Inter-Branch Stock Transfers",
    category: "Inventory & Catalog",
    icon: "🔁",
    description: "Transfer orders between store outlets",
    rights: ["view", "create", "edit", "delete", "approve"]
  },
  {
    id: "stock_adjustments",
    name: "Stock Adjustments & Write-Offs",
    category: "Inventory & Catalog",
    icon: "⚖️",
    description: "Inventory reconciliation, damaged goods write-offs",
    rights: ["view", "create", "edit", "delete", "approve"]
  },
  {
    id: "qr_tags",
    name: "Barcode & QR Sticker Printing",
    category: "Inventory & Catalog",
    icon: "🖨️",
    description: "Adhesive label printing for mobile handsets",
    rights: ["view", "create", "export"]
  },
  {
    id: "imei_history",
    name: "Serial Number & IMEI Audit Trail",
    category: "Inventory & Catalog",
    icon: "🔍",
    description: "Comprehensive lifecycle timeline for every IMEI",
    rights: ["view", "export"]
  },

  // 3. Financial & Cash Management Domain
  {
    id: "cash_register",
    name: "Cash Register & Drawers",
    category: "Financial & Cash",
    icon: "💵",
    description: "Shift opening, cash-in/out, closing verification",
    rights: ["view", "create", "edit", "delete", "approve"]
  },
  {
    id: "expenses",
    name: "Operating Expenses & Vouchers",
    category: "Financial & Cash",
    icon: "💸",
    description: "Store utilities, rent, tea, petty cash expenses",
    rights: ["view", "create", "edit", "delete", "export", "approve"]
  },
  {
    id: "parties",
    name: "Customer & Vendor Parties",
    category: "Financial & Cash",
    icon: "👥",
    description: "Customer contacts, suppliers, opening balances",
    rights: ["view", "create", "edit", "delete", "export"]
  },
  {
    id: "receivables",
    name: "Customer Receivables & Aging",
    category: "Financial & Cash",
    icon: "📈",
    description: "Credit customer ledger, due dates, WhatsApp alerts",
    rights: ["view", "edit", "export"]
  },
  {
    id: "payables",
    name: "Supplier Payables Ledger",
    category: "Financial & Cash",
    icon: "📉",
    description: "Procurement debt schedule and vendor payments",
    rights: ["view", "edit", "export"]
  },
  {
    id: "bank_accounts",
    name: "Bank Accounts & Cheques",
    category: "Financial & Cash",
    icon: "🏦",
    description: "Bank deposits, POS card machine settlement",
    rights: ["view", "create", "edit", "delete", "approve"]
  },
  {
    id: "pnl",
    name: "Profit & Loss Statement",
    category: "Financial & Cash",
    icon: "📊",
    description: "Store profitability, gross & net profit margins",
    rights: ["view", "export"]
  },
  {
    id: "tax_rates",
    name: "Tax Rates & Fiscal Surcharges",
    category: "Financial & Cash",
    icon: "🏛️",
    description: "Sales tax brackets and fiscal invoice compliance",
    rights: ["view", "create", "edit", "delete"]
  },

  // 4. Staff & Payroll Domain
  {
    id: "users",
    name: "Staff Accounts & Permissions",
    category: "Staff & Payroll",
    icon: "👤",
    description: "Staff logins, password reset, and role assignment",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "employees",
    name: "Employee Roster & Profiles",
    category: "Staff & Payroll",
    icon: "👔",
    description: "Employee master directory, CNIC, base salaries",
    rights: ["view", "create", "edit", "delete", "export"]
  },
  {
    id: "attendance",
    name: "Daily Attendance & Roll Call",
    category: "Staff & Payroll",
    icon: "📅",
    description: "Daily check-in, presence, absents, leave marking",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "advances",
    name: "Salary Advances & Loans",
    category: "Staff & Payroll",
    icon: "🪙",
    description: "Staff loans and advance disbursement ledger",
    rights: ["view", "create", "edit", "delete", "approve"]
  },
  {
    id: "salaries",
    name: "Payroll & Salary Payments",
    category: "Staff & Payroll",
    icon: "💰",
    description: "Net salary calculations, bonuses, advance deduction",
    rights: ["view", "create", "edit", "delete", "export", "approve"]
  },
  {
    id: "commissions",
    name: "Staff Sales Commissions",
    category: "Staff & Payroll",
    icon: "🎯",
    description: "Incentive targets and salesperson commission rules",
    rights: ["view", "create", "edit", "delete", "approve"]
  },

  // 5. Repairs & Technical Services Domain
  {
    id: "repairs",
    name: "Device Repairs & Warranty",
    category: "Technical Services",
    icon: "🔧",
    description: "Customer phone repair ticketing, diagnostic status",
    rights: ["view", "create", "edit", "delete", "export", "approve"]
  },
  {
    id: "technician_workbench",
    name: "Technician Workbench",
    category: "Technical Services",
    icon: "🛠️",
    description: "Assigned repair jobs, consumed spare parts, testing",
    rights: ["view", "create", "edit", "approve"]
  },
  {
    id: "warranty_claims",
    name: "Warranty Claims & Tracking",
    category: "Technical Services",
    icon: "🛡️",
    description: "Handset warranty validations and claim vouchers",
    rights: ["view", "create", "edit", "delete", "approve"]
  },

  // 6. Reports & Business Intelligence
  {
    id: "dashboard",
    name: "Executive Dashboard",
    category: "Analytics & Reports",
    icon: "⚡",
    description: "Real-time revenue KPI counters and stock metrics",
    rights: ["view", "export"]
  },
  {
    id: "reports",
    name: "Sales & Turnover Reports",
    category: "Analytics & Reports",
    icon: "📉",
    description: "Periodic sales volume, turnover graphs, trends",
    rights: ["view", "export"]
  },
  {
    id: "inventory_valuation",
    name: "Inventory Valuation & Health",
    category: "Analytics & Reports",
    icon: "💎",
    description: "Cost valuation, retail valuation, aging inventory",
    rights: ["view", "export"]
  },
  {
    id: "dividends",
    name: "Branch Dividend Reports",
    category: "Analytics & Reports",
    icon: "🤝",
    description: "Partner equity profit sharing breakdown by store",
    rights: ["view", "export", "approve"]
  },
  {
    id: "security_audits",
    name: "Security & Login Audits",
    category: "Analytics & Reports",
    icon: "🔐",
    description: "Login history, IP tracking, failed attempts",
    rights: ["view", "export"]
  },
  {
    id: "audit_logs",
    name: "System Audit Logs & Restores",
    category: "Analytics & Reports",
    icon: "📜",
    description: "Universal immutable activity log with void restoration",
    rights: ["view", "edit", "delete", "export", "approve"]
  },

  // 7. Store, Partner & Admin Configuration
  {
    id: "branches",
    name: "Store Outlets & Branches",
    category: "Store & Settings",
    icon: "🏢",
    description: "Store locations, unique branch codes, addresses",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "partners",
    name: "Partners & Equity Shares",
    category: "Store & Settings",
    icon: "🤝",
    description: "Share capital, partner CNICs, 100% share validation",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "company_profile",
    name: "Company Profile & Logo",
    category: "Store & Settings",
    icon: "🏬",
    description: "Branding, contact info, invoice footers, logo upload",
    rights: ["view", "edit"]
  },
  {
    id: "loyalty_discounts",
    name: "Customer Loyalty & Discounts",
    category: "Store & Settings",
    icon: "🎁",
    description: "VIP discounts, promotional point systems",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "promotions",
    name: "Promotional Campaigns & Coupons",
    category: "Store & Settings",
    icon: "🎟️",
    description: "Discount vouchers, seasonal campaign codes",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "supplier_prices",
    name: "Supplier Price Agreements",
    category: "Store & Settings",
    icon: "🤝",
    description: "Negotiated wholesale price lists from vendors",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "print_templates",
    name: "Receipt & Invoice Print Layouts",
    category: "Store & Settings",
    icon: "📐",
    description: "A4, 80mm thermal, 58mm thermal templates",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "notifications",
    name: "Alerts & Notifications",
    category: "Store & Settings",
    icon: "🔔",
    description: "Due date alerts, low stock warnings, notifications",
    rights: ["view", "edit", "delete"]
  },
  {
    id: "support_tickets",
    name: "Helpdesk & Support Tickets",
    category: "Store & Settings",
    icon: "🎫",
    description: "Internal store issue reporting and tracking",
    rights: ["view", "create", "edit", "delete"]
  },
  {
    id: "subscriptions",
    name: "SaaS Subscription & License",
    category: "Store & Settings",
    icon: "💳",
    description: "Package renewal, invoice history, payment verification",
    rights: ["view", "create"]
  },
  {
    id: "backups",
    name: "Database Backups & Dumps",
    category: "Store & Settings",
    icon: "💾",
    description: "Timestamped SQL dumps, data exports, recovery points",
    rights: ["view", "create", "export"]
  },
  {
    id: "integrations",
    name: "API & Third-Party Integrations",
    category: "Store & Settings",
    icon: "🔌",
    description: "SMS gateway, WhatsApp Webhook, accounting exports",
    rights: ["view", "edit"]
  }
];

// Attach canonical moduleKey to all entity forms
ENTITY_FORMS.forEach((form) => {
  form.moduleKey = FORM_TO_MODULE_MAP[form.id] || form.id;
});

export const CATEGORIES = [
  "All",
  "Sales & Orders",
  "Inventory & Catalog",
  "Financial & Cash",
  "Staff & Payroll",
  "Technical Services",
  "Analytics & Reports",
  "Store & Settings"
];

export const RIGHT_DEFINITIONS = [
  { key: "view", label: "View", icon: "👁️", color: "#38bdf8", description: "Read & inspect records" },
  { key: "create", label: "Create", icon: "➕", color: "#34d399", description: "Add new entries" },
  { key: "edit", label: "Edit", icon: "✏️", color: "#fbbf24", description: "Modify existing records" },
  { key: "delete", label: "Delete", icon: "🗑️", color: "#f87171", description: "Void or delete records" },
  { key: "export", label: "Export", icon: "📥", color: "#a855f7", description: "Download CSV / Excel files" },
  { key: "approve", label: "Approve", icon: "✅", color: "#10b981", description: "Authorize transactions & shifts" }
];

/**
 * Service function: getForms()
 * Returns the complete list of system forms/entities.
 */
export async function getForms() {
  return ENTITY_FORMS;
}

/**
 * Helper to build unique permission key
 */
export function makePermissionKey(formId, rightKey) {
  return `${formId}:${rightKey}`;
}

/**
 * Service function: getRights(targetType, targetId)
 * targetType: 'role' | 'user'
 * targetId: roleName (e.g. 'manager', 'cashier') or userId
 *
 * Fetches real permissions from the backend, merging with ENTITY_FORMS.
 */
export async function getRights(targetType, targetId, explicitAllowedPages = null) {
  try {
    if (targetType === "role") {
      const resp = await api.businessRolePermissions();
      const roleRights = resp?.roles?.[targetId] || [];
      const effectiveAllowedPages = explicitAllowedPages || resp?.allowedPages || null;
      const rightsMap = {};

      // Seed defaults for any known role
      ENTITY_FORMS.forEach((form) => {
        const isModuleAllowed = !effectiveAllowedPages || isPackagePageAllowed(form.moduleKey || form.id, effectiveAllowedPages);
        form.rights.forEach((right) => {
          const k = makePermissionKey(form.id, right);
          if (!isModuleAllowed) {
            rightsMap[k] = false;
          } else if (targetId === "manager") {
            rightsMap[k] = right !== "delete" || !["audit_logs", "subscriptions"].includes(form.id);
          } else if (targetId === "cashier") {
            const allowedForCashier = (
              (form.id === "sales" && (right === "view" || right === "create")) ||
              (form.id === "invoices" && right === "view") ||
              (form.id === "cash_register" && (right === "view" || right === "create")) ||
              (form.id === "inventory" && right === "view") ||
              (form.id === "parties" && (right === "view" || right === "create")) ||
              (form.id === "repairs" && (right === "view" || right === "create"))
            );
            rightsMap[k] = allowedForCashier;
          } else {
            rightsMap[k] = true;
          }
        });
      });

      // Apply actual backend values
      roleRights.forEach((p) => {
        const pageKey = p.pageKey || p.page_key;
        const actionKey = p.actionKey || p.action_key;
        const isAllowed = p.isAllowed !== undefined ? Boolean(p.isAllowed) : Boolean(p.is_allowed);
        rightsMap[makePermissionKey(pageKey, actionKey)] = isAllowed;
      });

      return rightsMap;
    }

    if (targetType === "user") {
      const users = await api.adminUsers();
      const targetUser = users.find((u) => String(u.id) === String(targetId));
      const userPermissions = targetUser?.permissions || [];
      const rightsMap = {};

      // Initialize based on user's role
      const roleDefaults = await getRights("role", targetUser?.role_name || "cashier", explicitAllowedPages);
      Object.assign(rightsMap, roleDefaults);

      // Overlay user-specific overrides
      userPermissions.forEach((p) => {
        const pageKey = p.pageKey || p.page_key;
        const actionKey = p.actionKey || p.action_key;
        const isAllowed = p.isAllowed !== undefined ? Boolean(p.isAllowed) : Boolean(p.is_allowed);
        rightsMap[makePermissionKey(pageKey, actionKey)] = isAllowed;
      });

      return rightsMap;
    }

    return {};
  } catch (err) {
    const fallback = {};
    ENTITY_FORMS.forEach((form) => {
      form.rights.forEach((right) => {
        const k = makePermissionKey(form.id, right);
        if (targetId === "manager") {
          fallback[k] = right !== "delete" || !["audit_logs", "subscriptions"].includes(form.id);
        } else if (targetId === "cashier") {
          const allowedForCashier = (
            (form.id === "sales" && (right === "view" || right === "create")) ||
            (form.id === "invoices" && right === "view") ||
            (form.id === "cash_register" && (right === "view" || right === "create")) ||
            (form.id === "inventory" && right === "view") ||
            (form.id === "parties" && (right === "view" || right === "create")) ||
            (form.id === "repairs" && (right === "view" || right === "create"))
          );
          fallback[k] = allowedForCashier;
        } else {
          fallback[k] = true;
        }
      });
    });
    return fallback;
  }
}

/**
 * Service function: saveRights(targetType, targetId, rightsMap)
 * Saves the rights configuration to the backend API.
 */
export async function saveRights(targetType, targetId, rightsMap) {
  const permissionsArray = Object.entries(rightsMap).map(([key, isAllowed]) => {
    const [pageKey, actionKey] = key.split(":");
    return {
      pageKey,
      actionKey,
      isAllowed: Boolean(isAllowed)
    };
  });

  if (targetType === "role") {
    if (["manager", "cashier"].includes(targetId)) {
      return await api.updateBusinessRolePermissions(targetId, permissionsArray);
    }
    return { success: true, roleName: targetId, permissions: permissionsArray };
  }

  if (targetType === "user") {
    return await api.updateUserPermissions(targetId, permissionsArray);
  }

  return { success: true };
}
