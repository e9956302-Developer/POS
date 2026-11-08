import { Router } from "express";
import { query, withTransaction } from "../../db/pool.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { assertBranchAccess, isBusinessAdmin, requirePermission } from "../../middleware/auth.js";

export const partnersRouter = Router();

partnersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const partners = await query(
      "SELECT * FROM partners WHERE business_id = ? ORDER BY name ASC",
      [req.user.business_id]
    );

    const shares = await query(
      `SELECT pbs.*, b.name AS branch_name
       FROM partner_branch_shares pbs
       JOIN branches b ON b.id = pbs.branch_id
       WHERE pbs.business_id = ?`,
      [req.user.business_id]
    );

    const capitalAggregates = await query(
      `SELECT 
         partner_id,
         COALESCE(SUM(CASE WHEN transaction_type = 'capital_injection' THEN amount ELSE 0 END), 0) AS total_capital_injected,
         COALESCE(SUM(CASE WHEN transaction_type = 'dividend_payout' THEN amount ELSE 0 END), 0) AS total_dividends_paid,
         COALESCE(SUM(CASE WHEN transaction_type = 'drawing' THEN amount ELSE 0 END), 0) AS total_drawings,
         COALESCE(SUM(CASE WHEN transaction_type = 'capital_withdrawal' THEN amount ELSE 0 END), 0) AS total_capital_withdrawn,
         COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) AS net_capital_balance
       FROM partner_transactions
       WHERE business_id = ?
       GROUP BY partner_id`,
      [req.user.business_id]
    );

    const result = partners.map((p) => {
      const cap = capitalAggregates.find((c) => c.partner_id === p.id) || {};
      return {
        ...p,
        branchShares: shares.filter((s) => s.partner_id === p.id),
        totalCapitalInjected: Number(cap.total_capital_injected || 0),
        totalDividendsPaid: Number(cap.total_dividends_paid || 0),
        totalDrawings: Number(cap.total_drawings || 0),
        totalCapitalWithdrawn: Number(cap.total_capital_withdrawn || 0),
        netCapitalBalance: Number(cap.net_capital_balance || 0)
      };
    });

    res.json(result);
  })
);

partnersRouter.post(
  "/",
  requirePermission("admin"),
  asyncHandler(async (req, res) => {
    if (!isBusinessAdmin(req.user)) {
      const error = new Error("Only business admins can manage partners");
      error.status = 403;
      throw error;
    }

    const { name, phone, cnic } = req.body;
    if (!name || !name.trim()) {
      throw badRequest("Partner name is required");
    }

    const result = await query(
      "INSERT INTO partners (business_id, name, phone, cnic, is_active) VALUES (?, ?, ?, ?, 1)",
      [req.user.business_id, name.trim(), phone || null, cnic || null]
    );

    const [partner] = await query("SELECT * FROM partners WHERE id = ?", [result.insertId]);
    res.status(201).json(partner);
  })
);

partnersRouter.put(
  "/:id",
  requirePermission("admin"),
  asyncHandler(async (req, res) => {
    if (!isBusinessAdmin(req.user)) {
      const error = new Error("Only business admins can manage partners");
      error.status = 403;
      throw error;
    }

    const [partner] = await query(
      "SELECT id FROM partners WHERE id = ? AND business_id = ?",
      [req.params.id, req.user.business_id]
    );
    if (!partner) {
      const error = new Error("Partner not found");
      error.status = 404;
      throw error;
    }

    const { name, phone, cnic, isActive } = req.body;
    const updates = [];
    const params = { id: req.params.id, businessId: req.user.business_id };

    if (name !== undefined) {
      updates.push("name = :name");
      params.name = name.trim();
    }
    if (phone !== undefined) {
      updates.push("phone = :phone");
      params.phone = phone || null;
    }
    if (cnic !== undefined) {
      updates.push("cnic = :cnic");
      params.cnic = cnic || null;
    }
    if (isActive !== undefined) {
      updates.push("is_active = :isActive");
      params.isActive = isActive ? 1 : 0;
    }

    if (updates.length) {
      await query(`UPDATE partners SET ${updates.join(", ")} WHERE id = :id AND business_id = :businessId`, params);
    }

    const [updated] = await query("SELECT * FROM partners WHERE id = ?", [req.params.id]);
    res.json(updated);
  })
);

// --- Branch Shares Management ---
partnersRouter.get(
  "/branches/:branchId/shares",
  asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    await assertBranchAccess(req.user, branchId);

    const shares = await query(
      `SELECT p.id AS partner_id, p.name AS partner_name,
              COALESCE(pbs.share_percentage, 0) AS share_percentage
       FROM partners p
       LEFT JOIN partner_branch_shares pbs
         ON pbs.partner_id = p.id AND pbs.branch_id = :branchId
       WHERE p.business_id = :businessId AND p.is_active = 1
       ORDER BY p.name ASC`,
      { branchId, businessId: req.user.business_id }
    );

    const totalPercentage = shares.reduce((sum, item) => sum + Number(item.share_percentage || 0), 0);
    res.json({ branchId: Number(branchId), shares, totalPercentage });
  })
);

partnersRouter.put(
  "/branches/:branchId/shares",
  requirePermission("admin"),
  asyncHandler(async (req, res) => {
    if (!isBusinessAdmin(req.user)) {
      const error = new Error("Only business admins can set partner shares");
      error.status = 403;
      throw error;
    }

    const { branchId } = req.params;
    const { shares = [] } = req.body;
    await assertBranchAccess(req.user, branchId);

    // Validate that the total sum of share percentages equals exactly 100% (or 0 if resetting)
    const total = shares.reduce((sum, s) => sum + Number(s.sharePercentage || 0), 0);
    if (shares.length > 0 && Math.abs(total - 100.0) > 0.01 && total !== 0) {
      throw badRequest(`Total branch dividend share percentage must equal 100% (currently ${total.toFixed(2)}%)`);
    }

    await withTransaction(async (connection) => {
      await connection.execute(
        "DELETE FROM partner_branch_shares WHERE business_id = ? AND branch_id = ?",
        [req.user.business_id, branchId]
      );

      for (const share of shares) {
        const pct = Number(share.sharePercentage || 0);
        if (pct > 0) {
          await connection.execute(
            `INSERT INTO partner_branch_shares
             (business_id, branch_id, partner_id, share_percentage)
             VALUES (?, ?, ?, ?)`,
            [req.user.business_id, branchId, share.partnerId, pct]
          );
        }
      }
    });

    const updatedShares = await query(
      `SELECT pbs.*, p.name AS partner_name
       FROM partner_branch_shares pbs
       JOIN partners p ON p.id = pbs.partner_id
       WHERE pbs.branch_id = ? AND pbs.business_id = ?`,
      [branchId, req.user.business_id]
    );

    res.json({ branchId: Number(branchId), shares: updatedShares, totalPercentage: total });
  })
);

partnersRouter.get(
  "/branch-equity-overview",
  asyncHandler(async (req, res) => {
    const branches = await query(
      "SELECT id, name, code, address FROM branches WHERE business_id = ? ORDER BY name ASC",
      [req.user.business_id]
    );

    const allShares = await query(
      `SELECT pbs.*, p.name AS partner_name, p.phone, p.cnic
       FROM partner_branch_shares pbs
       JOIN partners p ON p.id = pbs.partner_id
       WHERE pbs.business_id = ? AND p.is_active = 1
       ORDER BY pbs.share_percentage DESC`,
      [req.user.business_id]
    );

    const result = branches.map((b) => {
      const branchShares = allShares.filter((s) => s.branch_id === b.id);
      const totalPct = branchShares.reduce((sum, s) => sum + Number(s.share_percentage || 0), 0);
      return {
        ...b,
        shares: branchShares,
        totalPercentage: Number(totalPct.toFixed(2)),
        isConfigured: Math.abs(totalPct - 100) < 0.01
      };
    });

    res.json(result);
  })
);

// --- Voucher Number Generator Helper ---
async function generateVoucherNumber(connection, businessId, type) {
  const prefixMap = {
    capital_injection: "CAP",
    dividend_payout: "DIV",
    drawing: "DRW",
    capital_withdrawal: "RET"
  };
  const prefix = prefixMap[type] || "VCH";
  const year = new Date().getFullYear();
  const searchPattern = `${prefix}-${year}-%`;

  const [rows] = await connection.execute(
    `SELECT voucher_number 
     FROM partner_transactions 
     WHERE business_id = ? AND voucher_number LIKE ? 
     ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [businessId, searchPattern]
  );

  let seq = 1;
  if (rows && rows.length > 0 && rows[0].voucher_number) {
    const parts = rows[0].voucher_number.split("-");
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      seq = lastNum + 1;
    }
  }

  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

// --- Partner Capital Ledger / Transactions ---
partnersRouter.get(
  "/:id/transactions",
  asyncHandler(async (req, res) => {
    const partnerId = req.params.id;
    const [partner] = await query(
      "SELECT * FROM partners WHERE id = ? AND business_id = ?",
      [partnerId, req.user.business_id]
    );
    if (!partner) {
      const error = new Error("Partner not found");
      error.status = 404;
      throw error;
    }

    const { branchId, from, to, type } = req.query;
    let sql = `
      SELECT pt.*, b.name AS branch_name, b.code AS branch_code, u.full_name AS created_by_name
      FROM partner_transactions pt
      JOIN branches b ON b.id = pt.branch_id
      LEFT JOIN users u ON u.id = pt.created_by
      WHERE pt.partner_id = :partnerId AND pt.business_id = :businessId
    `;
    const params = { partnerId, businessId: req.user.business_id };

    if (branchId && branchId !== "all") {
      sql += " AND pt.branch_id = :branchId";
      params.branchId = branchId;
    }
    if (type && type !== "all") {
      sql += " AND pt.transaction_type = :type";
      params.type = type;
    }
    if (from) {
      sql += " AND pt.transaction_date >= :from";
      params.from = from;
    }
    if (to) {
      sql += " AND pt.transaction_date <= :to";
      params.to = to;
    }

    sql += " ORDER BY pt.transaction_date ASC, pt.id ASC";

    const rows = await query(sql, params);

    // Compute running balance
    let runningBalance = 0;
    let totalInjected = 0;
    let totalDividends = 0;
    let totalDrawings = 0;
    let totalWithdrawn = 0;

    const transactions = rows.map((r) => {
      const amt = Number(r.amount || 0);
      if (r.direction === "in") {
        runningBalance += amt;
      } else {
        runningBalance -= amt;
      }

      if (r.transaction_type === "capital_injection") totalInjected += amt;
      else if (r.transaction_type === "dividend_payout") totalDividends += amt;
      else if (r.transaction_type === "drawing") totalDrawings += amt;
      else if (r.transaction_type === "capital_withdrawal") totalWithdrawn += amt;

      return {
        ...r,
        amount: amt,
        running_balance: runningBalance
      };
    });

    res.json({
      partner,
      transactions: transactions.reverse(), // most recent first for display
      summary: {
        totalInjected,
        totalDividends,
        totalDrawings,
        totalWithdrawn,
        currentBalance: runningBalance
      }
    });
  })
);

// --- Record Partner Transaction (Deposit / Drawing / Payout) ---
partnersRouter.post(
  "/:id/transactions",
  requirePermission("admin"),
  asyncHandler(async (req, res) => {
    if (!isBusinessAdmin(req.user)) {
      const error = new Error("Only business admins can record partner transactions");
      error.status = 403;
      throw error;
    }

    const partnerId = req.params.id;
    const [partner] = await query(
      "SELECT * FROM partners WHERE id = ? AND business_id = ?",
      [partnerId, req.user.business_id]
    );
    if (!partner) {
      const error = new Error("Partner not found");
      error.status = 404;
      throw error;
    }

    const {
      branchId,
      transactionType,
      amount,
      paymentMethod = "cash",
      transactionDate,
      periodLabel,
      referenceDetails,
      notes
    } = req.body;

    const validTypes = ["capital_injection", "dividend_payout", "drawing", "capital_withdrawal"];
    if (!transactionType || !validTypes.includes(transactionType)) {
      throw badRequest(`Invalid transaction type. Must be one of: ${validTypes.join(", ")}`);
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw badRequest("Transaction amount must be greater than zero");
    }

    if (!branchId) {
      throw badRequest("Branch ID is required");
    }
    await assertBranchAccess(req.user, branchId);

    const direction = transactionType === "capital_injection" ? "in" : "out";
    const date = transactionDate || new Date().toISOString().slice(0, 10);

    let voucherNumber;
    let insertId;

    await withTransaction(async (connection) => {
      voucherNumber = await generateVoucherNumber(connection, req.user.business_id, transactionType);

      const [result] = await connection.execute(
        `INSERT INTO partner_transactions (
           business_id, branch_id, partner_id, transaction_type, direction,
           amount, payment_method, transaction_date, voucher_number,
           period_label, reference_details, notes, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.business_id,
          branchId,
          partnerId,
          transactionType,
          direction,
          numAmount,
          paymentMethod,
          date,
          voucherNumber,
          periodLabel || null,
          referenceDetails || null,
          notes || null,
          req.user.id
        ]
      );
      insertId = result.insertId;
    });

    const [created] = await query(
      `SELECT pt.*, b.name AS branch_name, b.code AS branch_code, p.name AS partner_name, p.phone AS partner_phone, p.cnic AS partner_cnic
       FROM partner_transactions pt
       JOIN branches b ON b.id = pt.branch_id
       JOIN partners p ON p.id = pt.partner_id
       WHERE pt.id = ?`,
      [insertId]
    );

    res.status(201).json(created);
  })
);

// --- Partner Capital Summary ---
partnersRouter.get(
  "/:id/capital-summary",
  asyncHandler(async (req, res) => {
    const partnerId = req.params.id;
    const [partner] = await query(
      "SELECT * FROM partners WHERE id = ? AND business_id = ?",
      [partnerId, req.user.business_id]
    );
    if (!partner) {
      const error = new Error("Partner not found");
      error.status = 404;
      throw error;
    }

    const [totals] = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN transaction_type = 'capital_injection' THEN amount ELSE 0 END), 0) AS total_injected,
         COALESCE(SUM(CASE WHEN transaction_type = 'dividend_payout' THEN amount ELSE 0 END), 0) AS total_dividends_paid,
         COALESCE(SUM(CASE WHEN transaction_type = 'drawing' THEN amount ELSE 0 END), 0) AS total_drawings,
         COALESCE(SUM(CASE WHEN transaction_type = 'capital_withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawn,
         COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) AS net_balance
       FROM partner_transactions
       WHERE partner_id = ? AND business_id = ?`,
      [partnerId, req.user.business_id]
    );

    const branchBreakdown = await query(
      `SELECT 
         pt.branch_id,
         b.name AS branch_name,
         b.code AS branch_code,
         COALESCE(SUM(CASE WHEN pt.transaction_type = 'capital_injection' THEN pt.amount ELSE 0 END), 0) AS branch_injected,
         COALESCE(SUM(CASE WHEN pt.transaction_type = 'dividend_payout' THEN pt.amount ELSE 0 END), 0) AS branch_dividends_paid,
         COALESCE(SUM(CASE WHEN pt.transaction_type = 'drawing' THEN pt.amount ELSE 0 END), 0) AS branch_drawings,
         COALESCE(SUM(CASE WHEN pt.direction = 'in' THEN pt.amount ELSE -pt.amount END), 0) AS branch_balance
       FROM partner_transactions pt
       JOIN branches b ON b.id = pt.branch_id
       WHERE pt.partner_id = ? AND pt.business_id = ?
       GROUP BY pt.branch_id, b.name, b.code`,
      [partnerId, req.user.business_id]
    );

    res.json({
      partner,
      totals: {
        totalInjected: Number(totals.total_injected || 0),
        totalDividendsPaid: Number(totals.total_dividends_paid || 0),
        totalDrawings: Number(totals.total_drawings || 0),
        totalWithdrawn: Number(totals.total_withdrawn || 0),
        netBalance: Number(totals.net_balance || 0)
      },
      branchBreakdown
    });
  })
);

// --- 1-Click Dividend Disbursement for a Certified Period ---
partnersRouter.post(
  "/branches/:branchId/disburse-dividends",
  requirePermission("admin"),
  asyncHandler(async (req, res) => {
    if (!isBusinessAdmin(req.user)) {
      const error = new Error("Only business admins can disburse dividends");
      error.status = 403;
      throw error;
    }

    const { branchId } = req.params;
    await assertBranchAccess(req.user, branchId);

    const { periodLabel, distributions = [], transactionDate } = req.body;
    if (!periodLabel || !periodLabel.trim()) {
      throw badRequest("Period label is required (e.g. 'October 2026')");
    }

    if (!Array.isArray(distributions) || distributions.length === 0) {
      throw badRequest("At least one dividend distribution must be provided");
    }

    const date = transactionDate || new Date().toISOString().slice(0, 10);
    const createdVouchers = [];

    await withTransaction(async (connection) => {
      for (const dist of distributions) {
        const amt = Number(dist.amount || 0);
        if (amt <= 0) continue;

        // Check if already paid for this partner, branch, and period
        const [existing] = await connection.execute(
          `SELECT id, voucher_number 
           FROM partner_transactions 
           WHERE business_id = ? AND branch_id = ? AND partner_id = ? 
             AND transaction_type = 'dividend_payout' AND period_label = ?`,
          [req.user.business_id, branchId, dist.partnerId, periodLabel.trim()]
        );

        if (existing && existing.length > 0) {
          throw badRequest(
            `Dividend for partner ID ${dist.partnerId} for period '${periodLabel}' has already been disbursed (Voucher #${existing[0].voucher_number})`
          );
        }

        const voucherNumber = await generateVoucherNumber(connection, req.user.business_id, "dividend_payout");

        const [insertResult] = await connection.execute(
          `INSERT INTO partner_transactions (
             business_id, branch_id, partner_id, transaction_type, direction,
             amount, payment_method, transaction_date, voucher_number,
             period_label, reference_details, notes, created_by
           ) VALUES (?, ?, ?, 'dividend_payout', 'out', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.business_id,
            branchId,
            dist.partnerId,
            amt,
            dist.paymentMethod || "cash",
            date,
            voucherNumber,
            periodLabel.trim(),
            dist.referenceDetails || `Period ${periodLabel} Profit Payout`,
            dist.notes || `Dividend disbursement for ${periodLabel}`,
            req.user.id
          ]
        );

        createdVouchers.push({
          id: insertResult.insertId,
          partnerId: dist.partnerId,
          amount: amt,
          voucherNumber,
          periodLabel: periodLabel.trim(),
          paymentMethod: dist.paymentMethod || "cash"
        });
      }
    });

    res.status(201).json({
      message: `Successfully disbursed ${createdVouchers.length} dividend payment voucher(s)`,
      vouchers: createdVouchers
    });
  })
);

