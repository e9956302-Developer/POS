import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { pool, query } from "../src/db/pool.js";

let server;
let baseUrl;
let topAdminToken;
let topAdminUser;
let companyAdminToken;
let companyAdminUser;
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

  // Get top admin user
  const [topAdmin] = await query("SELECT u.* FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'top_admin' LIMIT 1");
  topAdminUser = topAdmin;
  topAdminToken = jwt.sign({ userId: topAdmin.id }, env.jwtSecret, { expiresIn: "1h" });

  // Create a separate test business and company admin to test authorization
  const ts = Date.now().toString().slice(-6);
  const [role] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");

  const bizRes = await query("INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)", [
    `Tenant Test Biz ${ts}`,
    `TTB_${ts}`
  ]);
  testBusinessId = bizRes.insertId;

  const brRes = await query("INSERT INTO branches (business_id, name, code) VALUES (?, 'Branch Alpha', ?)", [
    testBusinessId,
    `TBA_${ts}`
  ]);
  testBranchId = brRes.insertId;

  await query(
    "INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on) VALUES (?, ?, 1, 'active', '2026-12-31')",
    [testBusinessId, testBranchId]
  );

  const uRes = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Tenant Admin', ?, 'hash', 1)`,
    [testBusinessId, role.id, testBranchId, `tenant_admin_${ts}@test.local`]
  );
  companyAdminUser = { id: uRes.insertId, business_id: testBusinessId };
  companyAdminToken = jwt.sign({ userId: uRes.insertId }, env.jwtSecret, { expiresIn: "1h" });
});

after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((res) => server.close(res));
  }
});

test("authorization: company admin is blocked from TOP Admin endpoints", async () => {
  const res = await fetch(`${baseUrl}/api/admin/dashboard-stats`, {
    headers: { Authorization: `Bearer ${companyAdminToken}` }
  });
  assert.equal(res.status, 403, "Company admin should receive 403 Forbidden on top admin routes");
});

test("dashboard: TOP Admin can fetch platform overview stats from actual database", async () => {
  const res = await fetch(`${baseUrl}/api/admin/dashboard-stats`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(res.status, 200);
  const stats = await res.json();

  assert.ok(stats.businesses, "businesses stats object returned");
  assert.ok(stats.businesses.total >= 1, "Total businesses at least 1");
  assert.ok(stats.branches.total >= 1, "Total branches at least 1");
  assert.ok(stats.companyAdmins.total >= 1, "Total company admins at least 1");
  assert.ok(stats.subscriptions, "subscriptions stats returned");
  assert.ok(stats.payments, "payments stats returned");
  assert.ok(Array.isArray(stats.packageDistribution), "packageDistribution is array");
  assert.ok(Array.isArray(stats.recentPendingPayments), "recentPendingPayments is array");
});

test("businesses: create, paginate, edit, toggle, and view company details", async () => {
  const ts = Date.now().toString().slice(-6);
  const newBizCode = `NBIZ_${ts}`;

  // 1. Create company bundle
  const createRes = await fetch(`${baseUrl}/api/admin/businesses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: `New Company ${ts}`,
      code: newBizCode,
      email: `contact_${ts}@company.com`,
      phone: "+1234567890",
      branchName: "Headquarters",
      branchCode: `HQ_${ts}`,
      adminName: `Owner ${ts}`,
      adminEmail: `owner_${ts}@company.com`,
      adminPassword: "SecurePassword123!",
      planId: 1
    })
  });

  assert.equal(createRes.status, 201, "Company creation returns 201");
  const created = await createRes.json();
  assert.ok(created.businessId, "Business ID returned");
  assert.ok(created.branchId, "Branch ID returned");
  assert.ok(created.adminUserId, "Admin user ID returned");

  // 2. Fetch paginated list
  const listRes = await fetch(`${baseUrl}/api/admin/businesses?page=1&pageSize=10&search=${newBizCode}`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.pagination, "Pagination metadata included");
  assert.equal(listData.pagination.total, 1);
  assert.equal(listData.data[0].code, newBizCode);

  // 3. View detail
  const detailRes = await fetch(`${baseUrl}/api/admin/businesses/${created.businessId}`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.equal(detail.code, newBizCode);
  assert.equal(detail.branches.length, 1);
  assert.equal(detail.primaryAdmin.email, `owner_${ts}@company.com`);

  // 4. Edit business
  const editRes = await fetch(`${baseUrl}/api/admin/businesses/${created.businessId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: `Updated Company ${ts}`,
      phone: "+9876543210"
    })
  });
  assert.equal(editRes.status, 200);
  const updated = await editRes.json();
  assert.equal(updated.name, `Updated Company ${ts}`);
  assert.equal(updated.phone, "+9876543210");

  // 5. Toggle active
  const toggleRes = await fetch(`${baseUrl}/api/admin/businesses/${created.businessId}/toggle`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isActive: false })
  });
  assert.equal(toggleRes.status, 200);
  const toggled = await toggleRes.json();
  assert.equal(toggled.is_active, 0);
});

test("branches: create under business, edit, and filter", async () => {
  const ts = Date.now().toString().slice(-6);

  // 1. Create second branch under test business
  const createRes = await fetch(`${baseUrl}/api/admin/branches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      businessId: testBusinessId,
      name: `North Branch ${ts}`,
      code: `NBR_${ts}`,
      address: "North Plaza",
      planId: 2
    })
  });
  assert.equal(createRes.status, 201);
  const newBranch = await createRes.json();
  assert.equal(newBranch.name, `North Branch ${ts}`);
  assert.equal(newBranch.business_id, testBusinessId);

  // 2. Edit branch
  const editRes = await fetch(`${baseUrl}/api/admin/branches/${newBranch.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: `North Branch Renamed ${ts}`,
      address: "Updated Address 123"
    })
  });
  assert.equal(editRes.status, 200);
  const editedBranch = await editRes.json();
  assert.equal(editedBranch.name, `North Branch Renamed ${ts}`);

  // 3. List branches with filter
  const listRes = await fetch(`${baseUrl}/api/admin/branches?businessId=${testBusinessId}&page=1&pageSize=10`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(listRes.status, 200);
  const branchList = await listRes.json();
  assert.ok(branchList.data.length >= 2, "Test business has at least 2 branches");
});

test("packages: create, edit configurable pricing and duration, toggle, and view assigned branches", async () => {
  const ts = Date.now().toString().slice(-6);

  // 1. Create package
  const createRes = await fetch(`${baseUrl}/api/admin/subscription-plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: `Custom Semi-Annual ${ts}`,
      price: 199.99,
      billingPeriod: "custom",
      durationValue: 6,
      durationUnit: "month",
      maxBranches: 5,
      trialDays: 21,
      graceDays: 10,
      description: "6 month package"
    })
  });
  assert.equal(createRes.status, 201);
  const createdPkg = await createRes.json();
  assert.equal(createdPkg.duration_value, 6);
  assert.equal(createdPkg.duration_unit, "month");
  assert.equal(Number(createdPkg.price), 199.99);

  // 2. Edit package price without altering historical records
  const editRes = await fetch(`${baseUrl}/api/admin/subscription-plans/${createdPkg.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      price: 249.99,
      maxBranches: 8
    })
  });
  assert.equal(editRes.status, 200);
  const updatedPkg = await editRes.json();
  assert.equal(Number(updatedPkg.price), 249.99);
  assert.equal(updatedPkg.max_branches, 8);

  // 3. View assigned branches
  const assignedRes = await fetch(`${baseUrl}/api/admin/subscription-plans/${createdPkg.id}/branches`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(assignedRes.status, 200);
  const assignedBranches = await assignedRes.json();
  assert.ok(Array.isArray(assignedBranches));
});

test("payments: submit payment, reject, approve with accurate subscription extension calculation", async () => {
  const ts = Date.now().toString().slice(-6);

  // 1. Submit payment
  const submitRes = await fetch(`${baseUrl}/api/admin/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      businessId: testBusinessId,
      branchId: testBranchId,
      planId: 2,
      amount: 49.00,
      paymentMethod: "Bank Wire",
      evidenceReference: `TXN-REF-${ts}`,
      durationValue: 1,
      durationUnit: "month",
      notes: "Monthly fee"
    })
  });
  assert.equal(submitRes.status, 201);
  const payment = await submitRes.json();
  assert.equal(payment.status, "submitted");

  // 2. Reject payment test
  const rejectRes = await fetch(`${baseUrl}/api/admin/payments/${payment.id}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ reason: "Unclear deposit slip reference" })
  });
  assert.equal(rejectRes.status, 200);
  const rejected = await rejectRes.json();
  assert.equal(rejected.payment.status, "rejected");
  assert.equal(rejected.payment.rejection_reason, "Unclear deposit slip reference");

  // 3. Approve payment and extend subscription
  const approveRes = await fetch(`${baseUrl}/api/admin/payments/${payment.id}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    }
  });
  assert.equal(approveRes.status, 200);
  const approval = await approveRes.json();
  assert.equal(approval.payment.status, "verified");
  assert.ok(approval.extension.endDate, "Calculated future subscription expiry date");

  // 4. Prevent duplicate approval
  const dupRes = await fetch(`${baseUrl}/api/admin/payments/${payment.id}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    }
  });
  assert.equal(dupRes.status, 400, "Duplicate approval is blocked with 400 error");

  // 5. Edit payment details (amount, reference, notes)
  const editPaymentRes = await fetch(`${baseUrl}/api/admin/payments/${payment.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: 99.50,
      paymentMethod: "EasyPaisa / JazzCash",
      evidenceReference: `TXN-EDITED-${ts}`,
      notes: "Corrected teller slip notes"
    })
  });
  assert.equal(editPaymentRes.status, 200);
  const editData = await editPaymentRes.json();
  assert.equal(Number(editData.payment.amount), 99.50);
  assert.equal(editData.payment.evidence_reference, `TXN-EDITED-${ts}`);
  assert.equal(editData.payment.payment_method, "EasyPaisa / JazzCash");

  // 6. Delete payment
  const deletePaymentRes = await fetch(`${baseUrl}/api/admin/payments/${payment.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(deletePaymentRes.status, 200);
  const deleteData = await deletePaymentRes.json();
  assert.match(deleteData.message, /deleted/i);

  // 7. Confirm payment no longer exists
  const checkRes = await fetch(`${baseUrl}/api/admin/payments/${payment.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(checkRes.status, 404);
});

test("company admins: enforce 1 primary active admin, edit, and safe delete check", async () => {
  const ts = Date.now().toString().slice(-6);

  // 1. Attempt creating another active admin without forceReplace
  const dupAdminRes = await fetch(`${baseUrl}/api/admin/company-admins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      businessId: testBusinessId,
      fullName: "Second Admin",
      email: `second_admin_${ts}@test.local`,
      password: "pass123Password!",
      forceReplace: false
    })
  });
  assert.equal(dupAdminRes.status, 409, "Enforces 1 active primary admin per company");

  // 2. Replace admin with forceReplace = true
  const replaceAdminRes = await fetch(`${baseUrl}/api/admin/company-admins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      businessId: testBusinessId,
      fullName: "Replacement Admin",
      email: `replacement_admin_${ts}@test.local`,
      password: "pass123Password!",
      forceReplace: true
    })
  });
  assert.equal(replaceAdminRes.status, 201);
  const newAdmin = await replaceAdminRes.json();
  assert.equal(newAdmin.is_active, 1);

  // 3. Verify previous admin is now deactivated
  const [prevAdmin] = await query("SELECT is_active FROM users WHERE id = ?", [companyAdminUser.id]);
  assert.equal(prevAdmin.is_active, 0, "Previous admin was safely deactivated");

  // 4. Safe deletion check: User with no business records can be deleted
  const deleteRes = await fetch(`${baseUrl}/api/admin/company-admins/${newAdmin.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(deleteRes.status, 200);
  const deleteResult = await deleteRes.json();
  assert.equal(deleteResult.action, "deleted");
});

test("auto code generation: company code derived from name and branch code derived from company code", async () => {
  const ts = Date.now().toString().slice(-4);
  const companyName = `Al Madina Mobile Zone ${ts}`;

  // 1. Create company without explicit code
  const createRes = await fetch(`${baseUrl}/api/admin/businesses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: companyName,
      email: `auto_${ts}@madina.com`
    })
  });
  assert.equal(createRes.status, 201);
  const createdBiz = await createRes.json();
  const bizId = createdBiz.id || createdBiz.businessId;

  const [bizRow] = await query("SELECT * FROM businesses WHERE id = ?", [bizId]);
  assert.ok(bizRow.code, "Company code was auto-generated");
  assert.ok(bizRow.code.startsWith("AMMZ"), `Company code should be derived from initials (AMMZ...), got '${bizRow.code}'`);

  // 2. Create first branch without explicit code
  const br1Res = await fetch(`${baseUrl}/api/admin/branches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      businessId: bizId,
      name: "Main Branch"
    })
  });
  assert.equal(br1Res.status, 201);
  const br1 = await br1Res.json();
  assert.equal(br1.code, `${bizRow.code}-01`, "First branch code auto-derived as ${compCode}-01");

  // 3. Create second branch without explicit code
  const br2Res = await fetch(`${baseUrl}/api/admin/branches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${topAdminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      businessId: bizId,
      name: "Saddar Branch"
    })
  });
  assert.equal(br2Res.status, 201);
  const br2 = await br2Res.json();
  assert.equal(br2.code, `${bizRow.code}-02`, "Second branch code auto-derived as ${compCode}-02");
});

test("deleted transactions: TOP Admin can view voided transactions and restore them", async () => {
  // 1. Create a deleted expense directly for testing
  const insExp = await query(
    `INSERT INTO expenses (branch_id, category, title, expense_date, amount, is_deleted, deleted_at, deleted_by, deletion_reason, created_by)
     VALUES (?, 'misc', 'Temporary Test Expense', CURDATE(), 1500, 1, NOW(), ?, 'Entered in error for testing', ?)`,
    [testBranchId, topAdminUser.id, topAdminUser.id]
  );
  const expId = insExp.insertId;

  // 2. TOP Admin views deleted transactions
  const listRes = await fetch(`${baseUrl}/api/admin/deleted-transactions?type=expense`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.stats.totalDeleted >= 1, "Stats show deleted transaction count");
  const found = listData.transactions.find((t) => Number(t.id) === Number(expId));
  assert.ok(found, "Found deleted expense in TOP Admin deleted-transactions list");
  assert.equal(found.deletion_reason, "Entered in error for testing");

  // 3. TOP Admin inspects the deleted transaction
  const inspectRes = await fetch(`${baseUrl}/api/admin/deleted-transactions/expense/${expId}`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(inspectRes.status, 200);
  const inspectData = await inspectRes.json();
  assert.equal(inspectData.transactionType, "expense");
  assert.equal(Number(inspectData.amount), 1500);

  // 4. TOP Admin restores the transaction
  const restoreRes = await fetch(`${baseUrl}/api/admin/deleted-transactions/expense/${expId}/restore`, {
    method: "POST",
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(restoreRes.status, 200);
  const restoreData = await restoreRes.json();
  assert.equal(restoreData.type, "expense");

  // 5. Verify expense is restored back to active in database
  const [restoredExp] = await query("SELECT is_deleted, deleted_at, deleted_by FROM expenses WHERE id = ?", [expId]);
  assert.equal(restoredExp.is_deleted, 0, "Expense is_deleted flag is now 0");
  assert.equal(restoredExp.deleted_at, null, "Expense deleted_at is cleared");
});

test("auth: user can update their full name and profile details", async () => {
  const meBefore = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  const meBeforeData = await meBefore.json();
  const originalName = meBeforeData.user.full_name;

  const updateRes = await fetch(`${baseUrl}/api/auth/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${topAdminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: "Test Temp Admin Name" })
  });
  assert.equal(updateRes.status, 200);
  const updateData = await updateRes.json();
  assert.equal(updateData.user.fullName, "Test Temp Admin Name");

  // Verify /auth/me returns updated name
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  const meData = await meRes.json();
  assert.equal(meData.user.full_name, "Test Temp Admin Name");

  // Restore original name
  await fetch(`${baseUrl}/api/auth/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${topAdminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: originalName })
  });
});

test("auth: changing email once user account exists is strictly disallowed", async () => {
  const tryChangeRes = await fetch(`${baseUrl}/api/auth/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${topAdminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "newemail_attempt@forbidden.com" })
  });
  assert.equal(tryChangeRes.status, 400);
  const data = await tryChangeRes.json();
  assert.ok(data.message.includes("cannot be changed"), "Error mentions email cannot be changed");
});

test("validation: invalid email format is rejected", async () => {
  const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid-not-an-email", password: "Password123" })
  });
  assert.equal(badLoginRes.status, 400);

  const badUserRes = await fetch(`${baseUrl}/api/admin/company-admins`, {
    method: "POST",
    headers: { Authorization: `Bearer ${topAdminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      businessId: 1,
      fullName: "Invalid Email Admin",
      email: "bad@@email..com",
      password: "Password123"
    })
  });
  assert.equal(badUserRes.status, 400);
});

test("saas-admins: full CRUD, safety restrictions, toggle, and deletion protection", async () => {
  const uniqueEmail = `test_saas_adm_${Date.now()}@platform.local`;

  // 1. GET /api/admin/saas-admins - list admins
  const listRes = await fetch(`${baseUrl}/api/admin/saas-admins`, {
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 1);

  // 2. POST /api/admin/saas-admins - create new SaaS admin
  const createRes = await fetch(`${baseUrl}/api/admin/saas-admins`, {
    method: "POST",
    headers: { Authorization: `Bearer ${topAdminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Automated SaaS Admin",
      email: uniqueEmail,
      password: "TestMasterPassword123!"
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.ok(created.id);
  assert.equal(created.email, uniqueEmail);

  // 3. PUT /api/admin/saas-admins/:id - update name
  const updateRes = await fetch(`${baseUrl}/api/admin/saas-admins/${created.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${topAdminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Updated Automated SaaS Admin"
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.data.full_name, "Updated Automated SaaS Admin");

  // 4. POST /api/admin/saas-admins/:id/toggle - toggle inactive
  const toggleOffRes = await fetch(`${baseUrl}/api/admin/saas-admins/${created.id}/toggle`, {
    method: "POST",
    headers: { Authorization: `Bearer ${topAdminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ isActive: false })
  });
  assert.equal(toggleOffRes.status, 200);

  // 5. DELETE /api/admin/saas-admins/:id - delete created admin
  const deleteRes = await fetch(`${baseUrl}/api/admin/saas-admins/${created.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(deleteRes.status, 200);
  const deletedData = await deleteRes.json();
  assert.ok(deletedData.success);

  // 6. Safety check: Cannot delete self
  const deleteSelfRes = await fetch(`${baseUrl}/api/admin/saas-admins/${topAdminUser.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${topAdminToken}` }
  });
  assert.equal(deleteSelfRes.status, 400);
  const selfError = await deleteSelfRes.json();
  assert.match(selfError.message, /cannot delete your own account/i);
});



