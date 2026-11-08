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
let branchAId;
let branchBId;
let adminToken;
let adminUserId;
let managerToken;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const ts = Date.now().toString().slice(-6);
  const biz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Transfer Biz ${ts}`, `TRB_${ts}`]
  );
  businessId = biz.insertId;

  const brA = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Branch Alpha', ?)",
    [businessId, `TRA_${ts}`]
  );
  branchAId = brA.insertId;

  const brB = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Branch Beta', ?)",
    [businessId, `TRB2_${ts}`]
  );
  branchBId = brB.insertId;

  // Active subscriptions for both branches
  await query(
    "INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on) VALUES (?, ?, 1, 'active', '2099-12-31')",
    [businessId, branchAId]
  );
  await query(
    "INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on) VALUES (?, ?, 1, 'active', '2099-12-31')",
    [businessId, branchBId]
  );

  const [role] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");
  const [mgrRole] = await query("SELECT id FROM roles WHERE name = 'manager' LIMIT 1");
  const passwordHash = await bcrypt.hash("transferPass123", 10);

  const userResult = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Transfer Super Admin', ?, ?, 1)`,
    [businessId, role.id, branchAId, `transfer_admin_${ts}@test.local`, passwordHash]
  );
  adminUserId = userResult.insertId;
  adminToken = jwt.sign({ userId: adminUserId }, env.jwtSecret, { expiresIn: "1h" });

  const mgrUserResult = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Transfer Manager', ?, ?, 1)`,
    [businessId, mgrRole.id, branchAId, `transfer_mgr_${ts}@test.local`, passwordHash]
  );
  managerToken = jwt.sign({ userId: mgrUserResult.insertId }, env.jwtSecret, { expiresIn: "1h" });
});

after(async () => {
  try {
    if (businessId) {
      await query("DELETE FROM payments WHERE branch_id IN (?, ?)", [branchAId, branchBId]);
      await query("DELETE FROM order_return_items WHERE return_id IN (SELECT id FROM order_returns WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM order_returns WHERE business_id = ?", [businessId]);
      await query("DELETE FROM stock_transfer_items WHERE transfer_id IN (SELECT id FROM stock_transfers WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM stock_transfers WHERE business_id = ?", [businessId]);
      await query("DELETE FROM sale_order_items WHERE sale_order_id IN (SELECT id FROM sale_orders WHERE branch_id IN (?, ?))", [branchAId, branchBId]);
      await query("DELETE FROM sale_orders WHERE branch_id IN (?, ?)", [branchAId, branchBId]);
      await query("DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE branch_id IN (?, ?))", [branchAId, branchBId]);
      await query("DELETE FROM stock_movements WHERE business_id = ?", [businessId]);
      await query("DELETE FROM mobile_units WHERE business_id = ?", [businessId]);
      await query("DELETE FROM purchase_orders WHERE branch_id IN (?, ?)", [branchAId, branchBId]);
      await query("DELETE FROM product_stocks WHERE branch_id IN (?, ?)", [branchAId, branchBId]);
      await query("DELETE FROM products WHERE business_id = ?", [businessId]);
      await query("DELETE FROM categories WHERE business_id = ?", [businessId]);
      await query("DELETE FROM mobile_models WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branch_subscriptions WHERE branch_id IN (?, ?)", [branchAId, branchBId]);
      await query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM users WHERE business_id = ?", [businessId]);
      await query("DELETE FROM parties WHERE business_id = ?", [businessId]);
      await query("DELETE FROM notifications WHERE branch_id IN (?, ?)", [branchAId, branchBId]);
      await query("DELETE FROM branches WHERE id IN (?, ?)", [branchAId, branchBId]);
      await query("DELETE FROM businesses WHERE id = ?", [businessId]);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((res) => server.close(res));
    }
  }
});

test("inter-branch transfer: dispatch from branch A and receive at branch B", async () => {
  const ts = Date.now().toString().slice(-4);

  // 1. Setup Model and Product
  const modelRes = await query(
    "INSERT INTO mobile_models (business_id, company, model_name) VALUES (?, 'Google', 'Pixel 8')",
    [businessId]
  );
  const modelId = modelRes.insertId;

  const prodRes = await query(
    "INSERT INTO products (business_id, name, sku, item_type, cost_price, sale_price) VALUES (?, 'Pixel Case', ?, 'accessory', 800, 1500)",
    [businessId, `PIX-CASE-${ts}`]
  );
  const productId = prodRes.insertId;

  // 2. Setup initial stock at Branch A
  const testImei = `357123${Date.now().toString().slice(-9)}`;
  const unitRes = await query(
    "INSERT INTO mobile_units (business_id, imei, model_id, branch_id, current_status, cost_price) VALUES (?, ?, ?, ?, 'in_stock', 180000)",
    [businessId, testImei, modelId, branchAId]
  );
  const unitId = unitRes.insertId;

  await query(
    "INSERT INTO product_stocks (business_id, branch_id, product_id, quantity) VALUES (?, ?, ?, 15)",
    [businessId, branchAId, productId]
  );

  // 3. Initiate Transfer from Branch A -> Branch B (1 Handset, 5 Cases)
  const transferRes = await fetch(`${baseUrl}/api/transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fromBranchId: branchAId,
      toBranchId: branchBId,
      notes: "Stock rebalance to Beta",
      items: [
        { imei: testImei },
        { productId: productId, quantity: 5 }
      ]
    })
  });
  assert.equal(transferRes.status, 201);
  const transferData = await transferRes.json();
  assert.equal(transferData.status, "in_transit");

  // Verify Handset locked to in_transit
  const [unitAfterDispatch] = await query("SELECT current_status FROM mobile_units WHERE id = ?", [unitId]);
  assert.equal(unitAfterDispatch.current_status, "in_transit");

  // Verify Branch A product stock decremented (15 - 5 = 10)
  const [stockAAfterDispatch] = await query("SELECT quantity FROM product_stocks WHERE branch_id = ? AND product_id = ?", [branchAId, productId]);
  assert.equal(Number(stockAAfterDispatch.quantity), 10);

  // 4. Branch B receives the transfer
  const receiveRes = await fetch(`${baseUrl}/api/transfers/${transferData.id}/receive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    }
  });
  assert.equal(receiveRes.status, 200);
  const receivedData = await receiveRes.json();
  assert.equal(receivedData.status, "completed");

  // Verify Handset is now at Branch B and in_stock
  const [unitAfterReceive] = await query("SELECT branch_id, current_status FROM mobile_units WHERE id = ?", [unitId]);
  assert.equal(unitAfterReceive.branch_id, branchBId);
  assert.equal(unitAfterReceive.current_status, "in_stock");

  // Verify Branch B product stock incremented to 5
  const [stockBAfterReceive] = await query("SELECT quantity FROM product_stocks WHERE branch_id = ? AND product_id = ?", [branchBId, productId]);
  assert.equal(Number(stockBAfterReceive.quantity), 5);
});

test("inter-branch transfer: cancellation restores stock to source branch", async () => {
  const ts = Date.now().toString().slice(-4);
  const testImei = `357999${Date.now().toString().slice(-9)}`;

  const [model] = await query("SELECT id FROM mobile_models WHERE business_id = ? LIMIT 1", [businessId]);
  const unitRes = await query(
    "INSERT INTO mobile_units (business_id, imei, model_id, branch_id, current_status, cost_price) VALUES (?, ?, ?, ?, 'in_stock', 150000)",
    [businessId, testImei, model.id, branchAId]
  );
  const unitId = unitRes.insertId;

  // Initiate Transfer
  const transferRes = await fetch(`${baseUrl}/api/transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fromBranchId: branchAId,
      toBranchId: branchBId,
      items: [{ imei: testImei }]
    })
  });
  assert.equal(transferRes.status, 201);
  const transferData = await transferRes.json();

  // Cancel Transfer
  const cancelRes = await fetch(`${baseUrl}/api/transfers/${transferData.id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    }
  });
  assert.equal(cancelRes.status, 200);

  // Verify unit returned to in_stock at Branch A
  const [unitAfterCancel] = await query("SELECT branch_id, current_status FROM mobile_units WHERE id = ?", [unitId]);
  assert.equal(unitAfterCancel.branch_id, branchAId);
  assert.equal(unitAfterCancel.current_status, "in_stock");
});

test("customer sale return: restores unit to stock and records refund", async () => {
  const testImei = `357888${Date.now().toString().slice(-9)}`;
  const [model] = await query("SELECT id FROM mobile_models WHERE business_id = ? LIMIT 1", [businessId]);

  // Setup unit and sell it
  const unitRes = await query(
    "INSERT INTO mobile_units (business_id, imei, model_id, branch_id, current_status, cost_price) VALUES (?, ?, ?, ?, 'in_stock', 100000)",
    [businessId, testImei, model.id, branchAId]
  );
  const unitId = unitRes.insertId;

  const saleRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      quickCustomer: { name: "Sale Return Customer" },
      saleDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
      paidAmount: 120000,
      taxAmount: 0,
      items: [{ imei: testImei, unitPrice: 120000 }]
    })
  });
  assert.equal(saleRes.status, 201);
  const saleData = await saleRes.json();

  // Perform Customer Return
  const returnRes = await fetch(`${baseUrl}/api/returns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      returnType: "customer_return",
      referenceId: saleData.id,
      returnDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
      reason: "Customer changed mind within 24 hours",
      items: [
        { imei: testImei, refundRate: 120000, itemCondition: "good" }
      ]
    })
  });
  assert.equal(returnRes.status, 201);
  const returnData = await returnRes.json();
  assert.ok(returnData.return_number);

  // Verify handset restored to in_stock
  const [unitAfterReturn] = await query("SELECT current_status, sale_order_id FROM mobile_units WHERE id = ?", [unitId]);
  assert.equal(unitAfterReturn.current_status, "in_stock");
  assert.equal(unitAfterReturn.sale_order_id, null);

  // Verify refund payment record exists
  const [payment] = await query("SELECT * FROM payments WHERE reference_type = 'order_return' AND reference_id = ?", [returnData.id]);
  assert.ok(payment);
  assert.equal(Number(payment.amount), 120000);
});

test("vendor return: marks unit returned_to_vendor and adjusts stock", async () => {
  const testImei = `357777${Date.now().toString().slice(-9)}`;
  const [model] = await query("SELECT id FROM mobile_models WHERE business_id = ? LIMIT 1", [businessId]);

  // Setup vendor and purchase
  const vendorRes = await query(
    "INSERT INTO parties (business_id, branch_id, party_type, name) VALUES (?, ?, 'vendor', 'Supplier Mega')",
    [businessId, branchAId]
  );
  const vendorId = vendorRes.insertId;

  const purRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      vendorId: vendorId,
      purchaseDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
      paidAmount: 85000,
      taxAmount: 0,
      items: [{ imei: testImei, modelId: model.id, unitCost: 85000 }]
    })
  });
  assert.equal(purRes.status, 201);
  const purData = await purRes.json();

  // Return to vendor
  const returnRes = await fetch(`${baseUrl}/api/returns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      branchId: branchAId,
      returnType: "vendor_return",
      referenceId: purData.id,
      partyId: vendorId,
      returnDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
      reason: "Factory defect on screen",
      items: [
        { imei: testImei, refundRate: 85000, itemCondition: "defective" }
      ]
    })
  });
  assert.equal(returnRes.status, 201);
  const returnData = await returnRes.json();
  assert.ok(returnData.return_number);

  // Verify handset marked returned_to_vendor
  const [unitAfterVendorReturn] = await query("SELECT current_status FROM mobile_units WHERE imei = ?", [testImei]);
  assert.equal(unitAfterVendorReturn.current_status, "returned_to_vendor");
});
