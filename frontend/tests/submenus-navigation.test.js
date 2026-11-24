import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";

let vite;
let modules;
const testDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(testDir, "..");

const sampleContext = {
  session: {
    id: 1,
    full_name: "Branch Manager",
    role_name: "manager",
    branch_id: 1
  },
  branches: [{ id: 1, name: "Main Branch" }],
  models: [{ id: 1, company: "Apple", model_name: "iPhone 15" }],
  parties: [
    { id: 1, party_type: "vendor", name: "Demo Vendor", phone: "03000000000", cnic: "" },
    { id: 2, party_type: "customer", name: "Demo Customer", phone: "03111111111", cnic: "" }
  ],
  products: [],
  refreshAll() {},
  can: () => true
};

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

  modules = {
    app: await vite.ssrLoadModule("/src/App.jsx"),
    inventory: await vite.ssrLoadModule("/src/pages/InventoryPage.jsx"),
    parties: await vite.ssrLoadModule("/src/pages/PartiesPage.jsx"),
    expenses: await vite.ssrLoadModule("/src/pages/ExpensesPage.jsx"),
    classicLayout: await vite.ssrLoadModule("/src/components/layouts/ClassicLayout.jsx"),
    modernLayout: await vite.ssrLoadModule("/src/components/layouts/ModernLayout.jsx"),
    executiveLayout: await vite.ssrLoadModule("/src/components/layouts/ExecutiveLayout.jsx")
  };
});

after(async () => {
  await vite?.close();
});

test("Inventory, Parties, and Expenses subpages configuration", () => {
  const { INVENTORY_SUB_PAGES, PARTIES_SUB_PAGES, EXPENSES_SUB_PAGES, tabs } = modules.app;

  // Inventory subpages
  assert.equal(INVENTORY_SUB_PAGES.length, 4);
  assert.equal(INVENTORY_SUB_PAGES[0].label, "Handsets & Serialized IMEIs");
  assert.equal(INVENTORY_SUB_PAGES[0].key, "inventory_imei");
  assert.equal(INVENTORY_SUB_PAGES[1].label, "Accessories & Products Catalog");
  assert.equal(INVENTORY_SUB_PAGES[1].key, "inventory_products");
  assert.equal(INVENTORY_SUB_PAGES[2].label, "Inter-Branch Stock Transfers");
  assert.equal(INVENTORY_SUB_PAGES[2].key, "inventory_transfers");
  assert.equal(INVENTORY_SUB_PAGES[3].label, "Returns & RMAs");
  assert.equal(INVENTORY_SUB_PAGES[3].key, "inventory_returns");

  // Parties subpages
  assert.equal(PARTIES_SUB_PAGES.length, 2);
  assert.equal(PARTIES_SUB_PAGES[0].label, "Party Master & Registration");
  assert.equal(PARTIES_SUB_PAGES[0].key, "parties_new");
  assert.equal(PARTIES_SUB_PAGES[1].label, "Party Details & Directory");
  assert.equal(PARTIES_SUB_PAGES[1].key, "parties_directory");

  // Expenses subpages
  assert.equal(EXPENSES_SUB_PAGES.length, 2);
  assert.equal(EXPENSES_SUB_PAGES[0].label, "Record Expense (Outflow Counter)");
  assert.equal(EXPENSES_SUB_PAGES[0].key, "expenses_entry");
  assert.equal(EXPENSES_SUB_PAGES[1].label, "Expense Directory & History");
  assert.equal(EXPENSES_SUB_PAGES[1].key, "expenses_directory");

  // Check tabs mapping
  const invTab = tabs.find((t) => t.key === "inventory");
  assert.ok(invTab && invTab.subItems === INVENTORY_SUB_PAGES);

  const partTab = tabs.find((t) => t.key === "parties");
  assert.ok(partTab && partTab.subItems === PARTIES_SUB_PAGES);
  assert.equal(partTab.label, "Parties & Accounts");

  const expTab = tabs.find((t) => t.key === "expenses");
  assert.ok(expTab && expTab.subItems === EXPENSES_SUB_PAGES);
});

test("InventoryPage: in-page tab navigation bar is removed and content moves up", () => {
  const html = render(React.createElement(modules.inventory.InventoryPage, {
    context: sampleContext,
    activeSubPage: "imei"
  }));
  // Old tab bar buttons must NOT exist
  assert.doesNotMatch(html, /class="[^"]*ghost-btn[^"]*">📱/);
  // Content is rendered
  assert.match(html, /Filter Serialized Units/);
  assert.match(html, /IMEI Traceability/);

  // Testing another subpage
  const htmlProducts = render(React.createElement(modules.inventory.InventoryPage, {
    context: sampleContext,
    activeSubPage: "products"
  }));
  assert.match(htmlProducts, /Product Catalog/);
});

test("PartiesPage: conditionally renders subpages according to activeSubPage", () => {
  // When activeSubPage is "new", only Party Master & Registration renders
  const htmlNew = render(React.createElement(modules.parties.PartiesPage, {
    context: sampleContext,
    activeSubPage: "new"
  }));
  assert.match(htmlNew, /Party Master &amp; Registration/);
  assert.doesNotMatch(htmlNew, /Party Details &amp; Directory/);

  // When activeSubPage is "directory", only Party Details & Directory renders
  const htmlDir = render(React.createElement(modules.parties.PartiesPage, {
    context: sampleContext,
    activeSubPage: "directory"
  }));
  assert.doesNotMatch(htmlDir, /Party Master &amp; Registration/);
  assert.match(htmlDir, /Party Details &amp; Directory/);
  assert.match(htmlDir, /Demo Vendor/);

  // When activeSubPage is omitted, both render (backward compatibility)
  const htmlAll = render(React.createElement(modules.parties.PartiesPage, {
    context: sampleContext
  }));
  assert.match(htmlAll, /Party Master &amp; Registration/);
  assert.match(htmlAll, /Party Details &amp; Directory/);
});

test("ExpensesPage: in-page tab navigation bar is removed and content moves up", () => {
  const htmlEntry = render(React.createElement(modules.expenses.ExpensesPage, {
    context: sampleContext,
    activeSubPage: "entry"
  }));
  // Old nav-tabs div with buttons must NOT exist
  assert.doesNotMatch(htmlEntry, /<div class="nav-tabs"/);
  // Expense entry form is rendered
  assert.match(htmlEntry, /Record Expense/);
  assert.match(htmlEntry, /Tea &amp; Refreshments/);

  // When activeSubPage is "directory", directory is rendered
  const htmlDir = render(React.createElement(modules.expenses.ExpensesPage, {
    context: sampleContext,
    activeSubPage: "directory"
  }));
  assert.match(htmlDir, /Expense Directory &amp; History/);
});

test("ClassicLayout and ModernLayout: Inventory, Parties, and Expenses are collapsed by default", () => {
  const { getVisibleTabs } = modules.app;
  const user = { id: 1, role_name: "manager" };
  const visibleTabs = getVisibleTabs(user);

  const classicHtml = render(React.createElement(modules.classicLayout.ClassicLayout, {
    session: user,
    activeTab: "dashboard",
    tabs: visibleTabs,
    pageBreadcrumb: { isNested: false, current: "Dashboard" },
    THEMES: []
  }));

  // In ClassicLayout, aria-expanded must be false for inventory, parties, and expenses
  assert.match(classicHtml, /aria-expanded="false"[^>]*>[\s\S]*?Inventory/i);
  assert.match(classicHtml, /aria-expanded="false"[^>]*>[\s\S]*?Parties &amp; Accounts/i);
  assert.match(classicHtml, /aria-expanded="false"[^>]*>[\s\S]*?Expenses/i);

  // ModernLayout test
  const modernHtml = render(React.createElement(modules.modernLayout.ModernLayout, {
    session: user,
    activeTab: "dashboard",
    tabs: visibleTabs,
    pageBreadcrumb: { isNested: false, current: "Dashboard" },
    THEMES: []
  }));

  assert.match(modernHtml, /aria-expanded="false"[^>]*>[\s\S]*?Inventory/i);
  assert.match(modernHtml, /aria-expanded="false"[^>]*>[\s\S]*?Parties &amp; Accounts/i);
  assert.match(modernHtml, /aria-expanded="false"[^>]*>[\s\S]*?Expenses/i);
});

test("Permissions: Cashier vs Manager for subpages", () => {
  const { canUse } = modules.app;

  // Manager has permissions for create and view across parties and expenses
  const manager = { id: 1, role_name: "manager" };
  assert.equal(canUse(manager, "parties_new", "view"), true);
  assert.equal(canUse(manager, "parties_directory", "view"), true);
  assert.equal(canUse(manager, "expenses_entry", "view"), true);
  assert.equal(canUse(manager, "expenses_directory", "view"), true);

  // Cashier has view permissions on inventory, parties
  const cashier = { id: 2, role_name: "cashier" };
  assert.equal(canUse(cashier, "inventory_imei", "view"), true);
  assert.equal(canUse(cashier, "parties_directory", "view"), true);
});

test("Side menu: sub-menu items are only shown when related page is active, otherwise show main menu items only", () => {
  const user = { id: 1, role_name: "admin" };
  const allTabs = modules.app.tabs;

  // 1. When on 'dashboard': All sub-menus are hidden across Classic, Modern, and Executive layouts
  for (const layoutName of ["classicLayout", "modernLayout", "executiveLayout"]) {
    const LayoutComponent = modules[layoutName][Object.keys(modules[layoutName])[0]];
    const html = render(React.createElement(LayoutComponent, {
      session: user,
      activeTab: "dashboard",
      tabs: allTabs,
      pageBreadcrumb: { isNested: false, current: "Dashboard" },
      THEMES: []
    }));

    // Inactive menu groups must NOT show sub-menu items
    assert.doesNotMatch(html, /Handsets &amp; Serialized IMEIs/);
    assert.doesNotMatch(html, /Party Master &amp; Registration/);
    assert.doesNotMatch(html, /Record Expense/);
    assert.doesNotMatch(html, /Branches &amp; Outlets/);

    // All groups must have aria-expanded="false"
    assert.match(html, /aria-expanded="false"[^>]*>[\s\S]*?Inventory/i);
    assert.match(html, /aria-expanded="false"[^>]*>[\s\S]*?Parties &amp; Accounts/i);
    assert.match(html, /aria-expanded="false"[^>]*>[\s\S]*?Expenses/i);
    assert.match(html, /aria-expanded="false"[^>]*>[\s\S]*?Admin/i);
  }

  // 2. When on 'inventory_imei': Only Inventory shows its sub-menu items, others show main menu items only
  for (const layoutName of ["classicLayout", "modernLayout", "executiveLayout"]) {
    const LayoutComponent = modules[layoutName][Object.keys(modules[layoutName])[0]];
    const html = render(React.createElement(LayoutComponent, {
      session: user,
      activeTab: "inventory_imei",
      tabs: allTabs,
      pageBreadcrumb: { isNested: true, parent: "Inventory", current: "Handsets" },
      THEMES: []
    }));

    // Inventory sub-items ARE shown
    assert.match(html, /Handsets &amp; Serialized IMEIs/);
    assert.match(html, /Inter-Branch Stock Transfers/);
    assert.match(html, /aria-expanded="true"[^>]*>[\s\S]*?Inventory/i);

    // Other sub-items are NOT shown (main menu items only)
    assert.doesNotMatch(html, /Party Master &amp; Registration/);
    assert.doesNotMatch(html, /Record Expense/);
    assert.doesNotMatch(html, /Branches &amp; Outlets/);
    assert.match(html, /aria-expanded="false"[^>]*>[\s\S]*?Parties &amp; Accounts/i);
    assert.match(html, /aria-expanded="false"[^>]*>[\s\S]*?Expenses/i);
    assert.match(html, /aria-expanded="false"[^>]*>[\s\S]*?Admin/i);
  }

  // 3. When on 'parties_new': Only Parties shows its sub-menu items
  for (const layoutName of ["classicLayout", "modernLayout", "executiveLayout"]) {
    const LayoutComponent = modules[layoutName][Object.keys(modules[layoutName])[0]];
    const html = render(React.createElement(LayoutComponent, {
      session: user,
      activeTab: "parties_new",
      tabs: allTabs,
      pageBreadcrumb: { isNested: true, parent: "Parties", current: "Registration" },
      THEMES: []
    }));

    // Parties sub-items ARE shown
    assert.match(html, /Party Master &amp; Registration/);
    assert.match(html, /Party Details &amp; Directory/);
    assert.match(html, /aria-expanded="true"[^>]*>[\s\S]*?Parties &amp; Accounts/i);

    // Inventory and other sub-items are NOT shown
    assert.doesNotMatch(html, /Handsets &amp; Serialized IMEIs/);
    assert.doesNotMatch(html, /Record Expense/);
    assert.doesNotMatch(html, /Branches &amp; Outlets/);
    assert.match(html, /aria-expanded="false"[^>]*>[\s\S]*?Inventory/i);
  }
});

test("Navigating from sub-menu page to another menu closes extended sub-menu and keeps inactive menus hidden", () => {
  const user = { id: 1, role_name: "admin" };
  const allTabs = modules.app.tabs;

  for (const layoutName of ["classicLayout", "modernLayout", "executiveLayout"]) {
    const LayoutComponent = modules[layoutName][Object.keys(modules[layoutName])[0]];

    // Step 1: On a sub-menu page (e.g. 'inventory_transfers')
    const htmlStep1 = render(React.createElement(LayoutComponent, {
      session: user,
      activeTab: "inventory_transfers",
      tabs: allTabs,
      pageBreadcrumb: { isNested: true, parent: "Inventory", current: "Inter-Branch Stock Transfers" },
      THEMES: []
    }));

    // Inventory sub-menu is extended
    assert.match(htmlStep1, /aria-expanded="true"[^>]*>[\s\S]*?Inventory/i);
    assert.match(htmlStep1, /Inter-Branch Stock Transfers/);
    // Other menus are collapsed / hidden normally
    assert.match(htmlStep1, /aria-expanded="false"[^>]*>[\s\S]*?Expenses/i);
    assert.match(htmlStep1, /aria-expanded="false"[^>]*>[\s\S]*?Parties/i);
    assert.match(htmlStep1, /aria-expanded="false"[^>]*>[\s\S]*?Admin/i);
    assert.doesNotMatch(htmlStep1, /Record Expense/);
    assert.doesNotMatch(htmlStep1, /Party Master &amp; Registration/);

    // Step 2: Navigate to another menu (e.g. 'invoices' - normal menu without sub-items)
    const htmlStep2 = render(React.createElement(LayoutComponent, {
      session: user,
      activeTab: "invoices",
      tabs: allTabs,
      pageBreadcrumb: { isNested: false, current: "Invoices" },
      THEMES: []
    }));

    // The previously extended inventory sub-menu is now CLOSED and hidden
    assert.match(htmlStep2, /aria-expanded="false"[^>]*>[\s\S]*?Inventory/i);
    assert.doesNotMatch(htmlStep2, /Inter-Branch Stock Transfers/);
    assert.doesNotMatch(htmlStep2, /Handsets &amp; Serialized IMEIs/);
    // Other menus remain hidden normally
    assert.match(htmlStep2, /aria-expanded="false"[^>]*>[\s\S]*?Expenses/i);
    assert.doesNotMatch(htmlStep2, /Record Expense/);

    // Step 3: Navigate to another grouped menu (e.g. 'expenses_entry')
    const htmlStep3 = render(React.createElement(LayoutComponent, {
      session: user,
      activeTab: "expenses_entry",
      tabs: allTabs,
      pageBreadcrumb: { isNested: true, parent: "Expenses", current: "Record Expense" },
      THEMES: []
    }));

    // Previous inventory sub-menu is closed and hidden
    assert.match(htmlStep3, /aria-expanded="false"[^>]*>[\s\S]*?Inventory/i);
    assert.doesNotMatch(htmlStep3, /Inter-Branch Stock Transfers/);
    // New expenses menu is extended
    assert.match(htmlStep3, /aria-expanded="true"[^>]*>[\s\S]*?Expenses/i);
    assert.match(htmlStep3, /Record Expense/);
    // All other menus remain hidden normally
    assert.match(htmlStep3, /aria-expanded="false"[^>]*>[\s\S]*?Parties/i);
    assert.doesNotMatch(htmlStep3, /Party Master &amp; Registration/);
  }
});


