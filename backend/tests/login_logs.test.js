import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { query } from "../src/db/pool.js";

let server;
let baseUrl;
let topAdminToken;
let topAdminUserId;
let topAdminEmail;
let cashierToken;
let cashierUserId;
let cashierEmail;
let testBusinessId;
let testBranchId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  const ts = Date.now().toString().slice(-6);
  topAdminEmail = `topadmin_log_${ts}@pos.local`;
  cashierEmail = `cashier_log_${ts}@pos.local`;

  const [topRole] = await query("SELECT id FROM roles WHERE name = 'top_admin' LIMIT 1");
  const [cashierRole] = await query("SELECT id FROM roles WHERE name = 'cashier' LIMIT 1");
  const initialHash = await bcrypt.hash("InitialSecretPassword123!#", 12);

  // Create Top Admin
  const topRes = await query(
    `INSERT INTO users (role_id, full_name, email, password_hash, is_active, mfa_enabled)
     VALUES (?, 'Security Top Admin', ?, ?, 1, 1)`,
    [topRole.id, topAdminEmail, initialHash]
  );
  topAdminUserId = topRes.insertId;
  topAdminToken = jwt.sign({ userId: topAdminUserId }, env.jwtSecret, { expiresIn: "1h" });

  // Create Business & Branch
  const bizRes = await query("INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)", [
    `Audit Test Corp ${ts}`,
    `ATC_${ts}`
  ]);
  testBusinessId = bizRes.insertId;

  const brRes = await query("INSERT INTO branches (business_id, name, code) VALUES (?, 'Audit Main Branch', ?)", [
    testBusinessId,
    `AMB_${ts}`
  ]);
  testBranchId = brRes.insertId;

  // Create Cashier User
  const cashRes = await query(
    `INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Test Cashier Jane', ?, ?, 1)`,
    [testBusinessId, testBranchId, cashierRole.id, cashierEmail, initialHash]
  );
  cashierUserId = cashRes.insertId;
  cashierToken = jwt.sign({ userId: cashierUserId }, env.jwtSecret, { expiresIn: "1h" });
});

after(async () => {
  try {
    const userIds = [topAdminUserId, cashierUserId].filter(Boolean);
    if (userIds.length) {
      await query(`DELETE FROM audit_logs WHERE user_id IN (${userIds.join(",")})`);
      await query(`DELETE FROM user_sessions WHERE user_id IN (${userIds.join(",")})`);
      await query("DELETE FROM user_login_logs WHERE email IN (?, ?)", [topAdminEmail, cashierEmail]);
      await query(`DELETE FROM users WHERE id IN (${userIds.join(",")})`);
    }
    if (testBranchId) {
      await query("DELETE FROM branches WHERE id = ?", [testBranchId]);
    }
    if (testBusinessId) {
      await query("DELETE FROM businesses WHERE id = ?", [testBusinessId]);
    }
  } catch (err) {
    console.error("Cleanup error in login_logs.test.js:", err);
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((res) => server.close(res));
    }
  }
});

test("Login Logging: Successful login records user, system, OS, browser, IP, and company details", async () => {
  // Perform login with custom User-Agent simulation
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      "X-Forwarded-For": "203.0.113.45"
    },
    body: JSON.stringify({ email: cashierEmail, password: "InitialSecretPassword123!#" })
  });

  assert.equal(loginRes.status, 200, "Cashier login must succeed");

  // Query user_login_logs directly to verify persistence
  const logs = await query(
    "SELECT * FROM user_login_logs WHERE email = ? ORDER BY id DESC LIMIT 1",
    [cashierEmail]
  );

  assert.equal(logs.length, 1, "Must have recorded login log");
  const log = logs[0];
  assert.equal(log.email, cashierEmail);
  assert.equal(log.full_name, "Test Cashier Jane");
  assert.equal(log.role_name, "cashier");
  assert.match(log.business_name, /Audit Test Corp/i);
  assert.equal(log.branch_name, "Audit Main Branch");
  assert.equal(log.ip_address, "203.0.113.45");
  assert.match(log.system_summary, /Windows/i);
  assert.match(log.browser, /Chrome/i);
  assert.match(log.os, /Windows/i);
  assert.equal(log.status, "success");
});

test("Login Logging: Failed password attempt records failed_password status with client system & IP", async () => {
  const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1";
  const failRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      "X-Forwarded-For": "198.51.100.22"
    },
    body: JSON.stringify({ email: cashierEmail, password: "WrongPassword123!" })
  });

  assert.equal(failRes.status, 401, "Failed login returns 401");

  const failLogs = await query(
    "SELECT * FROM user_login_logs WHERE email = ? AND status = 'failed_password' ORDER BY id DESC LIMIT 1",
    [cashierEmail]
  );

  assert.equal(failLogs.length, 1, "Must record failed login attempt in log");
  const log = failLogs[0];
  assert.equal(log.status, "failed_password");
  assert.equal(log.ip_address, "198.51.100.22");
  assert.match(log.system_summary, /iPhone/i);
  assert.match(log.device_type, /Mobile/i);
  assert.match(log.failure_reason, /Invalid password/i);
});

test("Top Admin API: GET /api/admin/login-logs returns paginated logs with search & filters", async () => {
  const res = await fetch(`${baseUrl}/api/admin/login-logs?search=${cashierEmail}&page=1&limit=10`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.logs));
  assert.ok(data.total >= 2, "Should return at least 2 logs for cashier");
  assert.equal(data.page, 1);
  assert.ok(data.logs[0].system_summary, "Logs must contain system summary");
  assert.ok(data.logs[0].ip_address, "Logs must contain IP address");
});

test("Top Admin API: GET /api/admin/login-logs/stats returns aggregate metrics for dashboard", async () => {
  const res = await fetch(`${baseUrl}/api/admin/login-logs/stats`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });

  assert.equal(res.status, 200);
  const stats = await res.json();
  assert.ok(stats.totalToday >= 2, "Must count today's logins");
  assert.ok(stats.successToday >= 1);
  assert.ok(stats.failedToday >= 1);
  assert.ok(Array.isArray(stats.topSystems));
  assert.ok(Array.isArray(stats.topOs));
  assert.ok(Array.isArray(stats.topBrowsers));
});

test("Security Boundary: Non-top-admin accounts are blocked from GET /api/admin/login-logs", async () => {
  const blockedRes = await fetch(`${baseUrl}/api/admin/login-logs`, {
    headers: { Authorization: `Bearer ${cashierToken}` }
  });

  assert.equal(blockedRes.status, 403, "Cashier cannot access SaaS Admin login logs");
});
