import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { pool, query } from "../src/db/pool.js";

let server;
let baseUrl;
let businessId;
let branchId;
let planId;
let adminToken;
let adminUserId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const ts = Date.now().toString().slice(-6);

  // 1. Subscription plan
  const pkg = await query(
    `INSERT INTO subscription_plans (name, monthly_price, price, billing_period, duration_value, duration_unit, max_branches, trial_days, grace_days, is_active, allowed_pages)
     VALUES (?, 1000, 1000, 'monthly', 1, 'month', 10, 14, 7, 1, ?)`,
    [`Audit Plan ${ts}`, JSON.stringify(["dashboard", "sales", "purchases", "inventory", "parties", "expenses", "cash_register", "repairs", "employees", "reports", "admin"])]
  );
  planId = pkg.insertId;

  // 2. Business
  const biz = await query(
    "INSERT INTO businesses (name, code, is_active) VALUES (?, ?, 1)",
    [`Audit Biz ${ts}`, `AUD_${ts}`]
  );
  businessId = biz.insertId;

  // 3. Branch
  const br = await query(
    "INSERT INTO branches (business_id, name, code) VALUES (?, 'Main Branch', ?)",
    [businessId, `ABR_${ts}`]
  );
  branchId = br.insertId;

  // 4. Branch subscription
  await query(
    `INSERT INTO branch_subscriptions (business_id, branch_id, plan_id, status, current_period_ends_on)
     VALUES (?, ?, ?, 'active', DATE_ADD(CURDATE(), INTERVAL 30 DAY))`,
    [businessId, branchId, planId]
  );

  // 5. Admin user
  const [role] = await query("SELECT id FROM roles WHERE name = 'business_super_admin' LIMIT 1");
  const hash = await bcrypt.hash("password123", 10);
  const u = await query(
    `INSERT INTO users (business_id, branch_id, role_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, 'Audit Admin', ?, ?, 1)`,
    [businessId, branchId, role.id, `audit_admin_${ts}@test.local`, hash]
  );
  adminUserId = u.insertId;
  adminToken = jwt.sign({ userId: adminUserId }, env.jwtSecret, { expiresIn: "12h" });
});

after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
  if (businessId) {
    await query("DELETE FROM employee_advances WHERE business_id = :id", { id: businessId });
    await query("DELETE FROM employee_monthly_attendance WHERE business_id = :id", { id: businessId });
    await query("DELETE FROM employee_attendance WHERE business_id = :id", { id: businessId });
    await query("DELETE FROM employee_salaries WHERE business_id = :id", { id: businessId });
    await query("DELETE FROM employees WHERE business_id = :id", { id: businessId });
    await query("DELETE FROM expenses WHERE branch_id = :branchId", { branchId });
    await query("DELETE FROM parties WHERE business_id = :id", { id: businessId });
    await query("DELETE FROM audit_logs WHERE user_id = :userId", { userId: adminUserId });
    await query("DELETE FROM users WHERE business_id = :id", { id: businessId });
    await query("DELETE FROM branch_subscriptions WHERE business_id = :id", { id: businessId });
    await query("DELETE FROM branches WHERE business_id = :id", { id: businessId });
    await query("DELETE FROM businesses WHERE id = :id", { id: businessId });
  }
  if (planId) {
    await query("DELETE FROM subscription_plans WHERE id = :id", { id: planId });
  }
});

test("audit: expense creation, PUT update, soft-delete, and cash register exclusion", async () => {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Create expense
  const createRes = await fetch(`${baseUrl}/api/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      category: "utility_bill",
      title: "Electricity Bill Oct",
      expenseDate: today,
      amount: 4500,
      notes: "Shop electricity meter bill"
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.title, "Electricity Bill Oct");
  assert.equal(Number(created.amount), 4500);

  // 2. Update expense via PUT /api/expenses/:id
  const updateRes = await fetch(`${baseUrl}/api/expenses/${created.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: "Electricity Bill Oct (Corrected)",
      amount: 4800,
      category: "utility_bill",
      expenseDate: today,
      notes: "Corrected amount after surcharge"
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.title, "Electricity Bill Oct (Corrected)");
  assert.equal(Number(updated.amount), 4800);

  // 3. Verify expense reflects in cash register session summary
  const sessionResBefore = await fetch(`${baseUrl}/api/cash-register/session?branchId=${branchId}&date=${today}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(sessionResBefore.status, 200);
  const sessionBefore = await sessionResBefore.json();
  assert.equal(sessionBefore.summary.expenses, 4800);

  // 4. Soft-delete the expense
  const deleteRes = await fetch(`${baseUrl}/api/expenses/${created.id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ reason: "Duplicate entry audit test" })
  });
  assert.equal(deleteRes.status, 200);

  // 5. Verify deleted expense is NO LONGER included in cash register expected cash calculations
  const sessionResAfter = await fetch(`${baseUrl}/api/cash-register/session?branchId=${branchId}&date=${today}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(sessionResAfter.status, 200);
  const sessionAfter = await sessionResAfter.json();
  assert.equal(sessionAfter.summary.expenses, 0, "Deleted expense must be excluded from cash drawer summary");
});

test("audit: party creation with customer & vendor opening balances", async () => {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Create customer with opening balance
  const custRes = await fetch(`${baseUrl}/api/parties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      partyType: "customer",
      name: "Tariq Customer",
      phone: "03001122334",
      openingBalance: 12500,
      openingBalanceType: "receivable",
      openingBalanceDate: today
    })
  });
  assert.equal(custRes.status, 201);
  const cust = await custRes.json();
  assert.equal(Number(cust.opening_balance), 12500);
  assert.equal(cust.opening_balance_type, "receivable");

  // 2. Create vendor with opening balance
  const vendRes = await fetch(`${baseUrl}/api/parties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      partyType: "vendor",
      name: "Hafeez Center Wholesale",
      phone: "03219988776",
      openingBalance: 45000,
      openingBalanceType: "payable",
      openingBalanceDate: today
    })
  });
  assert.equal(vendRes.status, 201);
  const vend = await vendRes.json();
  assert.equal(Number(vend.opening_balance), 45000);
  assert.equal(vend.opening_balance_type, "payable");
});

test("audit: employee advance, monthly attendance, and salary payment with advance deduction", async () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);

  // 1. Register employee
  const empRes = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      fullName: "Kamran Staff",
      designation: "Sales Lead",
      phone: "03335551234",
      monthlySalary: 35000,
      joiningDate: today
    })
  });
  assert.equal(empRes.status, 201);
  const empData = await empRes.json();
  const employeeId = empData.id;
  assert.ok(employeeId);

  // 2. Issue employee advance
  const advRes = await fetch(`${baseUrl}/api/employees/advances`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      employeeId,
      amount: 5000,
      advanceDate: today,
      notes: "Advance for emergency repair"
    })
  });
  assert.equal(advRes.status, 201);

  // 3. Log monthly attendance
  const attRes = await fetch(`${baseUrl}/api/employees/attendance/monthly`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      month: currentMonth,
      records: [
        {
          employeeId,
          totalWorkingDays: 30,
          presentDays: 28,
          absentDays: 2,
          halfDays: 0,
          leaveDays: 0
        }
      ]
    })
  });
  assert.equal(attRes.status, 200);

  // 4. Pay salary with 5000 advance deduction + 2000 bonus
  const payRes = await fetch(`${baseUrl}/api/employees/salaries/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      employeeId,
      salaryMonth: currentMonth,
      baseSalary: 35000,
      bonus: 2000,
      advanceDeduction: 5000,
      deductions: 0,
      paymentMethod: "cash",
      paymentDate: today,
      recordAsExpense: true
    })
  });
  assert.equal(payRes.status, 201);
  const payData = await payRes.json();
  // 35000 base + 2000 bonus - 5000 advance = 32000 net salary
  assert.equal(payData.netSalary, 32000);

  // 5. Verify advance status changed to deducted
  const [advCheck] = await query("SELECT status, deducted_in_month FROM employee_advances WHERE employee_id = ?", [employeeId]);
  assert.equal(advCheck.status, "deducted");
  assert.equal(advCheck.deducted_in_month, currentMonth);

  // 6. Verify operational salary expense was created in expenses
  const [expCheck] = await query("SELECT * FROM expenses WHERE branch_id = :branchId AND category = 'salary' AND amount = 32000", { branchId });
  assert.ok(expCheck, "Salary must be logged as operational expense for cash reconciliation");

  // 7. RESTRICTION TEST: Attempting to disburse duplicate salary for the same month MUST fail with 400 Bad Request
  const duplicatePayRes = await fetch(`${baseUrl}/api/employees/salaries/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      employeeId,
      salaryMonth: currentMonth,
      baseSalary: 35000,
      bonus: 0,
      advanceDeduction: 0,
      deductions: 0,
      paymentMethod: "cash",
      paymentDate: today
    })
  });
  assert.equal(duplicatePayRes.status, 400, "Duplicate salary payment for already given month must be rejected with 400");
  const dupErrData = await duplicatePayRes.json();
  assert.match(dupErrData.message, /already been disbursed/i, "Error message must state salary was already given for this month");

  // 8. Verify GET /api/employees/attendance/monthly returns is_salary_paid: 1 and net amount
  const attCheckRes = await fetch(`${baseUrl}/api/employees/attendance/monthly?month=${currentMonth}&branchId=${branchId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(attCheckRes.status, 200);
  const attCheckData = await attCheckRes.json();
  const empAttRow = attCheckData.find((r) => Number(r.employee_id) === Number(employeeId));
  assert.ok(empAttRow, "Employee attendance row must exist");
  assert.equal(empAttRow.is_salary_paid, 1, "is_salary_paid must be 1 for paid month");
  assert.equal(Number(empAttRow.salary_net_paid), 32000, "salary_net_paid must reflect disbursed amount");

  // 9. Verify GET /api/employees/history returns ledger statement, summary, and breakdown
  const historyRes = await fetch(`${baseUrl}/api/employees/history?employeeId=${employeeId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(historyRes.status, 200);
  const historyData = await historyRes.json();
  assert.equal(historyData.salaries.length, 1);
  assert.equal(historyData.advances.length, 1);
  assert.equal(historyData.summary.totalNetSalaries, 32000);
  assert.equal(historyData.summary.totalAdvancesRecovered, 5000);
  assert.equal(historyData.employeeBreakdown.length, 1);
  assert.deepEqual(historyData.employeeBreakdown[0].salaryMonthsPaid, [currentMonth]);
});

test("audit: monthly salary unified form - preview, live calculation, admin overrides, and base salary restrictions", async () => {
  const ts = Date.now().toString().slice(-4);
  const nextMonth = "2026-11";
  const today = new Date().toISOString().slice(0, 10);

  // 1. Create staff member WITH base salary
  const empRes = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      fullName: `Salary Test Emp ${ts}`,
      phone: `030099${ts}`,
      cnic: `35201-999${ts}-1`,
      designation: "Accountant",
      monthlySalary: 45000,
      joiningDate: "2026-01-01"
    })
  });
  assert.equal(empRes.status, 201);
  const empData = await empRes.json();
  const empId = empData.id;

  // 2. Test Salary Preview endpoint for new month (no advance / bonus records)
  const prevRes = await fetch(`${baseUrl}/api/employees/${empId}/salary-preview?month=${nextMonth}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(prevRes.status, 200);
  const prevData = await prevRes.json();
  assert.equal(prevData.baseSalary, 45000);
  assert.equal(prevData.bonus, 0, "Default bonus should be 0 when no record exists");
  assert.equal(prevData.advance, 0, "Default advance should be 0 when no pending advance exists");
  assert.equal(prevData.computedSalary, 45000, "Computed salary = base + bonus - advance = 45000");
  assert.equal(prevData.netSalary, 45000, "Net salary = computed - deductions = 45000");
  assert.equal(prevData.isAlreadyPaid, false);

  // 3. Issue an advance for this employee
  await fetch(`${baseUrl}/api/employees/advances`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      employeeId: empId,
      amount: 10000,
      advanceDate: today,
      notes: "Motorcycle loan"
    })
  });

  // 4. Verify preview now reflects outstanding advance
  const prevWithAdvRes = await fetch(`${baseUrl}/api/employees/${empId}/salary-preview?month=${nextMonth}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(prevWithAdvRes.status, 200);
  const prevWithAdv = await prevWithAdvRes.json();
  assert.equal(prevWithAdv.advance, 10000);
  assert.equal(prevWithAdv.computedSalary, 35000, "Computed salary = 45000 - 10000 = 35000");
  assert.equal(prevWithAdv.netSalary, 35000);

  // 5. Test Admin Override and Disburse:
  // Admin overrides bonus to 5000, advance deduction to 8000, custom computedSalary to 43000, deductions to 2000, and custom netSalary to 40000
  const payOverrideRes = await fetch(`${baseUrl}/api/employees/salaries/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      employeeId: empId,
      salaryMonth: nextMonth,
      baseSalary: 45000,
      bonus: 5000,
      advanceDeduction: 8000,
      computedSalary: 43000, // overridden (formula is 45000 + 5000 - 8000 = 42000)
      deductions: 2000,
      netSalary: 40000, // overridden (formula is 43000 - 2000 = 41000)
      overriddenFields: ["computed_salary", "net_salary", "bonus", "advance_deduction"],
      paymentMethod: "bank",
      paymentDate: today,
      notes: "Custom executive bonus and adjusted net approved by Director",
      recordAsExpense: true
    })
  });
  assert.equal(payOverrideRes.status, 201);
  const payOverrideData = await payOverrideRes.json();
  assert.equal(payOverrideData.netSalary, 40000);

  // 6. Verify database record has computed_salary and overridden_fields persisted
  const [dbSalary] = await query(
    "SELECT computed_salary, net_salary, overridden_fields, created_by, updated_by FROM employee_salaries WHERE employee_id = ? AND salary_month = ?",
    [empId, nextMonth]
  );
  assert.ok(dbSalary, "Salary record must be saved in DB");
  assert.equal(Number(dbSalary.computed_salary), 43000);
  assert.equal(Number(dbSalary.net_salary), 40000);
  assert.equal(Number(dbSalary.created_by), adminUserId);
  const savedOverrides = typeof dbSalary.overridden_fields === "string" ? JSON.parse(dbSalary.overridden_fields) : dbSalary.overridden_fields;
  assert.deepEqual(savedOverrides, ["computed_salary", "net_salary", "bonus", "advance_deduction"]);

  // 7. EDGE CASE TEST: Create employee with NO base salary (0 or null)
  const noBaseEmpRes = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      fullName: `Zero Base Emp ${ts}`,
      phone: `031188${ts}`,
      cnic: `35201-888${ts}-2`,
      designation: "Intern",
      monthlySalary: 0,
      joiningDate: "2026-02-01"
    })
  });
  assert.equal(noBaseEmpRes.status, 201);
  const noBaseEmpData = await noBaseEmpRes.json();
  const zeroEmpId = noBaseEmpData.id;

  // Verify preview reflects hasBaseSalary: false
  const zeroPrevRes = await fetch(`${baseUrl}/api/employees/${zeroEmpId}/salary-preview?month=${nextMonth}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(zeroPrevRes.status, 200);
  const zeroPrevData = await zeroPrevRes.json();
  assert.equal(zeroPrevData.hasBaseSalary, false);

  // Attempting to disburse salary for employee with no base salary MUST fail with 400
  const zeroPayRes = await fetch(`${baseUrl}/api/employees/salaries/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      employeeId: zeroEmpId,
      salaryMonth: nextMonth,
      baseSalary: 0,
      bonus: 0,
      advanceDeduction: 0,
      paymentMethod: "cash"
    })
  });
  assert.equal(zeroPayRes.status, 400, "Disbursing salary for employee with no base salary must be rejected with 400");
  const zeroErr = await zeroPayRes.json();
  assert.match(zeroErr.message, /no base monthly salary/i);

  // 8. VALIDATION TEST: Negative amounts must be rejected with 400
  const negPayRes = await fetch(`${baseUrl}/api/employees/salaries/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      employeeId: empId,
      salaryMonth: "2026-12",
      baseSalary: 45000,
      bonus: -500,
      advanceDeduction: 0,
      paymentMethod: "cash"
    })
  });
  assert.equal(negPayRes.status, 400, "Negative amounts must be rejected with 400");
  const negErr = await negPayRes.json();
  assert.match(negErr.message, /greater than or equal to 0/i);
});

test("audit: monthly salary batch table form - preview all, bulk calculation, all-or-nothing validation, and batch persistence", async () => {
  const ts = Date.now().toString().slice(-4);
  const batchMonth = "2027-01";
  const today = new Date().toISOString().slice(0, 10);

  // 1. Create two valid employees with base salaries
  const empARes = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      fullName: `Batch Emp A ${ts}`,
      phone: `030111${ts}`,
      cnic: `35201-111${ts}-1`,
      designation: "Developer",
      monthlySalary: 50000,
      joiningDate: "2026-01-01"
    })
  });
  assert.equal(empARes.status, 201);
  const empA = await empARes.json();

  const empBRes = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      fullName: `Batch Emp B ${ts}`,
      phone: `030222${ts}`,
      cnic: `35201-222${ts}-2`,
      designation: "Designer",
      monthlySalary: 60000,
      joiningDate: "2026-01-01"
    })
  });
  assert.equal(empBRes.status, 201);
  const empB = await empBRes.json();

  // 2. Grant an advance of 15000 to Emp A
  const advRes = await fetch(`${baseUrl}/api/employees/advances`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      employeeId: empA.id,
      amount: 15000,
      advanceDate: today,
      notes: "Batch test loan"
    })
  });
  assert.equal(advRes.status, 201);

  // 3. Test GET /api/employees/batch-salary-preview
  const batchPrevRes = await fetch(`${baseUrl}/api/employees/batch-salary-preview?month=${batchMonth}&branchId=${branchId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(batchPrevRes.status, 200);
  const batchPrevData = await batchPrevRes.json();
  assert.ok(Array.isArray(batchPrevData.employees), "Must return employees array");

  const rowA = batchPrevData.employees.find((e) => Number(e.employeeId) === Number(empA.id));
  const rowB = batchPrevData.employees.find((e) => Number(e.employeeId) === Number(empB.id));
  assert.ok(rowA, "Emp A must be present in batch preview");
  assert.ok(rowB, "Emp B must be present in batch preview");

  assert.equal(rowA.baseSalary, 50000);
  assert.equal(rowA.advance, 15000, "Emp A advance must prefill from 15000 pending loan");
  assert.equal(rowA.computedSalary, 35000, "Base 50000 - Adv 15000 = 35000");
  assert.equal(rowA.netSalary, 35000);
  assert.equal(rowA.isAlreadyPaid, false);

  assert.equal(rowB.baseSalary, 60000);
  assert.equal(rowB.advance, 0);
  assert.equal(rowB.computedSalary, 60000);
  assert.equal(rowB.netSalary, 60000);
  assert.equal(rowB.isAlreadyPaid, false);

  // 4. Create an employee C with NO base salary (0) to test all-or-nothing validation
  const empCRes = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      branchId,
      fullName: `Zero Base Emp C ${ts}`,
      phone: `030333${ts}`,
      cnic: `35201-333${ts}-3`,
      designation: "Intern",
      monthlySalary: 0,
      joiningDate: "2026-01-01"
    })
  });
  assert.equal(empCRes.status, 201);
  const empC = await empCRes.json();

  // 5. Test ALL-OR-NOTHING rejection when one employee has no base salary
  const invalidBatchRes = await fetch(`${baseUrl}/api/employees/salaries/batch-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      salaryMonth: batchMonth,
      branchId,
      paymentMethod: "bank",
      paymentDate: today,
      disbursements: [
        {
          employeeId: empA.id,
          baseSalary: 50000,
          bonus: 2000,
          advanceDeduction: 15000,
          computedSalary: 37000,
          deductions: 0,
          netSalary: 37000,
          overriddenFields: ["bonus"]
        },
        {
          employeeId: empC.id,
          baseSalary: 0, // INVALID!
          bonus: 0,
          advanceDeduction: 0,
          computedSalary: 0,
          deductions: 0,
          netSalary: 0
        }
      ]
    })
  });
  assert.equal(invalidBatchRes.status, 400, "Must reject batch if any employee has no base salary");
  const invalidErr = await invalidBatchRes.json();
  assert.match(invalidErr.message, /Batch validation failed/i);
  assert.ok(invalidErr.errors.some((e) => e.includes(`Zero Base Emp C ${ts}`)));

  // Verify that Emp A was NOT saved partially (all-or-nothing!)
  const [partialCheck] = await query(
    "SELECT id FROM employee_salaries WHERE salary_month = ? AND employee_id IN (?, ?)",
    [batchMonth, empA.id, empC.id]
  );
  assert.equal(partialCheck, undefined, "Strict all-or-nothing: valid rows must NOT be partially saved when a batch fails");

  // 6. Test ALL-OR-NOTHING rejection with negative numbers
  const negBatchRes = await fetch(`${baseUrl}/api/employees/salaries/batch-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      salaryMonth: batchMonth,
      branchId,
      paymentMethod: "bank",
      paymentDate: today,
      disbursements: [
        {
          employeeId: empA.id,
          baseSalary: 50000,
          bonus: -500, // INVALID NEGATIVE!
          advanceDeduction: 0,
          computedSalary: 49500,
          deductions: 0,
          netSalary: 49500
        }
      ]
    })
  });
  assert.equal(negBatchRes.status, 400, "Negative amounts must be rejected in batch");

  // 7. Test SUCCESSFUL BATCH DISBURSEMENT for Emp A & Emp B
  // Emp A: Base 50000 + Bonus 3000 - Adv 15000 = Computed 38000, Deductions 1000 = Net 37000
  // Emp B: Base 60000 + Bonus 5000 - Adv 0 = Computed 65000 (overridden to 66000), Deductions 0 = Net 66000
  const validBatchRes = await fetch(`${baseUrl}/api/employees/salaries/batch-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      salaryMonth: batchMonth,
      branchId,
      paymentMethod: "bank",
      paymentDate: today,
      notes: "January 2027 Batch Payroll",
      recordAsExpense: true,
      disbursements: [
        {
          employeeId: empA.id,
          baseSalary: 50000,
          bonus: 3000,
          advanceDeduction: 15000,
          computedSalary: 38000,
          deductions: 1000,
          netSalary: 37000,
          overriddenFields: ["bonus"]
        },
        {
          employeeId: empB.id,
          baseSalary: 60000,
          bonus: 5000,
          advanceDeduction: 0,
          computedSalary: 66000, // overridden directly
          deductions: 0,
          netSalary: 66000, // overridden directly
          overriddenFields: ["bonus", "computed_salary", "net_salary"]
        }
      ]
    })
  });
  assert.equal(validBatchRes.status, 201, "Valid batch payment must return 201");
  const batchSuccess = await validBatchRes.json();
  assert.equal(batchSuccess.count, 2);
  assert.equal(batchSuccess.totalNet, 37000 + 66000); // 103000

  // 8. Verify database persistence of both records
  const dbSalaries = await query(
    "SELECT employee_id, computed_salary, net_salary, overridden_fields, created_by FROM employee_salaries WHERE salary_month = ? AND employee_id IN (?, ?) ORDER BY employee_id ASC",
    [batchMonth, empA.id, empB.id]
  );
  assert.equal(dbSalaries.length, 2);
  assert.equal(Number(dbSalaries[0].computed_salary), 38000);
  assert.equal(Number(dbSalaries[0].net_salary), 37000);
  assert.equal(Number(dbSalaries[1].computed_salary), 66000);
  assert.equal(Number(dbSalaries[1].net_salary), 66000);
  assert.equal(Number(dbSalaries[0].created_by), adminUserId);

  // 9. Verify advance status for Emp A updated to deducted
  const [advA] = await query("SELECT status, deducted_in_month FROM employee_advances WHERE employee_id = ?", [empA.id]);
  assert.equal(advA.status, "deducted");
  assert.equal(advA.deducted_in_month, batchMonth);

  // 10. Verify expenses logged for both employees
  const expRows = await query(
    "SELECT * FROM expenses WHERE branch_id = :branchId AND category = 'salary' AND amount IN (37000, 66000)",
    { branchId }
  );
  assert.equal(expRows.length, 2, "Expenses must be logged for both batch disbursements");

  // 11. Test duplicate prevention on re-disbursement attempt for the same month
  const duplicateBatchRes = await fetch(`${baseUrl}/api/employees/salaries/batch-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      salaryMonth: batchMonth,
      branchId,
      disbursements: [
        {
          employeeId: empA.id,
          baseSalary: 50000,
          bonus: 0,
          advanceDeduction: 0,
          computedSalary: 50000,
          deductions: 0,
          netSalary: 50000
        }
      ]
    })
  });
  assert.equal(duplicateBatchRes.status, 400, "Re-disbursing salary for already paid month must be rejected with 400");
  const dupErr = await duplicateBatchRes.json();
  assert.match(dupErr.message, /Batch validation failed/i);
});

test("audit: security - token invalidation on deactivated user and SQL injection safety", async () => {
  try {
    // 1. Deactivate admin user in DB
    await query("UPDATE users SET is_active = 0 WHERE id = :id", { id: adminUserId });

    // Request with token of deactivated user should immediately return 401
    const deactRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.ok(
      deactRes.status === 401 || deactRes.status === 403,
      `Deactivated user token must be rejected immediately with 401 or 403, got ${deactRes.status}`
    );

    // Reactivate user
    await query("UPDATE users SET is_active = 1 WHERE id = :id", { id: adminUserId });

    // 2. Test search parameter SQL injection resistance
    const sqliSearch = "' OR '1'='1";
    const searchRes = await fetch(`${baseUrl}/api/parties?search=${encodeURIComponent(sqliSearch)}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(Array.isArray(searchData), "Search result must be an array");
    assert.equal(searchData.length, 0, "SQL injection string must not return unexpected records");

    // 3. Test invalid JWT token
    const badTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: "Bearer invalid.fake.token" }
    });
    assert.equal(badTokenRes.status, 401);
  } finally {
    await query("UPDATE users SET is_active = 1 WHERE id = :id", { id: adminUserId });
  }
});
