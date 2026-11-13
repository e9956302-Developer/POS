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

export async function migratePayrollAdvances() {
  console.log("=== Checking Payroll Advances & Monthly Attendance Migration ===");

  // 1. Add advance_deduction, computed_salary, overridden_fields, updated_by, updated_at to employee_salaries if not present
  if (await tableExists("employee_salaries")) {
    if (!(await columnExists("employee_salaries", "advance_deduction"))) {
      await query("ALTER TABLE employee_salaries ADD COLUMN advance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER bonus");
      console.log("✔ Added advance_deduction to employee_salaries");
    }
    if (!(await columnExists("employee_salaries", "computed_salary"))) {
      await query("ALTER TABLE employee_salaries ADD COLUMN computed_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER advance_deduction");
      console.log("✔ Added computed_salary to employee_salaries");
    }
    if (!(await columnExists("employee_salaries", "overridden_fields"))) {
      await query("ALTER TABLE employee_salaries ADD COLUMN overridden_fields JSON NULL DEFAULT NULL AFTER notes");
      console.log("✔ Added overridden_fields to employee_salaries");
    }
    if (!(await columnExists("employee_salaries", "updated_by"))) {
      await query("ALTER TABLE employee_salaries ADD COLUMN updated_by INT NULL DEFAULT NULL AFTER created_by");
      console.log("✔ Added updated_by to employee_salaries");
    }
    if (!(await columnExists("employee_salaries", "updated_at"))) {
      await query("ALTER TABLE employee_salaries ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
      console.log("✔ Added updated_at to employee_salaries");
    }
  }

  // 2. Create employee_advances table
  await query(`
    CREATE TABLE IF NOT EXISTS employee_advances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL,
      employee_id INT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      advance_date DATE NOT NULL,
      status ENUM('pending', 'deducted', 'cancelled') NOT NULL DEFAULT 'pending',
      deducted_in_month VARCHAR(7) NULL,
      notes VARCHAR(255) NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_adv_emp (employee_id, status),
      INDEX idx_adv_biz_branch (business_id, branch_id),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // 3. Create employee_monthly_attendance table
  await query(`
    CREATE TABLE IF NOT EXISTS employee_monthly_attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id INT NOT NULL,
      branch_id INT NOT NULL,
      employee_id INT NOT NULL,
      month VARCHAR(7) NOT NULL,
      total_working_days INT NOT NULL DEFAULT 30,
      present_days INT NOT NULL DEFAULT 30,
      absent_days INT NOT NULL DEFAULT 0,
      leave_days INT NOT NULL DEFAULT 0,
      half_days INT NOT NULL DEFAULT 0,
      notes VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_emp_month_att (employee_id, month),
      INDEX idx_att_month (month),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  console.log("=== Payroll Advances & Monthly Attendance Migration Complete ===");
}

if (process.argv[1] && process.argv[1].endsWith("migratePayrollAdvances.js")) {
  migratePayrollAdvances()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
