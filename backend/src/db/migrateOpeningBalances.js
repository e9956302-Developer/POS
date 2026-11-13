import { pool, query } from "./pool.js";

async function tableExists(tableName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows[0]?.count || 0) > 0;
}

export async function migrateOpeningBalances() {
  console.log("=== Checking Opening Balances Migration for Parties and Products ===");

  // 1. Add opening balance columns to parties table
  if (await tableExists("parties")) {
    if (!(await columnExists("parties", "opening_balance"))) {
      await query("ALTER TABLE parties ADD COLUMN opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER notes");
      console.log("✔ Added opening_balance to parties");
    }
    if (!(await columnExists("parties", "opening_balance_type"))) {
      await query("ALTER TABLE parties ADD COLUMN opening_balance_type ENUM('receivable', 'payable') NOT NULL DEFAULT 'receivable' AFTER opening_balance");
      console.log("✔ Added opening_balance_type to parties");
    }
    if (!(await columnExists("parties", "opening_balance_date"))) {
      await query("ALTER TABLE parties ADD COLUMN opening_balance_date DATE NULL AFTER opening_balance_type");
      console.log("✔ Added opening_balance_date to parties");
    }
  }

  // 2. Add opening stock columns to products table
  if (await tableExists("products")) {
    if (!(await columnExists("products", "opening_stock_quantity"))) {
      await query("ALTER TABLE products ADD COLUMN opening_stock_quantity INT NOT NULL DEFAULT 0 AFTER alert_quantity");
      console.log("✔ Added opening_stock_quantity to products");
    }
    if (!(await columnExists("products", "opening_cost_price"))) {
      await query("ALTER TABLE products ADD COLUMN opening_cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER opening_stock_quantity");
      console.log("✔ Added opening_cost_price to products");
    }
  }

  console.log("=== Opening Balances Migration Complete ===");
}

if (process.argv[1] && process.argv[1].endsWith("migrateOpeningBalances.js")) {
  migrateOpeningBalances()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
