CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL DEFAULT 1,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  address VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NULL,
  role_id INT NOT NULL,
  branch_id INT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  page_key VARCHAR(50) NOT NULL,
  action_key VARCHAR(50) NOT NULL,
  is_allowed TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_permission (user_id, page_key, action_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS business_role_permissions (
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
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  monthly_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_branches INT NOT NULL DEFAULT 1,
  trial_days INT NOT NULL DEFAULT 14,
  grace_days INT NOT NULL DEFAULT 7,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  branch_id INT NOT NULL UNIQUE,
  plan_id INT NOT NULL,
  status ENUM('trialing', 'active', 'grace', 'suspended', 'cancelled') NOT NULL DEFAULT 'trialing',
  trial_ends_on DATE NULL,
  current_period_ends_on DATE NULL,
  grace_ends_on DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE TABLE IF NOT EXISTS subscription_payments (
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
  notes TEXT NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS parties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL DEFAULT 1,
  branch_id INT NULL,
  party_type ENUM('vendor', 'customer', 'both') NOT NULL DEFAULT 'customer',
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  cnic VARCHAR(30) NULL,
  address VARCHAR(255) NULL,
  notes TEXT NULL,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  opening_balance_type ENUM('receivable', 'payable') NOT NULL DEFAULT 'receivable',
  opening_balance_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS mobile_models (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL DEFAULT 1,
  company VARCHAR(80) NOT NULL,
  model_name VARCHAR(120) NOT NULL,
  variant VARCHAR(80) NULL,
  color VARCHAR(80) NULL,
  storage VARCHAR(80) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_model (business_id, company, model_name, variant, color, storage),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(30) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  vendor_id INT NULL,
  purchaser_name VARCHAR(120) NULL,
  purchaser_cnic VARCHAR(30) NULL,
  purchase_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (vendor_id) REFERENCES parties(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mobile_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  imei VARCHAR(32) NOT NULL,
  model_id INT NOT NULL,
  branch_id INT NOT NULL,
  current_status ENUM('in_stock', 'reserved', 'sold', 'returned', 'cancelled') NOT NULL DEFAULT 'in_stock',
  purchase_order_id INT NOT NULL,
  sale_order_id INT NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(12,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_mobile_units_business_imei (business_id, imei),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (model_id) REFERENCES mobile_models(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  model_id INT NOT NULL,
  mobile_unit_id INT NOT NULL,
  imei VARCHAR(32) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (model_id) REFERENCES mobile_models(id),
  FOREIGN KEY (mobile_unit_id) REFERENCES mobile_units(id)
);

CREATE TABLE IF NOT EXISTS sale_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(30) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  customer_id INT NULL,
  sale_date DATE NOT NULL,
  payment_method ENUM('cash', 'bank_transfer', 'mobile_wallet') NOT NULL DEFAULT 'cash',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_type ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed',
  discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (customer_id) REFERENCES parties(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sale_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_order_id INT NOT NULL,
  mobile_unit_id INT NOT NULL,
  imei VARCHAR(32) NOT NULL,
  model_id INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_price DECIMAL(12,2) NULL,
  discount_type ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed',
  discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_order_id) REFERENCES sale_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (mobile_unit_id) REFERENCES mobile_units(id),
  FOREIGN KEY (model_id) REFERENCES mobile_models(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
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
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (mobile_unit_id) REFERENCES mobile_units(id),
  FOREIGN KEY (model_id) REFERENCES mobile_models(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY uniq_stock_movement_unit_ref (mobile_unit_id, movement_type, reference_type, reference_id)
);

CREATE TABLE IF NOT EXISTS receivables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_order_id INT NOT NULL UNIQUE,
  party_id INT NULL,
  branch_id INT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  status ENUM('pending', 'partial', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_order_id) REFERENCES sale_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id) REFERENCES parties(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS payables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id INT NOT NULL UNIQUE,
  party_id INT NULL,
  branch_id INT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  status ENUM('pending', 'partial', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id) REFERENCES parties(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_type ENUM('sale', 'purchase') NOT NULL,
  reference_id INT NOT NULL,
  direction ENUM('in', 'out') NOT NULL,
  branch_id INT NOT NULL,
  party_id INT NULL,
  payment_method ENUM('cash', 'bank_transfer', 'mobile_wallet') NOT NULL DEFAULT 'cash',
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  idempotency_key VARCHAR(120) NULL,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (party_id) REFERENCES parties(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY uniq_payment_idempotency (created_by, idempotency_key)
);

CREATE TABLE IF NOT EXISTS cash_register_sessions (
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
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (opened_by) REFERENCES users(id),
  FOREIGN KEY (closed_by) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id),
  UNIQUE KEY uniq_cash_register_branch_date (branch_id, business_date)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  category ENUM('salary', 'utility_bill', 'transport', 'misc') NOT NULL,
  title VARCHAR(120) NOT NULL,
  expense_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  notification_type VARCHAR(64) NOT NULL,
  reference_type VARCHAR(64) NOT NULL,
  reference_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  due_date DATE NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  branch_id INT NOT NULL DEFAULT 1,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_category_biz_branch_name (business_id, branch_id, name),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
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
);

CREATE TABLE IF NOT EXISTS product_stocks (
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
);

CREATE TABLE IF NOT EXISTS partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  cnic VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS partner_branch_shares (
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
);

CREATE TABLE IF NOT EXISTS partner_transactions (
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
);

CREATE TABLE IF NOT EXISTS stock_transfers (
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
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
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
);

CREATE TABLE IF NOT EXISTS order_returns (
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
);

CREATE TABLE IF NOT EXISTS order_return_items (
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
);

CREATE TABLE IF NOT EXISTS repair_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  branch_id INT NOT NULL,
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(30) NULL,
  model_name VARCHAR(120) NOT NULL,
  imei VARCHAR(32) NULL,
  serial_number VARCHAR(50) NULL,
  issue_description TEXT NOT NULL,
  estimated_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  actual_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  advance_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('received', 'diagnosing', 'waiting_parts', 'repaired', 'delivered', 'cancelled') NOT NULL DEFAULT 'received',
  warranty_days INT NOT NULL DEFAULT 0,
  warranty_until DATE NULL,
  technician_name VARCHAR(120) NULL,
  diagnosis_notes TEXT NULL,
  received_date DATE NOT NULL,
  delivered_date DATE NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_repairs_biz_branch (business_id, branch_id),
  INDEX idx_repairs_status (status),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (customer_id) REFERENCES parties(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  branch_id INT NOT NULL,
  user_id INT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  cnic VARCHAR(30) NULL,
  designation VARCHAR(80) NOT NULL DEFAULT 'Sales Staff',
  monthly_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  joining_date DATE NOT NULL,
  status ENUM('active', 'inactive', 'terminated') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_emp_biz_branch (business_id, branch_id),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS employee_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  branch_id INT NOT NULL,
  employee_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present', 'absent', 'half_day', 'leave') NOT NULL DEFAULT 'present',
  check_in_time VARCHAR(10) NULL,
  check_out_time VARCHAR(10) NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_emp_date (employee_id, attendance_date),
  INDEX idx_att_date (attendance_date),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_salaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  branch_id INT NOT NULL,
  employee_id INT NOT NULL,
  salary_month VARCHAR(7) NOT NULL,
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  bonus DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  advance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  computed_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL,
  status ENUM('pending', 'paid') NOT NULL DEFAULT 'paid',
  notes VARCHAR(255) NULL,
  overridden_fields JSON NULL DEFAULT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_emp_month (employee_id, salary_month),
  INDEX idx_sal_month (salary_month),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_mobile_units_branch_status ON mobile_units(branch_id, current_status);
CREATE INDEX idx_mobile_models_business ON mobile_models(business_id);
CREATE INDEX idx_parties_business_type ON parties(business_id, party_type);
CREATE INDEX idx_stock_movements_business_branch ON stock_movements(business_id, branch_id, created_at);
CREATE INDEX idx_branch_subscriptions_status ON branch_subscriptions(status, current_period_ends_on, grace_ends_on);
CREATE INDEX idx_subscription_payments_branch_status ON subscription_payments(branch_id, status);
CREATE INDEX idx_cash_register_status ON cash_register_sessions(branch_id, status, business_date);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(purchase_date);
CREATE INDEX idx_sale_orders_date ON sale_orders(sale_date);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_notifications_ref ON notifications(reference_type, reference_id, is_read);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_product_stocks_branch ON product_stocks(branch_id);


