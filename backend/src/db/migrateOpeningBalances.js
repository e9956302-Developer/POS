import { query } from "./pool.js";

async function migrate() {
  console.log("Starting Opening Balances Migration for Parties and Products...");

  // 1. Add opening balance columns to parties table
  try {
    const partyCols = await query("DESCRIBE parties");
    const partyColNames = partyCols.map((c) => c.Field);

    if (!partyColNames.includes("opening_balance")) {
      await query("ALTER TABLE parties ADD COLUMN opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER notes");
      console.log("Added opening_balance to parties");
    }
    if (!partyColNames.includes("opening_balance_type")) {
      await query("ALTER TABLE parties ADD COLUMN opening_balance_type ENUM('receivable', 'payable') NOT NULL DEFAULT 'receivable' AFTER opening_balance");
      console.log("Added opening_balance_type to parties");
    }
    if (!partyColNames.includes("opening_balance_date")) {
      await query("ALTER TABLE parties ADD COLUMN opening_balance_date DATE NULL AFTER opening_balance_type");
      console.log("Added opening_balance_date to parties");
    }
  } catch (err) {
    console.warn("Could not alter parties:", err.message);
  }

  // 2. Add opening stock columns to products table
  try {
    const prodCols = await query("DESCRIBE products");
    const prodColNames = prodCols.map((c) => c.Field);

    if (!prodColNames.includes("opening_stock_quantity")) {
      await query("ALTER TABLE products ADD COLUMN opening_stock_quantity INT NOT NULL DEFAULT 0 AFTER alert_quantity");
      console.log("Added opening_stock_quantity to products");
    }
    if (!prodColNames.includes("opening_cost_price")) {
      await query("ALTER TABLE products ADD COLUMN opening_cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER opening_stock_quantity");
      console.log("Added opening_cost_price to products");
    }
  } catch (err) {
    console.warn("Could not alter products:", err.message);
  }

  console.log("Opening balances migration completed successfully!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
