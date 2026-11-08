import { Router } from "express";
import { query, withTransaction } from "../../db/pool.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { assertBranchAccess, isBusinessAdmin, requirePermission, hasPermission } from "../../middleware/auth.js";
import { buildInvoiceNumber } from "../../utils/invoice.js";

export const returnsRouter = Router();

returnsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { branchId, returnType, search } = req.query;
    let sql = `
      SELECT r.*,
             b.name AS branch_name,
             p.name AS party_name,
             u.full_name AS created_by_name,
             COUNT(ri.id) AS total_items
      FROM order_returns r
      JOIN branches b ON b.id = r.branch_id
      LEFT JOIN parties p ON p.id = r.party_id
      LEFT JOIN users u ON u.id = r.created_by
      LEFT JOIN order_return_items ri ON ri.return_id = r.id
      WHERE r.business_id = :businessId
    `;
    const params = { businessId: req.user.business_id };

    if (!isBusinessAdmin(req.user)) {
      sql += " AND r.branch_id = :userBranchId";
      params.userBranchId = req.user.branch_id;
    } else if (branchId) {
      sql += " AND r.branch_id = :branchId";
      params.branchId = branchId;
    }

    if (returnType) {
      sql += " AND r.return_type = :returnType";
      params.returnType = returnType;
    }

    if (search) {
      sql += " AND (r.return_number LIKE :search OR p.name LIKE :search OR r.reason LIKE :search OR r.notes LIKE :search)";
      params.search = `%${search}%`;
    }

    sql += " GROUP BY r.id ORDER BY r.created_at DESC";
    const rows = await query(sql, params);
    res.json(rows);
  })
);

returnsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [returnRecord] = await query(
      `SELECT r.*,
              b.name AS branch_name,
              p.name AS party_name,
              u.full_name AS created_by_name
       FROM order_returns r
       JOIN branches b ON b.id = r.branch_id
       LEFT JOIN parties p ON p.id = r.party_id
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.id = ? AND r.business_id = ?`,
      [req.params.id, req.user.business_id]
    );

    if (!returnRecord) {
      const error = new Error("Return record not found");
      error.status = 404;
      throw error;
    }

    const items = await query(
      `SELECT ri.*,
              p.name AS product_name,
              p.sku AS product_sku,
              mm.company AS handset_company,
              mm.model_name AS handset_model
       FROM order_return_items ri
       LEFT JOIN products p ON p.id = ri.product_id
       LEFT JOIN mobile_units mu ON mu.id = ri.mobile_unit_id
       LEFT JOIN mobile_models mm ON mm.id = mu.model_id
       WHERE ri.return_id = ?`,
      [returnRecord.id]
    );

    res.json({ ...returnRecord, items });
  })
);

returnsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      branchId,
      returnType = "customer_return",
      referenceId,
      partyId,
      returnDate = new Date().toISOString().slice(0, 10),
      paymentMethod = "cash",
      reason,
      notes,
      items = []
    } = req.body;

    const requiredPage = returnType === "vendor_return" ? "purchases" : "sales";
    if (!hasPermission(req.user, requiredPage, "create") && !hasPermission(req.user, returnType, "create")) {
      const error = new Error(`You do not have permission to create ${returnType === "vendor_return" ? "purchase" : "sale"} returns`);
      error.status = 403;
      throw error;
    }

    if (!branchId || !returnType || !referenceId || !Array.isArray(items) || !items.length) {
      throw badRequest("branchId, returnType, referenceId, and items are required");
    }

    await assertBranchAccess(req.user, branchId);

    const returnId = await withTransaction(async (connection) => {
      let resolvedPartyId = partyId || null;

      if (returnType === "customer_return") {
        const [saleOrders] = await connection.execute(
          `SELECT so.*, b.business_id
           FROM sale_orders so
           JOIN branches b ON b.id = so.branch_id
           WHERE so.id = ? AND b.business_id = ?`,
          [referenceId, req.user.business_id]
        );

        if (!saleOrders.length) {
          throw badRequest("Sale order not found for this business");
        }
        resolvedPartyId = resolvedPartyId || saleOrders[0].customer_id;
      } else if (returnType === "vendor_return") {
        const [purchaseOrders] = await connection.execute(
          `SELECT po.*, b.business_id
           FROM purchase_orders po
           JOIN branches b ON b.id = po.branch_id
           WHERE po.id = ? AND b.business_id = ?`,
          [referenceId, req.user.business_id]
        );

        if (!purchaseOrders.length) {
          throw badRequest("Purchase order not found for this business");
        }
        resolvedPartyId = resolvedPartyId || purchaseOrders[0].vendor_id;
      } else {
        throw badRequest("Invalid returnType");
      }

      // Calculate total refund amount
      const totalRefund = items.reduce(
        (sum, item) => sum + Number(item.refundRate || 0) * Number(item.quantity || 1),
        0
      );

      const [returnResult] = await connection.execute(
        `INSERT INTO order_returns
         (business_id, branch_id, return_number, return_type, reference_type, reference_id, party_id, return_date, total_refund_amount, payment_method, reason, notes, created_by)
         VALUES (?, ?, 'TEMP', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.business_id,
          branchId,
          returnType,
          returnType === "customer_return" ? "sale_order" : "purchase_order",
          referenceId,
          resolvedPartyId,
          returnDate,
          totalRefund,
          paymentMethod,
          reason || null,
          notes || null,
          req.user.id
        ]
      );

      const newReturnId = returnResult.insertId;
      const returnNumber = buildInvoiceNumber("RET", newReturnId);
      await connection.execute(
        "UPDATE order_returns SET return_number = ? WHERE id = ?",
        [returnNumber, newReturnId]
      );

      for (const item of items) {
        const refundRate = Number(item.refundRate || 0);
        const condition = item.itemCondition || "good";

        if (item.imei) {
          const cleanImei = String(item.imei).trim();
          const [units] = await connection.execute(
            `SELECT id, imei, model_id, current_status
             FROM mobile_units
             WHERE business_id = ? AND imei = ? FOR UPDATE`,
            [req.user.business_id, cleanImei]
          );

          if (!units.length) {
            throw badRequest(`IMEI ${cleanImei} not found in system`);
          }

          const unit = units[0];

          if (returnType === "customer_return") {
            // Revert back into branch inventory
            const targetStatus = condition === "damaged" ? "returned" : "in_stock";
            await connection.execute(
              "UPDATE mobile_units SET current_status = ?, branch_id = ?, sale_order_id = NULL WHERE id = ?",
              [targetStatus, branchId, unit.id]
            );

            await connection.execute(
              `INSERT INTO stock_movements
               (business_id, branch_id, mobile_unit_id, model_id, movement_type, reference_type, reference_id, quantity, unit_price, created_by)
               VALUES (?, ?, ?, ?, 'customer_return_in', 'order_return', ?, 1, ?, ?)`,
              [req.user.business_id, branchId, unit.id, unit.model_id, newReturnId, refundRate, req.user.id]
            );
          } else {
            // Vendor return: ship unit out of inventory back to vendor
            if (unit.current_status !== "in_stock") {
              throw badRequest(`IMEI ${cleanImei} is currently ${unit.current_status} and cannot be returned to vendor`);
            }

            await connection.execute(
              "UPDATE mobile_units SET current_status = 'returned_to_vendor' WHERE id = ?",
              [unit.id]
            );

            await connection.execute(
              `INSERT INTO stock_movements
               (business_id, branch_id, mobile_unit_id, model_id, movement_type, reference_type, reference_id, quantity, unit_cost, created_by)
               VALUES (?, ?, ?, ?, 'supplier_return_out', 'order_return', ?, -1, ?, ?)`,
              [req.user.business_id, branchId, unit.id, unit.model_id, newReturnId, refundRate, req.user.id]
            );
          }

          await connection.execute(
            `INSERT INTO order_return_items
             (return_id, mobile_unit_id, imei, refund_rate, quantity, item_condition)
             VALUES (?, ?, ?, ?, 1, ?)`,
            [newReturnId, unit.id, cleanImei, refundRate, condition]
          );
        } else if (item.productId) {
          const qty = Number(item.quantity || 1);
          if (qty <= 0) {
            throw badRequest("Product return quantity must be greater than 0");
          }

          const [stockRows] = await connection.execute(
            "SELECT id, quantity FROM product_stocks WHERE branch_id = ? AND product_id = ? FOR UPDATE",
            [branchId, item.productId]
          );

          if (returnType === "customer_return") {
            // Return goods into stock
            if (stockRows.length) {
              await connection.execute(
                "UPDATE product_stocks SET quantity = quantity + ? WHERE id = ?",
                [qty, stockRows[0].id]
              );
            } else {
              await connection.execute(
                `INSERT INTO product_stocks (business_id, branch_id, product_id, quantity)
                 VALUES (?, ?, ?, ?)`,
                [req.user.business_id, branchId, item.productId, qty]
              );
            }
          } else {
            // Vendor return takes goods out of stock
            const curStock = stockRows[0]?.quantity || 0;
            if (curStock < qty) {
              throw badRequest(`Insufficient stock to return product ID ${item.productId} (available: ${curStock}, requested: ${qty})`);
            }
            await connection.execute(
              "UPDATE product_stocks SET quantity = quantity - ? WHERE id = ?",
              [qty, stockRows[0].id]
            );
          }

          await connection.execute(
            `INSERT INTO order_return_items
             (return_id, product_id, refund_rate, quantity, item_condition)
             VALUES (?, ?, ?, ?, ?)`,
            [newReturnId, item.productId, refundRate, qty, condition]
          );
        }
      }

      // Record refund payment in payments table
      if (totalRefund > 0) {
        const direction = returnType === "customer_return" ? "out" : "in";
        await connection.execute(
          `INSERT INTO payments
           (branch_id, reference_type, reference_id, direction, party_id, payment_date, amount, payment_method, notes, created_by)
           VALUES (?, 'order_return', ?, ?, ?, ?, ?, ?, 'Refund on return', ?)`,
          [
            branchId,
            newReturnId,
            direction,
            resolvedPartyId,
            returnDate,
            totalRefund,
            paymentMethod,
            req.user.id
          ]
        );
      }

      return newReturnId;
    });

    const [returnRecord] = await query("SELECT * FROM order_returns WHERE id = ?", [returnId]);
    res.status(201).json(returnRecord);
  })
);
