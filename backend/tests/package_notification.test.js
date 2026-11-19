import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { query } from "../src/db/pool.js";

let server;
let baseUrl;
let topAdminToken;
let companyAdminToken;
let testBusinessId;
let testBranchId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Top Admin
  const [topAdmin] = await query("SELECT u.* FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'top_admin' LIMIT 1");
  topAdminToken = jwt.sign({ userId: topAdmin.id }, env.jwtSecret, { expiresIn: "1h" });

  // Create isolated test business, branch, and company admin
  const ts = Date.now().toString().slice(-6);
  const [role] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");

  const bizRes = await query("INSERT INTO businesses (name, code, is_active, email) VALUES (?, ?, 1, ?)", [
    `Notification Test Biz ${ts}`,
    `NTB_${ts}`,
    `admin_notif_${ts}@example.com`
  ]);
  testBusinessId = bizRes.insertId;

  const brRes = await query("INSERT INTO branches (business_id, name, code) VALUES (?, 'Main Branch', ?)", [
    testBusinessId,
    `NTBR_${ts}`
  ]);
  testBranchId = brRes.insertId;

  const userRes = await query(
    "INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active) VALUES (?, ?, ?, 'Test Company Admin', ?, 'hash', 1)",
    [testBusinessId, testBranchId, role.id, `company_admin_${ts}@example.com`]
  );
  companyAdminToken = jwt.sign({ userId: userRes.insertId }, env.jwtSecret, { expiresIn: "1h" });

  // Initial subscription
  await query(
    "INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, subscription_starts_on, current_period_ends_on) VALUES (?, ?, 1, 'active', '2026-01-01', '2026-06-01')",
    [testBusinessId, testBranchId]
  );
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (testBusinessId) {
    await query("DELETE FROM notifications WHERE branch_id = ?", [testBranchId]);
    await query("DELETE FROM branch_subscriptions WHERE business_id = ?", [testBusinessId]);
    await query("DELETE FROM users WHERE business_id = ?", [testBusinessId]);
    await query("DELETE FROM branches WHERE business_id = ?", [testBusinessId]);
    await query("DELETE FROM businesses WHERE id = ?", [testBusinessId]);
  }
});

test("Package change automatically triggers in-app notification and alerts for Company Admin", async () => {
  // 1. Initial count of notifications for company admin
  const resBefore = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${companyAdminToken}` }
  });
  assert.equal(resBefore.status, 200);
  const beforeItems = await resBefore.json();
  const countBefore = beforeItems.length;

  // 2. Fetch plan 2 (or another plan)
  const [targetPlan] = await query("SELECT id, name, price FROM subscription_plans WHERE is_active = 1 AND id != 1 LIMIT 1");
  const planToAssign = targetPlan || { id: 1, name: "Starter Monthly", price: 0 };

  // 3. Top Admin assigns/changes package for this branch
  const assignRes = await fetch(`${baseUrl}/api/admin/branch-subscriptions/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${topAdminToken}`
    },
    body: JSON.stringify({
      branchId: testBranchId,
      planId: planToAssign.id,
      startDate: new Date().toISOString().slice(0, 10),
      isBackdated: false
    })
  });
  assert.equal(assignRes.status, 200, "Package assignment must succeed");

  // 4. Company Admin fetches notifications
  const resAfter = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${companyAdminToken}` }
  });
  assert.equal(resAfter.status, 200);
  const afterItems = await resAfter.json();
  assert.equal(afterItems.length, countBefore + 1, "Must have exactly 1 new notification");

  const latestNotif = afterItems[0];
  assert.equal(latestNotif.branch_id, testBranchId);
  assert.equal(latestNotif.notification_type, "package_changed");
  assert.ok(latestNotif.title.includes(planToAssign.name), "Notification title must include plan name");
  assert.ok(latestNotif.message.includes(planToAssign.name), "Notification message must include plan name");
  assert.equal(latestNotif.is_read, 0, "Notification must be unread");

  // 5. Test direct plan change endpoint
  const changeRes = await fetch(`${baseUrl}/api/admin/branch-subscriptions/${testBranchId}/change-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${topAdminToken}`
    },
    body: JSON.stringify({ planId: 1 })
  });
  assert.equal(changeRes.status, 200, "Plan change must succeed");

  const resFinal = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${companyAdminToken}` }
  });
  assert.equal(resFinal.status, 200);
  const finalItems = await resFinal.json();
  assert.equal(finalItems.length, countBefore + 2, "Must have 2 new notifications in total");
  assert.equal(finalItems[0].notification_type, "package_changed");
});
