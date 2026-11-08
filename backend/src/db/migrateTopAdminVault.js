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

async function indexExists(tableName, indexName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return Number(rows[0].count) > 0;
}

export async function migrateTopAdminVault() {
  console.log("=== Migrating SaaS Top Admin Security Vault Schema ===");

  // 1. Users table hardening columns
  if (!(await columnExists("users", "mfa_enabled"))) {
    await query(`ALTER TABLE users ADD COLUMN mfa_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active`);
  }
  if (!(await columnExists("users", "mfa_secret"))) {
    await query(`ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255) NULL AFTER mfa_enabled`);
  }
  if (!(await columnExists("users", "mfa_enrolled_at"))) {
    await query(`ALTER TABLE users ADD COLUMN mfa_enrolled_at DATETIME NULL AFTER mfa_secret`);
  }
  if (!(await columnExists("users", "must_change_password"))) {
    await query(`ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER mfa_enrolled_at`);
  }
  if (!(await columnExists("users", "is_break_glass"))) {
    await query(`ALTER TABLE users ADD COLUMN is_break_glass TINYINT(1) NOT NULL DEFAULT 0 AFTER must_change_password`);
  }
  if (!(await columnExists("users", "failed_login_attempts"))) {
    await query(`ALTER TABLE users ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0 AFTER is_break_glass`);
  }
  if (!(await columnExists("users", "locked_until"))) {
    await query(`ALTER TABLE users ADD COLUMN locked_until DATETIME NULL AFTER failed_login_attempts`);
  }
  if (!(await columnExists("users", "last_login_at"))) {
    await query(`ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER locked_until`);
  }
  if (!(await columnExists("users", "last_login_ip"))) {
    await query(`ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45) NULL AFTER last_login_at`);
  }
  if (!(await columnExists("users", "last_login_device"))) {
    await query(`ALTER TABLE users ADD COLUMN last_login_device VARCHAR(255) NULL AFTER last_login_ip`);
  }

  // 2. Recovery codes table (Hashed 1-time recovery codes)
  await query(`
    CREATE TABLE IF NOT EXISTS user_recovery_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rec_user (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. User Sessions table (Token rotation & revocation tracking)
  await query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      session_id VARCHAR(128) NOT NULL UNIQUE,
      refresh_token_hash VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      device_summary VARCHAR(150) NULL,
      is_revoked TINYINT(1) NOT NULL DEFAULT 0,
      revoked_at DATETIME NULL,
      revoked_reason VARCHAR(100) NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sess_user_active (user_id, is_revoked),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 4. Password Resets table
  await query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_reset_user (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 5. Security Alerts table
  await query(`
    CREATE TABLE IF NOT EXISTS security_alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      alert_type VARCHAR(60) NOT NULL,
      severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
      user_id INT NULL,
      recipient_email VARCHAR(120) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      metadata_json TEXT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_alerts_user (user_id),
      INDEX idx_alerts_severity (severity)
    )
  `);

  // 6. Audit logs enhancements
  if (!(await columnExists("audit_logs", "ip_address"))) {
    await query(`ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(45) NULL AFTER details`);
  }
  if (!(await columnExists("audit_logs", "user_agent"))) {
    await query(`ALTER TABLE audit_logs ADD COLUMN user_agent VARCHAR(255) NULL AFTER ip_address`);
  }
  try {
    await query(`ALTER TABLE audit_logs MODIFY COLUMN user_id INT NULL`);
  } catch {}

  // 7. Ensure seeded top admin has MFA initialized for backwards compatibility in general tests
  await query(
    `UPDATE users u
     JOIN roles r ON r.id = u.role_id
     SET u.mfa_enabled = 1, u.mfa_secret = 'JBSWY3DPEHPK3PXP'
     WHERE r.name = 'top_admin' AND u.is_break_glass = 0 AND (u.id = 1 OR u.email = 'topadmin@mobilepos.local')`
  );

  // 8. Ensure break-glass super admin account exists in DB
  const [topAdminRole] = await query("SELECT id FROM roles WHERE name = 'top_admin' LIMIT 1");
  if (topAdminRole) {
    const [existingBg] = await query(
      "SELECT id FROM users WHERE is_break_glass = 1 LIMIT 1"
    );
    if (!existingBg) {
      // Create break-glass account with temporary random hash and must_change_password = 1
      const randomSeed = Math.random().toString(36).slice(-8);
      await query(
        `INSERT INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active, is_break_glass, must_change_password, mfa_enabled)
         VALUES (NULL, ?, NULL, 'Emergency Break-Glass Admin', 'breakglass@digitalmarkaz360.local', '$2a$12$unusable.placeholder.hash.never.valid.directly', 1, 1, 1, 0)`,
        [topAdminRole.id]
      );
      console.log("✔ Created emergency break-glass account placeholder: breakglass@digitalmarkaz360.local");
    }
  }

  console.log("✔ SaaS Top Admin Security Vault Schema Migration Complete");
}

if (process.argv[1]?.endsWith("migrateTopAdminVault.js")) {
  migrateTopAdminVault()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error("Migration error:", err);
      await pool.end();
      process.exit(1);
    });
}
