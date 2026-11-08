import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { pool, query } from "../src/db/pool.js";
import { env } from "../src/config/env.js";

let server;
let baseUrl;
let businessId;
let branchId;
let cashierToken;
let prod1Id; // Stock: 2
let prod2Id; // Stock: 0
let prodValidId; // Stock: 10

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const ts = Date.now().toString().slice(-6);

  // 1. Subscription plan with sales permission
  const pkg = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1000, 1000, 'monthly', 1, 'month', 5, 14, 7, 1, ?)`,
    [`Validation Biz Plan ${ts}`, JSON.stringify(["dashboard", "sales", "inventory"])]
  );

  // 2. Business
  const biz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Val Biz ${ts}`, `VAL_${ts}`]
  );
  businessId = biz.insertId;

  // 3. Branch
  const br = await query(
    "INSERT INTO branches (business_id, name, code, address) VALUES (?, 'Karachi Branch', ?, 'Main Road')",
    [businessId, `BR_${ts}`]
  );
  branchId = br.insertId;

  // 4. Branch subscription active
  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on)
     VALUES (?, ?, ?, 'active', '2099-12-31')`,
    [businessId, branchId, pkg.insertId]
  );

  // 5. Products
  const p1 = await query(
    "INSERT INTO products (business_id, name, sku, item_type, sale_price, is_active) VALUES (?, 'Samsung A54 Screen Protector', ?, 'accessory', 500, 1)",
    [businessId, `SKU-SP-${ts}`]
  );
  prod1Id = p1.insertId;
  await query("INSERT INTO product_stocks (business_id, branch_id, product_id, quantity) VALUES (?, ?, ?, 2)", [businessId, branchId, prod1Id]);

  const p2 = await query(
    "INSERT INTO products (business_id, name, sku, item_type, sale_price, is_active) VALUES (?, 'Type-C Fast Cable 65W', ?, 'accessory', 800, 1)",
    [businessId, `SKU-CBL-${ts}`]
  );
  prod2Id = p2.insertId;
  await query("INSERT INTO product_stocks (business_id, branch_id, product_id, quantity) VALUES (?, ?, ?, 0)", [businessId, branchId, prod2Id]);

  const pValid = await query(
    "INSERT INTO products (business_id, name, sku, item_type, sale_price, is_active) VALUES (?, 'iPhone 15 Case Clear', ?, 'accessory', 1200, 1)",
    [businessId, `SKU-CS-${ts}`]
  );
  prodValidId = pValid.insertId;
  await query("INSERT INTO product_stocks (business_id, branch_id, product_id, quantity) VALUES (?, ?, ?, 10)", [businessId, branchId, prodValidId]);

  // 6. Cashier User with password and role
  const [cashierRole] = await query("SELECT id FROM roles WHERE name = 'cashier'");
  const pwHash = await bcrypt.hash("admin123", 10);
  const cashierUser = await query(
    `INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Ali Cashier', ?, ?, 1)`,
    [businessId, branchId, cashierRole.id, `cashier_${ts}@valpos.test`, pwHash]
  );

  cashierToken = jwt.sign({ userId: cashierUser.insertId }, env.jwtSecret);
});

after(async () => {
  try {
    if (businessId) {
      await query("DELETE FROM sale_order_items WHERE sale_order_id IN (SELECT id FROM sale_orders WHERE branch_id = ?)", [branchId]);
      await query("DELETE FROM sale_orders WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM product_stocks WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM products WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branch_subscriptions WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM users WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branches WHERE id = ?", [branchId]);
      await query("DELETE FROM businesses WHERE id = ?", [businessId]);
    }
  } catch (err) {
    // cleanup ignore
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((res) => server.close(res));
    }
  }
});

test("Sales Checkout Validation: Returns ALL errors with product NAMES and performs ALL-OR-NOTHING abort", async () => {
  // Try to sell 5 of prod1 (available: 2), 3 of prod2 (available: 0), and 1 of prodValid (available: 10)
  const orderPayload = {
    branchId,
    saleDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash",
    paidAmount: 5000,
    items: [
      { productId: prod1Id, productName: "Samsung A54 Screen Protector", quantity: 5, unitPrice: 500 },
      { productId: prod2Id, productName: "Type-C Fast Cable 65W", quantity: 3, unitPrice: 800 },
      { productId: prodValidId, productName: "iPhone 15 Case Clear", quantity: 1, unitPrice: 1200 }
    ]
  };

  const res = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cashierToken}`,
      Connection: "close"
    },
    body: JSON.stringify(orderPayload)
  });

  const data = await res.json();
  assert.equal(res.status, 422, `Expected HTTP 422, got ${res.status}: ${JSON.stringify(data)}`);

  // Rule 1: Error message uses product NAME (never internal ID)
  // Rule 2: Returns ALL errors together in one response
  assert.ok(Array.isArray(data.errors), "Should return an 'errors' array");
  assert.equal(data.errors.length, 2, "Should return exactly 2 errors (both failing products)");

  const err1 = data.errors.find((e) => e.product === "Samsung A54 Screen Protector");
  assert.ok(err1, "Error 1 should mention product name 'Samsung A54 Screen Protector'");
  assert.ok(err1.issue.includes("requested 5") && err1.issue.includes("2 available"));

  const err2 = data.errors.find((e) => e.product === "Type-C Fast Cable 65W");
  assert.ok(err2, "Error 2 should mention product name 'Type-C Fast Cable 65W'");
  assert.ok(err2.issue.includes("requested 3") && err2.issue.includes("0 available"));

  // Rule 3: ALL-OR-NOTHING saving — NOTHING was inserted and NO stock decremented
  const [validStockRows] = await query("SELECT quantity FROM product_stocks WHERE branch_id = ? AND product_id = ?", [branchId, prodValidId]);
  assert.equal(validStockRows.quantity, 10, "Valid product stock must NOT be decremented on failure (must remain 10)");

  const [p1StockRows] = await query("SELECT quantity FROM product_stocks WHERE branch_id = ? AND product_id = ?", [branchId, prod1Id]);
  assert.equal(p1StockRows.quantity, 2, "Product 1 stock must remain unchanged (2)");

  const ordersCount = await query("SELECT COUNT(*) AS count FROM sale_orders WHERE branch_id = ?", [branchId]);
  assert.equal(ordersCount[0].count, 0, "No sale order should be recorded when any product fails");
});

test("Sales Checkout Validation: Successfully records sale when ALL products pass validation", async () => {
  const validOrderPayload = {
    branchId,
    saleDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash",
    paidAmount: 1700,
    items: [
      { productId: prod1Id, productName: "Samsung A54 Screen Protector", quantity: 1, unitPrice: 500 },
      { productId: prodValidId, productName: "iPhone 15 Case Clear", quantity: 1, unitPrice: 1200 }
    ]
  };

  const res = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cashierToken}`,
      Connection: "close"
    },
    body: JSON.stringify(validOrderPayload)
  });

  const saved = await res.json();
  assert.equal(res.status, 201, `Expected HTTP 201, got ${res.status}: ${JSON.stringify(saved)}`);
  assert.ok(saved.invoice_number.startsWith("SAL-"), "Invoice number should be generated");

  // Verify stock decrements
  const [p1StockRows] = await query("SELECT quantity FROM product_stocks WHERE branch_id = ? AND product_id = ?", [branchId, prod1Id]);
  assert.equal(p1StockRows.quantity, 1, "Product 1 stock should decrement from 2 to 1");

  const [pValidStockRows] = await query("SELECT quantity FROM product_stocks WHERE branch_id = ? AND product_id = ?", [branchId, prodValidId]);
  assert.equal(pValidStockRows.quantity, 9, "Valid product stock should decrement from 10 to 9");
});
