import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { query } from "../src/db/pool.js";
import {
  generateTotpSecret,
  generateTotpToken,
  generateRecoveryCodes
} from "../src/utils/totp.js";
import { runServerAdminRecovery } from "../scripts/recover-admin.js";

let server;
let baseUrl;
let ts;
let topAdminEmail;
let breakGlassEmail;
let lockoutTestEmail;
let topAdminUserId;
let breakGlassUserId;
let lockoutUserId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  ts = Date.now().toString().slice(-6);
  topAdminEmail = `topadmin_vault_${ts}@digitalmarkaz360.local`;
  breakGlassEmail = `breakglass_vault_${ts}@digitalmarkaz360.local`;
  lockoutTestEmail = `lockout_vault_${ts}@digitalmarkaz360.local`;

  const [topAdminRole] = await query("SELECT id FROM roles WHERE name = 'top_admin' LIMIT 1");
  const initialHash = await bcrypt.hash("InitialStrongPassword123!#", 12);

  // 1. Create Main Top Admin (no MFA initially)
  const mainUser = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active, mfa_enabled, must_change_password)
     VALUES (NULL, ?, NULL, 'Vault Top Admin', ?, ?, 1, 0, 0)`,
    [topAdminRole.id, topAdminEmail, initialHash]
  );
  topAdminUserId = mainUser.insertId;

  // 2. Create Break-Glass Admin (with is_break_glass = 1 and pre-enrolled MFA)
  const bgSecret = generateTotpSecret(20);
  const bgUser = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active, is_break_glass, mfa_enabled, mfa_secret)
     VALUES (NULL, ?, NULL, 'Break-Glass Emergency Key', ?, ?, 1, 1, 1, ?)`,
    [topAdminRole.id, breakGlassEmail, initialHash, bgSecret]
  );
  breakGlassUserId = bgUser.insertId;

  // 3. Create Lockout Test User
  const lockUser = await query(
    `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active, mfa_enabled)
     VALUES (NULL, ?, NULL, 'Lockout Target User', ?, ?, 1, 0)`,
    [topAdminRole.id, lockoutTestEmail, initialHash]
  );
  lockoutUserId = lockUser.insertId;
});

after(async () => {
  try {
    const userIds = [topAdminUserId, breakGlassUserId, lockoutUserId].filter(Boolean);
    if (userIds.length) {
      await query(`DELETE FROM user_recovery_codes WHERE user_id IN (${userIds.join(",")})`);
      await query(`DELETE FROM user_sessions WHERE user_id IN (${userIds.join(",")})`);
      await query(`DELETE FROM password_resets WHERE user_id IN (${userIds.join(",")})`);
      await query(`DELETE FROM security_alerts WHERE user_id IN (${userIds.join(",")})`);
      await query(`DELETE FROM audit_logs WHERE user_id IN (${userIds.join(",")})`);
      await query(`DELETE FROM users WHERE id IN (${userIds.join(",")})`);
    }
  } catch (err) {
    console.error("Cleanup error in top_admin_vault_security.test.js:", err);
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((res) => server.close(res));
    }
  }
});

// =========================================================================
// TEST 1: Top Admin cannot reach any admin screen before MFA setup (Requirement A.1)
// =========================================================================
test("Acceptance 1: Top Admin cannot reach any admin screen before mandatory MFA setup", async () => {
  // Step 1: Login with valid credentials
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: topAdminEmail, password: "InitialStrongPassword123!#" })
  });

  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.mfaSetupRequired, true, "Must flag that MFA setup is mandatory");
  assert.ok(loginData.enrollmentToken, "Must return restricted enrollmentToken");

  const enrollmentToken = loginData.enrollmentToken;

  // Step 2: Attempt to call a protected admin endpoint using the enrollment token -> MUST BE BLOCKED
  const blockedRes = await fetch(`${baseUrl}/api/admin/dashboard-stats`, {
    headers: { Authorization: `Bearer ${enrollmentToken}` }
  });
  assert.equal(blockedRes.status, 403, "Protected admin screen must be blocked (HTTP 403) before MFA is enrolled");
  const blockedErr = await blockedRes.json();
  assert.match(blockedErr.message, /MFA/i);

  // Step 3: Call MFA setup endpoint with enrollmentToken
  const setupRes = await fetch(`${baseUrl}/api/auth/mfa/setup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${enrollmentToken}` }
  });
  assert.equal(setupRes.status, 200);
  const setupData = await setupRes.json();
  assert.ok(setupData.secret, "Must generate TOTP secret");
  assert.ok(setupData.uri, "Must generate QR URI");
  assert.equal(setupData.recoveryCodes.length, 10, "Must generate exactly 10 recovery codes");

  // Step 4: Confirm MFA with valid TOTP code
  const totpCode = generateTotpToken(setupData.secret);
  const confirmRes = await fetch(`${baseUrl}/api/auth/mfa/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${enrollmentToken}`
    },
    body: JSON.stringify({
      secret: setupData.secret,
      code: totpCode,
      recoveryCodes: setupData.recoveryCodes
    })
  });
  assert.equal(confirmRes.status, 200);
  const confirmData = await confirmRes.json();
  assert.equal(confirmData.success, true);

  // Verify DB state
  const [dbUser] = await query("SELECT mfa_enabled, mfa_secret FROM users WHERE id = ?", [topAdminUserId]);
  assert.equal(dbUser.mfa_enabled, 1);
  assert.equal(dbUser.mfa_secret, setupData.secret);

  // Verify 10 hashed recovery codes are stored
  const savedCodes = await query("SELECT id FROM user_recovery_codes WHERE user_id = ?", [topAdminUserId]);
  assert.equal(savedCodes.length, 10, "10 hashed recovery codes must be stored in DB");

  // Step 5: Subsequent login now requires second-factor verification
  const mfaLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: topAdminEmail, password: "InitialStrongPassword123!#" })
  });
  assert.equal(mfaLoginRes.status, 200);
  const mfaLoginData = await mfaLoginRes.json();
  assert.equal(mfaLoginData.mfaRequired, true);
  assert.ok(mfaLoginData.mfaTicket);

  // Step 6: Verify second-factor with fresh TOTP code
  const freshCode = generateTotpToken(setupData.secret);
  const verifyRes = await fetch(`${baseUrl}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfaTicket: mfaLoginData.mfaTicket, code: freshCode })
  });
  assert.equal(verifyRes.status, 200);
  const sessionData = await verifyRes.json();
  assert.ok(sessionData.token, "Must return active access token");
  assert.ok(sessionData.sessionId, "Must return active session ID");

  // Step 7: Now access protected admin screen -> MUST SUCCEED (HTTP 200)
  const allowedRes = await fetch(`${baseUrl}/api/admin/dashboard-stats`, {
    headers: { Authorization: `Bearer ${sessionData.token}` }
  });
  assert.equal(allowedRes.status, 200, "After MFA verification, admin dashboard access must succeed");
});

// =========================================================================
// TEST 2: 11 wrong passwords -> account locked; alert email received (Requirement A.4 & 17)
// =========================================================================
test("Acceptance 2: 11 wrong passwords locks the account for 30 minutes and triggers security alert", async () => {
  // Send 10 wrong passwords
  for (let i = 1; i <= 10; i++) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lockoutTestEmail, password: `WrongPassword_${i}` })
    });
    assert.ok(res.status === 401 || res.status === 423 || res.status === 429);
  }

  // 11th attempt: MUST return account locked (HTTP 423)
  const eleventhRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: lockoutTestEmail, password: "WrongPassword_11" })
  });
  assert.equal(eleventhRes.status, 423, "11th failed login attempt must lock account with HTTP 423");
  const lockData = await eleventhRes.json();
  assert.equal(lockData.locked, true);

  // Verify in DB that locked_until is set to a future timestamp
  const [lockedRow] = await query("SELECT locked_until, failed_login_attempts FROM users WHERE id = ?", [lockoutUserId]);
  assert.ok(lockedRow.failed_login_attempts >= 10, "Failed attempts count recorded");
  assert.ok(new Date(lockedRow.locked_until) > new Date(), "locked_until timestamp is in the future");

  // Verify security alert was recorded
  const alerts = await query(
    "SELECT id, alert_type, severity FROM security_alerts WHERE user_id = ? AND alert_type = 'account_locked_failed_logins'",
    [lockoutUserId]
  );
  assert.ok(alerts.length >= 1, "Account lockout security alert must be dispatched and logged");
});

// =========================================================================
// TEST 3: Old refresh token reuse -> all sessions revoked (Requirement B.6)
// =========================================================================
test("Acceptance 3: Refresh token rotation and theft mitigation - token reuse revokes ALL sessions", async () => {
  // Step 1: Log in with top admin and verify MFA to obtain initial refresh token (R1)
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: topAdminEmail, password: "InitialStrongPassword123!#" })
  });
  const { mfaTicket } = await loginRes.json();
  const [u] = await query("SELECT mfa_secret FROM users WHERE id = ?", [topAdminUserId]);
  const code = generateTotpToken(u.mfa_secret);

  const verifyRes = await fetch(`${baseUrl}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfaTicket, code })
  });
  const session1 = await verifyRes.json();
  const tokenR1 = session1.refreshToken;
  const sessionId = session1.sessionId;

  // Step 2: Legitimately rotate session using R1 -> Receives Token R2
  const rotateRes = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, refreshToken: tokenR1 })
  });
  assert.equal(rotateRes.status, 200);
  const session2 = await rotateRes.json();
  const tokenR2 = session2.refreshToken;
  assert.notEqual(tokenR1, tokenR2, "Rotated refresh token must be different from previous token");

  // Step 3: ATTACK SIMULATION - An attacker attempts to reuse the previous token R1!
  const reuseRes = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, refreshToken: tokenR1 })
  });
  assert.equal(reuseRes.status, 401, "Reusing an old refresh token must be rejected with 401");

  // Step 4: Verify that ALL sessions for that user were revoked as theft defense
  const activeSessions = await query(
    "SELECT id FROM user_sessions WHERE user_id = ? AND is_revoked = 0 AND expires_at > NOW()",
    [topAdminUserId]
  );
  assert.equal(activeSessions.length, 0, "All sessions must be revoked upon refresh token reuse");

  // Step 5: Even the newer token R2 must now be rejected
  const r2Res = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, refreshToken: tokenR2 })
  });
  assert.equal(r2Res.status, 401, "Subsequent refresh with R2 must fail because session was revoked");

  // Step 6: Verify critical security alert was recorded
  const theftAlerts = await query(
    "SELECT id FROM security_alerts WHERE user_id = ? AND alert_type = 'refresh_token_theft_detected'",
    [topAdminUserId]
  );
  assert.ok(theftAlerts.length >= 1, "Theft detection alert must be triggered");
});

// =========================================================================
// TEST 4: 'Log out all sessions' kills a second logged-in browser instantly (Requirement B.8)
// =========================================================================
test("Acceptance 4: 'Log out all sessions' terminates other logged-in sessions immediately", async () => {
  const [u] = await query("SELECT mfa_secret FROM users WHERE id = ?", [topAdminUserId]);

  // Login Session A
  const loginA = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: topAdminEmail, password: "InitialStrongPassword123!#" })
  });
  const { mfaTicket: ticketA } = await loginA.json();
  const verifyA = await fetch(`${baseUrl}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfaTicket: ticketA, code: generateTotpToken(u.mfa_secret) })
  });
  const sessionA = await verifyA.json();

  // Login Session B
  const loginB = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: topAdminEmail, password: "InitialStrongPassword123!#" })
  });
  const { mfaTicket: ticketB } = await loginB.json();
  const verifyB = await fetch(`${baseUrl}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfaTicket: ticketB, code: generateTotpToken(u.mfa_secret) })
  });
  const sessionB = await verifyB.json();

  // Verify both sessions work
  const checkA1 = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${sessionA.token}` } });
  assert.equal(checkA1.status, 200);
  const checkB1 = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${sessionB.token}` } });
  assert.equal(checkB1.status, 200);

  // Session B clicks "Log out all sessions"
  const revokeAllRes = await fetch(`${baseUrl}/api/auth/security/sessions/revoke-all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionB.token}` }
  });
  assert.equal(revokeAllRes.status, 200);

  // Session A attempts to make another request -> MUST BE KILLED INSTANTLY (HTTP 401)
  const checkA2 = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${sessionA.token}` } });
  assert.equal(checkA2.status, 401, "Session A must be revoked immediately (HTTP 401)");
});

// =========================================================================
// TEST 5: Break-glass login works, alerts fire, and it can fully recover the main account (Part 1D & Part 3)
// =========================================================================
test("Acceptance 5: Break-glass login triggers alerts and fully recovers compromised main account", async () => {
  // Step 1: Login with Break-Glass credentials
  const bgLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: breakGlassEmail, password: "InitialStrongPassword123!#" })
  });
  assert.equal(bgLoginRes.status, 200);
  const { mfaTicket } = await bgLoginRes.json();

  const [bgUser] = await query("SELECT mfa_secret FROM users WHERE id = ?", [breakGlassUserId]);
  const bgVerifyRes = await fetch(`${baseUrl}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfaTicket, code: generateTotpToken(bgUser.mfa_secret) })
  });
  assert.equal(bgVerifyRes.status, 200);
  const bgSession = await bgVerifyRes.json();
  const bgToken = bgSession.token;

  // Verify critical break_glass_login alert was fired
  const bgAlerts = await query(
    "SELECT id FROM security_alerts WHERE user_id = ? AND alert_type = 'break_glass_login'",
    [breakGlassUserId]
  );
  assert.ok(bgAlerts.length >= 1, "Break-glass login must trigger critical security alert");

  // Step 2: Break-Glass Admin contains the compromised main admin account
  const containRes = await fetch(`${baseUrl}/api/admin/emergency/contain-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bgToken}`
    },
    body: JSON.stringify({ targetUserId: topAdminUserId, reason: "Unauthorized access suspected" })
  });
  assert.equal(containRes.status, 200);

  // Verify compromised account is deactivated in DB
  const [containedUser] = await query("SELECT is_active, locked_until FROM users WHERE id = ?", [topAdminUserId]);
  assert.equal(containedUser.is_active, 0, "Compromised account must be deactivated");
  assert.ok(new Date(containedUser.locked_until) > new Date(), "Compromised account must be locked");

  // Step 3: Break-Glass Admin recovers the main account with a new password and resets MFA
  const recoverRes = await fetch(`${baseUrl}/api/admin/emergency/recover-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bgToken}`
    },
    body: JSON.stringify({
      targetUserId: topAdminUserId,
      newPassword: "BrandNewCleanPassword2026!#",
      correctEmail: topAdminEmail
    })
  });
  assert.equal(recoverRes.status, 200);

  // Verify DB state: re-enabled, old MFA wiped, must_change_password = 1
  const [recoveredUser] = await query(
    "SELECT is_active, mfa_enabled, mfa_secret, must_change_password, locked_until FROM users WHERE id = ?",
    [topAdminUserId]
  );
  assert.equal(recoveredUser.is_active, 1, "Recovered account must be reactivated");
  assert.equal(recoveredUser.mfa_enabled, 0, "Compromised MFA secret must be wiped");
  assert.equal(recoveredUser.mfa_secret, null);
  assert.equal(recoveredUser.must_change_password, 1, "Must force password change on next login");
  assert.equal(recoveredUser.locked_until, null, "Lockout must be cleared");

  // Verify immutable audit log entry was created
  const recoveryLogs = await query(
    "SELECT id, action_type FROM audit_logs WHERE user_id = ? AND action_type = 'break_glass_recover_account'",
    [breakGlassUserId]
  );
  assert.ok(recoveryLogs.length >= 1, "Break-glass recovery action must be immutably recorded in audit_logs");
});

// =========================================================================
// TEST 6: recover-admin.js works on the server with web app login page completely bypassed (Part 3.6)
// =========================================================================
test("Acceptance 6: Direct server-level CLI recovery tool resets admin and writes audit trail", async () => {
  // Step 1: Corrupt or lock the test user
  await query("UPDATE users SET is_active = 0, locked_until = DATE_ADD(NOW(), INTERVAL 7 DAY), failed_login_attempts = 15 WHERE id = ?", [topAdminUserId]);

  // Step 2: Execute server-level recovery tool
  const recoveryResult = await runServerAdminRecovery(topAdminEmail, "ServerRecoveryKey2026!#");
  assert.equal(recoveryResult.success, true);
  assert.equal(recoveryResult.email, topAdminEmail);

  // Step 3: Verify DB state directly
  const [recoveredDbUser] = await query(
    "SELECT is_active, locked_until, failed_login_attempts, mfa_enabled, password_hash FROM users WHERE id = ?",
    [topAdminUserId]
  );
  assert.equal(recoveredDbUser.is_active, 1, "User must be active");
  assert.equal(recoveredDbUser.locked_until, null, "Lockout cleared");
  assert.equal(recoveredDbUser.failed_login_attempts, 0);
  assert.equal(recoveredDbUser.mfa_enabled, 0, "Old MFA wiped");
  assert.ok(recoveredDbUser.password_hash.startsWith("$2a$12$") || recoveredDbUser.password_hash.startsWith("$2b$12$"), "Password hash cost 12 enforced");

  // Step 4: Verify audit log entry
  const cliLogs = await query(
    "SELECT id, action_type FROM audit_logs WHERE user_id = ? AND action_type = 'cli_server_recovery'",
    [topAdminUserId]
  );
  assert.ok(cliLogs.length >= 1, "CLI server recovery must write immutable audit log");

  // Step 5: Web login with new server password now works!
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: topAdminEmail, password: "ServerRecoveryKey2026!#" })
  });
  assert.equal(loginRes.status, 200, "Login with CLI recovery password must succeed");
});
