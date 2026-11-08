import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { app } from "../src/app.js";
import { pool, query } from "../src/db/pool.js";

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

test("inactivity messaging: appropriate attribution for person, company, and branch", async () => {
  const ts = Date.now().toString().slice(-6);
  const password = "TestPassword123!";
  const passwordHash = await bcrypt.hash(password, 10);

  let bizId = null;
  let activeBranchId = null;
  let inactiveBranchId = null;
  let activeStaffId = null;
  let inactiveStaffId = null;
  let inactiveBizAdminId = null;

  try {
    // 1. Create a test company with DigitalMarkaz360 software name and tagline
    const bizRes = await query(
      "INSERT INTO businesses (name, code, is_active, software_name, tagline) VALUES (?, ?, 1, 'DigitalMarkaz360', 'Poora Karobar, Ek Markaz')",
      [`Biz_${ts}`, `BZ_${ts}`]
    );
    bizId = bizRes.insertId;

    // 2. Create active and inactive branches
    const activeBranchRes = await query(
      "INSERT INTO branches (business_id, name, code, is_active) VALUES (?, 'Active Branch', ?, 1)",
      [bizId, `AB_${ts}`]
    );
    activeBranchId = activeBranchRes.insertId;

    const inactiveBranchRes = await query(
      "INSERT INTO branches (business_id, name, code, is_active) VALUES (?, 'Inactive Branch', ?, 0)",
      [bizId, `IB_${ts}`]
    );
    inactiveBranchId = inactiveBranchRes.insertId;

    // Get cashier and admin role IDs
    const [cashierRole] = await query("SELECT id FROM roles WHERE name = 'cashier'");
    const [adminRole] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' OR name = 'admin' LIMIT 1");

    // 3. Create inactive staff member (Cashier) under active branch
    const staffEmail = `inactive_staff_${ts}@test.com`;
    const inStaffRes = await query(
      "INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active) VALUES (?, ?, ?, 'Inactive Staff', ?, ?, 0)",
      [bizId, activeBranchId, cashierRole.id, staffEmail, passwordHash]
    );
    inactiveStaffId = inStaffRes.insertId;

    // 4. Create inactive Company Admin
    const bizAdminEmail = `inactive_admin_${ts}@test.com`;
    const inAdminRes = await query(
      "INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active) VALUES (?, NULL, ?, 'Inactive Admin', ?, ?, 0)",
      [bizId, adminRole.id, bizAdminEmail, passwordHash]
    );
    inactiveBizAdminId = inAdminRes.insertId;

    // 5. Create active staff under inactive branch
    const branchStaffEmail = `branch_staff_${ts}@test.com`;
    const bStaffRes = await query(
      "INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active) VALUES (?, ?, ?, 'Branch Staff', ?, ?, 1)",
      [bizId, inactiveBranchId, cashierRole.id, branchStaffEmail, passwordHash]
    );
    activeStaffId = bStaffRes.insertId;

    // --- TEST 1: Inactive staff login -> Contact Company Admin ---
    const staffRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: staffEmail, password })
    });
    assert.equal(staffRes.status, 403);
    const staffData = await staffRes.json();
    assert.match(staffData.message, /deactivated by your Company Admin/i);
    assert.match(staffData.message, /contact your Company Administrator/i);

    // --- TEST 2: Inactive Company Admin login -> Contact SaaS Admin ---
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: bizAdminEmail, password })
    });
    assert.equal(adminRes.status, 403);
    const adminData = await adminRes.json();
    assert.match(adminData.message, /deactivated by the SaaS Admin/i);
    assert.match(adminData.message, /contact SaaS Admin/i);

    // --- TEST 3: Active user under inactive branch -> Contact Company Admin ---
    const bRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: branchStaffEmail, password })
    });
    assert.equal(bRes.status, 403);
    const bData = await bRes.json();
    assert.match(bData.message, /assigned branch .* deactivated by your Company Admin/i);
    assert.match(bData.message, /contact your Company Administrator/i);

    // --- TEST 4: Deactivate company -> Contact SaaS Admin ---
    await query("UPDATE businesses SET is_active = 0 WHERE id = ?", [bizId]);
    await query("UPDATE branches SET is_active = 1 WHERE id = ?", [inactiveBranchId]);

    const compRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: branchStaffEmail, password })
    });
    assert.equal(compRes.status, 403);
    const compData = await compRes.json();
    assert.match(compData.message, /company account .* deactivated by the SaaS Admin/i);
    assert.match(compData.message, /contact SaaS Admin/i);

  } finally {
    // Cleanup
    if (inactiveStaffId) await query("DELETE FROM users WHERE id = ?", [inactiveStaffId]);
    if (inactiveBizAdminId) await query("DELETE FROM users WHERE id = ?", [inactiveBizAdminId]);
    if (activeStaffId) await query("DELETE FROM users WHERE id = ?", [activeStaffId]);
    if (activeBranchId) await query("DELETE FROM branches WHERE id = ?", [activeBranchId]);
    if (inactiveBranchId) await query("DELETE FROM branches WHERE id = ?", [inactiveBranchId]);
    if (bizId) await query("DELETE FROM businesses WHERE id = ?", [bizId]);
  }
});
