import { query } from "./pool.js";

async function migrate() {
  console.log("Starting Payroll Advances & Monthly Attendance Migration...");

  // 1. Add advance_deduction, computed_salary, overridden_fields, updated_by, updated_at to employee_salaries if not present
  try {
    const cols = await query("DESCRIBE employee_salaries");
    const colNames = cols.map((c) => c.Field);
    if (!colNames.includes("advance_deduction")) {
      await query("ALTER TABLE employee_salaries ADD COLUMN advance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER bonus");
      console.log("Added advance_deduction to employee_salaries");
    }
    if (!colNames.includes("computed_salary")) {
      await query("ALTER TABLE employee_salaries ADD COLUMN computed_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER advance_deduction");
      console.log("Added computed_salary to employee_salaries");
    }
    if (!colNames.includes("overridden_fields")) {
      await query("ALTER TABLE employee_salaries ADD COLUMN overridden_fields JSON NULL DEFAULT NULL AFTER notes");
      console.log("Added overridden_fields to employee_salaries");
    }
    if (!colNames.includes("updated_by")) {
      await query("ALTER TABLE employee_salaries ADD COLUMN updated_by INT NULL DEFAULT NULL AFTER created_by");
      console.log("Added updated_by to employee_salaries");
    }
    if (!colNames.includes("updated_at")) {
      await query("ALTER TABLE employee_salaries ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
      console.log("Added updated_at to employee_salaries");
    }
  } catch (err) {
    console.warn("Could not check/alter employee_salaries:", err.message);
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
  console.log("Created employee_advances table");

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
  console.log("Created employee_monthly_attendance table");

  console.log("Payroll advances and monthly attendance migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
