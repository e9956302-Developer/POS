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

  const pkgResult = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1000, 1000, 'monthly', 1, 'month', 10, 14, 7, 1, ?)`,
    [`Party Test Plan ${ts}`, JSON.stringify(["dashboard", "sales", "purchases", "inventory", "parties"])]
  );
  planId = pkgResult.insertId;

  const biz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Party Biz ${ts}`, `PBZ_${ts}`]
  );
  businessId = biz.insertId;

  const br = await query(
    "INSERT INTO branches (business_id, name, code, address) VALUES (?, 'Party Branch', ?, '456 Street')",
    [businessId, `PBZ-01-${ts}`]
  );
  branchId = br.insertId;

  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on)
     VALUES (?, ?, ?, 'active', '2099-12-31')`,
    [businessId, branchId, planId]
  );

  const [companyAdminRole] = await query("SELECT id FROM roles WHERE name = 'business_super_admin'");
  const hash = await bcrypt.hash("Pass123!", 8);
  const adminUser = await query(
    "INSERT INTO users (business_id, role_id, full_name, email, password_hash, is_active) VALUES (?, ?, 'Party Admin', ?, ?, 1)",
    [businessId, companyAdminRole.id, `partyadmin_${ts}@test.local`, hash]
  );
  adminUserId = adminUser.insertId;

  adminToken = jwt.sign(
    {
      userId: adminUserId,
      id: adminUserId,
      email: `partyadmin_${ts}@test.local`,
      business_id: businessId,
      branch_id: null,
      role_id: companyAdminRole.id,
      role_name: "business_super_admin"
    },
    env.jwtSecret,
    { expiresIn: "1h" }
  );
});

after(async () => {
  try {
    if (businessId) {
      await query("DELETE FROM payments WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM receivables WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM payables WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM sale_order_items WHERE sale_order_id IN (SELECT id FROM sale_orders WHERE branch_id = ?)", [branchId]);
      await query("DELETE FROM sale_orders WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE branch_id = ?)", [branchId]);
      await query("DELETE FROM purchase_orders WHERE branch_id = ?", [branchId]);
      await query("DELETE FROM parties WHERE business_id = ?", [businessId]);
      await query("DELETE FROM users WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branch_subscriptions WHERE business_id = ?", [businessId]);
      await query("DELETE FROM branches WHERE business_id = ?", [businessId]);
      await query("DELETE FROM businesses WHERE id = ?", [businessId]);
    }
    if (planId) {
      await query("DELETE FROM subscription_plans WHERE id = ?", [planId]);
    }
  } catch (err) {
    console.error("Cleanup error in party_delete.test.js:", err);
  } finally {
    if (server) await new Promise((r) => server.close(r));
  }
});

test("DELETE /api/parties/:id deletes a party without linked records", async () => {
  const createRes = await fetch(`${baseUrl}/api/parties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      partyType: "customer",
      name: "Temporary Customer",
      phone: "03009998877"
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();

  const delRes = await fetch(`${baseUrl}/api/parties/${created.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(delRes.status, 200);
  const delBody = await delRes.json();
  assert.equal(delBody.success, true);

  const [check] = await query("SELECT * FROM parties WHERE id = ?", [created.id]);
  assert.equal(check, undefined);
});

test("DELETE /api/parties/:id rejects deletion if party is linked to sale order", async () => {
  const partyResult = await query(
    "INSERT INTO parties (business_id, branch_id, party_type, name) VALUES (?, ?, 'customer', 'Customer With Sale')",
    [businessId, branchId]
  );
  const partyId = partyResult.insertId;

  await query(
    `INSERT INTO sale_orders (invoice_number, branch_id, customer_id, sale_date, subtotal, total_amount, paid_amount, balance_amount, created_by)
     VALUES (?, ?, ?, '2026-11-18', 100, 100, 100, 0, ?)`,
    [`INV-TEST-${Date.now()}`, branchId, partyId, adminUserId]
  );

  const delRes = await fetch(`${baseUrl}/api/parties/${partyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(delRes.status, 400);
  const delBody = await delRes.json();
  assert.match(delBody.message, /Cannot delete party with associated sale orders/);
});

test("DELETE /api/parties/:id rejects deletion if party is linked to purchase order", async () => {
  const vendorResult = await query(
    "INSERT INTO parties (business_id, branch_id, party_type, name) VALUES (?, ?, 'vendor', 'Vendor With Purchase')",
    [businessId, branchId]
  );
  const vendorId = vendorResult.insertId;

  await query(
    `INSERT INTO purchase_orders (invoice_number, branch_id, vendor_id, purchase_date, subtotal, total_amount, paid_amount, balance_amount, created_by)
     VALUES (?, ?, ?, '2026-11-18', 200, 200, 200, 0, ?)`,
    [`PO-TEST-${Date.now()}`, branchId, vendorId, adminUserId]
  );

  const delRes = await fetch(`${baseUrl}/api/parties/${vendorId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(delRes.status, 400);
  const delBody = await delRes.json();
  assert.match(delBody.message, /Cannot delete party with associated purchase orders/);
});

test("DELETE /api/parties/:id rejects deletion if party is linked to payments", async () => {
  const partyResult = await query(
    "INSERT INTO parties (business_id, branch_id, party_type, name) VALUES (?, ?, 'customer', 'Customer With Payment')",
    [businessId, branchId]
  );
  const partyId = partyResult.insertId;

  await query(
    `INSERT INTO payments (reference_type, reference_id, direction, branch_id, party_id, amount, payment_date, created_by)
     VALUES ('sale', 999999, 'in', ?, ?, 500, '2026-11-18', ?)`,
    [branchId, partyId, adminUserId]
  );

  const delRes = await fetch(`${baseUrl}/api/parties/${partyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(delRes.status, 400);
  const delBody = await delRes.json();
  assert.match(delBody.message, /Cannot delete party with associated payment records/);
});

test("DELETE /api/parties/:id enforces tenant isolation", async () => {
  const otherBiz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES ('Other Biz', 'OTH_BIZ', 1)"
  );
  const otherParty = await query(
    "INSERT INTO parties (business_id, party_type, name) VALUES (?, 'customer', 'Other Biz Customer')",
    [otherBiz.insertId]
  );

  const delRes = await fetch(`${baseUrl}/api/parties/${otherParty.insertId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(delRes.status, 400);
  const delBody = await delRes.json();
  assert.match(delBody.message, /Party not found/);

  // Clean up
  await query("DELETE FROM parties WHERE id = ?", [otherParty.insertId]);
  await query("DELETE FROM businesses WHERE id = ?", [otherBiz.insertId]);
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});
