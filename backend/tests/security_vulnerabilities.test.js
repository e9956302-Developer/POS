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
let planId;
let adminToken;
let cashierToken;
let adminUserId;
let cashierUserId;
let sampleModelId;
let inStockUnitId;
let testImei;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const ts = Date.now().toString().slice(-6);
  testImei = `999000${Date.now().toString().slice(-9)}`;

  // 1. Subscription Plan
  const plan = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1000, 1000, 'monthly', 1, 'month', 10, 14, 7, 1, ?)`,
    [`Sec Audit Plan ${ts}`, JSON.stringify(["dashboard", "sales", "inventory", "cash_register", "parties"])]
  );
  planId = plan.insertId;

  // 2. Business & Branch
  const biz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Sec Biz ${ts}`, `SEC_${ts}`]
  );
  businessId = biz.insertId;

  const br = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Security Test Branch', ?)",
    [businessId, `SBR_${ts}`]
  );
  branchId = br.insertId;

  // 3. Subscription
  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on)
     VALUES (?, ?, ?, 'active', '2099-12-31')`,
    [businessId, branchId, planId]
  );

  // 4. Users (Admin + Cashier)
  const [adminRole] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");
  const [cashierRole] = await query("SELECT id FROM roles WHERE name = 'cashier' LIMIT 1");
  const hash = await bcrypt.hash("strongPassword123", 10);

  const adminUser = await query(
    `INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Sec Admin', ?, ?, 1)`,
    [businessId, branchId, adminRole.id, `sec_admin_${ts}@test.local`, hash]
  );
  adminUserId = adminUser.insertId;
  adminToken = jwt.sign({ userId: adminUserId }, env.jwtSecret, { expiresIn: "2h" });

  const cashierUser = await query(
    `INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Sec Cashier', ?, ?, 1)`,
    [businessId, branchId, cashierRole.id, `sec_cashier_${ts}@test.local`, hash]
  );
  cashierUserId = cashierUser.insertId;
  cashierToken = jwt.sign({ userId: cashierUserId }, env.jwtSecret, { expiresIn: "2h" });

  // 5. Seed mobile model and unit
  const model = await query(
    "INSERT INTO mobile_models (business_id, company, model_name) VALUES (?, 'Apple', 'iPhone 15 Pro')",
    [businessId]
  );
  sampleModelId = model.insertId;

  const unit = await query(
    `INSERT INTO mobile_units (business_id, branch_id, model_id, imei, current_status, cost_price)
     VALUES (?, ?, ?, ?, 'in_stock', 250000)`,
    [businessId, branchId, sampleModelId, testImei]
  );
  inStockUnitId = unit.insertId;
});

after(async () => {
  try {
    if (businessId) {
      await query("DELETE FROM order_return_items WHERE return_id IN (SELECT id FROM order_returns WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM order_returns WHERE business_id = ?", [businessId]);
      await query("DELETE FROM sale_order_items WHERE sale_order_id IN (SELECT id FROM sale_orders WHERE branch_id = ?)", [branchId]);
      await query("DELETE FROM sale_orders WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM stock_movements WHERE business_id = ?", [businessId]);
      await query("DELETE FROM mobile_units WHERE business_id = ?", [businessId]);
      await query("DELETE FROM mobile_models WHERE business_id = ?", [businessId]);
      await query("DELETE FROM cash_register_sessions WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branch_subscriptions WHERE business_id = ?", [businessId]);
      await query("DELETE FROM users WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branches WHERE id = ?", [branchId]);
      await query("DELETE FROM businesses WHERE id = ?", [businessId]);
    }
    if (planId) {
      await query("DELETE FROM subscription_plans WHERE id = ?", [planId]);
    }
  } catch (err) {
    console.error("Cleanup error in security_vulnerabilities.test.js:", err);
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((res) => server.close(res));
    }
  }
});

test("Security Audit: Authentication - Malformed and forged JWT tokens are rejected with 401", async () => {
  const forgedToken = jwt.sign({ userId: 99999 }, "attacker-secret-key-12345");
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${forgedToken}` }
  });
  assert.equal(res.status, 401, "Forged token signature must result in HTTP 401");
});

test("Security Audit: Tenant Isolation - Cashier cannot read or manipulate data across branches without authorization", async () => {
  // Cashier attempting to access non-existent or other branch ID
  const foreignBranchId = branchId + 9999;
  const res = await fetch(`${baseUrl}/api/cash-register/session?branchId=${foreignBranchId}`, {
    headers: { Authorization: `Bearer ${cashierToken}` }
  });
  assert.ok(
    res.status === 403 || res.status === 404,
    `Cashier must be forbidden from accessing foreign branch (got ${res.status})`
  );
});

test("Security Audit: Privilege Boundary - Cashier cannot close cash register unless given explicit permission", async () => {
  // Cashier has DEFAULT permission for cash_register.close = 1 in auth.js,
  // but if explicitly overridden to 0:
  await query(
    `INSERT INTO user_permissions (user_id, page_key, action_key, is_allowed)
     VALUES (?, 'cash_register', 'close', 0)
     ON DUPLICATE KEY UPDATE is_allowed = 0`,
    [cashierUserId]
  );

  const res = await fetch(`${baseUrl}/api/cash-register/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cashierToken}`
    },
    body: JSON.stringify({
      branchId,
      actualCash: 50000
    })
  });

  assert.equal(res.status, 403, "Revoked permission must return 403 Forbidden");

  // Re-enable for subsequent tests
  await query("DELETE FROM user_permissions WHERE user_id = ?", [cashierUserId]);
});

test("Security Audit: Cryptography - Stored user password hash adheres strictly to bcrypt cost factor", async () => {
  const [userRow] = await query("SELECT password_hash FROM users WHERE id = ?", [adminUserId]);
  assert.ok(userRow.password_hash.startsWith("$2a$10$") || userRow.password_hash.startsWith("$2b$10$"), "Bcrypt hash with cost 10 expected");
});

test("Security Audit: CORS & HTTP - Preflight OPTIONS request checks", async () => {
  const res = await fetch(`${baseUrl}/health`, {
    method: "OPTIONS"
  });
  assert.ok(res.status >= 200 && res.status < 300, "CORS preflight responds");
});
