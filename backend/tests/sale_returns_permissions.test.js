import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { query } from "../src/db/pool.js";

let server;
let baseUrl;
let businessId;
let branchId;
let planWithReturnsId;
let planWithoutReturnsId;
let planLegacyReturnsId;
let adminToken;
let adminUserId;
let employeeUserId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const ts = Date.now().toString().slice(-6);

  // 1. Plan WITH sale_returns included
  const pkgWithReturns = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1000, 1000, 'monthly', 1, 'month', 10, 14, 7, 1, ?)`,
    [
      `Package With Returns ${ts}`,
      JSON.stringify(["dashboard", "sales", "sale_returns", "inventory", "invoices"])
    ]
  );
  planWithReturnsId = pkgWithReturns.insertId;

  // 2. Plan WITHOUT sale_returns included
  const pkgWithoutReturns = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1000, 1000, 'monthly', 1, 'month', 10, 14, 7, 1, ?)`,
    [
      `Package Without Returns ${ts}`,
      JSON.stringify(["dashboard", "sales", "inventory", "invoices"])
    ]
  );
  planWithoutReturnsId = pkgWithoutReturns.insertId;

  // 3. Plan with legacy order_returns included
  const pkgLegacy = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1000, 1000, 'monthly', 1, 'month', 10, 14, 7, 1, ?)`,
    [
      `Package Legacy Returns ${ts}`,
      JSON.stringify(["dashboard", "sales", "order_returns", "inventory", "invoices"])
    ]
  );
  planLegacyReturnsId = pkgLegacy.insertId;

  // Create test business
  const biz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Returns Biz ${ts}`, `RTB_${ts}`]
  );
  businessId = biz.insertId;

  // Create branch
  const br = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Returns Branch', ?)",
    [businessId, `RTBR_${ts}`]
  );
  branchId = br.insertId;

  // Start with subscription that HAS sale_returns
  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on)
     VALUES (?, ?, ?, 'active', '2099-12-31')`,
    [businessId, branchId, planWithReturnsId]
  );

  const [superAdminRole] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");
  const [cashierRole] = await query("SELECT id FROM roles WHERE name = 'cashier' LIMIT 1");
  const passwordHash = await bcrypt.hash("adminPass123", 10);

  const adminResult = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Returns Admin', ?, ?, 1)`,
    [businessId, superAdminRole.id, branchId, `returns_admin_${ts}@test.local`, passwordHash]
  );
  adminUserId = adminResult.insertId;
  adminToken = jwt.sign({ userId: adminUserId }, env.jwtSecret, { expiresIn: "1h" });

  const empResult = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Returns Employee', ?, ?, 1)`,
    [businessId, cashierRole.id, branchId, `returns_emp_${ts}@test.local`, passwordHash]
  );
  employeeUserId = empResult.insertId;
});

after(async () => {
  try {
    if (businessId) {
      await query("DELETE FROM user_permissions WHERE user_id IN (SELECT id FROM users WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM business_role_permissions WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branch_subscriptions WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM users WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branches WHERE id = ?", [branchId]);
      await query("DELETE FROM businesses WHERE id = ?", [businessId]);
    }
    if (planWithReturnsId) await query("DELETE FROM subscription_plans WHERE id = ?", [planWithReturnsId]);
    if (planWithoutReturnsId) await query("DELETE FROM subscription_plans WHERE id = ?", [planWithoutReturnsId]);
    if (planLegacyReturnsId) await query("DELETE FROM subscription_plans WHERE id = ?", [planLegacyReturnsId]);
  } catch (err) {
    console.error("Cleanup error in sale_returns_permissions.test.js:", err);
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((res) => server.close(res));
    }
  }
});

test("Package includes 'sale_returns': Business Admin granting role permissions saves successfully (HTTP 200)", async () => {
  const res = await fetch(`${baseUrl}/api/admin/business-role-permissions/manager`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      permissions: [
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sale_returns", actionKey: "view", isAllowed: 1 },
        { pageKey: "sale_returns", actionKey: "create", isAllowed: 1 },
        { pageKey: "sale_returns", actionKey: "approve", isAllowed: 1 }
      ]
    })
  });

  assert.equal(res.status, 200, "Should save with 200 OK when package includes sale_returns");
  const data = await res.json();
  assert.equal(data.success, true);

  // Verify in database
  const saved = await query(
    "SELECT page_key, action_key, is_allowed FROM business_role_permissions WHERE business_id = ? AND role_name = 'manager' AND page_key = 'sale_returns'",
    [businessId]
  );
  assert.equal(saved.length, 3);
});

test("Package includes 'sale_returns': Business Admin granting individual employee permissions saves successfully (HTTP 200)", async () => {
  const res = await fetch(`${baseUrl}/api/admin/users/${employeeUserId}/permissions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      permissions: [
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sale_returns", actionKey: "view", isAllowed: 1 },
        { pageKey: "sale_returns", actionKey: "create", isAllowed: 1 }
      ]
    })
  });

  assert.equal(res.status, 200, "Should save with 200 OK for employee when package includes sale_returns");
  const data = await res.json();
  assert.equal(data.success, true);

  const saved = await query(
    "SELECT page_key, action_key, is_allowed FROM user_permissions WHERE user_id = ? AND page_key = 'sale_returns'",
    [employeeUserId]
  );
  assert.equal(saved.length, 2);
});

test("Package EXCLUDES 'sale_returns': Saving fails with 400 and clear error naming 'These modules are not in your package: sale_returns'", async () => {
  // Switch subscription to package WITHOUT sale_returns
  await query("UPDATE branch_subscriptions SET plan_id = ? WHERE branch_id = ?", [planWithoutReturnsId, branchId]);

  const res = await fetch(`${baseUrl}/api/admin/business-role-permissions/manager`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      permissions: [
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sale_returns", actionKey: "view", isAllowed: 1 }
      ]
    })
  });

  assert.equal(res.status, 400, "Should reject with 400 Bad Request when package excludes sale_returns");
  const err = await res.json();
  assert.match(err.message, /These modules are not in your package: sale_returns/);
});

test("Save validation names ALL non-package modules at once in error message", async () => {
  // Plan without returns also excludes 'expenses' and 'purchases'
  const res = await fetch(`${baseUrl}/api/admin/business-role-permissions/manager`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      permissions: [
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sale_returns", actionKey: "view", isAllowed: 1 },
        { pageKey: "purchases", actionKey: "view", isAllowed: 1 },
        { pageKey: "expenses", actionKey: "view", isAllowed: 1 }
      ]
    })
  });

  assert.equal(res.status, 400);
  const err = await res.json();
  assert.match(err.message, /These modules are not in your package:/);
  assert.match(err.message, /sale_returns/);
  assert.match(err.message, /purchases/);
  assert.match(err.message, /expenses/);
});

test("Backward compatibility: Package with legacy 'order_returns' allows saving 'sale_returns'", async () => {
  // Switch to package that has legacy 'order_returns'
  await query("UPDATE branch_subscriptions SET plan_id = ? WHERE branch_id = ?", [planLegacyReturnsId, branchId]);

  const res = await fetch(`${baseUrl}/api/admin/business-role-permissions/manager`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      permissions: [
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sale_returns", actionKey: "view", isAllowed: 1 }
      ]
    })
  });

  assert.equal(res.status, 200, "Legacy order_returns in package should authorize sale_returns");
  const data = await res.json();
  assert.equal(data.success, true);
});
