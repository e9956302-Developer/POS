import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, query } from "./pool.js";
import { migrateBusinessAdmin } from "./migrateBusinessAdmin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log("=== Running Database Migrations ===");

  // 1. Ensure migrations tracking table
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 1b. Check if base schema exists (fresh database on cloud platform)
  try {
    const [tableRows] = await pool.execute(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    const usersTableExists = Number(tableRows[0]?.count || 0) > 0;
    if (!usersTableExists) {
      console.log("Fresh database detected. Initializing schema.sql...");
      const schemaPath = path.join(__dirname, "schema.sql");
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        const statements = schemaSql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const statement of statements) {
          await query(statement);
        }
        console.log("✔ Base schema initialized successfully.");
      }
      const seedPath = path.join(__dirname, "seed.sql");
      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, "utf-8");
        const seedStatements = seedSql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const statement of seedStatements) {
          await query(statement);
        }
        console.log("✔ Base seed data applied successfully.");
      }
    }
  } catch (initErr) {
    console.warn("Base schema check notice:", initErr.message);
  }

  // 2. Run legacy business admin and Top Admin Vault idempotency checks
  try {
    await migrateBusinessAdmin();
  } catch (err) {
    console.warn("Legacy business admin migration check notice:", err.message);
  }
  try {
    const { migrateTopAdminVault } = await import("./migrateTopAdminVault.js");
    await migrateTopAdminVault();
  } catch (err) {
    console.warn("Top admin vault migration notice:", err.message);
  }
  try {
    const { migrateLoginLogs } = await import("./migrateLoginLogs.js");
    await migrateLoginLogs();
  } catch (err) {
    console.warn("Login logs migration notice:", err.message);
  }
  try {
    const { migrateDiscounts } = await import("./migrateDiscounts.js");
    await migrateDiscounts();
  } catch (err) {
    console.warn("Discounts migration notice:", err.message);
  }

  // 3. Scan migrations directory
  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const appliedRows = await query(`SELECT filename FROM schema_migrations`);
  const appliedSet = new Set(appliedRows.map((r) => r.filename));

  let appliedCount = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      continue;
    }

    console.log(`Applying migration: ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, "utf-8");

    // Split statements safely
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.query(
        "INSERT INTO schema_migrations (filename) VALUES (?)",
        [file]
      );
      await connection.commit();
      console.log(`✔ Applied migration: ${file}`);
      appliedCount++;
    } catch (err) {
      await connection.rollback();
      console.error(`✖ Failed migration ${file}:`, err.message);
      throw err;
    } finally {
      connection.release();
    }
  }

  console.log(`=== Migrations finished (${appliedCount} new migrations applied) ===`);
}

// If run directly from CLI
if (process.argv[1] && process.argv[1].endsWith("migrate.js")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
