import { pool, query } from "./pool.js";

const defaultPasswordHash = "$2a$10$2hPxomutMqQ1iR8SIcmw6egFq68f/Jv0GWupjmnaIP92SxO766/B2";

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

export async function migrateBusinessAdmin() {
  await query(
    `CREATE TABLE IF NOT EXISTS businesses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      code VARCHAR(30) NOT NULL UNIQUE,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await query(
    `INSERT IGNORE INTO businesses (id, name, code, is_active)
     VALUES (1, 'Demo Mobile Shop', 'DEMO', 1)`
  );

  await query(
    `INSERT IGNORE INTO roles (name) VALUES
      ('top_admin'),
      ('business_super_admin'),
      ('manager'),
      ('cashier'),
      ('admin')`
  );

  if (!(await columnExists("branches", "business_id"))) {
    await query(`ALTER TABLE branches ADD COLUMN business_id INT NOT NULL DEFAULT 1 AFTER id`);
  }

  if (!(await columnExists("users", "business_id"))) {
    await query(`ALTER TABLE users ADD COLUMN business_id INT NULL AFTER id`);
  }

  if (!(await columnExists("mobile_models", "business_id"))) {
    await query(`ALTER TABLE mobile_models ADD COLUMN business_id INT NOT NULL DEFAULT 1 AFTER id`);
  }

  if (!(await columnExists("parties", "business_id"))) {
    await query(`ALTER TABLE parties ADD COLUMN business_id INT NOT NULL DEFAULT 1 AFTER id`);
  }

  if (!(await columnExists("payments", "idempotency_key"))) {
    await query(`ALTER TABLE payments ADD COLUMN idempotency_key VARCHAR(120) NULL AFTER payment_date`);
  }

  if (!(await indexExists("payments", "uniq_payment_idempotency"))) {
    await query(`CREATE UNIQUE INDEX uniq_payment_idempotency ON payments (created_by, idempotency_key)`);
  }

  await query(`UPDATE branches SET business_id = 1 WHERE business_id IS NULL OR business_id = 0`);
  await query(`UPDATE users SET business_id = 1 WHERE business_id IS NULL AND branch_id IS NOT NULL`);
  await query(`UPDATE mobile_models SET business_id = 1 WHERE business_id IS NULL OR business_id = 0`);
  await query(`UPDATE parties SET business_id = 1 WHERE business_id IS NULL OR business_id = 0`);

  if (!(await columnExists("mobile_units", "business_id"))) {
    await query(`ALTER TABLE mobile_units ADD COLUMN business_id INT NOT NULL DEFAULT 1 AFTER id`);
  }

  await query(
    `UPDATE mobile_units mu
     JOIN branches b ON b.id = mu.branch_id
     SET mu.business_id = b.business_id
     WHERE mu.business_id IS NULL OR mu.business_id = 0`
  );

  if (await indexExists("mobile_units", "imei")) {
    await query(`ALTER TABLE mobile_units DROP INDEX imei`);
  }

  if (!(await indexExists("mobile_units", "uniq_mobile_units_business_imei"))) {
    await query(`CREATE UNIQUE INDEX uniq_mobile_units_business_imei ON mobile_units (business_id, imei)`);
  }

  if (!(await indexExists("mobile_units", "idx_mobile_units_business"))) {
    await query(`CREATE INDEX idx_mobile_units_business ON mobile_units (business_id)`);
  }

  await query(
    `CREATE TABLE IF NOT EXISTS user_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      page_key VARCHAR(50) NOT NULL,
      action_key VARCHAR(50) NOT NULL,
      is_allowed TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_permission (user_id, page_key, action_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS subscription_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      monthly_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      max_branches INT NOT NULL DEFAULT 1,
      trial_days INT NOT NULL DEFAULT 14,
      grace_days INT NOT NULL DEFAULT 7,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS branch_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL UNIQUE,
      plan_id INT NOT NULL,
      status ENUM('trialing', 'active', 'grace', 'suspended', 'cancelled') NOT NULL DEFAULT 'trialing',
      trial_ends_on DATE NULL,
      current_period_ends_on DATE NULL,
      grace_ends_on DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS subscription_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL,
      plan_id INT NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(50) NULL,
      evidence_reference VARCHAR(255) NULL,
      status ENUM('submitted', 'verified', 'rejected') NOT NULL DEFAULT 'submitted',
      submitted_by INT NOT NULL,
      verified_by INT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      verified_at TIMESTAMP NULL,
      notes TEXT NULL
    )`
  );

  await query(
    `INSERT IGNORE INTO subscription_plans (id, name, monthly_price, max_branches, trial_days, grace_days, is_active)
     VALUES (1, 'Starter', 0, 1, 14, 7, 1)`
  );

  await query(
    `INSERT IGNORE INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on)
     SELECT b.business_id, b.id, 1, 'active', '2099-12-31'
     FROM branches b`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL,
      mobile_unit_id INT NOT NULL,
      model_id INT NOT NULL,
      movement_type ENUM('purchase_in', 'sale_out', 'customer_return_in', 'supplier_return_out', 'transfer_out', 'transfer_in', 'adjustment_in', 'adjustment_out') NOT NULL,
      reference_type VARCHAR(50) NOT NULL,
      reference_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_cost DECIMAL(12,2) NULL,
      unit_price DECIMAL(12,2) NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_stock_movement_unit_ref (mobile_unit_id, movement_type, reference_type, reference_id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS cash_register_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL,
      business_date DATE NOT NULL,
      opening_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
      expected_cash DECIMAL(12,2) NULL,
      actual_cash DECIMAL(12,2) NULL,
      discrepancy DECIMAL(12,2) NULL,
      status ENUM('open', 'pending_verification', 'closed') NOT NULL DEFAULT 'open',
      opened_by INT NOT NULL,
      closed_by INT NULL,
      verified_by INT NULL,
      opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP NULL,
      verified_at TIMESTAMP NULL,
      notes TEXT NULL,
      UNIQUE KEY uniq_cash_register_branch_date (branch_id, business_date)
    )`
  );

  const [topAdminRole] = await query(`SELECT id FROM roles WHERE name = 'top_admin'`);
  const [businessSuperAdminRole] = await query(`SELECT id FROM roles WHERE name = 'business_super_admin'`);

  await query(
    `INSERT IGNORE INTO users (business_id, role_id, branch_id, full_name, email, password_hash, is_active)
     VALUES (:businessId, :roleId, :branchId, :fullName, :email, :passwordHash, :isActive)`,
    {
      businessId: null,
      roleId: topAdminRole.id,
      branchId: null,
      fullName: "DigitalMarkaz360 Top Admin",
      email: "topadmin@mobilepos.local",
      passwordHash: defaultPasswordHash,
      isActive: 1
    }
  );

  await query(
    `UPDATE users
     SET role_id = :roleId, business_id = NULL, branch_id = NULL, is_active = 1
     WHERE email = 'topadmin@mobilepos.local'`,
    { roleId: topAdminRole.id }
  );

  await query(
    `UPDATE users
     SET password_hash = :passwordHash
     WHERE password_hash = 'admin123'`,
    { passwordHash: defaultPasswordHash }
  );

  await query(
    `UPDATE users
     SET role_id = :roleId, business_id = 1
     WHERE email = 'admin@mobilepos.local'`,
    { roleId: businessSuperAdminRole.id }
  );

  await query(
    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL DEFAULT 1,
      name VARCHAR(80) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_category_biz_branch_name (business_id, branch_id, name),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    )`
  );

  if (!(await columnExists("categories", "branch_id"))) {
    await query(`ALTER TABLE categories ADD COLUMN branch_id INT NOT NULL DEFAULT 1 AFTER business_id`);
    await query(`UPDATE categories c SET branch_id = COALESCE((SELECT id FROM branches b WHERE b.business_id = c.business_id ORDER BY b.id ASC LIMIT 1), 1) WHERE branch_id IS NULL OR branch_id = 0`);
  }

  if (await indexExists("categories", "uniq_category_biz_name")) {
    try {
      await query(`ALTER TABLE categories DROP INDEX uniq_category_biz_name`);
    } catch (_) {}
  }

  if (!(await indexExists("categories", "uniq_category_biz_branch_name"))) {
    try {
      await query(`ALTER TABLE categories ADD UNIQUE KEY uniq_category_biz_branch_name (business_id, branch_id, name)`);
    } catch (_) {}
  }

  await query(
    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL DEFAULT 1,
      category_id INT NULL,
      name VARCHAR(150) NOT NULL,
      sku VARCHAR(50) NULL,
      barcode VARCHAR(50) NULL,
      item_type ENUM('handset', 'accessory', 'part', 'service') NOT NULL DEFAULT 'accessory',
      has_imei TINYINT(1) NOT NULL DEFAULT 0,
      cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      alert_quantity INT NOT NULL DEFAULT 5,
      opening_stock_quantity INT NOT NULL DEFAULT 0,
      opening_cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_product_biz_branch_name (business_id, branch_id, name),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`
  );

  if (!(await columnExists("products", "branch_id"))) {
    await query(`ALTER TABLE products ADD COLUMN branch_id INT NOT NULL DEFAULT 1 AFTER business_id`);
    await query(`UPDATE products p SET branch_id = COALESCE((SELECT branch_id FROM product_stocks ps WHERE ps.product_id = p.id LIMIT 1), (SELECT id FROM branches b WHERE b.business_id = p.business_id ORDER BY b.id ASC LIMIT 1), 1) WHERE branch_id IS NULL OR branch_id = 0`);
  }

  if (await indexExists("products", "uniq_product_biz_name")) {
    try {
      await query(`ALTER TABLE products DROP INDEX uniq_product_biz_name`);
    } catch (_) {}
  }

  if (!(await indexExists("products", "uniq_product_biz_branch_name"))) {
    try {
      await query(`ALTER TABLE products ADD UNIQUE KEY uniq_product_biz_branch_name (business_id, branch_id, name)`);
    } catch (_) {}
  }

  await query(
    `CREATE TABLE IF NOT EXISTS product_stocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_product_branch_stock (branch_id, product_id),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS partners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(30) NULL,
      cnic VARCHAR(30) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS partner_branch_shares (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL,
      partner_id INT NOT NULL,
      share_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_branch_partner (branch_id, partner_id),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
    )`
  );

  await query(
    `INSERT IGNORE INTO categories (id, business_id, branch_id, name) VALUES
     (1, 1, 1, 'Accessories'),
     (2, 1, 1, 'Chargers & Cables'),
     (3, 1, 1, 'Spare Parts'),
     (4, 1, 1, 'Repair Services')`
  );

  await query(`ALTER TABLE purchase_order_items MODIFY mobile_unit_id INT NULL`);
  await query(`ALTER TABLE purchase_order_items MODIFY imei VARCHAR(32) NULL`);
  await query(`ALTER TABLE purchase_order_items MODIFY model_id INT NULL`);
  await query(`ALTER TABLE sale_order_items MODIFY mobile_unit_id INT NULL`);
  await query(`ALTER TABLE sale_order_items MODIFY imei VARCHAR(32) NULL`);
  await query(`ALTER TABLE sale_order_items MODIFY model_id INT NULL`);

  if (!(await columnExists("purchase_order_items", "product_id"))) {
    await query(`ALTER TABLE purchase_order_items ADD COLUMN product_id INT NULL AFTER model_id`);
  }
  if (!(await columnExists("purchase_order_items", "quantity"))) {
    await query(`ALTER TABLE purchase_order_items ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER imei`);
  }
  if (!(await columnExists("sale_order_items", "product_id"))) {
    await query(`ALTER TABLE sale_order_items ADD COLUMN product_id INT NULL AFTER model_id`);
  }
  if (!(await columnExists("sale_order_items", "quantity"))) {
    await query(`ALTER TABLE sale_order_items ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER imei`);
  }

  await query(
    `ALTER TABLE mobile_units MODIFY current_status ENUM('in_stock', 'reserved', 'sold', 'returned', 'cancelled', 'in_transit', 'returned_to_vendor') NOT NULL DEFAULT 'in_stock'`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS stock_transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      transfer_number VARCHAR(50) NOT NULL UNIQUE,
      from_branch_id INT NOT NULL,
      to_branch_id INT NOT NULL,
      status ENUM('pending', 'in_transit', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
      notes TEXT NULL,
      discrepancy_notes TEXT NULL,
      created_by INT NOT NULL,
      dispatched_by INT NULL,
      received_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dispatched_at TIMESTAMP NULL,
      received_at TIMESTAMP NULL,
      INDEX idx_transfers_biz_status (business_id, status),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (from_branch_id) REFERENCES branches(id),
      FOREIGN KEY (to_branch_id) REFERENCES branches(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transfer_id INT NOT NULL,
      mobile_unit_id INT NULL,
      imei VARCHAR(32) NULL,
      model_id INT NULL,
      product_id INT NULL,
      quantity INT NOT NULL DEFAULT 1,
      received_quantity INT NOT NULL DEFAULT 0,
      item_status ENUM('pending', 'in_transit', 'received', 'missing', 'damaged') NOT NULL DEFAULT 'pending',
      FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
      FOREIGN KEY (mobile_unit_id) REFERENCES mobile_units(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS order_returns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL,
      return_number VARCHAR(50) NOT NULL UNIQUE,
      return_type ENUM('customer_return', 'vendor_return') NOT NULL,
      reference_type ENUM('sale_order', 'purchase_order') NOT NULL,
      reference_id INT NOT NULL,
      party_id INT NULL,
      return_date DATE NOT NULL,
      total_refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
      reason VARCHAR(255) NULL,
      notes TEXT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_returns_biz (business_id),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS order_return_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      return_id INT NOT NULL,
      mobile_unit_id INT NULL,
      imei VARCHAR(32) NULL,
      product_id INT NULL,
      quantity INT NOT NULL DEFAULT 1,
      refund_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      item_condition ENUM('good', 'damaged', 'defective') NOT NULL DEFAULT 'good',
      FOREIGN KEY (return_id) REFERENCES order_returns(id) ON DELETE CASCADE,
      FOREIGN KEY (mobile_unit_id) REFERENCES mobile_units(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`
  );

  await query(`ALTER TABLE mobile_units MODIFY purchase_order_id INT NULL`);
  await query(`ALTER TABLE payments MODIFY reference_type ENUM('sale', 'purchase', 'order_return') NOT NULL`);
  await query(
    `ALTER TABLE notifications MODIFY notification_type VARCHAR(64) NOT NULL`
  ).catch(() => {});
  await query(
    `ALTER TABLE notifications MODIFY reference_type VARCHAR(64) NOT NULL`
  ).catch(() => {});

  // --- TOP Admin Enhancements Migration ---
  if (!(await columnExists("branches", "is_active"))) {
    await query(`ALTER TABLE branches ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER address`);
  }

  if (!(await columnExists("businesses", "email"))) {
    await query(`ALTER TABLE businesses ADD COLUMN email VARCHAR(120) NULL AFTER code`);
  }
  if (!(await columnExists("businesses", "phone"))) {
    await query(`ALTER TABLE businesses ADD COLUMN phone VARCHAR(50) NULL AFTER email`);
  }
  if (!(await columnExists("businesses", "address"))) {
    await query(`ALTER TABLE businesses ADD COLUMN address VARCHAR(255) NULL AFTER phone`);
  }
  if (!(await columnExists("businesses", "logo_url"))) {
    await query(`ALTER TABLE businesses ADD COLUMN logo_url LONGTEXT NULL AFTER address`);
  }
  if (!(await columnExists("businesses", "tax_number"))) {
    await query(`ALTER TABLE businesses ADD COLUMN tax_number VARCHAR(60) NULL AFTER logo_url`);
  }
  if (!(await columnExists("businesses", "currency"))) {
    await query(`ALTER TABLE businesses ADD COLUMN currency VARCHAR(20) NOT NULL DEFAULT 'PKR' AFTER tax_number`);
  }
  if (!(await columnExists("businesses", "software_name"))) {
    await query(`ALTER TABLE businesses ADD COLUMN software_name VARCHAR(120) NOT NULL DEFAULT 'DigitalMarkaz360' AFTER currency`);
  }
  if (!(await columnExists("businesses", "tagline"))) {
    await query(`ALTER TABLE businesses ADD COLUMN tagline VARCHAR(255) NOT NULL DEFAULT 'Poora Karobar, Ek Markaz' AFTER software_name`);
  }
  await query(`UPDATE businesses SET software_name = 'DigitalMarkaz360' WHERE software_name = 'Mobile POS' OR software_name IS NULL OR software_name = ''`).catch(() => {});
  if (!(await columnExists("businesses", "receipt_footer"))) {
    await query(`ALTER TABLE businesses ADD COLUMN receipt_footer VARCHAR(255) NULL AFTER tagline`);
  }

  if (!(await columnExists("subscription_plans", "billing_period"))) {
    await query(`ALTER TABLE subscription_plans ADD COLUMN billing_period VARCHAR(30) NOT NULL DEFAULT 'monthly' AFTER monthly_price`);
  }
  if (!(await columnExists("subscription_plans", "duration_value"))) {
    await query(`ALTER TABLE subscription_plans ADD COLUMN duration_value INT NOT NULL DEFAULT 1 AFTER billing_period`);
  }
  if (!(await columnExists("subscription_plans", "duration_unit"))) {
    await query(`ALTER TABLE subscription_plans ADD COLUMN duration_unit ENUM('day', 'month', 'year') NOT NULL DEFAULT 'month' AFTER duration_value`);
  }
  if (!(await columnExists("subscription_plans", "price"))) {
    await query(`ALTER TABLE subscription_plans ADD COLUMN price DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER duration_unit`);
    await query(`UPDATE subscription_plans SET price = monthly_price WHERE price = 0 AND monthly_price > 0`);
  }
  if (!(await columnExists("subscription_plans", "description"))) {
    await query(`ALTER TABLE subscription_plans ADD COLUMN description TEXT NULL AFTER is_active`);
  }

  // Update starter plan values if needed
  await query(`UPDATE subscription_plans SET billing_period = 'monthly', duration_value = 1, duration_unit = 'month', price = monthly_price WHERE id = 1 AND price = 0 AND monthly_price > 0`);

  // Insert standard packages if they do not exist
  await query(
    `INSERT IGNORE INTO subscription_plans (id, name, monthly_price, billing_period, duration_value, duration_unit, price, max_branches, trial_days, grace_days, is_active, description)
     VALUES
     (2, 'Professional Monthly', 4999.00, 'monthly', 1, 'month', 4999.00, 3, 14, 7, 1, 'Standard monthly plan for growing mobile businesses up to 3 branches.'),
     (3, 'Enterprise Annual', 49999.00, 'yearly', 1, 'year', 49999.00, 10, 30, 14, 1, 'Comprehensive annual plan for established mobile retail chains.')`
  );

  if (!(await columnExists("branch_subscriptions", "subscription_starts_on"))) {
    await query(`ALTER TABLE branch_subscriptions ADD COLUMN subscription_starts_on DATE NULL AFTER status`);
  }

  await query(
    `ALTER TABLE branch_subscriptions MODIFY status ENUM('trialing', 'active', 'grace', 'expired', 'suspended', 'cancelled') NOT NULL DEFAULT 'trialing'`
  );

  if (!(await columnExists("subscription_payments", "duration_value"))) {
    await query(`ALTER TABLE subscription_payments ADD COLUMN duration_value INT NOT NULL DEFAULT 1 AFTER amount`);
  }
  if (!(await columnExists("subscription_payments", "duration_unit"))) {
    await query(`ALTER TABLE subscription_payments ADD COLUMN duration_unit ENUM('day', 'month', 'year') NOT NULL DEFAULT 'month' AFTER duration_value`);
  }
  if (!(await columnExists("subscription_payments", "payment_date"))) {
    await query(`ALTER TABLE subscription_payments ADD COLUMN payment_date DATE NULL AFTER duration_unit`);
  }
  if (!(await columnExists("subscription_payments", "rejection_reason"))) {
    await query(`ALTER TABLE subscription_payments ADD COLUMN rejection_reason TEXT NULL AFTER status`);
  }
  if (!(await columnExists("subscription_payments", "period_start_date"))) {
    await query(`ALTER TABLE subscription_payments ADD COLUMN period_start_date DATE NULL AFTER notes`);
  }
  if (!(await columnExists("subscription_payments", "period_end_date"))) {
    await query(`ALTER TABLE subscription_payments ADD COLUMN period_end_date DATE NULL AFTER period_start_date`);
  }

  if (!(await indexExists("subscription_payments", "idx_sub_payments_status"))) {
    await query(`CREATE INDEX idx_sub_payments_status ON subscription_payments (status)`);
  }
  if (!(await indexExists("subscription_payments", "idx_sub_payments_biz_branch"))) {
    await query(`CREATE INDEX idx_sub_payments_biz_branch ON subscription_payments (business_id, branch_id)`);
  }

  await query(`ALTER TABLE branches MODIFY COLUMN code VARCHAR(60) NOT NULL`);
  await query(`ALTER TABLE businesses MODIFY COLUMN code VARCHAR(60) NOT NULL`);

  // 1. Soft-delete columns for sale_orders
  if (!(await columnExists("sale_orders", "is_deleted"))) {
    await query(`ALTER TABLE sale_orders ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`);
  }
  if (!(await columnExists("sale_orders", "deleted_at"))) {
    await query(`ALTER TABLE sale_orders ADD COLUMN deleted_at DATETIME NULL`);
  }
  if (!(await columnExists("sale_orders", "deleted_by"))) {
    await query(`ALTER TABLE sale_orders ADD COLUMN deleted_by INT NULL`);
  }
  if (!(await columnExists("sale_orders", "deletion_reason"))) {
    await query(`ALTER TABLE sale_orders ADD COLUMN deletion_reason TEXT NULL`);
  }
  if (!(await indexExists("sale_orders", "idx_sale_orders_is_deleted"))) {
    await query(`CREATE INDEX idx_sale_orders_is_deleted ON sale_orders (is_deleted)`);
  }

  // 2. Soft-delete columns for purchase_orders
  if (!(await columnExists("purchase_orders", "is_deleted"))) {
    await query(`ALTER TABLE purchase_orders ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`);
  }
  if (!(await columnExists("purchase_orders", "deleted_at"))) {
    await query(`ALTER TABLE purchase_orders ADD COLUMN deleted_at DATETIME NULL`);
  }
  if (!(await columnExists("purchase_orders", "deleted_by"))) {
    await query(`ALTER TABLE purchase_orders ADD COLUMN deleted_by INT NULL`);
  }
  if (!(await columnExists("purchase_orders", "deletion_reason"))) {
    await query(`ALTER TABLE purchase_orders ADD COLUMN deletion_reason TEXT NULL`);
  }
  if (!(await columnExists("purchase_orders", "discount_amount"))) {
    await query(`ALTER TABLE purchase_orders ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0`);
  }
  if (!(await indexExists("purchase_orders", "idx_purchase_orders_is_deleted"))) {
    await query(`CREATE INDEX idx_purchase_orders_is_deleted ON purchase_orders (is_deleted)`);
  }

  // 3. Soft-delete columns for expenses
  if (!(await columnExists("expenses", "is_deleted"))) {
    await query(`ALTER TABLE expenses ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`);
  }
  if (!(await columnExists("expenses", "deleted_at"))) {
    await query(`ALTER TABLE expenses ADD COLUMN deleted_at DATETIME NULL`);
  }
  if (!(await columnExists("expenses", "deleted_by"))) {
    await query(`ALTER TABLE expenses ADD COLUMN deleted_by INT NULL`);
  }
  if (!(await columnExists("expenses", "deletion_reason"))) {
    await query(`ALTER TABLE expenses ADD COLUMN deletion_reason TEXT NULL`);
  }
  if (!(await indexExists("expenses", "idx_expenses_is_deleted"))) {
    await query(`CREATE INDEX idx_expenses_is_deleted ON expenses (is_deleted)`);
  }

  // Populate sample payment for testing if table is empty
  const [existingPayments] = await query(`SELECT COUNT(*) AS count FROM subscription_payments`);
  if (Number(existingPayments.count) === 0) {
    const [starterBranch] = await query(`SELECT b.id as branch_id, b.business_id, bs.plan_id FROM branches b JOIN branch_subscriptions bs ON bs.branch_id = b.id LIMIT 1`);
    if (starterBranch) {
      await query(
        `INSERT INTO subscription_payments
         (business_id, branch_id, plan_id, amount, duration_value, duration_unit, payment_method, evidence_reference, status, submitted_by, submitted_at, payment_date, notes)
         VALUES
         (:businessId, :branchId, :planId, 49.00, 1, 'month', 'Bank Transfer', 'TXN-984321', 'submitted', 1, NOW(), CURDATE(), 'Monthly subscription renewal proof submitted.')`,
        {
          businessId: starterBranch.business_id,
          branchId: starterBranch.branch_id,
          planId: starterBranch.plan_id || 2
        }
      );
    }
  }

  // --- Subscription Package Page-wise & Report Access Entitlements Migration ---
  if (!(await columnExists("subscription_plans", "allowed_pages"))) {
    await query(`ALTER TABLE subscription_plans ADD COLUMN allowed_pages TEXT NULL AFTER max_branches`);
  }

  await query(
    `CREATE TABLE IF NOT EXISTS subscription_plan_features (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_id INT NOT NULL,
      feature_key VARCHAR(60) NOT NULL,
      feature_type ENUM('page', 'report', 'feature') NOT NULL DEFAULT 'page',
      is_allowed TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_plan_feature (plan_id, feature_key),
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
    )`
  );

  // Set default package entitlements for existing plans if null
  const starterFeatures = ["dashboard", "sales", "purchases", "inventory", "cash_register", "parties", "invoices"];
  const proFeatures = ["dashboard", "sales", "sale_returns", "purchases", "purchase_returns", "inventory", "cash_register", "parties", "expenses", "invoices", "reports_inventory", "stock_transfers", "theme_selection"];
  const enterpriseFeatures = ["dashboard", "sales", "sale_returns", "purchases", "purchase_returns", "inventory", "cash_register", "parties", "expenses", "invoices", "admin", "reports_inventory", "reports_receivables", "reports_payables", "stock_transfers", "partner_shares", "theme_selection"];

  await query(`UPDATE subscription_plans SET allowed_pages = ? WHERE id = 1 AND (allowed_pages IS NULL OR allowed_pages = '')`, [JSON.stringify(starterFeatures)]);
  await query(`UPDATE subscription_plans SET allowed_pages = ? WHERE id = 2 AND (allowed_pages IS NULL OR allowed_pages = '')`, [JSON.stringify(proFeatures)]);
  await query(`UPDATE subscription_plans SET allowed_pages = ? WHERE id = 3 AND (allowed_pages IS NULL OR allowed_pages = '')`, [JSON.stringify(enterpriseFeatures)]);
  await query(`UPDATE subscription_plans SET allowed_pages = ? WHERE (allowed_pages IS NULL OR allowed_pages = '')`, [JSON.stringify(proFeatures)]);

  // Migrate existing plans: remove legacy order_returns and ensure sale_returns and purchase_returns are included
  try {
    const validKeys = [
      "dashboard", "sales", "sale_returns", "purchases", "purchase_returns",
      "inventory", "cash_register", "parties", "expenses", "invoices",
      "employees", "repairs", "admin", "reports_inventory", "reports_receivables",
      "reports_payables", "stock_transfers", "partner_shares", "theme_selection"
    ];
    const existingPlans = await query(`SELECT id, allowed_pages FROM subscription_plans WHERE allowed_pages IS NOT NULL AND allowed_pages != ''`);
    for (const plan of existingPlans) {
      if (typeof plan.allowed_pages === "string") {
        try {
          const pages = JSON.parse(plan.allowed_pages);
          if (Array.isArray(pages)) {
            let changed = false;
            if (pages.includes("order_returns")) {
              if (!pages.includes("sale_returns")) pages.push("sale_returns");
              if (!pages.includes("purchase_returns")) pages.push("purchase_returns");
              changed = true;
            }
            const sanitized = Array.from(new Set(pages)).filter((k) => validKeys.includes(k));
            if (changed || sanitized.length !== pages.length) {
              await query(`UPDATE subscription_plans SET allowed_pages = ? WHERE id = ?`, [JSON.stringify(sanitized), plan.id]);
            }
          }
        } catch {
          // ignore parsing error
        }
      }
    }
  } catch (err) {
    console.warn("Could not migrate existing subscription_plans allowed_pages:", err.message);
  }

  // --- Business Role Rights & Restrictions Table Migration ---
  await query(
    `CREATE TABLE IF NOT EXISTS business_role_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      role_name VARCHAR(50) NOT NULL,
      page_key VARCHAR(50) NOT NULL,
      action_key VARCHAR(50) NOT NULL,
      is_allowed TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_biz_role_perm (business_id, role_name, page_key, action_key),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )`
  );

  // --- Partner Capital, Drawings & Dividend Disbursement Ledger ---
  await query(
    `CREATE TABLE IF NOT EXISTS partner_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL,
      partner_id INT NOT NULL,
      transaction_type ENUM('capital_injection', 'dividend_payout', 'drawing', 'capital_withdrawal') NOT NULL,
      direction ENUM('in', 'out') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_method ENUM('cash', 'bank_transfer', 'cheque', 'online') NOT NULL DEFAULT 'cash',
      transaction_date DATE NOT NULL,
      voucher_number VARCHAR(60) NOT NULL,
      period_label VARCHAR(60) NULL,
      reference_details VARCHAR(255) NULL,
      notes TEXT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pt_partner (business_id, partner_id),
      INDEX idx_pt_branch (business_id, branch_id),
      INDEX idx_pt_date (transaction_date),
      UNIQUE KEY uq_pt_biz_voucher (business_id, voucher_number),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`
  );

  // --- Ensure Notifications Table Supports Subscription & Flexible Notification Types ---
  try {
    await query(`ALTER TABLE notifications MODIFY COLUMN notification_type VARCHAR(64) NOT NULL`);
    await query(`ALTER TABLE notifications MODIFY COLUMN reference_type VARCHAR(64) NOT NULL`);
  } catch (err) {
    console.error("Warning: Could not alter notifications column types", err.message);
  }
}

if (process.argv[1]?.endsWith("migrateBusinessAdmin.js")) {
  migrateBusinessAdmin()
    .then(() => {
      console.log("Business/admin migration completed");
      return pool.end();
    })
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
