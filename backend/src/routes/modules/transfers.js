import { Router } from "express";
import { query, withTransaction } from "../../db/pool.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { assertBranchAccess, isBusinessAdmin, requirePermission } from "../../middleware/auth.js";
import { buildInvoiceNumber } from "../../utils/invoice.js";
import { broadcastNotification } from "./notifications.js";

export const transfersRouter = Router();

transfersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { branchId, status, search } = req.query;
    let sql = `
      SELECT t.*,
             fb.name AS from_branch_name,
             tb.name AS to_branch_name,
             u.full_name AS created_by_name,
             ru.full_name AS received_by_name,
             COUNT(ti.id) AS total_items
      FROM stock_transfers t
      JOIN branches fb ON fb.id = t.from_branch_id
      JOIN branches tb ON tb.id = t.to_branch_id
      LEFT JOIN users u ON u.id = t.created_by
      LEFT JOIN users ru ON ru.id = t.received_by
      LEFT JOIN stock_transfer_items ti ON ti.transfer_id = t.id
      WHERE t.business_id = :businessId
    `;
    const params = { businessId: req.user.business_id };

    if (!isBusinessAdmin(req.user)) {
      sql += " AND (t.from_branch_id = :userBranchId OR t.to_branch_id = :userBranchId)";
      params.userBranchId = req.user.branch_id;
    } else if (branchId) {
      sql += " AND (t.from_branch_id = :branchId OR t.to_branch_id = :branchId)";
      params.branchId = branchId;
    }

    if (status) {
      sql += " AND t.status = :status";
      params.status = status;
    }

    if (search) {
      sql += " AND (t.transfer_number LIKE :search OR fb.name LIKE :search OR tb.name LIKE :search OR t.notes LIKE :search)";
      params.search = `%${search}%`;
    }

    sql += " GROUP BY t.id ORDER BY t.created_at DESC";
    const rows = await query(sql, params);
    res.json(rows);
  })
);

transfersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [transfer] = await query(
      `SELECT t.*,
              fb.name AS from_branch_name,
              tb.name AS to_branch_name,
              u.full_name AS created_by_name,
              ru.full_name AS received_by_name
       FROM stock_transfers t
       JOIN branches fb ON fb.id = t.from_branch_id
       JOIN branches tb ON tb.id = t.to_branch_id
       LEFT JOIN users u ON u.id = t.created_by
       LEFT JOIN users ru ON ru.id = t.received_by
       WHERE t.id = ? AND t.business_id = ?`,
      [req.params.id, req.user.business_id]
    );

    if (!transfer) {
      const error = new Error("Transfer not found");
      error.status = 404;
      throw error;
    }

    const items = await query(
      `SELECT ti.*,
              p.name AS product_name,
              p.sku AS product_sku,
              mm.company AS handset_company,
              mm.model_name AS handset_model
       FROM stock_transfer_items ti
       LEFT JOIN products p ON p.id = ti.product_id
       LEFT JOIN mobile_models mm ON mm.id = ti.model_id
       WHERE ti.transfer_id = ?`,
      [transfer.id]
    );

    res.json({ ...transfer, items });
  })
);

transfersRouter.post(
  "/",
  requirePermission("inventory", "create"),
  asyncHandler(async (req, res) => {
    const { fromBranchId, toBranchId, items = [], notes } = req.body;

    if (!fromBranchId || !toBranchId) {
      throw badRequest("fromBranchId and toBranchId are required");
    }

    if (Number(fromBranchId) === Number(toBranchId)) {
      throw badRequest("Source and destination branch cannot be the same");
    }

    if (!Array.isArray(items) || !items.length) {
      throw badRequest("At least one item must be included in the transfer");
    }

    await assertBranchAccess(req.user, fromBranchId);
    await assertBranchAccess(req.user, toBranchId);

    const transferId = await withTransaction(async (connection) => {
      // 1. Create transfer record
      const [insertResult] = await connection.execute(
        `INSERT INTO stock_transfers
         (business_id, transfer_number, from_branch_id, to_branch_id, status, notes, created_by, dispatched_by, dispatched_at)
         VALUES (?, 'TEMP', ?, ?, 'in_transit', ?, ?, ?, NOW())`,
        [req.user.business_id, fromBranchId, toBranchId, notes || null, req.user.id, req.user.id]
      );
      const newTransferId = insertResult.insertId;
      const transferNumber = buildInvoiceNumber("TRF", newTransferId);

      await connection.execute(
        "UPDATE stock_transfers SET transfer_number = ? WHERE id = ?",
        [transferNumber, newTransferId]
      );

      // 2. Process each item
      for (const item of items) {
        if (item.imei) {
          const cleanImei = String(item.imei).trim();
          const [units] = await connection.execute(
            `SELECT id, imei, model_id, current_status
             FROM mobile_units
             WHERE business_id = ? AND branch_id = ? AND imei = ? FOR UPDATE`,
            [req.user.business_id, fromBranchId, cleanImei]
          );

          if (!units.length) {
            throw badRequest(`IMEI ${cleanImei} not found at source branch`);
          }

          const unit = units[0];
          if (unit.current_status !== "in_stock") {
            throw badRequest(`IMEI ${cleanImei} is currently ${unit.current_status} and cannot be transferred`);
          }

          // Lock handset to in_transit
          await connection.execute(
            "UPDATE mobile_units SET current_status = 'in_transit' WHERE id = ?",
            [unit.id]
          );

          await connection.execute(
            `INSERT INTO stock_transfer_items
             (transfer_id, mobile_unit_id, imei, model_id, quantity, item_status)
             VALUES (?, ?, ?, ?, 1, 'in_transit')`,
            [newTransferId, unit.id, cleanImei, unit.model_id]
          );

          await connection.execute(
            `INSERT INTO stock_movements
             (business_id, branch_id, mobile_unit_id, model_id, movement_type, reference_type, reference_id, quantity, created_by)
             VALUES (?, ?, ?, ?, 'transfer_out', 'stock_transfer', ?, -1, ?)`,
            [req.user.business_id, fromBranchId, unit.id, unit.model_id, newTransferId, req.user.id]
          );
        } else if (item.productId) {
          const qty = Number(item.quantity || 1);
          if (qty <= 0) {
            throw badRequest("Product quantity must be greater than 0");
          }

          const [stockRows] = await connection.execute(
            "SELECT id, quantity FROM product_stocks WHERE branch_id = ? AND product_id = ? FOR UPDATE",
            [fromBranchId, item.productId]
          );

          const currentStock = stockRows[0]?.quantity || 0;
          if (currentStock < qty) {
            throw badRequest(`Insufficient stock at source branch for product ID ${item.productId} (available: ${currentStock}, requested: ${qty})`);
          }

          await connection.execute(
            "UPDATE product_stocks SET quantity = quantity - ? WHERE id = ?",
            [qty, stockRows[0].id]
          );

          await connection.execute(
            `INSERT INTO stock_transfer_items
             (transfer_id, product_id, quantity, item_status)
             VALUES (?, ?, ?, 'in_transit')`,
            [newTransferId, item.productId, qty]
          );
        } else {
          throw badRequest("Each item must have an imei or productId");
        }
      }

      await connection.execute(
        `INSERT INTO notifications (branch_id, notification_type, reference_type, reference_id, title, message)
         VALUES (?, 'stock_transfer', 'stock_transfer', ?, ?, ?)`,
        [
          toBranchId,
          newTransferId,
          "Incoming Stock Transfer",
          `Transfer ${transferNumber} has been dispatched to your branch.`
        ]
      );

      return newTransferId;
    });

    const [transfer] = await query("SELECT * FROM stock_transfers WHERE id = ?", [transferId]);

    broadcastNotification({
      businessId: req.user.business_id,
      branchId: toBranchId,
      notification: {
        type: "stock_transfer",
        title: "Incoming Stock Transfer",
        message: `Transfer ${transfer.transfer_number} has been dispatched to your branch.`,
        transferId: transfer.id
      }
    });

    res.status(201).json(transfer);
  })
);

transfersRouter.post(
  "/:id/receive",
  requirePermission("inventory", "edit"),
  asyncHandler(async (req, res) => {
    const [transfer] = await query(
      "SELECT * FROM stock_transfers WHERE id = ? AND business_id = ?",
      [req.params.id, req.user.business_id]
    );

    if (!transfer) {
      const error = new Error("Transfer not found");
      error.status = 404;
      throw error;
    }

    if (transfer.status !== "in_transit") {
      throw badRequest(`Cannot receive transfer with status '${transfer.status}'`);
    }

    await assertBranchAccess(req.user, transfer.to_branch_id);

    await withTransaction(async (connection) => {
      const [items] = await connection.execute(
        "SELECT * FROM stock_transfer_items WHERE transfer_id = ?",
        [transfer.id]
      );

      for (const item of items) {
        if (item.mobile_unit_id) {
          // Handset arrived at destination branch
          await connection.execute(
            `UPDATE mobile_units
             SET branch_id = ?, current_status = 'in_stock'
             WHERE id = ?`,
            [transfer.to_branch_id, item.mobile_unit_id]
          );

          await connection.execute(
            `INSERT INTO stock_movements
             (business_id, branch_id, mobile_unit_id, model_id, movement_type, reference_type, reference_id, quantity, created_by)
             VALUES (?, ?, ?, ?, 'transfer_in', 'stock_transfer', ?, 1, ?)`,
            [req.user.business_id, transfer.to_branch_id, item.mobile_unit_id, item.model_id, transfer.id, req.user.id]
          );
        } else if (item.product_id) {
          // Non-serialized accessory stock incremented at destination
          const [destStock] = await connection.execute(
            "SELECT id, quantity FROM product_stocks WHERE branch_id = ? AND product_id = ? FOR UPDATE",
            [transfer.to_branch_id, item.product_id]
          );

          if (destStock.length) {
            await connection.execute(
              "UPDATE product_stocks SET quantity = quantity + ? WHERE id = ?",
              [item.quantity, destStock[0].id]
            );
          } else {
            await connection.execute(
              `INSERT INTO product_stocks (business_id, branch_id, product_id, quantity)
               VALUES (?, ?, ?, ?)`,
              [req.user.business_id, transfer.to_branch_id, item.product_id, item.quantity]
            );
          }
        }

        await connection.execute(
          `UPDATE stock_transfer_items
           SET received_quantity = quantity, item_status = 'received'
           WHERE id = ?`,
          [item.id]
        );
      }

      await connection.execute(
        `UPDATE stock_transfers
         SET status = 'completed', received_by = ?, received_at = NOW()
         WHERE id = ?`,
        [req.user.id, transfer.id]
      );
    });

    const [updated] = await query("SELECT * FROM stock_transfers WHERE id = ?", [transfer.id]);
    res.json(updated);
  })
);

transfersRouter.post(
  "/:id/cancel",
  requirePermission("inventory", "delete"),
  asyncHandler(async (req, res) => {
    const [transfer] = await query(
      "SELECT * FROM stock_transfers WHERE id = ? AND business_id = ?",
      [req.params.id, req.user.business_id]
    );

    if (!transfer) {
      const error = new Error("Transfer not found");
      error.status = 404;
      throw error;
    }

    if (transfer.status === "completed") {
      throw badRequest("Completed transfers cannot be cancelled");
    }

    await assertBranchAccess(req.user, transfer.from_branch_id);

    await withTransaction(async (connection) => {
      const [items] = await connection.execute(
        "SELECT * FROM stock_transfer_items WHERE transfer_id = ?",
        [transfer.id]
      );

      for (const item of items) {
        if (item.mobile_unit_id) {
          // Revert handset back to in_stock at source branch
          await connection.execute(
            `UPDATE mobile_units
             SET current_status = 'in_stock'
             WHERE id = ? AND current_status = 'in_transit'`,
            [item.mobile_unit_id]
          );
        } else if (item.product_id) {
          // Revert product quantity to source branch
          await connection.execute(
            `UPDATE product_stocks
             SET quantity = quantity + ?
             WHERE branch_id = ? AND product_id = ?`,
            [item.quantity, transfer.from_branch_id, item.product_id]
          );
        }
      }

      await connection.execute(
        "UPDATE stock_transfers SET status = 'cancelled' WHERE id = ?",
        [transfer.id]
      );
    });

    const [updated] = await query("SELECT * FROM stock_transfers WHERE id = ?", [transfer.id]);
    res.json(updated);
  })
);
