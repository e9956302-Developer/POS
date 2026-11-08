import { pool, query } from "./pool.js";

async function columnExists(tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows[0].count) > 0;
}

export async function migrateDiscounts() {
  console.log("=== Checking Sale Order Discount Migrations ===");

  // 1. sale_orders discount columns
  if (!(await columnExists("sale_orders", "discount_type"))) {
    await query(`ALTER TABLE sale_orders ADD COLUMN discount_type ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed' AFTER subtotal`);
    console.log("✔ Added discount_type to sale_orders");
  }

  if (!(await columnExists("sale_orders", "discount_value"))) {
    await query(`ALTER TABLE sale_orders ADD COLUMN discount_value DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_type`);
    console.log("✔ Added discount_value to sale_orders");
  }

  if (!(await columnExists("sale_orders", "discount_amount"))) {
    await query(`ALTER TABLE sale_orders ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_value`);
    console.log("✔ Added discount_amount to sale_orders");
  }

  // 2. sale_order_items discount columns
  if (!(await columnExists("sale_order_items", "original_price"))) {
    await query(`ALTER TABLE sale_order_items ADD COLUMN original_price DECIMAL(12,2) NULL AFTER unit_price`);
    console.log("✔ Added original_price to sale_order_items");
  }

  if (!(await columnExists("sale_order_items", "discount_type"))) {
    await query(`ALTER TABLE sale_order_items ADD COLUMN discount_type ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed' AFTER original_price`);
    console.log("✔ Added discount_type to sale_order_items");
  }

  if (!(await columnExists("sale_order_items", "discount_value"))) {
    await query(`ALTER TABLE sale_order_items ADD COLUMN discount_value DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_type`);
    console.log("✔ Added discount_value to sale_order_items");
  }

  if (!(await columnExists("sale_order_items", "discount_amount"))) {
    await query(`ALTER TABLE sale_order_items ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_value`);
    console.log("✔ Added discount_amount to sale_order_items");
  }

  // Backfill existing rows so original_price matches unit_price
  await query(`UPDATE sale_order_items SET original_price = unit_price WHERE original_price IS NULL`);
  console.log("=== Sale Order Discount Migrations Complete ===");
}
