INSERT IGNORE INTO roles (id, name) VALUES
  (1, 'top_admin'),
  (2, 'business_super_admin'),
  (3, 'manager'),
  (4, 'cashier'),
  (5, 'admin');

INSERT IGNORE INTO businesses (id, name, code, is_active) VALUES
  (1, 'Demo Mobile Shop', 'DEMO', 1);

INSERT IGNORE INTO branches (id, business_id, name, code, address) VALUES
  (1, 1, 'Main Branch', 'MAIN', 'Main Market');

INSERT IGNORE INTO subscription_plans (id, name, monthly_price, max_branches, trial_days, grace_days, is_active) VALUES
  (1, 'Starter', 0, 1, 14, 7, 1);

INSERT IGNORE INTO branch_subscriptions
  (id, business_id, branch_id, plan_id, status, trial_ends_on, current_period_ends_on, grace_ends_on)
VALUES
  (1, 1, 1, 1, 'active', NULL, '2099-12-31', NULL);

INSERT IGNORE INTO users (id, business_id, role_id, branch_id, full_name, email, password_hash, is_active) VALUES
  (1, NULL, 1, NULL, 'Mobile POS Top Admin', 'topadmin@mobilepos.local', '$2a$10$2hPxomutMqQ1iR8SIcmw6egFq68f/Jv0GWupjmnaIP92SxO766/B2', 1),
  (2, 1, 2, 1, 'Business Super Admin', 'admin@mobilepos.local', '$2a$10$2hPxomutMqQ1iR8SIcmw6egFq68f/Jv0GWupjmnaIP92SxO766/B2', 1);

INSERT IGNORE INTO parties (id, business_id, branch_id, party_type, name, phone, cnic, address, notes) VALUES
  (1, 1, 1, 'vendor', 'Default Vendor', '03001234567', '35202-1234567-1', 'Lahore', 'Seed vendor'),
  (2, 1, 1, 'customer', 'Walk In Customer', '03007654321', NULL, 'Shop', 'Seed customer');

INSERT IGNORE INTO mobile_models (id, business_id, company, model_name, variant, color, storage) VALUES
  (1, 1, 'Samsung', 'Galaxy A15', '4G', 'Black', '128GB'),
  (2, 1, 'Infinix', 'Note 30', 'Base', 'Blue', '256GB');
