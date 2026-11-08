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

const context = {
  session: {
    id: 1,
    full_name: "Admin User",
    role_name: "Administrator",
    branch_id: 1
  },
  branches: [{ id: 1, name: "Main Branch" }],
  models: [{ id: 1, company: "Apple", model_name: "iPhone 15" }],
  parties: [
    { id: 1, party_type: "vendor", name: "Demo Vendor", phone: "03000000000", cnic: "" },
    { id: 2, party_type: "customer", name: "Demo Customer", phone: "03111111111", cnic: "" }
  ],
  refreshAll() {}
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
    login: await vite.ssrLoadModule("/src/pages/LoginPage.jsx"),
    dashboard: await vite.ssrLoadModule("/src/pages/DashboardPage.jsx"),
    purchases: await vite.ssrLoadModule("/src/pages/PurchasesPage.jsx"),
    sales: await vite.ssrLoadModule("/src/pages/SalesPage.jsx"),
    inventory: await vite.ssrLoadModule("/src/pages/InventoryPage.jsx"),
    parties: await vite.ssrLoadModule("/src/pages/PartiesPage.jsx"),
    expenses: await vite.ssrLoadModule("/src/pages/ExpensesPage.jsx"),
    invoices: await vite.ssrLoadModule("/src/pages/InvoicesPage.jsx")
  };
});

after(async () => {
  await vite?.close();
});

test("app renders the login screen when there is no session", () => {
  const html = render(React.createElement(modules.app.App));
  assert.match(html, /DigitalMarkaz360/);
  assert.match(html, /Login/);
});

test("login page renders the default credential form", () => {
  const html = render(React.createElement(modules.login.LoginPage, { onLogin() {}, error: "" }));
  assert.match(html, /admin@mobilepos.local/);
  assert.match(html, /Password/);
});

test("dashboard page renders its loading state before summary data arrives", () => {
  const html = render(React.createElement(modules.dashboard.DashboardPage, { context }));
  assert.match(html, /Loading dashboard/);
});

test("purchases page renders purchase entry fields", () => {
  const html = render(React.createElement(modules.purchases.PurchasesPage, { context }));
  assert.match(html, /Create Purchase/);
  assert.match(html, /Select vendor/);
});

test("sales page renders sale entry fields", () => {
  const html = render(React.createElement(modules.sales.SalesPage, { context }));
  assert.match(html, /Create Sale/);
  assert.match(html, /Walk in \/ new customer/);
});

test("inventory page renders inventory filters and trace panel", () => {
  const html = render(React.createElement(modules.inventory.InventoryPage, { context }));
  assert.match(html, /Inventory In Hand/);
  assert.match(html, /IMEI Traceability/);
});

test("parties page renders party form and current party list", () => {
  const html = render(React.createElement(modules.parties.PartiesPage, { context }));
  assert.match(html, /Party Master/);
  assert.match(html, /Demo Vendor/);
});

test("expenses page renders expense entry fields", () => {
  const html = render(React.createElement(modules.expenses.ExpensesPage, { context }));
  assert.match(html, /Record Expense/);
  assert.match(html, /Utility Bill/);
});

test("invoices page renders invoice lookup controls", () => {
  const html = render(React.createElement(modules.invoices.InvoicesPage));
  assert.match(html, /Invoices Directory/);
  assert.match(html, /Sale Invoice/);
});
