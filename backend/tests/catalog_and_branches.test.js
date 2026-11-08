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
  const bizResult = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Test Catalog Biz ${ts}`, `TCB_${ts}`]
  );
  businessId = bizResult.insertId;

  const branchResult = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Main Branch', ?)",
    [businessId, `BR1_${ts}`]
  );
  branchId = branchResult.insertId;

  await query(
    "INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on) VALUES (?, ?, 1, 'active', '2099-12-31')",
    [businessId, branchId]
  );

  const [role] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");
  const passwordHash = await bcrypt.hash("adminPass123", 10);

  const userResult = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Catalog Admin', ?, ?, 1)`,
    [businessId, role.id, branchId, `catalog_admin_${ts}@test.local`, passwordHash]
  );
  adminUserId = userResult.insertId;

  adminToken = jwt.sign({ userId: adminUserId }, env.jwtSecret, { expiresIn: "1h" });
});

after(async () => {
  try {
    if (businessId) {
      await query("DELETE FROM sale_order_items WHERE sale_order_id IN (SELECT id FROM sale_orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = ?))", [businessId]);
      await query("DELETE FROM sale_orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = ?))", [businessId]);
      await query("DELETE FROM stock_movements WHERE business_id = ?", [businessId]);
      await query("DELETE FROM mobile_units WHERE business_id = ?", [businessId]);
      await query("DELETE FROM purchase_orders WHERE branch_id IN (SELECT id FROM branches WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM mobile_models WHERE business_id = ?", [businessId]);
      await query("DELETE FROM product_stocks WHERE branch_id IN (SELECT id FROM branches WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM products WHERE business_id = ?", [businessId]);
      await query("DELETE FROM categories WHERE business_id = ?", [businessId]);
      await query("DELETE FROM partner_branch_shares WHERE branch_id IN (SELECT id FROM branches WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM partners WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branch_subscriptions WHERE branch_id IN (SELECT id FROM branches WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM payments WHERE branch_id IN (SELECT id FROM branches WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE business_id = ?)", [businessId]);
      await query("DELETE FROM users WHERE business_id = ?", [businessId]);
      await query("DELETE FROM parties WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branches WHERE business_id = ?", [businessId]);
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

test("branch creation auto-provisions branch subscription", async () => {
  const ts = Date.now().toString().slice(-4);
  const res = await fetch(`${baseUrl}/api/branches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: "Gulberg Branch",
      code: `GUL_${ts}`,
      phone: "03001234567",
      address: "Main Boulevard Gulberg"
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  const newBranchId = data.id || data.branchId;
  assert.ok(newBranchId);

  // Check branch subscription was created
  const subs = await query("SELECT * FROM branch_subscriptions WHERE branch_id = ?", [newBranchId]);
  assert.equal(subs.length, 1);
  assert.ok(["trialing", "active"].includes(subs[0].status));
});

test("staff user creation with bcrypt hash and branch scoping", async () => {
  const ts = Date.now().toString().slice(-4);
  const [cashierRole] = await query("SELECT id FROM roles WHERE name = 'cashier' LIMIT 1");

  const res = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fullName: "Ali Cashier",
      email: `cashier_${ts}@test.local`,
      password: "cashierSecretPassword!",
      roleId: cashierRole.id,
      branchId: branchId
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  const newUserId = data.id || data.userId;
  assert.ok(newUserId);

  // Check user exists in db with bcrypt hash
  const users = await query("SELECT * FROM users WHERE id = ?", [newUserId]);
  assert.equal(users.length, 1);
  assert.equal(users[0].business_id, businessId);
  assert.ok(users[0].password_hash.startsWith("$2"));
});

test("categories and non-serialized products catalog CRUD", async () => {
  // 1. Create Category
  const catRes = await fetch(`${baseUrl}/api/products/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: "Fast Chargers",
      description: "Quick charge adapters & cables"
    })
  });
  assert.equal(catRes.status, 201);
  const catData = await catRes.json();
  assert.ok(catData.id);

  // 2. Create Product
  const prodRes = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      categoryId: catData.id,
      name: "Anker 65W GaN Charger",
      sku: `ANK-65W-${Date.now().toString().slice(-4)}`,
      itemType: "accessory",
      costPrice: 2000,
      retailPrice: 3500,
      minStockAlert: 5
    })
  });
  assert.equal(prodRes.status, 201);
  const prodData = await prodRes.json();
  assert.ok(prodData.id);

  // 3. Stock Adjustment
  const adjustRes = await fetch(`${baseUrl}/api/products/stocks/adjust`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId: branchId,
      productId: prodData.id,
      quantityDelta: 25,
      notes: "Initial inventory count"
    })
  });
  assert.equal(adjustRes.status, 200);

  // 4. Check Stock
  const stockRes = await fetch(`${baseUrl}/api/products/stocks?branchId=${branchId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(stockRes.status, 200);
  const stocks = await stockRes.json();
  const foundStock = stocks.find((s) => s.product_id === prodData.id);
  assert.ok(foundStock);
  assert.equal(Number(foundStock.quantity), 25);
});

test("company partners and strict 100% branch dividend share validation", async () => {
  // 1. Create Partner 1
  const p1Res = await fetch(`${baseUrl}/api/partners`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: "Bilal Partner",
      phone: "03009998877",
      cnic: "35201-1234567-1"
    })
  });
  assert.equal(p1Res.status, 201);
  const p1 = await p1Res.json();

  // 2. Create Partner 2
  const p2Res = await fetch(`${baseUrl}/api/partners`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: "Zubair Partner",
      phone: "03001112233",
      cnic: "35201-7654321-2"
    })
  });
  assert.equal(p2Res.status, 201);
  const p2 = await p2Res.json();

  // 3. Set branch shares totaling only 85% -> MUST FAIL (400 Bad Request)
  const failRes = await fetch(`${baseUrl}/api/partners/branches/${branchId}/shares`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      shares: [
        { partnerId: p1.id, sharePercentage: 55 },
        { partnerId: p2.id, sharePercentage: 30 }
      ]
    })
  });
  assert.equal(failRes.status, 400);
  const failBody = await failRes.json();
  assert.match(failBody.message, /must equal 100%/i);

  // 4. Set branch shares totaling 100% (60% + 40%) -> MUST SUCCEED (200 OK)
  const okRes = await fetch(`${baseUrl}/api/partners/branches/${branchId}/shares`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      shares: [
        { partnerId: p1.id, sharePercentage: 60 },
        { partnerId: p2.id, sharePercentage: 40 }
      ]
    })
  });
  assert.equal(okRes.status, 200);

  // Verify retrieval
  const listRes = await fetch(`${baseUrl}/api/partners/branches/${branchId}/shares`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(listRes.status, 200);
  const sharesData = await listRes.json();
  const sharesList = sharesData.shares || [];
  assert.equal(sharesList.length, 2);
  const total = sharesList.reduce((acc, row) => acc + Number(row.share_percentage), 0);
  assert.equal(total, 100);
});

test("mixed purchase and mixed sale order (serialized handsets + non-serialized accessories)", async () => {
  const ts = Date.now().toString().slice(-4);

  // 1. Setup handset model
  const modelRes = await query(
    "INSERT INTO mobile_models (business_id, company, model_name) VALUES (?, 'Apple', 'iPhone 15 Pro')",
    [businessId]
  );
  const modelId = modelRes.insertId;

  // 2. Setup accessory product
  const prodRes = await query(
    "INSERT INTO products (business_id, name, sku, item_type, cost_price, sale_price) VALUES (?, 'Silicone Case 15 Pro', ?, 'accessory', 500, 1500)",
    [businessId, `CASE-15P-${ts}`]
  );
  const productId = prodRes.insertId;

  const testImei = `358999${Date.now().toString().slice(-9)}`;

  // Verify super admin cannot directly perform purchases (operational restriction)
  const adminPurRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId: branchId,
      purchaseDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
      paidAmount: 260000,
      taxAmount: 0,
      items: [{ imei: testImei, modelId: modelId, unitCost: 250000 }]
    })
  });
  assert.equal(adminPurRes.status, 403);

  // Business Admin creates branch manager to perform store operations
  const mgrEmail = `mgr_${ts}@store.local`;
  const createMgrRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      fullName: "Store Manager",
      email: mgrEmail,
      password: "Password123!",
      roleName: "manager",
      branchId: branchId
    })
  });
  assert.equal(createMgrRes.status, 201);

  const mgrLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: mgrEmail, password: "Password123!" })
  });
  assert.equal(mgrLoginRes.status, 200);
  const mgrData = await mgrLoginRes.json();
  const mgrToken = mgrData.token;

  // 3. Mixed Purchase: 1 Handset (cost 250,000) + 20 Cases (cost 500 each = 10,000) performed by Manager
  const purRes = await fetch(`${baseUrl}/api/purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mgrToken}`
    },
    body: JSON.stringify({
      branchId: branchId,
      purchaseDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
      paidAmount: 260000,
      taxAmount: 0,
      items: [
        { imei: testImei, modelId: modelId, unitCost: 250000 },
        { productId: productId, quantity: 20, unitCost: 500 }
      ]
    })
  });
  assert.equal(purRes.status, 201);
  const purData = await purRes.json();
  assert.ok(purData.invoiceNumber || purData.invoice_number);

  // Verify handset is in_stock
  const [unit] = await query("SELECT * FROM mobile_units WHERE business_id = ? AND imei = ?", [businessId, testImei]);
  assert.ok(unit);
  assert.equal(unit.current_status, "in_stock");

  // Verify accessory stock incremented to 20
  const [stockAfterPur] = await query("SELECT quantity FROM product_stocks WHERE branch_id = ? AND product_id = ?", [branchId, productId]);
  assert.equal(Number(stockAfterPur.quantity), 20);

  // 4. Mixed Sale: 1 Handset (price 290,000) + 3 Cases (price 1,500 each = 4,500) performed by Manager
  const saleRes = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mgrToken}`
    },
    body: JSON.stringify({
      branchId: branchId,
      quickCustomer: { name: "Ahmed Buyer", phone: "03211234567" },
      saleDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
      paidAmount: 294500,
      taxAmount: 0,
      items: [
        { imei: testImei, unitPrice: 290000 },
        { productId: productId, quantity: 3, unitPrice: 1500 }
      ]
    })
  });
  assert.equal(saleRes.status, 201);
  const saleData = await saleRes.json();
  assert.ok(saleData.invoiceNumber || saleData.invoice_number);

  // Verify handset marked sold
  const [unitAfterSale] = await query("SELECT current_status, sale_price FROM mobile_units WHERE id = ?", [unit.id]);
  assert.equal(unitAfterSale.current_status, "sold");
  assert.equal(Number(unitAfterSale.sale_price), 290000);

  // Verify accessory stock decremented by 3 (20 - 3 = 17)
  const [stockAfterSale] = await query("SELECT quantity FROM product_stocks WHERE branch_id = ? AND product_id = ?", [branchId, productId]);
  assert.equal(Number(stockAfterSale.quantity), 17);
});
