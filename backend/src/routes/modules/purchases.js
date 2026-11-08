import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { withTransaction, query } from "../../db/pool.js";
import { assertBranchAccess, businessScopeCondition, businessScopeParams, requirePermission } from "../../middleware/auth.js";
import { buildInvoiceNumber } from "../../utils/invoice.js";
import { createAuditLog } from "../../services/audit.js";

export const purchasesRouter = Router();

purchasesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { branchId, search, status, from, to } = req.query;
    let sql = `
      SELECT po.*, p.name AS vendor_name, b.name AS branch_name,
             (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS total_items
      FROM purchase_orders po
      JOIN branches b ON b.id = po.branch_id
      LEFT JOIN parties p ON p.id = po.vendor_id
      WHERE ${businessScopeCondition(req.user, "b")}
    `;
    const params = businessScopeParams(req.user);

    if (branchId) {
      sql += ` AND po.branch_id = :branchId`;
      params.branchId = branchId;
    }
    if (status === "deleted") {
      sql += ` AND po.is_deleted = 1`;
    } else if (status === "active") {
      sql += ` AND COALESCE(po.is_deleted, 0) = 0`;
    }
    if (search) {
      sql += ` AND (po.invoice_number LIKE :search OR p.name LIKE :search OR po.purchaser_name LIKE :search OR po.notes LIKE :search)`;
      params.search = `%${search}%`;
    }
    if (from) {
      sql += ` AND po.purchase_date >= :from`;
      params.from = from;
    }
    if (to) {
      sql += ` AND po.purchase_date <= :to`;
      params.to = to;
    }

    sql += ` ORDER BY po.purchase_date DESC, po.id DESC`;
    const rows = await query(sql, params);
    res.json(rows);
  })
);

purchasesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [purchase] = await query(
      `SELECT po.*, p.name AS vendor_name
       FROM purchase_orders po
       JOIN branches b ON b.id = po.branch_id
       LEFT JOIN parties p ON p.id = po.vendor_id
       WHERE po.id = :id
         AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );
    if (!purchase) {
      const error = new Error("Purchase not found");
      error.status = 404;
      throw error;
    }
    const items = await query(
      `SELECT poi.*,
              mm.company, mm.model_name, mm.variant, mm.color, mm.storage,
              p.name AS product_name, p.sku AS product_sku
       FROM purchase_order_items poi
       LEFT JOIN mobile_models mm ON mm.id = poi.model_id
       LEFT JOIN products p ON p.id = poi.product_id
       WHERE poi.purchase_order_id = :id`,
      { id: req.params.id }
    );
    res.json({ ...purchase, items });
  })
);

purchasesRouter.post(
  "/",
  requirePermission("purchases", "create"),
  asyncHandler(async (req, res) => {
    const {
      branchId,
      vendorId,
      purchaserName,
      purchaserCnic,
      purchaseDate,
      paymentMethod = "cash",
      discountAmount = 0,
      taxAmount = 0,
      paidAmount = 0,
      dueDate = null,
      notes,
      items
    } = req.body;

    if (!branchId || !purchaseDate || !Array.isArray(items) || items.length === 0) {
      throw badRequest("branchId, purchaseDate and items are required");
    }

    const purchase = await withTransaction(async (connection) => {
      await assertBranchAccess(req.user, branchId, connection);

      const imeiItems = items.filter((item) => item.imei);
      const productItems = items.filter((item) => item.productId && !item.imei);

      if (imeiItems.length + productItems.length !== items.length) {
        throw badRequest("Each purchase item must be either a valid IMEI handset or Product ID");
      }

      if (imeiItems.length) {
        const invalidImei = imeiItems.find((item) => item.imei.length < 14 || item.imei.length > 20);
        if (invalidImei) {
          throw badRequest(`Invalid IMEI: ${invalidImei.imei || "blank"}`);
        }

        const imeis = imeiItems.map((item) => item.imei);
        const modelIds = [...new Set(imeiItems.map((item) => Number(item.modelId)).filter(Boolean))];
        if (modelIds.length !== new Set(imeiItems.map((item) => Number(item.modelId))).size || !modelIds.length) {
          throw badRequest("Each handset purchase item needs a valid model");
        }

        const [models] = await connection.query(
          `SELECT id FROM mobile_models WHERE business_id = ? AND id IN (?)`,
          [req.user.business_id, modelIds]
        );

        if (models.length !== modelIds.length) {
          throw badRequest("One or more models do not belong to this business");
        }

        const [duplicates] = await connection.query(
          `SELECT imei FROM mobile_units WHERE business_id = ? AND imei IN (?)`,
          [req.user.business_id, imeis]
        );

        if (duplicates.length) {
          throw badRequest(`Duplicate IMEI found: ${duplicates.map((row) => row.imei).join(", ")}`);
        }
      }

      if (vendorId) {
        const [vendors] = await connection.execute(
          `SELECT p.id
           FROM parties p
           LEFT JOIN branches b ON b.id = p.branch_id
           WHERE p.id = ?
             AND p.business_id = ?
             AND p.party_type IN ('vendor', 'both')
             AND (p.branch_id IS NULL OR b.business_id = ?)`,
          [vendorId, req.user.business_id, req.user.business_id]
        );
        if (!vendors.length) {
          throw badRequest("Vendor does not belong to this business");
        }
      }

      for (const pItem of productItems) {
        const qty = Number(pItem.quantity || 1);
        if (qty <= 0) {
          throw badRequest("Product quantity must be greater than zero");
        }
        const [prod] = await connection.execute(
          "SELECT id FROM products WHERE id = ? AND business_id = ?",
          [pItem.productId, req.user.business_id]
        );
        if (!prod.length) {
          throw badRequest(`Product ID ${pItem.productId} not found`);
        }
      }

      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.unitCost || 0) * (item.productId && !item.imei ? Number(item.quantity || 1) : 1),
        0
      );
      const discount = Number(discountAmount ?? req.body.discount_amount ?? 0);
      const tax = Number(taxAmount || 0);
      const paid = Number(paidAmount || 0);

      if (discount < 0) {
        throw badRequest("Discount amount cannot be negative");
      }
      if (discount > subtotal) {
        throw badRequest("Discount cannot be more than Subtotal");
      }
      if (tax < 0) {
        throw badRequest("Tax amount cannot be negative");
      }
      if (paid < 0) {
        throw badRequest("Paid amount cannot be negative");
      }

      const totalAmount = subtotal - discount + tax;
      const balanceAmount = totalAmount - paid;

      if (balanceAmount < 0) {
        throw badRequest("Paid Amount cannot be more than Net Amount");
      }

      let finalDueDate = null;
      if (balanceAmount > 0) {
        if (!dueDate) {
          throw badRequest("Due Date is required when a balance is due");
        }
        const todayStr = new Date().toISOString().slice(0, 10);
        if (dueDate < todayStr) {
          throw badRequest("Due Date cannot be in the past");
        }
        finalDueDate = dueDate;
      }

      let finalPurchaserName = null;
      let finalPurchaserCnic = null;
      if (vendorId) {
        finalPurchaserName = null;
        finalPurchaserCnic = null;
      } else if (purchaserName || purchaserCnic) {
        const cnicClean = purchaserCnic ? purchaserCnic.trim() : "";
        if (cnicClean && !/^\d{5}-?\d{7}-?\d{1}$/.test(cnicClean)) {
          throw badRequest("Invalid CNIC format. Expected format: 12345-1234567-1 or 13 digits");
        }
        finalPurchaserName = purchaserName ? purchaserName.trim() : null;
        finalPurchaserCnic = cnicClean || null;
      }

      const [orderResult] = await connection.execute(
        `INSERT INTO purchase_orders
        (invoice_number, branch_id, vendor_id, purchaser_name, purchaser_cnic, purchase_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, due_date, notes, created_by)
        VALUES ('TEMP', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          branchId,
          vendorId || null,
          finalPurchaserName,
          finalPurchaserCnic,
          purchaseDate,
          subtotal,
          discount,
          tax,
          totalAmount,
          paid,
          balanceAmount,
          finalDueDate,
          notes || null,
          req.user.id
        ]
      );

      const invoiceNumber = buildInvoiceNumber("PUR", orderResult.insertId);
      await connection.execute(
        `UPDATE purchase_orders SET invoice_number = ? WHERE id = ?`,
        [invoiceNumber, orderResult.insertId]
      );

      for (const item of items) {
        if (item.imei) {
          const [unitResult] = await connection.execute(
            `INSERT INTO mobile_units
            (business_id, imei, model_id, branch_id, current_status, purchase_order_id, cost_price)
            VALUES (?, ?, ?, ?, 'in_stock', ?, ?)`,
            [req.user.business_id, item.imei, item.modelId, branchId, orderResult.insertId, item.unitCost]
          );

          await connection.execute(
            `INSERT INTO purchase_order_items
            (purchase_order_id, model_id, mobile_unit_id, imei, unit_cost, quantity)
            VALUES (?, ?, ?, ?, ?, 1)`,
            [orderResult.insertId, item.modelId, unitResult.insertId, item.imei, item.unitCost]
          );

          await connection.execute(
            `INSERT INTO stock_movements
            (business_id, branch_id, mobile_unit_id, model_id, movement_type, reference_type, reference_id, quantity, unit_cost, created_by)
            VALUES (?, ?, ?, ?, 'purchase_in', 'purchase_order', ?, 1, ?, ?)`,
            [
              req.user.business_id,
              branchId,
              unitResult.insertId,
              item.modelId,
              orderResult.insertId,
              item.unitCost,
              req.user.id
            ]
          );
        } else {
          const qty = Number(item.quantity || 1);
          await connection.execute(
            `INSERT INTO purchase_order_items
            (purchase_order_id, product_id, unit_cost, quantity)
            VALUES (?, ?, ?, ?)`,
            [orderResult.insertId, item.productId, item.unitCost, qty]
          );

          const [stockRows] = await connection.execute(
            "SELECT id FROM product_stocks WHERE branch_id = ? AND product_id = ?",
            [branchId, item.productId]
          );
          if (stockRows.length) {
            await connection.execute(
              "UPDATE product_stocks SET quantity = quantity + ? WHERE id = ?",
              [qty, stockRows[0].id]
            );
          } else {
            await connection.execute(
              "INSERT INTO product_stocks (business_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)",
              [req.user.business_id, branchId, item.productId, qty]
            );
          }
        }
      }

      if (Number(paidAmount) > 0) {
        await connection.execute(
          `INSERT INTO payments
          (reference_type, reference_id, direction, branch_id, party_id, payment_method, amount, payment_date, notes, created_by)
          VALUES ('purchase', ?, 'out', ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderResult.insertId,
            branchId,
            vendorId || null,
            paymentMethod,
            paidAmount,
            purchaseDate,
            "Initial purchase payment",
            req.user.id
          ]
        );
      }

      if (balanceAmount > 0) {
        await connection.execute(
          `INSERT INTO payables
          (purchase_order_id, party_id, branch_id, total_amount, paid_amount, balance_amount, due_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderResult.insertId,
            vendorId || null,
            branchId,
            totalAmount,
            paidAmount,
            balanceAmount,
            finalDueDate,
            paidAmount > 0 ? "partial" : "pending"
          ]
        );
      }

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "create",
        entityType: "purchase_order",
        entityId: orderResult.insertId,
        details: { itemCount: items.length, subtotal, discountAmount: discount, totalAmount }
      });

      return orderResult.insertId;
    });

    const [saved] = await query(`SELECT * FROM purchase_orders WHERE id = :id`, { id: purchase });
    res.status(201).json(saved);
  })
);

purchasesRouter.put(
  "/:id",
  requirePermission("purchases", "edit"),
  asyncHandler(async (req, res) => {
    const purchaseId = req.params.id;
    const {
      vendorId,
      purchaserName,
      purchaserCnic,
      purchaseDate,
      paymentMethod = "cash",
      discountAmount = 0,
      taxAmount = 0,
      paidAmount = 0,
      dueDate = null,
      notes,
      items
    } = req.body;

    if (!purchaseDate || !Array.isArray(items) || items.length === 0) {
      throw badRequest("purchaseDate and items are required");
    }

    const [existingPurchase] = await query(
      `SELECT po.*, b.business_id
       FROM purchase_orders po
       JOIN branches b ON b.id = po.branch_id
       WHERE po.id = :id AND ${businessScopeCondition(req.user, "b")}`,
      { id: purchaseId, ...businessScopeParams(req.user) }
    );

    if (!existingPurchase) {
      const error = new Error("Purchase order not found");
      error.status = 404;
      throw error;
    }

    if (existingPurchase.is_deleted) {
      throw badRequest("Cannot edit a deleted or voided purchase order");
    }

    const branchId = existingPurchase.branch_id;

    await withTransaction(async (connection) => {
      await assertBranchAccess(req.user, branchId, connection);

      const imeiItems = items.filter((item) => item.imei);
      const productItems = items.filter((item) => item.productId && !item.imei);

      if (imeiItems.length + productItems.length !== items.length) {
        throw badRequest("Each purchase item must be either a valid IMEI handset or Product ID");
      }

      if (imeiItems.length) {
        const invalidImei = imeiItems.find((item) => item.imei.length < 14 || item.imei.length > 20);
        if (invalidImei) {
          throw badRequest(`Invalid IMEI: ${invalidImei.imei || "blank"}`);
        }

        const modelIds = [...new Set(imeiItems.map((item) => Number(item.modelId)).filter(Boolean))];
        if (modelIds.length !== new Set(imeiItems.map((item) => Number(item.modelId))).size || !modelIds.length) {
          throw badRequest("Each handset purchase item needs a valid model");
        }

        const [models] = await connection.query(
          `SELECT id FROM mobile_models WHERE business_id = ? AND id IN (?)`,
          [req.user.business_id, modelIds]
        );

        if (models.length !== modelIds.length) {
          throw badRequest("One or more models do not belong to this business");
        }
      }

      if (vendorId) {
        const [vendors] = await connection.execute(
          `SELECT p.id
           FROM parties p
           LEFT JOIN branches b ON b.id = p.branch_id
           WHERE p.id = ?
             AND p.business_id = ?
             AND p.party_type IN ('vendor', 'both')
             AND (p.branch_id IS NULL OR b.business_id = ?)`,
          [vendorId, req.user.business_id, req.user.business_id]
        );
        if (!vendors.length) {
          throw badRequest("Vendor does not belong to this business");
        }
      }

      // Fetch existing items
      const [oldItems] = await connection.execute(
        `SELECT poi.*, mu.imei AS unit_imei, mu.current_status, mu.sale_order_id
         FROM purchase_order_items poi
         LEFT JOIN mobile_units mu ON mu.id = poi.mobile_unit_id
         WHERE poi.purchase_order_id = ?`,
        [purchaseId]
      );

      const oldImeis = oldItems.filter((i) => i.imei || i.unit_imei).map((i) => (i.imei || i.unit_imei).trim());
      const newImeis = imeiItems.map((i) => i.imei.trim());

      // Check removed IMEIs: ensure none has been sold!
      const removedImeis = oldImeis.filter((imei) => !newImeis.includes(imei));
      for (const imei of removedImeis) {
        const oldItem = oldItems.find((i) => (i.imei || i.unit_imei) === imei);
        if (oldItem && oldItem.current_status === "sold") {
          throw badRequest(
            `Cannot remove or replace IMEI ${imei} because it has already been sold in sale #${oldItem.sale_order_id}. You must edit or cancel that sale first.`
          );
        }
        await connection.execute(
          `DELETE FROM mobile_units WHERE business_id = ? AND imei = ? AND purchase_order_id = ?`,
          [req.user.business_id, imei, purchaseId]
        );
      }

      // Newly added IMEIs: check for duplicate across business (excluding ones from this purchase)
      const addedImeis = newImeis.filter((imei) => !oldImeis.includes(imei));
      if (addedImeis.length) {
        const [duplicates] = await connection.query(
          `SELECT imei FROM mobile_units WHERE business_id = ? AND imei IN (?)`,
          [req.user.business_id, addedImeis]
        );
        if (duplicates.length) {
          throw badRequest(`Duplicate IMEI found in business inventory: ${duplicates.map((r) => r.imei).join(", ")}`);
        }
      }

      // Insert newly added mobile units and update kept ones
      const unitMap = new Map();
      for (const item of imeiItems) {
        const cleanImei = item.imei.trim();
        if (oldImeis.includes(cleanImei)) {
          await connection.execute(
            `UPDATE mobile_units SET model_id = ?, cost_price = ? WHERE business_id = ? AND imei = ? AND purchase_order_id = ?`,
            [Number(item.modelId), Number(item.unitCost), req.user.business_id, cleanImei, purchaseId]
          );
          const [u] = await connection.execute(
            `SELECT id FROM mobile_units WHERE business_id = ? AND imei = ? AND purchase_order_id = ?`,
            [req.user.business_id, cleanImei, purchaseId]
          );
          unitMap.set(cleanImei, u[0]?.id);
        } else {
          const [ins] = await connection.execute(
            `INSERT INTO mobile_units
            (business_id, imei, model_id, branch_id, current_status, purchase_order_id, cost_price)
            VALUES (?, ?, ?, ?, 'in_stock', ?, ?)`,
            [req.user.business_id, cleanImei, Number(item.modelId), branchId, purchaseId, Number(item.unitCost)]
          );
          unitMap.set(cleanImei, ins.insertId);
        }
      }

      // Product stocks reconciliation
      const oldProdMap = new Map();
      for (const item of oldItems) {
        if (item.product_id) {
          oldProdMap.set(Number(item.product_id), (oldProdMap.get(Number(item.product_id)) || 0) + Number(item.quantity || 1));
        }
      }

      const newProdMap = new Map();
      for (const item of productItems) {
        const pid = Number(item.productId);
        const qty = Number(item.quantity || 1);
        if (qty <= 0) throw badRequest("Product quantity must be greater than zero");
        newProdMap.set(pid, (newProdMap.get(pid) || 0) + qty);
      }

      const allProductIds = new Set([...oldProdMap.keys(), ...newProdMap.keys()]);
      for (const pid of allProductIds) {
        const [prodRows] = await connection.execute(
          "SELECT id FROM products WHERE id = ? AND business_id = ?",
          [pid, req.user.business_id]
        );
        if (!prodRows.length) {
          throw badRequest(`Product ID ${pid} not found`);
        }

        const oldQty = oldProdMap.get(pid) || 0;
        const newQty = newProdMap.get(pid) || 0;
        const diff = newQty - oldQty;

        if (diff > 0) {
          await connection.execute(
            `INSERT INTO product_stocks (business_id, branch_id, product_id, quantity)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [req.user.business_id, branchId, pid, diff, diff]
          );
        } else if (diff < 0) {
          const [stockRows] = await connection.execute(
            "SELECT id, quantity FROM product_stocks WHERE branch_id = ? AND product_id = ? FOR UPDATE",
            [branchId, pid]
          );
          const currentQty = stockRows[0]?.quantity || 0;
          if (currentQty < Math.abs(diff)) {
            throw badRequest(`Insufficient stock in branch to reduce purchase quantity of product ID ${pid} (current: ${currentQty}, reduction: ${Math.abs(diff)})`);
          }
          await connection.execute(
            "UPDATE product_stocks SET quantity = quantity - ? WHERE id = ?",
            [Math.abs(diff), stockRows[0].id]
          );
        }
      }

      // Delete old purchase_order_items and insert new ones
      await connection.execute(`DELETE FROM purchase_order_items WHERE purchase_order_id = ?`, [purchaseId]);

      for (const item of items) {
        if (item.imei) {
          const cleanImei = item.imei.trim();
          const unitId = unitMap.get(cleanImei);
          await connection.execute(
            `INSERT INTO purchase_order_items
            (purchase_order_id, model_id, mobile_unit_id, imei, unit_cost, quantity)
            VALUES (?, ?, ?, ?, ?, 1)`,
            [purchaseId, Number(item.modelId), unitId, cleanImei, Number(item.unitCost)]
          );
        } else {
          await connection.execute(
            `INSERT INTO purchase_order_items
            (purchase_order_id, product_id, unit_cost, quantity)
            VALUES (?, ?, ?, ?)`,
            [purchaseId, Number(item.productId), Number(item.unitCost), Number(item.quantity || 1)]
          );
        }
      }

      // Recalculate totals
      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.unitCost || 0) * (item.productId && !item.imei ? Number(item.quantity || 1) : 1),
        0
      );
      const discount = Number(discountAmount ?? req.body.discount_amount ?? 0);
      const tax = Number(taxAmount || 0);
      const paid = Number(paidAmount || 0);

      if (discount < 0) {
        throw badRequest("Discount amount cannot be negative");
      }
      if (discount > subtotal) {
        throw badRequest("Discount cannot be more than Subtotal");
      }
      if (tax < 0) {
        throw badRequest("Tax amount cannot be negative");
      }
      if (paid < 0) {
        throw badRequest("Paid amount cannot be negative");
      }

      const totalAmount = subtotal - discount + tax;
      const balanceAmount = totalAmount - paid;

      if (balanceAmount < 0) {
        throw badRequest("Paid Amount cannot be more than Net Amount");
      }

      let finalDueDate = null;
      if (balanceAmount > 0) {
        if (!dueDate) {
          throw badRequest("Due Date is required when a balance is due");
        }
        const todayStr = new Date().toISOString().slice(0, 10);
        if (dueDate < todayStr) {
          throw badRequest("Due Date cannot be in the past");
        }
        finalDueDate = dueDate;
      }

      let finalPurchaserName = null;
      let finalPurchaserCnic = null;
      if (vendorId) {
        finalPurchaserName = null;
        finalPurchaserCnic = null;
      } else if (purchaserName || purchaserCnic) {
        const cnicClean = purchaserCnic ? purchaserCnic.trim() : "";
        if (cnicClean && !/^\d{5}-?\d{7}-?\d{1}$/.test(cnicClean)) {
          throw badRequest("Invalid CNIC format. Expected format: 12345-1234567-1 or 13 digits");
        }
        finalPurchaserName = purchaserName ? purchaserName.trim() : null;
        finalPurchaserCnic = cnicClean || null;
      }

      await connection.execute(
        `UPDATE purchase_orders
         SET vendor_id = ?, purchaser_name = ?, purchaser_cnic = ?, purchase_date = ?,
             subtotal = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, paid_amount = ?, balance_amount = ?, due_date = ?, notes = ?
         WHERE id = ?`,
        [
          vendorId || null,
          finalPurchaserName,
          finalPurchaserCnic,
          purchaseDate,
          subtotal,
          discount,
          tax,
          totalAmount,
          paid,
          balanceAmount,
          finalDueDate,
          notes || null,
          purchaseId
        ]
      );

      // Update initial payment
      const [payments] = await connection.execute(
        `SELECT id FROM payments WHERE reference_type = 'purchase' AND reference_id = ? ORDER BY id ASC LIMIT 1`,
        [purchaseId]
      );
      if (payments.length) {
        if (Number(paidAmount) > 0) {
          await connection.execute(
            `UPDATE payments
             SET amount = ?, payment_method = ?, payment_date = ?, party_id = ?
             WHERE id = ?`,
            [paidAmount, paymentMethod, purchaseDate, vendorId || null, payments[0].id]
          );
        } else {
          await connection.execute(`DELETE FROM payments WHERE id = ?`, [payments[0].id]);
        }
      } else if (Number(paidAmount) > 0) {
        await connection.execute(
          `INSERT INTO payments
          (reference_type, reference_id, direction, branch_id, party_id, payment_method, amount, payment_date, notes, created_by)
          VALUES ('purchase', ?, 'out', ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchaseId,
            branchId,
            vendorId || null,
            paymentMethod,
            paidAmount,
            purchaseDate,
            "Initial purchase payment (updated)",
            req.user.id
          ]
        );
      }

      // Update payables
      const [payables] = await connection.execute(
        `SELECT id FROM payables WHERE purchase_order_id = ?`,
        [purchaseId]
      );
      const payStatus = balanceAmount <= 0 ? "paid" : (Number(paidAmount) > 0 ? "partial" : "pending");
      if (payables.length) {
        await connection.execute(
          `UPDATE payables
           SET party_id = ?, total_amount = ?, paid_amount = ?, balance_amount = ?, due_date = ?, status = ?
           WHERE id = ?`,
          [vendorId || null, totalAmount, paidAmount, balanceAmount, finalDueDate, payStatus, payables[0].id]
        );
      } else if (balanceAmount > 0) {
        await connection.execute(
          `INSERT INTO payables
          (purchase_order_id, party_id, branch_id, total_amount, paid_amount, balance_amount, due_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchaseId,
            vendorId || null,
            branchId,
            totalAmount,
            paidAmount,
            balanceAmount,
            finalDueDate,
            payStatus
          ]
        );
      }

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "edit",
        entityType: "purchase_order",
        entityId: purchaseId,
        details: { invoiceNumber: existingPurchase.invoice_number, itemCount: items.length, subtotal, discountAmount: discount, totalAmount }
      });
    });

    const [updatedPurchase] = await query(
      `SELECT po.*, p.name AS vendor_name
       FROM purchase_orders po
       LEFT JOIN parties p ON p.id = po.vendor_id
       WHERE po.id = ?`,
      [purchaseId]
    );
    const updatedItems = await query(
      `SELECT poi.*, mm.company, mm.model_name, mm.variant, mm.color, mm.storage,
              p.name AS product_name, p.sku AS product_sku
       FROM purchase_order_items poi
       LEFT JOIN mobile_models mm ON mm.id = poi.model_id
       LEFT JOIN products p ON p.id = poi.product_id
       WHERE poi.purchase_order_id = ?`,
      [purchaseId]
    );

    res.json({ ...updatedPurchase, items: updatedItems });
  })
);

purchasesRouter.delete(
  "/:id",
  requirePermission("purchases", "delete"),
  asyncHandler(async (req, res) => {
    const { reason = "Purchase order cancelled by staff" } = req.body || {};
    const [purchase] = await query(
      `SELECT po.*, b.business_id
       FROM purchase_orders po
       JOIN branches b ON b.id = po.branch_id
       WHERE po.id = :id AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );
    if (!purchase) {
      const error = new Error("Purchase order not found");
      error.status = 404;
      throw error;
    }
    if (purchase.is_deleted) {
      throw badRequest("Purchase order is already deleted");
    }

    await withTransaction(async (connection) => {
      // Check if any IMEI in this purchase has been sold
      const [soldUnits] = await connection.execute(
        `SELECT imei FROM mobile_units WHERE purchase_order_id = ? AND current_status = 'sold'`,
        [purchase.id]
      );
      if (soldUnits.length > 0) {
        throw badRequest(
          `Cannot void purchase order because handset(s) with IMEI (${soldUnits.map((u) => u.imei).join(", ")}) have already been sold. Please void or edit the sale invoice first.`
        );
      }

      await connection.execute(
        `UPDATE purchase_orders
         SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?, deletion_reason = ?
         WHERE id = ?`,
        [req.user.id, reason, purchase.id]
      );

      await connection.execute(
        `UPDATE mobile_units
         SET current_status = 'cancelled'
         WHERE purchase_order_id = ? AND current_status = 'in_stock'`,
        [purchase.id]
      );

      // Revert product stock for non-serialized items
      const [prodItems] = await connection.execute(
        `SELECT product_id, quantity FROM purchase_order_items WHERE purchase_order_id = ? AND product_id IS NOT NULL`,
        [purchase.id]
      );
      for (const pItem of prodItems) {
        await connection.execute(
          `UPDATE product_stocks SET quantity = GREATEST(0, quantity - ?) WHERE branch_id = ? AND product_id = ?`,
          [pItem.quantity, purchase.branch_id, pItem.product_id]
        );
      }

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "delete",
        entityType: "purchase_order",
        entityId: purchase.id,
        details: { invoiceNumber: purchase.invoice_number, totalAmount: purchase.total_amount, reason }
      });
    });

    res.json({ message: "Purchase order deleted successfully", id: purchase.id });
  })
);

