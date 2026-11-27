import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { query } from "../src/db/pool.js";
import { runMigrations } from "../src/db/migrate.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { todayString } from "../src/utils/http.js";

async function makeRequest(server, path, options = {}) {
  const address = server.address();
  const host = address.address === "::" ? "127.0.0.1" : address.address;
  const url = `http://${host}:${address.port}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test("Company Admin Dashboard - Period Selection with Consolidated Figures", async (t) => {
  await runMigrations();
  let server;
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });

  t.after(() => {
    server.close();
  });

  // 1. Fetch Company Admin user
  const [companyAdmin] = await query(
    `SELECT u.*, r.name as role_name 
     FROM users u 
     JOIN roles r ON r.id = u.role_id 
     WHERE r.name IN ('business_super_admin', 'admin') 
     LIMIT 1`
  );
  assert.ok(companyAdmin, "Company admin user should exist");
  const adminToken = jwt.sign({ userId: companyAdmin.id }, env.jwtSecret, { expiresIn: "1h" });

  // 2. Fetch active branches for this business
  const branches = await query(
    `SELECT b.id, b.name 
     FROM branches b
     LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
     WHERE b.business_id = :businessId 
       AND (bs.status = 'active' OR bs.id IS NULL)
     ORDER BY b.id ASC`,
    { businessId: companyAdmin.business_id }
  );
  assert.ok(branches.length >= 1, "At least one active branch should exist");
  const branch1 = branches[0];
  const branch2 = branches[1] || branches[0];

  const today = todayString();

  await t.test("1. Default behavior: omitting dateFrom and dateTo defaults both to today in local timezone", async () => {
    const res = await makeRequest(server, `/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.dateFrom, today);
    assert.equal(res.data.dateTo, today);
    assert.equal(res.data.date, today);
    assert.ok(res.data.sales, "Should contain sales");
    assert.ok(res.data.purchases, "Should contain purchases");
    assert.ok(res.data.expenses, "Should contain expenses");
    assert.ok(res.data.profit, "Company Admin should receive profit calculations");
  });

  await t.test("2. Legacy callers: passing ?date=... defaults both dateFrom and dateTo to that date", async () => {
    const res = await makeRequest(server, `/api/dashboard/summary?date=2026-11-20`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.dateFrom, "2026-11-20");
    assert.equal(res.data.dateTo, "2026-11-20");
    assert.equal(res.data.date, "2026-11-20");
  });

  await t.test("3. Validation: Date From cannot be after Date To", async () => {
    const res = await makeRequest(server, `/api/dashboard/summary?dateFrom=2026-11-25&dateTo=2026-11-20`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 400);
    assert.match(res.data.message || "", /Date From cannot be after Date To/);
  });

  await t.test("4. Capping: Date To later than today is capped at today", async () => {
    const res = await makeRequest(server, `/api/dashboard/summary?dateFrom=2026-11-01&dateTo=2099-12-31`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.dateTo, today, "dateTo should be capped at today");
  });

  await t.test("5. Boundary and consolidation checks: records on Date From and Date To are included, adjacent days excluded", async () => {
    // Setup test dates in the past with no existing seed records
    const dFrom = "2024-04-10";
    const dMid = "2024-04-12";
    const dTo = "2024-04-15";
    const dBefore = "2024-04-09";
    const dAfter = "2024-04-16";

    // Insert controlled sale orders across these dates
    const insertSale = async (date, amount, branchId) => {
      const result = await query(
        `INSERT INTO sale_orders (
          invoice_number, branch_id, customer_id, sale_date, payment_method,
          subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, created_by
        ) VALUES (
          CONCAT('TEST-', UUID_SHORT()), :branchId, NULL, :date, 'cash',
          :amount, 0, 0, :amount, :amount, 0, :userId
        )`,
        { branchId, date, amount, userId: companyAdmin.id }
      );
      return result.insertId;
    };

    const idBefore = await insertSale(dBefore, 1000, branch1.id);
    const idFrom = await insertSale(dFrom, 2000, branch1.id);
    const idMid = await insertSale(dMid, 3000, branch1.id);
    const idTo = await insertSale(dTo, 4000, branch1.id);
    const idAfter = await insertSale(dAfter, 5000, branch1.id);

    try {
      // Query multi-day period: dFrom to dTo
      const resPeriod = await makeRequest(server, `/api/dashboard/summary?dateFrom=${dFrom}&dateTo=${dTo}&branchId=${branch1.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(resPeriod.status, 200);
      assert.equal(resPeriod.data.dateFrom, dFrom);
      assert.equal(resPeriod.data.dateTo, dTo);

      // Period sum should include dFrom (2000) + dMid (3000) + dTo (4000) = 9000
      // It must strictly exclude dBefore (1000) and dAfter (5000)
      const salesTotal = Number(resPeriod.data.sales.totalSales);
      assert.equal(salesTotal, 9000, `Sales total (${salesTotal}) should be exactly 9000`);
      assert.equal(Number(resPeriod.data.sales.orderCount), 3, "Order count should be exactly 3");

      // Query single day in the past: exactly dFrom
      const resSingle = await makeRequest(server, `/api/dashboard/summary?dateFrom=${dFrom}&dateTo=${dFrom}&branchId=${branch1.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(resSingle.status, 200);
      assert.equal(resSingle.data.dateFrom, dFrom);
      assert.equal(resSingle.data.dateTo, dFrom);
      assert.equal(Number(resSingle.data.sales.totalSales), 2000, "Single day should show exactly 2000");
      assert.equal(Number(resSingle.data.sales.orderCount), 1, "Single day should show exactly 1 order");

      // Cross-check: dashboard totalSales equals sales/profit report grossSales for the same period and branch scope
      const resReport = await makeRequest(server, `/api/reports/profit?period=custom&startDate=${dFrom}&endDate=${dTo}&branchId=${branch1.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(resReport.status, 200);
      assert.equal(
        Number(resPeriod.data.sales.totalSales),
        Number(resReport.data.financials.grossSales),
        "Dashboard totalSales must equal Report grossSales for the same period and branch"
      );
    } finally {
      // Clean up test rows
      await query(
        `DELETE FROM sale_orders WHERE id IN (:idBefore, :idFrom, :idMid, :idTo, :idAfter)`,
        { idBefore, idFrom, idMid, idTo, idAfter }
      );
    }
  });

  await t.test("6. Branch selector combined with multi-day range", async () => {
    const dFrom = "2025-07-01";
    const dTo = "2025-07-05";

    const insertSale = async (date, amount, branchId) => {
      const result = await query(
        `INSERT INTO sale_orders (
          invoice_number, branch_id, customer_id, sale_date, payment_method,
          subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, created_by
        ) VALUES (
          CONCAT('BR-TEST-', UUID_SHORT()), :branchId, NULL, :date, 'cash',
          :amount, 0, 0, :amount, :amount, 0, :userId
        )`,
        { branchId, date, amount, userId: companyAdmin.id }
      );
      return result.insertId;
    };

    const s1 = await insertSale(dFrom, 1500, branch1.id);
    const s2 = await insertSale(dTo, 2500, branch2.id);

    try {
      // Specific branch 1
      const resB1 = await makeRequest(server, `/api/dashboard/summary?dateFrom=${dFrom}&dateTo=${dTo}&branchId=${branch1.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(resB1.status, 200);
      assert.equal(Number(resB1.data.sales.totalSales), 1500);

      // All branches (no branchId specified)
      const resAll = await makeRequest(server, `/api/dashboard/summary?dateFrom=${dFrom}&dateTo=${dTo}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(resAll.status, 200);
      const allSales = Number(resAll.data.sales.totalSales);
      if (branch1.id !== branch2.id) {
        assert.ok(allSales >= 4000, "All branches should consolidate figures across branches");
      }
    } finally {
      await query(`DELETE FROM sale_orders WHERE id IN (:s1, :s2)`, { s1, s2 });
    }
  });
});
