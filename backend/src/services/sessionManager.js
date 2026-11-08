import crypto from "node:crypto";
import { query } from "../db/pool.js";
import { triggerSecurityAlert } from "./securityAlerts.js";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function parseDevice(userAgent = "") {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
    if (/iphone/.test(ua)) return "Apple iPhone";
    if (/ipad/.test(ua)) return "Apple iPad";
    if (/android/.test(ua)) return "Android Device";
    return "Mobile Device";
  }
  if (/windows/.test(ua)) return "Windows PC";
  if (/macintosh|mac os x/.test(ua)) return "Mac Desktop";
  if (/linux/.test(ua)) return "Linux Workstation";
  return "Desktop / Web Client";
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a brand new user session with rotation token.
 */
export async function createSession(userId, req) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const refreshTokenHash = hashToken(refreshToken);

  const ipAddress = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown Client";
  const deviceSummary = parseDevice(userAgent);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await query(
    `INSERT INTO user_sessions (user_id, session_id, refresh_token_hash, ip_address, user_agent, device_summary, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, sessionId, refreshTokenHash, ipAddress, userAgent, deviceSummary, expiresAt]
  );

  return { sessionId, refreshToken, expiresAt, deviceSummary, ipAddress };
}

/**
 * Validates session and rotates refresh token.
 * IF an old/revoked refresh token is re-used, it is treated as THEFT and all sessions for the user are nuked.
 */
export async function rotateSession(sessionId, incomingRefreshToken, req) {
  if (!sessionId || !incomingRefreshToken) {
    const error = new Error("Invalid session or refresh token");
    error.status = 401;
    throw error;
  }

  const [session] = await query("SELECT * FROM user_sessions WHERE session_id = ?", [sessionId]);

  // If session doesn't exist or was already revoked:
  if (!session || session.is_revoked === 1) {
    const userId = session?.user_id;
    if (userId) {
      // Re-use of a revoked session detected -> Potential Theft!
      await revokeAllSessions(userId, "token_theft_detected");
      const [user] = await query("SELECT email FROM users WHERE id = ?", [userId]);
      if (user?.email) {
        await triggerSecurityAlert({
          alertType: "refresh_token_theft_detected",
          severity: "critical",
          userId,
          recipientEmail: user.email,
          subject: "[CRITICAL SECURITY ALERT] Refresh Token Replay / Theft Detected",
          message: `An invalid or previously rotated session token was presented from IP ${req.ip || "unknown"}. As a defense-in-depth precaution, all active sessions for your account have been revoked immediately. If this was not you, change your password immediately.`
        });
      }
    }

    const error = new Error("Invalid or revoked session. All active sessions have been terminated for security.");
    error.status = 401;
    throw error;
  }

  // Verify hash match
  const incomingHash = hashToken(incomingRefreshToken);
  if (incomingHash !== session.refresh_token_hash) {
    // Refresh token mismatch -> Theft attempt!
    await revokeAllSessions(session.user_id, "token_mismatch_detected");
    const error = new Error("Session compromise detected. All sessions revoked.");
    error.status = 401;
    throw error;
  }

  // Check expiration
  if (new Date(session.expires_at) <= new Date()) {
    await query("UPDATE user_sessions SET is_revoked = 1, revoked_at = NOW(), revoked_reason = 'expired' WHERE id = ?", [session.id]);
    const error = new Error("Session has expired. Please log in again.");
    error.status = 401;
    throw error;
  }

  // Rotate to new token
  const newRefreshToken = crypto.randomBytes(48).toString("hex");
  const newHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await query(
    `UPDATE user_sessions
     SET refresh_token_hash = ?,
         expires_at = ?,
         last_active_at = NOW()
     WHERE id = ?`,
    [newHash, newExpiresAt, session.id]
  );

  return {
    userId: session.user_id,
    sessionId: session.session_id,
    refreshToken: newRefreshToken,
    expiresAt: newExpiresAt
  };
}

/**
 * Revoke specific session by session_id
 */
export async function revokeSession(sessionId, userId, reason = "user_revoked") {
  await query(
    `UPDATE user_sessions
     SET is_revoked = 1, revoked_at = NOW(), revoked_reason = ?
     WHERE session_id = ? AND user_id = ?`,
    [reason, sessionId, userId]
  );
  return { success: true };
}

/**
 * Revoke all active sessions for a user
 */
export async function revokeAllSessions(userId, reason = "revoke_all_sessions") {
  await query(
    `UPDATE user_sessions
     SET is_revoked = 1, revoked_at = NOW(), revoked_reason = ?
     WHERE user_id = ? AND is_revoked = 0`,
    [reason, userId]
  );
  return { success: true };
}

/**
 * Check if a session is currently active and unrevoked
 */
export async function isSessionActive(sessionId) {
  if (!sessionId) return false;
  const [session] = await query(
    "SELECT id FROM user_sessions WHERE session_id = ? AND is_revoked = 0 AND expires_at > NOW()",
    [sessionId]
  );
  return Boolean(session);
}

/**
 * List active sessions for user settings/security screen
 */
export async function listActiveSessions(userId, currentSessionId = null) {
  const rows = await query(
    `SELECT id, session_id, ip_address, device_summary, user_agent, is_revoked, created_at, last_active_at, expires_at
     FROM user_sessions
     WHERE user_id = ? AND is_revoked = 0 AND expires_at > NOW()
     ORDER BY last_active_at DESC`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    ipAddress: r.ip_address,
    device: r.device_summary || "Unknown Device",
    userAgent: r.user_agent,
    createdAt: r.created_at,
    lastActiveAt: r.last_active_at,
    isCurrent: r.session_id === currentSessionId
  }));
}
