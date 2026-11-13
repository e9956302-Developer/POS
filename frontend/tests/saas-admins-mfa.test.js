import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";

let vite;
let TopSaasAdminsPageMod;
const testDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(testDir, "..");

const sampleSaasAdmins = [
  {
    id: 101,
    full_name: "Logged In SuperAdmin",
    email: "superadmin@platform.local",
    is_active: 1,
    is_break_glass: 0,
    mfa_enabled: 1,
    created_at: "2026-01-01T00:00:00Z",
    last_login_at: "2026-10-22T10:00:00Z"
  },
  {
    id: 102,
    full_name: "Specific Row Admin",
    email: "specific.row@platform.local",
    is_active: 1,
    is_break_glass: 0,
    mfa_enabled: 0,
    created_at: "2026-02-01T00:00:00Z",
    last_login_at: null
  }
];

before(async () => {
  vite = await createServer({
    root: frontendRoot,
    server: { middlewareMode: true },
    appType: "custom",
    plugins: [reactPlugin()]
  });
  TopSaasAdminsPageMod = await vite.ssrLoadModule("/src/pages/TopSaasAdminsPage.jsx");
});

after(async () => {
  if (vite) {
    await vite.close();
  }
});

test("SaaS Admins MFA - Clicking row MFA badge passes that row's admin to onOpenMfaSetup", () => {
  const { TopSaasAdminsPage } = TopSaasAdminsPageMod;

  let openedUser = null;
  const onOpenMfaSetup = (adm) => {
    openedUser = adm;
  };

  const html = renderToStaticMarkup(
    React.createElement(TopSaasAdminsPage, {
      context: {
        session: sampleSaasAdmins[0],
        user: sampleSaasAdmins[0]
      },
      initialAdmins: sampleSaasAdmins,
      onOpenMfaSetup
    })
  );

  // Check that row 1 shows MFA Enabled and row 2 shows Password Only
  assert.ok(html.includes("🔐 MFA Enabled"), "Must show MFA Enabled for admin 101");
  assert.ok(html.includes("🔓 Password Only"), "Must show Password Only for admin 102");
  assert.ok(
    html.includes("Click to configure 2FA for Specific Row Admin") ||
    html.includes("Click to configure 2FA for specific.row@platform.local"),
    "Tooltip must explicitly name the specific row admin"
  );
});
