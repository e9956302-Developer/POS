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
let branch2Id;
let planId;
let adminToken;
let managerToken;
let cashierToken;
let cashierUserId;
let testModelId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const ts = Date.now().toString().slice(-6);

  // 1. Subscription plan
  const pkgResult = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1000, 1000, 'monthly', 1, 'month', 10, 14, 7, 1, ?)`,
    [`Full Package ${ts}`, JSON.stringify(["dashboard", "sales", "purchases", "inventory", "invoices", "parties", "expenses", "branches", "users", "admin"])]
  );
  planId = pkgResult.insertId;

  // 2. Business
  const biz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Edit Biz ${ts}`, `EDB_${ts}`]
  );
  businessId = biz.insertId;

  // 3. Main branch
  const br = await query(
    "INSERT INTO branches (business_id, name, code, address) VALUES (?, 'Main Outlet', ?, '123 Main St')",
    [businessId, `EDB-01-${ts}`]
  );
  branchId = br.insertId;

  // Secondary branch for editing/transfer testing
  const br2 = await query(
    "INSERT INTO branches (business_id, name, code, address) VALUES (?, 'Second Outlet', ?, '456 Side St')",
    [businessId, `EDB-02-${ts}`]
  );
  branch2Id = br2.insertId;

  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on)
     VALUES (?, ?, ?, 'active', '2099-12-31')`,
    [businessId, branchId, planId]
  );
  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on)
     VALUES (?, ?, ?, 'active', '2099-12-31')`,
    [businessId, branch2Id, planId]
  );

  // 4. Business Admin user
  const [adminRole] = await query("SELECT id FROM roles WHERE name = 'business_super_admin'");
  const pwHash = await bcrypt.hash("admin123", 10);
  const adminUser = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Company Admin', ?, ?, 1)`,
    [businessId, adminRole.id, branchId, `admin_${ts}@editbiz.test`, pwHash]
  );
  adminToken = jwt.sign({ userId: adminUser.insertId }, env.jwtSecret);

  // 5. Manager user
  const [managerRole] = await query("SELECT id FROM roles WHERE name = 'manager'");
  const managerUser = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Store Manager', ?, ?, 1)`,
    [businessId, managerRole.id, branchId, `manager_${ts}@editbiz.test`, pwHash]
  );
  managerToken = jwt.sign({ userId: managerUser.insertId }, env.jwtSecret);

  // 6. Cashier user
  const [cashierRole] = await query("SELECT id FROM roles WHERE name = 'cashier'");
  const cashierUser = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Junior Cashier', ?, ?, 1)`,
    [businessId, cashierRole.id, branchId, `cashier_${ts}@editbiz.test`, pwHash]
  );
  cashierUserId = cashierUser.insertId;
  cashierToken = jwt.sign({ userId: cashierUserId }, env.jwtSecret);

  // 7. Model
  const modelRes = await query(
    `INSERT INTO mobile_models (business_id, company, model_name, variant)
     VALUES (?, 'Samsung', 'Galaxy S24', '128GB Onyx')`,
    [businessId]
  );
  testModelId = modelRes.insertId;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("branch editing: editing branch code is rejected, name and address can be updated", async () => {
  // Attempting to change branch code must be rejected
  const rejectRes = await fetch(`${baseUrl}/api/branches/${branch2Id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Updated Second Outlet",
      code: `NEW-CODE-${Date.now().toString().slice(-4)}`,
      address: "789 Commercial Plaza, Lahore"
    })
  });
  assert.equal(rejectRes.status, 400);

  // Updating name and address without altering immutable branch code succeeds
  const updateRes = await fetch(`${baseUrl}/api/branches/${branch2Id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Updated Second Outlet",
      address: "789 Commercial Plaza, Lahore"
    })
  });

  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.name, "Updated Second Outlet");
  assert.equal(updated.address, "789 Commercial Plaza, Lahore");
});

test("branch deletion: clean branch can be deleted", async () => {
  // Create a temporary empty branch
  const tempBr = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Temp Delete Branch', ?)",
    [businessId, `TMP-${Date.now().toString().slice(-4)}`]
  );
  const tempId = tempBr.insertId;

  const delRes = await fetch(`${baseUrl}/api/branches/${tempId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(delRes.status, 200);
  const data = await delRes.json();
  assert.ok(data.success);
});

test("user editing: company admin can update staff member details and email", async () => {
  const newEmail = `promoted_cashier_${Date.now()}@editbiz.test`;
  const updateRes = await fetch(`${baseUrl}/api/admin/users/${cashierUserId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Senior Manager Cashier",
      email: newEmail,
      roleName: "manager",
      branchId: branchId
    })
  });

  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.full_name, "Senior Manager Cashier");
  assert.equal(updated.email, newEmail);
  assert.equal(updated.role_name, "manager");
});

test("sales & purchases editing: wrong entry can be corrected with stock reconciliation", async () => {
  const ts = Date.now().toString().slice(-6);
  const imei1 = `8600000000${ts}1`;
  const imei2 = `8600000000${ts}2`;

  // 1. Create a purchase order with imei1 using managerToken
  const purRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      purchaseDate: "2026-10-15",
      paymentMethod: "cash",
      paidAmount: 100000,
      items: [{ imei: imei1, modelId: testModelId, unitCost: 100000 }]
    })
  });
  assert.equal(purRes.status, 201);
  const purchase = await purRes.json();

  // 2. Edit the purchase: change unit cost and add imei2 (by admin or manager)
  const editPurRes = await fetch(`${baseUrl}/api/purchases/${purchase.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      purchaseDate: "2026-10-15",
      paymentMethod: "cash",
      paidAmount: 190000,
      items: [
        { imei: imei1, modelId: testModelId, unitCost: 95000 },
        { imei: imei2, modelId: testModelId, unitCost: 95000 }
      ]
    })
  });
  assert.equal(editPurRes.status, 200);
  const updatedPur = await editPurRes.json();
  assert.equal(Number(updatedPur.total_amount), 190000);
  assert.equal(updatedPur.items.length, 2);

  // 3. Create a sale order with imei1 using managerToken
  const saleRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      saleDate: "2026-10-15",
      paymentMethod: "cash",
      paidAmount: 120000,
      items: [{ imei: imei1, unitPrice: 120000 }]
    })
  });
  assert.equal(saleRes.status, 201);
  const sale = await saleRes.json();

  // 4. Edit the sale: replace imei1 with imei2 and correct price to 135000 (by admin or manager)
  const editSaleRes = await fetch(`${baseUrl}/api/sales/${sale.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      saleDate: "2026-10-15",
      paymentMethod: "cash",
      paidAmount: 135000,
      items: [{ imei: imei2, unitPrice: 135000 }]
    })
  });
  assert.equal(editSaleRes.status, 200);
  const updatedSale = await editSaleRes.json();
  assert.equal(Number(updatedSale.total_amount), 135000);
  assert.equal(updatedSale.items[0].imei, imei2);

  // 5. Verify that imei1 was restored to in_stock
  const [unit1] = await query("SELECT current_status FROM mobile_units WHERE imei = ?", [imei1]);
  assert.equal(unit1.current_status, "in_stock", "Replaced IMEI must be restored to in_stock");

  // 6. Verify that imei2 is marked sold
  const [unit2] = await query("SELECT current_status FROM mobile_units WHERE imei = ?", [imei2]);
  assert.equal(unit2.current_status, "sold", "New IMEI must be marked sold");
});

test("role permissions: company admin can restrict or grant editing & deletion rights", async () => {
  const ts = Date.now().toString().slice(-6);
  const pwHash = await bcrypt.hash("cashier123", 10);
  const [cashierRole] = await query("SELECT id FROM roles WHERE name = 'cashier'");
  const restrictedUser = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Restricted Cashier', ?, ?, 1)`,
    [businessId, cashierRole.id, branchId, `restricted_${ts}@editbiz.test`, pwHash]
  );
  const restrictedToken = jwt.sign({ userId: restrictedUser.insertId }, env.jwtSecret);

  // 1. Cashier attempts to edit a sale without edit rights -> 403 Forbidden
  const failEditRes = await fetch(`${baseUrl}/api/sales/1`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${restrictedToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      saleDate: "2026-10-15",
      paymentMethod: "cash",
      items: []
    })
  });
  assert.equal(failEditRes.status, 403, "Cashier without edit rights must be rejected with 403");

  // 2. Company admin grants sales:edit override to this cashier
  const grantRes = await fetch(`${baseUrl}/api/admin/users/${restrictedUser.insertId}/permissions`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      permissions: [
        { pageKey: "sales", actionKey: "view", isAllowed: 1 },
        { pageKey: "sales", actionKey: "create", isAllowed: 1 },
        { pageKey: "sales", actionKey: "edit", isAllowed: 1 },
        { pageKey: "sales", actionKey: "delete", isAllowed: 0 }
      ]
    })
  });
  assert.equal(grantRes.status, 200);

  // 3. Cashier now has permission to edit sales (will get 400 for bad input, NOT 403 Forbidden!)
  const allowedEditRes = await fetch(`${baseUrl}/api/sales/1`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${restrictedToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      saleDate: "2026-10-15",
      paymentMethod: "cash",
      items: []
    })
  });
  assert.notEqual(allowedEditRes.status, 403, "Cashier with granted edit rights must not receive 403");
});
