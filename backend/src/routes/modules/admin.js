import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "../../db/pool.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest, isValidEmail } from "../../utils/http.js";
import { createAuditLog } from "../../services/audit.js";
import { getLoginLogs, getLoginLogsSummary } from "../../services/loginLogger.js";
import { DEFAULT_ROLE_PERMISSIONS, isPackagePageAllowed, resolveUserPermissions, fetchUserSubscription, isBusinessAdmin } from "../../middleware/auth.js";

export const adminRouter = Router();

function requireRole(...roles) {
  return (req, _res, next) => {
    if (roles.includes(req.user.role_name)) {
      next();
      return;
    }

    const error = new Error("Admin permission required");
    error.status = 403;
    next(error);
  };
}

export async function generateUniqueCompanyCode(name) {
  const clean = (name || "").trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  let baseCode = "";
  if (words.length === 0) {
    baseCode = "BIZ";
  } else if (words.length === 1) {
    baseCode = words[0].slice(0, 5).toUpperCase();
  } else if (words.length === 2) {
    baseCode = `${words[0].slice(0, 3)}${words[1].slice(0, 2)}`.toUpperCase();
  } else {
    baseCode = words.map((w) => w[0]).join("").toUpperCase();
    if (baseCode.length < 3) {
      baseCode = (baseCode + words[0].slice(1)).slice(0, 5).toUpperCase();
    }
  }
  if (baseCode.length < 2) baseCode = "BIZ";

  let candidate = baseCode.slice(0, 8);
  let counter = 1;
  while (true) {
    const [existing] = await query("SELECT id FROM businesses WHERE code = ?", [candidate]);
    if (!existing) return candidate;
    candidate = `${baseCode.slice(0, 6)}${counter}`;
    counter++;
  }
}

export async function generateUniqueBranchCode(businessId, companyCode, customBranchCode = null) {
  const compCode = (companyCode || "BR").trim().toUpperCase();
  let base = "";
  if (customBranchCode && customBranchCode.trim()) {
    const trimmed = customBranchCode.trim().toUpperCase();
    if (trimmed.startsWith(`${compCode}-`)) {
      base = trimmed;
    } else {
      base = `${compCode}-${trimmed}`;
    }
  } else {
    const existing = await query("SELECT code FROM branches WHERE business_id = ?", [businessId]);
    const num = String(existing.length + 1).padStart(2, "0");
    base = `${compCode}-${num}`;
  }

  let candidate = base;
  let counter = 1;
  while (true) {
    const [existing] = await query("SELECT id FROM branches WHERE code = ?", [candidate]);
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter++;
  }
}

// ==========================================
// 1. TOP ADMIN PLATFORM DASHBOARD
// ==========================================
adminRouter.get(
  "/dashboard-stats",
  requireRole("top_admin"),
  asyncHandler(async (_req, res) => {
    // 1. Businesses counts
    const [bizStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
      FROM businesses
    `);

    // 2. Branches counts
    const [branchStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
      FROM branches
    `);

    // 3. Company Administrators counts (business_super_admin)
    const [adminStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN u.is_active = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN u.is_active = 0 THEN 1 ELSE 0 END) AS inactive
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.name = 'business_super_admin'
    `);

    // 4. Packages counts
    const [packageStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active
      FROM subscription_plans
    `);

    // 5. Subscription Statuses
    // Effective calculation based on current date
    const [subStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE
          WHEN bs.status = 'active' AND (bs.current_period_ends_on IS NULL OR bs.current_period_ends_on >= CURDATE()) THEN 1
          ELSE 0
        END) AS active,
        SUM(CASE
          WHEN bs.status = 'trialing' AND (bs.trial_ends_on IS NULL OR bs.trial_ends_on >= CURDATE()) THEN 1
          ELSE 0
        END) AS trialing,
        SUM(CASE WHEN bs.status = 'grace' THEN 1 ELSE 0 END) AS grace,
        SUM(CASE WHEN bs.status = 'suspended' THEN 1 ELSE 0 END) AS suspended,
        SUM(CASE
          WHEN bs.status = 'expired'
            OR (bs.status = 'active' AND bs.current_period_ends_on < CURDATE())
            OR (bs.status = 'trialing' AND bs.trial_ends_on < CURDATE())
          THEN 1 ELSE 0
        END) AS expired,
        SUM(CASE
          WHEN (bs.status = 'active' AND bs.current_period_ends_on BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY))
            OR (bs.status = 'trialing' AND bs.trial_ends_on BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY))
          THEN 1 ELSE 0
        END) AS expiring_soon,
        SUM(CASE
          WHEN (bs.status = 'active' AND bs.current_period_ends_on < CURDATE())
            OR (bs.status = 'trialing' AND bs.trial_ends_on < CURDATE())
            OR bs.status IN ('grace', 'expired')
          THEN 1 ELSE 0
        END) AS overdue
      FROM branch_subscriptions bs
    `);

    // 6. Payments counts & revenue
    const [paymentStats] = await query(`
      SELECT
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS pending_count,
        COALESCE(SUM(CASE WHEN status = 'submitted' THEN amount ELSE 0 END), 0) AS pending_amount,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified_count,
        COALESCE(SUM(CASE WHEN status = 'verified' THEN amount ELSE 0 END), 0) AS verified_revenue,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
        COALESCE(SUM(amount), 0) AS total_submitted_volume
      FROM subscription_payments
    `);

    // 7. Recent pending payments awaiting verification
    const recentPendingPayments = await query(`
      SELECT
        sp.id, sp.amount, sp.payment_method, sp.evidence_reference, sp.status,
        sp.submitted_at, sp.payment_date, sp.notes,
        b.name AS branch_name, biz.name AS business_name, plan.name AS plan_name,
        bs.current_period_ends_on, bs.status AS subscription_status
      FROM subscription_payments sp
      JOIN businesses biz ON biz.id = sp.business_id
      JOIN branches b ON b.id = sp.branch_id
      JOIN subscription_plans plan ON plan.id = sp.plan_id
      LEFT JOIN branch_subscriptions bs ON bs.branch_id = sp.branch_id
      WHERE sp.status = 'submitted'
      ORDER BY sp.submitted_at DESC
      LIMIT 6
    `);

    // 8. Upcoming renewals and overdue branches
    const upcomingRenewals = await query(`
      SELECT
        b.id AS branch_id, b.name AS branch_name,
        biz.id AS business_id, biz.name AS business_name,
        plan.name AS plan_name,
        bs.status AS subscription_status,
        bs.current_period_ends_on,
        bs.trial_ends_on,
        DATEDIFF(COALESCE(bs.current_period_ends_on, bs.trial_ends_on), CURDATE()) AS days_left,
        CASE
          WHEN COALESCE(bs.current_period_ends_on, bs.trial_ends_on) < CURDATE() THEN 1
          ELSE 0
        END AS is_overdue
      FROM branch_subscriptions bs
      JOIN branches b ON b.id = bs.branch_id
      JOIN businesses biz ON biz.id = bs.business_id
      JOIN subscription_plans plan ON plan.id = bs.plan_id
      WHERE (COALESCE(bs.current_period_ends_on, bs.trial_ends_on) <= DATE_ADD(CURDATE(), INTERVAL 14 DAY))
         OR bs.status IN ('grace', 'expired', 'suspended')
      ORDER BY COALESCE(bs.current_period_ends_on, bs.trial_ends_on) ASC
      LIMIT 8
    `);

    // 9. Packages distribution (how many branches in each package)
    const packageDistribution = await query(`
      SELECT
        p.id, p.name, p.price, p.billing_period,
        COUNT(bs.id) AS branches_count
      FROM subscription_plans p
      LEFT JOIN branch_subscriptions bs ON bs.plan_id = p.id
      GROUP BY p.id, p.name, p.price, p.billing_period
      ORDER BY branches_count DESC, p.name ASC
    `);

    // 10. Monthly revenue breakdown (last 6 months)
    const revenueByMonth = await query(`
      SELECT
        DATE_FORMAT(COALESCE(payment_date, submitted_at), '%Y-%m') AS month,
        COUNT(*) AS payments_count,
        SUM(amount) AS total_revenue
      FROM subscription_payments
      WHERE status = 'verified'
      GROUP BY DATE_FORMAT(COALESCE(payment_date, submitted_at), '%Y-%m')
      ORDER BY month DESC
      LIMIT 6
    `);

    res.json({
      businesses: {
        total: Number(bizStats.total || 0),
        active: Number(bizStats.active || 0),
        inactive: Number(bizStats.inactive || 0)
      },
      branches: {
        total: Number(branchStats.total || 0),
        active: Number(branchStats.active || 0),
        inactive: Number(branchStats.inactive || 0)
      },
      companyAdmins: {
        total: Number(adminStats.total || 0),
        active: Number(adminStats.active || 0),
        inactive: Number(adminStats.inactive || 0)
      },
      packages: {
        total: Number(packageStats.total || 0),
        active: Number(packageStats.active || 0)
      },
      subscriptions: {
        total: Number(subStats.total || 0),
        active: Number(subStats.active || 0),
        trialing: Number(subStats.trialing || 0),
        grace: Number(subStats.grace || 0),
        suspended: Number(subStats.suspended || 0),
        expired: Number(subStats.expired || 0),
        expiringSoon: Number(subStats.expiring_soon || 0),
        overdue: Number(subStats.overdue || 0)
      },
      payments: {
        pendingCount: Number(paymentStats.pending_count || 0),
        pendingAmount: Number(paymentStats.pending_amount || 0),
        verifiedCount: Number(paymentStats.verified_count || 0),
        verifiedRevenue: Number(paymentStats.verified_revenue || 0),
        rejectedCount: Number(paymentStats.rejected_count || 0)
      },
      recentPendingPayments,
      upcomingRenewals,
      packageDistribution,
      revenueByMonth: revenueByMonth.reverse()
    });
  })
);

// ==========================================
// 2. BUSINESS MANAGEMENT
// ==========================================
adminRouter.get(
  "/businesses",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { page, pageSize, search = "", status = "all", sortBy = "name", sortOrder = "ASC" } = req.query;

    const whereClauses = [];
    const params = {};

    if (search.trim()) {
      whereClauses.push("(b.name LIKE :search OR b.code LIKE :search OR b.email LIKE :search)");
      params.search = `%${search.trim()}%`;
    }

    if (status === "active") {
      whereClauses.push("b.is_active = 1");
    } else if (status === "inactive") {
      whereClauses.push("b.is_active = 0");
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const allowedSort = ["name", "code", "created_at", "is_active", "branches_count"];
    const sortCol = allowedSort.includes(sortBy) ? sortBy : "name";
    const sortDir = sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const baseSql = `
      FROM businesses b
      LEFT JOIN branches br ON br.business_id = b.id
      LEFT JOIN users u ON u.business_id = b.id AND u.role_id = (SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1) AND u.is_active = 1
      ${whereSql}
      GROUP BY b.id
    `;

    // If client requested pagination
    if (page || pageSize || search || status !== "all") {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limit = Math.max(1, parseInt(pageSize, 10) || 10);
      const offset = (pageNum - 1) * limit;

      const [countResult] = await query(`SELECT COUNT(DISTINCT b.id) AS total FROM businesses b ${whereSql}`, params);
      const total = Number(countResult?.total || 0);

      const items = await query(
        `SELECT
          b.id, b.name, b.code, b.email, b.phone, b.address, b.is_active, b.created_at,
          COUNT(DISTINCT br.id) AS branches_count,
          SUM(CASE WHEN br.is_active = 1 THEN 1 ELSE 0 END) AS active_branches_count,
          (
            (SELECT COUNT(*) FROM sale_orders so JOIN branches br_sub ON br_sub.id = so.branch_id WHERE br_sub.business_id = b.id) +
            (SELECT COUNT(*) FROM purchase_orders po JOIN branches br_sub ON br_sub.id = po.branch_id WHERE br_sub.business_id = b.id) +
            (SELECT COUNT(*) FROM expenses exp JOIN branches br_sub ON br_sub.id = exp.branch_id WHERE br_sub.business_id = b.id) +
            (SELECT COUNT(*) FROM mobile_units mu WHERE mu.business_id = b.id) +
            (SELECT COUNT(*) FROM repair_tickets rt WHERE rt.business_id = b.id)
          ) AS data_count,
          MAX(u.id) AS admin_id,
          MAX(u.full_name) AS admin_name,
          MAX(u.email) AS admin_email,
          MAX(u.is_active) AS admin_is_active
         ${baseSql}
         ORDER BY ${sortCol === "branches_count" ? "branches_count" : `b.${sortCol}`} ${sortDir}
         LIMIT ${limit} OFFSET ${offset}`,
        params
      );

      return res.json({
        data: items,
        pagination: {
          total,
          page: pageNum,
          pageSize: limit,
          totalPages: Math.ceil(total / limit) || 1
        }
      });
    }

    // Default backward compatible list
    const items = await query(
      `SELECT
        b.id, b.name, b.code, b.email, b.phone, b.address, b.is_active, b.created_at,
        COUNT(DISTINCT br.id) AS branches_count,
        SUM(CASE WHEN br.is_active = 1 THEN 1 ELSE 0 END) AS active_branches_count,
        (
          (SELECT COUNT(*) FROM sale_orders so JOIN branches br_sub ON br_sub.id = so.branch_id WHERE br_sub.business_id = b.id) +
          (SELECT COUNT(*) FROM purchase_orders po JOIN branches br_sub ON br_sub.id = po.branch_id WHERE br_sub.business_id = b.id) +
          (SELECT COUNT(*) FROM expenses exp JOIN branches br_sub ON br_sub.id = exp.branch_id WHERE br_sub.business_id = b.id) +
          (SELECT COUNT(*) FROM mobile_units mu WHERE mu.business_id = b.id) +
          (SELECT COUNT(*) FROM repair_tickets rt WHERE rt.business_id = b.id)
        ) AS data_count,
        MAX(u.id) AS admin_id,
        MAX(u.full_name) AS admin_name,
        MAX(u.email) AS admin_email,
        MAX(u.is_active) AS admin_is_active
       ${baseSql}
       ORDER BY b.name ASC`
    );

    res.json(items);
  })
);

adminRouter.get(
  "/businesses/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const [business] = await query("SELECT * FROM businesses WHERE id = :id", { id: req.params.id });
    if (!business) {
      const error = new Error("Business not found");
      error.status = 404;
      throw error;
    }

    const branches = await query(
      `SELECT
        b.*,
        bs.id AS subscription_id,
        bs.status AS subscription_status,
        bs.current_period_ends_on,
        bs.trial_ends_on,
        bs.grace_ends_on,
        p.id AS plan_id,
        p.name AS plan_name,
        p.price AS plan_price,
        p.billing_period
       FROM branches b
       LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
       LEFT JOIN subscription_plans p ON p.id = bs.plan_id
       WHERE b.business_id = :id
       ORDER BY b.name ASC`,
      { id: req.params.id }
    );

    const admins = await query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at, u.branch_id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.business_id = :id AND r.name = 'business_super_admin'
       ORDER BY u.is_active DESC, u.id ASC`,
      { id: req.params.id }
    );

    const [staffCount] = await query(
      `SELECT COUNT(*) AS total FROM users WHERE business_id = :id`,
      { id: req.params.id }
    );

    const [paymentStats] = await query(
      `SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(CASE WHEN status = 'verified' THEN amount ELSE 0 END), 0) AS total_paid
       FROM subscription_payments
       WHERE business_id = :id`,
      { id: req.params.id }
    );

    res.json({
      ...business,
      branches,
      primaryAdmin: admins.find((a) => a.is_active === 1) || admins[0] || null,
      allAdmins: admins,
      staffCount: Number(staffCount?.total || 0),
      totalPaid: Number(paymentStats?.total_paid || 0),
      paymentCount: Number(paymentStats?.total_count || 0)
    });
  })
);

adminRouter.post(
  "/businesses",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const {
      name,
      code,
      email,
      phone,
      address,
      branchName,
      branchCode,
      adminName,
      adminEmail,
      adminPassword,
      planId = 1
    } = req.body;

    if (!name || !name.trim()) {
      throw badRequest("Company name is required");
    }

    let cleanCode = code ? code.trim().toUpperCase() : "";
    if (!cleanCode) {
      cleanCode = await generateUniqueCompanyCode(name);
    } else {
      const [existingCode] = await query("SELECT id FROM businesses WHERE code = ?", [cleanCode]);
      if (existingCode) {
        throw badRequest(`Company code '${cleanCode}' is already registered`);
      }
    }

    if (email && email.trim() && !isValidEmail(email.trim())) {
      throw badRequest("Please enter a valid company contact email address");
    }

    const rawReceiptFooter = req.body.receiptFooter !== undefined ? req.body.receiptFooter : req.body.receipt_footer;
    const cleanReceiptFooter = rawReceiptFooter ? rawReceiptFooter.trim() : null;

    // Provision full bundle if branch & admin info provided
    if (branchName && adminEmail && adminPassword) {
      const cleanAdminEmail = adminEmail.trim().toLowerCase();
      if (!isValidEmail(cleanAdminEmail)) {
        throw badRequest("Please enter a valid email address for the business administrator");
      }
      const [existingUser] = await query("SELECT id FROM users WHERE email = ?", [cleanAdminEmail]);
      if (existingUser) {
        throw badRequest(`User with email '${cleanAdminEmail}' already exists`);
      }

      const created = await withTransaction(async (connection) => {
        const [businessResult] = await connection.execute(
          `INSERT INTO businesses (name, code, email, phone, address, receipt_footer, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [name.trim(), cleanCode, email || null, phone || null, address || null, cleanReceiptFooter]
        );
        const businessId = businessResult.insertId;

        const firstBranchCode = await generateUniqueBranchCode(businessId, cleanCode, branchCode);
        const [branchResult] = await connection.execute(
          `INSERT INTO branches (business_id, name, code, address, is_active) VALUES (?, ?, ?, ?, 1)`,
          [businessId, branchName.trim(), firstBranchCode, address || null]
        );
        const branchId = branchResult.insertId;

        const [roles] = await connection.execute(`SELECT id FROM roles WHERE name = 'business_super_admin'`);
        if (!roles.length) {
          throw badRequest("business_super_admin role is missing");
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);
        const [userResult] = await connection.execute(
          `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [businessId, roles[0].id, branchId, adminName || "Company Admin", adminEmail.trim().toLowerCase(), passwordHash]
        );

        await connection.execute(
          `INSERT INTO branch_subscriptions
           (business_id, branch_id, plan_id, status, trial_ends_on, grace_ends_on)
           SELECT ?, ?, sp.id, 'trialing', DATE_ADD(CURDATE(), INTERVAL sp.trial_days DAY), DATE_ADD(CURDATE(), INTERVAL (sp.trial_days + sp.grace_days) DAY)
           FROM subscription_plans sp
           WHERE sp.id = ? AND sp.is_active = 1`,
          [businessId, branchId, planId]
        );

        await createAuditLog(connection, {
          userId: req.user.id,
          actionType: "create_business",
          entityType: "business",
          entityId: businessId,
          details: { name, code: cleanCode, branchId, adminId: userResult.insertId }
        });

        return {
          businessId,
          branchId,
          adminUserId: userResult.insertId
        };
      });

      return res.status(201).json(created);
    }

    // Standalone business creation
    const result = await query(
      `INSERT INTO businesses (name, code, email, phone, address, receipt_footer, is_active) VALUES (:name, :code, :email, :phone, :address, :receiptFooter, 1)`,
      {
        name: name.trim(),
        code: cleanCode,
        email: email || null,
        phone: phone || null,
        address: address || null,
        receiptFooter: cleanReceiptFooter
      }
    );

    const [newBiz] = await query("SELECT * FROM businesses WHERE id = ?", [result.insertId]);
    res.status(201).json(newBiz);
  })
);

adminRouter.put(
  "/businesses/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { name, code, email, phone, address, isActive } = req.body;
    const [biz] = await query("SELECT * FROM businesses WHERE id = :id", { id: req.params.id });
    if (!biz) {
      const error = new Error("Business not found");
      error.status = 404;
      throw error;
    }

    const updates = [];
    const params = { id: req.params.id };

    if (name !== undefined) {
      updates.push("name = :name");
      params.name = name.trim();
    }
    if (code !== undefined) {
      const cleanCode = code.trim().toUpperCase();
      const [currentBiz] = await query("SELECT code FROM businesses WHERE id = :id", { id: req.params.id });
      if (currentBiz?.code && currentBiz.code.trim()) {
        if (cleanCode !== currentBiz.code.trim().toUpperCase()) {
          throw badRequest("Company code cannot be modified once added");
        }
      } else {
        const [existing] = await query("SELECT id FROM businesses WHERE code = :code AND id != :id", {
          code: cleanCode,
          id: req.params.id
        });
        if (existing) {
          throw badRequest(`Code '${cleanCode}' is already used by another business`);
        }
        updates.push("code = :code");
        params.code = cleanCode;
      }
    }
    if (email !== undefined) {
      if (email && email.trim()) {
        const cleanEmail = email.trim().toLowerCase();
        if (!isValidEmail(cleanEmail)) {
          throw badRequest("Please enter a valid company contact email address");
        }
        updates.push("email = :email");
        params.email = cleanEmail;
      } else {
        updates.push("email = :email");
        params.email = null;
      }
    }
    if (phone !== undefined) {
      updates.push("phone = :phone");
      params.phone = phone ? phone.trim() : null;
    }
    if (address !== undefined) {
      updates.push("address = :address");
      params.address = address ? address.trim() : null;
    }
    if (isActive !== undefined) {
      updates.push("is_active = :isActive");
      params.isActive = isActive ? 1 : 0;
    }
    if (req.body.taxNumber !== undefined || req.body.tax_number !== undefined) {
      const val = req.body.taxNumber !== undefined ? req.body.taxNumber : req.body.tax_number;
      updates.push("tax_number = :taxNumber");
      params.taxNumber = val ? val.trim() : null;
    }
    if (req.body.currency !== undefined) {
      updates.push("currency = :currency");
      params.currency = req.body.currency ? req.body.currency.trim() : "PKR";
    }
    if (req.body.softwareName !== undefined || req.body.software_name !== undefined) {
      const val = req.body.softwareName !== undefined ? req.body.softwareName : req.body.software_name;
      updates.push("software_name = :softwareName");
      params.softwareName = val ? val.trim() : "DigitalMarkaz360";
    }
    if (req.body.tagline !== undefined || req.body.softwareTagline !== undefined) {
      const val = req.body.tagline !== undefined ? req.body.tagline : req.body.softwareTagline;
      updates.push("tagline = :tagline");
      params.tagline = val ? val.trim() : "Poora Karobar, Ek Markaz";
    }
    if (req.body.receiptFooter !== undefined || req.body.receipt_footer !== undefined) {
      const val = req.body.receiptFooter !== undefined ? req.body.receiptFooter : req.body.receipt_footer;
      updates.push("receipt_footer = :receiptFooter");
      params.receiptFooter = val ? val.trim() : null;
    }
    if (req.body.logoUrl !== undefined || req.body.logo_url !== undefined) {
      const val = req.body.logoUrl !== undefined ? req.body.logoUrl : req.body.logo_url;
      updates.push("logo_url = :logoUrl");
      params.logoUrl = val || null;
    }

    if (updates.length) {
      await query(`UPDATE businesses SET ${updates.join(", ")} WHERE id = :id`, params);
    }

    const [updated] = await query("SELECT * FROM businesses WHERE id = :id", { id: req.params.id });
    res.json(updated);
  })
);

adminRouter.delete(
  "/businesses/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const businessId = Number(req.params.id);
    const [biz] = await query("SELECT * FROM businesses WHERE id = ?", [businessId]);
    if (!biz) {
      const error = new Error("Business not found");
      error.status = 404;
      throw error;
    }

    // Safety checks: ensure no transactions, inventory or active records exist
    const [sales] = await query(
      "SELECT COUNT(*) AS count FROM sale_orders so JOIN branches br ON br.id = so.branch_id WHERE br.business_id = ?",
      [businessId]
    );
    const [purchases] = await query(
      "SELECT COUNT(*) AS count FROM purchase_orders po JOIN branches br ON br.id = po.branch_id WHERE br.business_id = ?",
      [businessId]
    );
    const [expenses] = await query(
      "SELECT COUNT(*) AS count FROM expenses exp JOIN branches br ON br.id = exp.branch_id WHERE br.business_id = ?",
      [businessId]
    );
    const [units] = await query(
      "SELECT COUNT(*) AS count FROM mobile_units WHERE business_id = ?",
      [businessId]
    );
    const [repairs] = await query(
      "SELECT COUNT(*) AS count FROM repair_tickets WHERE business_id = ?",
      [businessId]
    );

    const totalRecords =
      Number(sales?.count || 0) +
      Number(purchases?.count || 0) +
      Number(expenses?.count || 0) +
      Number(units?.count || 0) +
      Number(repairs?.count || 0);

    if (totalRecords > 0) {
      const error = new Error(
        `Cannot delete company '${biz.name}' (${biz.code}) because it contains ${totalRecords} active records (sales, purchases, expenses, inventory, or repairs). Only empty companies with no operational data can be deleted.`
      );
      error.status = 409;
      error.totalRecords = totalRecords;
      throw error;
    }

    await withTransaction(async (conn) => {
      await conn.execute("DELETE FROM branch_subscriptions WHERE business_id = ?", [businessId]);
      await conn.execute("DELETE FROM users WHERE business_id = ?", [businessId]);
      await conn.execute("DELETE FROM mobile_models WHERE business_id = ?", [businessId]);
      await conn.execute("DELETE FROM parties WHERE business_id = ?", [businessId]);
      await conn.execute("DELETE FROM branches WHERE business_id = ?", [businessId]);
      await conn.execute("DELETE FROM businesses WHERE id = ?", [businessId]);

      await createAuditLog(conn, {
        userId: req.user.id,
        actionType: "delete_business",
        entityType: "business",
        entityId: businessId,
        details: { name: biz.name, code: biz.code }
      });
    });

    res.json({ success: true, message: `Company '${biz.name}' deleted successfully.` });
  })
);

// ==========================================
// 2B. COMPANY PROFILE & LOGO (COMPANY ADMIN & TOP ADMIN)
// ==========================================
adminRouter.get(
  "/company-profile",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const businessId = req.user.role_name === "top_admin"
      ? (req.query.businessId ? Number(req.query.businessId) : (req.user.business_id || 1))
      : req.user.business_id;

    const [biz] = await query("SELECT * FROM businesses WHERE id = ?", [businessId]);
    if (!biz) {
      const error = new Error("Business not found");
      error.status = 404;
      throw error;
    }

    const [branchCount] = await query(
      "SELECT COUNT(*) AS total FROM branches WHERE business_id = ?",
      [businessId]
    );
    const [staffCount] = await query(
      "SELECT COUNT(*) AS total FROM users WHERE business_id = ?",
      [businessId]
    );

    res.json({
      ...biz,
      totalBranches: branchCount?.total || 0,
      totalStaff: staffCount?.total || 0
    });
  })
);

adminRouter.put(
  "/company-profile",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const businessId = req.user.role_name === "top_admin"
      ? (req.body.businessId ? Number(req.body.businessId) : (req.user.business_id || 1))
      : req.user.business_id;

    const [biz] = await query("SELECT * FROM businesses WHERE id = ?", [businessId]);
    if (!biz) {
      const error = new Error("Business not found");
      error.status = 404;
      throw error;
    }

    const {
      name,
      code,
      email,
      phone,
      address,
      taxNumber,
      tax_number,
      currency,
      softwareName,
      software_name,
      receiptFooter,
      receipt_footer,
      logoUrl,
      logo_url
    } = req.body;

    const updates = [];
    const params = { id: businessId };

    if (name !== undefined && name.trim()) {
      updates.push("name = :name");
      params.name = name.trim();
    }
    if (code !== undefined && code.trim()) {
      const cleanCode = code.trim().toUpperCase();
      if (biz.code && biz.code.trim()) {
        if (cleanCode !== biz.code.trim().toUpperCase()) {
          throw badRequest("Company code cannot be modified once added");
        }
      } else {
        const [existing] = await query("SELECT id FROM businesses WHERE code = :code AND id != :id", {
          code: cleanCode,
          id: businessId
        });
        if (existing) {
          throw badRequest(`Code '${cleanCode}' is already used by another business`);
        }
        updates.push("code = :code");
        params.code = cleanCode;
      }
    }
    if (email !== undefined) {
      if (email && email.trim()) {
        const cleanEmail = email.trim().toLowerCase();
        if (!isValidEmail(cleanEmail)) {
          throw badRequest("Please enter a valid company contact email address");
        }
        updates.push("email = :email");
        params.email = cleanEmail;
      } else {
        updates.push("email = :email");
        params.email = null;
      }
    }
    if (phone !== undefined) {
      updates.push("phone = :phone");
      params.phone = phone ? phone.trim() : null;
    }
    if (address !== undefined) {
      updates.push("address = :address");
      params.address = address ? address.trim() : null;
    }
    const finalTax = taxNumber !== undefined ? taxNumber : tax_number;
    if (finalTax !== undefined) {
      updates.push("tax_number = :taxNumber");
      params.taxNumber = finalTax ? finalTax.trim() : null;
    }
    if (currency !== undefined && currency.trim()) {
      updates.push("currency = :currency");
      params.currency = currency.trim();
    }
    // Only SaaS Top Admin can configure software branding, tagline, or receipt/invoice footer note
    if (req.user.role_name === "top_admin") {
      const finalSoftware = softwareName !== undefined ? softwareName : software_name;
      if (finalSoftware !== undefined && finalSoftware.trim()) {
        updates.push("software_name = :softwareName");
        params.softwareName = finalSoftware.trim();
      }
      const finalTagline = req.body.tagline !== undefined ? req.body.tagline : req.body.softwareTagline;
      if (finalTagline !== undefined) {
        updates.push("tagline = :tagline");
        params.tagline = finalTagline ? finalTagline.trim() : "Poora Karobar, Ek Markaz";
      }
      const finalFooter = receiptFooter !== undefined ? receiptFooter : receipt_footer;
      if (finalFooter !== undefined) {
        updates.push("receipt_footer = :receiptFooter");
        params.receiptFooter = finalFooter ? finalFooter.trim() : null;
      }
    }
    const finalLogo = logoUrl !== undefined ? logoUrl : logo_url;
    if (finalLogo !== undefined) {
      updates.push("logo_url = :logoUrl");
      params.logoUrl = finalLogo || null;
    }

    if (updates.length) {
      await query(`UPDATE businesses SET ${updates.join(", ")} WHERE id = :id`, params);
    }

    const [updated] = await query("SELECT * FROM businesses WHERE id = ?", [businessId]);
    res.json(updated);
  })
);

adminRouter.post(
  "/businesses/:id/toggle",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    await query(`UPDATE businesses SET is_active = :isActive WHERE id = :id`, {
      id: req.params.id,
      isActive: isActive ? 1 : 0
    });

    const [business] = await query(`SELECT * FROM businesses WHERE id = :id`, { id: req.params.id });
    res.json(business);
  })
);

// ==========================================
// 3. BRANCH MANAGEMENT (TOP ADMIN)
// ==========================================
adminRouter.get(
  "/branches",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const {
      page,
      pageSize,
      search = "",
      businessId,
      status = "all",
      sortBy = "name",
      sortOrder = "ASC"
    } = req.query;

    const whereClauses = [];
    const params = {};

    if (search.trim()) {
      whereClauses.push("(b.name LIKE :search OR b.code LIKE :search OR biz.name LIKE :search)");
      params.search = `%${search.trim()}%`;
    }

    if (businessId) {
      whereClauses.push("b.business_id = :businessId");
      params.businessId = Number(businessId);
    }

    if (status === "active") {
      whereClauses.push("b.is_active = 1");
    } else if (status === "inactive") {
      whereClauses.push("b.is_active = 0");
    } else if (status === "expired") {
      whereClauses.push("(bs.status = 'expired' OR (bs.status = 'active' AND bs.current_period_ends_on < CURDATE()))");
    } else if (status === "overdue") {
      whereClauses.push("(bs.status IN ('grace', 'expired') OR (bs.status = 'active' AND bs.current_period_ends_on < CURDATE()) OR (bs.status = 'trialing' AND bs.trial_ends_on < CURDATE()))");
    } else if (status === "trialing") {
      whereClauses.push("bs.status = 'trialing'");
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const allowedSort = ["name", "code", "created_at", "is_active", "business_name", "current_period_ends_on"];
    const sortCol = allowedSort.includes(sortBy) ? sortBy : "name";
    const sortDir = sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const baseSql = `
      FROM branches b
      JOIN businesses biz ON biz.id = b.business_id
      LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
      LEFT JOIN subscription_plans plan ON plan.id = bs.plan_id
      ${whereSql}
    `;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.max(1, parseInt(pageSize, 10) || 10);
    const offset = (pageNum - 1) * limit;

    const [countResult] = await query(`SELECT COUNT(*) AS total ${baseSql}`, params);
    const total = Number(countResult?.total || 0);

    const items = await query(
      `SELECT
        b.id, b.business_id, b.name, b.code, b.address, b.is_active, b.created_at,
        biz.name AS business_name, biz.is_active AS business_is_active,
        (
          (SELECT COUNT(*) FROM sale_orders so WHERE so.branch_id = b.id) +
          (SELECT COUNT(*) FROM purchase_orders po WHERE po.branch_id = b.id) +
          (SELECT COUNT(*) FROM expenses exp WHERE exp.branch_id = b.id) +
          (SELECT COUNT(*) FROM mobile_units mu WHERE mu.branch_id = b.id) +
          (SELECT COUNT(*) FROM repair_tickets rt WHERE rt.branch_id = b.id)
        ) AS data_count,
        bs.id AS subscription_id,
        bs.status AS subscription_status,
        bs.current_period_ends_on,
        bs.trial_ends_on,
        bs.grace_ends_on,
        plan.id AS plan_id,
        plan.name AS plan_name,
        plan.price AS plan_price,
        plan.billing_period,
        CASE
          WHEN bs.status = 'suspended' THEN 'suspended'
          WHEN (bs.status = 'active' AND bs.current_period_ends_on < CURDATE()) THEN 'expired'
          WHEN (bs.status = 'trialing' AND bs.trial_ends_on < CURDATE()) THEN 'expired'
          ELSE bs.status
        END AS effective_status,
        CASE
          WHEN (bs.status = 'active' AND bs.current_period_ends_on < CURDATE())
            OR (bs.status = 'trialing' AND bs.trial_ends_on < CURDATE())
            OR bs.status IN ('grace', 'expired')
          THEN 1 ELSE 0
        END AS is_overdue
       ${baseSql}
       ORDER BY ${sortCol === "business_name" ? "biz.name" : sortCol === "current_period_ends_on" ? "bs.current_period_ends_on" : `b.${sortCol}`} ${sortDir}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      data: items,
      pagination: {
        total,
        page: pageNum,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  })
);

adminRouter.get(
  "/businesses/:id/branches",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const branches = await query(
      `SELECT
        b.*,
        biz.name AS business_name,
        bs.status AS subscription_status,
        bs.current_period_ends_on,
        bs.trial_ends_on,
        bs.grace_ends_on,
        plan.name AS plan_name,
        plan.id AS plan_id
       FROM branches b
       JOIN businesses biz ON biz.id = b.business_id
       LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
       LEFT JOIN subscription_plans plan ON plan.id = bs.plan_id
       WHERE b.business_id = :id
       ORDER BY b.name ASC`,
      { id: req.params.id }
    );
    res.json(branches);
  })
);

adminRouter.post(
  "/branches",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { businessId, name, code, address, planId = 1 } = req.body;
    if (!businessId || !name || !name.trim()) {
      throw badRequest("businessId and branch name are required");
    }

    const [biz] = await query("SELECT id, code FROM businesses WHERE id = ?", [businessId]);
    if (!biz) {
      throw badRequest("Selected business does not exist");
    }

    const cleanCode = await generateUniqueBranchCode(businessId, biz.code, code);

    const created = await withTransaction(async (connection) => {
      const [branchResult] = await connection.execute(
        `INSERT INTO branches (business_id, name, code, address, is_active) VALUES (?, ?, ?, ?, 1)`,
        [businessId, name.trim(), cleanCode, address || null]
      );
      const branchId = branchResult.insertId;

      await connection.execute(
        `INSERT INTO branch_subscriptions
         (business_id, branch_id, plan_id, status, trial_ends_on, grace_ends_on)
         SELECT ?, ?, sp.id, 'trialing', DATE_ADD(CURDATE(), INTERVAL sp.trial_days DAY), DATE_ADD(CURDATE(), INTERVAL (sp.trial_days + sp.grace_days) DAY)
         FROM subscription_plans sp
         WHERE sp.id = ? AND sp.is_active = 1`,
        [businessId, branchId, planId]
      );

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "create_branch",
        entityType: "branch",
        entityId: branchId,
        details: { businessId, name, code: cleanCode, planId }
      });

      return branchId;
    });

    const [newBranch] = await query(
      `SELECT b.*, biz.name AS business_name, bs.status AS subscription_status, bs.trial_ends_on
       FROM branches b
       JOIN businesses biz ON biz.id = b.business_id
       LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
       WHERE b.id = ?`,
      [created]
    );

    res.status(201).json(newBranch);
  })
);

adminRouter.put(
  "/branches/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { name, code, address, isActive, planId } = req.body;
    const [branch] = await query("SELECT * FROM branches WHERE id = :id", { id: req.params.id });
    if (!branch) {
      const error = new Error("Branch not found");
      error.status = 404;
      throw error;
    }

    const updates = [];
    const params = { id: req.params.id };

    if (name !== undefined) {
      updates.push("name = :name");
      params.name = name.trim();
    }
    if (code !== undefined) {
      const cleanCode = code.trim().toUpperCase();
      if (branch.code && branch.code.trim()) {
        if (cleanCode !== branch.code.trim().toUpperCase()) {
          throw badRequest("Branch code cannot be modified once created");
        }
      } else {
        const [existing] = await query("SELECT id FROM branches WHERE code = :code AND id != :id", {
          code: cleanCode,
          id: req.params.id
        });
        if (existing) {
          throw badRequest(`Branch code '${cleanCode}' is already in use`);
        }
        updates.push("code = :code");
        params.code = cleanCode;
      }
    }
    if (address !== undefined) {
      updates.push("address = :address");
      params.address = address ? address.trim() : null;
    }
    if (isActive !== undefined) {
      updates.push("is_active = :isActive");
      params.isActive = isActive ? 1 : 0;
    }

    await withTransaction(async (connection) => {
      if (updates.length) {
        let sql = `UPDATE branches SET ${updates.join(", ")} WHERE id = :id`;
        // Named placeholder expansion for execute or direct run
        const setStrings = [];
        const bindValues = [];
        if (name !== undefined) { setStrings.push("name = ?"); bindValues.push(name.trim()); }
        if (code !== undefined) { setStrings.push("code = ?"); bindValues.push(code.trim().toUpperCase()); }
        if (address !== undefined) { setStrings.push("address = ?"); bindValues.push(address ? address.trim() : null); }
        if (isActive !== undefined) { setStrings.push("is_active = ?"); bindValues.push(isActive ? 1 : 0); }
        bindValues.push(req.params.id);

        await connection.execute(`UPDATE branches SET ${setStrings.join(", ")} WHERE id = ?`, bindValues);
      }

      if (planId) {
        await connection.execute(
          `UPDATE branch_subscriptions SET plan_id = ? WHERE branch_id = ?`,
          [planId, req.params.id]
        );
      }
    });

    const [updated] = await query(
      `SELECT b.*, bs.status AS subscription_status, bs.current_period_ends_on, p.name AS plan_name, p.id AS plan_id
       FROM branches b
       LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
       LEFT JOIN subscription_plans p ON p.id = bs.plan_id
       WHERE b.id = ?`,
      [req.params.id]
    );

    res.json(updated);
  })
);

adminRouter.post(
  "/branches/:id/toggle",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    await query("UPDATE branches SET is_active = :isActive WHERE id = :id", {
      id: req.params.id,
      isActive: isActive ? 1 : 0
    });

    const [branch] = await query("SELECT * FROM branches WHERE id = :id", { id: req.params.id });
    res.json(branch);
  })
);

adminRouter.delete(
  "/branches/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const branchId = Number(req.params.id);
    const [branch] = await query("SELECT * FROM branches WHERE id = ?", [branchId]);
    if (!branch) {
      const error = new Error("Branch not found");
      error.status = 404;
      throw error;
    }

    // Safety checks: ensure no transactions or inventory exist
    const [sales] = await query("SELECT COUNT(*) AS count FROM sale_orders WHERE branch_id = ?", [branchId]);
    const [purchases] = await query("SELECT COUNT(*) AS count FROM purchase_orders WHERE branch_id = ?", [branchId]);
    const [expenses] = await query("SELECT COUNT(*) AS count FROM expenses WHERE branch_id = ?", [branchId]);
    const [units] = await query("SELECT COUNT(*) AS count FROM mobile_units WHERE branch_id = ?", [branchId]);
    const [repairs] = await query("SELECT COUNT(*) AS count FROM repair_tickets WHERE branch_id = ?", [branchId]);

    const totalRecords =
      Number(sales?.count || 0) +
      Number(purchases?.count || 0) +
      Number(expenses?.count || 0) +
      Number(units?.count || 0) +
      Number(repairs?.count || 0);

    if (totalRecords > 0) {
      const error = new Error(
        `Cannot delete branch '${branch.name}' (${branch.code}) because it contains ${totalRecords} active records (sales, purchases, inventory, expenses, or repairs). Only empty branches with no operational data can be deleted.`
      );
      error.status = 409;
      error.totalRecords = totalRecords;
      throw error;
    }

    await withTransaction(async (conn) => {
      await conn.execute("DELETE FROM branch_subscriptions WHERE branch_id = ?", [branchId]);
      await conn.execute("DELETE FROM branches WHERE id = ?", [branchId]);

      await createAuditLog(conn, {
        userId: req.user.id,
        actionType: "delete_branch",
        entityType: "branch",
        entityId: branchId,
        details: { name: branch.name, code: branch.code, businessId: branch.business_id }
      });
    });

    res.json({ success: true, message: `Branch '${branch.name}' deleted successfully.` });
  })
);

// ==========================================
// 4. SUBSCRIPTION PACKAGE MANAGEMENT
// ==========================================
export const SYSTEM_MODULES_LIST = [
  { key: "dashboard", label: "Dashboard Overview", category: "Core Modules", description: "Real-time revenue, order metrics, and business KPIs", icon: "📊" },
  { key: "sales", label: "POS Sales Counter", category: "Core Modules", description: "Counter checkout, barcode/IMEI scanning, and invoices", icon: "💰" },
  { key: "purchases", label: "Vendor Purchases", category: "Core Modules", description: "Vendor bills, purchase orders, and IMEI stock intake", icon: "🛒" },
  { key: "inventory", label: "Inventory Management", category: "Core Modules", description: "IMEI units tracker, accessories, pricing, and stock alerts", icon: "📦" },
  { key: "cash_register", label: "Cash Register", category: "Core Modules", description: "Opening/closing drawer cash, discrepancy verification", icon: "💵" },
  { key: "parties", label: "Customer & Vendor Parties", category: "Core Modules", description: "Contact profiles, credit balance, and ledger records", icon: "👥" },
  { key: "expenses", label: "Expense Management", category: "Core Modules", description: "Operating costs, salary payments, bills, and petty cash", icon: "📉" },
  { key: "invoices", label: "Invoice History & Collections", category: "Core Modules", description: "Invoice archive, print receipts, and collection tracking", icon: "🧾" },
  { key: "employees", label: "Salaries, Attendance & Payroll", category: "Core Modules", description: "Employee roster, monthly attendance, salary disbursals, advances & loans", icon: "💵" },
  { key: "repairs", label: "Repair Services Counter", category: "Core Modules", description: "Repair tickets, technician assignments, spare parts, and tracking", icon: "🔧" },
  { key: "admin", label: "Business Administration", category: "Core Modules", description: "Staff accounts, role permissions, and branch settings", icon: "⚙️" },
  { key: "reports_inventory", label: "Inventory Valuation Reports", category: "Reports & Audits", description: "Stock balance valuation, dead-stock, and unit depreciation", icon: "📋" },
  { key: "reports_receivables", label: "Receivables & Aging Analysis", category: "Reports & Audits", description: "Customer debts, overdue payment reminders, and credit limits", icon: "📈" },
  { key: "reports_payables", label: "Payables & Supplier Outflow", category: "Reports & Audits", description: "Vendor liabilities, purchase order payables, and due dates", icon: "📑" },
  { key: "stock_transfers", label: "Inter-Branch Stock Transfers", category: "Advanced Operations", description: "Dispatch, transfer, and receive inventory between branches", icon: "🔄" },
  { key: "sale_returns", label: "Customer Sale Returns", category: "Advanced Operations", description: "Return processing, restock IMEIs, and handle refund cash", icon: "↩️" },
  { key: "purchase_returns", label: "Vendor Purchase Returns", category: "Advanced Operations", description: "Defective stock returns, vendor credit adjustments, and restock reconciliation", icon: "🔄" },
  { key: "partner_shares", label: "Partner Equity & Dividends", category: "Advanced Operations", description: "Branch equity shares, profit margins, and distribution", icon: "🤝" },
  { key: "theme_selection", label: "Theme Customization & Colors", category: "Appearance & Branding", description: "Allow users to customize UI color themes (Dark, Emerald, Cobalt, Crimson, High Contrast)", icon: "🎨" }
];

async function syncPlanFeatures(planId, allowedPages) {
  if (!Array.isArray(allowedPages)) return;
  await query("DELETE FROM subscription_plan_features WHERE plan_id = ?", [planId]);
  for (const pageKey of allowedPages) {
    const isReport = pageKey.startsWith("reports_");
    const featureType = pageKey === "theme_selection" ? "feature" : (isReport ? "report" : "page");
    await query(
      `INSERT INTO subscription_plan_features (plan_id, feature_key, feature_type, is_allowed)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE is_allowed = 1`,
      [planId, pageKey, featureType]
    );
  }
}

const VALID_SYSTEM_MODULE_KEYS = new Set(SYSTEM_MODULES_LIST.map((m) => m.key));

function parseAllowedPages(raw) {
  let list = [];
  if (!raw) {
    list = SYSTEM_MODULES_LIST.map((m) => m.key);
  } else if (Array.isArray(raw)) {
    list = [...raw];
  } else {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? [...parsed] : SYSTEM_MODULES_LIST.map((m) => m.key);
    } catch {
      list = SYSTEM_MODULES_LIST.map((m) => m.key);
    }
  }
  // If legacy order_returns is present, ensure sale_returns and purchase_returns are also enabled
  if (list.includes("order_returns")) {
    if (!list.includes("sale_returns")) list.push("sale_returns");
    if (!list.includes("purchase_returns")) list.push("purchase_returns");
  }
  // Filter out legacy keys (e.g. order_returns) and non-existent keys, then deduplicate
  return Array.from(new Set(list)).filter((key) => VALID_SYSTEM_MODULE_KEYS.has(key));
}

adminRouter.get(
  "/subscription-plans",
  requireRole("top_admin"),
  asyncHandler(async (_req, res) => {
    const plans = await query(`
      SELECT
        p.id, p.name, p.monthly_price, p.price, p.billing_period,
        p.duration_value, p.duration_unit, p.max_branches,
        p.trial_days, p.grace_days, p.is_active, p.description, p.allowed_pages, p.created_at,
        COUNT(bs.id) AS assigned_branches_count,
        SUM(CASE WHEN bs.status = 'active' THEN 1 ELSE 0 END) AS active_branches_count
      FROM subscription_plans p
      LEFT JOIN branch_subscriptions bs ON bs.plan_id = p.id
      GROUP BY p.id
      ORDER BY p.price ASC, p.name ASC
    `);

    const formatted = plans.map((p) => ({
      ...p,
      allowedPages: parseAllowedPages(p.allowed_pages)
    }));

    res.json(formatted);
  })
);

adminRouter.get(
  "/package-access",
  requireRole("top_admin"),
  asyncHandler(async (_req, res) => {
    const plans = await query(`
      SELECT
        p.id, p.name, p.price, p.billing_period, p.duration_value, p.duration_unit,
        p.max_branches, p.is_active, p.description, p.allowed_pages,
        COUNT(bs.id) AS assigned_branches_count,
        SUM(CASE WHEN bs.status = 'active' THEN 1 ELSE 0 END) AS active_branches_count
      FROM subscription_plans p
      LEFT JOIN branch_subscriptions bs ON bs.plan_id = p.id
      GROUP BY p.id
      ORDER BY p.price ASC, p.name ASC
    `);

    const formatted = plans.map((p) => ({
      ...p,
      allowedPages: parseAllowedPages(p.allowed_pages)
    }));

    res.json({
      modules: SYSTEM_MODULES_LIST,
      packages: formatted
    });
  })
);

adminRouter.put(
  "/package-access/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { allowedPages, name } = req.body;
    const planId = req.params.id;

    const [plan] = await query("SELECT * FROM subscription_plans WHERE id = ?", [planId]);
    if (!plan) {
      throw badRequest("Subscription package not found");
    }

    if (name !== undefined && name.trim()) {
      const [existing] = await query("SELECT id FROM subscription_plans WHERE name = ? AND id != ?", [name.trim(), planId]);
      if (existing) {
        throw badRequest(`A package named '${name.trim()}' already exists`);
      }
      await query("UPDATE subscription_plans SET name = ? WHERE id = ?", [name.trim(), planId]);
    }

    if (allowedPages !== undefined) {
      const pagesArray = parseAllowedPages(allowedPages);
      const pagesJson = JSON.stringify(pagesArray);
      await query("UPDATE subscription_plans SET allowed_pages = ? WHERE id = ?", [pagesJson, planId]);
      await syncPlanFeatures(planId, pagesArray);
    }

    const [updated] = await query(
      `SELECT
        p.id, p.name, p.price, p.billing_period, p.duration_value, p.duration_unit,
        p.max_branches, p.is_active, p.description, p.allowed_pages,
        COUNT(bs.id) AS assigned_branches_count,
        SUM(CASE WHEN bs.status = 'active' THEN 1 ELSE 0 END) AS active_branches_count
      FROM subscription_plans p
      LEFT JOIN branch_subscriptions bs ON bs.plan_id = p.id
      WHERE p.id = ?
      GROUP BY p.id`,
      [planId]
    );

    res.json({
      ...updated,
      allowedPages: parseAllowedPages(updated.allowed_pages),
      message: `Subscription package '${updated.name}' updated successfully.`
    });
  })
);

adminRouter.post(
  "/package-access/clone",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { fromPlanId, toPlanId } = req.body;
    if (!fromPlanId || !toPlanId) {
      throw badRequest("fromPlanId and toPlanId are required");
    }

    const [fromPlan] = await query("SELECT * FROM subscription_plans WHERE id = ?", [fromPlanId]);
    const [toPlan] = await query("SELECT * FROM subscription_plans WHERE id = ?", [toPlanId]);

    if (!fromPlan || !toPlan) {
      throw badRequest("Source or target package does not exist");
    }

    const pages = parseAllowedPages(fromPlan.allowed_pages);
    await query("UPDATE subscription_plans SET allowed_pages = ? WHERE id = ?", [JSON.stringify(pages), toPlanId]);
    await syncPlanFeatures(toPlanId, pages);

    res.json({
      message: `Permissions from '${fromPlan.name}' cloned to '${toPlan.name}' successfully.`,
      toPlanId,
      allowedPages: pages
    });
  })
);

adminRouter.get(
  "/subscription-plans/:id/branches",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const branches = await query(
      `SELECT
        b.id, b.name AS branch_name, b.code AS branch_code, b.is_active AS branch_is_active,
        biz.id AS business_id, biz.name AS business_name,
        bs.status AS subscription_status, bs.current_period_ends_on, bs.trial_ends_on
       FROM branch_subscriptions bs
       JOIN branches b ON b.id = bs.branch_id
       JOIN businesses biz ON biz.id = bs.business_id
       WHERE bs.plan_id = :id
       ORDER BY biz.name, b.name`,
      { id: req.params.id }
    );
    res.json(branches);
  })
);

adminRouter.post(
  "/subscription-plans",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const {
      name,
      price = 0,
      monthlyPrice,
      billingPeriod = "monthly",
      durationValue = 1,
      durationUnit = "month",
      maxBranches = 1,
      trialDays = 14,
      graceDays = 7,
      description,
      isActive = 1,
      allowedPages
    } = req.body;

    if (!name || name.trim() === "") {
      throw badRequest("Package name is required");
    }

    const [existing] = await query("SELECT id FROM subscription_plans WHERE name = ?", [name.trim()]);
    if (existing) {
      throw badRequest(`A package named '${name.trim()}' already exists`);
    }

    const packagePrice = Number(price || monthlyPrice || 0);
    const dVal = Number(durationValue) || 1;
    const dUnit = ["day", "month", "year"].includes(durationUnit) ? durationUnit : "month";
    let mPrice = monthlyPrice !== undefined ? Number(monthlyPrice) : packagePrice;
    if (monthlyPrice === undefined) {
      if (dUnit === "year" && dVal > 0) {
        mPrice = packagePrice / (dVal * 12);
      } else if (dUnit === "month" && dVal > 0) {
        mPrice = packagePrice / dVal;
      }
    }
    const pagesArray = parseAllowedPages(
      Array.isArray(allowedPages) && allowedPages.length > 0 ? allowedPages : SYSTEM_MODULES_LIST.map((m) => m.key)
    );
    const allowedPagesJson = JSON.stringify(pagesArray);

    const result = await query(
      `INSERT INTO subscription_plans
       (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, description, is_active, allowed_pages)
       VALUES
       (:name, :monthlyPrice, :price, :billingPeriod, :durationValue, :durationUnit, :maxBranches, :trialDays, :graceDays, :description, :isActive, :allowedPages)`,
      {
        name: name.trim(),
        monthlyPrice: mPrice,
        price: packagePrice,
        billingPeriod,
        durationValue: dVal,
        durationUnit: dUnit,
        maxBranches: maxBranches !== undefined && !isNaN(Number(maxBranches)) ? Number(maxBranches) : 1,
        trialDays: Number(trialDays) || 0,
        graceDays: Number(graceDays) || 0,
        description: description || null,
        isActive: isActive ? 1 : 0,
        allowedPages: allowedPagesJson
      }
    );

    const planId = result.insertId;
    await syncPlanFeatures(planId, pagesArray);

    const [newPlan] = await query("SELECT * FROM subscription_plans WHERE id = ?", [planId]);
    res.status(201).json({
      ...newPlan,
      allowedPages: parseAllowedPages(newPlan.allowed_pages)
    });
  })
);

adminRouter.put(
  "/subscription-plans/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const {
      name,
      price,
      monthlyPrice,
      billingPeriod,
      durationValue,
      durationUnit,
      maxBranches,
      trialDays,
      graceDays,
      description,
      isActive,
      allowedPages
    } = req.body;

    const [plan] = await query("SELECT * FROM subscription_plans WHERE id = :id", { id: req.params.id });
    if (!plan) {
      const error = new Error("Package not found");
      error.status = 404;
      throw error;
    }

    const updates = [];
    const params = { id: req.params.id };

    if (name !== undefined) {
      const [existing] = await query("SELECT id FROM subscription_plans WHERE name = :name AND id != :id", {
        name: name.trim(),
        id: req.params.id
      });
      if (existing) {
        throw badRequest(`A package named '${name.trim()}' already exists`);
      }
      updates.push("name = :name");
      params.name = name.trim();
    }
    if (price !== undefined) {
      updates.push("price = :price");
      params.price = Number(price);
      if (monthlyPrice === undefined) {
        updates.push("monthly_price = :monthlyPrice");
        const effectiveUnit = durationUnit || plan.duration_unit || "month";
        const effectiveVal = durationValue !== undefined ? Number(durationValue) : (plan.duration_value || 1);
        if (effectiveUnit === "year" && effectiveVal > 0) {
          params.monthlyPrice = Number(price) / (effectiveVal * 12);
        } else if (effectiveUnit === "month" && effectiveVal > 0) {
          params.monthlyPrice = Number(price) / effectiveVal;
        } else {
          params.monthlyPrice = Number(price);
        }
      }
    }
    if (monthlyPrice !== undefined) {
      updates.push("monthly_price = :monthlyPrice");
      params.monthlyPrice = Number(monthlyPrice);
    }
    if (billingPeriod !== undefined) {
      updates.push("billing_period = :billingPeriod");
      params.billingPeriod = billingPeriod;
    }
    if (durationValue !== undefined) {
      updates.push("duration_value = :durationValue");
      params.durationValue = Number(durationValue);
    }
    if (durationUnit !== undefined) {
      updates.push("duration_unit = :durationUnit");
      params.durationUnit = durationUnit;
    }
    if (maxBranches !== undefined) {
      updates.push("max_branches = :maxBranches");
      params.maxBranches = Number(maxBranches);
    }
    if (trialDays !== undefined) {
      updates.push("trial_days = :trialDays");
      params.trialDays = Number(trialDays);
    }
    if (graceDays !== undefined) {
      updates.push("grace_days = :graceDays");
      params.graceDays = Number(graceDays);
    }
    if (description !== undefined) {
      updates.push("description = :description");
      params.description = description;
    }
    if (isActive !== undefined) {
      updates.push("is_active = :isActive");
      params.isActive = isActive ? 1 : 0;
    }
    if (allowedPages !== undefined && Array.isArray(allowedPages)) {
      const pagesArray = parseAllowedPages(allowedPages);
      updates.push("allowed_pages = :allowedPages");
      params.allowedPages = JSON.stringify(pagesArray);
      await syncPlanFeatures(req.params.id, pagesArray);
    }

    if (updates.length) {
      await query(`UPDATE subscription_plans SET ${updates.join(", ")} WHERE id = :id`, params);
    }

    const [updated] = await query("SELECT * FROM subscription_plans WHERE id = :id", { id: req.params.id });
    res.json({
      ...updated,
      allowedPages: parseAllowedPages(updated.allowed_pages)
    });
  })
);

adminRouter.delete(
  "/subscription-plans/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const planId = req.params.id;
    const [subCount] = await query(
      "SELECT COUNT(*) AS total FROM branch_subscriptions WHERE plan_id = ? AND status != 'cancelled'",
      [planId]
    );
    if (Number(subCount?.total || 0) > 0) {
      throw badRequest(`A package with active subscribers cannot be deleted, only deactivated.`);
    }

    await query("DELETE FROM subscription_plan_features WHERE plan_id = ?", [planId]);
    await query("DELETE FROM subscription_plans WHERE id = ?", [planId]);
    res.json({ message: "Subscription package deleted successfully" });
  })
);

adminRouter.post(
  "/subscription-plans/:id/toggle",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    await query("UPDATE subscription_plans SET is_active = :isActive WHERE id = :id", {
      id: req.params.id,
      isActive: isActive ? 1 : 0
    });

    const [plan] = await query("SELECT * FROM subscription_plans WHERE id = :id", { id: req.params.id });
    res.json(plan);
  })
);

// SUBSCRIPTIONS SCREEN (who has what)
adminRouter.get(
  "/branch-subscriptions",
  requireRole("top_admin"),
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT
         bs.id AS subscription_id,
         bs.branch_id,
         b.name AS customer_name,
         b.name AS branch_name,
         b.code AS branch_code,
         biz.id AS business_id,
         biz.name AS business_name,
         sp.id AS plan_id,
         sp.name AS package_name,
         sp.name AS plan_name,
         sp.duration_value,
         sp.duration_unit,
         sp.billing_period,
         sp.price AS plan_price,
         bs.subscription_starts_on,
         bs.current_period_ends_on,
         bs.trial_ends_on,
         bs.status AS raw_status,
         COALESCE(bs.subscription_starts_on, DATE(bs.created_at)) AS start_date,
         COALESCE(bs.current_period_ends_on, bs.trial_ends_on) AS end_date,
         DATEDIFF(COALESCE(bs.current_period_ends_on, bs.trial_ends_on), CURDATE()) AS days_left
       FROM branch_subscriptions bs
       JOIN branches b ON b.id = bs.branch_id
       JOIN businesses biz ON biz.id = bs.business_id
       JOIN subscription_plans sp ON sp.id = bs.plan_id
       ORDER BY biz.name, b.name`
    );

    // Auto-update expired rows in DB and format
    const processed = [];
    for (const r of rows) {
      let status = "active";
      if (r.raw_status === "cancelled" || r.raw_status === "suspended") {
        status = "cancelled";
      } else if (r.end_date && r.days_left !== null && r.days_left < 0) {
        status = "expired";
        if (r.raw_status !== "expired") {
          query("UPDATE branch_subscriptions SET status = 'expired' WHERE id = ?", [r.subscription_id]).catch(() => {});
        }
      } else if (r.end_date && r.days_left !== null && r.days_left <= 7) {
        status = "expiring_soon";
      } else {
        status = "active";
      }

      processed.push({
        ...r,
        status,
        startDate: r.start_date,
        endDate: r.end_date,
        daysLeft: r.days_left !== null ? r.days_left : 0
      });
    }

    res.json(processed);
  })
);

// ASSIGN / CHANGE PACKAGE
adminRouter.post(
  "/branch-subscriptions/assign",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const { branchId, planId, startDate, isBackdated } = req.body;
    if (!branchId || !planId) {
      throw badRequest("Customer/Branch and Package are required");
    }

    const [branch] = await query("SELECT id, business_id, name FROM branches WHERE id = ?", [branchId]);
    if (!branch) {
      throw badRequest("Selected customer does not exist");
    }

    if (req.user.role_name !== "top_admin" && Number(branch.business_id) !== Number(req.user.business_id)) {
      throw badRequest("You can only assign packages to your own company branches");
    }

    const [plan] = await query("SELECT * FROM subscription_plans WHERE id = ?", [planId]);
    if (!plan) {
      throw badRequest("Selected package does not exist");
    }
    if (!plan.is_active) {
      throw badRequest("Cannot assign an inactive package to a customer");
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const start = startDate ? startDate.slice(0, 10) : todayStr;

    if (!isBackdated && start < todayStr) {
      throw badRequest("Start date cannot be in the past unless 'Backdate subscription' is checked");
    }

    // Auto-compute end date from package duration:
    // 1 Month / 3 Months / 6 Months / 1 Year
    const durVal = Number(plan.duration_value) || 1;
    const durUnit = (plan.duration_unit || "month").toLowerCase();
    const intervalSql = durUnit === "year" ? "YEAR" : durUnit === "day" ? "DAY" : "MONTH";

    const [calc] = await query(
      `SELECT DATE_ADD(DATE(:start), INTERVAL :durVal ${intervalSql}) AS end_date`,
      { start, durVal }
    );
    const endDate = calc.end_date;

    const [existingSub] = await query("SELECT id FROM branch_subscriptions WHERE branch_id = ?", [branchId]);
    if (existingSub) {
      await query(
        `UPDATE branch_subscriptions
         SET plan_id = :planId,
             status = 'active',
             subscription_starts_on = :start,
             current_period_ends_on = :endDate,
             trial_ends_on = NULL,
             grace_ends_on = NULL
         WHERE branch_id = :branchId`,
        { planId, start, endDate, branchId }
      );
    } else {
      await query(
        `INSERT INTO branch_subscriptions
         (business_id, branch_id, plan_id, status, subscription_starts_on, current_period_ends_on)
         VALUES (:businessId, :branchId, :planId, 'active', :start, :endDate)`,
        { businessId: branch.business_id, branchId, planId, start, endDate }
      );
    }

    const [sub] = await query(
      `SELECT bs.*, b.name AS branch_name, b.code AS branch_code, biz.name AS business_name,
              sp.name AS plan_name, sp.duration_value, sp.duration_unit, sp.billing_period, sp.price AS plan_price
       FROM branch_subscriptions bs
       JOIN branches b ON b.id = bs.branch_id
       JOIN businesses biz ON biz.id = bs.business_id
       JOIN subscription_plans sp ON sp.id = bs.plan_id
       WHERE bs.branch_id = ?`,
      [branchId]
    );

    res.json({
      ...sub,
      message: `Assigned package '${plan.name}' to '${branch.name}' through ${endDate}`
    });
  })
);

// CANCEL SUBSCRIPTION
adminRouter.post(
  "/branch-subscriptions/:branchId/cancel",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE branch_subscriptions
       SET status = 'cancelled'
       WHERE branch_id = :branchId`,
      { branchId: req.params.branchId }
    );
    res.json({ message: "Subscription cancelled successfully" });
  })
);

adminRouter.post(
  "/branch-subscriptions/:branchId/extend",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const { currentPeriodEndsOn } = req.body;
    if (!currentPeriodEndsOn) {
      throw badRequest("currentPeriodEndsOn is required");
    }

    const [branch] = await query("SELECT id, business_id FROM branches WHERE id = ?", [req.params.branchId]);
    if (!branch) {
      throw badRequest("Branch not found");
    }
    if (req.user.role_name !== "top_admin" && Number(branch.business_id) !== Number(req.user.business_id)) {
      throw badRequest("You can only extend subscriptions for your own company branches");
    }

    await query(
      `UPDATE branch_subscriptions
       SET status = 'active', current_period_ends_on = :currentPeriodEndsOn, grace_ends_on = NULL
       WHERE branch_id = :branchId`,
      { branchId: req.params.branchId, currentPeriodEndsOn }
    );

    const [subscription] = await query(`SELECT * FROM branch_subscriptions WHERE branch_id = :branchId`, {
      branchId: req.params.branchId
    });
    res.json(subscription);
  })
);

adminRouter.post(
  "/branch-subscriptions/:branchId/suspend",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE branch_subscriptions
       SET status = 'suspended'
       WHERE branch_id = :branchId`,
      { branchId: req.params.branchId }
    );

    const [subscription] = await query(`SELECT * FROM branch_subscriptions WHERE branch_id = :branchId`, {
      branchId: req.params.branchId
    });
    res.json(subscription);
  })
);

adminRouter.post(
  "/branch-subscriptions/:branchId/change-plan",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { planId } = req.body;
    if (!planId) {
      throw badRequest("planId is required");
    }

    await query(
      `UPDATE branch_subscriptions
       SET plan_id = :planId
       WHERE branch_id = :branchId`,
      { branchId: req.params.branchId, planId }
    );

    const [subscription] = await query(
      `SELECT bs.*, b.name AS branch_name, biz.name AS business_name, sp.name AS plan_name
       FROM branch_subscriptions bs
       JOIN branches b ON b.id = bs.branch_id
       JOIN businesses biz ON biz.id = bs.business_id
       JOIN subscription_plans sp ON sp.id = bs.plan_id
       WHERE bs.branch_id = :branchId`,
      { branchId: req.params.branchId }
    );
    res.json(subscription);
  })
);

// ==========================================
// 5. PENDING PAYMENTS & VERIFICATION
// ==========================================
adminRouter.get(
  "/payments",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const {
      page,
      pageSize,
      search = "",
      status = "all",
      businessId,
      branchId,
      planId,
      fromDate,
      toDate,
      sortBy = "submitted_at",
      sortOrder = "DESC"
    } = req.query;

    const whereClauses = [];
    const params = {};

    if (search.trim()) {
      whereClauses.push("(biz.name LIKE :search OR b.name LIKE :search OR sp.evidence_reference LIKE :search OR sp.payment_method LIKE :search)");
      params.search = `%${search.trim()}%`;
    }

    if (businessId) {
      whereClauses.push("sp.business_id = :businessId");
      params.businessId = Number(businessId);
    }

    if (branchId) {
      whereClauses.push("sp.branch_id = :branchId");
      params.branchId = Number(branchId);
    }

    if (planId) {
      whereClauses.push("sp.plan_id = :planId");
      params.planId = Number(planId);
    }

    if (fromDate) {
      whereClauses.push("DATE(sp.submitted_at) >= :fromDate");
      params.fromDate = fromDate;
    }

    if (toDate) {
      whereClauses.push("DATE(sp.submitted_at) <= :toDate");
      params.toDate = toDate;
    }

    if (status && status !== "all") {
      if (status === "overdue") {
        whereClauses.push("(bs.status IN ('grace', 'expired') OR (bs.status = 'active' AND bs.current_period_ends_on < CURDATE()))");
      } else {
        whereClauses.push("sp.status = :status");
        params.status = status;
      }
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const allowedSort = ["submitted_at", "amount", "status", "payment_date", "business_name"];
    const sortCol = allowedSort.includes(sortBy) ? sortBy : "submitted_at";
    const sortDir = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const baseSql = `
      FROM subscription_payments sp
      JOIN businesses biz ON biz.id = sp.business_id
      JOIN branches b ON b.id = sp.branch_id
      JOIN subscription_plans plan ON plan.id = sp.plan_id
      LEFT JOIN branch_subscriptions bs ON bs.branch_id = sp.branch_id
      LEFT JOIN users sub_u ON sub_u.id = sp.submitted_by
      LEFT JOIN users ver_u ON ver_u.id = sp.verified_by
      ${whereSql}
    `;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.max(1, parseInt(pageSize, 10) || 10);
    const offset = (pageNum - 1) * limit;

    const [countResult] = await query(`SELECT COUNT(*) AS total ${baseSql}`, params);
    const total = Number(countResult?.total || 0);

    const items = await query(
      `SELECT
        sp.id, sp.business_id, sp.branch_id, sp.plan_id,
        sp.amount, sp.duration_value, sp.duration_unit,
        sp.payment_method, sp.evidence_reference, sp.status,
        sp.rejection_reason, sp.submitted_by, sp.verified_by,
        sp.submitted_at, sp.verified_at, sp.payment_date,
        sp.notes, sp.period_start_date, sp.period_end_date,
        biz.name AS business_name,
        b.name AS branch_name,
        b.code AS branch_code,
        plan.name AS plan_name,
        plan.billing_period,
        plan.price AS plan_price,
        sub_u.full_name AS submitted_by_name,
        ver_u.full_name AS verified_by_name,
        bs.status AS subscription_status,
        bs.current_period_ends_on,
        bs.trial_ends_on
       ${baseSql}
       ORDER BY ${sortCol === "business_name" ? "biz.name" : `sp.${sortCol}`} ${sortDir}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      data: items,
      pagination: {
        total,
        page: pageNum,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  })
);

adminRouter.post(
  "/payments",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const {
      businessId,
      branchId,
      planId,
      amount,
      paymentMethod = "Bank Transfer",
      evidenceReference,
      paymentDate,
      durationValue,
      durationUnit,
      notes
    } = req.body;

    if (!businessId || !branchId || !amount) {
      throw badRequest("businessId, branchId, and amount are required");
    }

    const [branch] = await query("SELECT id, business_id FROM branches WHERE id = ?", [branchId]);
    if (!branch || Number(branch.business_id) !== Number(businessId)) {
      throw badRequest("Branch does not belong to the specified business");
    }

    // Default plan from branch subscription if not specified
    let targetPlanId = planId;
    if (!targetPlanId) {
      const [sub] = await query("SELECT plan_id FROM branch_subscriptions WHERE branch_id = ?", [branchId]);
      targetPlanId = sub?.plan_id || 1;
    }

    const [plan] = await query("SELECT * FROM subscription_plans WHERE id = ?", [targetPlanId]);
    const dVal = durationValue || plan?.duration_value || 1;
    const dUnit = durationUnit || plan?.duration_unit || "month";

    const result = await query(
      `INSERT INTO subscription_payments
       (business_id, branch_id, plan_id, amount, duration_value, duration_unit, payment_method, evidence_reference, status, submitted_by, submitted_at, payment_date, notes)
       VALUES
       (:businessId, :branchId, :planId, :amount, :durationValue, :durationUnit, :paymentMethod, :evidenceReference, 'submitted', :submittedBy, NOW(), :paymentDate, :notes)`,
      {
        businessId,
        branchId,
        planId: targetPlanId,
        amount: Number(amount),
        durationValue: dVal,
        durationUnit: dUnit,
        paymentMethod,
        evidenceReference: evidenceReference || null,
        submittedBy: req.user.id,
        paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
        notes: notes || null
      }
    );

    const [newPayment] = await query(
      `SELECT sp.*, biz.name AS business_name, b.name AS branch_name, plan.name AS plan_name
       FROM subscription_payments sp
       JOIN businesses biz ON biz.id = sp.business_id
       JOIN branches b ON b.id = sp.branch_id
       JOIN subscription_plans plan ON plan.id = sp.plan_id
       WHERE sp.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newPayment);
  })
);

adminRouter.post(
  "/payments/:id/approve",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const paymentId = req.params.id;

    const approved = await withTransaction(async (connection) => {
      // 1. Lock payment row
      const [payments] = await connection.execute(
        `SELECT sp.*, plan.duration_value AS plan_duration_value, plan.duration_unit AS plan_duration_unit
         FROM subscription_payments sp
         JOIN subscription_plans plan ON plan.id = sp.plan_id
         WHERE sp.id = ?
         FOR UPDATE`,
        [paymentId]
      );

      if (!payments.length) {
        const error = new Error("Payment record not found");
        error.status = 404;
        throw error;
      }

      const payment = payments[0];
      if (payment.status === "verified") {
        throw badRequest("This payment has already been verified and subscription extended");
      }

      // 2. Lock branch subscription row
      const [subs] = await connection.execute(
        `SELECT * FROM branch_subscriptions WHERE branch_id = ? FOR UPDATE`,
        [payment.branch_id]
      );

      if (!subs.length) {
        throw badRequest("Branch subscription record not found for this payment");
      }

      const sub = subs[0];

      // 3. Calculate extension duration
      const durationVal = Number(payment.duration_value || payment.plan_duration_value || 1);
      const durationUnit = (payment.duration_unit || payment.plan_duration_unit || "month").toLowerCase();
      const intervalSql = durationUnit === "year" ? "YEAR" : durationUnit === "day" ? "DAY" : "MONTH";

      // 4. Calculate new period start & expiry dates safely:
      // If subscription is currently active and current_period_ends_on > CURDATE(),
      // extend FROM current_period_ends_on so remaining paid time is preserved!
      // Otherwise, start extension from CURDATE().
      const [calcRows] = await connection.execute(
        `SELECT
          CASE
            WHEN ? IS NOT NULL AND DATE(?) > CURDATE() THEN DATE(?)
            ELSE CURDATE()
          END AS start_date,
          CASE
            WHEN ? IS NOT NULL AND DATE(?) > CURDATE()
              THEN DATE_ADD(DATE(?), INTERVAL ? ${intervalSql})
            ELSE DATE_ADD(CURDATE(), INTERVAL ? ${intervalSql})
          END AS end_date`,
        [
          sub.current_period_ends_on, sub.current_period_ends_on, sub.current_period_ends_on,
          sub.current_period_ends_on, sub.current_period_ends_on, sub.current_period_ends_on,
          durationVal,
          durationVal
        ]
      );

      const startDate = calcRows[0].start_date;
      const endDate = calcRows[0].end_date;

      // 5. Update branch subscription
      await connection.execute(
        `UPDATE branch_subscriptions
         SET status = 'active',
             plan_id = ?,
             subscription_starts_on = ?,
             current_period_ends_on = ?,
             grace_ends_on = NULL,
             trial_ends_on = NULL
         WHERE branch_id = ?`,
        [payment.plan_id, startDate, endDate, payment.branch_id]
      );

      // 6. Update payment record to verified
      await connection.execute(
        `UPDATE subscription_payments
         SET status = 'verified',
             verified_by = ?,
             verified_at = NOW(),
             period_start_date = ?,
             period_end_date = ?,
             rejection_reason = NULL
         WHERE id = ?`,
        [req.user.id, startDate, endDate, paymentId]
      );

      // 7. Audit log
      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "approve_subscription_payment",
        entityType: "subscription_payments",
        entityId: paymentId,
        details: {
          branchId: payment.branch_id,
          businessId: payment.business_id,
          amount: payment.amount,
          newStartDate: startDate,
          newPeriodEndsOn: endDate
        }
      });

      return {
        paymentId,
        branchId: payment.branch_id,
        startDate,
        endDate
      };
    });

    const [updatedPayment] = await query(
      `SELECT sp.*, b.name AS branch_name, biz.name AS business_name, plan.name AS plan_name,
              bs.current_period_ends_on, bs.status AS subscription_status
       FROM subscription_payments sp
       JOIN branches b ON b.id = sp.branch_id
       JOIN businesses biz ON biz.id = sp.business_id
       JOIN subscription_plans plan ON plan.id = sp.plan_id
       LEFT JOIN branch_subscriptions bs ON bs.branch_id = sp.branch_id
       WHERE sp.id = ?`,
      [paymentId]
    );

    res.json({
      message: "Payment verified and subscription successfully extended",
      payment: updatedPayment,
      extension: approved
    });
  })
);

adminRouter.post(
  "/payments/:id/reject",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { reason = "" } = req.body;
    if (!reason.trim()) {
      throw badRequest("Rejection reason is required");
    }

    const [payment] = await query("SELECT * FROM subscription_payments WHERE id = ?", [req.params.id]);
    if (!payment) {
      const error = new Error("Payment record not found");
      error.status = 404;
      throw error;
    }

    if (payment.status === "verified") {
      throw badRequest("Cannot reject a payment that has already been verified and extended");
    }

    await withTransaction(async (connection) => {
      await connection.execute(
        `UPDATE subscription_payments
         SET status = 'rejected',
             rejection_reason = ?,
             verified_by = ?,
             verified_at = NOW()
         WHERE id = ?`,
        [reason.trim(), req.user.id, req.params.id]
      );

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "reject_subscription_payment",
        entityType: "subscription_payments",
        entityId: req.params.id,
        details: { reason: reason.trim() }
      });
    });

    const [updated] = await query("SELECT * FROM subscription_payments WHERE id = ?", [req.params.id]);
    res.json({
      message: "Payment rejected",
      payment: updated
    });
  })
);

adminRouter.put(
  "/payments/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const paymentId = req.params.id;
    const [existing] = await query("SELECT * FROM subscription_payments WHERE id = ?", [paymentId]);
    if (!existing) {
      const error = new Error("Payment record not found");
      error.status = 404;
      throw error;
    }

    const {
      amount,
      paymentMethod,
      evidenceReference,
      paymentDate,
      durationValue,
      durationUnit,
      notes,
      planId
    } = req.body;

    const newAmount = amount !== undefined ? Number(amount) : Number(existing.amount);
    if (isNaN(newAmount) || newAmount < 0) {
      throw badRequest("Amount must be a valid non-negative number");
    }

    const newDurationValue = durationValue !== undefined ? Math.max(1, parseInt(durationValue, 10) || 1) : existing.duration_value;
    const newDurationUnit = durationUnit || existing.duration_unit || "month";
    if (!["day", "month", "year"].includes(newDurationUnit)) {
      throw badRequest("Duration unit must be day, month, or year");
    }

    const newMethod = paymentMethod !== undefined ? String(paymentMethod).trim() : existing.payment_method;
    const newRef = evidenceReference !== undefined ? (evidenceReference ? String(evidenceReference).trim() : null) : existing.evidence_reference;
    const newDate = paymentDate !== undefined ? (paymentDate || null) : existing.payment_date;
    const newNotes = notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes;
    const newPlanId = planId !== undefined ? Number(planId) : existing.plan_id;

    await withTransaction(async (connection) => {
      await connection.execute(
        `UPDATE subscription_payments
         SET amount = ?,
             payment_method = ?,
             evidence_reference = ?,
             payment_date = ?,
             duration_value = ?,
             duration_unit = ?,
             notes = ?,
             plan_id = ?
         WHERE id = ?`,
        [newAmount, newMethod, newRef, newDate, newDurationValue, newDurationUnit, newNotes, newPlanId, paymentId]
      );

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "update_subscription_payment",
        entityType: "subscription_payments",
        entityId: paymentId,
        details: {
          previous: {
            amount: existing.amount,
            payment_method: existing.payment_method,
            evidence_reference: existing.evidence_reference,
            payment_date: existing.payment_date,
            duration_value: existing.duration_value,
            duration_unit: existing.duration_unit,
            notes: existing.notes,
            plan_id: existing.plan_id
          },
          updated: {
            amount: newAmount,
            payment_method: newMethod,
            evidence_reference: newRef,
            payment_date: newDate,
            duration_value: newDurationValue,
            duration_unit: newDurationUnit,
            notes: newNotes,
            plan_id: newPlanId
          }
        }
      });
    });

    const [updated] = await query(
      `SELECT sp.*, b.name AS branch_name, b.code AS branch_code, biz.name AS business_name, plan.name AS plan_name,
              bs.current_period_ends_on, bs.status AS subscription_status
       FROM subscription_payments sp
       JOIN branches b ON b.id = sp.branch_id
       JOIN businesses biz ON biz.id = sp.business_id
       JOIN subscription_plans plan ON plan.id = sp.plan_id
       LEFT JOIN branch_subscriptions bs ON bs.branch_id = sp.branch_id
       WHERE sp.id = ?`,
      [paymentId]
    );

    res.json({
      message: "Payment record updated successfully",
      payment: updated
    });
  })
);

adminRouter.delete(
  "/payments/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const paymentId = req.params.id;
    const [existing] = await query("SELECT * FROM subscription_payments WHERE id = ?", [paymentId]);
    if (!existing) {
      const error = new Error("Payment record not found");
      error.status = 404;
      throw error;
    }

    await withTransaction(async (connection) => {
      // If the payment was verified, safely adjust the branch subscription end date
      if (existing.status === "verified") {
        const [prevVerifiedRows] = await connection.query(
          `SELECT * FROM subscription_payments
           WHERE branch_id = ? AND status = 'verified' AND id != ?
           ORDER BY period_end_date DESC LIMIT 1`,
          [existing.branch_id, paymentId]
        );
        const prevVerified = prevVerifiedRows && prevVerifiedRows[0];

        if (prevVerified && prevVerified.period_end_date) {
          const isExpired = new Date(prevVerified.period_end_date) < new Date();
          await connection.execute(
            `UPDATE branch_subscriptions
             SET current_period_ends_on = ?,
                 status = ?
             WHERE branch_id = ?`,
            [prevVerified.period_end_date, isExpired ? "expired" : "active", existing.branch_id]
          );
        } else {
          const [subRows] = await connection.query(
            "SELECT trial_ends_on FROM branch_subscriptions WHERE branch_id = ?",
            [existing.branch_id]
          );
          const sub = subRows && subRows[0];
          const trialEnds = sub?.trial_ends_on;
          const isTrialValid = trialEnds && new Date(trialEnds) > new Date();
          await connection.execute(
            `UPDATE branch_subscriptions
             SET current_period_ends_on = ?,
                 status = ?
             WHERE branch_id = ?`,
            [trialEnds || null, isTrialValid ? "trialing" : "expired", existing.branch_id]
          );
        }
      }

      await connection.execute("DELETE FROM subscription_payments WHERE id = ?", [paymentId]);

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "delete_subscription_payment",
        entityType: "subscription_payments",
        entityId: paymentId,
        details: {
          deletedPayment: {
            id: existing.id,
            business_id: existing.business_id,
            branch_id: existing.branch_id,
            amount: existing.amount,
            status: existing.status,
            evidence_reference: existing.evidence_reference,
            period_end_date: existing.period_end_date
          }
        }
      });
    });

    res.json({ message: "Payment record deleted successfully" });
  })
);

// ==========================================
// 6. COMPANY ADMINISTRATOR MANAGEMENT
// ==========================================
adminRouter.get(
  "/company-admins",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { page, pageSize, search = "", businessId, status = "all" } = req.query;

    const whereClauses = ["r.name = 'business_super_admin'"];
    const params = {};

    if (search.trim()) {
      whereClauses.push("(u.full_name LIKE :search OR u.email LIKE :search OR biz.name LIKE :search)");
      params.search = `%${search.trim()}%`;
    }

    if (businessId) {
      whereClauses.push("u.business_id = :businessId");
      params.businessId = Number(businessId);
    }

    if (status === "active") {
      whereClauses.push("u.is_active = 1");
    } else if (status === "inactive") {
      whereClauses.push("u.is_active = 0");
    }

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.max(1, parseInt(pageSize, 10) || 10);
    const offset = (pageNum - 1) * limit;

    const [countResult] = await query(
      `SELECT COUNT(*) AS total
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN businesses biz ON biz.id = u.business_id
       ${whereSql}`,
      params
    );
    const total = Number(countResult?.total || 0);

    const items = await query(
      `SELECT
        u.id, u.full_name, u.email, u.business_id, u.branch_id, u.is_active, u.created_at,
        r.name AS role_name,
        biz.name AS business_name,
        biz.code AS business_code,
        b.name AS branch_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN businesses biz ON biz.id = u.business_id
       LEFT JOIN branches b ON b.id = u.branch_id
       ${whereSql}
       ORDER BY biz.name ASC, u.is_active DESC, u.full_name ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      data: items,
      pagination: {
        total,
        page: pageNum,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  })
);

adminRouter.post(
  "/company-admins",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { businessId, fullName, email, password, branchId, forceReplace = false } = req.body;
    if (!businessId || !fullName || !email || !password) {
      throw badRequest("businessId, fullName, email, and password are required");
    }

    const [biz] = await query("SELECT id, name FROM businesses WHERE id = ?", [businessId]);
    if (!biz) {
      throw badRequest("Business not found");
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw badRequest("Please enter a valid email address");
    }
    const [existingEmail] = await query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existingEmail) {
      throw badRequest(`A user with email '${cleanEmail}' already exists`);
    }

    const [superAdminRole] = await query("SELECT id FROM roles WHERE name = 'business_super_admin'");
    if (!superAdminRole) {
      throw badRequest("business_super_admin role not found");
    }

    // Check if business already has an active primary admin
    const [existingActiveAdmin] = await query(
      `SELECT id, full_name, email FROM users
       WHERE business_id = ? AND role_id = ? AND is_active = 1`,
      [businessId, superAdminRole.id]
    );

    if (existingActiveAdmin && !forceReplace) {
      const error = new Error(
        `Business '${biz.name}' already has an active primary admin (${existingActiveAdmin.full_name} - ${existingActiveAdmin.email}). Choose 'Replace Admin' or deactivate the existing admin first.`
      );
      error.status = 409;
      error.existingAdmin = existingActiveAdmin;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createdAdminId = await withTransaction(async (connection) => {
      // If replacing, deactivate existing active admins for this business
      if (existingActiveAdmin && forceReplace) {
        await connection.execute(
          `UPDATE users SET is_active = 0 WHERE business_id = ? AND role_id = ? AND is_active = 1`,
          [businessId, superAdminRole.id]
        );
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [businessId, superAdminRole.id, branchId || null, fullName.trim(), cleanEmail, passwordHash]
      );

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "create_company_admin",
        entityType: "users",
        entityId: insertResult.insertId,
        details: { businessId, email: cleanEmail, replacedAdminId: existingActiveAdmin?.id || null }
      });

      return insertResult.insertId;
    });

    const [newAdmin] = await query(
      `SELECT u.id, u.full_name, u.email, u.business_id, u.branch_id, u.is_active, u.created_at,
              r.name AS role_name, biz.name AS business_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN businesses biz ON biz.id = u.business_id
       WHERE u.id = ?`,
      [createdAdminId]
    );

    res.status(201).json(newAdmin);
  })
);

adminRouter.put(
  "/company-admins/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { fullName, email, password, isActive, branchId } = req.body;
    const [targetUser] = await query(
      `SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id`,
      { id: req.params.id }
    );

    if (!targetUser) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (targetUser.role_name !== "business_super_admin" && targetUser.role_name !== "admin") {
      throw badRequest("This user is not a company administrator");
    }

    const updates = [];
    const params = { id: req.params.id };

    if (fullName !== undefined) {
      updates.push("full_name = :fullName");
      params.fullName = fullName.trim();
    }
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== targetUser.email.toLowerCase()) {
        throw badRequest("Email address cannot be changed once a user account has been created");
      }
    }
    if (password) {
      updates.push("password_hash = :passwordHash");
      params.passwordHash = await bcrypt.hash(password, 10);
    }
    if (branchId !== undefined) {
      updates.push("branch_id = :branchId");
      params.branchId = branchId || null;
    }
    if (isActive !== undefined) {
      // If setting to active, ensure only 1 active super admin per business
      if (isActive && targetUser.business_id) {
        await query(
          `UPDATE users SET is_active = 0
           WHERE business_id = :bizId AND role_id = :roleId AND id != :id`,
          { bizId: targetUser.business_id, roleId: targetUser.role_id, id: targetUser.id }
        );
      }
      updates.push("is_active = :isActive");
      params.isActive = isActive ? 1 : 0;
    }

    if (updates.length) {
      await query(`UPDATE users SET ${updates.join(", ")} WHERE id = :id`, params);
    }

    const [updated] = await query(
      `SELECT u.id, u.full_name, u.email, u.business_id, u.branch_id, u.is_active, r.name AS role_name, biz.name AS business_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN businesses biz ON biz.id = u.business_id
       WHERE u.id = :id`,
      { id: req.params.id }
    );

    res.json(updated);
  })
);

adminRouter.post(
  "/company-admins/:id/toggle",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const [targetUser] = await query("SELECT * FROM users WHERE id = :id", { id: req.params.id });
    if (!targetUser) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (isActive && targetUser.business_id) {
      // Deactivate any other active admin for this business to enforce 1 active admin policy
      await query(
        `UPDATE users SET is_active = 0 WHERE business_id = ? AND role_id = ? AND id != ?`,
        [targetUser.business_id, targetUser.role_id, targetUser.id]
      );
    }

    await query("UPDATE users SET is_active = :isActive WHERE id = :id", {
      id: req.params.id,
      isActive: isActive ? 1 : 0
    });

    const [updated] = await query("SELECT * FROM users WHERE id = :id", { id: req.params.id });
    res.json(updated);
  })
);

adminRouter.delete(
  "/company-admins/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { deactivateIfHasRecords = false } = req.body || {};

    const [targetUser] = await query(
      `SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
      [userId]
    );

    if (!targetUser) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (targetUser.role_name === "top_admin") {
      throw badRequest("Cannot delete the TOP Administrator account");
    }

    // Check for associated records across tables to preserve historical data & audit trails
    const [sales] = await query("SELECT COUNT(*) AS count FROM sale_orders WHERE created_by = ?", [userId]);
    const [purchases] = await query("SELECT COUNT(*) AS count FROM purchase_orders WHERE created_by = ?", [userId]);
    const [payments] = await query("SELECT COUNT(*) AS count FROM payments WHERE created_by = ?", [userId]);
    const [cashRegisters] = await query(
      "SELECT COUNT(*) AS count FROM cash_register_sessions WHERE opened_by = ? OR closed_by = ? OR verified_by = ?",
      [userId, userId, userId]
    );
    const [stockMovements] = await query("SELECT COUNT(*) AS count FROM stock_movements WHERE created_by = ?", [userId]);
    const [subPayments] = await query(
      "SELECT COUNT(*) AS count FROM subscription_payments WHERE submitted_by = ? OR verified_by = ?",
      [userId, userId]
    );

    const relatedCount =
      Number(sales?.count || 0) +
      Number(purchases?.count || 0) +
      Number(payments?.count || 0) +
      Number(cashRegisters?.count || 0) +
      Number(stockMovements?.count || 0) +
      Number(subPayments?.count || 0);

    if (relatedCount > 0) {
      if (deactivateIfHasRecords || req.query.deactivate === "true") {
        await query("UPDATE users SET is_active = 0 WHERE id = ?", [userId]);
        return res.json({
          success: true,
          action: "deactivated",
          message: `Administrator '${targetUser.full_name}' was safely deactivated instead of deleted because they have ${relatedCount} associated business/financial records.`
        });
      }

      return res.status(409).json({
        error: `Cannot delete administrator '${targetUser.full_name}' because they have ${relatedCount} associated business records (sales, purchases, registers, or payments). Please deactivate the account to preserve business audit history.`,
        hasRecords: true,
        relatedCount
      });
    }

    // If no records, safe to delete
    await withTransaction(async (connection) => {
      await connection.execute("DELETE FROM user_permissions WHERE user_id = ?", [userId]);
      await connection.execute("DELETE FROM users WHERE id = ?", [userId]);
      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "delete_company_admin",
        entityType: "users",
        entityId: userId,
        details: { email: targetUser.email, fullName: targetUser.full_name }
      });
    });

    res.json({
      success: true,
      action: "deleted",
      message: `Administrator '${targetUser.full_name}' has been permanently deleted.`
    });
  })
);

// ==========================================
// 6b. SAAS PLATFORM SUPER ADMINS (top_admin)
// ==========================================
adminRouter.get(
  "/saas-admins",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const admins = await query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.mfa_enabled, u.is_break_glass, u.created_at, u.last_login_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name = 'top_admin'
       ORDER BY u.id ASC`
    );
    res.json(admins);
  })
);

adminRouter.post(
  "/saas-admins",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!email || !password || !fullName) {
      throw badRequest("Full name, email, and password are required");
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw badRequest("Please provide a valid email address");
    }

    const [existing] = await query("SELECT id, email FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    const [topRole] = await query("SELECT id FROM roles WHERE name = 'top_admin' LIMIT 1");
    if (!topRole) {
      throw badRequest("top_admin role not found");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (existing) {
      await query(
        `UPDATE users
         SET role_id = ?, business_id = NULL, branch_id = NULL, full_name = ?, password_hash = ?, is_active = 1, failed_login_attempts = 0, locked_until = NULL
         WHERE id = ?`,
        [topRole.id, fullName.trim(), passwordHash, existing.id]
      );
      return res.status(200).json({
        id: existing.id,
        email: cleanEmail,
        fullName: fullName.trim(),
        message: `User '${cleanEmail}' upgraded to SaaS Super Admin successfully`
      });
    }

    const result = await query(
      `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active, mfa_enabled, is_break_glass, must_change_password)
       VALUES (NULL, ?, NULL, ?, ?, ?, 1, 0, 0, 0)`,
      [topRole.id, fullName.trim(), cleanEmail, passwordHash]
    );

    res.status(201).json({
      id: result.insertId,
      email: cleanEmail,
      fullName: fullName.trim(),
      message: `SaaS Super Admin '${cleanEmail}' created successfully`
    });
  })
);

adminRouter.put(
  "/saas-admins/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const adminId = req.params.id;
    const { fullName, password } = req.body;

    const [adminUser] = await query(
      `SELECT u.id, u.full_name, u.email, u.is_break_glass, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [adminId]
    );

    if (!adminUser || adminUser.role_name !== "top_admin") {
      throw badRequest("SaaS Super Admin not found");
    }

    if (adminUser.is_break_glass && password) {
      throw badRequest("Emergency break-glass credentials can only be managed through vault security console");
    }

    const updates = [];
    const params = [];

    if (fullName && fullName.trim()) {
      updates.push("full_name = ?");
      params.push(fullName.trim());
    }

    if (password) {
      if (password.length < 8) {
        throw badRequest("Password must be at least 8 characters");
      }
      const hash = await bcrypt.hash(password, 10);
      updates.push("password_hash = ?");
      params.push(hash);
    }

    if (updates.length > 0) {
      params.push(adminId);
      await query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    const [updated] = await query(
      `SELECT id, full_name, email, is_active, mfa_enabled, is_break_glass, created_at, last_login_at
       FROM users WHERE id = ?`,
      [adminId]
    );

    res.json({
      success: true,
      data: updated,
      message: `SaaS Super Admin '${updated.full_name}' updated successfully`
    });
  })
);

adminRouter.post(
  "/saas-admins/:id/toggle",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const adminId = Number(req.params.id);
    const { isActive } = req.body;

    const [adminUser] = await query(
      `SELECT u.id, u.full_name, u.email, u.is_break_glass, u.is_active, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [adminId]
    );

    if (!adminUser || adminUser.role_name !== "top_admin") {
      throw badRequest("SaaS Super Admin not found");
    }

    if (adminId === Number(req.user.id) && !isActive) {
      throw badRequest("You cannot deactivate your own active session account");
    }

    if (adminUser.is_break_glass && !isActive) {
      throw badRequest("The emergency break-glass account must remain active for platform recovery");
    }

    const newStatus = isActive ? 1 : 0;

    if (!newStatus) {
      const [activeCount] = await query(
        `SELECT COUNT(*) AS count
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.name = 'top_admin' AND u.is_active = 1 AND u.id != ?`,
        [adminId]
      );
      if (Number(activeCount?.count || 0) === 0) {
        throw badRequest("Cannot deactivate the only remaining active SaaS Super Admin");
      }
    }

    await query("UPDATE users SET is_active = ? WHERE id = ?", [newStatus, adminId]);

    res.json({
      success: true,
      message: `SaaS Super Admin '${adminUser.full_name}' is now ${newStatus ? "active" : "inactive"}`
    });
  })
);

adminRouter.delete(
  "/saas-admins/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const adminId = Number(req.params.id);

    const [adminUser] = await query(
      `SELECT u.id, u.full_name, u.email, u.is_break_glass, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [adminId]
    );

    if (!adminUser || adminUser.role_name !== "top_admin") {
      throw badRequest("SaaS Super Admin not found");
    }

    if (adminId === Number(req.user.id)) {
      throw badRequest("You cannot delete your own account while logged in");
    }

    if (adminUser.is_break_glass) {
      throw badRequest("The emergency break-glass account cannot be deleted");
    }

    const [activeCount] = await query(
      `SELECT COUNT(*) AS count
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name = 'top_admin' AND u.is_active = 1 AND u.id != ?`,
      [adminId]
    );
    if (Number(activeCount?.count || 0) === 0) {
      throw badRequest("Cannot delete the only remaining active SaaS Super Admin");
    }

    await withTransaction(async (connection) => {
      await connection.execute("DELETE FROM user_permissions WHERE user_id = ?", [adminId]);
      await connection.execute("DELETE FROM users WHERE id = ?", [adminId]);
      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "delete_saas_admin",
        entityType: "users",
        entityId: adminId,
        details: { email: adminUser.email, fullName: adminUser.full_name }
      });
    });

    res.json({
      success: true,
      message: `SaaS Super Admin '${adminUser.full_name}' (${adminUser.email}) permanently deleted`
    });
  })
);

// ==========================================
// 7. STAFF USERS & PERMISSIONS (LEGACY/SHARED)
// ==========================================
adminRouter.get(
  "/users",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const params = {};
    let where = "";

    if (req.user.role_name === "top_admin") {
      where = `WHERE r.name IN ('business_super_admin', 'admin', 'manager', 'cashier') AND COALESCE(u.is_break_glass, 0) = 0`;
    } else {
      where = `WHERE u.business_id = :businessId AND COALESCE(u.is_break_glass, 0) = 0`;
      params.businessId = req.user.business_id;
    }

    const users = await query(
      `SELECT u.id, u.full_name, u.email, u.business_id, u.branch_id, u.is_active,
              r.name AS role_name, b.name AS business_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN businesses b ON b.id = u.business_id
       ${where}
       ORDER BY b.name, u.full_name`,
      params
    );

    const permissionWhere = req.user.role_name === "top_admin"
      ? `WHERE r.name IN ('business_super_admin', 'admin', 'manager', 'cashier') AND COALESCE(u.is_break_glass, 0) = 0`
      : `WHERE u.business_id = :businessId AND COALESCE(u.is_break_glass, 0) = 0`;

    const permissions = await query(
      `SELECT up.user_id, up.page_key, up.action_key, up.is_allowed
       FROM user_permissions up
       JOIN users u ON u.id = up.user_id
       JOIN roles r ON r.id = u.role_id
       ${permissionWhere}`,
      params
    );

    const usersWithPerms = await Promise.all(
      users.map(async (user) => {
        const targetBranchId = isBusinessAdmin(user) ? null : user.branch_id;
        const subInfo = await fetchUserSubscription(user.business_id, targetBranchId);
        const resolved = await resolveUserPermissions(user.id, user.business_id, user.role_name, subInfo.allowedPages);
        return {
          ...user,
          permissions: resolved
        };
      })
    );

    res.json(usersWithPerms);
  })
);

adminRouter.get(
  "/business-role-permissions",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const businessId = req.user.role_name === "top_admin"
      ? (req.query.businessId ? Number(req.query.businessId) : 1)
      : req.user.business_id;

    const subInfo = await fetchUserSubscription(businessId, null);
    const allowedPages = subInfo.allowedPages;

    // Filter available modules to only those in allowedPages (from SaaS package)
    const availableModules = SYSTEM_MODULES_LIST.filter((m) => {
      if (!Array.isArray(allowedPages) || allowedPages.length === 0) return true;
      return isPackagePageAllowed(m.key, allowedPages);
    });

    const rows = await query(
      `SELECT role_name, page_key, action_key, is_allowed
       FROM business_role_permissions
       WHERE business_id = ?`,
      [businessId]
    );

    function buildRolePermissions(roleName) {
      const defaults = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
      const roleRows = rows.filter((r) => r.role_name === roleName);
      const map = new Map();

      for (const def of defaults) {
        if (!isPackagePageAllowed(def.pageKey, allowedPages)) continue;
        map.set(`${def.pageKey}:${def.actionKey}`, {
          pageKey: def.pageKey,
          actionKey: def.actionKey,
          isAllowed: Boolean(def.isAllowed)
        });
      }

      for (const row of roleRows) {
        if (!isPackagePageAllowed(row.page_key, allowedPages)) continue;
        map.set(`${row.page_key}:${row.action_key}`, {
          pageKey: row.page_key,
          actionKey: row.action_key,
          isAllowed: Boolean(row.is_allowed)
        });
      }

      return Array.from(map.values());
    }

    res.json({
      businessId,
      allowedPages,
      availableModules,
      roles: {
        manager: buildRolePermissions("manager"),
        cashier: buildRolePermissions("cashier")
      }
    });
  })
);

adminRouter.put(
  "/business-role-permissions/:roleName",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const { roleName } = req.params;
    if (!["manager", "cashier"].includes(roleName)) {
      throw badRequest("Role must be manager or cashier");
    }

    const businessId = req.user.role_name === "top_admin"
      ? (req.body.businessId ? Number(req.body.businessId) : 1)
      : req.user.business_id;

    const { permissions = [] } = req.body;

    // Cross-verify with SaaS admin subscription package allowed pages
    const subInfo = await fetchUserSubscription(businessId, null);
    const allowedPages = subInfo.allowedPages;

    if (Array.isArray(allowedPages) && allowedPages.length > 0) {
      const invalidModules = new Set();
      for (const p of permissions) {
        if (Boolean(p.isAllowed) && !isPackagePageAllowed(p.pageKey, allowedPages)) {
          invalidModules.add(p.pageKey);
        }
      }
      if (invalidModules.size > 0) {
        const list = Array.from(invalidModules).join(", ");
        throw badRequest(
          `These modules are not in your package: ${list}. They are not included in your company's subscription package authorized by SaaS Top Admin.`
        );
      }
    }

    await withTransaction(async (conn) => {
      await conn.execute(
        `DELETE FROM business_role_permissions WHERE business_id = ? AND role_name = ?`,
        [businessId, roleName]
      );

      for (const p of permissions) {
        if (!isPackagePageAllowed(p.pageKey, allowedPages)) continue;
        await conn.execute(
          `INSERT INTO business_role_permissions (business_id, role_name, page_key, action_key, is_allowed)
           VALUES (?, ?, ?, ?, ?)`,
          [businessId, roleName, p.pageKey, p.actionKey, p.isAllowed ? 1 : 0]
        );
      }

      // Synchronize updated role permissions to all existing users with this role in the business
      const [roleRows] = await conn.execute("SELECT id FROM roles WHERE name = ?", [roleName]);
      if (roleRows && roleRows.length > 0) {
        const roleId = roleRows[0].id;
        const [usersWithRole] = await conn.execute(
          "SELECT id FROM users WHERE business_id = ? AND role_id = ?",
          [businessId, roleId]
        );
        for (const u of usersWithRole) {
          for (const p of permissions) {
            if (!isPackagePageAllowed(p.pageKey, allowedPages)) continue;
            await conn.execute(
              `INSERT INTO user_permissions (user_id, page_key, action_key, is_allowed)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)`,
              [u.id, p.pageKey, p.actionKey, p.isAllowed ? 1 : 0]
            );
          }
        }
      }
    });

    const updated = await query(
      `SELECT page_key, action_key, is_allowed FROM business_role_permissions WHERE business_id = ? AND role_name = ?`,
      [businessId, roleName]
    );

    res.json({ success: true, roleName, permissions: updated });
  })
);

adminRouter.put(
  "/users/:id/permissions",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const { permissions = [] } = req.body;
    const [targetUser] = await query(
      `SELECT u.id, u.business_id, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = :id`,
      { id: req.params.id }
    );

    if (!targetUser) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (req.user.role_name !== "top_admin" && targetUser.business_id !== req.user.business_id) {
      const error = new Error("Cannot edit users outside your business");
      error.status = 403;
      throw error;
    }

    if (targetUser.role_name === "business_super_admin") {
      throw badRequest("Company super administrator rights are governed by your subscription package and cannot have individual overrides.");
    }

    // Cross-verify with SaaS admin subscription package allowed pages
    const subInfo = await fetchUserSubscription(targetUser.business_id, null);
    const allowedPages = subInfo.allowedPages;

    if (req.user.role_name !== "top_admin" && Array.isArray(allowedPages) && allowedPages.length > 0) {
      const invalidModules = new Set();
      for (const p of permissions) {
        if (Boolean(p.isAllowed) && !isPackagePageAllowed(p.pageKey, allowedPages)) {
          invalidModules.add(p.pageKey);
        }
      }
      if (invalidModules.size > 0) {
        const list = Array.from(invalidModules).join(", ");
        throw badRequest(
          `These modules are not in your package: ${list}. They are not included in your company's subscription package authorized by SaaS Top Admin.`
        );
      }
    }

    await withTransaction(async (connection) => {
      await connection.execute(`DELETE FROM user_permissions WHERE user_id = ?`, [targetUser.id]);

      for (const permission of permissions) {
        if (req.user.role_name !== "top_admin" && !isPackagePageAllowed(permission.pageKey, allowedPages)) {
          continue;
        }
        await connection.execute(
          `INSERT INTO user_permissions (user_id, page_key, action_key, is_allowed)
           VALUES (?, ?, ?, ?)`,
          [targetUser.id, permission.pageKey, permission.actionKey, permission.isAllowed ? 1 : 0]
        );
      }
    });

    const saved = await query(
      `SELECT page_key, action_key, is_allowed FROM user_permissions WHERE user_id = :userId`,
      { userId: targetUser.id }
    );
    res.json({ success: true, permissions: saved });
  })
);

adminRouter.post(
  "/users",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const { fullName, email, password, roleName = "cashier", branchId } = req.body;
    if (!fullName || !email || !password) {
      throw badRequest("fullName, email and password are required");
    }

    const businessId = req.user.role_name === "top_admin" ? (req.body.businessId || null) : req.user.business_id;

    if (req.user.role_name !== "top_admin" && !["manager", "cashier", "admin"].includes(roleName)) {
      throw badRequest("Invalid role for business staff");
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw badRequest("Please enter a valid email address");
    }
    const [existing] = await query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing) {
      throw badRequest("A user with this email already exists");
    }

    const [role] = await query("SELECT id FROM roles WHERE name = ?", [roleName]);
    if (!role) {
      throw badRequest(`Role ${roleName} does not exist`);
    }

    if (branchId && businessId) {
      const [branch] = await query("SELECT id FROM branches WHERE id = ? AND business_id = ?", [branchId, businessId]);
      if (!branch) {
        throw badRequest("Branch does not belong to this business");
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [businessId, role.id, branchId || null, fullName.trim(), email.trim().toLowerCase(), passwordHash]
    );

    // Automatically seed user_permissions based on business role template or defaults, bounded by package allowed pages
    if (businessId && ["manager", "cashier"].includes(roleName)) {
      const subInfo = await fetchUserSubscription(businessId, branchId);
      const allowedPages = subInfo.allowedPages;
      const initialPerms = await resolveUserPermissions(null, businessId, roleName, allowedPages);

      await withTransaction(async (conn) => {
        for (const p of initialPerms) {
          await conn.execute(
            `INSERT INTO user_permissions (user_id, page_key, action_key, is_allowed)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)`,
            [result.insertId, p.page_key, p.action_key, p.is_allowed ? 1 : 0]
          );
        }
      });
    }

    const [newUser] = await query(
      `SELECT u.id, u.full_name, u.email, u.business_id, u.branch_id, u.is_active, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newUser);
  })
);

adminRouter.put(
  "/users/:id",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const [targetUser] = await query(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = :id`,
      { id: req.params.id }
    );
    if (!targetUser) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (targetUser.is_break_glass) {
      const error = new Error("Emergency break-glass accounts cannot be modified via standard user interfaces");
      error.status = 403;
      throw error;
    }

    if (req.user.role_name !== "top_admin" && targetUser.business_id !== req.user.business_id) {
      const error = new Error("Cannot edit users outside your business");
      error.status = 403;
      throw error;
    }

    const { fullName, branchId, isActive, password, roleName, email } = req.body;
    const updates = [];
    const params = { id: targetUser.id };

    if (email !== undefined && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        throw badRequest("Please enter a valid email address");
      }
      if (cleanEmail !== targetUser.email.toLowerCase()) {
        const [existing] = await query("SELECT id FROM users WHERE email = ? AND id != ?", [cleanEmail, targetUser.id]);
        if (existing) {
          throw badRequest(`A user with email '${cleanEmail}' already exists`);
        }
        updates.push("email = :email");
        params.email = cleanEmail;
      }
    }

    if (fullName !== undefined) {
      updates.push("full_name = :fullName");
      params.fullName = fullName.trim();
    }
    if (branchId !== undefined) {
      updates.push("branch_id = :branchId");
      params.branchId = branchId || null;
    }
    if (isActive !== undefined) {
      const targetActive = isActive ? 1 : 0;
      if (targetActive === 0) {
        if (Number(targetUser.id) === Number(req.user.id)) {
          throw badRequest("You cannot deactivate your own user account.");
        }
        if (targetUser.role_name === "business_super_admin") {
          throw badRequest("Primary company administrator account is protected and cannot be deactivated.");
        }
      }
      updates.push("is_active = :isActive");
      params.isActive = targetActive;
    }
    if (password) {
      updates.push("password_hash = :passwordHash");
      params.passwordHash = await bcrypt.hash(password, 10);
    }
    if (roleName) {
      const [role] = await query("SELECT id FROM roles WHERE name = ?", [roleName]);
      if (role) {
        updates.push("role_id = :roleId");
        params.roleId = role.id;
      }
    }

    if (updates.length) {
      await query(`UPDATE users SET ${updates.join(", ")} WHERE id = :id`, params);
    }

    const [updated] = await query(
      `SELECT u.id, u.full_name, u.email, u.business_id, u.branch_id, u.is_active, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [targetUser.id]
    );

    res.json(updated);
  })
);

adminRouter.delete(
  "/users/:id",
  requireRole("top_admin", "business_super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { deactivateIfHasRecords = false } = req.body || {};

    const [targetUser] = await query(
      `SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
      [userId]
    );

    if (!targetUser) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (targetUser.is_break_glass) {
      const error = new Error("Emergency break-glass accounts cannot be deleted via standard user interfaces");
      error.status = 403;
      throw error;
    }

    if (req.user.role_name !== "top_admin" && targetUser.business_id !== req.user.business_id) {
      const error = new Error("Cannot delete users outside your business");
      error.status = 403;
      throw error;
    }

    if (targetUser.role_name === "top_admin") {
      throw badRequest("Cannot delete the TOP Administrator account");
    }

    if (targetUser.role_name === "business_super_admin") {
      throw badRequest("Primary company administrator account is protected and cannot be deleted.");
    }

    if (Number(targetUser.id) === Number(req.user.id)) {
      throw badRequest("You cannot delete your own user account.");
    }

    // Check for associated records
    const [sales] = await query("SELECT COUNT(*) AS count FROM sale_orders WHERE created_by = ?", [userId]);
    const [purchases] = await query("SELECT COUNT(*) AS count FROM purchase_orders WHERE created_by = ?", [userId]);
    const [payments] = await query("SELECT COUNT(*) AS count FROM payments WHERE created_by = ?", [userId]);
    const [cashRegisters] = await query(
      "SELECT COUNT(*) AS count FROM cash_register_sessions WHERE opened_by = ? OR closed_by = ? OR verified_by = ?",
      [userId, userId, userId]
    );
    const [repairs] = await query(
      "SELECT COUNT(*) AS count FROM repair_tickets WHERE assigned_technician_id = ? OR created_by = ?",
      [userId, userId]
    );

    const relatedCount =
      Number(sales?.count || 0) +
      Number(purchases?.count || 0) +
      Number(payments?.count || 0) +
      Number(cashRegisters?.count || 0) +
      Number(repairs?.count || 0);

    if (relatedCount > 0) {
      if (deactivateIfHasRecords || req.query.deactivate === "true") {
        await query("UPDATE users SET is_active = 0 WHERE id = ?", [userId]);
        return res.json({
          success: true,
          action: "deactivated",
          message: `Staff member '${targetUser.full_name}' was safely deactivated instead of deleted because they have ${relatedCount} associated financial and store records.`
        });
      }

      return res.status(409).json({
        error: `Cannot delete staff member '${targetUser.full_name}' because they have ${relatedCount} associated business records (sales, purchases, registers, or repairs). Please deactivate the account to preserve business audit history.`,
        hasRecords: true,
        relatedCount
      });
    }

    await withTransaction(async (connection) => {
      await connection.execute("DELETE FROM user_permissions WHERE user_id = ?", [userId]);
      await connection.execute("DELETE FROM users WHERE id = ?", [userId]);
      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "delete_user",
        entityType: "users",
        entityId: userId,
        details: { email: targetUser.email, fullName: targetUser.full_name }
      });
    });

    res.json({
      success: true,
      action: "deleted",
      message: `Staff member '${targetUser.full_name}' has been permanently deleted.`
    });
  })
);

// ==========================================
// 11. DELETED TRANSACTIONS AUDIT & RESTORATION
// ==========================================
adminRouter.get(
  "/deleted-transactions",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { search = "", type = "all", businessId = "", page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // 1. KPI Totals across all deleted records
    const [saleStats] = await query(`
      SELECT COUNT(*) AS total_count, COALESCE(SUM(total_amount), 0) AS total_volume
      FROM sale_orders WHERE is_deleted = 1
    `);
    const [purchaseStats] = await query(`
      SELECT COUNT(*) AS total_count, COALESCE(SUM(total_amount), 0) AS total_volume
      FROM purchase_orders WHERE is_deleted = 1
    `);
    const [expenseStats] = await query(`
      SELECT COUNT(*) AS total_count, COALESCE(SUM(amount), 0) AS total_volume
      FROM expenses WHERE is_deleted = 1
    `);

    const stats = {
      totalDeleted: Number(saleStats.total_count || 0) + Number(purchaseStats.total_count || 0) + Number(expenseStats.total_count || 0),
      voidedSalesCount: Number(saleStats.total_count || 0),
      voidedSalesAmount: Number(saleStats.total_volume || 0),
      voidedPurchasesCount: Number(purchaseStats.total_count || 0),
      voidedPurchasesAmount: Number(purchaseStats.total_volume || 0),
      voidedExpensesCount: Number(expenseStats.total_count || 0),
      voidedExpensesAmount: Number(expenseStats.total_volume || 0)
    };

    // Subqueries for union
    const subqueries = [];

    if (type === "all" || type === "sale") {
      let saleWhere = "so.is_deleted = 1";
      const saleParams = [];
      if (businessId) {
        saleWhere += " AND biz.id = ?";
        saleParams.push(businessId);
      }
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        saleWhere += " AND (so.invoice_number LIKE ? OR biz.name LIKE ? OR b.name LIKE ? OR so.deletion_reason LIKE ? OR u_del.full_name LIKE ?)";
        saleParams.push(term, term, term, term, term);
      }
      subqueries.push({
        sql: `
          SELECT
            'sale' AS transaction_type,
            so.id AS id,
            so.invoice_number AS reference_no,
            so.total_amount AS amount,
            so.sale_date AS transaction_date,
            so.deleted_at,
            so.deleted_by,
            so.deletion_reason,
            u_del.full_name AS deleted_by_name,
            u_del.email AS deleted_by_email,
            r_del.name AS deleted_by_role,
            b.id AS branch_id,
            b.name AS branch_name,
            b.code AS branch_code,
            biz.id AS business_id,
            biz.name AS business_name,
            biz.code AS business_code,
            p.name AS party_name,
            so.payment_method,
            so.created_at,
            (SELECT COUNT(*) FROM sale_order_items WHERE sale_order_id = so.id) AS item_count
          FROM sale_orders so
          JOIN branches b ON b.id = so.branch_id
          JOIN businesses biz ON biz.id = b.business_id
          LEFT JOIN users u_del ON u_del.id = so.deleted_by
          LEFT JOIN roles r_del ON r_del.id = u_del.role_id
          LEFT JOIN parties p ON p.id = so.customer_id
          WHERE ${saleWhere}
        `,
        params: saleParams
      });
    }

    if (type === "all" || type === "purchase") {
      let poWhere = "po.is_deleted = 1";
      const poParams = [];
      if (businessId) {
        poWhere += " AND biz.id = ?";
        poParams.push(businessId);
      }
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        poWhere += " AND (po.invoice_number LIKE ? OR biz.name LIKE ? OR b.name LIKE ? OR po.deletion_reason LIKE ? OR u_del.full_name LIKE ?)";
        poParams.push(term, term, term, term, term);
      }
      subqueries.push({
        sql: `
          SELECT
            'purchase' AS transaction_type,
            po.id AS id,
            po.invoice_number AS reference_no,
            po.total_amount AS amount,
            po.purchase_date AS transaction_date,
            po.deleted_at,
            po.deleted_by,
            po.deletion_reason,
            u_del.full_name AS deleted_by_name,
            u_del.email AS deleted_by_email,
            r_del.name AS deleted_by_role,
            b.id AS branch_id,
            b.name AS branch_name,
            b.code AS branch_code,
            biz.id AS business_id,
            biz.name AS business_name,
            biz.code AS business_code,
            p.name AS party_name,
            'N/A' AS payment_method,
            po.created_at,
            (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) AS item_count
          FROM purchase_orders po
          JOIN branches b ON b.id = po.branch_id
          JOIN businesses biz ON biz.id = b.business_id
          LEFT JOIN users u_del ON u_del.id = po.deleted_by
          LEFT JOIN roles r_del ON r_del.id = u_del.role_id
          LEFT JOIN parties p ON p.id = po.vendor_id
          WHERE ${poWhere}
        `,
        params: poParams
      });
    }

    if (type === "all" || type === "expense") {
      let expWhere = "e.is_deleted = 1";
      const expParams = [];
      if (businessId) {
        expWhere += " AND biz.id = ?";
        expParams.push(businessId);
      }
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        expWhere += " AND (e.title LIKE ? OR biz.name LIKE ? OR b.name LIKE ? OR e.deletion_reason LIKE ? OR u_del.full_name LIKE ?)";
        expParams.push(term, term, term, term, term);
      }
      subqueries.push({
        sql: `
          SELECT
            'expense' AS transaction_type,
            e.id AS id,
            e.title AS reference_no,
            e.amount AS amount,
            e.expense_date AS transaction_date,
            e.deleted_at,
            e.deleted_by,
            e.deletion_reason,
            u_del.full_name AS deleted_by_name,
            u_del.email AS deleted_by_email,
            r_del.name AS deleted_by_role,
            b.id AS branch_id,
            b.name AS branch_name,
            b.code AS branch_code,
            biz.id AS business_id,
            biz.name AS business_name,
            biz.code AS business_code,
            e.category AS party_name,
            'cash' AS payment_method,
            e.created_at,
            1 AS item_count
          FROM expenses e
          JOIN branches b ON b.id = e.branch_id
          JOIN businesses biz ON biz.id = b.business_id
          LEFT JOIN users u_del ON u_del.id = e.deleted_by
          LEFT JOIN roles r_del ON r_del.id = u_del.role_id
          WHERE ${expWhere}
        `,
        params: expParams
      });
    }

    if (subqueries.length === 0) {
      return res.json({ stats, transactions: [], pagination: { page: 1, limit: limitNum, total: 0, totalPages: 0 } });
    }

    const unionSql = subqueries.map((s) => `(${s.sql})`).join(" UNION ALL ");
    const unionParams = subqueries.flatMap((s) => s.params);

    // Total count of matching records
    const countSql = `SELECT COUNT(*) AS total FROM (${unionSql}) AS u_tbl`;
    const [totalRow] = unionParams.length > 0 ? await query(countSql, unionParams) : await query(countSql);
    const total = Number(totalRow?.total || 0);

    // Paginated results ordered by deleted_at DESC
    const paginatedSql = `
      SELECT * FROM (${unionSql}) AS u_tbl
      ORDER BY deleted_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    const transactions = unionParams.length > 0 ? await query(paginatedSql, unionParams) : await query(paginatedSql);

    res.json({
      stats,
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  })
);

adminRouter.get(
  "/deleted-transactions/:type/:id",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { type, id } = req.params;

    if (type === "sale") {
      const [sale] = await query(
        `SELECT so.*,
                b.name AS branch_name, b.code AS branch_code,
                biz.id AS business_id, biz.name AS business_name, biz.code AS business_code,
                p.name AS customer_name, p.phone AS customer_phone,
                u_del.full_name AS deleted_by_name, u_del.email AS deleted_by_email, r_del.name AS deleted_by_role,
                u_cre.full_name AS created_by_name, u_cre.email AS created_by_email
         FROM sale_orders so
         JOIN branches b ON b.id = so.branch_id
         JOIN businesses biz ON biz.id = b.business_id
         LEFT JOIN parties p ON p.id = so.customer_id
         LEFT JOIN users u_del ON u_del.id = so.deleted_by
         LEFT JOIN roles r_del ON r_del.id = u_del.role_id
         LEFT JOIN users u_cre ON u_cre.id = so.created_by
         WHERE so.id = ?`,
        [id]
      );
      if (!sale) {
        const error = new Error("Deleted sale order not found");
        error.status = 404;
        throw error;
      }
      const items = await query(
        `SELECT soi.*,
                mm.company, mm.model_name, mm.variant, mm.color, mm.storage,
                p.name AS product_name, p.sku AS product_sku,
                mu.imei
         FROM sale_order_items soi
         LEFT JOIN mobile_models mm ON mm.id = soi.model_id
         LEFT JOIN products p ON p.id = soi.product_id
         LEFT JOIN mobile_units mu ON mu.id = soi.mobile_unit_id
         WHERE soi.sale_order_id = ?`,
        [id]
      );
      return res.json({ transactionType: "sale", ...sale, items });
    }

    if (type === "purchase") {
      const [purchase] = await query(
        `SELECT po.*,
                b.name AS branch_name, b.code AS branch_code,
                biz.id AS business_id, biz.name AS business_name, biz.code AS business_code,
                p.name AS vendor_name, p.phone AS vendor_phone,
                u_del.full_name AS deleted_by_name, u_del.email AS deleted_by_email, r_del.name AS deleted_by_role,
                u_cre.full_name AS created_by_name, u_cre.email AS created_by_email
         FROM purchase_orders po
         JOIN branches b ON b.id = po.branch_id
         JOIN businesses biz ON biz.id = b.business_id
         LEFT JOIN parties p ON p.id = po.vendor_id
         LEFT JOIN users u_del ON u_del.id = po.deleted_by
         LEFT JOIN roles r_del ON r_del.id = u_del.role_id
         LEFT JOIN users u_cre ON u_cre.id = po.created_by
         WHERE po.id = ?`,
        [id]
      );
      if (!purchase) {
        const error = new Error("Deleted purchase order not found");
        error.status = 404;
        throw error;
      }
      const items = await query(
        `SELECT poi.*,
                mm.company, mm.model_name, mm.variant, mm.color, mm.storage,
                p.name AS product_name, p.sku AS product_sku,
                mu.imei
         FROM purchase_order_items poi
         LEFT JOIN mobile_models mm ON mm.id = poi.model_id
         LEFT JOIN products p ON p.id = poi.product_id
         LEFT JOIN mobile_units mu ON mu.id = poi.mobile_unit_id
         WHERE poi.purchase_order_id = ?`,
        [id]
      );
      return res.json({ transactionType: "purchase", ...purchase, items });
    }

    if (type === "expense") {
      const [expense] = await query(
        `SELECT e.*,
                b.name AS branch_name, b.code AS branch_code,
                biz.id AS business_id, biz.name AS business_name, biz.code AS business_code,
                u_del.full_name AS deleted_by_name, u_del.email AS deleted_by_email, r_del.name AS deleted_by_role,
                u_cre.full_name AS created_by_name, u_cre.email AS created_by_email
         FROM expenses e
         JOIN branches b ON b.id = e.branch_id
         JOIN businesses biz ON biz.id = b.business_id
         LEFT JOIN users u_del ON u_del.id = e.deleted_by
         LEFT JOIN roles r_del ON r_del.id = u_del.role_id
         LEFT JOIN users u_cre ON u_cre.id = e.created_by
         WHERE e.id = ?`,
        [id]
      );
      if (!expense) {
        const error = new Error("Deleted expense not found");
        error.status = 404;
        throw error;
      }
      return res.json({ transactionType: "expense", ...expense, items: [] });
    }

    throw badRequest("Invalid transaction type. Expected 'sale', 'purchase', or 'expense'");
  })
);

adminRouter.post(
  "/deleted-transactions/:type/:id/restore",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { type, id } = req.params;

    if (type === "sale") {
      const [sale] = await query("SELECT * FROM sale_orders WHERE id = ?", [id]);
      if (!sale) {
        const error = new Error("Sale order not found");
        error.status = 404;
        throw error;
      }
      if (!sale.is_deleted) {
        throw badRequest("This sale order is already active (not deleted)");
      }

      await withTransaction(async (connection) => {
        // Check if any mobile units in this sale have since been sold in another sale
        const [items] = await connection.execute(
          `SELECT soi.mobile_unit_id, mu.imei, mu.current_status, mu.sale_order_id
           FROM sale_order_items soi
           JOIN mobile_units mu ON mu.id = soi.mobile_unit_id
           WHERE soi.sale_order_id = ? AND soi.mobile_unit_id IS NOT NULL`,
          [sale.id]
        );

        for (const it of items) {
          if (it.current_status === "sold" && it.sale_order_id && Number(it.sale_order_id) !== Number(sale.id)) {
            throw badRequest(`Cannot restore sale: IMEI ${it.imei} is already sold in another sale order (#${it.sale_order_id})`);
          }
        }

        // Restore mobile units back to sold under this sale_order
        for (const it of items) {
          await connection.execute(
            `UPDATE mobile_units SET current_status = 'sold', sale_order_id = ? WHERE id = ?`,
            [sale.id, it.mobile_unit_id]
          );
        }

        // Re-activate sale order
        await connection.execute(
          `UPDATE sale_orders
           SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL
           WHERE id = ?`,
          [sale.id]
        );

        await createAuditLog(connection, {
          userId: req.user.id,
          actionType: "restore",
          entityType: "sale_order",
          entityId: sale.id,
          details: {
            restoredBy: req.user.email,
            invoiceNumber: sale.invoice_number,
            totalAmount: sale.total_amount
          }
        });
      });

      return res.json({ message: "Sale order restored successfully", id: sale.id, type: "sale" });
    }

    if (type === "purchase") {
      const [purchase] = await query("SELECT * FROM purchase_orders WHERE id = ?", [id]);
      if (!purchase) {
        const error = new Error("Purchase order not found");
        error.status = 404;
        throw error;
      }
      if (!purchase.is_deleted) {
        throw badRequest("This purchase order is already active (not deleted)");
      }

      await withTransaction(async (connection) => {
        // Re-activate cancelled units from this purchase order
        await connection.execute(
          `UPDATE mobile_units
           SET current_status = 'in_stock'
           WHERE purchase_order_id = ? AND current_status = 'cancelled'`,
          [purchase.id]
        );

        // Re-activate purchase order
        await connection.execute(
          `UPDATE purchase_orders
           SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL
           WHERE id = ?`,
          [purchase.id]
        );

        await createAuditLog(connection, {
          userId: req.user.id,
          actionType: "restore",
          entityType: "purchase_order",
          entityId: purchase.id,
          details: {
            restoredBy: req.user.email,
            invoiceNumber: purchase.invoice_number,
            totalAmount: purchase.total_amount
          }
        });
      });

      return res.json({ message: "Purchase order restored successfully", id: purchase.id, type: "purchase" });
    }

    if (type === "expense") {
      const [expense] = await query("SELECT * FROM expenses WHERE id = ?", [id]);
      if (!expense) {
        const error = new Error("Expense not found");
        error.status = 404;
        throw error;
      }
      if (!expense.is_deleted) {
        throw badRequest("This expense is already active (not deleted)");
      }

      await withTransaction(async (connection) => {
        await connection.execute(
          `UPDATE expenses
           SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL
           WHERE id = ?`,
          [expense.id]
        );

        await createAuditLog(connection, {
          userId: req.user.id,
          actionType: "restore",
          entityType: "expense",
          entityId: expense.id,
          details: {
            restoredBy: req.user.email,
            title: expense.title,
            amount: expense.amount
          }
        });
      });

      return res.json({ message: "Expense restored successfully", id: expense.id, type: "expense" });
    }

    throw badRequest("Invalid transaction type. Expected 'sale', 'purchase', or 'expense'");
  })
);

// ==========================================
// 10. BREAK-GLASS EMERGENCY RECOVERY & AUDIT
// ==========================================

adminRouter.post(
  "/emergency/contain-account",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { targetUserId, reason } = req.body;
    if (!targetUserId) {
      throw badRequest("targetUserId is required");
    }

    const [target] = await query("SELECT * FROM users WHERE id = ?", [targetUserId]);
    if (!target) {
      return res.status(404).json({ message: "Target account not found" });
    }

    if (target.is_break_glass) {
      return res.status(403).json({ message: "Cannot contain emergency break-glass account" });
    }

    // 1. Deactivate account & lock for 30 days
    await query(
      "UPDATE users SET is_active = 0, locked_until = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?",
      [targetUserId]
    );

    // 2. Kill all active sessions immediately
    const { revokeAllSessions } = await import("../../services/sessionManager.js");
    await revokeAllSessions(targetUserId, "break_glass_containment");

    // 3. Write immutable audit log
    await query(
      `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, 'break_glass_contain_account', 'user', ?, ?, ?, ?)`,
      [
        req.user.id,
        targetUserId,
        JSON.stringify({ reason: reason || "Suspected compromise", containedBy: req.user.email }),
        req.ip || "127.0.0.1",
        req.headers["user-agent"] || "BreakGlass Admin"
      ]
    );

    res.json({
      success: true,
      message: `Account ${target.email} has been contained and all active sessions revoked.`
    });
  })
);

adminRouter.post(
  "/emergency/recover-account",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { targetUserId, newPassword, correctEmail } = req.body;

    if (!targetUserId || !newPassword) {
      throw badRequest("targetUserId and newPassword are required");
    }
    if (newPassword.length < 12) {
      throw badRequest("New password must be at least 12 characters in length");
    }

    const [target] = await query("SELECT * FROM users WHERE id = ?", [targetUserId]);
    if (!target) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Bcrypt cost 12
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const finalEmail = correctEmail && isValidEmail(correctEmail) ? correctEmail.trim().toLowerCase() : target.email;

    // Reset password, re-enable account, wipe old MFA and recovery codes, force password change / MFA enrollment
    await query(
      `UPDATE users
       SET password_hash = ?,
           email = ?,
           is_active = 1,
           locked_until = NULL,
           failed_login_attempts = 0,
           mfa_enabled = 0,
           mfa_secret = NULL,
           must_change_password = 1
       WHERE id = ?`,
      [passwordHash, finalEmail, targetUserId]
    );

    // Wipe old recovery codes
    await query("DELETE FROM user_recovery_codes WHERE user_id = ?", [targetUserId]);

    // Revoke all sessions
    const { revokeAllSessions } = await import("../../services/sessionManager.js");
    await revokeAllSessions(targetUserId, "break_glass_recovery");

    // Write immutable audit log
    await query(
      `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, 'break_glass_recover_account', 'user', ?, ?, ?, ?)`,
      [
        req.user.id,
        targetUserId,
        JSON.stringify({
          recoveredBy: req.user.email,
          previousEmail: target.email,
          newEmail: finalEmail,
          mfaWiped: true,
          mustChangePassword: true
        }),
        req.ip || "127.0.0.1",
        req.headers["user-agent"] || "BreakGlass Admin"
      ]
    );

    res.json({
      success: true,
      message: `Account ${finalEmail} has been recovered with a new password and reactivated. Old MFA and sessions were wiped. Admin must configure fresh MFA upon next login.`
    });
  })
);

adminRouter.get(
  "/security/audit-trail",
  requireRole("top_admin"),
  asyncHandler(async (_req, res) => {
    const logs = await query(
      `SELECT a.id, a.user_id, a.action_type, a.entity_type, a.entity_id, a.details,
              a.ip_address, a.user_agent, a.created_at,
              u.full_name AS user_name, u.email AS user_email, r.name AS role_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       ORDER BY a.id DESC
       LIMIT 100`
    );
    res.json(logs);
  })
);

adminRouter.get(
  "/security/alerts",
  requireRole("top_admin"),
  asyncHandler(async (_req, res) => {
    const alerts = await query(
      `SELECT * FROM security_alerts ORDER BY id DESC LIMIT 50`
    );
    res.json(alerts);
  })
);

// ==========================================
// 12. USER LOGIN ACTIVITY LOGS (SAAS ADMIN PANEL)
// ==========================================
adminRouter.get(
  "/login-logs",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { page, limit, search, status, businessId, role, startDate, endDate } = req.query;
    const result = await getLoginLogs({
      page,
      limit,
      search,
      status,
      businessId,
      role,
      startDate,
      endDate
    });
    res.json(result);
  })
);

adminRouter.get(
  "/login-logs/stats",
  requireRole("top_admin"),
  asyncHandler(async (_req, res) => {
    const stats = await getLoginLogsSummary();
    res.json(stats);
  })
);

// ==========================================
// 13. GLOBAL PLATFORM SETTINGS & WEBSITE LAYOUT
// ==========================================
adminRouter.get(
  "/platform-settings/layout",
  requireRole("top_admin"),
  asyncHandler(async (_req, res) => {
    try {
      const rows = await query(
        `SELECT ps.setting_key, ps.setting_value, ps.updated_at, ps.updated_by,
                u.full_name AS changer_name, u.email AS changer_email
         FROM platform_settings ps
         LEFT JOIN users u ON u.id = ps.updated_by
         WHERE ps.setting_key = 'active_layout'`
      );
      if (!rows.length) {
        return res.json({
          active_layout: "classic",
          updated_at: null,
          changer_name: null,
          changer_email: null
        });
      }
      res.json({
        active_layout: rows[0].setting_value,
        updated_at: rows[0].updated_at,
        changer_name: rows[0].changer_name,
        changer_email: rows[0].changer_email
      });
    } catch (err) {
      res.json({
        active_layout: "classic",
        error: err.message
      });
    }
  })
);

adminRouter.put(
  "/platform-settings/layout",
  requireRole("top_admin"),
  asyncHandler(async (req, res) => {
    const { layout } = req.body;
    if (!layout || !["classic", "modern_compact", "midnight_executive"].includes(layout)) {
      return res.status(400).json({
        message: "Invalid layout choice. Allowed values are 'classic', 'modern_compact', and 'midnight_executive'."
      });
    }

    // Get previous layout for audit logging
    const prevRows = await query(
      "SELECT setting_value FROM platform_settings WHERE setting_key = 'active_layout'"
    );
    const prevLayout = prevRows?.[0]?.setting_value || "classic";

    await query(
      `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
       VALUES ('active_layout', ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
      [layout, req.user.id]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, 'platform_layout_changed', 'platform_settings', 0, ?, ?, ?)`,
      [
        req.user.id,
        JSON.stringify({
          from: prevLayout,
          to: layout,
          changedBy: req.user.email,
          timestamp: new Date().toISOString()
        }),
        req.ip || "::ffff:127.0.0.1",
        req.headers["user-agent"] || null
      ]
    );

    res.json({
      success: true,
      active_layout: layout,
      message: `Platform layout successfully updated to '${layout === "modern_compact" ? "Modern Compact" : "Classic"}'.`
    });
  })
);



