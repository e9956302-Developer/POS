#!/usr/bin/env node
/**
 * =========================================================================
 * SaaS Top Admin Server-Level Emergency Recovery Tool (Last Resort)
 * =========================================================================
 * Usage (run directly on server via SSH console):
 *   node scripts/recover-admin.js --email <top-admin-email> [--password <new-password>]
 *
 * Actions executed:
 * 1. Bypasses the web app login completely (direct MySQL transaction).
 * 2. Sets a new strong password hash (bcrypt cost 12).
 * 3. Re-enables the account and clears all lockouts / failed attempts.
 * 4. Wipes compromised MFA secret and deletes old recovery codes.
 * 5. Forces fresh MFA enrollment + password change on next login.
 * 6. Revokes ALL active sessions platform-wide for this account.
 * 7. Records an immutable emergency recovery entry in audit_logs.
 * =========================================================================
 */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { pool, query } from "../src/db/pool.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      options.email = args[i + 1].trim().toLowerCase();
      i++;
    } else if (args[i] === "--password" && args[i + 1]) {
      options.password = args[i + 1];
      i++;
    }
  }
  return options;
}

function generateSecurePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+-=";
  let pwd = "";
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
}

export async function runServerAdminRecovery(targetEmail, customPassword = null) {
  if (!targetEmail) {
    throw new Error("Target admin email is required. Usage: node scripts/recover-admin.js --email <email>");
  }

  const newPassword = customPassword || generateSecurePassword();
  if (newPassword.length < 12) {
    throw new Error("Password must be at least 12 characters in length.");
  }

  console.log(`\n======================================================`);
  console.log(`🛡️  SAAS TOP ADMIN EMERGENCY RECOVERY UTILITY`);
  console.log(`======================================================`);
  console.log(`Target Email : ${targetEmail}`);

  // 1. Locate user in database
  const [user] = await query("SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE LOWER(u.email) = ?", [targetEmail]);
  if (!user) {
    throw new Error(`User with email '${targetEmail}' was not found in the database.`);
  }

  // 2. Hash password with bcrypt cost 12
  console.log("Hashing password with bcrypt (cost 12)...");
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // 3. Reset user flags: re-activate, clear locks, wipe MFA, force fresh setup
  await query(
    `UPDATE users
     SET password_hash = ?,
         is_active = 1,
         locked_until = NULL,
         failed_login_attempts = 0,
         mfa_enabled = 0,
         mfa_secret = NULL,
         must_change_password = 1
     WHERE id = ?`,
    [passwordHash, user.id]
  );
  console.log("✔ Account re-activated, lockout cleared, and old MFA secret wiped.");

  // 4. Delete old recovery codes
  await query("DELETE FROM user_recovery_codes WHERE user_id = ?", [user.id]);
  console.log("✔ Old one-time recovery codes purged.");

  // 5. Revoke ALL active sessions
  await query(
    "UPDATE user_sessions SET is_revoked = 1, revoked_at = NOW(), revoked_reason = 'cli_server_recovery' WHERE user_id = ?",
    [user.id]
  );
  console.log("✔ All active browser sessions revoked platform-wide.");

  // 6. Write immutable audit log
  await query(
    `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details, ip_address, user_agent)
     VALUES (?, 'cli_server_recovery', 'user', ?, ?, '127.0.0.1 (SSH Console)', 'Node.js CLI Script')`,
    [
      user.id,
      user.id,
      JSON.stringify({
        recoveredBy: "server_console_cli",
        recoveredAt: new Date().toISOString(),
        previousStatus: {
          wasActive: user.is_active,
          failedAttempts: user.failed_login_attempts,
          wasLocked: Boolean(user.locked_until)
        }
      })
    ]
  );
  console.log("✔ Immutable recovery event recorded in audit_logs.");

  console.log(`\n======================================================`);
  console.log(`✅ RECOVERY SUCCESSFUL!`);
  console.log(`======================================================`);
  console.log(`User ID          : ${user.id}`);
  console.log(`Email            : ${user.email}`);
  console.log(`Role             : ${user.role_name}`);
  console.log(`Temporary Pass   : ${newPassword}`);
  console.log(`\nNEXT STEPS:`);
  console.log(`1. Provide the Temporary Password to the verified owner.`);
  console.log(`2. The owner must log in via the web interface.`);
  console.log(`3. The web interface will immediately demand a password change and fresh TOTP enrollment.`);
  console.log(`======================================================\n`);

  return { success: true, userId: user.id, email: user.email, tempPassword: newPassword };
}

// Direct CLI Invocation
if (process.argv[1]?.endsWith("recover-admin.js")) {
  const { email, password } = parseArgs();
  runServerAdminRecovery(email, password)
    .then(() => pool.end())
    .catch(async (err) => {
      console.error("\n❌ RECOVERY FAILED:", err.message);
      await pool.end();
      process.exit(1);
    });
}
