import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest, validationFailed } from "../../utils/http.js";
import { withTransaction, query } from "../../db/pool.js";
import { assertBranchAccess, businessScopeCondition, businessScopeParams, requirePermission } from "../../middleware/auth.js";
import { buildInvoiceNumber } from "../../utils/invoice.js";
import { createAuditLog } from "../../services/audit.js";

export const salesRouter = Router();

salesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { branchId, search, status, from, to } = req.query;
    let sql = `
      SELECT so.*, p.name AS customer_name, b.name AS branch_name,
             (SELECT COUNT(*) FROM sale_order_items soi WHERE soi.sale_order_id = so.id) AS total_items
      FROM sale_orders so
      JOIN branches b ON b.id = so.branch_id
      LEFT JOIN parties p ON p.id = so.customer_id
      WHERE ${businessScopeCondition(req.user, "b")}
    `;
    const params = businessScopeParams(req.user);

    if (branchId) {
      sql += ` AND so.branch_id = :branchId`;
      params.branchId = branchId;
    }
    if (status === "deleted") {
      sql += ` AND so.is_deleted = 1`;
    } else if (status === "active") {
      sql += ` AND COALESCE(so.is_deleted, 0) = 0`;
    }
    if (search) {
      sql += ` AND (so.invoice_number LIKE :search OR p.name LIKE :search OR so.payment_method LIKE :search OR so.notes LIKE :search)`;
      params.search = `%${search}%`;
    }
    if (from) {
      sql += ` AND so.sale_date >= :from`;
      params.from = from;
    }
    if (to) {
      sql += ` AND so.sale_date <= :to`;
      params.to = to;
    }

    sql += ` ORDER BY so.sale_date DESC, so.id DESC`;
    const rows = await query(sql, params);
    res.json(rows);
  })
);

salesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [sale] = await query(
      `SELECT so.*, p.name AS customer_name
       FROM sale_orders so
       JOIN branches b ON b.id = so.branch_id
       LEFT JOIN parties p ON p.id = so.customer_id
       WHERE so.id = :id
         AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );
    if (!sale) {
      const error = new Error("Sale not found");
      error.status = 404;
      throw error;
    }
    const items = await query(
      `SELECT soi.*,
              mm.company, mm.model_name, mm.variant, mm.color, mm.storage,
              p.name AS product_name, p.sku AS product_sku, p.item_type
       FROM sale_order_items soi
       LEFT JOIN mobile_models mm ON mm.id = soi.model_id
       LEFT JOIN products p ON p.id = soi.product_id
       WHERE soi.sale_order_id = :id`,
      { id: req.params.id }
    );
    res.json({ ...sale, items });
  })
);

salesRouter.post(
  "/",
  requirePermission("sales", "create"),
  asyncHandler(async (req, res) => {
    const {
      branchId,
      customerId,
      quickCustomer,
      saleDate,
      paymentMethod,
      discountType = "fixed",
      discountValue = 0,
      discountAmount = 0,
      taxAmount = 0,
      paidAmount = 0,
      dueDate = null,
      notes,
      items
    } = req.body;

    if (!branchId || !saleDate || !paymentMethod || !Array.isArray(items) || items.length === 0) {
      throw badRequest("branchId, saleDate, paymentMethod and items are required");
    }

    const saleId = await withTransaction(async (connection) => {
      await assertBranchAccess(req.user, branchId, connection);

      const imeiItems = items.filter((item) => item.imei);
      const productItems = items.filter((item) => item.productId && !item.imei);

      if (imeiItems.length + productItems.length !== items.length) {
        throw badRequest("Each sale item must be either a valid IMEI or a valid Product ID");
      }

      // --- COMPREHENSIVE MULTI-PRODUCT VALIDATION (All items checked before writing) ---
      const validationErrors = [];

      // A. Validate all IMEI items
      const verifiedUnitsMap = new Map();
      if (imeiItems.length) {
        for (const imeiItem of imeiItems) {
          const rawImei = String(imeiItem.imei || "").trim();
          const fallbackName = imeiItem.productName || imeiItem.name || `Mobile [${rawImei || "blank"}]`;

          if (rawImei.length < 14 || rawImei.length > 20) {
            validationErrors.push({
              product: fallbackName,
              imei: rawImei,
              issue: `Invalid IMEI format (${rawImei || "blank"})`,
              formattedMessage: `${fallbackName}: Invalid IMEI format (${rawImei || "blank"})`
            });
            continue;
          }

          if (Number(imeiItem.unitPrice || 0) < 0) {
            validationErrors.push({
              product: fallbackName,
              imei: rawImei,
              issue: "Sale price cannot be negative",
              formattedMessage: `${fallbackName}: Sale price cannot be negative`
            });
          }

          const [lockedUnits] = await connection.query(
            `SELECT mu.id, mu.imei, mu.model_id, mu.current_status, mu.cost_price,
                    mm.company, mm.model_name, mm.variant, mm.color
             FROM mobile_units mu
             LEFT JOIN mobile_models mm ON mm.id = mu.model_id
             WHERE mu.business_id = ? AND mu.branch_id = ? AND mu.imei = ?
             FOR UPDATE`,
            [req.user.business_id, branchId, rawImei]
          );

          if (!lockedUnits.length) {
            validationErrors.push({
              product: fallbackName,
              imei: rawImei,
              issue: `IMEI ${rawImei} was not found in branch inventory`,
              formattedMessage: `${fallbackName}: IMEI ${rawImei} was not found in branch inventory`
            });
          } else {
            const unit = lockedUnits[0];
            const fullName = [unit.company, unit.model_name, unit.variant, unit.color].filter(Boolean).join(" ") || fallbackName;
            if (unit.current_status !== "in_stock") {
              validationErrors.push({
                product: fullName,
                imei: rawImei,
                issue: `Unit is already ${unit.current_status} and not available for sale`,
                formattedMessage: `${fullName}: Unit is not available for sale (status: ${unit.current_status})`
              });
            } else {
              verifiedUnitsMap.set(rawImei, { ...unit, fullName, cost_price: Number(unit.cost_price || 0), unitPrice: imeiItem.unitPrice });
            }
          }
        }
      }

      // B. Validate all Product items (non-serialized)
      const verifiedProductsMap = new Map();
      if (productItems.length) {
        for (const pItem of productItems) {
          const qty = Number(pItem.quantity || 1);
          const fallbackName = pItem.productName || pItem.name || `Product #${pItem.productId}`;

          if (qty <= 0 || isNaN(qty)) {
            validationErrors.push({
              product: fallbackName,
              productId: pItem.productId,
              issue: "Quantity must be greater than zero",
              formattedMessage: `${fallbackName}: Quantity must be greater than zero`
            });
          }

          if (Number(pItem.unitPrice || 0) < 0) {
            validationErrors.push({
              product: fallbackName,
              productId: pItem.productId,
              issue: "Sale price cannot be negative",
              formattedMessage: `${fallbackName}: Sale price cannot be negative`
            });
          }

          const [prodRows] = await connection.execute(
            `SELECT p.id, p.name, p.sku, p.item_type, p.is_active, p.sale_price, p.cost_price,
                    COALESCE(ps.quantity, 0) AS available_quantity, ps.id AS stock_id
             FROM products p
             LEFT JOIN product_stocks ps ON ps.product_id = p.id AND ps.branch_id = ?
             WHERE p.id = ? AND p.business_id = ?
             FOR UPDATE`,
            [branchId, pItem.productId, req.user.business_id]
          );

          if (!prodRows.length) {
            validationErrors.push({
              product: fallbackName,
              productId: pItem.productId,
              issue: "Product was not found or does not belong to this business",
              formattedMessage: `${fallbackName}: Product was not found or does not belong to this business`
            });
          } else {
            const prod = prodRows[0];
            const pName = prod.name || fallbackName;

            if (prod.is_active !== undefined && prod.is_active !== null && Number(prod.is_active) === 0) {
              validationErrors.push({
                product: pName,
                productId: prod.id,
                issue: "Product is disabled / inactive",
                formattedMessage: `${pName}: Product is disabled / inactive`
              });
            }

            if (prod.item_type !== "service") {
              const available = Number(prod.available_quantity || 0);
              if (available < qty) {
                validationErrors.push({
                  product: pName,
                  productId: prod.id,
                  available,
                  requested: qty,
                  issue: `Insufficient stock (requested ${qty}, only ${available} available)`,
                  formattedMessage: `${pName}: Insufficient stock (requested ${qty}, only ${available} available)`
                });
              }
            }

            verifiedProductsMap.set(Number(pItem.productId), {
              ...prod,
              cost_price: Number(prod.cost_price || 0),
              productName: pName,
              requestedQty: qty,
              unitPrice: pItem.unitPrice
            });
          }
        }
      }

      // C. All-or-nothing gate: If ANY product has an issue, abort immediately with 422!
      if (validationErrors.length > 0) {
        const header = `Cannot complete sale — ${validationErrors.length} product${validationErrors.length > 1 ? "s have" : " has"} issues:`;
        throw validationFailed(header, validationErrors);
      }

      // --- ALL VALIDATIONS PASSED: EXECUTE ATOMIC TRANSACTION ---

      let resolvedCustomerId = customerId || null;

      if (resolvedCustomerId) {
        const [customers] = await connection.execute(
          `SELECT p.id
           FROM parties p
           LEFT JOIN branches b ON b.id = p.branch_id
           WHERE p.id = ?
             AND p.business_id = ?
             AND p.party_type IN ('customer', 'both')
             AND (p.branch_id IS NULL OR b.business_id = ?)`,
          [resolvedCustomerId, req.user.business_id, req.user.business_id]
        );
        if (!customers.length) {
          throw badRequest("Customer does not belong to this business");
        }
      }

      if (!resolvedCustomerId && quickCustomer?.name) {
        const [partyResult] = await connection.execute(
          `INSERT INTO parties (business_id, branch_id, party_type, name, phone, cnic, address, notes)
           VALUES (?, ?, 'customer', ?, ?, ?, ?, ?)`,
          [
            req.user.business_id,
            branchId,
            quickCustomer.name,
            quickCustomer.phone || null,
            quickCustomer.cnic || null,
            quickCustomer.address || null,
            "Created during sale"
          ]
        );
        resolvedCustomerId = partyResult.insertId;
      }

      // --- RESOLVE LINE-ITEM & ORDER DISCOUNTS ---
      const resolvedItems = [];
      let itemsSubtotal = 0;
      let grossSubtotal = 0;
      let totalItemDiscounts = 0;
      const cashierChecks = [];

      for (const item of items) {
        const qty = item.productId && !item.imei ? Number(item.quantity || 1) : 1;
        const origPrice = Number(item.originalPrice !== undefined && item.originalPrice !== null ? item.originalPrice : (item.unitPrice || 0));
        const discType = item.discountType === "percentage" ? "percentage" : "fixed";
        const discVal = Number(item.discountValue || 0);
        let discAmt = 0;

        if (discType === "percentage") {
          if (discVal < 0 || discVal > 100) {
            throw badRequest("Item discount percentage must be between 0 and 100");
          }
          discAmt = Math.round(((origPrice * discVal) / 100) * 100) / 100;
        } else {
          discAmt = Number(item.discountAmount !== undefined && item.discountAmount !== null ? item.discountAmount : discVal);
        }

        if (discAmt < 0) {
          throw badRequest("Item discount cannot be negative");
        }
        if (discAmt > origPrice) {
          throw badRequest("Item discount cannot exceed unit price");
        }

        const netUnitPrice = Math.max(0, origPrice - discAmt);

        resolvedItems.push({
          ...item,
          originalPrice: origPrice,
          discountType: discType,
          discountValue: discVal,
          discountAmount: discAmt,
          unitPrice: netUnitPrice,
          quantity: qty
        });

        grossSubtotal += origPrice * qty;
        totalItemDiscounts += discAmt * qty;
        itemsSubtotal += netUnitPrice * qty;

        if (item.imei) {
          const rawImei = String(item.imei).trim();
          const unit = verifiedUnitsMap.get(rawImei);
          if (unit) {
            cashierChecks.push({
              name: unit.fullName || `IMEI ${rawImei}`,
              costPrice: Number(unit.cost_price || 0),
              unitPrice: netUnitPrice
            });
          }
        } else if (item.productId) {
          const prod = verifiedProductsMap.get(Number(item.productId));
          if (prod) {
            cashierChecks.push({
              name: prod.productName || `Product #${item.productId}`,
              costPrice: Number(prod.cost_price || 0),
              unitPrice: netUnitPrice
            });
          }
        }
      }

      // Order-level discount
      const orderDiscType = discountType === "percentage" ? "percentage" : "fixed";
      const orderDiscVal = Number(discountValue || 0);
      let orderDiscAmt = 0;

      if (orderDiscType === "percentage") {
        if (orderDiscVal < 0 || orderDiscVal > 100) {
          throw badRequest("Order discount percentage must be between 0 and 100");
        }
        orderDiscAmt = Math.round(((itemsSubtotal * orderDiscVal) / 100) * 100) / 100;
      } else {
        orderDiscAmt = Number(discountAmount !== undefined && discountAmount !== null ? discountAmount : orderDiscVal);
      }

      if (orderDiscAmt < 0) {
        throw badRequest("Order discount cannot be negative");
      }
      if (orderDiscAmt > itemsSubtotal) {
        throw badRequest("Order discount cannot exceed order subtotal");
      }

      const totalDiscounts = totalItemDiscounts + orderDiscAmt;

      // Role discount ceilings & cost floor checks for Cashier
      if (req.user && req.user.role === "cashier") {
        const maxPct = 5;
        const maxPkr = 2000;
        if (totalDiscounts > maxPkr || (grossSubtotal > 0 && (totalDiscounts / grossSubtotal) * 100 > maxPct)) {
          throw badRequest(`Total discount (PKR ${totalDiscounts.toLocaleString()}) exceeds cashier allowance limit (Max ${maxPct}% or PKR ${maxPkr.toLocaleString()}). Manager approval required.`);
        }
        for (const check of cashierChecks) {
          if (check.costPrice > 0 && check.unitPrice < check.costPrice) {
            throw badRequest(`Selling price (PKR ${check.unitPrice.toLocaleString()}) for ${check.name} cannot be lower than cost price (PKR ${check.costPrice.toLocaleString()}) under cashier role.`);
          }
        }
      }

      const subtotal = itemsSubtotal;
      const totalAmount = Math.max(0, subtotal - orderDiscAmt + Number(taxAmount || 0));
      const balanceAmount = totalAmount - Number(paidAmount || 0);

      if (balanceAmount < 0) {
        throw badRequest("Paid amount cannot be greater than total amount");
      }

      const [saleResult] = await connection.execute(
        `INSERT INTO sale_orders
        (invoice_number, branch_id, customer_id, sale_date, payment_method, subtotal, discount_type, discount_value, discount_amount, tax_amount, total_amount, paid_amount, balance_amount, due_date, notes, created_by)
        VALUES ('TEMP', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          branchId,
          resolvedCustomerId,
          saleDate,
          paymentMethod,
          subtotal,
          orderDiscType,
          orderDiscVal,
          orderDiscAmt,
          taxAmount,
          totalAmount,
          paidAmount,
          balanceAmount,
          dueDate,
          notes || null,
          req.user.id
        ]
      );

      const invoiceNumber = buildInvoiceNumber("SAL", saleResult.insertId);
      await connection.execute(`UPDATE sale_orders SET invoice_number = ? WHERE id = ?`, [invoiceNumber, saleResult.insertId]);

      for (const item of resolvedItems) {
        if (item.imei) {
          const rawImei = String(item.imei).trim();
          const mobileUnit = verifiedUnitsMap.get(rawImei);
          await connection.execute(
            `INSERT INTO sale_order_items (sale_order_id, mobile_unit_id, imei, model_id, unit_price, original_price, discount_type, discount_value, discount_amount, quantity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              saleResult.insertId,
              mobileUnit.id,
              rawImei,
              mobileUnit.model_id,
              item.unitPrice,
              item.originalPrice,
              item.discountType,
              item.discountValue,
              item.discountAmount
            ]
          );

          const [stockUpdate] = await connection.execute(
            `UPDATE mobile_units
             SET current_status = 'sold', sale_order_id = ?, sale_price = ?
             WHERE id = ? AND business_id = ? AND current_status = 'in_stock'`,
            [saleResult.insertId, item.unitPrice, mobileUnit.id, req.user.business_id]
          );
          if (stockUpdate.affectedRows !== 1) {
            throw badRequest(`IMEI ${rawImei} is no longer available for sale`);
          }

          await connection.execute(
            `INSERT INTO stock_movements
            (business_id, branch_id, mobile_unit_id, model_id, movement_type, reference_type, reference_id, quantity, unit_price, created_by)
            VALUES (?, ?, ?, ?, 'sale_out', 'sale_order', ?, -1, ?, ?)`,
            [
              req.user.business_id,
              branchId,
              mobileUnit.id,
              mobileUnit.model_id,
              saleResult.insertId,
              item.unitPrice,
              req.user.id
            ]
          );
        } else {
          const prod = verifiedProductsMap.get(Number(item.productId));
          const qty = Number(item.quantity || 1);

          await connection.execute(
            `INSERT INTO sale_order_items (sale_order_id, product_id, unit_price, original_price, discount_type, discount_value, discount_amount, quantity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              saleResult.insertId,
              item.productId,
              item.unitPrice,
              item.originalPrice,
              item.discountType,
              item.discountValue,
              item.discountAmount,
              qty
            ]
          );

          if (prod && prod.item_type !== "service" && prod.stock_id) {
            await connection.execute(
              "UPDATE product_stocks SET quantity = quantity - ? WHERE id = ?",
              [qty, prod.stock_id]
            );
          }
        }
      }

      if (Number(paidAmount) > 0) {
        await connection.execute(
          `INSERT INTO payments
          (reference_type, reference_id, direction, branch_id, party_id, payment_method, amount, payment_date, notes, created_by)
          VALUES ('sale', ?, 'in', ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleResult.insertId,
            branchId,
            resolvedCustomerId,
            paymentMethod,
            paidAmount,
            saleDate,
            "Initial sale payment",
            req.user.id
          ]
        );
      }

      if (balanceAmount > 0) {
        await connection.execute(
          `INSERT INTO receivables
          (sale_order_id, party_id, branch_id, total_amount, paid_amount, balance_amount, due_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleResult.insertId,
            resolvedCustomerId,
            branchId,
            totalAmount,
            paidAmount,
            balanceAmount,
            dueDate,
            paidAmount > 0 ? "partial" : "pending"
          ]
        );
      }

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "create",
        entityType: "sale_order",
        entityId: saleResult.insertId,
        details: { itemCount: items.length, subtotal, totalAmount }
      });

      return saleResult.insertId;
    });

    const [saved] = await query(`SELECT * FROM sale_orders WHERE id = :id`, { id: saleId });
    res.status(201).json(saved);
  })
);

salesRouter.put(
  "/:id",
  requirePermission("sales", "edit"),
  asyncHandler(async (req, res) => {
    const saleId = req.params.id;
    const {
      customerId,
      quickCustomer,
      saleDate,
      paymentMethod,
      discountType = "fixed",
      discountValue = 0,
      discountAmount = 0,
      taxAmount = 0,
      paidAmount = 0,
      dueDate = null,
      notes,
      items
    } = req.body;

    if (!saleDate || !paymentMethod || !Array.isArray(items) || items.length === 0) {
      throw badRequest("saleDate, paymentMethod and items are required");
    }

    const [existingSale] = await query(
      `SELECT so.*, b.business_id
       FROM sale_orders so
       JOIN branches b ON b.id = so.branch_id
       WHERE so.id = :id AND ${businessScopeCondition(req.user, "b")}`,
      { id: saleId, ...businessScopeParams(req.user) }
    );

    if (!existingSale) {
      const error = new Error("Sale order not found");
      error.status = 404;
      throw error;
    }

    if (existingSale.is_deleted) {
      throw badRequest("Cannot edit a deleted or voided sale order");
    }

    const branchId = existingSale.branch_id;

    await withTransaction(async (connection) => {
      await assertBranchAccess(req.user, branchId, connection);

      const imeiItems = items.filter((item) => item.imei);
      const productItems = items.filter((item) => item.productId && !item.imei);

      if (imeiItems.length + productItems.length !== items.length) {
        throw badRequest("Each sale item must be either a valid IMEI or a valid Product ID");
      }

      const invalidImei = imeiItems.find((item) => item.imei.length < 14 || item.imei.length > 20);
      if (invalidImei) {
        throw badRequest(`Invalid IMEI: ${invalidImei.imei || "blank"}`);
      }

      let resolvedCustomerId = customerId || null;

      if (resolvedCustomerId) {
        const [customers] = await connection.execute(
          `SELECT p.id
           FROM parties p
           LEFT JOIN branches b ON b.id = p.branch_id
           WHERE p.id = ?
             AND p.business_id = ?
             AND p.party_type IN ('customer', 'both')
             AND (p.branch_id IS NULL OR b.business_id = ?)`,
          [resolvedCustomerId, req.user.business_id, req.user.business_id]
        );
        if (!customers.length) {
          throw badRequest("Customer does not belong to this business");
        }
      }

      if (!resolvedCustomerId && quickCustomer?.name) {
        const [partyResult] = await connection.execute(
          `INSERT INTO parties (business_id, branch_id, party_type, name, phone, cnic, address, notes)
           VALUES (?, ?, 'customer', ?, ?, ?, ?, ?)`,
          [
            req.user.business_id,
            branchId,
            quickCustomer.name,
            quickCustomer.phone || null,
            quickCustomer.cnic || null,
            quickCustomer.address || null,
            "Created during sale edit"
          ]
        );
        resolvedCustomerId = partyResult.insertId;
      }

      // Fetch existing items
      const [oldItems] = await connection.execute(
        `SELECT soi.*, mu.imei AS unit_imei
         FROM sale_order_items soi
         LEFT JOIN mobile_units mu ON mu.id = soi.mobile_unit_id
         WHERE soi.sale_order_id = ?`,
        [saleId]
      );

      const oldImeis = oldItems.filter((i) => i.imei || i.unit_imei).map((i) => (i.imei || i.unit_imei).trim());
      const newImeis = imeiItems.map((i) => i.imei.trim());

      // 1. Handsets removed from this sale -> revert to in_stock
      const removedImeis = oldImeis.filter((imei) => !newImeis.includes(imei));
      for (const imei of removedImeis) {
        await connection.execute(
          `UPDATE mobile_units
           SET current_status = 'in_stock', sale_order_id = NULL, sale_price = NULL
           WHERE business_id = ? AND imei = ? AND sale_order_id = ?`,
          [req.user.business_id, imei, saleId]
        );
      }

      // 2. Handsets newly added to this sale -> verify in_stock and mark sold
      const addedImeis = newImeis.filter((imei) => !oldImeis.includes(imei));
      let newlyLockedUnits = [];
      if (addedImeis.length) {
        const [lockedUnits] = await connection.query(
          `SELECT id, imei, model_id, current_status
           FROM mobile_units
           WHERE business_id = ? AND branch_id = ? AND imei IN (?)
           FOR UPDATE`,
          [req.user.business_id, branchId, addedImeis]
        );
        newlyLockedUnits = lockedUnits;

        if (newlyLockedUnits.length !== addedImeis.length) {
          throw badRequest("Some added IMEIs were not found in branch inventory");
        }

        const unavailableUnit = newlyLockedUnits.find((u) => u.current_status !== "in_stock");
        if (unavailableUnit) {
          throw badRequest(`IMEI ${unavailableUnit.imei} is not available for sale (status: ${unavailableUnit.current_status})`);
        }
      }

      // 3. Handsets kept in this sale -> get unit details
      const keptImeis = newImeis.filter((imei) => oldImeis.includes(imei));
      let keptUnits = [];
      if (keptImeis.length) {
        const [units] = await connection.query(
          `SELECT id, imei, model_id, current_status
           FROM mobile_units
           WHERE business_id = ? AND imei IN (?)`,
          [req.user.business_id, keptImeis]
        );
        keptUnits = units;
      }

      const allActiveUnits = [...newlyLockedUnits, ...keptUnits];

      // 4. Non-serialized product stock reconciliation
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
        if (qty <= 0) throw badRequest("Quantity must be greater than zero");
        newProdMap.set(pid, (newProdMap.get(pid) || 0) + qty);
      }

      const allProductIds = new Set([...oldProdMap.keys(), ...newProdMap.keys()]);
      for (const pid of allProductIds) {
        const [prodRows] = await connection.execute(
          "SELECT id, item_type FROM products WHERE id = ? AND business_id = ?",
          [pid, req.user.business_id]
        );
        if (!prodRows.length) {
          throw badRequest(`Product ID ${pid} not found`);
        }

        if (prodRows[0].item_type !== "service") {
          const oldQty = oldProdMap.get(pid) || 0;
          const newQty = newProdMap.get(pid) || 0;
          const diff = newQty - oldQty; // diff > 0 means more sold, need to deduct; diff < 0 means fewer sold, need to restore

          if (diff > 0) {
            const [stockRows] = await connection.execute(
              "SELECT id, quantity FROM product_stocks WHERE branch_id = ? AND product_id = ? FOR UPDATE",
              [branchId, pid]
            );
            const currentQty = stockRows[0]?.quantity || 0;
            if (currentQty < diff) {
              throw badRequest(`Insufficient stock for product ID ${pid} (available: ${currentQty}, needed: ${diff})`);
            }
            await connection.execute(
              "UPDATE product_stocks SET quantity = quantity - ? WHERE id = ?",
              [diff, stockRows[0].id]
            );
          } else if (diff < 0) {
            await connection.execute(
              `INSERT INTO product_stocks (business_id, branch_id, product_id, quantity)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
              [req.user.business_id, branchId, pid, Math.abs(diff), Math.abs(diff)]
            );
          }
        }
      }

      // 5. Delete old sale_order_items and insert updated items
      await connection.execute(`DELETE FROM sale_order_items WHERE sale_order_id = ?`, [saleId]);

      // --- RESOLVE LINE-ITEM & ORDER DISCOUNTS ---
      const resolvedItems = [];
      let itemsSubtotal = 0;
      let grossSubtotal = 0;
      let totalItemDiscounts = 0;

      for (const item of items) {
        const qty = item.productId && !item.imei ? Number(item.quantity || 1) : 1;
        const origPrice = Number(item.originalPrice !== undefined && item.originalPrice !== null ? item.originalPrice : (item.unitPrice || 0));
        const discType = item.discountType === "percentage" ? "percentage" : "fixed";
        const discVal = Number(item.discountValue || 0);
        let discAmt = 0;

        if (discType === "percentage") {
          if (discVal < 0 || discVal > 100) {
            throw badRequest("Item discount percentage must be between 0 and 100");
          }
          discAmt = Math.round(((origPrice * discVal) / 100) * 100) / 100;
        } else {
          discAmt = Number(item.discountAmount !== undefined && item.discountAmount !== null ? item.discountAmount : discVal);
        }

        if (discAmt < 0) {
          throw badRequest("Item discount cannot be negative");
        }
        if (discAmt > origPrice) {
          throw badRequest("Item discount cannot exceed unit price");
        }

        const netUnitPrice = Math.max(0, origPrice - discAmt);

        resolvedItems.push({
          ...item,
          originalPrice: origPrice,
          discountType: discType,
          discountValue: discVal,
          discountAmount: discAmt,
          unitPrice: netUnitPrice,
          quantity: qty
        });

        grossSubtotal += origPrice * qty;
        totalItemDiscounts += discAmt * qty;
        itemsSubtotal += netUnitPrice * qty;
      }

      // Order-level discount
      const orderDiscType = discountType === "percentage" ? "percentage" : "fixed";
      const orderDiscVal = Number(discountValue || 0);
      let orderDiscAmt = 0;

      if (orderDiscType === "percentage") {
        if (orderDiscVal < 0 || orderDiscVal > 100) {
          throw badRequest("Order discount percentage must be between 0 and 100");
        }
        orderDiscAmt = Math.round(((itemsSubtotal * orderDiscVal) / 100) * 100) / 100;
      } else {
        orderDiscAmt = Number(discountAmount !== undefined && discountAmount !== null ? discountAmount : orderDiscVal);
      }

      if (orderDiscAmt < 0) {
        throw badRequest("Order discount cannot be negative");
      }
      if (orderDiscAmt > itemsSubtotal) {
        throw badRequest("Order discount cannot exceed order subtotal");
      }

      for (const item of resolvedItems) {
        if (item.imei) {
          const cleanImei = item.imei.trim();
          const unit = allActiveUnits.find((u) => u.imei === cleanImei);
          if (!unit) {
            throw badRequest(`Mobile unit not found for IMEI ${cleanImei}`);
          }
          await connection.execute(
            `INSERT INTO sale_order_items (sale_order_id, mobile_unit_id, imei, model_id, unit_price, original_price, discount_type, discount_value, discount_amount, quantity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              saleId,
              unit.id,
              cleanImei,
              unit.model_id,
              item.unitPrice,
              item.originalPrice,
              item.discountType,
              item.discountValue,
              item.discountAmount
            ]
          );
          await connection.execute(
            `UPDATE mobile_units
             SET current_status = 'sold', sale_order_id = ?, sale_price = ?
             WHERE id = ?`,
            [saleId, item.unitPrice, unit.id]
          );
        } else {
          await connection.execute(
            `INSERT INTO sale_order_items (sale_order_id, product_id, unit_price, original_price, discount_type, discount_value, discount_amount, quantity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              saleId,
              Number(item.productId),
              item.unitPrice,
              item.originalPrice,
              item.discountType,
              item.discountValue,
              item.discountAmount,
              Number(item.quantity || 1)
            ]
          );
        }
      }

      // 6. Recalculate totals
      const subtotal = itemsSubtotal;
      const totalAmount = Math.max(0, subtotal - orderDiscAmt + Number(taxAmount || 0));
      const balanceAmount = totalAmount - Number(paidAmount || 0);

      if (balanceAmount < 0) {
        throw badRequest("Paid amount cannot be greater than total amount");
      }

      await connection.execute(
        `UPDATE sale_orders
         SET customer_id = ?, sale_date = ?, payment_method = ?, subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?, tax_amount = ?,
             total_amount = ?, paid_amount = ?, balance_amount = ?, due_date = ?, notes = ?
         WHERE id = ?`,
        [
          resolvedCustomerId,
          saleDate,
          paymentMethod,
          subtotal,
          orderDiscType,
          orderDiscVal,
          orderDiscAmt,
          taxAmount,
          totalAmount,
          paidAmount,
          balanceAmount,
          dueDate,
          notes || null,
          saleId
        ]
      );

      // 7. Update initial payment if any
      const [payments] = await connection.execute(
        `SELECT id FROM payments WHERE reference_type = 'sale' AND reference_id = ? ORDER BY id ASC LIMIT 1`,
        [saleId]
      );
      if (payments.length) {
        if (Number(paidAmount) > 0) {
          await connection.execute(
            `UPDATE payments
             SET amount = ?, payment_method = ?, payment_date = ?, party_id = ?
             WHERE id = ?`,
            [paidAmount, paymentMethod, saleDate, resolvedCustomerId, payments[0].id]
          );
        } else {
          await connection.execute(`DELETE FROM payments WHERE id = ?`, [payments[0].id]);
        }
      } else if (Number(paidAmount) > 0) {
        await connection.execute(
          `INSERT INTO payments
          (reference_type, reference_id, direction, branch_id, party_id, payment_method, amount, payment_date, notes, created_by)
          VALUES ('sale', ?, 'in', ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            branchId,
            resolvedCustomerId,
            paymentMethod,
            paidAmount,
            saleDate,
            "Initial sale payment (updated)",
            req.user.id
          ]
        );
      }

      // 8. Update receivables
      const [receivables] = await connection.execute(
        `SELECT id FROM receivables WHERE sale_order_id = ?`,
        [saleId]
      );
      const recStatus = balanceAmount <= 0 ? "paid" : (Number(paidAmount) > 0 ? "partial" : "pending");
      if (receivables.length) {
        await connection.execute(
          `UPDATE receivables
           SET party_id = ?, total_amount = ?, paid_amount = ?, balance_amount = ?, due_date = ?, status = ?
           WHERE id = ?`,
          [resolvedCustomerId, totalAmount, paidAmount, balanceAmount, dueDate, recStatus, receivables[0].id]
        );
      } else if (balanceAmount > 0) {
        await connection.execute(
          `INSERT INTO receivables
          (sale_order_id, party_id, branch_id, total_amount, paid_amount, balance_amount, due_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            resolvedCustomerId,
            branchId,
            totalAmount,
            paidAmount,
            balanceAmount,
            dueDate,
            recStatus
          ]
        );
      }

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "edit",
        entityType: "sale_order",
        entityId: saleId,
        details: { invoiceNumber: existingSale.invoice_number, itemCount: items.length, subtotal, totalAmount }
      });
    });

    const [updatedSale] = await query(
      `SELECT so.*, p.name AS customer_name
       FROM sale_orders so
       LEFT JOIN parties p ON p.id = so.customer_id
       WHERE so.id = ?`,
      [saleId]
    );
    const updatedItems = await query(
      `SELECT soi.*, mm.company, mm.model_name, mm.variant, mm.color, mm.storage,
              p.name AS product_name, p.sku AS product_sku, p.item_type
       FROM sale_order_items soi
       LEFT JOIN mobile_units mu ON mu.id = soi.mobile_unit_id
       LEFT JOIN mobile_models mm ON mm.id = soi.model_id
       LEFT JOIN products p ON p.id = soi.product_id
       WHERE soi.sale_order_id = ?`,
      [saleId]
    );

    res.json({ ...updatedSale, items: updatedItems });
  })
);

salesRouter.delete(
  "/:id",
  requirePermission("sales", "delete"),
  asyncHandler(async (req, res) => {
    const { reason = "Transaction voided by staff" } = req.body || {};
    const [sale] = await query(
      `SELECT so.*, b.business_id
       FROM sale_orders so
       JOIN branches b ON b.id = so.branch_id
       WHERE so.id = :id AND ${businessScopeCondition(req.user, "b")}`,
      { id: req.params.id, ...businessScopeParams(req.user) }
    );
    if (!sale) {
      const error = new Error("Sale order not found");
      error.status = 404;
      throw error;
    }
    if (sale.is_deleted) {
      throw badRequest("Sale order is already deleted");
    }

    await withTransaction(async (connection) => {
      await connection.execute(
        `UPDATE sale_orders
         SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?, deletion_reason = ?
         WHERE id = ?`,
        [req.user.id, reason, sale.id]
      );

      const [items] = await connection.execute(
        `SELECT mobile_unit_id FROM sale_order_items WHERE sale_order_id = ? AND mobile_unit_id IS NOT NULL`,
        [sale.id]
      );
      for (const item of items) {
        await connection.execute(
          `UPDATE mobile_units
           SET current_status = 'in_stock', sale_order_id = NULL
           WHERE id = ?`,
          [item.mobile_unit_id]
        );
      }

      // Revert product stock for non-serialized products
      const [prodItems] = await connection.execute(
        `SELECT product_id, quantity FROM sale_order_items WHERE sale_order_id = ? AND product_id IS NOT NULL`,
        [sale.id]
      );
      for (const pItem of prodItems) {
        await connection.execute(
          `UPDATE product_stocks SET quantity = quantity + ? WHERE branch_id = ? AND product_id = ?`,
          [pItem.quantity, sale.branch_id, pItem.product_id]
        );
      }

      await createAuditLog(connection, {
        userId: req.user.id,
        actionType: "delete",
        entityType: "sale_order",
        entityId: sale.id,
        details: { invoiceNumber: sale.invoice_number, totalAmount: sale.total_amount, reason }
      });
    });

    res.json({ message: "Sale order deleted successfully", id: sale.id });
  })
);


