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
  return Number(rows[0]?.count || 0) > 0;
}

export async function migrateTechnicianAndFields() {
  console.log("=== Checking Technician Role and Branch/Party Field Migrations ===");

  // 1. Ensure 'technician' role exists
  await query(`INSERT IGNORE INTO roles (name) VALUES ('technician')`);

  // 2. Ensure branches.phone exists
  if (!(await columnExists("branches", "phone"))) {
    await query(`ALTER TABLE branches ADD COLUMN phone VARCHAR(60) NULL AFTER address`);
    console.log("✔ Added phone column to branches");
  }

  // 3. Ensure parties.contact_person exists
  if (!(await columnExists("parties", "contact_person"))) {
    await query(`ALTER TABLE parties ADD COLUMN contact_person VARCHAR(120) NULL AFTER name`);
    console.log("✔ Added contact_person column to parties");
  }

  console.log("=== Technician Role and Branch/Party Field Migrations Complete ===");
}
