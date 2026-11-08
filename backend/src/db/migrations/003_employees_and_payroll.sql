-- Migration 003: Employees, Daily Attendance, and Salaries/Payroll Module

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
  salary_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  bonus DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL,
  status ENUM('pending', 'paid') NOT NULL DEFAULT 'paid',
  notes VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_emp_month (employee_id, salary_month),
  INDEX idx_sal_month (salary_month),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
