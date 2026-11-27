import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { query } from "../src/db/pool.js";
import { runMigrations } from "../src/db/migrate.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";

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

test("Company Admin Profit Calculation & Profit Report Suite", async (t) => {
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

  // 2. Fetch Cashier user
  const [cashier] = await query(
    `SELECT u.*, r.name as role_name 
     FROM users u 
     JOIN roles r ON r.id = u.role_id 
     WHERE r.name = 'cashier' 
     LIMIT 1`
  );
  const cashierToken = cashier ? jwt.sign({ userId: cashier.id }, env.jwtSecret, { expiresIn: "1h" }) : null;

  await t.test("GET /api/dashboard/summary calculates profit metrics for Company Admin", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await makeRequest(server, `/api/dashboard/summary?date=${today}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.sales, "Should include sales summary");
    assert.ok(res.data.profit, "Company Admin should receive profit calculations");

    const p = res.data.profit;
    assert.equal(typeof p.grossSales, "number");
    assert.equal(typeof p.netTurnover, "number");
    assert.equal(typeof p.totalCogs, "number");
    assert.equal(typeof p.grossProfit, "number");
    assert.equal(typeof p.totalExpenses, "number");
    assert.equal(typeof p.netProfit, "number");
    assert.equal(typeof p.grossMarginPct, "string");
    assert.equal(typeof p.netMarginPct, "string");
    assert.equal(typeof p.isProfitable, "boolean");

    // Verify equation integrity
    assert.equal(p.grossProfit, p.netTurnover - p.totalCogs);
    assert.equal(p.netProfit, p.grossProfit - p.totalExpenses);

    // Verify MTD structure
    assert.ok(p.mtd, "Should include MTD profit metrics");
    assert.equal(typeof p.mtd.grossProfit, "number");
    assert.equal(typeof p.mtd.netProfit, "number");
    assert.equal(p.mtd.grossProfit, p.mtd.netTurnover - p.mtd.totalCogs);
    assert.equal(p.mtd.netProfit, p.mtd.grossProfit - p.mtd.expenses);
  });

  if (cashierToken) {
    await t.test("GET /api/dashboard/summary conceals profit metrics from non-admin cashier staff", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await makeRequest(server, `/api/dashboard/summary?date=${today}`, {
        headers: { Authorization: `Bearer ${cashierToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.profit, null, "Cashier should not receive confidential company profit metrics");
    });
  }

  await t.test("GET /api/reports/profit returns comprehensive profit report data", async () => {
    const res = await makeRequest(server, `/api/reports/profit?period=this_month`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.financials, "Should contain financials summary");
    assert.ok(Array.isArray(res.data.invoices), "Should contain invoices array");
    assert.ok(Array.isArray(res.data.productProfitability), "Should contain productProfitability array");
    assert.ok(Array.isArray(res.data.dailyTrend), "Should contain dailyTrend array");

    const fin = res.data.financials;
    assert.equal(typeof fin.grossSales, "number");
    assert.equal(typeof fin.totalCogs, "number");
    assert.equal(typeof fin.grossProfit, "number");
    assert.equal(typeof fin.totalExpenses, "number");
    assert.equal(typeof fin.netProfit, "number");
    assert.equal(typeof fin.grossMarginPct, "string");
    assert.equal(typeof fin.netMarginPct, "string");

    // Mathematical identity check
    assert.equal(fin.grossProfit, fin.adjustedRevenue - fin.totalCogs);
    assert.equal(fin.netProfit, fin.grossProfit - fin.totalExpenses);

    // Check invoice profitability fields if invoices exist
    if (res.data.invoices.length > 0) {
      const firstInv = res.data.invoices[0];
      assert.ok("invoice_number" in firstInv);
      assert.ok("sale_amount" in firstInv);
      assert.ok("total_cogs" in firstInv);
      assert.ok("gross_profit" in firstInv);
      assert.ok("margin_pct" in firstInv);
      assert.equal(firstInv.gross_profit, Number((firstInv.sale_amount - firstInv.total_cogs).toFixed(2)));
    }

    // Check product profitability fields if products exist
    if (res.data.productProfitability.length > 0) {
      const firstProd = res.data.productProfitability[0];
      assert.ok("item_name" in firstProd);
      assert.ok("units_sold" in firstProd);
      assert.ok("total_revenue" in firstProd);
      assert.ok("total_cost" in firstProd);
      assert.ok("gross_profit" in firstProd);
      assert.ok("margin_pct" in firstProd);
      assert.equal(firstProd.gross_profit, Number((firstProd.total_revenue - firstProd.total_cost).toFixed(2)));
    }
  });

  await t.test("GET /api/reports/profit respects custom date ranges", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await makeRequest(server, `/api/reports/profit?period=custom&startDate=${today}&endDate=${today}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.ok(res.data.financials);
    assert.equal(res.data.period.startDate, today);
    assert.equal(res.data.period.endDate, today);
  });
});
