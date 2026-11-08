import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { query } from "../src/db/pool.js";
import { dateValue } from "../src/middleware/auth.js";

let server;
let baseUrl;
let businessId;
let branchAId; // Expired Branch
let branchBId; // Active Branch
let branchCId; // No Subscription Branch
let planId;
let adminToken;
let adminUserId;
let branchAManagerId;
let branchAManagerToken;
let branchACashierId;
let branchACashierToken;
let branchBManagerId;
let branchBManagerToken;
let branchCManagerId;
let branchCManagerToken;
let partyAId;
let partyBId;
let productIdA;
let productIdB;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const ts = Date.now().toString().slice(-6);

  // 1. Create a Standard Subscription Plan
  const planRes = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1500, 1500, 'monthly', 1, 'month', 10, 14, 7, 1, ?)`,
    [
      `Expiry Test Plan ${ts}`,
      JSON.stringify(["dashboard", "sales", "purchases", "inventory", "invoices", "parties", "cash_register", "reports"])
    ]
  );
  planId = planRes.insertId;

  // 2. Create Test Business
  const bizRes = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Expiry Co ${ts}`, `EXP_${ts}`]
  );
  businessId = bizRes.insertId;

  // 3. Create Branches
  // Branch A: Expired
  const brARes = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Branch Alpha Expired', ?)",
    [businessId, `BR_EXP_${ts}`]
  );
  branchAId = brARes.insertId;

  // Branch B: Active
  const brBRes = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Branch Beta Active', ?)",
    [businessId, `BR_ACT_${ts}`]
  );
  branchBId = brBRes.insertId;

  // Branch C: No Subscription
  const brCRes = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Branch Gamma NoSub', ?)",
    [businessId, `BR_NOS_${ts}`]
  );
  branchCId = brCRes.insertId;

  // 4. Subscriptions:
  // Branch A: EXPIRED (current_period_ends_on = '2026-10-20', status = 'expired')
  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, subscription_starts_on, current_period_ends_on)
     VALUES (?, ?, ?, 'expired', '2026-09-20', '2026-10-20')`,
    [businessId, branchAId, planId]
  );

  // Branch B: ACTIVE (current_period_ends_on = '2099-12-31', status = 'active')
  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, subscription_starts_on, current_period_ends_on)
     VALUES (?, ?, ?, 'active', '2026-10-01', '2099-12-31')`,
    [businessId, branchBId, planId]
  );

  // Branch C: No record in branch_subscriptions at all!

  // 5. Roles & Users
  const [adminRole] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");
  const [managerRole] = await query("SELECT id FROM roles WHERE name = 'manager' LIMIT 1");
  const [cashierRole] = await query("SELECT id FROM roles WHERE name = 'cashier' LIMIT 1");
  const passwordHash = await bcrypt.hash("testPass123", 10);

  // Company Admin
  const adminRes = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, NULL, 'Company Admin', ?, ?, 1)`,
    [businessId, adminRole.id, `admin_${ts}@test.local`, passwordHash]
  );
  adminUserId = adminRes.insertId;
  adminToken = jwt.sign({ userId: adminUserId }, env.jwtSecret, { expiresIn: "2h" });

  // Branch A Manager
  const bAMgrRes = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Branch A Manager', ?, ?, 1)`,
    [businessId, managerRole.id, branchAId, `mgr_a_${ts}@test.local`, passwordHash]
  );
  branchAManagerId = bAMgrRes.insertId;
  branchAManagerToken = jwt.sign({ userId: branchAManagerId }, env.jwtSecret, { expiresIn: "2h" });

  // Branch A Cashier
  const bACshRes = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Branch A Cashier', ?, ?, 1)`,
    [businessId, cashierRole.id, branchAId, `csh_a_${ts}@test.local`, passwordHash]
  );
  branchACashierId = bACshRes.insertId;
  branchACashierToken = jwt.sign({ userId: branchACashierId }, env.jwtSecret, { expiresIn: "2h" });

  // Branch B Manager
  const bBMgrRes = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Branch B Manager', ?, ?, 1)`,
    [businessId, managerRole.id, branchBId, `mgr_b_${ts}@test.local`, passwordHash]
  );
  branchBManagerId = bBMgrRes.insertId;
  branchBManagerToken = jwt.sign({ userId: branchBManagerId }, env.jwtSecret, { expiresIn: "2h" });

  // Branch C Manager
  const bCMgrRes = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Branch C Manager', ?, ?, 1)`,
    [businessId, managerRole.id, branchCId, `mgr_c_${ts}@test.local`, passwordHash]
  );
  branchCManagerId = bCMgrRes.insertId;
  branchCManagerToken = jwt.sign({ userId: branchCManagerId }, env.jwtSecret, { expiresIn: "2h" });

  // Customer Parties
  const partyARes = await query(
    "INSERT INTO parties (business_id, branch_id, party_type, name) VALUES (?, ?, 'customer', 'Customer Alpha')",
    [businessId, branchAId]
  );
  partyAId = partyARes.insertId;

  const partyBRes = await query(
    "INSERT INTO parties (business_id, branch_id, party_type, name) VALUES (?, ?, 'customer', 'Customer Beta')",
    [businessId, branchBId]
  );
  partyBId = partyBRes.insertId;

  // Products
  const prodARes = await query(
    "INSERT INTO products (business_id, branch_id, name, item_type, sale_price) VALUES (?, ?, 'USB Cable', 'service', 500)",
    [businessId, branchAId]
  );
  productIdA = prodARes.insertId;

  const prodBRes = await query(
    "INSERT INTO products (business_id, branch_id, name, item_type, sale_price) VALUES (?, ?, 'AirPods Case', 'service', 1200)",
    [businessId, branchBId]
  );
  productIdB = prodBRes.insertId;
});

after(async () => {
  try {
    if (businessId) {
      await query("DELETE FROM cash_register_sessions WHERE branch_id IN (?, ?, ?)", [branchAId, branchBId, branchCId]);
      await query("DELETE FROM payments WHERE branch_id IN (?, ?, ?)", [branchAId, branchBId, branchCId]);
      await query("DELETE FROM sale_order_items WHERE sale_order_id IN (SELECT id FROM sale_orders WHERE branch_id IN (?, ?, ?))", [branchAId, branchBId, branchCId]);
      await query("DELETE FROM sale_orders WHERE branch_id IN (?, ?, ?)", [branchAId, branchBId, branchCId]);
      await query("DELETE FROM products WHERE business_id = ?", [businessId]);
      await query("DELETE FROM parties WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branch_subscriptions WHERE business_id = ?", [businessId]);
      await query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM users WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branches WHERE business_id = ?", [businessId]);
      await query("DELETE FROM businesses WHERE id = ?", [businessId]);
    }
    if (planId) {
      await query("DELETE FROM subscription_plans WHERE id = ?", [planId]);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
});

test("Expired branch: Manager login succeeds but returns expired subscriptionPlan status", async () => {
  const [manager] = await query("SELECT email FROM users WHERE id = ?", [branchAManagerId]);
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: manager.email,
      password: "testPass123"
    })
  });

  const data = await res.json();
  if (res.status !== 200) {
    console.error("LOGIN FAILED:", res.status, data);
  }
  assert.equal(res.status, 200, "Manager login must stay allowed to see the blocking notice");
  assert.ok(data.token);
  assert.equal(data.user.branchId, branchAId);
  assert.ok(data.user.subscriptionPlan, "Subscription plan details must be attached");
  assert.equal(data.user.subscriptionPlan.status, "expired");
  assert.equal(data.user.subscriptionPlan.isExpired, true);
  assert.equal(data.user.subscriptionPlan.expiredOn, "2026-10-20");
});

test("Expired branch: Cashier login succeeds but returns expired subscriptionPlan status", async () => {
  const [cashier] = await query("SELECT email FROM users WHERE id = ?", [branchACashierId]);
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: cashier.email,
      password: "testPass123"
    })
  });

  assert.equal(res.status, 200, "Cashier login must stay allowed to see the blocking notice");
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.user.subscriptionPlan.status, "expired");
  assert.equal(data.user.subscriptionPlan.isExpired, true);
});

test("Expired branch: Direct API call from Manager to create a sale is BLOCKED with 403 SUBSCRIPTION_EXPIRED", async () => {
  const res = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${branchAManagerToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      customerId: partyAId,
      saleDate: "2026-10-21",
      paymentMethod: "cash",
      paidAmount: 500,
      items: [
        {
          productId: productIdA,
          itemType: "accessory",
          productName: "USB Cable",
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500
        }
      ]
    })
  });

  assert.equal(res.status, 403, "Direct sale creation must return HTTP 403");
  const data = await res.json();
  assert.equal(data.code, "SUBSCRIPTION_EXPIRED", "Error code must be SUBSCRIPTION_EXPIRED");
  assert.ok(data.branch, "Error must identify the branch");
  assert.equal(data.branch.id, branchAId);
  assert.equal(data.branch.name, "Branch Alpha Expired");
  assert.equal(data.expiredOn, "2026-10-20");
  assert.match(data.message, /This branch's subscription expired on 2026-10-20/i);
});

test("Expired branch: Direct API call from Cashier to create a sale is BLOCKED with 403 SUBSCRIPTION_EXPIRED", async () => {
  const res = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${branchACashierToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      customerId: partyAId,
      saleDate: "2026-10-21",
      paymentMethod: "cash",
      paidAmount: 200,
      items: [
        {
          productId: productIdA,
          itemType: "accessory",
          productName: "Charger",
          quantity: 1,
          unitPrice: 200,
          totalPrice: 200
        }
      ]
    })
  });

  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.code, "SUBSCRIPTION_EXPIRED");
  assert.equal(data.branch.id, branchAId);
  assert.equal(data.expiredOn, "2026-10-20");
});

test("Expired branch: Direct READ operations (sales history, inventory, reports) are strictly BLOCKED with 403 SUBSCRIPTION_EXPIRED", async () => {
  // 1. Reading sales
  const salesRes = await fetch(`${baseUrl}/api/sales`, {
    headers: { Authorization: `Bearer ${branchAManagerToken}` }
  });
  assert.equal(salesRes.status, 403);
  const salesData = await salesRes.json();
  assert.equal(salesData.code, "SUBSCRIPTION_EXPIRED");

  // 2. Reading inventory
  const invRes = await fetch(`${baseUrl}/api/inventory/units`, {
    headers: { Authorization: `Bearer ${branchAManagerToken}` }
  });
  assert.equal(invRes.status, 403);
  const invData = await invRes.json();
  assert.equal(invData.code, "SUBSCRIPTION_EXPIRED");

  // 3. Reading dashboard
  const dashRes = await fetch(`${baseUrl}/api/dashboard/summary`, {
    headers: { Authorization: `Bearer ${branchAManagerToken}` }
  });
  assert.equal(dashRes.status, 403);
  const dashData = await dashRes.json();
  assert.equal(dashData.code, "SUBSCRIPTION_EXPIRED");
});

test("Company Admin can view dashboard stats on company dashboard even when a branch is expired", async () => {
  // 1. Company Admin views company-wide dashboard (All branches) -> 200 OK
  const allDashRes = await fetch(`${baseUrl}/api/dashboard/summary`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(allDashRes.status, 200, "Company Admin must be able to view overall company dashboard");
  const allDashData = await allDashRes.json();
  assert.ok(allDashData.sales, "Dashboard stats returned");

  // 2. Company Admin views specific expired branch dashboard stats -> 200 OK
  const expiredBranchDashRes = await fetch(`${baseUrl}/api/dashboard/summary?branchId=${branchAId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(expiredBranchDashRes.status, 200, "Company Admin must be able to view expired branch stats on company dashboard");
  const expiredBranchDashData = await expiredBranchDashRes.json();
  assert.ok(expiredBranchDashData.sales, "Expired branch stats returned to Company Admin");

  // 3. Operational write in expired branch by Company Admin is still blocked with 403 SUBSCRIPTION_EXPIRED
  const adminSaleRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      customerId: partyAId,
      saleDate: "2026-10-21",
      paymentMethod: "cash",
      paidAmount: 500,
      items: [
        {
          productId: productIdA,
          itemType: "service",
          productName: "USB Cable",
          quantity: 1,
          unitPrice: 500,
          totalPrice: 500
        }
      ]
    })
  });
  assert.equal(adminSaleRes.status, 403, "Company Admin operational write in expired branch must remain blocked");
  const adminSaleData = await adminSaleRes.json();
  assert.equal(adminSaleData.code, "SUBSCRIPTION_EXPIRED");
});

test("Same company's other branch (Active) works normally throughout", async () => {
  // 1. Manager of Branch B logs in
  const [managerB] = await query("SELECT email FROM users WHERE id = ?", [branchBManagerId]);
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: managerB.email,
      password: "testPass123"
    })
  });

  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.user.subscriptionPlan.status, "active");
  assert.equal(loginData.user.subscriptionPlan.isExpired, false);

  // 2. Direct API call to create a sale in Branch B succeeds (HTTP 201)
  const saleRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${branchBManagerToken}`
    },
    body: JSON.stringify({
      branchId: branchBId,
      customerId: partyBId,
      saleDate: "2026-10-21",
      paymentMethod: "cash",
      paidAmount: 1200,
      items: [
        {
          productId: productIdB,
          itemType: "accessory",
          productName: "AirPods Case",
          quantity: 1,
          unitPrice: 1200,
          totalPrice: 1200
        }
      ]
    })
  });

  assert.equal(saleRes.status, 201, "Active branch sale creation must succeed");
  const saleData = await saleRes.json();
  assert.ok(saleData.id);
  assert.equal(saleData.branch_id, branchBId);

  // 3. Direct READ of sales succeeds (HTTP 200)
  const getSalesRes = await fetch(`${baseUrl}/api/sales`, {
    headers: { Authorization: `Bearer ${branchBManagerToken}` }
  });
  assert.equal(getSalesRes.status, 200);
  const list = await getSalesRes.json();
  assert.ok(Array.isArray(list));
  assert.equal(list.length, 1);
  assert.equal(list[0].id, saleData.id);
});

test("Company Admin renews the expired branch -> Manager can immediately log in and sell", async () => {
  // 1. Company Admin assigns active package extending the subscription to future
  const assignRes = await fetch(`${baseUrl}/api/admin/branch-subscriptions/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      planId: planId,
      startDate: new Date().toISOString().slice(0, 10),
      isBackdated: true
    })
  });

  assert.equal(assignRes.status, 200, "Company Admin subscription renewal must succeed");

  // 2. Verify subscription is now active with future end date
  const [sub] = await query("SELECT * FROM branch_subscriptions WHERE branch_id = ?", [branchAId]);
  assert.equal(sub.status, "active");
  assert.ok(dateValue(sub.current_period_ends_on) >= "2026-10-21");

  // 3. Manager of Branch A immediately creates a sale -> SUCESSS (HTTP 201)
  const saleRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${branchAManagerToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      customerId: partyAId,
      saleDate: "2026-10-21",
      paymentMethod: "cash",
      paidAmount: 850,
      items: [
        {
          productId: productIdA,
          itemType: "accessory",
          productName: "Screen Protector",
          quantity: 1,
          unitPrice: 850,
          totalPrice: 850
        }
      ]
    })
  });

  assert.equal(saleRes.status, 201, "Upon renewal, sale creation must succeed immediately without caching delays");
  const saleData = await saleRes.json();
  assert.ok(saleData.id);

  // 4. Sales list is visible
  const getSalesRes = await fetch(`${baseUrl}/api/sales`, {
    headers: { Authorization: `Bearer ${branchAManagerToken}` }
  });
  assert.equal(getSalesRes.status, 200);
  const salesList = await getSalesRes.json();
  assert.ok(salesList.some((s) => s.id === saleData.id));
});

test("Edge case: Branch with NO subscription record at all is BLOCKED like an expired one", async () => {
  // Ensure branch C has NO subscription record in DB (in case migrations ran in between)
  await query("DELETE FROM branch_subscriptions WHERE branch_id = ?", [branchCId]);

  // 1. Manager of Branch C logs in
  const [managerC] = await query("SELECT email FROM users WHERE id = ?", [branchCManagerId]);
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: managerC.email,
      password: "testPass123"
    })
  });

  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.user.subscriptionPlan.status, "expired");
  assert.equal(loginData.user.subscriptionPlan.isExpired, true);

  // 2. Direct API call to create sale is rejected with 403 SUBSCRIPTION_EXPIRED
  const saleRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${branchCManagerToken}`
    },
    body: JSON.stringify({
      branchId: branchCId,
      saleDate: "2026-10-21",
      paymentMethod: "cash",
      paidAmount: 100,
      items: []
    })
  });

  assert.equal(saleRes.status, 403, "Branch with no subscription record must return HTTP 403");
  const saleData = await saleRes.json();
  assert.equal(saleData.code, "SUBSCRIPTION_EXPIRED");
  assert.equal(saleData.branch.id, branchCId);
});

test("Edge case: Open cash register session at expiry is rejected with SUBSCRIPTION_EXPIRED and no partial save", async () => {
  // Re-expire Branch A
  await query(
    "UPDATE branch_subscriptions SET status = 'expired', current_period_ends_on = '2026-10-15' WHERE branch_id = ?",
    [branchAId]
  );

  const res = await fetch(`${baseUrl}/api/cash-register/open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${branchAManagerToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      sessionDate: "2026-10-21",
      openingBalance: 5000,
      notes: "Opening drawer on expired branch"
    })
  });

  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.code, "SUBSCRIPTION_EXPIRED");

  // Verify no cash register session was opened in database
  const sessions = await query(
    "SELECT * FROM cash_register_sessions WHERE branch_id = ? AND business_date = '2026-10-21'",
    [branchAId]
  );
  assert.equal(sessions.length, 0, "No partial cash register session should be saved");
});
