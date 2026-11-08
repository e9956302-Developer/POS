import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest } from "../../utils/http.js";
import { query, withTransaction } from "../../db/pool.js";
import {
  assertBranchAccess,
  businessScopeCondition,
  businessScopeParams,
  isBusinessAdmin,
  requirePermission
} from "../../middleware/auth.js";

export const employeesRouter = Router();

// ==========================================
// 1. EMPLOYEES CRUD
// ==========================================

employeesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { branchId, status, search } = req.query;
    let sql = `
      SELECT e.*, COALESCE(b.name, 'Main Branch') AS branch_name
      FROM employees e
      LEFT JOIN branches b ON b.id = e.branch_id
      WHERE e.business_id = :businessId
    `;
    const params = { businessId: req.user.business_id };

    if (!isBusinessAdmin(req.user) && req.user.branch_id) {
      sql += ` AND e.branch_id = :userBranchId`;
      params.userBranchId = req.user.branch_id;
    }

    if (branchId) {
      sql += ` AND e.branch_id = :branchId`;
      params.branchId = branchId;
    }
    if (status && status !== "all") {
      sql += ` AND e.status = :status`;
      params.status = status;
    }
    if (search) {
      sql += ` AND (
        e.full_name LIKE :search1 OR
        e.phone LIKE :search2 OR
        e.cnic LIKE :search3 OR
        e.designation LIKE :search4
      )`;
      params.search1 = `%${search}%`;
      params.search2 = `%${search}%`;
      params.search3 = `%${search}%`;
      params.search4 = `%${search}%`;
    }

    sql += ` ORDER BY e.status ASC, e.full_name ASC`;
    const rows = await query(sql, params);
    res.json(rows);
  })
);

employeesRouter.post(
  "/",
  requirePermission("employees", "create"),
  asyncHandler(async (req, res) => {
    let {
      branchId,
      fullName,
      phone = null,
      cnic = null,
      designation = "Sales Staff",
      monthlySalary = 0,
      joiningDate = new Date().toISOString().slice(0, 10),
      userId = null
    } = req.body;

    // Smart fallback if branchId wasn't passed or was empty
    let targetBranchId = branchId ? Number(branchId) : (req.user.branch_id ? Number(req.user.branch_id) : null);
    if (!targetBranchId) {
      const [firstBranch] = await query(
        `SELECT id FROM branches WHERE business_id = :businessId AND status = 'active' ORDER BY id ASC LIMIT 1`,
        { businessId: req.user.business_id }
      );
      if (firstBranch) {
        targetBranchId = Number(firstBranch.id);
      }
    }

    if (!targetBranchId || !fullName || !String(fullName).trim()) {
      throw badRequest("A valid branch and employee full name are required");
    }

    await assertBranchAccess(req.user, targetBranchId);

    const result = await query(
      `INSERT INTO employees (
         business_id, branch_id, user_id, full_name, phone, cnic,
         designation, monthly_salary, joining_date, status
       ) VALUES (
         :businessId, :branchId, :userId, :fullName, :phone, :cnic,
         :designation, :monthlySalary, :joiningDate, 'active'
       )`,
      {
        businessId: req.user.business_id,
        branchId: targetBranchId,
        userId: userId || null,
        fullName: String(fullName).trim(),
        phone: phone ? String(phone).trim() : null,
        cnic: cnic ? String(cnic).trim() : null,
        designation: designation ? String(designation).trim() : "Sales Staff",
        monthlySalary: Number(monthlySalary || 0),
        joiningDate
      }
    );

    const [newEmp] = await query(
      `SELECT e.*, COALESCE(b.name, 'Main Branch') AS branch_name
       FROM employees e
       LEFT JOIN branches b ON b.id = e.branch_id
       WHERE e.id = :id`,
      { id: result.insertId }
    );

    res.status(201).json({
      id: result.insertId,
      message: `Employee "${String(fullName).trim()}" registered successfully`,
      employee: newEmp
    });
  })
);

employeesRouter.put(
  "/:id",
  requirePermission("employees", "edit"),
  asyncHandler(async (req, res) => {
    const {
      branchId,
      fullName,
      phone,
      cnic,
      designation,
      monthlySalary,
      joiningDate,
      status
    } = req.body;

    const [existing] = await query(
      `SELECT e.*
       FROM employees e
       WHERE e.id = :id AND e.business_id = :businessId`,
      { id: req.params.id, businessId: req.user.business_id }
    );

    if (!existing) {
      const err = new Error("Employee not found");
      err.status = 404;
      throw err;
    }

    if (branchId && Number(branchId) !== Number(existing.branch_id)) {
      await assertBranchAccess(req.user, Number(branchId));
    }

    await query(
      `UPDATE employees
       SET branch_id = COALESCE(:branchId, branch_id),
           full_name = COALESCE(:fullName, full_name),
           phone = :phone,
           cnic = :cnic,
           designation = COALESCE(:designation, designation),
           monthly_salary = COALESCE(:monthlySalary, monthly_salary),
           joining_date = COALESCE(:joiningDate, joining_date),
           status = COALESCE(:status, status)
       WHERE id = :id AND business_id = :businessId`,
      {
        id: req.params.id,
        businessId: req.user.business_id,
        branchId: branchId ? Number(branchId) : existing.branch_id,
        fullName: fullName !== undefined ? String(fullName).trim() : existing.full_name,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone,
        cnic: cnic !== undefined ? (cnic ? String(cnic).trim() : null) : existing.cnic,
        designation: designation !== undefined ? String(designation).trim() : existing.designation,
        monthlySalary: monthlySalary !== undefined ? Number(monthlySalary) : existing.monthly_salary,
        joiningDate: joiningDate || existing.joining_date,
        status: status || existing.status
      }
    );

    res.json({ message: "Employee updated successfully" });
  })
);

// ==========================================
// 2. DAILY ATTENDANCE REGISTER
// ==========================================

employeesRouter.get(
  "/attendance",
  asyncHandler(async (req, res) => {
    const { branchId, date, month, employeeId } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    let sql = `
      SELECT ea.*, e.full_name AS employee_name, e.designation, e.monthly_salary, b.name AS branch_name
      FROM employee_attendance ea
      JOIN employees e ON e.id = ea.employee_id
      JOIN branches b ON b.id = ea.branch_id
      WHERE ${businessScopeCondition(req.user, "b")}
    `;
    const params = businessScopeParams(req.user);

    if (branchId) {
      sql += ` AND ea.branch_id = :branchId`;
      params.branchId = branchId;
    }
    if (employeeId) {
      sql += ` AND ea.employee_id = :employeeId`;
      params.employeeId = employeeId;
    }
    if (month) {
      sql += ` AND ea.attendance_date LIKE :monthPattern`;
      params.monthPattern = `${month}%`;
    } else if (date) {
      sql += ` AND ea.attendance_date = :targetDate`;
      params.targetDate = targetDate;
    }

    sql += ` ORDER BY ea.attendance_date DESC, e.full_name ASC`;
    const rows = await query(sql, params);
    res.json(rows);
  })
);

employeesRouter.post(
  "/attendance/batch",
  requirePermission("employees", "create"),
  asyncHandler(async (req, res) => {
    const { branchId, attendanceDate, records } = req.body;

    if (!branchId || !attendanceDate || !Array.isArray(records) || records.length === 0) {
      throw badRequest("branchId, attendanceDate, and records array are required");
    }

    await assertBranchAccess(req.user, branchId);

    await withTransaction(async (conn) => {
      for (const rec of records) {
        if (!rec.employeeId) continue;
        await conn.execute(
          `INSERT INTO employee_attendance (
             business_id, branch_id, employee_id, attendance_date,
             status, check_in_time, check_out_time, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             status = VALUES(status),
             check_in_time = VALUES(check_in_time),
             check_out_time = VALUES(check_out_time),
             notes = VALUES(notes)`,
          [
            req.user.business_id,
            branchId,
            rec.employeeId,
            attendanceDate,
            rec.status || "present",
            rec.checkInTime || null,
            rec.checkOutTime || null,
            rec.notes || null
          ]
        );
      }
    });

    res.json({ message: "Attendance records saved successfully" });
  })
);

// ==========================================
// 3. SALARY & PAYROLL DISBURSEMENT
// ==========================================

employeesRouter.get(
  "/salaries",
  asyncHandler(async (req, res) => {
    const { branchId, month, employeeId, fromMonth, toMonth } = req.query;
    let sql = `
      SELECT es.*, e.full_name AS employee_name, e.designation, COALESCE(b.name, 'Main Branch') AS branch_name,
             u.full_name AS paid_by_name
      FROM employee_salaries es
      JOIN employees e ON e.id = es.employee_id
      LEFT JOIN branches b ON b.id = es.branch_id
      LEFT JOIN users u ON u.id = es.created_by
      WHERE es.business_id = :businessId
    `;
    const params = { businessId: req.user.business_id };

    if (!isBusinessAdmin(req.user) && req.user.branch_id) {
      sql += ` AND es.branch_id = :userBranchId`;
      params.userBranchId = req.user.branch_id;
    }

    if (branchId) {
      sql += ` AND es.branch_id = :branchId`;
      params.branchId = branchId;
    }
    if (month && month !== "all") {
      sql += ` AND es.salary_month = :month`;
      params.month = month;
    }
    if (fromMonth) {
      sql += ` AND es.salary_month >= :fromMonth`;
      params.fromMonth = fromMonth;
    }
    if (toMonth) {
      sql += ` AND es.salary_month <= :toMonth`;
      params.toMonth = toMonth;
    }
    if (employeeId && employeeId !== "all") {
      sql += ` AND es.employee_id = :employeeId`;
      params.employeeId = employeeId;
    }

    sql += ` ORDER BY es.salary_month DESC, es.payment_date DESC`;
    const rows = await query(sql, params);
    res.json(rows);
  })
);

// Comprehensive Payroll & Advances Ledger / Statement Reports
employeesRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const { branchId, employeeId, month, fromMonth, toMonth } = req.query;

    const baseParams = { businessId: req.user.business_id };
    let branchClauseSalaries = "";
    let branchClauseAdvances = "";
    let empClauseSalaries = "";
    let empClauseAdvances = "";
    let monthClauseSalaries = "";

    if (!isBusinessAdmin(req.user) && req.user.branch_id) {
      branchClauseSalaries += ` AND es.branch_id = :userBranchId`;
      branchClauseAdvances += ` AND ea.branch_id = :userBranchId`;
      baseParams.userBranchId = req.user.branch_id;
    }

    if (branchId) {
      await assertBranchAccess(req.user, branchId);
      branchClauseSalaries += ` AND es.branch_id = :branchId`;
      branchClauseAdvances += ` AND ea.branch_id = :branchId`;
      baseParams.branchId = branchId;
    }

    if (employeeId && employeeId !== "all") {
      empClauseSalaries += ` AND es.employee_id = :employeeId`;
      empClauseAdvances += ` AND ea.employee_id = :employeeId`;
      baseParams.employeeId = employeeId;
    }

    if (month && month !== "all") {
      monthClauseSalaries += ` AND es.salary_month = :month`;
      baseParams.month = month;
    }
    if (fromMonth) {
      monthClauseSalaries += ` AND es.salary_month >= :fromMonth`;
      baseParams.fromMonth = fromMonth;
    }
    if (toMonth) {
      monthClauseSalaries += ` AND es.salary_month <= :toMonth`;
      baseParams.toMonth = toMonth;
    }

    // 1. Fetch salaries
    const salariesSql = `
      SELECT es.*, e.full_name AS employee_name, e.designation,
             COALESCE(b.name, 'Main Branch') AS branch_name,
             u.full_name AS paid_by_name
      FROM employee_salaries es
      JOIN employees e ON e.id = es.employee_id
      LEFT JOIN branches b ON b.id = es.branch_id
      LEFT JOIN users u ON u.id = es.created_by
      WHERE es.business_id = :businessId
        ${branchClauseSalaries}
        ${empClauseSalaries}
        ${monthClauseSalaries}
      ORDER BY es.salary_month DESC, es.payment_date DESC
    `;
    const salaries = await query(salariesSql, baseParams);

    // 2. Fetch advances
    const advancesSql = `
      SELECT ea.*, e.full_name AS employee_name, e.designation,
             COALESCE(b.name, 'Main Branch') AS branch_name,
             u.full_name AS created_by_name
      FROM employee_advances ea
      JOIN employees e ON e.id = ea.employee_id
      LEFT JOIN branches b ON b.id = ea.branch_id
      LEFT JOIN users u ON u.id = ea.created_by
      WHERE ea.business_id = :businessId
        ${branchClauseAdvances}
        ${empClauseAdvances}
      ORDER BY ea.advance_date DESC, ea.id DESC
    `;
    const advances = await query(advancesSql, baseParams);

    // 3. Compute overall summary metrics
    const totalNetSalaries = salaries.reduce((sum, s) => sum + Number(s.net_salary || 0), 0);
    const totalBaseSalaries = salaries.reduce((sum, s) => sum + Number(s.base_salary || 0), 0);
    const totalBonuses = salaries.reduce((sum, s) => sum + Number(s.bonus || 0), 0);
    const totalAdvanceDeductions = salaries.reduce((sum, s) => sum + Number(s.advance_deduction || 0), 0);
    const totalOtherDeductions = salaries.reduce((sum, s) => sum + Number(s.deductions || 0), 0);

    const totalAdvancesIssued = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const totalAdvancesRecovered = advances
      .filter((a) => a.status === "deducted")
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const totalAdvancesPending = advances
      .filter((a) => a.status === "pending")
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    // 4. Per-Employee aggregation breakdown
    let empListSql = `
      SELECT e.id, e.full_name, e.designation, e.monthly_salary, e.branch_id,
             COALESCE(b.name, 'Main Branch') AS branch_name
      FROM employees e
      LEFT JOIN branches b ON b.id = e.branch_id
      WHERE e.business_id = :businessId
    `;
    const empListParams = { businessId: req.user.business_id };
    if (!isBusinessAdmin(req.user) && req.user.branch_id) {
      empListSql += ` AND e.branch_id = :userBranchId`;
      empListParams.userBranchId = req.user.branch_id;
    }
    if (branchId) {
      empListSql += ` AND e.branch_id = :branchId`;
      empListParams.branchId = branchId;
    }
    if (employeeId && employeeId !== "all") {
      empListSql += ` AND e.id = :employeeId`;
      empListParams.employeeId = employeeId;
    }
    empListSql += ` ORDER BY e.full_name ASC`;
    const employeesScope = await query(empListSql, empListParams);

    const employeeBreakdown = employeesScope.map((emp) => {
      const empSalaries = salaries.filter((s) => Number(s.employee_id) === Number(emp.id));
      const empAdvances = advances.filter((a) => Number(a.employee_id) === Number(emp.id));

      const totalPaid = empSalaries.reduce((sum, s) => sum + Number(s.net_salary || 0), 0);
      const paidMonths = [...new Set(empSalaries.map((s) => s.salary_month))].sort();
      const advancesTaken = empAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const advancesRecovered = empAdvances
        .filter((a) => a.status === "deducted")
        .reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const advancesPending = empAdvances
        .filter((a) => a.status === "pending")
        .reduce((sum, a) => sum + Number(a.amount || 0), 0);

      const lastSalary = empSalaries[0] || null;

      return {
        id: emp.id,
        fullName: emp.full_name,
        designation: emp.designation,
        branchName: emp.branch_name,
        monthlySalary: Number(emp.monthly_salary || 0),
        salariesCount: empSalaries.length,
        totalNetPaid: totalPaid,
        salaryMonthsPaid: paidMonths,
        lastSalaryMonth: lastSalary ? lastSalary.salary_month : null,
        lastPaymentDate: lastSalary ? lastSalary.payment_date : null,
        advancesTaken,
        advancesRecovered,
        advancesPending
      };
    });

    res.json({
      salaries,
      advances,
      summary: {
        totalNetSalaries,
        totalBaseSalaries,
        totalBonuses,
        totalAdvanceDeductions,
        totalOtherDeductions,
        totalAdvancesIssued,
        totalAdvancesRecovered,
        totalAdvancesPending,
        salariesCount: salaries.length,
        advancesCount: advances.length
      },
      employeeBreakdown
    });
  })
);

// Batch Salary Preview Endpoint for All Employees for a Month
employeesRouter.get(
  "/batch-salary-preview",
  asyncHandler(async (req, res) => {
    const { month = new Date().toISOString().slice(0, 7), branchId } = req.query;

    let branchClause = "";
    const params = { businessId: req.user.business_id };

    if (!isBusinessAdmin(req.user) && req.user.branch_id) {
      branchClause += " AND e.branch_id = :userBranchId";
      params.userBranchId = req.user.branch_id;
    }
    if (branchId) {
      branchClause += " AND e.branch_id = :branchId";
      params.branchId = branchId;
    }

    // 1. Fetch all active employees in scope
    const employees = await query(
      `SELECT e.id, e.full_name, e.designation, e.monthly_salary, e.branch_id,
              COALESCE(b.name, 'Main Branch') AS branch_name
       FROM employees e
       LEFT JOIN branches b ON b.id = e.branch_id
       WHERE e.business_id = :businessId ${branchClause}
       ORDER BY e.full_name ASC`,
      params
    );

    // 2. Fetch existing salaries for this month to check isAlreadyPaid
    const salaries = await query(
      `SELECT es.*, u.full_name AS paid_by_name
       FROM employee_salaries es
       LEFT JOIN users u ON u.id = es.created_by
       WHERE es.business_id = :businessId AND es.salary_month = :month`,
      { businessId: req.user.business_id, month }
    );

    // 3. Fetch pending advances per employee
    const advances = await query(
      `SELECT employee_id, COALESCE(SUM(amount), 0) AS total_pending
       FROM employee_advances
       WHERE business_id = :businessId AND status = 'pending'
       GROUP BY employee_id`,
      { businessId: req.user.business_id }
    );
    const advanceMap = new Map();
    for (const a of advances) {
      advanceMap.set(Number(a.employee_id), Number(a.total_pending || 0));
    }

    // 4. Fetch monthly attendance for deductions
    const attendances = await query(
      `SELECT employee_id, total_working_days, absent_days
       FROM employee_monthly_attendance
       WHERE business_id = :businessId AND month = :month`,
      { businessId: req.user.business_id, month }
    );
    const attendanceMap = new Map();
    for (const att of attendances) {
      attendanceMap.set(Number(att.employee_id), att);
    }

    const rows = employees.map((emp) => {
      const existing = salaries.find((s) => Number(s.employee_id) === Number(emp.id));
      const pendingAdvance = advanceMap.get(Number(emp.id)) || 0;
      const att = attendanceMap.get(Number(emp.id));

      let absentDeduction = 0;
      if (att) {
        const totalDays = Number(att.total_working_days || 30);
        const absentDays = Number(att.absent_days || 0);
        const perDay = totalDays > 0 ? Number(emp.monthly_salary || 0) / totalDays : 0;
        absentDeduction = Math.round(absentDays * perDay);
      }

      const baseSalary = Number(emp.monthly_salary || 0);
      const bonus = 0;
      const advance = pendingAdvance;
      const deductions = absentDeduction;
      const computedSalary = Math.max(0, baseSalary + bonus - advance);
      const netSalary = Math.max(0, computedSalary - deductions);

      return {
        employeeId: emp.id,
        employeeName: emp.full_name,
        designation: emp.designation,
        branchId: emp.branch_id,
        branchName: emp.branch_name,
        salaryMonth: month,
        baseSalary,
        hasBaseSalary: baseSalary > 0,
        bonus,
        advance,
        pendingAdvance,
        deductions,
        absentDeduction,
        computedSalary,
        netSalary,
        isAlreadyPaid: Boolean(existing),
        existingSalary: existing || null
      };
    });

    res.json({
      month,
      count: rows.length,
      employees: rows
    });
  })
);

// Prefilled Salary Preview Endpoint for Employee & Month
employeesRouter.get(
  "/:id/salary-preview",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { month = new Date().toISOString().slice(0, 7) } = req.query;

    const [employee] = await query(
      `SELECT e.*, COALESCE(b.name, 'Main Branch') AS branch_name
       FROM employees e
       LEFT JOIN branches b ON b.id = e.branch_id
       WHERE e.id = :id AND e.business_id = :businessId`,
      { id, businessId: req.user.business_id }
    );

    if (!employee) {
      throw badRequest("Employee not found or unauthorized");
    }

    // 1. Check existing payment for this month
    const [existingSalary] = await query(
      `SELECT es.*, u.full_name AS paid_by_name
       FROM employee_salaries es
       LEFT JOIN users u ON u.id = es.created_by
       WHERE es.employee_id = :id AND es.salary_month = :month AND es.business_id = :businessId
       LIMIT 1`,
      { id, month, businessId: req.user.business_id }
    );

    // 2. Fetch pending advances
    const [advRow] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_pending
       FROM employee_advances
       WHERE employee_id = :id AND status = 'pending' AND business_id = :businessId`,
      { id, businessId: req.user.business_id }
    );
    const pendingAdvance = Number(advRow?.total_pending || 0);

    // 3. Fetch monthly attendance if recorded
    const [attRow] = await query(
      `SELECT * FROM employee_monthly_attendance
       WHERE employee_id = :id AND month = :month AND business_id = :businessId
       LIMIT 1`,
      { id, month, businessId: req.user.business_id }
    );

    let absentDeduction = 0;
    if (attRow) {
      const totalDays = Number(attRow.total_working_days || 30);
      const absentDays = Number(attRow.absent_days || 0);
      const perDay = totalDays > 0 ? Number(employee.monthly_salary || 0) / totalDays : 0;
      absentDeduction = Math.round(absentDays * perDay);
    }

    const baseSalary = Number(employee.monthly_salary || 0);
    const bonus = 0;
    const advance = pendingAdvance;
    const deductions = absentDeduction;
    const computedSalary = Math.max(0, baseSalary + bonus - advance);
    const netSalary = Math.max(0, computedSalary - deductions);

    res.json({
      employeeId: employee.id,
      employeeName: employee.full_name,
      designation: employee.designation,
      branchId: employee.branch_id,
      branchName: employee.branch_name,
      salaryMonth: month,
      baseSalary,
      hasBaseSalary: baseSalary > 0,
      bonus,
      advance,
      pendingAdvance,
      deductions,
      absentDeduction,
      computedSalary,
      netSalary,
      isAlreadyPaid: Boolean(existingSalary),
      existingSalary: existingSalary || null
    });
  })
);

employeesRouter.post(
  "/salaries/pay",
  requirePermission("employees", "create"),
  asyncHandler(async (req, res) => {
    let {
      branchId,
      employeeId,
      salaryMonth,
      baseSalary,
      bonus = 0,
      advanceDeduction = 0,
      computedSalary,
      deductions = 0,
      netSalary,
      overriddenFields = [],
      paymentMethod = "cash",
      paymentDate = new Date().toISOString().slice(0, 10),
      notes = "",
      recordAsExpense = true
    } = req.body;

    if (!employeeId || !salaryMonth) {
      throw badRequest("employeeId and salaryMonth are required");
    }

    const [employee] = await query(
      `SELECT e.*
       FROM employees e
       WHERE e.id = :id AND e.business_id = :businessId`,
      { id: employeeId, businessId: req.user.business_id }
    );

    if (!employee) {
      throw badRequest("Employee not found or unauthorized");
    }

    // EDGE CASE: Employee with no base salary set → block save with clear error message
    const effectiveBaseSalary = baseSalary !== undefined && baseSalary !== null ? Number(baseSalary) : Number(employee.monthly_salary || 0);
    if (!effectiveBaseSalary || effectiveBaseSalary <= 0) {
      throw badRequest(
        `Cannot process salary: Employee "${employee.full_name}" has no base monthly salary configured. Please configure their monthly salary in the staff directory before processing payroll.`
      );
    }

    // Validation: All amounts must be >= 0
    const numBaseSalary = Number(effectiveBaseSalary);
    const numBonus = Number(bonus || 0);
    const numAdvanceDeduction = Number(advanceDeduction || 0);
    const numDeductions = Number(deductions || 0);

    if (numBaseSalary < 0 || numBonus < 0 || numAdvanceDeduction < 0 || numDeductions < 0) {
      throw badRequest("All salary components (Base Salary, Bonus, Advance, Deductions) must be greater than or equal to 0.");
    }

    // Auto-computed fallback values if admin did not supply them
    const autoComputed = Math.max(0, numBaseSalary + numBonus - numAdvanceDeduction);
    const finalComputedSalary = (computedSalary !== undefined && computedSalary !== null && computedSalary !== "")
      ? Number(computedSalary)
      : autoComputed;

    if (finalComputedSalary < 0) {
      throw badRequest("Computed salary cannot be negative.");
    }

    const autoNet = Math.max(0, finalComputedSalary - numDeductions);
    const finalNetSalary = (netSalary !== undefined && netSalary !== null && netSalary !== "")
      ? Number(netSalary)
      : autoNet;

    if (finalNetSalary < 0) {
      throw badRequest("Net salary cannot be negative.");
    }

    // STRICT RESTRICTION: Check if salary for this month was already paid to this employee
    const [existingSalary] = await query(
      `SELECT es.id, es.salary_month, es.net_salary, es.payment_date, es.payment_method
       FROM employee_salaries es
       WHERE es.business_id = :businessId
         AND es.employee_id = :employeeId
         AND es.salary_month = :salaryMonth
       LIMIT 1`,
      { businessId: req.user.business_id, employeeId, salaryMonth }
    );

    if (existingSalary) {
      throw badRequest(
        `Salary for month ${salaryMonth} has already been disbursed to ${employee.full_name} on ${existingSalary.payment_date} (Net: Rs. ${Number(existingSalary.net_salary).toLocaleString()}, Method: ${existingSalary.payment_method}). Duplicate payment for an already given month is strictly prohibited.`
      );
    }

    let targetBranchId = branchId ? Number(branchId) : (employee.branch_id || req.user.branch_id);
    if (!targetBranchId) {
      const [firstBranch] = await query(
        `SELECT id FROM branches WHERE business_id = :businessId AND status = 'active' ORDER BY id ASC LIMIT 1`,
        { businessId: req.user.business_id }
      );
      if (firstBranch) targetBranchId = Number(firstBranch.id);
    }

    if (!targetBranchId) {
      throw badRequest("Valid branch is required to disburse salary");
    }

    await assertBranchAccess(req.user, targetBranchId);

    const serializedOverrides = JSON.stringify(
      Array.isArray(overriddenFields) ? overriddenFields : []
    );

    await withTransaction(async (conn) => {
      // 1. Insert salary record (strict insert - no duplicate overwrite)
      try {
        await conn.execute(
          `INSERT INTO employee_salaries (
             business_id, branch_id, employee_id, salary_month,
             base_salary, bonus, advance_deduction, computed_salary, deductions, net_salary,
             payment_method, payment_date, status, notes, overridden_fields,
             created_by, updated_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)`,
          [
            req.user.business_id,
            targetBranchId,
            employeeId,
            salaryMonth,
            numBaseSalary,
            numBonus,
            numAdvanceDeduction,
            finalComputedSalary,
            numDeductions,
            finalNetSalary,
            paymentMethod,
            paymentDate,
            notes || null,
            serializedOverrides,
            req.user.id,
            req.user.id
          ]
        );
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
          throw badRequest(
            `Salary for month ${salaryMonth} has already been recorded for ${employee.full_name}. Duplicate disbursement is prohibited.`
          );
        }
        throw err;
      }

      // 2. Mark pending advances up to advanceDeduction as deducted
      if (Number(numAdvanceDeduction) > 0) {
        await conn.execute(
          `UPDATE employee_advances
           SET status = 'deducted', deducted_in_month = ?
           WHERE employee_id = ? AND status = 'pending'`,
          [salaryMonth, employeeId]
        );
      }

      // 3. Optionally record as branch operational expense
      if (recordAsExpense && finalNetSalary > 0) {
        await conn.execute(
          `INSERT INTO expenses (
             branch_id, category, title, amount,
             expense_date, notes, created_by
           ) VALUES (?, 'salary', ?, ?, ?, ?, ?)`,
          [
            targetBranchId,
            `Salary - ${employee.full_name} (${salaryMonth})`,
            finalNetSalary,
            paymentDate,
            `Salary for ${employee.full_name} (${salaryMonth}) via ${paymentMethod} [Net: ${finalNetSalary}, Computed: ${finalComputedSalary}, Bonus: ${numBonus}, Advance Deducted: ${numAdvanceDeduction}]`,
            req.user.id
          ]
        );
      }
    });

    res.status(201).json({
      message: `Salary of Rs. ${finalNetSalary.toLocaleString()} paid successfully to ${employee.full_name}`,
      netSalary: finalNetSalary,
      computedSalary: finalComputedSalary,
      overriddenFields: Array.isArray(overriddenFields) ? overriddenFields : []
    });
  })
);

// Batch Pay Salaries for Multiple Employees in One Single Transaction (All-or-Nothing)
employeesRouter.post(
  "/salaries/batch-pay",
  requirePermission("employees", "create"),
  asyncHandler(async (req, res) => {
    const {
      salaryMonth,
      branchId,
      paymentMethod = "cash",
      paymentDate = new Date().toISOString().slice(0, 10),
      notes = "",
      recordAsExpense = true,
      disbursements = []
    } = req.body;

    if (!salaryMonth) {
      throw badRequest("salaryMonth is required");
    }
    if (!Array.isArray(disbursements) || disbursements.length === 0) {
      throw badRequest("At least one employee disbursement record is required.");
    }

    // 1. Fetch all employees in scope to validate
    const empIds = disbursements.map((d) => Number(d.employeeId)).filter(Boolean);
    if (empIds.length === 0) {
      throw badRequest("Invalid employee IDs provided in batch.");
    }

    const placeholders = empIds.map(() => "?").join(",");
    const employees = await query(
      `SELECT e.*
       FROM employees e
       WHERE e.business_id = ? AND e.id IN (${placeholders})`,
      [req.user.business_id, ...empIds]
    );
    const empMap = new Map();
    for (const e of employees) {
      empMap.set(Number(e.id), e);
    }

    // 2. Fetch existing salaries for this month to check duplicates
    const existingSalaries = await query(
      `SELECT employee_id, payment_date, net_salary, payment_method
       FROM employee_salaries
       WHERE business_id = ? AND salary_month = ?
         AND employee_id IN (${placeholders})`,
      [req.user.business_id, salaryMonth, ...empIds]
    );
    const existingMap = new Map();
    for (const es of existingSalaries) {
      existingMap.set(Number(es.employee_id), es);
    }

    // 3. Strict Pre-Validation (ALL-OR-NOTHING):
    const validationErrors = [];

    for (let i = 0; i < disbursements.length; i++) {
      const d = disbursements[i];
      const emp = empMap.get(Number(d.employeeId));

      if (!emp) {
        validationErrors.push(`Row #${i + 1}: Employee ID ${d.employeeId} not found or unauthorized.`);
        continue;
      }

      // Check base salary > 0
      const effectiveBase = Number(d.baseSalary !== undefined && d.baseSalary !== null ? d.baseSalary : emp.monthly_salary || 0);
      if (!effectiveBase || effectiveBase <= 0) {
        validationErrors.push(`Row #${i + 1} (${emp.full_name}): Has no base monthly salary configured. Base salary must be set before processing payroll.`);
      }

      // Check negative amounts
      const numBonus = Number(d.bonus || 0);
      const numAdv = Number(d.advanceDeduction || 0);
      const numDed = Number(d.deductions || 0);
      const numComp = Number(d.computedSalary !== undefined ? d.computedSalary : (effectiveBase + numBonus - numAdv));
      const numNet = Number(d.netSalary !== undefined ? d.netSalary : (numComp - numDed));

      if (effectiveBase < 0 || numBonus < 0 || numAdv < 0 || numDed < 0 || numComp < 0 || numNet < 0) {
        validationErrors.push(`Row #${i + 1} (${emp.full_name}): All amounts must be greater than or equal to 0.`);
      }

      // Check duplicate payment for this month
      const existing = existingMap.get(Number(d.employeeId));
      if (existing) {
        validationErrors.push(
          `Row #${i + 1} (${emp.full_name}): Salary for ${salaryMonth} was already disbursed on ${existing.payment_date} (Net: Rs. ${Number(existing.net_salary).toLocaleString()}). Duplicate payment is prohibited.`
        );
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: `Batch validation failed: ${validationErrors.length} issue(s) found across ${disbursements.length} rows. Entire batch save cancelled — please fix the highlighted rows.`,
        errors: validationErrors
      });
    }

    // 4. All validations passed! Execute batch save in a single transaction
    let totalNetDisbursed = 0;

    await withTransaction(async (conn) => {
      for (const d of disbursements) {
        const emp = empMap.get(Number(d.employeeId));
        const effectiveBase = Number(d.baseSalary !== undefined && d.baseSalary !== null ? d.baseSalary : emp.monthly_salary || 0);
        const numBonus = Number(d.bonus || 0);
        const numAdv = Number(d.advanceDeduction || 0);
        const numDed = Number(d.deductions || 0);
        const finalComputed = Number(d.computedSalary !== undefined ? d.computedSalary : Math.max(0, effectiveBase + numBonus - numAdv));
        const finalNet = Number(d.netSalary !== undefined ? d.netSalary : Math.max(0, finalComputed - numDed));

        totalNetDisbursed += finalNet;

        const rowBranchId = Number(d.branchId || branchId || emp.branch_id || req.user.branch_id);
        const serializedOverrides = JSON.stringify(Array.isArray(d.overriddenFields) ? d.overriddenFields : []);
        const rowNotes = d.notes ? `${notes ? `${notes} — ` : ""}${d.notes}` : notes || null;

        // Insert salary
        await conn.execute(
          `INSERT INTO employee_salaries (
             business_id, branch_id, employee_id, salary_month,
             base_salary, bonus, advance_deduction, computed_salary, deductions, net_salary,
             payment_method, payment_date, status, notes, overridden_fields,
             created_by, updated_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)`,
          [
            req.user.business_id,
            rowBranchId,
            emp.id,
            salaryMonth,
            effectiveBase,
            numBonus,
            numAdv,
            finalComputed,
            numDed,
            finalNet,
            paymentMethod,
            paymentDate,
            rowNotes,
            serializedOverrides,
            req.user.id,
            req.user.id
          ]
        );

        // Update advances
        if (numAdv > 0) {
          await conn.execute(
            `UPDATE employee_advances
             SET status = 'deducted', deducted_in_month = ?
             WHERE employee_id = ? AND status = 'pending'`,
            [salaryMonth, emp.id]
          );
        }

        // Operational expense
        if (recordAsExpense && finalNet > 0) {
          await conn.execute(
            `INSERT INTO expenses (
               branch_id, category, title, amount,
               expense_date, notes, created_by
             ) VALUES (?, 'salary', ?, ?, ?, ?, ?)`,
            [
              rowBranchId,
              `Salary - ${emp.full_name} (${salaryMonth})`,
              finalNet,
              paymentDate,
              `Batch monthly salary for ${emp.full_name} (${salaryMonth}) via ${paymentMethod} [Net: ${finalNet}]`,
              req.user.id
            ]
          );
        }
      }
    });

    res.status(201).json({
      message: `Successfully processed monthly salary for ${disbursements.length} employees (Total Net: Rs. ${totalNetDisbursed.toLocaleString()}).`,
      count: disbursements.length,
      totalNet: totalNetDisbursed
    });
  })
);

// ==========================================
// 4. MONTHLY ATTENDANCE
// ==========================================

employeesRouter.get(
  "/attendance/monthly",
  asyncHandler(async (req, res) => {
    const { branchId, month = new Date().toISOString().slice(0, 7) } = req.query;

    let targetBranchId = branchId;
    if (!targetBranchId && !isBusinessAdmin(req.user) && req.user.branch_id) {
      targetBranchId = req.user.branch_id;
    }

    if (targetBranchId) {
      await assertBranchAccess(req.user, targetBranchId);
    }

    let branchCondition = "";
    const params = { businessId: req.user.business_id, month };
    if (targetBranchId) {
      branchCondition = "AND e.branch_id = :targetBranchId";
      params.targetBranchId = targetBranchId;
    }

    const rows = await query(
      `SELECT 
         e.id AS employee_id,
         e.full_name AS employee_name,
         e.designation,
         e.monthly_salary,
         e.branch_id,
         COALESCE(b.name, 'Main Branch') AS branch_name,
         COALESCE(ema.total_working_days, 30) AS total_working_days,
         COALESCE(ema.present_days, 30) AS present_days,
         COALESCE(ema.absent_days, 0) AS absent_days,
         COALESCE(ema.leave_days, 0) AS leave_days,
         COALESCE(ema.half_days, 0) AS half_days,
         ema.notes,
         ema.updated_at,
         es.id AS salary_id,
         es.net_salary AS salary_net_paid,
         es.payment_date AS salary_payment_date,
         es.payment_method AS salary_payment_method,
         CASE WHEN es.id IS NOT NULL THEN 1 ELSE 0 END AS is_salary_paid,
         (
           SELECT COALESCE(SUM(ea_sub.amount), 0)
           FROM employee_advances ea_sub
           WHERE ea_sub.employee_id = e.id AND ea_sub.status = 'pending'
         ) AS pending_advance_amount
       FROM employees e
       LEFT JOIN branches b ON b.id = e.branch_id
       LEFT JOIN employee_monthly_attendance ema 
         ON ema.employee_id = e.id AND ema.month = :month
       LEFT JOIN employee_salaries es
         ON es.employee_id = e.id AND es.salary_month = :month AND es.business_id = :businessId
       WHERE e.business_id = :businessId
         AND e.status = 'active'
         ${branchCondition}
       ORDER BY b.name ASC, e.full_name ASC`,
      params
    );

    res.json(rows);
  })
);

employeesRouter.post(
  "/attendance/monthly",
  requirePermission("employees", "create"),
  asyncHandler(async (req, res) => {
    let { branchId, month, records = [] } = req.body;

    let targetBranchId = branchId ? Number(branchId) : (req.user.branch_id ? Number(req.user.branch_id) : null);
    if (!targetBranchId) {
      const [firstBranch] = await query(
        `SELECT id FROM branches WHERE business_id = :businessId AND status = 'active' ORDER BY id ASC LIMIT 1`,
        { businessId: req.user.business_id }
      );
      if (firstBranch) targetBranchId = Number(firstBranch.id);
    }

    if (!targetBranchId || !month || !Array.isArray(records) || records.length === 0) {
      throw badRequest("branchId, month, and records array are required");
    }

    await assertBranchAccess(req.user, targetBranchId);

    await withTransaction(async (conn) => {
      for (const rec of records) {
        if (!rec.employeeId) continue;
        await conn.execute(
          `INSERT INTO employee_monthly_attendance (
             business_id, branch_id, employee_id, month,
             total_working_days, present_days, absent_days, leave_days, half_days, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             total_working_days = VALUES(total_working_days),
             present_days = VALUES(present_days),
             absent_days = VALUES(absent_days),
             leave_days = VALUES(leave_days),
             half_days = VALUES(half_days),
             notes = VALUES(notes)`,
          [
            req.user.business_id,
            targetBranchId,
            rec.employeeId,
            month,
            Number(rec.totalWorkingDays ?? 30),
            Number(rec.presentDays ?? 30),
            Number(rec.absentDays ?? 0),
            Number(rec.leaveDays ?? 0),
            Number(rec.halfDays ?? 0),
            rec.notes || null
          ]
        );
      }
    });

    res.json({ message: `Monthly attendance for ${month} saved successfully` });
  })
);

// ==========================================
// 5. EMPLOYEE ADVANCES & LOANS
// ==========================================

employeesRouter.get(
  "/advances",
  asyncHandler(async (req, res) => {
    const { branchId, employeeId, status } = req.query;

    let sql = `
      SELECT ea.*, e.full_name AS employee_name, e.designation, e.monthly_salary,
             COALESCE(b.name, 'Main Branch') AS branch_name, u.full_name AS created_by_name
      FROM employee_advances ea
      JOIN employees e ON e.id = ea.employee_id
      LEFT JOIN branches b ON b.id = ea.branch_id
      LEFT JOIN users u ON u.id = ea.created_by
      WHERE ea.business_id = :businessId
    `;
    const params = { businessId: req.user.business_id };

    if (!isBusinessAdmin(req.user) && req.user.branch_id) {
      sql += ` AND ea.branch_id = :userBranchId`;
      params.userBranchId = req.user.branch_id;
    }

    if (branchId) {
      await assertBranchAccess(req.user, branchId);
      sql += " AND ea.branch_id = :branchId";
      params.branchId = branchId;
    }
    if (employeeId) {
      sql += " AND ea.employee_id = :employeeId";
      params.employeeId = employeeId;
    }
    if (status && status !== "all") {
      sql += " AND ea.status = :status";
      params.status = status;
    }

    sql += " ORDER BY ea.advance_date DESC, ea.id DESC";
    const rows = await query(sql, params);
    res.json(rows);
  })
);

employeesRouter.post(
  "/advances",
  requirePermission("employees", "create"),
  asyncHandler(async (req, res) => {
    let {
      branchId,
      employeeId,
      amount,
      advanceDate = new Date().toISOString().slice(0, 10),
      notes = ""
    } = req.body;

    if (!employeeId || !amount || Number(amount) <= 0) {
      throw badRequest("employeeId and a valid amount are required");
    }

    const [employee] = await query(
      "SELECT id, full_name, branch_id FROM employees WHERE id = ? AND business_id = ?",
      [employeeId, req.user.business_id]
    );
    if (!employee) {
      throw badRequest("Employee not found");
    }

    let targetBranchId = branchId ? Number(branchId) : (employee.branch_id || req.user.branch_id);
    if (!targetBranchId) {
      const [firstBranch] = await query(
        `SELECT id FROM branches WHERE business_id = :businessId AND status = 'active' ORDER BY id ASC LIMIT 1`,
        { businessId: req.user.business_id }
      );
      if (firstBranch) targetBranchId = Number(firstBranch.id);
    }

    if (!targetBranchId) {
      throw badRequest("A valid branch is required to grant advance");
    }

    await assertBranchAccess(req.user, targetBranchId);

    const result = await query(
      `INSERT INTO employee_advances (
         business_id, branch_id, employee_id, amount,
         advance_date, status, notes, created_by
       ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        req.user.business_id,
        targetBranchId,
        employeeId,
        Number(amount),
        advanceDate,
        notes || null,
        req.user.id
      ]
    );

    res.status(201).json({
      id: result.insertId,
      message: `Advance of Rs. ${Number(amount).toLocaleString()} granted to ${employee.full_name}`
    });
  })
);
