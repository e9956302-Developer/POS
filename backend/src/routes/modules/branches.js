import { Router } from "express";
import { query, withTransaction } from "../../db/pool.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { businessScopeCondition, businessScopeParams, isBusinessAdmin, requirePermission } from "../../middleware/auth.js";

export const branchesRouter = Router();

branchesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT b.*,
              bs.id AS subscription_id,
              bs.status AS subscription_status,
              bs.current_period_ends_on,
              bs.trial_ends_on,
              bs.grace_ends_on,
              sp.id AS plan_id,
              COALESCE(sp.name, 'Starter Monthly') AS plan_name
       FROM branches b
       LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
       LEFT JOIN subscription_plans sp ON sp.id = bs.plan_id
       WHERE ${businessScopeCondition(req.user, "b")}
       ORDER BY b.name`,
      businessScopeParams(req.user)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const branchesWithHealth = rows.map((b) => {
      const expiryStr = b.current_period_ends_on || b.trial_ends_on;
      let effectiveStatus = b.subscription_status || "expired";
      let daysLeft = null;
      let isExpired = false;
      let isGrace = false;
      let isExpiringSoon = false;

      // Edge case: Branch with NO subscription record at all = treated as Expired (blocked), never as Active.
      if (!b.subscription_id) {
        effectiveStatus = "expired";
        isExpired = true;
      } else if (expiryStr) {
        const expiry = new Date(expiryStr);
        expiry.setHours(0, 0, 0, 0);
        daysLeft = Math.round((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) {
          if (b.grace_ends_on) {
            const grace = new Date(b.grace_ends_on);
            grace.setHours(0, 0, 0, 0);
            if (today <= grace) {
              effectiveStatus = "grace";
              isGrace = true;
            } else {
              effectiveStatus = "expired";
              isExpired = true;
            }
          } else {
            effectiveStatus = "expired";
            isExpired = true;
          }
        } else if (daysLeft <= 7) {
          isExpiringSoon = true;
        }
      }

      if (b.subscription_status === "expired" || b.subscription_status === "cancelled" || b.subscription_status === "suspended") {
        effectiveStatus = "expired";
        isExpired = true;
      } else if (b.subscription_status === "grace" && !isExpired) {
        effectiveStatus = "grace";
        isGrace = true;
      }

      return {
        ...b,
        effective_status: effectiveStatus,
        days_left: daysLeft,
        is_expired: isExpired,
        is_grace: isGrace,
        is_expiring_soon: isExpiringSoon
      };
    });

    res.json(branchesWithHealth);
  })
);

branchesRouter.post(
  "/",
  requirePermission("branches", "create"),
  asyncHandler(async (req, res) => {
    if (!isBusinessAdmin(req.user)) {
      const error = new Error("Only business admins can create branches");
      error.status = 403;
      throw error;
    }

    const { name, code, address } = req.body;
    if (!name || !name.trim()) {
      throw badRequest("Branch name is required");
    }

    const [biz] = await query("SELECT id, code FROM businesses WHERE id = ?", [req.user.business_id]);
    const companyCode = biz?.code || "BR";

    let cleanCode = "";
    if (code && code.trim()) {
      const trimmed = code.trim().toUpperCase();
      cleanCode = trimmed.startsWith(`${companyCode}-`) ? trimmed : `${companyCode}-${trimmed}`;
    } else {
      const existingBranches = await query("SELECT id FROM branches WHERE business_id = ?", [req.user.business_id]);
      cleanCode = `${companyCode}-${String(existingBranches.length + 1).padStart(2, "0")}`;
    }

    // Ensure uniqueness if collision occurs
    let candidate = cleanCode;
    let counter = 1;
    while (true) {
      const [existing] = await query("SELECT id FROM branches WHERE code = ?", [candidate]);
      if (!existing) {
        cleanCode = candidate;
        break;
      }
      candidate = `${cleanCode}-${counter}`;
      counter++;
    }

    const created = await withTransaction(async (connection) => {
      const [branchResult] = await connection.execute(
        `INSERT INTO branches (business_id, name, code, address) VALUES (?, ?, ?, ?)`,
        [req.user.business_id, name.trim(), cleanCode, address || null]
      );

      const branchId = branchResult.insertId;

      // Find standard plan for this business
      const [existingSubs] = await connection.execute(
        `SELECT plan_id FROM branch_subscriptions WHERE business_id = ? ORDER BY id ASC LIMIT 1`,
        [req.user.business_id]
      );
      const planId = existingSubs[0]?.plan_id || 1;

      await connection.execute(
        `INSERT INTO branch_subscriptions
         (business_id, branch_id, plan_id, status, trial_ends_on, grace_ends_on)
         SELECT ?, ?, sp.id, 'trialing', DATE_ADD(CURDATE(), INTERVAL sp.trial_days DAY), DATE_ADD(CURDATE(), INTERVAL (sp.trial_days + sp.grace_days) DAY)
         FROM subscription_plans sp
         WHERE sp.id = ? AND sp.is_active = 1`,
        [req.user.business_id, branchId, planId]
      );

      return branchId;
    });

    const [newBranch] = await query("SELECT * FROM branches WHERE id = ?", [created]);
    res.status(201).json(newBranch);
  })
);

branchesRouter.put(
  "/:id",
  requirePermission("branches", "edit"),
  asyncHandler(async (req, res) => {
    const { name, code, address } = req.body;
    if (!name || !name.trim()) {
      throw badRequest("Branch name is required");
    }

    const [branch] = await query(
      "SELECT id, code, business_id FROM branches WHERE id = ? AND business_id = ?",
      [req.params.id, req.user.business_id]
    );

    if (!branch) {
      const error = new Error("Branch not found");
      error.status = 404;
      throw error;
    }

    if (code !== undefined && code.trim()) {
      const cleanCode = code.trim().toUpperCase();
      if (branch.code && branch.code.trim() && cleanCode !== branch.code.trim().toUpperCase()) {
        throw badRequest("Branch code cannot be modified once created");
      }
    }

    // Branch code is immutable once added to protect transactions, invoices, and stock integrity
    const updates = ["name = :name", "address = :address"];
    const params = { id: req.params.id, name: name.trim(), address: address || null };

    await query(`UPDATE branches SET ${updates.join(", ")} WHERE id = :id`, params);

    const [updated] = await query("SELECT * FROM branches WHERE id = ?", [req.params.id]);
    res.json(updated);
  })
);

branchesRouter.delete(
  "/:id",
  requirePermission("branches", "delete"),
  asyncHandler(async (req, res) => {
    const branchId = req.params.id;
    const [branch] = await query(
      "SELECT id, name, code FROM branches WHERE id = ? AND business_id = ?",
      [branchId, req.user.business_id]
    );

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
    const [staff] = await query("SELECT COUNT(*) AS count FROM users WHERE branch_id = ?", [branchId]);

    const totalRecords =
      Number(sales?.count || 0) +
      Number(purchases?.count || 0) +
      Number(expenses?.count || 0) +
      Number(units?.count || 0) +
      Number(staff?.count || 0);

    if (totalRecords > 0) {
      const error = new Error(
        `Cannot delete branch '${branch.name}' (${branch.code}) because it has ${totalRecords} associated records (sales, purchases, inventory, expenses, or staff). Branches with active data cannot be removed to maintain accounting integrity.`
      );
      error.status = 409;
      error.totalRecords = totalRecords;
      throw error;
    }

    await withTransaction(async (conn) => {
      await conn.execute("DELETE FROM branch_subscriptions WHERE branch_id = ?", [branchId]);
      await conn.execute("DELETE FROM branches WHERE id = ?", [branchId]);
    });

    res.json({ success: true, message: `Branch '${branch.name}' deleted successfully.` });
  })
);

