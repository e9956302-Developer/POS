import crypto from "node:crypto";
import { query } from "../db/pool.js";
import { env } from "../config/env.js";

/**
 * Creates and logs a security alert. Also sends email notification (or console/log stub in dev/test).
 */
export async function triggerSecurityAlert({
  alertType,
  severity = "medium",
  userId = null,
  recipientEmail,
  subject,
  message,
  metadata = {}
}) {
  const metadataJson = JSON.stringify(metadata);

  try {
    await query(
      `INSERT INTO security_alerts (alert_type, severity, user_id, recipient_email, subject, message, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [alertType, severity, userId, recipientEmail, subject, message, metadataJson]
    );
  } catch (err) {
    console.warn("Failed to persist security_alert:", err.message);
  }

  // Simulated Email Dispatcher (in production this connects to SMTP / SendGrid / SES)
  console.log(`\n======================================================`);
  console.log(`🚨 [SECURITY EMAIL DISPATCHED] -> To: ${recipientEmail}`);
  console.log(`📌 Subject: ${subject}`);
  console.log(`⚠️ Severity: ${severity.toUpperCase()}`);
  console.log(`📝 Message:\n${message}`);
  console.log(`======================================================\n`);

  return { success: true, alertType, recipientEmail };
}

/**
 * Generate a secure emergency account-locking token (valid for 2 hours)
 */
export async function createEmergencyLockToken(userId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  );

  return rawToken;
}

/**
 * Process emergency lock link: immediately revokes all sessions and disables the account.
 */
export async function processEmergencyLock(rawToken) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const rows = await query(
    `SELECT pr.*, u.email, u.full_name
     FROM password_resets pr
     JOIN users u ON u.id = pr.user_id
     WHERE pr.token_hash = ? AND pr.used_at IS NULL AND pr.expires_at > NOW()`,
    [tokenHash]
  );

  if (!rows.length) {
    const error = new Error("Emergency lock link is invalid or has expired");
    error.status = 400;
    throw error;
  }

  const { user_id, email } = rows[0];

  // 1. Mark token used
  await query("UPDATE password_resets SET used_at = NOW() WHERE token_hash = ?", [tokenHash]);

  // 2. Lock account (deactivate)
  await query("UPDATE users SET is_active = 0, locked_until = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE id = ?", [user_id]);

  // 3. Revoke all active sessions
  await query(
    "UPDATE user_sessions SET is_revoked = 1, revoked_at = NOW(), revoked_reason = 'emergency_lock_clicked' WHERE user_id = ?",
    [user_id]
  );

  // 4. Log alert
  await triggerSecurityAlert({
    alertType: "emergency_account_locked",
    severity: "critical",
    userId: user_id,
    recipientEmail: email,
    subject: "[CRITICAL] Account Locked via Emergency Link",
    message: `Account ${email} was immediately locked and all sessions revoked per emergency lock request. Contact Break-Glass Administrator for incident recovery.`
  });

  return { success: true, email };
}
