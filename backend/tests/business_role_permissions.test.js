import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { pool, query } from "../src/db/pool.js";

let server;
let baseUrl;
let businessId;
let branchId;
let planId;
let adminToken;
let adminUserId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const ts = Date.now().toString().slice(-6);

  // Create a custom package with limited pages to test strict SaaS restriction cross-verification
  // Note: Only dashboard, sales, inventory, and invoices are granted to this business by SaaS Admin
  const pkgResult = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1000, 1000, 'monthly', 1, 'month', 10, 14, 7, 1, ?)`,
    [
      `Restricted Package ${ts}`,
      JSON.stringify(["dashboard", "sales", "inventory", "invoices"])
    ]
  );
  planId = pkgResult.insertId;

  // Create business
  const biz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Role Biz ${ts}`, `RLB_${ts}`]
  );
  businessId = biz.insertId;

  // Create branch
  const br = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Role Branch', ?)",
    [businessId, `RLBR_${ts}`]
  );
  branchId = br.insertId;

  // Assign subscription with the restricted package
  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on)
     VALUES (?, ?, ?, 'active', '2099-12-31')`,
    [businessId, branchId, planId]
  );

  const [role] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");
  const passwordHash = await bcrypt.hash("adminPass123", 10);

  const userResult = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Business Super Admin', ?, ?, 1)`,
    [businessId, role.id, branchId, `biz_super_admin_${ts}@test.local`, passwordHash]
  );
  adminUserId = userResult.insertId;
  adminToken = jwt.sign({ userId: adminUserId }, env.jwtSecret, { expiresIn: "1h" });
});

after(async () => {
  try {
    if (businessId) {
      await query("DELETE FROM user_permissions WHERE user_id IN (SELECT id FROM users WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM business_role_permissions WHERE business_id = ?", [businessId]);
      await query("DELETE FROM payments WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM sale_order_items WHERE sale_order_id IN (SELECT id FROM sale_orders WHERE branch_id = ?)", [branchId]);
      await query("DELETE FROM sale_orders WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE branch_id = ?)", [branchId]);
      await query("DELETE FROM purchase_orders WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM mobile_units WHERE business_id = ?", [businessId]);
      await query("DELETE FROM mobile_models WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branch_subscriptions WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM users WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branches WHERE id = ?", [branchId]);
      await query("DELETE FROM businesses WHERE id = ?", [businessId]);
    }
    if (planId) {
      await query("DELETE FROM subscription_plans WHERE id = ?", [planId]);
    }
  } catch (err) {
    console.error("Cleanup error in business_role_permissions.test.js:", err);
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((res) => server.close(res));
    }
  }
});

test("Super Admin is restricted from directly performing sales and purchases", async () => {
  // Attempt to create a sale as business_super_admin
  const saleRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      quickCustomer: { name: "Direct Sale Customer" },
      saleDate: "2026-10-14",
      paymentMethod: "cash",
      paidAmount: 500,
      taxAmount: 0,
      items: []
    })
  });
  // Should receive 403 Forbidden
  assert.equal(saleRes.status, 403);
  const saleData = await saleRes.json();
  assert.match(saleData.message, /Super Admin cannot directly perform/i);

  // Attempt to create a purchase as business_super_admin
  const purRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      vendorName: "Direct Supplier",
      purchaseDate: "2026-10-14",
      paymentMethod: "cash",
      paidAmount: 500,
      taxAmount: 0,
      items: []
    })
  });
  // Should receive 403 Forbidden
  assert.equal(purRes.status, 403);
});

test("Business Admin role permissions: query returns templates and package-allowed modules", async () => {
  const res = await fetch(`${baseUrl}/api/admin/business-role-permissions`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.roles);
  assert.ok(Array.isArray(data.roles.manager));
  assert.ok(Array.isArray(data.roles.cashier));
  assert.ok(Array.isArray(data.allowedPages));
  // Cross verification: allowedPages should be only what SaaS top admin allowed in the package
  assert.ok(data.allowedPages.includes("sales"));
  assert.ok(data.allowedPages.includes("inventory"));
  // "purchases" and "expenses" should NOT be in allowedPages
  assert.equal(data.allowedPages.includes("purchases"), false);
  assert.equal(data.allowedPages.includes("expenses"), false);
});

test("Business Admin cannot grant rights to pages outside SaaS subscription package", async () => {
  // Business Admin attempts to give manager access to 'purchases' (which is NOT in the package)
  const res = await fetch(`${baseUrl}/api/admin/business-role-permissions/manager`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      permissions: [
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sales", actionKey: "create", isAllowed: 1 },
        { pageKey: "purchases", actionKey: "view", isAllowed: 1 }, // unauthorized page!
        { pageKey: "purchases", actionKey: "create", isAllowed: 1 }
      ]
    })
  });

  // Strict cross-verification should reject this with 400
  assert.equal(res.status, 400);
  const err = await res.json();
  assert.match(err.message, /purchases/);
  assert.match(err.message, /not included in your company's subscription package/i);
});

test("Business Admin sets business role rights, creates manager user, and manager logs in with operational rights", async () => {
  const ts = Date.now().toString().slice(-5);

  // 1. Business Admin configures business-specific role template for 'manager'
  // (only within allowed package pages: dashboard, sales, inventory, invoices)
  const putRes = await fetch(`${baseUrl}/api/admin/business-role-permissions/manager`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      permissions: [
        { pageKey: "dashboard", actionKey: "view", isAllowed: 1 },
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sales", actionKey: "create", isAllowed: 1 },
        { pageKey: "inventory", actionKey: "view", isAllowed: 1 },
        { pageKey: "inventory", actionKey: "create", isAllowed: 1 },
        { pageKey: "invoices", actionKey: "view", isAllowed: 1 }
      ]
    })
  });
  assert.equal(putRes.status, 200);

  // 2. Business Admin creates a new user with role 'manager'
  const managerEmail = `branch_mgr_${ts}@test.local`;
  const createMgrRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fullName: "Branch Manager Alpha",
      email: managerEmail,
      password: "MgrPassword123!",
      roleName: "manager",
      branchId
    })
  });
  assert.equal(createMgrRes.status, 201);
  const newUserData = await createMgrRes.json();
  assert.ok(newUserData.id);

  // 3. Verify user_permissions were automatically seeded from business role template
  const dbUserPerms = await query(
    "SELECT page_key, action_key, is_allowed FROM user_permissions WHERE user_id = ?",
    [newUserData.id]
  );
  assert.ok(dbUserPerms.length >= 6);
  const salesCreatePerm = dbUserPerms.find(p => p.page_key === "sales" && p.action_key === "create");
  assert.ok(salesCreatePerm);
  assert.equal(salesCreatePerm.is_allowed, 1);

  // 4. Manager logs in
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: managerEmail,
      password: "MgrPassword123!"
    })
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.ok(loginData.token);
  assert.equal(loginData.user.roleName, "manager");
  // Login response user object must include permissions
  assert.ok(Array.isArray(loginData.user.permissions));
  assert.ok(loginData.user.permissions.length > 0);

  const managerToken = loginData.token;

  // 5. Manager CAN perform operational actions (e.g. create sale), unlike Super Admin
  const mgrSaleRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      branchId,
      quickCustomer: { name: "Manager Quick Customer" },
      saleDate: "2026-10-14",
      paymentMethod: "cash",
      paidAmount: 0,
      taxAmount: 0,
      items: []
    })
  });
  // Since items are empty it may fail on validation (e.g., 400), but NOT 403 Forbidden!
  assert.notEqual(mgrSaleRes.status, 403);
});

test("Company admin updating branch manager role immediately restricts existing managers on backend endpoints", async () => {
  const ts = Date.now().toString().slice(-5);
  const managerEmail = `live_mgr_${ts}@test.local`;

  // 1. Create a branch manager
  const createMgrRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fullName: "Live Test Manager",
      email: managerEmail,
      password: "LivePassword123!",
      roleName: "manager",
      branchId
    })
  });
  assert.equal(createMgrRes.status, 201);

  // 2. Login as manager
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: managerEmail, password: "LivePassword123!" })
  });
  assert.equal(loginRes.status, 200);
  const { token: managerToken } = await loginRes.json();

  // 3. Manager can initially create sales (allowed by default manager template)
  const preCheck = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({ branchId, quickCustomer: { name: "Pre Check" }, items: [] })
  });
  assert.notEqual(preCheck.status, 403);

  // 4. Company Admin REVOKES 'sales:create' from the manager role
  const revokeRes = await fetch(`${baseUrl}/api/admin/business-role-permissions/manager`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      permissions: [
        { pageKey: "dashboard", actionKey: "view", isAllowed: 1 },
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sales", actionKey: "create", isAllowed: 0 }, // REVOKED!
        { pageKey: "inventory", actionKey: "view", isAllowed: 1 },
        { pageKey: "inventory", actionKey: "create", isAllowed: 1 },
        { pageKey: "invoices", actionKey: "view", isAllowed: 1 }
      ]
    })
  });
  assert.equal(revokeRes.status, 200);

  // 5. Existing Manager IMMEDIATELY gets 403 Forbidden when trying to create a sale
  const postRevokeRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({ branchId, quickCustomer: { name: "Post Revoke" }, items: [] })
  });
  assert.equal(postRevokeRes.status, 403);
  const postRevokeBody = await postRevokeRes.json();
  assert.match(postRevokeBody.message, /permission|forbidden|access/i);

  // 6. Company Admin RESTORES 'sales:create' for manager
  const restoreRes = await fetch(`${baseUrl}/api/admin/business-role-permissions/manager`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      permissions: [
        { pageKey: "dashboard", actionKey: "view", isAllowed: 1 },
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sales", actionKey: "create", isAllowed: 1 }, // RESTORED!
        { pageKey: "inventory", actionKey: "view", isAllowed: 1 },
        { pageKey: "inventory", actionKey: "create", isAllowed: 1 },
        { pageKey: "invoices", actionKey: "view", isAllowed: 1 }
      ]
    })
  });
  assert.equal(restoreRes.status, 200);

  // 7. Manager can create sales again!
  const postRestoreRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({ branchId, quickCustomer: { name: "Post Restore" }, items: [] })
  });
  assert.notEqual(postRestoreRes.status, 403);
});

test("Cashier is denied edit/delete operations on products and sub-resources unless granted", async () => {
  const ts = Date.now().toString().slice(-5);
  const cashierEmail = `cashier_${ts}@test.local`;

  // 1. Create a cashier user
  const createRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fullName: "Test Cashier",
      email: cashierEmail,
      password: "CashierPass123!",
      roleName: "cashier",
      branchId
    })
  });
  assert.equal(createRes.status, 201);

  // 2. Login as cashier
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cashierEmail, password: "CashierPass123!" })
  });
  assert.equal(loginRes.status, 200);
  const { token: cashierToken } = await loginRes.json();

  // 3. Cashier attempts to update a category (sub-entity of inventory) -> 403 Forbidden
  const editCatRes = await fetch(`${baseUrl}/api/products/categories/9999`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cashierToken}`
    },
    body: JSON.stringify({ name: "Unauthorized Rename" })
  });
  assert.equal(editCatRes.status, 403);

  // 4. Cashier attempts to adjust product stock -> 403 Forbidden
  const adjustRes = await fetch(`${baseUrl}/api/products/stocks/adjust`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cashierToken}`
    },
    body: JSON.stringify({ branchId, productId: 1, adjustmentType: "in", quantity: 5 })
  });
  assert.equal(adjustRes.status, 403);
});

