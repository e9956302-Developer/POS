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
    [`Test Partner Biz ${ts}`, `TPB_${ts}`]
  );
  businessId = bizResult.insertId;

  const branchResult = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Partnership Branch', ?)",
    [businessId, `PB_${ts}`]
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
     VALUES (?, ?, ?, 'Partner Admin', ?, ?, 1)`,
    [businessId, role.id, branchId, `partner_admin_${ts}@test.local`, passwordHash]
  );
  adminUserId = userResult.insertId;

  adminToken = jwt.sign(
    {
      userId: adminUserId,
      email: `partner_admin_${ts}@test.local`,
      role: "business_super_admin",
      businessId,
      branchId,
      permissions: ["admin", "dashboard", "reports_inventory"]
    },
    env.jwtSecret,
    { expiresIn: "1h" }
  );
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (businessId) {
    await query("DELETE FROM partner_transactions WHERE business_id = ?", [businessId]);
    await query("DELETE FROM partner_branch_shares WHERE business_id = ?", [businessId]);
    await query("DELETE FROM partners WHERE business_id = ?", [businessId]);
    await query("DELETE FROM users WHERE business_id = ?", [businessId]);
    await query("DELETE FROM branch_subscriptions WHERE business_id = ?", [businessId]);
    await query("DELETE FROM branches WHERE business_id = ?", [businessId]);
    await query("DELETE FROM businesses WHERE id = ?", [businessId]);
  }
  await pool.end();
});

test("partner capital deposit, drawings, ledger, and dividend disbursement workflow", async () => {
  // 1. Create Partner
  const pRes = await fetch(`${baseUrl}/api/partners`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: "Tariq Partner",
      phone: "03001234567",
      cnic: "35201-1111111-1"
    })
  });
  assert.equal(pRes.status, 201);
  const partner = await pRes.json();
  assert.ok(partner.id);

  // Set branch share to 100%
  const shareRes = await fetch(`${baseUrl}/api/partners/branches/${branchId}/shares`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      shares: [{ partnerId: partner.id, sharePercentage: 100 }]
    })
  });
  assert.equal(shareRes.status, 200);

  // 2. Deposit Capital (Money IN: Capital Injection)
  const depositRes = await fetch(`${baseUrl}/api/partners/${partner.id}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      transactionType: "capital_injection",
      amount: 500000,
      paymentMethod: "bank_transfer",
      transactionDate: "2026-10-01",
      referenceDetails: "Bank Transfer Slip #TXN-8841",
      notes: "Initial launch capital deposit"
    })
  });
  assert.equal(depositRes.status, 201);
  const deposit = await depositRes.json();
  assert.equal(deposit.direction, "in");
  assert.equal(Number(deposit.amount), 500000);
  assert.match(deposit.voucher_number, /^CAP-\d{4}-\d{4}$/);

  // 3. Record Interim Drawing (Money OUT)
  const drawRes = await fetch(`${baseUrl}/api/partners/${partner.id}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      transactionType: "drawing",
      amount: 40000,
      paymentMethod: "cash",
      transactionDate: "2026-10-15",
      notes: "Mid-month advance drawing"
    })
  });
  assert.equal(drawRes.status, 201);
  const drawing = await drawRes.json();
  assert.equal(drawing.direction, "out");
  assert.equal(Number(drawing.amount), 40000);
  assert.match(drawing.voucher_number, /^DRW-\d{4}-\d{4}$/);

  // 4. Verify Partner Ledger & Running Balance
  const ledgerRes = await fetch(`${baseUrl}/api/partners/${partner.id}/transactions`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(ledgerRes.status, 200);
  const ledger = await ledgerRes.json();
  assert.equal(ledger.transactions.length, 2);
  assert.equal(ledger.summary.totalInjected, 500000);
  assert.equal(ledger.summary.totalDrawings, 40000);
  assert.equal(ledger.summary.currentBalance, 460000); // 500k - 40k = 460k

  // 5. Verify Capital Summary
  const summaryRes = await fetch(`${baseUrl}/api/partners/${partner.id}/capital-summary`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(summaryRes.status, 200);
  const summary = await summaryRes.json();
  assert.equal(summary.totals.totalInjected, 500000);
  assert.equal(summary.totals.totalDrawings, 40000);
  assert.equal(summary.totals.netBalance, 460000);

  // 6. Test Disburse Dividends (Certified Profit Payout)
  const disburseRes = await fetch(`${baseUrl}/api/partners/branches/${branchId}/disburse-dividends`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      periodLabel: "October 2026",
      distributions: [
        {
          partnerId: partner.id,
          amount: 75000,
          paymentMethod: "bank_transfer",
          referenceDetails: "October 2026 Dividend Payout",
          notes: "Certified Net Profit Payout"
        }
      ]
    })
  });
  assert.equal(disburseRes.status, 201);
  const disburseData = await disburseRes.json();
  assert.equal(disburseData.vouchers.length, 1);
  assert.match(disburseData.vouchers[0].voucherNumber, /^DIV-\d{4}-\d{4}$/);

  // 7. Verify Duplicate Disbursement Rejection for the same period
  const dupRes = await fetch(`${baseUrl}/api/partners/branches/${branchId}/disburse-dividends`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      periodLabel: "October 2026",
      distributions: [
        {
          partnerId: partner.id,
          amount: 75000,
          paymentMethod: "bank_transfer"
        }
      ]
    })
  });
  assert.equal(dupRes.status, 400); // Bad request: already disbursed!

  // 8. Verify GET /api/partners contains live capital totals
  const allPartnersRes = await fetch(`${baseUrl}/api/partners`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(allPartnersRes.status, 200);
  const allPartners = await allPartnersRes.json();
  const currentPartner = allPartners.find((p) => p.id === partner.id);
  assert.ok(currentPartner);
  assert.equal(currentPartner.totalCapitalInjected, 500000);
  assert.equal(currentPartner.totalDrawings, 40000);
  assert.equal(currentPartner.totalDividendsPaid, 75000);
  assert.equal(currentPartner.netCapitalBalance, 385000); // 500k - 40k - 75k = 385k
});
