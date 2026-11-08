import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";

let vite;
let AppMod;
let SalesPageMod;
let PurchasesPageMod;
const testDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(testDir, "..");

function render(element) {
  return renderToStaticMarkup(element);
}

before(async () => {
  vite = await createServer({
    root: frontendRoot,
    configFile: false,
    plugins: [reactPlugin()],
    server: {
      middlewareMode: true,
      fs: {
        strict: true,
        allow: [frontendRoot, resolve(frontendRoot, "..", "node_modules")]
      }
    },
    appType: "custom",
    logLevel: "silent"
  });

  AppMod = await vite.ssrLoadModule("/src/App.jsx");
  SalesPageMod = await vite.ssrLoadModule("/src/pages/SalesPage.jsx");
  PurchasesPageMod = await vite.ssrLoadModule("/src/pages/PurchasesPage.jsx");
});

after(async () => {
  await vite?.close();
});

test("canUse utility: Super Admin cannot create sales or purchases directly", () => {
  const superAdminUser = {
    id: 1,
    role_name: "business_super_admin",
    allowedPages: ["dashboard", "sales", "purchases", "admin"]
  };

  // Super Admin can view
  assert.equal(AppMod.canUse(superAdminUser, "sales", "view"), true);
  assert.equal(AppMod.canUse(superAdminUser, "purchases", "view"), true);

  // Super Admin CANNOT perform operational creations
  assert.equal(AppMod.canUse(superAdminUser, "sales", "create"), false);
  assert.equal(AppMod.canUse(superAdminUser, "purchases", "create"), false);
  assert.equal(AppMod.canUse(superAdminUser, "cash_register", "create"), false);
  assert.equal(AppMod.canUse(superAdminUser, "cash_register", "close"), false);
});

test("canUse utility: Manager has rights to create sales and purchases within package boundaries", () => {
  const managerUser = {
    id: 10,
    role_name: "manager",
    allowedPages: ["dashboard", "sales", "purchases", "inventory"],
    permissions: [
      { page_key: "sales", action_key: "view", is_allowed: 1 },
      { page_key: "sales", action_key: "create", is_allowed: 1 },
      { page_key: "purchases", action_key: "view", is_allowed: 1 },
      { page_key: "purchases", action_key: "create", is_allowed: 1 },
      { page_key: "inventory", action_key: "view", is_allowed: 1 },
      { page_key: "inventory", action_key: "create", is_allowed: 0 } // specific restriction set by business admin
    ]
  };

  // Manager can create sales and purchases
  assert.equal(AppMod.canUse(managerUser, "sales", "create"), true);
  assert.equal(AppMod.canUse(managerUser, "purchases", "create"), true);

  // Manager is blocked from action restricted by business admin (inventory:create)
  assert.equal(AppMod.canUse(managerUser, "inventory", "create"), false);
  assert.equal(AppMod.canUse(managerUser, "inventory", "view"), true);

  // Manager cannot access page outside SaaS package ('expenses')
  assert.equal(AppMod.canUse(managerUser, "expenses", "view"), false);
});

test("SalesPage: Renders restriction banner for Super Admin and disables sale creation", () => {
  const superAdminSession = {
    id: 1,
    full_name: "Company Super Admin",
    role_name: "business_super_admin",
    branch_id: 1
  };
  const superAdminContext = {
    session: superAdminSession,
    branches: [{ id: 1, name: "Main Branch" }],
    models: [{ id: 1, company: "Samsung", model_name: "S24 Ultra" }],
    parties: [{ id: 1, party_type: "customer", name: "Walk-in" }],
    can: (pageKey, actionKey) => AppMod.canUse(superAdminSession, pageKey, actionKey),
    refreshAll() {}
  };

  const html = render(React.createElement(SalesPageMod.SalesPage, { context: superAdminContext }));
  // Banner notifying Super Admin
  assert.match(html, /Operational Role Required/i);
  assert.match(html, /Sales transactions must be performed by assigned Branch Managers and Cashiers/i);
  // Button shows disabled restriction label
  assert.match(html, /Restricted to Manager\/Cashier/i);
});

test("PurchasesPage: Renders restriction banner for Super Admin and disables purchase creation", () => {
  const superAdminSession = {
    id: 1,
    full_name: "Company Super Admin",
    role_name: "business_super_admin",
    branch_id: 1
  };
  const superAdminContext = {
    session: superAdminSession,
    branches: [{ id: 1, name: "Main Branch" }],
    models: [{ id: 1, company: "Apple", model_name: "iPhone 15" }],
    parties: [{ id: 1, party_type: "vendor", name: "Official Distributor" }],
    can: (pageKey, actionKey) => AppMod.canUse(superAdminSession, pageKey, actionKey),
    refreshAll() {}
  };

  const html = render(React.createElement(PurchasesPageMod.PurchasesPage, { context: superAdminContext }));
  assert.match(html, /Operational Role Required/i);
  assert.match(html, /Restricted to Manager\/Staff/i);
});

test("SalesPage: Renders standard operational form for Manager", () => {
  const managerSession = {
    id: 2,
    full_name: "Store Manager",
    role_name: "manager",
    branch_id: 1,
    permissions: [
      { page_key: "sales", action_key: "view", is_allowed: 1 },
      { page_key: "sales", action_key: "create", is_allowed: 1 }
    ]
  };
  const managerContext = {
    session: managerSession,
    branches: [{ id: 1, name: "Main Branch" }],
    models: [{ id: 1, company: "Samsung", model_name: "S24 Ultra" }],
    parties: [{ id: 1, party_type: "customer", name: "Walk-in" }],
    can: (pageKey, actionKey) => AppMod.canUse(managerSession, pageKey, actionKey),
    refreshAll() {}
  };

  const html = render(React.createElement(SalesPageMod.SalesPage, { context: managerContext }));
  // No Super Admin notice
  assert.doesNotMatch(html, /Super Admin Notice/i);
  // Standard operational Save Sale button exists
  assert.match(html, /Save Sale/i);
});

test("getVisibleTabs: Company Admin only sees Dashboard, Reports, and Admin in the sidemenu", () => {
  const companyAdmin = {
    id: 1,
    role_name: "business_super_admin",
    full_name: "Company Super Admin"
  };

  const visible = AppMod.getVisibleTabs(companyAdmin);
  const visibleKeys = visible.map((t) => t.key);

  // Must only contain dashboard, reports, and admin
  assert.deepEqual(visibleKeys, ["dashboard", "reports", "admin"]);

  // Operational pages must NOT be present
  assert.equal(visibleKeys.includes("sales"), false);
  assert.equal(visibleKeys.includes("purchases"), false);
  assert.equal(visibleKeys.includes("cash_register"), false);
  assert.equal(visibleKeys.includes("inventory"), false);
  assert.equal(visibleKeys.includes("parties"), false);
  assert.equal(visibleKeys.includes("expenses"), false);
  assert.equal(visibleKeys.includes("invoices"), false);
  assert.equal(visibleKeys.includes("repairs"), false);
  assert.equal(visibleKeys.includes("employees"), false);
});

test("getVisibleTabs: Branch Manager sees operational pages in the sidemenu", () => {
  const manager = {
    id: 5,
    role_name: "manager",
    full_name: "Store Manager",
    permissions: [
      { page_key: "sales", action_key: "view", is_allowed: 1 },
      { page_key: "purchases", action_key: "view", is_allowed: 1 }
    ]
  };

  const visible = AppMod.getVisibleTabs(manager);
  const visibleKeys = visible.map((t) => t.key);

  // Branch manager should have access to operational modules
  assert.ok(visibleKeys.includes("sales"));
  assert.ok(visibleKeys.includes("purchases"));
  assert.ok(visibleKeys.includes("dashboard"));
});

