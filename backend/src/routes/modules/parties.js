import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { query } from "../../db/pool.js";
import {
  assertBranchAccess,
  businessScopeCondition,
  businessScopeParams,
  requirePermission
} from "../../middleware/auth.js";

export const partiesRouter = Router();

partiesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { type, search = "" } = req.query;
    let sql = `
      SELECT p.*
      FROM parties p
      LEFT JOIN branches b ON b.id = p.branch_id
      WHERE p.business_id = :businessId
        AND (p.branch_id IS NULL OR ${businessScopeCondition(req.user, "b")})`;
    const params = businessScopeParams(req.user);

    if (type) {
      sql += ` AND party_type IN (:type, 'both')`;
      params.type = type;
    }

    if (search) {
      sql += ` AND (p.name LIKE :search1 OR p.phone LIKE :search2 OR p.cnic LIKE :search3)`;
      params.search1 = `%${search}%`;
      params.search2 = `%${search}%`;
      params.search3 = `%${search}%`;
    }

    sql += ` ORDER BY created_at DESC`;
    res.json(await query(sql, params));
  })
);

partiesRouter.post(
  "/",
  requirePermission("parties", "create"),
  asyncHandler(async (req, res) => {
    const {
      branchId,
      partyType,
      name,
      phone,
      cnic,
      address,
      notes,
      openingBalance = 0,
      openingBalanceType = "receivable",
      openingBalanceDate = new Date().toISOString().slice(0, 10)
    } = req.body;

    if (!name || !partyType) {
      throw badRequest("Name and partyType are required");
    }
    if (branchId) {
      await assertBranchAccess(req.user, branchId);
    }

    let result;
    const insertPayload = {
      businessId: req.user.business_id,
      branchId: branchId || null,
      partyType,
      name: name.trim(),
      phone: phone || null,
      cnic: cnic || null,
      address: address || null,
      notes: notes || null,
      openingBalance: Number(openingBalance || 0),
      openingBalanceType: openingBalanceType || (partyType === "vendor" ? "payable" : "receivable"),
      openingBalanceDate: openingBalanceDate || null
    };

    try {
      result = await query(
        `INSERT INTO parties (
           business_id, branch_id, party_type, name, phone, cnic, address, notes,
           opening_balance, opening_balance_type, opening_balance_date
         )
         VALUES (
           :businessId, :branchId, :partyType, :name, :phone, :cnic, :address, :notes,
           :openingBalance, :openingBalanceType, :openingBalanceDate
         )`,
        insertPayload
      );
    } catch (insertErr) {
      if (insertErr.code === "ER_BAD_FIELD_ERROR" || insertErr.message?.includes("opening_balance")) {
        const { migrateOpeningBalances } = await import("../../db/migrateOpeningBalances.js");
        await migrateOpeningBalances();
        result = await query(
          `INSERT INTO parties (
             business_id, branch_id, party_type, name, phone, cnic, address, notes,
             opening_balance, opening_balance_type, opening_balance_date
           )
           VALUES (
             :businessId, :branchId, :partyType, :name, :phone, :cnic, :address, :notes,
             :openingBalance, :openingBalanceType, :openingBalanceDate
           )`,
          insertPayload
        );
      } else {
        throw insertErr;
      }
    }

    const rows = await query(
      `SELECT * FROM parties WHERE id = :id AND business_id = :businessId`,
      { id: result.insertId, businessId: req.user.business_id }
    );
    res.status(201).json(rows[0]);
  })
);

partiesRouter.put(
  "/:id",
  requirePermission("parties", "edit"),
  asyncHandler(async (req, res) => {
    const [existing] = await query(
      "SELECT id FROM parties WHERE id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );
    if (!existing) {
      throw badRequest("Party not found");
    }

    const {
      branchId,
      partyType,
      name,
      phone,
      cnic,
      address,
      notes,
      openingBalance,
      openingBalanceType,
      openingBalanceDate
    } = req.body;

    const updates = [];
    const params = { id: req.params.id, businessId: req.user.business_id };

    if (name !== undefined) {
      updates.push("name = :name");
      params.name = name.trim();
    }
    if (partyType !== undefined) {
      updates.push("party_type = :partyType");
      params.partyType = partyType;
    }
    if (branchId !== undefined) {
      updates.push("branch_id = :branchId");
      params.branchId = branchId || null;
    }
    if (phone !== undefined) {
      updates.push("phone = :phone");
      params.phone = phone || null;
    }
    if (cnic !== undefined) {
      updates.push("cnic = :cnic");
      params.cnic = cnic || null;
    }
    if (address !== undefined) {
      updates.push("address = :address");
      params.address = address || null;
    }
    if (notes !== undefined) {
      updates.push("notes = :notes");
      params.notes = notes || null;
    }
    if (openingBalance !== undefined) {
      updates.push("opening_balance = :openingBalance");
      params.openingBalance = Number(openingBalance || 0);
    }
    if (openingBalanceType !== undefined) {
      updates.push("opening_balance_type = :openingBalanceType");
      params.openingBalanceType = openingBalanceType;
    }
    if (openingBalanceDate !== undefined) {
      updates.push("opening_balance_date = :openingBalanceDate");
      params.openingBalanceDate = openingBalanceDate || null;
    }

    if (updates.length > 0) {
      try {
        await query(
          `UPDATE parties SET ${updates.join(", ")} WHERE id = :id AND business_id = :businessId`,
          params
        );
      } catch (updateErr) {
        if (updateErr.code === "ER_BAD_FIELD_ERROR" || updateErr.message?.includes("opening_balance")) {
          const { migrateOpeningBalances } = await import("../../db/migrateOpeningBalances.js");
          await migrateOpeningBalances();
          await query(
            `UPDATE parties SET ${updates.join(", ")} WHERE id = :id AND business_id = :businessId`,
            params
          );
        } else {
          throw updateErr;
        }
      }
    }

    const rows = await query(
      `SELECT * FROM parties WHERE id = :id AND business_id = :businessId`,
      { id: req.params.id, businessId: req.user.business_id }
    );
    res.json(rows[0]);
  })
);

partiesRouter.delete(
  "/:id",
  requirePermission("parties", "delete"),
  asyncHandler(async (req, res) => {
    const [existing] = await query(
      "SELECT id, name FROM parties WHERE id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );
    if (!existing) {
      throw badRequest("Party not found");
    }

    const [sales] = await query(
      "SELECT COUNT(*) AS count FROM sale_orders WHERE party_id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );
    if (sales && sales.count > 0) {
      throw badRequest("Cannot delete party with associated sale orders.");
    }

    const [purchases] = await query(
      "SELECT COUNT(*) AS count FROM purchase_orders WHERE party_id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );
    if (purchases && purchases.count > 0) {
      throw badRequest("Cannot delete party with associated purchase orders.");
    }

    await query(
      "DELETE FROM parties WHERE id = :id AND business_id = :businessId",
      { id: req.params.id, businessId: req.user.business_id }
    );

    res.json({ success: true, message: "Party deleted successfully" });
  })
);

