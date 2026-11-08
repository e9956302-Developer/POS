import test from "node:test";
import assert from "node:assert/strict";
import { query } from "../src/db/pool.js";
import { fetchUserSubscription } from "../src/middleware/auth.js";

test("Simple Subscriptions & Packages: rule validation and assignment", async () => {
  // 1. Create a test package with duration = 3 months, price = 600
  const pkgName = `Test Pro ${Date.now()}`;
  const insertRes = await query(
    `INSERT INTO subscription_plans (name, price, monthly_price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 600.00, 200.00, '3_months', 3, 'month', 1, 0, 0, 1, ?)`,
    [pkgName, JSON.stringify(["dashboard", "sales", "inventory"])]
  );
  const planId = insertRes.insertId;

  // 2. Query branch 1
  const [branch] = await query("SELECT id, business_id FROM branches LIMIT 1");
  assert.ok(branch, "Test branch should exist");

  // 3. Test assign package with auto-calculated 3-month duration
  const startDate = "2026-10-15";
  const [calc] = await query("SELECT DATE_FORMAT(DATE_ADD(DATE(?), INTERVAL 3 MONTH), '%Y-%m-%d') AS end_date", [startDate]);
  const expectedEndDate = calc.end_date;
  assert.equal(expectedEndDate, "2027-01-15");

  // Assign to branch
  await query(
    `UPDATE branch_subscriptions
     SET plan_id = ?, subscription_starts_on = ?, current_period_ends_on = ?, status = 'active', trial_ends_on = NULL, grace_ends_on = NULL
     WHERE branch_id = ?`,
    [planId, startDate, expectedEndDate, branch.id]
  );

  // 4. Test fetchUserSubscription enforces active package module access
  const activeSub = await fetchUserSubscription(branch.business_id, branch.id);
  assert.equal(activeSub.subscriptionPlan.status, "active");
  assert.deepEqual(activeSub.allowedPages, ["dashboard", "sales", "inventory"]);

  // 5. Test expired package loses access to paid modules
  const pastEndDate = "2026-01-01";
  await query(
    `UPDATE branch_subscriptions
     SET current_period_ends_on = ?
     WHERE branch_id = ?`,
    [pastEndDate, branch.id]
  );

  const expiredSub = await fetchUserSubscription(branch.business_id, branch.id);
  assert.equal(expiredSub.subscriptionPlan.status, "expired");
  assert.deepEqual(expiredSub.allowedPages, [], "Expired customer should lose access to paid modules");

  // Cleanup test package
  await query("DELETE FROM subscription_plans WHERE id = ?", [planId]);
});
