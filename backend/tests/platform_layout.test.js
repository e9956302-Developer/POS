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

test("SaaS Platform Layout Global Switch & Audit Logging", async (t) => {
  await runMigrations();
  let server;
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });

  t.after(async () => {
    try {
      await query("UPDATE platform_settings SET setting_value = 'classic' WHERE setting_key = 'active_layout'");
    } catch {}
    server.close();
  });

  // Get Top Admin user & sign token
  const [topAdmin] = await query(
    "SELECT u.* FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'top_admin' LIMIT 1"
  );
  const topAdminToken = jwt.sign({ userId: topAdmin.id }, env.jwtSecret, { expiresIn: "1h" });

  // Get Company Admin user & sign token
  const [companyAdmin] = await query(
    "SELECT u.* FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'business_super_admin' LIMIT 1"
  );
  const companyAdminToken = jwt.sign({ userId: companyAdmin.id }, env.jwtSecret, { expiresIn: "1h" });

  await t.test("Public endpoint returns current active layout without authentication", async () => {
    const res = await makeRequest(server, "/api/auth/platform-settings");
    assert.equal(res.status, 200);
    assert.ok(res.data.active_layout === "classic" || res.data.active_layout === "modern_compact" || res.data.active_layout === "midnight_executive");
  });

  await t.test("Non-top admin (Company Admin) cannot access or modify layout settings", async () => {
    const getRes = await makeRequest(server, "/api/admin/platform-settings/layout", {
      headers: { Authorization: `Bearer ${companyAdminToken}` }
    });
    assert.equal(getRes.status, 403);

    const putRes = await makeRequest(server, "/api/admin/platform-settings/layout", {
      method: "PUT",
      headers: { Authorization: `Bearer ${companyAdminToken}` },
      body: JSON.stringify({ layout: "modern_compact" })
    });
    assert.equal(putRes.status, 403);
  });

  await t.test("Top Admin can fetch platform layout details", async () => {
    const res = await makeRequest(server, "/api/admin/platform-settings/layout", {
      headers: { Authorization: `Bearer ${topAdminToken}` }
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.active_layout);
  });

  await t.test("Invalid layout values are rejected with 400 bad request", async () => {
    const res = await makeRequest(server, "/api/admin/platform-settings/layout", {
      method: "PUT",
      headers: { Authorization: `Bearer ${topAdminToken}` },
      body: JSON.stringify({ layout: "invalid_super_layout" })
    });
    assert.equal(res.status, 400);
    assert.match(res.data.message, /Invalid layout choice/);
  });

  await t.test("Top Admin switches global platform layout to modern_compact and audit log is written", async () => {
    const putRes = await makeRequest(server, "/api/admin/platform-settings/layout", {
      method: "PUT",
      headers: { Authorization: `Bearer ${topAdminToken}` },
      body: JSON.stringify({ layout: "modern_compact" })
    });
    assert.equal(putRes.status, 200);
    assert.equal(putRes.data.active_layout, "modern_compact");
    assert.equal(putRes.data.success, true);

    // Verify public endpoint returns modern_compact
    const publicRes = await makeRequest(server, "/api/auth/platform-settings");
    assert.equal(publicRes.status, 200);
    assert.equal(publicRes.data.active_layout, "modern_compact");

    // Verify audit log entry
    const [latestAudit] = await query(
      "SELECT * FROM audit_logs WHERE action_type = 'platform_layout_changed' ORDER BY id DESC LIMIT 1"
    );
    assert.ok(latestAudit);
    assert.equal(latestAudit.entity_type, "platform_settings");
    const details = typeof latestAudit.details === "string" ? JSON.parse(latestAudit.details) : latestAudit.details;
    assert.equal(details.to, "modern_compact");
  });

  await t.test("Top Admin switches global platform layout to midnight_executive and audit log is written", async () => {
    const putRes = await makeRequest(server, "/api/admin/platform-settings/layout", {
      method: "PUT",
      headers: { Authorization: `Bearer ${topAdminToken}` },
      body: JSON.stringify({ layout: "midnight_executive" })
    });
    assert.equal(putRes.status, 200);
    assert.equal(putRes.data.active_layout, "midnight_executive");
    assert.equal(putRes.data.success, true);

    // Verify public endpoint returns midnight_executive
    const publicRes = await makeRequest(server, "/api/auth/platform-settings");
    assert.equal(publicRes.status, 200);
    assert.equal(publicRes.data.active_layout, "midnight_executive");
  });

  await t.test("Top Admin can switch layout back to classic seamlessly", async () => {
    const putRes = await makeRequest(server, "/api/admin/platform-settings/layout", {
      method: "PUT",
      headers: { Authorization: `Bearer ${topAdminToken}` },
      body: JSON.stringify({ layout: "classic" })
    });
    assert.equal(putRes.status, 200);
    assert.equal(putRes.data.active_layout, "classic");

    // Verify public endpoint returns classic
    const publicRes = await makeRequest(server, "/api/auth/platform-settings");
    assert.equal(publicRes.status, 200);
    assert.equal(publicRes.data.active_layout, "classic");
  });
});
