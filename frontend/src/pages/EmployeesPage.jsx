import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { exportToCSV } from "../utils/export.js";
import { MonthlySalaryForm } from "../components/MonthlySalaryForm.jsx";
import { BatchMonthlySalaryForm } from "../components/BatchMonthlySalaryForm.jsx";

export function EmployeesPage({ context, activeSubPage, onNavigateSubPage }) {
  const subToTabMap = useMemo(() => ({
    attendance: "monthly_attendance",
    advances: "advances",
    payroll: "payroll",
    batch_salary: "batch_salary",
    batch: "batch_salary",
    staff: "staff",
    daily: "daily_attendance"
  }), []);

  const tabToSubMap = useMemo(() => ({
    monthly_attendance: "attendance",
    advances: "advances",
    payroll: "payroll",
    batch_salary: "batch_salary",
    staff: "staff",
    daily_attendance: "daily"
  }), []);

  // Tabs: "monthly_attendance" (default, at the start) | "advances" | "payroll" | "batch_salary" | "staff" | "daily_attendance"
  const [activeTab, setActiveTab] = useState(() => {
    if (activeSubPage && subToTabMap[activeSubPage]) {
      return subToTabMap[activeSubPage];
    }
    return "monthly_attendance";
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canCreate = context?.can ? context.can("employees", "create") : true;
  const canEdit = context?.can ? context.can("employees", "edit") : true;
  const canDelete = context?.can ? context.can("employees", "delete") : true;
  const canView = context?.can ? context.can("employees", "view") : true;

  const defaultBranchId =
    context?.session?.branch_id ||
    context?.session?.branchId ||
    context?.branches?.[0]?.id ||
    "";
  const shopName = context?.session?.business_name || "DigitalMarkaz360";

  // Keep activeTab in sync with activeSubPage from sidebar navigation
  useEffect(() => {
    if (activeSubPage && subToTabMap[activeSubPage]) {
      setActiveTab(subToTabMap[activeSubPage]);
    }
  }, [activeSubPage, subToTabMap]);

  function handleTabChange(tabKey) {
    setActiveTab(tabKey);
    if (onNavigateSubPage && tabToSubMap[tabKey]) {
      onNavigateSubPage(tabToSubMap[tabKey]);
    }
  }

  // Auto-sync branch defaults once branches are loaded
  useEffect(() => {
    if (context?.branches && context.branches.length > 0) {
      const firstBranchId = context.branches[0].id;
      setAddForm((prev) => (!prev.branchId ? { ...prev, branchId: firstBranchId } : prev));
      setAdvForm((prev) => (!prev.branchId ? { ...prev, branchId: firstBranchId } : prev));
      setMonthlyBranchId((prev) => (!prev ? firstBranchId : prev));
      setAdvanceBranchId((prev) => (!prev ? firstBranchId : prev));
      setPayrollBranchId((prev) => (!prev ? firstBranchId : prev));
    }
  }, [context?.branches]);

  // --- TAB 1: MONTHLY ATTENDANCE STATE (AT THE START) ---
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthlyBranchId, setMonthlyBranchId] = useState(defaultBranchId);
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [savingMonthly, setSavingMonthly] = useState(false);

  // --- TAB 2: ADVANCES & LOANS STATE ---
  const [advancesList, setAdvancesList] = useState([]);
  const [advanceBranchId, setAdvanceBranchId] = useState(defaultBranchId);
  const [advanceFilterStatus, setAdvanceFilterStatus] = useState("all");
  const [advanceFilterEmployeeId, setAdvanceFilterEmployeeId] = useState("all");
  const [advForm, setAdvForm] = useState({
    branchId: defaultBranchId,
    employeeId: "",
    amount: "",
    advanceDate: new Date().toISOString().slice(0, 10),
    notes: ""
  });
  const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false);

  // --- TAB 3: SALARY & PAYROLL STATE ---
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [payrollTimeFilter, setPayrollTimeFilter] = useState("month"); // "month" | "all"
  const [selectedStaffId, setSelectedStaffId] = useState("all"); // "all" | employeeId
  const [payrollViewMode, setPayrollViewMode] = useState("ledger"); // "ledger" | "salaries" | "advances" | "summary"
  const [payrollBranchId, setPayrollBranchId] = useState(defaultBranchId);
  const [salariesList, setSalariesList] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState({
    salaries: [],
    advances: [],
    summary: {
      totalNetSalaries: 0,
      totalBaseSalaries: 0,
      totalBonuses: 0,
      totalAdvanceDeductions: 0,
      totalOtherDeductions: 0,
      totalAdvancesIssued: 0,
      totalAdvancesRecovered: 0,
      totalAdvancesPending: 0,
      salariesCount: 0,
      advancesCount: 0
    },
    employeeBreakdown: []
  });
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedEmpForPay, setSelectedEmpForPay] = useState(null);
  const [selectedEmpPendingAdvance, setSelectedEmpPendingAdvance] = useState(0);
  const [viewingVoucher, setViewingVoucher] = useState(null);
  const [payForm, setPayForm] = useState({
    baseSalary: "",
    bonus: 0,
    advanceDeduction: 0,
    absentDeduction: 0,
    otherDeductions: 0,
    paymentMethod: "cash",
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: "",
    recordAsExpense: true
  });

  // --- TAB 4: STAFF DIRECTORY & ROSTER STATE ---
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [addForm, setAddForm] = useState({
    branchId: defaultBranchId,
    fullName: "",
    phone: "",
    cnic: "",
    designation: "Sales Associate",
    monthlySalary: "",
    joiningDate: new Date().toISOString().slice(0, 10)
  });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editEmployeeForm, setEditEmployeeForm] = useState({});

  // --- TAB 5: DAILY ATTENDANCE STATE ---
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyRecords, setDailyRecords] = useState({});
  const [savingDaily, setSavingDaily] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === "monthly_attendance") {
      loadMonthlyAttendance();
    } else if (activeTab === "advances") {
      loadAdvances();
    } else if (activeTab === "payroll") {
      loadSalaries();
    } else if (activeTab === "daily_attendance") {
      loadDailyAttendance();
    }
  }, [
    activeTab,
    monthlyMonth,
    monthlyBranchId,
    advanceBranchId,
    advanceFilterStatus,
    advanceFilterEmployeeId,
    salaryMonth,
    payrollTimeFilter,
    selectedStaffId,
    payrollBranchId,
    dailyDate
  ]);

  async function loadEmployees() {
    setLoading(true);
    setError("");
    try {
      const data = await api.employees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // TAB 1: MONTHLY ATTENDANCE METHODS
  // ==========================================
  async function loadMonthlyAttendance() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ month: monthlyMonth });
      if (monthlyBranchId) params.append("branchId", monthlyBranchId);
      const rows = await api.monthlyAttendance(`?${params.toString()}`);
      setMonthlyRows(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "Failed to load monthly attendance.");
    } finally {
      setLoading(false);
    }
  }

  function updateMonthlyRow(empId, field, val) {
    setMonthlyRows((prev) =>
      prev.map((row) => {
        if (row.employee_id !== empId) return row;
        const updated = { ...row, [field]: val };
        // Auto-rebalance absent days if present days change
        if (field === "present_days") {
          const total = Number(updated.total_working_days || 30);
          const present = Number(val || 0);
          updated.absent_days = Math.max(0, total - present - Number(updated.leave_days || 0));
        } else if (field === "total_working_days") {
          const total = Number(val || 30);
          const present = Number(updated.present_days || 0);
          updated.absent_days = Math.max(0, total - present - Number(updated.leave_days || 0));
        }
        return updated;
      })
    );
  }

  async function handleSaveMonthlyAttendance() {
    if (!canCreate && !canEdit) {
      setError("Permission denied: You do not have permission to record or update attendance.");
      return;
    }
    setSavingMonthly(true);
    setError("");
    setMessage("");
    try {
      const targetBranch = monthlyBranchId || defaultBranchId || context.branches?.[0]?.id;
      if (!targetBranch) {
        throw new Error("Please select a target branch for attendance");
      }
      const records = monthlyRows.map((r) => ({
        employeeId: r.employee_id,
        totalWorkingDays: Number(r.total_working_days ?? 30),
        presentDays: Number(r.present_days ?? 30),
        absentDays: Number(r.absent_days ?? 0),
        leaveDays: Number(r.leave_days ?? 0),
        halfDays: Number(r.half_days ?? 0),
        notes: r.notes || null
      }));

      await api.saveMonthlyAttendance({
        branchId: Number(targetBranch),
        month: monthlyMonth,
        records
      });
      setMessage(`Monthly attendance for ${monthlyMonth} saved successfully!`);
      loadMonthlyAttendance();
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to save monthly attendance.");
    } finally {
      setSavingMonthly(false);
    }
  }

  // ==========================================
  // TAB 2: ADVANCES & LOANS METHODS
  // ==========================================
  async function loadAdvances() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (advanceBranchId) params.append("branchId", advanceBranchId);
      if (advanceFilterStatus !== "all") params.append("status", advanceFilterStatus);
      if (advanceFilterEmployeeId !== "all") params.append("employeeId", advanceFilterEmployeeId);
      const data = await api.employeeAdvances(params.toString() ? `?${params.toString()}` : "");
      setAdvancesList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load employee advances.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAdvance(e) {
    e.preventDefault();
    if (!canCreate) {
      setError("Permission denied: You do not have permission to grant advances.");
      return;
    }
    if (!advForm.employeeId || !advForm.amount || Number(advForm.amount) <= 0) {
      setError("Please select an employee and enter a valid advance amount.");
      return;
    }
    setError("");
    setMessage("");
    setIsSubmittingAdvance(true);
    try {
      const targetBranch = advForm.branchId || defaultBranchId || context.branches?.[0]?.id;
      await api.createEmployeeAdvance({
        branchId: Number(targetBranch),
        employeeId: Number(advForm.employeeId),
        amount: Number(advForm.amount),
        advanceDate: advForm.advanceDate,
        notes: advForm.notes
      });
      setMessage(`Advance of Rs. ${Number(advForm.amount).toLocaleString()} granted successfully!`);
      setAdvForm({
        branchId: defaultBranchId,
        employeeId: "",
        amount: "",
        advanceDate: new Date().toISOString().slice(0, 10),
        notes: ""
      });
      loadAdvances();
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to grant advance.");
    } finally {
      setIsSubmittingAdvance(false);
    }
  }

  // ==========================================
  // TAB 3: SALARIES & PAYROLL METHODS
  // ==========================================
  async function loadSalaries() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (payrollTimeFilter === "month" && salaryMonth) {
        params.append("month", salaryMonth);
      }
      if (selectedStaffId && selectedStaffId !== "all") {
        params.append("employeeId", selectedStaffId);
      }
      if (payrollBranchId) {
        params.append("branchId", payrollBranchId);
      }

      const q = params.toString() ? `?${params.toString()}` : "";
      const [rows, history] = await Promise.all([
        api.salaries(q),
        api.payrollHistory(q)
      ]);

      setSalariesList(Array.isArray(rows) ? rows : []);
      if (history && history.summary) {
        setPayrollHistory(history);
      }
    } catch (err) {
      setError(err.message || "Failed to load payroll.");
    } finally {
      setLoading(false);
    }
  }

  function openPayModal(emp) {
    if (!canCreate) {
      setError("Permission denied: You do not have permission to disburse salary.");
      return;
    }
    setSelectedEmpForPay(emp || (employees.length > 0 ? employees[0] : null));
    setError("");
    setMessage("");
    setShowPayModal(true);
  }

  // ==========================================
  // TAB 4: STAFF DIRECTORY METHODS
  // ==========================================
  async function handleAddEmployee(e) {
    e.preventDefault();
    if (!canCreate) {
      setError("Permission denied: You do not have permission to register employees.");
      return;
    }
    setError("");
    setMessage("");
    setIsSavingEmployee(true);
    try {
      const targetBranchId = addForm.branchId || defaultBranchId || context.branches?.[0]?.id;
      if (!targetBranchId) {
        throw new Error("Please select a branch for the employee");
      }
      if (!addForm.fullName || !addForm.fullName.trim()) {
        throw new Error("Employee full name is required");
      }

      const res = await api.createEmployee({
        ...addForm,
        branchId: Number(targetBranchId),
        monthlySalary: Number(addForm.monthlySalary || 0)
      });
      setMessage(res.message || `Employee "${addForm.fullName}" registered successfully!`);
      setShowAddModal(false);
      setAddForm({
        branchId: targetBranchId,
        fullName: "",
        phone: "",
        cnic: "",
        designation: "Sales Staff",
        monthlySalary: "",
        joiningDate: new Date().toISOString().slice(0, 10)
      });
      await loadEmployees();
      if (activeTab === "monthly_attendance") {
        await loadMonthlyAttendance();
      }
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      setError(err.message || "Failed to register employee.");
    } finally {
      setIsSavingEmployee(false);
    }
  }

  async function handleEditEmployee(e) {
    e.preventDefault();
    if (!canEdit) {
      setError("Permission denied: You do not have permission to edit employee details.");
      return;
    }
    if (!editingEmployee) return;
    setError("");
    setMessage("");
    try {
      await api.updateEmployee(editingEmployee.id, {
        fullName: editEmployeeForm.fullName,
        designation: editEmployeeForm.designation,
        phone: editEmployeeForm.phone,
        cnic: editEmployeeForm.cnic,
        monthlySalary: Number(editEmployeeForm.monthlySalary || 0),
        branchId: Number(editEmployeeForm.branchId || editingEmployee.branch_id),
        status: editEmployeeForm.status
      });
      setMessage(`Employee "${editEmployeeForm.fullName}" updated successfully!`);
      setEditingEmployee(null);
      loadEmployees();
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to update employee.");
    }
  }

  // ==========================================
  // TAB 5: DAILY ATTENDANCE METHODS
  // ==========================================
  async function loadDailyAttendance() {
    try {
      const rows = await api.attendance(`?date=${dailyDate}`);
      const map = {};
      for (const r of rows) {
        map[r.employee_id] = {
          status: r.status,
          checkInTime: r.check_in_time || "",
          checkOutTime: r.check_out_time || "",
          notes: r.notes || ""
        };
      }
      setDailyRecords(map);
    } catch (err) {
      setError(err.message || "Failed to load daily attendance.");
    }
  }

  function markAllPresent() {
    const next = { ...dailyRecords };
    for (const emp of employees) {
      if (emp.status === "active") {
        next[emp.id] = { ...(next[emp.id] || {}), status: "present" };
      }
    }
    setDailyRecords(next);
  }

  function updateEmpDailyAttendance(empId, field, val) {
    setDailyRecords((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || { status: "present" }),
        [field]: val
      }
    }));
  }

  async function handleSaveDailyAttendance() {
    if (!canCreate && !canEdit) {
      setError("Permission denied: You do not have permission to record or update attendance.");
      return;
    }
    setSavingDaily(true);
    setError("");
    setMessage("");
    try {
      const targetBranch = defaultBranchId || context.branches?.[0]?.id;
      const records = employees
        .filter((emp) => emp.status === "active")
        .map((emp) => ({
          employeeId: emp.id,
          status: dailyRecords[emp.id]?.status || "present",
          checkInTime: dailyRecords[emp.id]?.checkInTime || null,
          checkOutTime: dailyRecords[emp.id]?.checkOutTime || null,
          notes: dailyRecords[emp.id]?.notes || null
        }));

      await api.saveAttendanceBatch({
        branchId: Number(targetBranch),
        attendanceDate: dailyDate,
        records
      });
      setMessage("Daily attendance saved successfully for " + dailyDate);
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to save daily attendance.");
    } finally {
      setSavingDaily(false);
    }
  }

  // Summaries
  const staffSummary = useMemo(() => {
    let totalPayroll = 0;
    let activeCount = 0;
    for (const e of employees) {
      if (e.status === "active") {
        activeCount++;
        totalPayroll += Number(e.monthly_salary || 0);
      }
    }
    return { total: employees.length, activeCount, totalPayroll };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        (e.phone && e.phone.includes(q)) ||
        (e.cnic && e.cnic.includes(q)) ||
        e.designation?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const advanceSummary = useMemo(() => {
    let pending = 0;
    let deducted = 0;
    for (const a of advancesList) {
      const amt = Number(a.amount || 0);
      if (a.status === "pending") pending += amt;
      else if (a.status === "deducted") deducted += amt;
    }
    return { pending, deducted, total: pending + deducted };
  }, [advancesList]);

  // Consolidated financial ledger (Salaries + Advances in chronological order)
  const consolidatedLedger = useMemo(() => {
    const list = [];
    (payrollHistory.salaries || []).forEach((s) => {
      list.push({
        id: `sal-${s.id}`,
        rawId: s.id,
        kind: "salary",
        date: s.payment_date,
        month: s.salary_month,
        employeeName: s.employee_name,
        employeeId: s.employee_id,
        designation: s.designation,
        branchName: s.branch_name,
        typeLabel: "💵 Salary Disbursed",
        grossAmount: Number(s.base_salary || 0) + Number(s.bonus || 0),
        deductionAmount: Number(s.advance_deduction || 0) + Number(s.deductions || 0),
        netAmount: Number(s.net_salary || 0),
        method: s.payment_method,
        notes: s.notes,
        paidBy: s.paid_by_name,
        record: s
      });
    });

    (payrollHistory.advances || []).forEach((a) => {
      list.push({
        id: `adv-${a.id}`,
        rawId: a.id,
        kind: "advance",
        date: a.advance_date,
        month: a.deducted_in_month || "Pending",
        employeeName: a.employee_name,
        employeeId: a.employee_id,
        designation: a.designation,
        branchName: a.branch_name,
        typeLabel: a.status === "deducted" ? "🔄 Advance Recovered" : "💳 Advance Issued",
        grossAmount: Number(a.amount || 0),
        deductionAmount: 0,
        netAmount: Number(a.amount || 0),
        status: a.status,
        method: "Cash / Advance",
        notes: a.notes,
        paidBy: a.created_by_name,
        record: a
      });
    });

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [payrollHistory]);

  const selectedEmpStatement = useMemo(() => {
    if (selectedStaffId === "all") return null;
    return (
      (payrollHistory.employeeBreakdown || []).find(
        (b) => Number(b.id) === Number(selectedStaffId)
      ) || null
    );
  }, [selectedStaffId, payrollHistory.employeeBreakdown]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.6rem", fontWeight: "800" }}>👥 Staff Payroll, Attendance & Advances</h2>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            Monthly attendance tracking, staff salary disbursement with advance recovery & bonuses, and employee advances.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
        </div>
      )}
      {message && (
        <div className="alert-banner alert-success" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: MONTHLY ATTENDANCE (AT THE START) */}
      {/* ======================================================== */}
      {activeTab === "monthly_attendance" && (
        <SectionCard
          title="Monthly Employee Attendance Roster"
          subtitle="Record monthly working days, presents, absents, and calculate attendance deductions before salary disbursal."
          action={
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                <span className="small muted">Month:</span>
                <input
                  type="month"
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(e.target.value)}
                  className="input-text"
                  style={{ width: "auto", padding: "6px 10px" }}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                <span className="small muted">Branch:</span>
                <select
                  value={monthlyBranchId}
                  onChange={(e) => setMonthlyBranchId(e.target.value)}
                  className="input-select"
                  style={{ width: "auto", padding: "6px 10px" }}
                >
                  <option value="">All Branches</option>
                  {(context.branches || []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>

              <button
                className="primary-btn"
                onClick={handleSaveMonthlyAttendance}
                disabled={savingMonthly || monthlyRows.length === 0 || (!canCreate && !canEdit)}
                title={(!canCreate && !canEdit) ? "Permission denied: Cannot save attendance" : ""}
              >
                {savingMonthly ? "Saving..." : "💾 Save Attendance"}
              </button>

              <button
                className="ghost-btn"
                onClick={() => exportToCSV(`Monthly_Attendance_${monthlyMonth}`, monthlyRows)}
                disabled={monthlyRows.length === 0}
              >
                📥 Export CSV
              </button>
            </div>
          }
        >
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Monthly Salary</th>
                  <th style={{ width: "90px" }}>Total Days</th>
                  <th style={{ width: "90px" }}>Present</th>
                  <th style={{ width: "90px" }}>Absent</th>
                  <th style={{ width: "80px" }}>Leave</th>
                  <th>Attendance %</th>
                  <th>Absent Deduction</th>
                  <th>Notes</th>
                  <th style={{ textAlign: "right" }}>Payroll Action</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                      No active staff found for month {monthlyMonth}. Add employees in the Staff Roster tab.
                    </td>
                  </tr>
                ) : (
                  monthlyRows.map((row) => {
                    const totalDays = Number(row.total_working_days || 30);
                    const presentDays = Number(row.present_days || 0);
                    const absentDays = Number(row.absent_days || 0);
                    const halfDays = Number(row.half_days || 0);
                    const pct = totalDays > 0 ? Math.min(100, Math.round(((presentDays + halfDays * 0.5) / totalDays) * 100)) : 100;
                    const perDayRate = totalDays > 0 ? Number(row.monthly_salary || 0) / totalDays : 0;
                    const absentDeduction = Math.round(absentDays * perDayRate);

                    return (
                      <tr key={row.employee_id}>
                        <td>
                          <div style={{ fontWeight: "700" }}>{row.employee_name}</div>
                          <small className="muted" style={{ fontSize: "0.76rem" }}>{row.designation}</small>
                        </td>
                        <td><span className="small">{row.branch_name}</span></td>
                        <td style={{ fontWeight: "700", color: "#10b981" }}>
                          Rs. {Number(row.monthly_salary || 0).toLocaleString()}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={row.total_working_days ?? 30}
                            onChange={(e) => updateMonthlyRow(row.employee_id, "total_working_days", e.target.value)}
                            className="input-text"
                            style={{ width: "70px", padding: "4px 8px", textAlign: "center" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={totalDays}
                            value={row.present_days ?? 30}
                            onChange={(e) => updateMonthlyRow(row.employee_id, "present_days", e.target.value)}
                            className="input-text"
                            style={{ width: "70px", padding: "4px 8px", textAlign: "center", fontWeight: "700", color: "#10b981" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={totalDays}
                            value={row.absent_days ?? 0}
                            onChange={(e) => updateMonthlyRow(row.employee_id, "absent_days", e.target.value)}
                            className="input-text"
                            style={{
                              width: "70px",
                              padding: "4px 8px",
                              textAlign: "center",
                              fontWeight: "700",
                              color: absentDays > 0 ? "#ef4444" : "inherit"
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={totalDays}
                            value={row.leave_days ?? 0}
                            onChange={(e) => updateMonthlyRow(row.employee_id, "leave_days", e.target.value)}
                            className="input-text"
                            style={{ width: "65px", padding: "4px 8px", textAlign: "center" }}
                          />
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              pct >= 90 ? "status-success" : pct >= 75 ? "status-warning" : "status-error"
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                        <td>
                          {absentDeduction > 0 ? (
                            <span style={{ fontWeight: "700", color: "#ef4444" }}>
                              -Rs. {absentDeduction.toLocaleString()}
                            </span>
                          ) : (
                            <span className="muted small">Rs. 0</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Remarks..."
                            value={row.notes || ""}
                            onChange={(e) => updateMonthlyRow(row.employee_id, "notes", e.target.value)}
                            className="input-text"
                            style={{ minWidth: "120px", padding: "4px 8px", fontSize: "0.85rem" }}
                          />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {row.is_salary_paid ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                              <span className="status-pill status-success" style={{ fontWeight: "700", whiteSpace: "nowrap" }}>
                                ✅ Paid Rs. {Number(row.salary_net_paid || 0).toLocaleString()}
                              </span>
                              <small className="muted" style={{ fontSize: "0.72rem" }}>
                                {row.salary_payment_date} ({String(row.salary_payment_method || "cash").toUpperCase()})
                              </small>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="secondary-btn btn-sm"
                              onClick={() => openPayModal(row, row)}
                              disabled={!canCreate}
                              title={!canCreate ? "Permission denied: Cannot disburse salary" : "Disburse salary with precalculated attendance deductions"}
                            >
                              💵 Pay Salary
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ADVANCES & LOANS */}
      {/* ======================================================== */}
      {activeTab === "advances" && (
        <div className="page-stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <StatCard label="Pending Advances (Unrecovered)" value={`Rs. ${advanceSummary.pending.toLocaleString()}`} />
            <StatCard label="Recovered via Payroll" value={`Rs. ${advanceSummary.deducted.toLocaleString()}`} />
            <StatCard label="Total Advances Issued" value={`Rs. ${advanceSummary.total.toLocaleString()}`} />
          </div>

          <div className="two-column" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {/* Advance Issue Form */}
            <SectionCard title="Issue Employee Advance / Loan" subtitle="Grant cash advance to employee. Automatically deducts during monthly salary disbursal.">
              <form onSubmit={handleCreateAdvance} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label>
                  <span>Branch *</span>
                  <select
                    value={advForm.branchId}
                    onChange={(e) => setAdvForm({ ...advForm, branchId: e.target.value })}
                    className="input-select"
                  >
                    {(context.branches || []).map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Select Employee *</span>
                  <select
                    value={advForm.employeeId}
                    onChange={(e) => setAdvForm({ ...advForm, employeeId: e.target.value })}
                    className="input-select"
                    required
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {employees
                      .filter((e) => e.status === "active")
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.full_name} ({e.designation}) — Salary: Rs. {Number(e.monthly_salary || 0).toLocaleString()}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  <span>Advance Amount (PKR) *</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5000"
                    value={advForm.amount}
                    onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })}
                    className="input-text"
                    required
                  />
                </label>

                <label>
                  <span>Advance Date *</span>
                  <input
                    type="date"
                    value={advForm.advanceDate}
                    onChange={(e) => setAdvForm({ ...advForm, advanceDate: e.target.value })}
                    className="input-text"
                    required
                  />
                </label>

                <label>
                  <span>Reason / Terms</span>
                  <input
                    type="text"
                    placeholder="Emergency, medical, advance for festival..."
                    value={advForm.notes}
                    onChange={(e) => setAdvForm({ ...advForm, notes: e.target.value })}
                    className="input-text"
                  />
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={isSubmittingAdvance || !canCreate}
                    title={!canCreate ? "Permission denied: Cannot issue advances" : ""}
                  >
                    {isSubmittingAdvance ? "Granting..." : "💸 Issue Advance"}
                  </button>
                </div>
              </form>
            </SectionCard>

            {/* Advance Filters & Quick Stats */}
            <SectionCard title="Filter & Audit Advances" subtitle="View unrecovered loans and salary deduction timeline.">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label>
                  <span>Filter Status:</span>
                  <select
                    value={advanceFilterStatus}
                    onChange={(e) => setAdvanceFilterStatus(e.target.value)}
                    className="input-select"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending (Unrecovered)</option>
                    <option value="deducted">Deducted (Recovered)</option>
                  </select>
                </label>

                <label>
                  <span>Filter Staff Member:</span>
                  <select
                    value={advanceFilterEmployeeId}
                    onChange={(e) => setAdvanceFilterEmployeeId(e.target.value)}
                    className="input-select"
                  >
                    <option value="all">👥 All Staff Members</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.designation})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Filter Branch:</span>
                  <select
                    value={advanceBranchId}
                    onChange={(e) => setAdvanceBranchId(e.target.value)}
                    className="input-select"
                  >
                    <option value="">All Branches</option>
                    {(context.branches || []).map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>

                <div style={{ padding: "1rem", background: "var(--surface-sunken, rgba(0,0,0,0.1))", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: "700", marginBottom: "0.5rem" }}>💡 How Advances Work:</div>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.86rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <li>When an advance is issued, it is recorded as <strong>Pending</strong>.</li>
                    <li>During monthly salary disbursal, the pending advance is automatically populated in the <strong>Advance Deduction</strong> box.</li>
                    <li>Once salary is confirmed, the advance status is marked <strong>Deducted</strong> and linked to that payroll month.</li>
                  </ul>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Advances Ledger Table */}
          <SectionCard
            title="Employee Advances Ledger"
            subtitle="Complete record of advances, recovery status, and disbursement history."
            action={
              <button className="ghost-btn btn-sm" onClick={() => exportToCSV("Employee_Advances", advancesList)}>
                📥 Export CSV
              </button>
            }
          >
            <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
              <table className="data-table" style={{ minWidth: "900px", width: "100%" }}>
                <thead>
                  <tr>
                    <th>Date Issued</th>
                    <th>Employee Name</th>
                    <th>Designation</th>
                    <th>Branch</th>
                    <th>Advance Amount</th>
                    <th>Recovery Status</th>
                    <th>Deducted In</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {advancesList.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                        No employee advances recorded yet. Use the form above to grant an advance.
                      </td>
                    </tr>
                  ) : (
                    advancesList.map((adv) => (
                      <tr key={adv.id}>
                        <td>{adv.advance_date}</td>
                        <td style={{ fontWeight: "700" }}>{adv.employee_name}</td>
                        <td>{adv.designation}</td>
                        <td><span className="small">{adv.branch_name}</span></td>
                        <td style={{ fontWeight: "700", color: "#f59e0b" }}>
                          Rs. {Number(adv.amount).toLocaleString()}
                        </td>
                        <td>
                          <span className={`status-pill ${adv.status === "pending" ? "status-warning" : "status-success"}`}>
                            {adv.status === "pending" ? "⏳ Pending" : "✅ Deducted"}
                          </span>
                        </td>
                        <td>
                          {adv.deducted_in_month ? (
                            <span style={{ fontWeight: "600" }}>{adv.deducted_in_month}</span>
                          ) : (
                            <span className="muted small">Not yet</span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{adv.notes || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SALARIES, PAYROLL & HISTORICAL REPORTS */}
      {/* ======================================================== */}
      {activeTab === "payroll" && (
        <div className="page-stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <StatCard
              label="Total Net Salaries Paid"
              value={`Rs. ${(payrollHistory.summary?.totalNetSalaries || 0).toLocaleString()}`}
            />
            <StatCard
              label="Base Salaries + Bonuses"
              value={`Rs. ${((payrollHistory.summary?.totalBaseSalaries || 0) + (payrollHistory.summary?.totalBonuses || 0)).toLocaleString()}`}
            />
            <StatCard
              label="Advances Deducted"
              value={`Rs. ${(payrollHistory.summary?.totalAdvanceDeductions || 0).toLocaleString()}`}
            />
            <StatCard
              label="Advances Granted"
              value={`Rs. ${(payrollHistory.summary?.totalAdvancesIssued || 0).toLocaleString()}`}
            />
            <StatCard
              label="Unrecovered Advances"
              value={`Rs. ${(payrollHistory.summary?.totalAdvancesPending || 0).toLocaleString()}`}
            />
          </div>

          {/* Dedicated Employee Statement Banner (if specific employee selected) */}
          {selectedEmpStatement && (
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "1.4rem" }}>👤</span>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800" }}>{selectedEmpStatement.fullName}</h3>
                    <span className="status-pill status-info">{selectedEmpStatement.designation}</span>
                    <span className="small muted">({selectedEmpStatement.branchName})</span>
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "0.88rem", color: "var(--text-muted)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <span>Monthly Salary: <strong style={{ color: "var(--text-primary)" }}>Rs. {selectedEmpStatement.monthlySalary.toLocaleString()}</strong></span>
                    <span>Total Disbursed: <strong style={{ color: "#10b981" }}>Rs. {selectedEmpStatement.totalNetPaid.toLocaleString()}</strong> ({selectedEmpStatement.salariesCount} vouchers)</span>
                    <span>Advances Taken: <strong>Rs. {selectedEmpStatement.advancesTaken.toLocaleString()}</strong></span>
                    <span>Pending Advance: <strong style={{ color: selectedEmpStatement.advancesPending > 0 ? "#f59e0b" : "var(--text-muted)" }}>Rs. {selectedEmpStatement.advancesPending.toLocaleString()}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    onClick={() => setSelectedStaffId("all")}
                    title="View reports for all employees"
                  >
                    ✕ View All Staff
                  </button>
                </div>
              </div>

              {/* Paid Months Badges */}
              <div style={{ paddingTop: "10px", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: "700", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  🗓️ Disbursed Salary Months ({selectedEmpStatement.salaryMonthsPaid?.length || 0}):
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                  {selectedEmpStatement.salaryMonthsPaid?.length > 0 ? (
                    selectedEmpStatement.salaryMonthsPaid.map((m) => (
                      <span
                        key={m}
                        className="status-pill status-success"
                        style={{ fontSize: "0.82rem", fontWeight: "700", padding: "4px 10px" }}
                        title={`Salary for ${m} is already paid. Cannot be given again.`}
                      >
                        ✅ {m} Paid
                      </span>
                    ))
                  ) : (
                    <span className="muted small">No salaries have been recorded for this staff member yet.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <SectionCard
            title="Payroll History & Financial Statements"
            subtitle="Search, filter, and audit salaries and advances given to all staff or a specific employee."
            action={
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  className="primary-btn"
                  onClick={() => openPayModal(employees[0] || null)}
                  disabled={!canCreate}
                  title={!canCreate ? "Permission denied: Cannot disburse salary" : "Disburse monthly salary for staff with unified single form"}
                >
                  ⚡ Disburse Single Salary
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => handleTabChange("batch_salary")}
                  title="Process monthly salary for all staff simultaneously in batch table"
                >
                  ⚡ Batch Process All Staff
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => {
                    const dataToExport =
                      payrollViewMode === "salaries"
                        ? (payrollHistory.salaries || [])
                        : payrollViewMode === "advances"
                        ? (payrollHistory.advances || [])
                        : payrollViewMode === "summary"
                        ? (payrollHistory.employeeBreakdown || [])
                        : consolidatedLedger;
                    exportToCSV(`Payroll_Statement_${payrollViewMode}_${selectedStaffId}`, dataToExport);
                  }}
                >
                  📥 Export CSV
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => window.print()}
                  title="Print currently displayed statement"
                >
                  🖨️ Print Statement
                </button>
              </div>
            }
          >
            {/* Filter Toolbar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                padding: "1rem",
                background: "var(--surface-sunken, rgba(0,0,0,0.04))",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                marginBottom: "1rem"
              }}
            >
              <div>
                <label className="input-label" style={{ fontWeight: "700" }}>Filter Staff Member</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="input-select"
                >
                  <option value="all">👥 All Staff Members ({employees.length})</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label" style={{ fontWeight: "700" }}>Time Range Scope</label>
                <select
                  value={payrollTimeFilter}
                  onChange={(e) => setPayrollTimeFilter(e.target.value)}
                  className="input-select"
                >
                  <option value="month">Specific Month ({salaryMonth})</option>
                  <option value="all">All-Time Full Ledger</option>
                </select>
              </div>

              {payrollTimeFilter === "month" && (
                <div>
                  <label className="input-label" style={{ fontWeight: "700" }}>Select Month</label>
                  <input
                    type="month"
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    className="input-text"
                  />
                </div>
              )}

              <div>
                <label className="input-label" style={{ fontWeight: "700" }}>Branch Scope</label>
                <select
                  value={payrollBranchId}
                  onChange={(e) => setPayrollBranchId(e.target.value)}
                  className="input-select"
                >
                  <option value="">All Branches</option>
                  {(context.branches || []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* View Mode Segmented Controls */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <button
                type="button"
                className={payrollViewMode === "ledger" ? "primary-btn btn-sm" : "ghost-btn btn-sm"}
                onClick={() => setPayrollViewMode("ledger")}
              >
                📑 Consolidated Ledger ({consolidatedLedger.length})
              </button>
              <button
                type="button"
                className={payrollViewMode === "salaries" ? "primary-btn btn-sm" : "ghost-btn btn-sm"}
                onClick={() => setPayrollViewMode("salaries")}
              >
                💵 Salaries Paid ({(payrollHistory.salaries || []).length})
              </button>
              <button
                type="button"
                className={payrollViewMode === "advances" ? "primary-btn btn-sm" : "ghost-btn btn-sm"}
                onClick={() => setPayrollViewMode("advances")}
              >
                💳 Advances & Loans ({(payrollHistory.advances || []).length})
              </button>
              <button
                type="button"
                className={payrollViewMode === "summary" ? "primary-btn btn-sm" : "ghost-btn btn-sm"}
                onClick={() => setPayrollViewMode("summary")}
              >
                👥 Per-Staff Breakdown & Paid Months ({(payrollHistory.employeeBreakdown || []).length})
              </button>
            </div>

            {/* VIEW 1: CONSOLIDATED LEDGER */}
            {payrollViewMode === "ledger" && (
              <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
                <table className="data-table" style={{ minWidth: "1150px", width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction Type</th>
                      <th>Staff Member</th>
                      <th>Branch</th>
                      <th>Salary Month</th>
                      <th>Gross Amount</th>
                      <th>Deductions</th>
                      <th>Net Paid / Issued</th>
                      <th>Payment Method</th>
                      <th>Notes</th>
                      <th>Slip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidatedLedger.length === 0 ? (
                      <tr>
                        <td colSpan="11" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No payroll transactions found for the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      consolidatedLedger.map((row) => (
                        <tr key={row.id}>
                          <td>{row.date}</td>
                          <td>
                            <span
                              className={`status-pill ${
                                row.kind === "salary"
                                  ? "status-success"
                                  : row.status === "deducted"
                                  ? "status-info"
                                  : "status-warning"
                              }`}
                            >
                              {row.typeLabel}
                            </span>
                          </td>
                          <td style={{ fontWeight: "700" }}>{row.employeeName}</td>
                          <td><span className="small">{row.branchName}</span></td>
                          <td>
                            {row.month && row.month !== "Pending" ? (
                              <span style={{ fontWeight: "600" }}>{row.month}</span>
                            ) : (
                              <span className="muted small">—</span>
                            )}
                          </td>
                          <td>Rs. {row.grossAmount.toLocaleString()}</td>
                          <td>
                            {row.deductionAmount > 0 ? (
                              <span style={{ color: "#ef4444" }}>-Rs. {row.deductionAmount.toLocaleString()}</span>
                            ) : (
                              <span className="muted small">Rs. 0</span>
                            )}
                          </td>
                          <td
                            style={{
                              fontWeight: "800",
                              fontSize: "1.02rem",
                              color: row.kind === "salary" ? "#10b981" : "#f59e0b"
                            }}
                          >
                            Rs. {row.netAmount.toLocaleString()}
                          </td>
                          <td><span className="status-pill status-info">{String(row.method || "cash").toUpperCase()}</span></td>
                          <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{row.notes || "—"}</td>
                          <td>
                            {row.kind === "salary" ? (
                              <button
                                type="button"
                                className="ghost-btn btn-sm"
                                onClick={() => setViewingVoucher(row.record)}
                                title="View and print official salary voucher slip"
                              >
                                🧾 Slip
                              </button>
                            ) : (
                              <span className="muted small">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW 2: SALARIES PAID HISTORY */}
            {payrollViewMode === "salaries" && (
              <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
                <table className="data-table" style={{ minWidth: "1200px", width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Date Paid</th>
                      <th>Employee</th>
                      <th>Designation</th>
                      <th>Branch</th>
                      <th>Base Salary</th>
                      <th>Bonus</th>
                      <th>Advance Ded.</th>
                      <th>Other Ded.</th>
                      <th>Net Paid</th>
                      <th>Method</th>
                      <th>Voucher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payrollHistory.salaries || []).length === 0 ? (
                      <tr>
                        <td colSpan="12" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No salary disbursements recorded for this selection.
                        </td>
                      </tr>
                    ) : (
                      payrollHistory.salaries.map((s) => (
                        <tr key={s.id}>
                          <td><span style={{ fontWeight: "700", color: "#059669" }}>{s.salary_month}</span></td>
                          <td>{s.payment_date}</td>
                          <td style={{ fontWeight: "700" }}>{s.employee_name}</td>
                          <td>{s.designation}</td>
                          <td><span className="small">{s.branch_name}</span></td>
                          <td>Rs. {Number(s.base_salary).toLocaleString()}</td>
                          <td style={{ color: "#10b981", fontWeight: "600" }}>
                            {Number(s.bonus || 0) > 0 ? `+Rs. ${Number(s.bonus).toLocaleString()}` : "Rs. 0"}
                          </td>
                          <td style={{ color: "#f59e0b", fontWeight: "600" }}>
                            {Number(s.advance_deduction || 0) > 0 ? `-Rs. ${Number(s.advance_deduction).toLocaleString()}` : "Rs. 0"}
                          </td>
                          <td style={{ color: "#ef4444" }}>
                            {Number(s.deductions || 0) > 0 ? `-Rs. ${Number(s.deductions).toLocaleString()}` : "Rs. 0"}
                          </td>
                          <td style={{ fontWeight: "800", color: "#10b981", fontSize: "1.05rem" }}>
                            Rs. {Number(s.net_salary).toLocaleString()}
                          </td>
                          <td><span className="status-pill status-info">{s.payment_method?.toUpperCase()}</span></td>
                          <td>
                            <button
                              type="button"
                              className="ghost-btn btn-sm"
                              onClick={() => setViewingVoucher(s)}
                              title="View & print official salary payment voucher"
                            >
                              🧾 Slip
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW 3: ADVANCES & LOANS HISTORY */}
            {payrollViewMode === "advances" && (
              <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
                <table className="data-table" style={{ minWidth: "960px", width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Date Issued</th>
                      <th>Employee</th>
                      <th>Designation</th>
                      <th>Branch</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Deducted in Month</th>
                      <th>Authorized By</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payrollHistory.advances || []).length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No employee advance records found.
                        </td>
                      </tr>
                    ) : (
                      payrollHistory.advances.map((adv) => (
                        <tr key={adv.id}>
                          <td>{adv.advance_date}</td>
                          <td style={{ fontWeight: "700" }}>{adv.employee_name}</td>
                          <td>{adv.designation}</td>
                          <td><span className="small">{adv.branch_name}</span></td>
                          <td style={{ fontWeight: "700", color: "#f59e0b" }}>
                            Rs. {Number(adv.amount).toLocaleString()}
                          </td>
                          <td>
                            <span className={`status-pill ${adv.status === "pending" ? "status-warning" : "status-success"}`}>
                              {adv.status === "pending" ? "⏳ Pending" : "✅ Deducted"}
                            </span>
                          </td>
                          <td>
                            {adv.deducted_in_month ? (
                              <span style={{ fontWeight: "600", color: "#059669" }}>{adv.deducted_in_month}</span>
                            ) : (
                              <span className="muted small">Not yet</span>
                            )}
                          </td>
                          <td><span className="small muted">{adv.created_by_name || "Admin"}</span></td>
                          <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{adv.notes || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW 4: PER-STAFF SUMMARY BREAKDOWN & PAID MONTHS */}
            {payrollViewMode === "summary" && (
              <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
                <table className="data-table" style={{ minWidth: "1100px", width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Branch</th>
                      <th>Base Salary</th>
                      <th>Vouchers</th>
                      <th>Total Net Paid</th>
                      <th>Disbursed Months (Already Paid)</th>
                      <th>Advances Taken</th>
                      <th>Advances Deducted</th>
                      <th>Pending Advance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payrollHistory.employeeBreakdown || []).length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No staff data available.
                        </td>
                      </tr>
                    ) : (
                      payrollHistory.employeeBreakdown.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <div style={{ fontWeight: "700" }}>{b.fullName}</div>
                            <small className="muted">{b.designation}</small>
                          </td>
                          <td><span className="small">{b.branchName}</span></td>
                          <td>Rs. {b.monthlySalary.toLocaleString()}</td>
                          <td><span className="status-pill status-info">{b.salariesCount}</span></td>
                          <td style={{ fontWeight: "800", color: "#10b981" }}>
                            Rs. {b.totalNetPaid.toLocaleString()}
                          </td>
                          <td>
                            {b.salaryMonthsPaid?.length > 0 ? (
                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "260px" }}>
                                {b.salaryMonthsPaid.map((m) => (
                                  <span
                                    key={m}
                                    className="status-pill status-success"
                                    style={{ fontSize: "0.74rem", padding: "2px 7px" }}
                                    title={`Salary for ${m} is already paid`}
                                  >
                                    ✅ {m}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="muted small">No disbursements</span>
                            )}
                          </td>
                          <td>Rs. {b.advancesTaken.toLocaleString()}</td>
                          <td style={{ color: "#10b981" }}>Rs. {b.advancesRecovered.toLocaleString()}</td>
                          <td style={{ fontWeight: "700", color: b.advancesPending > 0 ? "#f59e0b" : "var(--text-muted)" }}>
                            Rs. {b.advancesPending.toLocaleString()}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="secondary-btn btn-sm"
                              onClick={() => {
                                setSelectedStaffId(String(b.id));
                                setPayrollViewMode("ledger");
                              }}
                              title="Filter statements and history specifically for this employee"
                            >
                              📊 Statement
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: BATCH MONTHLY SALARY TABLE (ALL EMPLOYEES AT ONCE) */}
      {/* ======================================================== */}
      {activeTab === "batch_salary" && (
        <BatchMonthlySalaryForm
          context={context}
          defaultBranchId={payrollBranchId || defaultBranchId}
          initialMonth={salaryMonth}
          onSuccess={(res) => {
            setMessage(res.message);
            loadSalaries();
            setTimeout(() => setMessage(""), 5000);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 4: STAFF DIRECTORY & ROSTER */}
      {/* ======================================================== */}
      {activeTab === "staff" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <StatCard label="Total Staff Members" value={staffSummary.total} />
            <StatCard label="Active Employees" value={staffSummary.activeCount} />
            <StatCard label="Monthly Payroll Liability" value={`Rs. ${Math.round(staffSummary.totalPayroll).toLocaleString()}`} />
          </div>

          <SectionCard
            title="Registered Employees & Staff Directory"
            subtitle="Staff roster with designations, salaries, contact details, and branch assignments."
            action={
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="primary-btn"
                  onClick={() => setShowAddModal(true)}
                  disabled={!canCreate}
                  title={!canCreate ? "Permission denied: Cannot register employees" : ""}
                >
                  ➕ Register Employee
                </button>
                <button className="ghost-btn" onClick={() => exportToCSV("Employees_List", employees)}>
                  📥 Export CSV
                </button>
              </div>
            }
          >
            <div style={{ marginBottom: "16px" }}>
              <input
                type="text"
                placeholder="🔍 Search staff by name, phone, CNIC, or designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-text"
                style={{ maxWidth: "360px" }}
              />
            </div>

            <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
              <table className="data-table" style={{ minWidth: "980px", width: "100%" }}>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Designation</th>
                    <th>Branch</th>
                    <th>Phone</th>
                    <th>CNIC</th>
                    <th>Monthly Salary</th>
                    <th>Joining Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👔</div>
                        <div style={{ fontWeight: "700", fontSize: "1.1rem", marginBottom: "0.25rem", color: "var(--text-primary)" }}>
                          No Staff Registered Yet
                        </div>
                        <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem" }}>
                          Add your employees to track attendance, disburse salaries, and manage advances.
                        </p>
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => setShowAddModal(true)}
                          disabled={!canCreate}
                          title={!canCreate ? "Permission denied: Cannot register employees" : ""}
                        >
                          ➕ Register First Employee
                        </button>
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-muted)" }}>
                        No staff matches your search query "{search}".
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td style={{ fontWeight: "700" }}>{emp.full_name}</td>
                        <td>{emp.designation}</td>
                        <td><span className="small">{emp.branch_name}</span></td>
                        <td>{emp.phone || "N/A"}</td>
                        <td style={{ fontFamily: "var(--font-mono, monospace)" }}>{emp.cnic || "N/A"}</td>
                        <td style={{ fontWeight: "700", color: "#10b981" }}>
                          Rs. {Number(emp.monthly_salary).toLocaleString()}
                        </td>
                        <td>{emp.joining_date ? String(emp.joining_date).slice(0, 10) : "N/A"}</td>
                        <td>
                          <span className={`status-pill ${emp.status === "active" ? "status-success" : "status-error"}`}>
                            {emp.status ? emp.status.toUpperCase() : "ACTIVE"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="ghost-btn btn-sm"
                              disabled={!canEdit}
                              onClick={() => {
                                if (!canEdit) return;
                                setEditingEmployee(emp);
                                setEditEmployeeForm({
                                  fullName: emp.full_name || "",
                                  designation: emp.designation || "",
                                  phone: emp.phone || "",
                                  cnic: emp.cnic || "",
                                  monthlySalary: emp.monthly_salary || 0,
                                  branchId: emp.branch_id || "",
                                  status: emp.status || "active"
                                });
                              }}
                              title={!canEdit ? "Permission denied: Cannot edit employee profile" : "Edit employee profile"}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="secondary-btn btn-sm"
                              disabled={!canCreate}
                              onClick={() => openPayModal(emp)}
                              title={!canCreate ? "Permission denied: Cannot disburse salary" : "Disburse monthly salary"}
                            >
                              💵 Pay
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 5: DAILY ATTENDANCE */}
      {/* ======================================================== */}
      {activeTab === "daily_attendance" && (
        <SectionCard
          title="Daily Attendance Roll Call"
          subtitle="Mark daily present, absent, half-day, or leave status for store staff."
          action={
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="input-text"
                style={{ width: "auto" }}
              />
              <button className="ghost-btn" onClick={markAllPresent}>
                ✅ Mark All Present
              </button>
              <button
                className="primary-btn"
                onClick={handleSaveDailyAttendance}
                disabled={savingDaily || (!canCreate && !canEdit)}
                title={(!canCreate && !canEdit) ? "Permission denied: Cannot save attendance" : ""}
              >
                {savingDaily ? "Saving..." : "💾 Save Attendance"}
              </button>
            </div>
          }
        >
          <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
            <table className="data-table" style={{ minWidth: "750px", width: "100%" }}>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {employees
                  .filter((emp) => emp.status === "active")
                  .map((emp) => {
                    const rec = dailyRecords[emp.id] || { status: "present", checkInTime: "", checkOutTime: "", notes: "" };
                    return (
                      <tr key={emp.id}>
                        <td style={{ fontWeight: "700" }}>{emp.full_name}</td>
                        <td>{emp.designation}</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {["present", "absent", "half_day", "leave"].map((st) => (
                              <button
                                key={st}
                                type="button"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "0.75rem",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  border: "1px solid",
                                  background: rec.status === st
                                    ? (st === "present" ? "#10b981" : st === "absent" ? "#ef4444" : "#f59e0b")
                                    : "transparent",
                                  color: rec.status === st ? "#fff" : "var(--text-muted)",
                                  borderColor: rec.status === st ? "transparent" : "var(--border-color)"
                                }}
                                onClick={() => updateEmpDailyAttendance(emp.id, "status", st)}
                              >
                                {st.replace("_", " ").toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <input
                            type="time"
                            value={rec.checkInTime || ""}
                            onChange={(e) => updateEmpDailyAttendance(emp.id, "checkInTime", e.target.value)}
                            className="input-text"
                            style={{ width: "110px", padding: "4px 8px" }}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            value={rec.checkOutTime || ""}
                            onChange={(e) => updateEmpDailyAttendance(emp.id, "checkOutTime", e.target.value)}
                            className="input-text"
                            style={{ width: "110px", padding: "4px 8px" }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Optional remark..."
                            value={rec.notes || ""}
                            onChange={(e) => updateEmpDailyAttendance(emp.id, "notes", e.target.value)}
                            className="input-text"
                            style={{ padding: "4px 8px" }}
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* REGISTER EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "550px" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.4rem" }}>➕</span>
                <h3 style={{ margin: 0 }}>Register New Employee</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="close-btn">✕</button>
            </div>

            <form onSubmit={handleAddEmployee}>
              <div className="modal-body" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label className="input-label">Full Name *</label>
                  <input
                    type="text" required
                    value={addForm.fullName}
                    onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                    className="input-text" placeholder="Employee Full Name"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="input-label">Branch *</label>
                    <select
                      value={addForm.branchId || defaultBranchId}
                      onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value })}
                      className="input-select"
                      required
                    >
                      {(context.branches || []).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Designation</label>
                    <input
                      type="text"
                      value={addForm.designation}
                      onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                      className="input-text" placeholder="e.g. Sales, Cashier, Technician"
                    />
                  </div>
                  <div>
                    <label className="input-label">Phone</label>
                    <input
                      type="text"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      className="input-text" placeholder="03XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="input-label">CNIC / ID</label>
                    <input
                      type="text"
                      value={addForm.cnic}
                      onChange={(e) => setAddForm({ ...addForm, cnic: e.target.value })}
                      className="input-text" placeholder="XXXXX-XXXXXXX-X"
                    />
                  </div>
                  <div>
                    <label className="input-label">Monthly Salary (PKR) *</label>
                    <input
                      type="number" required
                      value={addForm.monthlySalary}
                      onChange={(e) => setAddForm({ ...addForm, monthlySalary: e.target.value })}
                      className="input-text" placeholder="e.g. 35000"
                    />
                  </div>
                  <div>
                    <label className="input-label">Joining Date</label>
                    <input
                      type="date"
                      value={addForm.joiningDate}
                      onChange={(e) => setAddForm({ ...addForm, joiningDate: e.target.value })}
                      className="input-text"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="secondary-btn" disabled={isSavingEmployee}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSavingEmployee || !canCreate} title={!canCreate ? "Permission denied: Cannot register employees" : ""}>
                  {isSavingEmployee ? "Saving Employee..." : "➕ Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editingEmployee && (
        <div className="modal-backdrop" onClick={() => setEditingEmployee(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "550px" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.4rem" }}>✏️</span>
                <h3 style={{ margin: 0 }}>Edit Staff: {editingEmployee.full_name}</h3>
              </div>
              <button onClick={() => setEditingEmployee(null)} className="close-btn">✕</button>
            </div>

            <form onSubmit={handleEditEmployee}>
              <div className="modal-body" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label className="input-label">Full Name *</label>
                  <input
                    type="text" required
                    value={editEmployeeForm.fullName || ""}
                    onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, fullName: e.target.value })}
                    className="input-text"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="input-label">Branch</label>
                    <select
                      value={editEmployeeForm.branchId || ""}
                      onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, branchId: e.target.value })}
                      className="input-select"
                    >
                      {(context.branches || []).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Designation</label>
                    <input
                      type="text"
                      value={editEmployeeForm.designation || ""}
                      onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, designation: e.target.value })}
                      className="input-text"
                    />
                  </div>
                  <div>
                    <label className="input-label">Phone</label>
                    <input
                      type="text"
                      value={editEmployeeForm.phone || ""}
                      onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, phone: e.target.value })}
                      className="input-text"
                    />
                  </div>
                  <div>
                    <label className="input-label">CNIC / ID</label>
                    <input
                      type="text"
                      value={editEmployeeForm.cnic || ""}
                      onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, cnic: e.target.value })}
                      className="input-text"
                    />
                  </div>
                  <div>
                    <label className="input-label">Monthly Salary (PKR) *</label>
                    <input
                      type="number" required
                      value={editEmployeeForm.monthlySalary ?? ""}
                      onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, monthlySalary: e.target.value })}
                      className="input-text"
                    />
                  </div>
                  <div>
                    <label className="input-label">Status</label>
                    <select
                      value={editEmployeeForm.status || "active"}
                      onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, status: e.target.value })}
                      className="input-select"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setEditingEmployee(null)} className="secondary-btn">Cancel</button>
                <button type="submit" className="primary-btn" disabled={!canEdit} title={!canEdit ? "Permission denied: Cannot edit employee" : ""}>💾 Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY SALARY MODAL - SINGLE UNIFIED FORM WITH PREFILLED, ADMIN-EDITABLE FIELDS */}
      {showPayModal && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "800px", width: "95%" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.4rem" }}>💵</span>
                <h3 style={{ margin: 0 }}>
                  Monthly Salary Form {selectedEmpForPay ? `: ${selectedEmpForPay.full_name || selectedEmpForPay.employee_name}` : ""}
                </h3>
              </div>
              <button onClick={() => setShowPayModal(false)} className="close-btn">✕</button>
            </div>
            <div className="modal-body" style={{ padding: "1.25rem" }}>
              <MonthlySalaryForm
                employee={selectedEmpForPay}
                employeesList={employees}
                initialMonth={salaryMonth}
                defaultBranchId={payrollBranchId || defaultBranchId}
                branches={context?.branches || []}
                canCreate={canCreate}
                onSuccess={(res) => {
                  setMessage(res.message || "Salary disbursed successfully.");
                  setShowPayModal(false);
                  loadSalaries();
                  if (activeTab === "monthly_attendance") {
                    loadMonthlyAttendance();
                  }
                  setTimeout(() => setMessage(""), 4500);
                }}
                onCancel={() => setShowPayModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* SALARY PAYMENT VOUCHER / SLIP MODAL */}
      {viewingVoucher && (
        <div className="modal-backdrop" onClick={() => setViewingVoucher(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.4rem" }}>🧾</span>
                <h3 style={{ margin: 0 }}>Salary Payment Voucher</h3>
              </div>
              <button onClick={() => setViewingVoucher(null)} className="close-btn">✕</button>
            </div>

            <div className="modal-body" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Slip Document Sheet */}
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1.5rem",
                  background: "#fff",
                  color: "#111"
                }}
              >
                <div style={{ textAlign: "center", borderBottom: "2px solid #e5e7eb", paddingBottom: "12px", marginBottom: "14px" }}>
                  <h2 style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: "900", color: "#111827" }}>
                    {shopName}
                  </h2>
                  <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                    Branch: {viewingVoucher.branch_name || "Main Branch"}
                  </div>
                  <div style={{ marginTop: "6px", display: "inline-block", background: "#f3f4f6", padding: "3px 12px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "700", color: "#374151" }}>
                    OFFICIAL SALARY DISBURSEMENT VOUCHER
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.88rem", marginBottom: "16px" }}>
                  <div>
                    <span style={{ color: "#6b7280" }}>Voucher #: </span>
                    <strong>SAL-{viewingVoucher.id}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: "#6b7280" }}>Payment Date: </span>
                    <strong>{viewingVoucher.payment_date}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280" }}>Employee Name: </span>
                    <strong style={{ fontSize: "1rem" }}>{viewingVoucher.employee_name}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: "#6b7280" }}>Salary Month: </span>
                    <strong style={{ fontSize: "1rem", color: "#047857" }}>{viewingVoucher.salary_month}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280" }}>Designation: </span>
                    <strong>{viewingVoucher.designation}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: "#6b7280" }}>Payment Method: </span>
                    <strong>{String(viewingVoucher.payment_method || "cash").toUpperCase()}</strong>
                  </div>
                </div>

                {/* Breakdown Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", marginBottom: "16px" }}>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 4px", color: "#374151" }}>Base Monthly Salary:</td>
                      <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700" }}>
                        Rs. {Number(viewingVoucher.base_salary || 0).toLocaleString()}
                      </td>
                    </tr>
                    {Number(viewingVoucher.bonus || 0) > 0 && (
                      <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#047857" }}>
                        <td style={{ padding: "8px 4px" }}>Incentive / Bonus:</td>
                        <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700" }}>
                          +Rs. {Number(viewingVoucher.bonus).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    {Number(viewingVoucher.advance_deduction || 0) > 0 && (
                      <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#b45309" }}>
                        <td style={{ padding: "8px 4px" }}>Advance Loan Deduction:</td>
                        <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700" }}>
                          -Rs. {Number(viewingVoucher.advance_deduction).toLocaleString()}
                        </td>
                      </tr>
                    )}

                    {Number(viewingVoucher.deductions || 0) > 0 && (
                      <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#b91c1c" }}>
                        <td style={{ padding: "8px 4px" }}>Absent / Other Deductions:</td>
                        <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700" }}>
                          -Rs. {Number(viewingVoucher.deductions).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr style={{ borderTop: "2px solid #111827", background: "#f9fafb" }}>
                      <td style={{ padding: "10px 4px", fontWeight: "800", fontSize: "1.05rem" }}>
                        NET SALARY PAID:
                      </td>
                      <td style={{ padding: "10px 4px", textAlign: "right", fontWeight: "900", fontSize: "1.25rem", color: "#047857" }}>
                        Rs. {Number(viewingVoucher.net_salary || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {(() => {
                  let overrides = [];
                  try {
                    overrides = Array.isArray(viewingVoucher.overridden_fields)
                      ? viewingVoucher.overridden_fields
                      : JSON.parse(viewingVoucher.overridden_fields || "[]");
                  } catch {
                    overrides = [];
                  }
                  if (!overrides || overrides.length === 0) return null;
                  return (
                    <div style={{ fontSize: "0.78rem", color: "#b45309", marginBottom: "12px", background: "#fef3c7", padding: "6px 10px", borderRadius: "6px" }}>
                      ℹ️ Note: Manually overridden fields audited: <strong>{overrides.join(", ")}</strong>
                    </div>
                  );
                })()}

                {viewingVoucher.notes && (
                  <div style={{ fontSize: "0.82rem", color: "#4b5563", marginBottom: "16px", fontStyle: "italic" }}>
                    Remarks: {viewingVoucher.notes}
                  </div>
                )}

                {/* Signatures */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "32px", paddingTop: "16px" }}>
                  <div style={{ borderTop: "1px dashed #9ca3af", textAlign: "center", fontSize: "0.82rem", color: "#4b5563", paddingTop: "6px" }}>
                    Employee Signature
                  </div>
                  <div style={{ borderTop: "1px dashed #9ca3af", textAlign: "center", fontSize: "0.82rem", color: "#4b5563", paddingTop: "6px" }}>
                    Authorized Branch Manager
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={() => setViewingVoucher(null)} className="secondary-btn">
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="primary-btn"
              >
                🖨️ Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
