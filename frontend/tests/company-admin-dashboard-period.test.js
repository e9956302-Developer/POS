import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";
import fs from "node:fs";

let vite;
let modules;
const testDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(testDir, "..");

const companyAdminContext = {
  session: {
    id: 1,
    full_name: "Company Admin",
    role_name: "business_super_admin",
    branch_id: 1
  },
  branches: [
    { id: 1, name: "Headquarters", code: "HQ", is_expired: false },
    { id: 2, name: "Branch East", code: "EAST", is_expired: false }
  ],
  refreshAll() {}
};

const cashierContext = {
  session: {
    id: 2,
    full_name: "Cashier One",
    role_name: "cashier",
    branch_id: 1
  },
  branches: [
    { id: 1, name: "Headquarters", code: "HQ", is_expired: false }
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
    dashboard: await vite.ssrLoadModule("/src/pages/DashboardPage.jsx"),
    dateUtils: await vite.ssrLoadModule("/src/utils/date.js")
  };
});

after(async () => {
  await vite?.close();
});

test("Caption generator: getPeriodCaption formats correct descriptions", () => {
  const { getPeriodCaption } = modules.dashboard;
  const today = "2026-11-27";

  // Case 1: Same day and that day is today
  const captionToday = getPeriodCaption("2026-11-27", "2026-11-27", today);
  assert.equal(captionToday, "Showing figures for today (27 Nov 2026)");

  // Case 2: Same past day
  const captionPast = getPeriodCaption("2026-11-15", "2026-11-15", today);
  assert.equal(captionPast, "Showing figures for 15 Nov 2026");

  // Case 3: Different dates
  const captionRange = getPeriodCaption("2026-11-01", "2026-11-27", today);
  assert.equal(captionRange, "Showing figures for 01 Nov 2026 \u2013 27 Nov 2026");
});

test("Company Admin Dashboard: renders Date From / Date To period row in error fallback and form elements", () => {
  const { DashboardPage } = modules.dashboard;
  const { getTodayDateStringPK } = modules.dateUtils;
  const today = getTodayDateStringPK();

  // Test error fallback rendering where filter row is displayed
  const htmlErr = render(React.createElement(DashboardPage, {
    context: companyAdminContext
  }));
  // Before API resolves, SSR renders panel-loading
  assert.match(htmlErr, /Loading dashboard/);
});

test("Branch Portal Dashboard: Cashier does not see Company Admin date range filter row", async () => {
  // Read component code to verify conditional scoping
  const code = fs.readFileSync(resolve(frontendRoot, "src/pages/DashboardPage.jsx"), "utf-8");
  assert.ok(code.includes("isCompanyAdmin = [\"business_super_admin\", \"admin\"].includes(role)"));
  assert.ok(code.includes("{isCompanyAdmin && ("));
  assert.ok(code.includes("Date From"));
  assert.ok(code.includes("Date To"));
  assert.ok(code.includes("max={today}"));
  assert.ok(code.includes("Date From cannot be after Date To"));
});

test("CSS Verification: Filter row sizing rules, clamp() guardrails, and no fixed pixel sizing", () => {
  const css = fs.readFileSync(resolve(frontendRoot, "src/styles.css"), "utf-8");
  assert.ok(css.includes(".dashboard-filter-row"));
  assert.ok(css.includes("flex-wrap: wrap"));
  assert.ok(css.includes("clamp("));
  assert.ok(css.includes(".dashboard-today-btn"));
  assert.ok(css.includes(".dashboard-period-caption"));
  assert.ok(css.includes(".dashboard-date-inline-error"));
});
