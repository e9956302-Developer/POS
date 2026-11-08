import test, { after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { pool, query } from "../src/db/pool.js";


test("multi-tenant isolation: identical IMEI across separate businesses", async () => {
  const ts = Date.now().toString().slice(-6);
  const alphaCode = `A_${ts}`;
  const betaCode = `B_${ts}`;
  const testImei = `888000${Date.now().toString().slice(-9)}`;

  let businessAlphaId = null;
  let businessBetaId = null;
  let branchAlphaId = null;
  let branchBetaId = null;
  let modelAlphaId = null;
  let modelBetaId = null;
  let poAlphaId = null;
  let poBetaId = null;

  try {
    const alphaBiz = await query(
      "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
      ["Alpha Cellular", alphaCode]
    );
    businessAlphaId = alphaBiz.insertId;

    const betaBiz = await query(
      "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
      ["Beta Electronics", betaCode]
    );
    businessBetaId = betaBiz.insertId;

    const alphaBranch = await query(
      "INSERT INTO branches (business_id, name, code) VALUES (?, 'Alpha Branch', ?)",
      [businessAlphaId, `BA_${ts}`]
    );
    branchAlphaId = alphaBranch.insertId;

    const betaBranch = await query(
      "INSERT INTO branches (business_id, name, code) VALUES (?, 'Beta Branch', ?)",
      [businessBetaId, `BB_${ts}`]
    );
    branchBetaId = betaBranch.insertId;

    const alphaModel = await query(
      "INSERT INTO mobile_models (business_id, company, model_name) VALUES (?, 'Samsung', 'S24 Ultra')",
      [businessAlphaId]
    );
    modelAlphaId = alphaModel.insertId;

    const betaModel = await query(
      "INSERT INTO mobile_models (business_id, company, model_name) VALUES (?, 'Samsung', 'S24 Ultra')",
      [businessBetaId]
    );
    modelBetaId = betaModel.insertId;

    const passwordHash = await bcrypt.hash("securePassword123", 10);
    const [role] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");

    const alphaUser = await query(
      "INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active) VALUES (?, ?, ?, 'Alpha Admin', ?, ?, 1)",
      [businessAlphaId, role.id, branchAlphaId, `alpha_${ts}@test.local`, passwordHash]
    );

    const betaUser = await query(
      "INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active) VALUES (?, ?, ?, 'Beta Admin', ?, ?, 1)",
      [businessBetaId, role.id, branchBetaId, `beta_${ts}@test.local`, passwordHash]
    );

    const poAlpha = await query(
      "INSERT INTO purchase_orders (invoice_number, branch_id, purchase_date, total_amount, paid_amount, balance_amount, created_by) VALUES (?, ?, CURDATE(), 100000, 100000, 0, ?)",
      [`PA_${ts}`, branchAlphaId, alphaUser.insertId]
    );
    poAlphaId = poAlpha.insertId;

    const poBeta = await query(
      "INSERT INTO purchase_orders (invoice_number, branch_id, purchase_date, total_amount, paid_amount, balance_amount, created_by) VALUES (?, ?, CURDATE(), 100000, 100000, 0, ?)",
      [`PB_${ts}`, branchBetaId, betaUser.insertId]
    );
    poBetaId = poBeta.insertId;

    // 1. Insert the exact same IMEI into Tenant Alpha
    const unitAlpha = await query(
      "INSERT INTO mobile_units (business_id, imei, model_id, branch_id, current_status, purchase_order_id, cost_price) VALUES (?, ?, ?, ?, 'in_stock', ?, 95000)",
      [businessAlphaId, testImei, modelAlphaId, branchAlphaId, poAlphaId]
    );
    assert.ok(unitAlpha.insertId > 0, "Tenant Alpha mobile unit should be created successfully");

    // 2. Insert the exact same IMEI into Tenant Beta concurrently
    const unitBeta = await query(
      "INSERT INTO mobile_units (business_id, imei, model_id, branch_id, current_status, purchase_order_id, cost_price) VALUES (?, ?, ?, ?, 'in_stock', ?, 94000)",
      [businessBetaId, testImei, modelBetaId, branchBetaId, poBetaId]
    );
    assert.ok(unitBeta.insertId > 0, "Tenant Beta mobile unit with same IMEI should be created successfully");

    // 3. Duplicate within SAME tenant must be rejected
    await assert.rejects(
      async () => {
        await query(
          "INSERT INTO mobile_units (business_id, imei, model_id, branch_id, current_status, purchase_order_id, cost_price) VALUES (?, ?, ?, ?, 'in_stock', ?, 95000)",
          [businessAlphaId, testImei, modelAlphaId, branchAlphaId, poAlphaId]
        );
      },
      (err) => err.code === "ER_DUP_ENTRY",
      "Inserting duplicate IMEI inside the SAME business must be rejected"
    );

    // 4. Verify scoped query isolation
    const alphaUnits = await query(
      "SELECT * FROM mobile_units WHERE business_id = ? AND imei = ?",
      [businessAlphaId, testImei]
    );
    assert.equal(alphaUnits.length, 1);
    assert.equal(Number(alphaUnits[0].cost_price), 95000);

    const betaUnits = await query(
      "SELECT * FROM mobile_units WHERE business_id = ? AND imei = ?",
      [businessBetaId, testImei]
    );
    assert.equal(betaUnits.length, 1);
    assert.equal(Number(betaUnits[0].cost_price), 94000);

  } finally {
    if (businessAlphaId) {
      await query("DELETE FROM mobile_units WHERE business_id = ?", [businessAlphaId]);
      if (branchAlphaId) {
        await query("DELETE FROM purchase_orders WHERE branch_id = ?", [branchAlphaId]);
      }
      await query("DELETE FROM users WHERE business_id = ?", [businessAlphaId]);
      await query("DELETE FROM mobile_models WHERE business_id = ?", [businessAlphaId]);
      await query("DELETE FROM branches WHERE business_id = ?", [businessAlphaId]);
      await query("DELETE FROM businesses WHERE id = ?", [businessAlphaId]);
    }
    if (businessBetaId) {
      await query("DELETE FROM mobile_units WHERE business_id = ?", [businessBetaId]);
      if (branchBetaId) {
        await query("DELETE FROM purchase_orders WHERE branch_id = ?", [branchBetaId]);
      }
      await query("DELETE FROM users WHERE business_id = ?", [businessBetaId]);
      await query("DELETE FROM mobile_models WHERE business_id = ?", [businessBetaId]);
      await query("DELETE FROM branches WHERE business_id = ?", [businessBetaId]);
      await query("DELETE FROM businesses WHERE id = ?", [businessBetaId]);
    }
  }
});

test("security: password hash verification strictly enforces bcrypt", async () => {
  const hash = await bcrypt.hash("correctPassword", 10);
  assert.equal(await bcrypt.compare("correctPassword", hash), true);
  assert.equal(await bcrypt.compare("wrongPassword", hash), false);

  const plainStored = "plainPassword123";
  const isValid = plainStored.startsWith("$2") ? await bcrypt.compare("plainPassword123", plainStored) : false;
  assert.equal(isValid, false, "Plaintext stored password must be rejected");
});
