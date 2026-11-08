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
let managerToken;
let testVendorId;
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
  const biz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Purchase Fixes Biz ${ts}`, `PFB_${ts}`]
  );
  businessId = biz.insertId;

  const br = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Main Branch', ?)",
    [businessId, `PFM_${ts}`]
  );
  branchId = br.insertId;

  await query(
    "INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on) VALUES (?, ?, 1, 'active', '2099-12-31')",
    [businessId, branchId]
  );

  const [mgrRole] = await query("SELECT id FROM roles WHERE name = 'manager' LIMIT 1");
  const passwordHash = await bcrypt.hash("managerPass123", 10);

  const userResult = await query(
    `INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Branch Manager', ?, ?, 1)`,
    [businessId, branchId, mgrRole.id, `mgr_pfixes_${ts}@pos.local`, passwordHash]
  );

  managerToken = jwt.sign(
    {
      userId: userResult.insertId
    },
    env.jwtSecret,
    { expiresIn: "2h" }
  );

  const modelResult = await query(
    "INSERT INTO mobile_models (business_id, company, model_name) VALUES (?, 'Samsung', 'Galaxy S24')",
    [businessId]
  );
  testModelId = modelResult.insertId;

  const vendorResult = await query(
    "INSERT INTO parties (business_id, branch_id, name, party_type, phone) VALUES (?, ?, 'Wholesale Supplier', 'vendor', '03001234567')",
    [businessId, branchId]
  );
  testVendorId = vendorResult.insertId;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("CHANGE 1: Vendor selected clears purchaser name and CNIC; records against vendor", async () => {
  const ts = Date.now().toString().slice(-6);
  const imei = `8611111111${ts}1`;

  const res = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      vendorId: testVendorId,
      purchaserName: "Should Be Stripped",
      purchaserCnic: "42101-1111111-1",
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      discountAmount: 0,
      taxAmount: 0,
      paidAmount: 10000,
      items: [{ imei, modelId: testModelId, unitCost: 10000 }]
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.vendor_id, testVendorId);
  assert.equal(data.purchaser_name, null);
  assert.equal(data.purchaser_cnic, null);
});

test("CHANGE 1: Walk-in purchase (no vendor) saves purchaser name and valid CNIC, rejects invalid CNIC", async () => {
  const ts = Date.now().toString().slice(-6);
  const imeiBad = `8622222222${ts}1`;

  // Invalid CNIC format
  const badRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      vendorId: null,
      purchaserName: "Muhammad Ali",
      purchaserCnic: "12345-bad-cnic",
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      paidAmount: 10000,
      items: [{ imei: imeiBad, modelId: testModelId, unitCost: 10000 }]
    })
  });
  assert.equal(badRes.status, 400);
  const badData = await badRes.json();
  assert.match(badData.message, /Invalid CNIC format/);

  // Valid CNIC format
  const imeiGood = `8633333333${ts}2`;
  const goodRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      vendorId: null,
      purchaserName: "Muhammad Ali",
      purchaserCnic: "42101-1234567-1",
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      paidAmount: 10000,
      items: [{ imei: imeiGood, modelId: testModelId, unitCost: 10000 }]
    })
  });
  assert.equal(goodRes.status, 201);
  const goodData = await goodRes.json();
  assert.equal(goodData.vendor_id, null);
  assert.equal(goodData.purchaser_name, "Muhammad Ali");
  assert.equal(goodData.purchaser_cnic, "42101-1234567-1");
});

test("CHANGE 3: Discount amount calculation, saving, and upper bound validation (<= Subtotal)", async () => {
  const ts = Date.now().toString().slice(-6);
  const imei = `8644444444${ts}1`;

  // Exceeding subtotal
  const overDiscountRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      vendorId: testVendorId,
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      discountAmount: 10001, // > 10000 subtotal
      taxAmount: 500,
      paidAmount: 500,
      items: [{ imei, modelId: testModelId, unitCost: 10000 }]
    })
  });
  assert.equal(overDiscountRes.status, 400);
  const overData = await overDiscountRes.json();
  assert.match(overData.message, /Discount cannot be more than Subtotal/);

  // Valid discount: Subtotal 10,000 - Discount 1,000 + Tax 500 = Net 9,500
  const validRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      vendorId: testVendorId,
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      discountAmount: 1000,
      taxAmount: 500,
      paidAmount: 9500,
      items: [{ imei, modelId: testModelId, unitCost: 10000 }]
    })
  });
  assert.equal(validRes.status, 201);
  const validData = await validRes.json();
  assert.equal(Number(validData.subtotal), 10000);
  assert.equal(Number(validData.discount_amount), 1000);
  assert.equal(Number(validData.tax_amount), 500);
  assert.equal(Number(validData.total_amount), 9500);
  assert.equal(Number(validData.paid_amount), 9500);
  assert.equal(Number(validData.balance_amount), 0);
  assert.equal(validData.due_date, null);
});

test("CHANGE 4 & VALIDATION: Paid Amount cannot exceed Net Amount", async () => {
  const ts = Date.now().toString().slice(-6);
  const imei = `8655555555${ts}1`;

  // Net: 10000 - 1000 + 500 = 9500, Paid: 9501
  const overPaidRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      vendorId: testVendorId,
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      discountAmount: 1000,
      taxAmount: 500,
      paidAmount: 9501,
      items: [{ imei, modelId: testModelId, unitCost: 10000 }]
    })
  });
  assert.equal(overPaidRes.status, 400);
  const overPaidData = await overPaidRes.json();
  assert.match(overPaidData.message, /Paid Amount cannot be more than Net Amount/);
});

test("CHANGE 4: Due Date required when balance > 0, rejected if past, disabled/cleared if balance = 0", async () => {
  const ts = Date.now().toString().slice(-6);
  const imei1 = `8666666666${ts}1`;

  // 1. Partial payment (Balance > 0) without dueDate -> rejected
  const missingDueDateRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      vendorId: testVendorId,
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      discountAmount: 1000,
      taxAmount: 500,
      paidAmount: 4000, // Balance = 5500
      items: [{ imei: imei1, modelId: testModelId, unitCost: 10000 }]
    })
  });
  assert.equal(missingDueDateRes.status, 400);
  const missingData = await missingDueDateRes.json();
  assert.match(missingData.message, /Due Date is required when a balance is due/);

  // 2. Partial payment with past dueDate -> rejected
  const pastDueDateRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      vendorId: testVendorId,
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      discountAmount: 1000,
      taxAmount: 500,
      paidAmount: 4000,
      dueDate: "2020-01-01",
      items: [{ imei: imei1, modelId: testModelId, unitCost: 10000 }]
    })
  });
  assert.equal(pastDueDateRes.status, 400);
  const pastData = await pastDueDateRes.json();
  assert.match(pastData.message, /Due Date cannot be in the past/);

  // 3. Partial payment with valid future dueDate -> success
  const validPartialRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId,
      vendorId: testVendorId,
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      discountAmount: 1000,
      taxAmount: 500,
      paidAmount: 4000,
      dueDate: "2026-11-15",
      items: [{ imei: imei1, modelId: testModelId, unitCost: 10000 }]
    })
  });
  assert.equal(validPartialRes.status, 201);
  const validPartialData = await validPartialRes.json();
  assert.ok(validPartialData.due_date);

  // 4. Update the purchase to full payment (Balance becomes 0) -> due_date cleared
  const updateRes = await fetch(`${baseUrl}/api/purchases/${validPartialData.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      vendorId: testVendorId,
      purchaseDate: "2026-10-27",
      paymentMethod: "cash",
      discountAmount: 1000,
      taxAmount: 500,
      paidAmount: 9500, // Balance = 0
      dueDate: "2026-11-15", // Should be ignored/cleared to null
      items: [{ imei: imei1, modelId: testModelId, unitCost: 10000 }]
    })
  });
  assert.equal(updateRes.status, 200);
  const updatedData = await updateRes.json();
  assert.equal(Number(updatedData.balance_amount), 0);
  assert.equal(updatedData.due_date, null);
});
