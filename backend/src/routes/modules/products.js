import { Router } from "express";
import { query, withTransaction } from "../../db/pool.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { assertBranchAccess, requirePermission } from "../../middleware/auth.js";

export const productsRouter = Router();

// Helper to determine effective branch for categories and products
async function resolveBranchId(req, explicitBranchId) {
  if (req.user.branch_id) {
    return Number(req.user.branch_id);
  }
  if (explicitBranchId && explicitBranchId !== "all") {
    await assertBranchAccess(req.user, explicitBranchId);
    return Number(explicitBranchId);
  }
  const [b] = await query(
    "SELECT id FROM branches WHERE business_id = ? ORDER BY id ASC LIMIT 1",
    [req.user.business_id]
  );
  return b?.id || 1;
}

// --- Categories ---
productsRouter.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const { branchId } = req.query;
    let sql = `
      SELECT c.*, b.name AS branch_name
      FROM categories c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.business_id = :businessId
    `;
    const params = { businessId: req.user.business_id };
    if (branchId && branchId !== "all") {
      sql += " AND (c.branch_id = :branchId OR c.branch_id IS NULL)";
      params.branchId = branchId;
    }
    sql += " ORDER BY c.name ASC";
    const rows = await query(sql, params);
    res.json(rows);
  })
);

productsRouter.post(
  "/categories",
  requirePermission("inventory", "create"),
  asyncHandler(async (req, res) => {
    const { name, branchId } = req.body;
    if (!name || !name.trim()) {
      throw badRequest("Category name is required");
    }

    const targetBranchId = await resolveBranchId(req, branchId);
    const trimmed = name.trim();
    const [existing] = await query(
      "SELECT id FROM categories WHERE business_id = ? AND branch_id = ? AND name = ?",
      [req.user.business_id, targetBranchId, trimmed]
    );
    if (existing) {
      throw badRequest("Category already exists for this branch");
    }

    const result = await query(
      "INSERT INTO categories (business_id, branch_id, name) VALUES (?, ?, ?)",
      [req.user.business_id, targetBranchId, trimmed]
    );

    const [created] = await query(
      `SELECT c.*, b.name AS branch_name
       FROM categories c
       LEFT JOIN branches b ON b.id = c.branch_id
       WHERE c.id = ?`,
      [result.insertId]
    );
    res.status(201).json(created);
  })
);

productsRouter.put(
  "/categories/:id",
  requirePermission("inventory", "edit"),
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      throw badRequest("Category name is required");
    }

    const [existing] = await query(
      "SELECT id, branch_id FROM categories WHERE id = ? AND business_id = ?",
      [req.params.id, req.user.business_id]
    );
    if (!existing) {
      throw badRequest("Category not found");
    }
    await assertBranchAccess(req.user, existing.branch_id);

    const trimmed = name.trim();
    const [duplicate] = await query(
      "SELECT id FROM categories WHERE business_id = ? AND branch_id = ? AND name = ? AND id != ?",
      [req.user.business_id, existing.branch_id, trimmed, req.params.id]
    );
    if (duplicate) {
      throw badRequest("Category with this name already exists in this branch");
    }

    await query(
      "UPDATE categories SET name = ? WHERE id = ? AND business_id = ?",
      [trimmed, req.params.id, req.user.business_id]
    );

    const [updated] = await query(
      `SELECT c.*, b.name AS branch_name
       FROM categories c
       LEFT JOIN branches b ON b.id = c.branch_id
       WHERE c.id = ?`,
      [req.params.id]
    );
    res.json(updated);
  })
);

productsRouter.delete(
  "/categories/:id",
  requirePermission("inventory", "delete"),
  asyncHandler(async (req, res) => {
    const [existing] = await query(
      "SELECT id, branch_id FROM categories WHERE id = ? AND business_id = ?",
      [req.params.id, req.user.business_id]
    );
    if (!existing) {
      throw badRequest("Category not found");
    }
    await assertBranchAccess(req.user, existing.branch_id);

    const [assigned] = await query(
      "SELECT COUNT(*) AS count FROM products WHERE category_id = ? AND business_id = ? AND is_active = 1",
      [req.params.id, req.user.business_id]
    );
    if (assigned && assigned.count > 0) {
      throw badRequest("Cannot delete category with associated active products.");
    }

    await query("DELETE FROM categories WHERE id = ? AND business_id = ?", [req.params.id, req.user.business_id]);
    res.json({ success: true, message: "Category deleted successfully" });
  })
);


// --- Products ---
productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { categoryId, itemType, search, branchId, filterBranchOnly } = req.query;
    const currentBranchId = branchId || req.user.branch_id;

    let sql = `
      SELECT p.*,
             p.sale_price AS retail_price,
             c.name AS category_name,
             b.name AS branch_name,
             COALESCE(ps.quantity, 0) AS stock_quantity
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN branches b ON b.id = p.branch_id
      LEFT JOIN product_stocks ps ON ps.product_id = p.id AND ps.branch_id = :stockBranchId
      WHERE p.business_id = :businessId AND p.is_active = 1
    `;
    const params = {
      businessId: req.user.business_id,
      stockBranchId: currentBranchId || 1
    };

    if (filterBranchOnly && branchId && branchId !== "all") {
      sql += " AND (p.branch_id = :branchId OR p.branch_id IS NULL)";
      params.branchId = branchId;
    }
    if (categoryId) {
      sql += " AND p.category_id = :categoryId";
      params.categoryId = categoryId;
    }
    if (itemType) {
      sql += " AND p.item_type = :itemType";
      params.itemType = itemType;
    }
    if (search) {
      sql += " AND (p.name LIKE :search OR p.sku LIKE :search OR p.barcode LIKE :search)";
      params.search = `%${search}%`;
    }

    sql += " ORDER BY p.name ASC";
    const rows = await query(sql, params);
    console.log(`[PRODUCTS_API] User ${req.user?.id} (${req.user?.email}, branch: ${req.user?.branch_id}, biz: ${req.user?.business_id}) fetched ${rows.length} products:`, rows.map(r => r.name));
    res.json(rows);
  })
);

productsRouter.post(
  "/",
  requirePermission("inventory", "create"),
  asyncHandler(async (req, res) => {
    const {
      categoryId,
      name,
      sku,
      barcode,
      itemType = "accessory",
      hasImei = 0,
      costPrice = 0,
      salePrice = 0,
      retailPrice = 0,
      alertQuantity = 5,
      initialStock = 0,
      branchId
    } = req.body;

    if (!name || !name.trim()) {
      throw badRequest("Product name is required");
    }

    const targetBranchId = await resolveBranchId(req, branchId);
    const effectiveSalePrice = salePrice || retailPrice || 0;
    const trimmedName = name.trim();

    // Verify category belongs to this business if provided
    if (categoryId) {
      const [cat] = await query(
        "SELECT id FROM categories WHERE id = ? AND business_id = ?",
        [categoryId, req.user.business_id]
      );
      if (!cat) {
        throw badRequest("Selected category does not exist");
      }
    }

    const [existing] = await query(
      "SELECT id FROM products WHERE business_id = ? AND branch_id = ? AND name = ? AND is_active = 1",
      [req.user.business_id, targetBranchId, trimmedName]
    );
    if (existing) {
      throw badRequest(`Product "${trimmedName}" already exists for this branch`);
    }

    const createdId = await withTransaction(async (connection) => {
      const openingQty = Number(req.body.openingStockQuantity || initialStock || 0);
      const openingCost = Number(req.body.openingCostPrice || costPrice || 0);

      const [result] = await connection.execute(
        `INSERT INTO products
         (business_id, branch_id, category_id, name, sku, barcode, item_type, has_imei, cost_price, sale_price, alert_quantity, opening_stock_quantity, opening_cost_price, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          req.user.business_id,
          targetBranchId,
          categoryId || null,
          trimmedName,
          sku || null,
          barcode || null,
          itemType,
          hasImei ? 1 : 0,
          Number(costPrice || 0),
          Number(effectiveSalePrice),
          Number(alertQuantity || 5),
          openingQty,
          openingCost
        ]
      );

      const productId = result.insertId;

      if (!hasImei && openingQty > 0) {
        await connection.execute(
          `INSERT INTO product_stocks (business_id, branch_id, product_id, quantity)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
          [req.user.business_id, targetBranchId, productId, openingQty]
        );
      }

      return productId;
    });

    const [product] = await query(
      `SELECT p.*, c.name AS category_name, b.name AS branch_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN branches b ON b.id = p.branch_id
       WHERE p.id = ?`,
      [createdId]
    );

    res.status(201).json(product);
  })
);

productsRouter.put(
  "/:id",
  requirePermission("inventory", "edit"),
  asyncHandler(async (req, res) => {
    const [existing] = await query(
      "SELECT id, branch_id FROM products WHERE id = ? AND business_id = ?",
      [req.params.id, req.user.business_id]
    );
    if (!existing) {
      const error = new Error("Product not found");
      error.status = 404;
      throw error;
    }
    await assertBranchAccess(req.user, existing.branch_id);

    const { categoryId, name, sku, barcode, costPrice, salePrice, alertQuantity, isActive } = req.body;
    const updates = [];
    const params = { id: req.params.id, businessId: req.user.business_id };

    if (name !== undefined) {
      const trimmed = name.trim();
      const [duplicate] = await query(
        "SELECT id FROM products WHERE business_id = ? AND branch_id = ? AND name = ? AND id != ? AND is_active = 1",
        [req.user.business_id, existing.branch_id, trimmed, req.params.id]
      );
      if (duplicate) {
        throw badRequest(`Product "${trimmed}" already exists for this branch`);
      }
      updates.push("name = :name");
      params.name = trimmed;
    }
    if (categoryId !== undefined) {
      if (categoryId) {
        const [cat] = await query(
          "SELECT id FROM categories WHERE id = ? AND business_id = ?",
          [categoryId, req.user.business_id]
        );
        if (!cat) {
          throw badRequest("Selected category does not exist");
        }
      }
      updates.push("category_id = :categoryId");
      params.categoryId = categoryId || null;
    }
    if (sku !== undefined) {
      updates.push("sku = :sku");
      params.sku = sku || null;
    }
    if (barcode !== undefined) {
      updates.push("barcode = :barcode");
      params.barcode = barcode || null;
    }
    if (costPrice !== undefined) {
      updates.push("cost_price = :costPrice");
      params.costPrice = Number(costPrice);
    }
    if (salePrice !== undefined) {
      updates.push("sale_price = :salePrice");
      params.salePrice = Number(salePrice);
    }
    if (alertQuantity !== undefined) {
      updates.push("alert_quantity = :alertQuantity");
      params.alertQuantity = Number(alertQuantity);
    }
    if (req.body.openingStockQuantity !== undefined) {
      updates.push("opening_stock_quantity = :openingStockQuantity");
      params.openingStockQuantity = Number(req.body.openingStockQuantity);
    }
    if (req.body.openingCostPrice !== undefined) {
      updates.push("opening_cost_price = :openingCostPrice");
      params.openingCostPrice = Number(req.body.openingCostPrice);
    }
    if (isActive !== undefined) {
      updates.push("is_active = :isActive");
      params.isActive = isActive ? 1 : 0;
    }

    if (updates.length) {
      await query(`UPDATE products SET ${updates.join(", ")} WHERE id = :id AND business_id = :businessId`, params);
    }

    const [updated] = await query(
      `SELECT p.*, c.name AS category_name, b.name AS branch_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN branches b ON b.id = p.branch_id
       WHERE p.id = ?`,
      [req.params.id]
    );

    res.json(updated);
  })
);

productsRouter.delete(
  "/:id",
  requirePermission("inventory", "delete"),
  asyncHandler(async (req, res) => {
    const [existing] = await query(
      "SELECT id, branch_id FROM products WHERE id = ? AND business_id = ?",
      [req.params.id, req.user.business_id]
    );
    if (!existing) {
      throw badRequest("Product not found");
    }
    await assertBranchAccess(req.user, existing.branch_id);

    // Soft delete product by marking is_active = 0
    await query(
      "UPDATE products SET is_active = 0 WHERE id = ? AND business_id = ?",
      [req.params.id, req.user.business_id]
    );

    res.json({ success: true, message: "Product deactivated/deleted successfully" });
  })
);


// --- Product Stock Adjustments ---
productsRouter.post(
  "/stocks/adjust",
  requirePermission("inventory", "edit"),
  asyncHandler(async (req, res) => {
    const { branchId, productId, adjustmentType, quantity, quantityDelta, notes } = req.body;
    const effectiveQty = quantity !== undefined ? Number(quantity) : Math.abs(Number(quantityDelta || 0));
    const effectiveType = adjustmentType || (Number(quantityDelta) < 0 ? "out" : "in");

    if (!branchId || !productId || !effectiveQty || effectiveQty <= 0) {
      throw badRequest("branchId, productId and positive quantity are required");
    }
    await assertBranchAccess(req.user, branchId);

    const [product] = await query(
      "SELECT * FROM products WHERE id = ? AND business_id = ? AND branch_id = ?",
      [productId, req.user.business_id, branchId]
    );
    if (!product) {
      throw badRequest("Product not found for this branch");
    }

    const delta = effectiveType === "in" ? effectiveQty : -effectiveQty;

    await withTransaction(async (connection) => {
      const [existingStock] = await connection.execute(
        "SELECT id, quantity FROM product_stocks WHERE branch_id = ? AND product_id = ? FOR UPDATE",
        [branchId, productId]
      );

      let nextQty = delta;
      if (existingStock.length) {
        nextQty = existingStock[0].quantity + delta;
        if (nextQty < 0) {
          throw badRequest(`Cannot reduce stock below 0 (current: ${existingStock[0].quantity})`);
        }
        await connection.execute(
          "UPDATE product_stocks SET quantity = ? WHERE id = ?",
          [nextQty, existingStock[0].id]
        );
      } else {
        if (nextQty < 0) {
          throw badRequest("Initial stock cannot be negative");
        }
        await connection.execute(
          "INSERT INTO product_stocks (business_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)",
          [req.user.business_id, branchId, productId, nextQty]
        );
      }
    });

    const [stock] = await query(
      "SELECT * FROM product_stocks WHERE branch_id = ? AND product_id = ?",
      [branchId, productId]
    );
    res.json({ success: true, stock });
  })
);

productsRouter.get(
  "/stocks",
  asyncHandler(async (req, res) => {
    const { branchId } = req.query;
    if (!branchId) {
      throw badRequest("branchId query parameter is required");
    }
    await assertBranchAccess(req.user, branchId);
    const rows = await query(
      `SELECT ps.*, p.name AS product_name, p.sku, p.item_type, p.cost_price, p.sale_price, p.sale_price AS retail_price
       FROM product_stocks ps
       JOIN products p ON p.id = ps.product_id
       WHERE ps.branch_id = :branchId AND ps.business_id = :businessId AND p.branch_id = :branchId`,
      { branchId, businessId: req.user.business_id }
    );
    res.json(rows);
  })
);
