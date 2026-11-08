import { pool, query } from "./pool.js";

export async function migrateLoginLogs() {
  console.log("=== Migrating User Login Activity Logs Schema ===");

  await query(`
    CREATE TABLE IF NOT EXISTS user_login_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      email VARCHAR(120) NOT NULL,
      full_name VARCHAR(120) NULL,
      role_name VARCHAR(60) NULL,
      business_id INT NULL,
      business_name VARCHAR(150) NULL,
      branch_id INT NULL,
      branch_name VARCHAR(150) NULL,
      ip_address VARCHAR(45) NOT NULL,
      system_summary VARCHAR(150) NOT NULL,
      os VARCHAR(80) NULL,
      browser VARCHAR(80) NULL,
      device_type VARCHAR(40) NULL,
      user_agent TEXT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'success',
      failure_reason VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ull_user (user_id),
      INDEX idx_ull_created (created_at),
      INDEX idx_ull_status (status),
      INDEX idx_ull_business (business_id),
      INDEX idx_ull_ip (ip_address),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
    )
  `);

  console.log("✔ user_login_logs table ready");
}

if (process.argv[1]?.endsWith("migrateLoginLogs.js")) {
  migrateLoginLogs()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error("Migration error:", err);
      await pool.end();
      process.exit(1);
    });
}
