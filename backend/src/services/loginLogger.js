import { query } from "../db/pool.js";
import { parseClientSystem } from "../utils/deviceParser.js";

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "127.0.0.1"
  );
}

/**
 * Persists a comprehensive user login activity log (both successful and failed).
 */
export async function recordLoginEvent({
  req,
  email,
  user = null,
  status = "success",
  failureReason = null,
  usedRecovery = false
}) {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "Unknown Client";
    const clientInfo = parseClientSystem(userAgent);

    const userId = user?.id || null;
    const finalEmail = String(user?.email || email || "").toLowerCase().trim();
    const fullName = user?.full_name || null;
    const roleName = user?.role_name || null;
    const businessId = user?.business_id || null;
    const businessName = user?.business_name || null;
    const branchId = user?.branch_id || null;
    const branchName = user?.branch_name || null;

    let finalReason = failureReason;
    if (usedRecovery) {
      finalReason = (finalReason ? `${finalReason} (Used Recovery Code)` : "Authenticated via 1-time Recovery Code");
    }

    // 1. Insert into dedicated user_login_logs table
    await query(
      `INSERT INTO user_login_logs (
        user_id, email, full_name, role_name,
        business_id, business_name, branch_id, branch_name,
        ip_address, system_summary, os, browser, device_type, user_agent,
        status, failure_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        finalEmail,
        fullName,
        roleName,
        businessId,
        businessName,
        branchId,
        branchName,
        ipAddress,
        clientInfo.systemSummary,
        clientInfo.os,
        clientInfo.browser,
        clientInfo.deviceType,
        userAgent,
        status,
        finalReason
      ]
    );

    // 2. Also append to immutable audit_logs table
    const auditDetails = JSON.stringify({
      email: finalEmail,
      status,
      systemSummary: clientInfo.systemSummary,
      os: clientInfo.os,
      browser: clientInfo.browser,
      deviceType: clientInfo.deviceType,
      failureReason: finalReason,
      businessName,
      branchName
    });

    await query(
      `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, 'user', ?, ?, ?, ?)`,
      [
        userId,
        status === "success" ? "user_login" : "user_login_failed",
        userId,
        auditDetails,
        ipAddress,
        userAgent.slice(0, 255)
      ]
    );
  } catch (err) {
    // Non-blocking error logging to ensure primary auth flow never fails due to logging
    console.error("Failed to record login activity log:", err);
  }
}

/**
 * Queries login history for SaaS Top Admin Panel with filters, search, and pagination.
 */
export async function getLoginLogs({
  page = 1,
  limit = 25,
  search = "",
  status = "all",
  businessId = "",
  role = "",
  startDate = "",
  endDate = ""
} = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (p - 1) * l;

  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      "(LOWER(ull.email) LIKE ? OR LOWER(COALESCE(ull.full_name, '')) LIKE ? OR ull.ip_address LIKE ? OR LOWER(ull.system_summary) LIKE ? OR LOWER(COALESCE(ull.business_name, '')) LIKE ? OR LOWER(COALESCE(ull.branch_name, '')) LIKE ?)"
    );
    params.push(term, term, term, term, term, term);
  }

  if (status && status !== "all") {
    conditions.push("ull.status = ?");
    params.push(status);
  }

  if (businessId && businessId !== "all") {
    conditions.push("ull.business_id = ?");
    params.push(Number(businessId));
  }

  if (role && role !== "all") {
    conditions.push("ull.role_name = ?");
    params.push(role);
  }

  if (startDate) {
    conditions.push("ull.created_at >= ?");
    params.push(`${startDate} 00:00:00`);
  }

  if (endDate) {
    conditions.push("ull.created_at <= ?");
    params.push(`${endDate} 23:59:59`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // Get total count
  const [countRow] = await query(
    `SELECT COUNT(*) AS total FROM user_login_logs ull ${whereClause}`,
    params
  );
  const total = Number(countRow?.total || 0);

  // Get rows
  const rows = await query(
    `SELECT ull.*
     FROM user_login_logs ull
     ${whereClause}
     ORDER BY ull.id DESC
     LIMIT ${l} OFFSET ${offset}`,
    params
  );

  return {
    logs: rows,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l) || 1
  };
}

/**
 * Retrieves aggregate statistics for the Top Admin Login Security Dashboard.
 */
export async function getLoginLogsSummary() {
  const [todayCounts] = await query(`
    SELECT
      COUNT(*) AS total_today,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_today,
      SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS failed_today,
      COUNT(DISTINCT email) AS unique_users_today,
      COUNT(DISTINCT ip_address) AS unique_ips_today
    FROM user_login_logs
    WHERE created_at >= CURDATE()
  `);

  const topSystems = await query(`
    SELECT system_summary, COUNT(*) AS count
    FROM user_login_logs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY system_summary
    ORDER BY count DESC
    LIMIT 5
  `);

  const topOs = await query(`
    SELECT os, COUNT(*) AS count
    FROM user_login_logs
    WHERE os IS NOT NULL AND os != 'Unknown OS'
    GROUP BY os
    ORDER BY count DESC
    LIMIT 5
  `);

  const topBrowsers = await query(`
    SELECT browser, COUNT(*) AS count
    FROM user_login_logs
    WHERE browser IS NOT NULL AND browser != 'Unknown Browser'
    GROUP BY browser
    ORDER BY count DESC
    LIMIT 5
  `);

  return {
    totalToday: Number(todayCounts?.total_today || 0),
    successToday: Number(todayCounts?.success_today || 0),
    failedToday: Number(todayCounts?.failed_today || 0),
    uniqueUsersToday: Number(todayCounts?.unique_users_today || 0),
    uniqueIpsToday: Number(todayCounts?.unique_ips_today || 0),
    topSystems,
    topOs,
    topBrowsers
  };
}
