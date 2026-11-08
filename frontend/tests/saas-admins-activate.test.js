import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";

let vite;
let TopSaasAdminsPageMod;
let TopAdminsPageMod;
const testDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(testDir, "..");

const sampleSaasAdmins = [
  {
    id: 1,
    full_name: "Root Super Admin",
    email: "root@platform.local",
    is_active: 1,
    is_break_glass: 0,
    mfa_enabled: 1,
    created_at: "2026-01-01T00:00:00Z",
    last_login_at: "2026-10-22T10:00:00Z"
  },
  {
    id: 2,
    full_name: "Inactive Admin",
    email: "inactive@platform.local",
    is_active: 0,
    is_break_glass: 0,
    mfa_enabled: 0,
    created_at: "2026-02-01T00:00:00Z",
    last_login_at: null
  },
  {
    id: 3,
    full_name: "Emergency Vault Admin",
    email: "breakglass@platform.local",
    is_active: 1,
    is_break_glass: 1,
    mfa_enabled: 1,
    created_at: "2026-01-01T00:00:00Z",
    last_login_at: null
  },
  {
    id: 4,
    full_name: "Other Active Admin",
    email: "other@platform.local",
    is_active: 1,
    is_break_glass: 0,
    mfa_enabled: 1,
    created_at: "2026-03-01T00:00:00Z",
    last_login_at: null
  }
];

const sampleCompanyAdmins = [
  {
    id: 101,
    full_name: "Active Company Admin",
    email: "active.company@store.com",
    business_id: 1,
    business_name: "Test Store",
    business_code: "TST",
    branch_name: "Main Branch",
    role_name: "company_admin",
    is_active: 1,
    created_at: "2026-01-15T00:00:00Z"
  },
  {
    id: 102,
    full_name: "Inactive Company Admin",
    email: "inactive.company@store.com",
    business_id: 1,
    business_name: "Test Store",
    business_code: "TST",
    branch_name: "Main Branch",
    role_name: "company_admin",
    is_active: 0,
    created_at: "2026-02-20T00:00:00Z"
  },
  {
    id: 103,
    full_name: "Protected Company Admin",
    email: "protected.company@store.com",
    business_id: 2,
    business_name: "Secure Org",
    business_code: "SEC",
    branch_name: "HQ",
    role_name: "company_admin",
    is_active: 1,
    is_protected: 1,
    created_at: "2026-01-10T00:00:00Z"
  }
];

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

  TopSaasAdminsPageMod = await vite.ssrLoadModule("/src/pages/TopSaasAdminsPage.jsx");
  TopAdminsPageMod = await vite.ssrLoadModule("/src/pages/TopAdminsPage.jsx");
});

after(async () => {
  await vite?.close();
});

// ========================================================
// 1. SAAS PLATFORM SUPER ADMINS LIST
// ========================================================

test("SaaS Admins - Requirement 1: No profile row shows a separate Active status badge", async () => {
  const { TopSaasAdminsPage } = TopSaasAdminsPageMod;

  const contextPermitted = {
    user: { id: 1, role_name: "top_admin" }
  };

  const html = renderToStaticMarkup(
    React.createElement(TopSaasAdminsPage, {
      context: contextPermitted,
      initialAdmins: sampleSaasAdmins
    })
  );

  assert.ok(!html.includes("status-pill"), "Must NOT render status-pill badge in profile row");
  assert.ok(!html.includes("status-success"), "Must NOT render status-success badge in profile row");
  assert.ok(!html.includes("status-danger"), "Must NOT render status-danger badge in profile row");
  assert.ok(!html.includes('<span class="badge badge-success">Active</span>'), "Must NOT render Active badge in table rows");
});

test("SaaS Admins - Requirement 2: Action column contains Activation Toggle Switch with ON/OFF state", async () => {
  const { TopSaasAdminsPage } = TopSaasAdminsPageMod;

  const contextPermitted = {
    user: { id: 1, role_name: "top_admin" }
  };

  // Active profile
  const htmlActive = renderToStaticMarkup(
    React.createElement(TopSaasAdminsPage, {
      context: contextPermitted,
      initialAdmins: [sampleSaasAdmins[3]]
    })
  );
  assert.ok(htmlActive.includes('role="switch"'), "Must render switch role control");
  assert.ok(htmlActive.includes('aria-checked="true"'), "Active profile switch must be ON (aria-checked=true)");
  assert.ok(htmlActive.includes("is-checked"), "Active profile switch must have is-checked class");
  assert.ok(!htmlActive.includes("is-disabled"), "Active permitted profile switch must NOT be disabled");

  // Inactive profile
  const htmlInactive = renderToStaticMarkup(
    React.createElement(TopSaasAdminsPage, {
      context: contextPermitted,
      initialAdmins: [sampleSaasAdmins[1]]
    })
  );
  assert.ok(htmlInactive.includes('role="switch"'), "Must render switch role control");
  assert.ok(htmlInactive.includes('aria-checked="false"'), "Inactive profile switch must be OFF (aria-checked=false)");
  assert.ok(htmlInactive.includes("is-unchecked"), "Inactive profile switch must have is-unchecked class");
  assert.ok(!htmlInactive.includes("is-disabled"), "Inactive permitted profile switch must NOT be disabled");
});

test("SaaS Admins - Requirement 3: Toggle switch is greyed out/disabled with tooltip when not allowed", async () => {
  const { TopSaasAdminsPage } = TopSaasAdminsPageMod;

  // Lacking permission on active profile
  const htmlActiveNoPerm = renderToStaticMarkup(
    React.createElement(TopSaasAdminsPage, {
      context: { user: { id: 99, role_name: "cashier" } },
      initialAdmins: [sampleSaasAdmins[3]]
    })
  );
  assert.ok(htmlActiveNoPerm.includes('title="You don&#x27;t have permission to deactivate this profile"'), "Must show deactivation permission tooltip");
  assert.ok(htmlActiveNoPerm.includes("is-disabled"), "Must carry is-disabled class on switch");
  assert.ok(htmlActiveNoPerm.includes("disabled"), "Must have disabled attribute");

  // Lacking permission on inactive profile
  const htmlInactiveNoPerm = renderToStaticMarkup(
    React.createElement(TopSaasAdminsPage, {
      context: { user: { id: 99, role_name: "cashier" } },
      initialAdmins: [sampleSaasAdmins[1]]
    })
  );
  assert.ok(htmlInactiveNoPerm.includes('title="You don&#x27;t have permission to activate this profile"'), "Must show activation permission tooltip");
  assert.ok(htmlInactiveNoPerm.includes("is-disabled"), "Must carry is-disabled class on switch");
  assert.ok(htmlInactiveNoPerm.includes("disabled"), "Must have disabled attribute");

  // Protected / system account (break-glass)
  const htmlProtected = renderToStaticMarkup(
    React.createElement(TopSaasAdminsPage, {
      context: { user: { id: 1, role_name: "top_admin" } },
      initialAdmins: [sampleSaasAdmins[2]]
    })
  );
  assert.ok(htmlProtected.includes('title="This profile cannot be changed"'), "Must show protected account tooltip");
  assert.ok(htmlProtected.includes("is-disabled"), "Must carry is-disabled class on switch");
  assert.ok(htmlProtected.includes("disabled"), "Must have disabled attribute");
});

test("SaaS Admins - Requirement 4: Action column contains Edit and Delete buttons stacked vertically", async () => {
  const { TopSaasAdminsPage } = TopSaasAdminsPageMod;

  const html = renderToStaticMarkup(
    React.createElement(TopSaasAdminsPage, {
      context: { user: { id: 1, role_name: "top_admin" } },
      initialAdmins: [sampleSaasAdmins[3]]
    })
  );

  assert.ok(html.includes("saas-table-actions-vertical"), "Must render vertical button stack container");
  assert.ok(html.includes("saas-btn-edit"), "Must render Edit button");
  assert.ok(html.includes("saas-btn-delete"), "Must render Delete button");

  const editIndex = html.indexOf("saas-btn-edit");
  const deleteIndex = html.indexOf("saas-btn-delete");
  assert.ok(editIndex < deleteIndex, "Edit button must appear above Delete button in vertical stack");
});

// ========================================================
// 2. COMPANY ADMINISTRATORS LIST (TOP ADMIN PANEL)
// ========================================================

test("Company Admins - Requirement 1: Separate Status column and Active status badge removed from row", async () => {
  const { TopAdminsPage } = TopAdminsPageMod;

  const html = renderToStaticMarkup(
    React.createElement(TopAdminsPage, {
      context: { user: { id: 1, role_name: "top_admin" } },
      initialAdmins: sampleCompanyAdmins
    })
  );

  // Assert no separate Status column header
  assert.ok(!html.includes("<th>Status</th>"), "Must NOT render separate Status column header");
  assert.ok(!html.includes("Active Primary"), "Must NOT render Active Primary badge in row");
  assert.ok(!html.includes("status-pill"), "Must NOT render status-pill badge in row");
});

test("Company Admins - Requirement 2: Activation toggle switch shows ON for active and OFF for inactive", async () => {
  const { TopAdminsPage } = TopAdminsPageMod;

  // Active admin
  const htmlActive = renderToStaticMarkup(
    React.createElement(TopAdminsPage, {
      context: { user: { id: 1, role_name: "top_admin" } },
      initialAdmins: [sampleCompanyAdmins[0]]
    })
  );
  assert.ok(htmlActive.includes('role="switch"'), "Must render toggle switch");
  assert.ok(htmlActive.includes('aria-checked="true"'), "Active admin switch must be ON (aria-checked=true)");
  assert.ok(htmlActive.includes("is-checked"), "Active admin switch must have is-checked class");
  assert.ok(!htmlActive.includes("is-disabled"), "Active permitted admin switch must NOT be disabled");

  // Inactive admin
  const htmlInactive = renderToStaticMarkup(
    React.createElement(TopAdminsPage, {
      context: { user: { id: 1, role_name: "top_admin" } },
      initialAdmins: [sampleCompanyAdmins[1]]
    })
  );
  assert.ok(htmlInactive.includes('role="switch"'), "Must render toggle switch");
  assert.ok(htmlInactive.includes('aria-checked="false"'), "Inactive admin switch must be OFF (aria-checked=false)");
  assert.ok(htmlInactive.includes("is-unchecked"), "Inactive admin switch must have is-unchecked class");
  assert.ok(!htmlInactive.includes("is-disabled"), "Inactive permitted admin switch must NOT be disabled");
});

test("Company Admins - Requirement 3: Toggle switch is greyed out with reason tooltip when not allowed", async () => {
  const { TopAdminsPage } = TopAdminsPageMod;

  // Missing permission on active company admin
  const htmlActiveNoPerm = renderToStaticMarkup(
    React.createElement(TopAdminsPage, {
      context: { user: { id: 99, role_name: "cashier" } },
      initialAdmins: [sampleCompanyAdmins[0]]
    })
  );
  assert.ok(
    htmlActiveNoPerm.includes('title="You don&#x27;t have permission to deactivate this administrator"'),
    "Must carry deactivation permission denied tooltip"
  );
  assert.ok(htmlActiveNoPerm.includes("is-disabled"), "Switch must be styled as disabled");
  assert.ok(htmlActiveNoPerm.includes("disabled"), "Switch must be disabled attribute");

  // Missing permission on inactive company admin
  const htmlInactiveNoPerm = renderToStaticMarkup(
    React.createElement(TopAdminsPage, {
      context: { user: { id: 99, role_name: "cashier" } },
      initialAdmins: [sampleCompanyAdmins[1]]
    })
  );
  assert.ok(
    htmlInactiveNoPerm.includes('title="You don&#x27;t have permission to activate this administrator"'),
    "Must carry activation permission denied tooltip"
  );
  assert.ok(htmlInactiveNoPerm.includes("is-disabled"), "Switch must be styled as disabled");
  assert.ok(htmlInactiveNoPerm.includes("disabled"), "Switch must be disabled attribute");

  // Protected company admin account
  const htmlProtected = renderToStaticMarkup(
    React.createElement(TopAdminsPage, {
      context: { user: { id: 1, role_name: "top_admin" } },
      initialAdmins: [sampleCompanyAdmins[2]] // is_protected: 1
    })
  );
  assert.ok(
    htmlProtected.includes('title="This account cannot be changed"'),
    "Must carry 'This account cannot be changed' tooltip"
  );
  assert.ok(htmlProtected.includes("is-disabled"), "Switch must be styled as disabled");
  assert.ok(htmlProtected.includes("disabled"), "Switch must be disabled attribute");
});

test("Company Admins - Requirement 4: Action column contains Edit and Delete buttons stacked vertically", async () => {
  const { TopAdminsPage } = TopAdminsPageMod;

  const html = renderToStaticMarkup(
    React.createElement(TopAdminsPage, {
      context: { user: { id: 1, role_name: "top_admin" } },
      initialAdmins: [sampleCompanyAdmins[0]]
    })
  );

  assert.ok(html.includes("saas-table-actions-vertical"), "Must render vertical button stack container");
  assert.ok(html.includes("saas-btn-edit"), "Must render Edit button");
  assert.ok(html.includes("saas-btn-delete"), "Must render Delete button");

  const editIndex = html.indexOf("saas-btn-edit");
  const deleteIndex = html.indexOf("saas-btn-delete");
  assert.ok(editIndex < deleteIndex, "Edit button must appear above Delete button in vertical stack");
});

// ========================================================
// 3. THEME VARIABLE CSS INTEGRITY
// ========================================================

test("Theme Variables: CSS styles use active theme variables for Edit and Delete buttons", () => {
  const css = fs.readFileSync(resolve(frontendRoot, "src", "styles.css"), "utf-8");

  assert.ok(css.includes(".saas-btn-edit"), "CSS must define .saas-btn-edit");
  assert.ok(css.includes(".saas-btn-delete"), "CSS must define .saas-btn-delete");

  const editMatch = css.match(/\.saas-btn-edit\s*\{([^}]+)\}/);
  assert.ok(editMatch, "Must find .saas-btn-edit declaration");
  assert.ok(editMatch[1].includes("var(--primary)"), ".saas-btn-edit must use var(--primary)");
  assert.ok(!editMatch[1].includes("#"), ".saas-btn-edit must not have hardcoded hex colors");

  const deleteMatch = css.match(/\.saas-btn-delete\s*\{([^}]+)\}/);
  assert.ok(deleteMatch, "Must find .saas-btn-delete declaration");
  assert.ok(deleteMatch[1].includes("var(--danger)"), ".saas-btn-delete must use var(--danger)");
  assert.ok(!deleteMatch[1].includes("#"), ".saas-btn-delete must not have hardcoded hex colors");
});
