import { useState, useEffect, useMemo } from "react";
import { api } from "../api.js";

/**
 * MonthlySalaryForm - Unified Single Form for Monthly Salary Processing
 *
 * All fields shown together on one single screen with prefilled values,
 * live recalculation, admin override tracking, reset hints, and validation.
 */
export function MonthlySalaryForm({
  employee,
  employeesList = [],
  initialMonth = new Date().toISOString().slice(0, 7),
  onSuccess,
  onCancel,
  defaultBranchId,
  branches = [],
  canCreate = true
}) {
  const [selectedEmpId, setSelectedEmpId] = useState(
    employee ? (employee.id || employee.employee_id) : (employeesList[0]?.id || "")
  );
  const [currentEmp, setCurrentEmp] = useState(employee || employeesList[0] || null);
  const [salaryMonth, setSalaryMonth] = useState(initialMonth);

  // Field states
  const [baseSalary, setBaseSalary] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [pendingAdvanceTotal, setPendingAdvanceTotal] = useState(0);
  const [computedSalary, setComputedSalary] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [netSalary, setNetSalary] = useState(0);

  // Initial prefilled values (for reset triggers and override detection)
  const [prefilledValues, setPrefilledValues] = useState({
    baseSalary: 0,
    bonus: 0,
    advance: 0,
    deductions: 0
  });

  // Metadata & payment fields
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [recordAsExpense, setRecordAsExpense] = useState(true);

  // Status & duplicate prevention
  const [isAlreadyPaid, setIsAlreadyPaid] = useState(false);
  const [existingSalaryRecord, setExistingSalaryRecord] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Sync when employee prop changes
  useEffect(() => {
    if (employee) {
      setSelectedEmpId(employee.id || employee.employee_id);
      setCurrentEmp(employee);
    }
  }, [employee]);

  // Sync current employee when selectedEmpId changes
  useEffect(() => {
    if (selectedEmpId && employeesList.length > 0) {
      const found = employeesList.find((e) => Number(e.id) === Number(selectedEmpId));
      if (found) setCurrentEmp(found);
    }
  }, [selectedEmpId, employeesList]);

  // Load preview data (prefills, pending advances, monthly attendance, duplicate status)
  useEffect(() => {
    const targetId = currentEmp?.id || currentEmp?.employee_id || selectedEmpId;
    if (!targetId || !salaryMonth) return;

    let isMounted = true;
    setLoadingPreview(true);
    setError("");

    api
      .employeeSalaryPreview(targetId, `?month=${salaryMonth}`)
      .then((data) => {
        if (!isMounted) return;
        const base = Number(data.baseSalary || 0);
        const bns = Number(data.bonus || 0);
        const adv = Number(data.advance || 0);
        const ded = Number(data.deductions || 0);
        const comp = Math.max(0, base + bns - adv);
        const net = Math.max(0, comp - ded);

        setBaseSalary(base);
        setBonus(bns);
        setAdvance(adv);
        setPendingAdvanceTotal(Number(data.pendingAdvance || 0));
        setDeductions(ded);
        setComputedSalary(comp);
        setNetSalary(net);

        setPrefilledValues({
          baseSalary: base,
          bonus: bns,
          advance: adv,
          deductions: ded
        });

        setIsAlreadyPaid(Boolean(data.isAlreadyPaid));
        setExistingSalaryRecord(data.existingSalary || null);
        setNotes(`Salary for ${salaryMonth}${ded > 0 ? ` (Deductions: Rs. ${ded})` : ""}`);
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback to employee properties if preview endpoint is unavailable
        const base = Number(currentEmp?.monthly_salary || 0);
        setBaseSalary(base);
        setBonus(0);
        setAdvance(0);
        setDeductions(0);
        setComputedSalary(base);
        setNetSalary(base);
        setPrefilledValues({
          baseSalary: base,
          bonus: 0,
          advance: 0,
          deductions: 0
        });
      })
      .finally(() => {
        if (isMounted) setLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentEmp, selectedEmpId, salaryMonth]);

  // Current parsed numbers
  const numBase = Math.max(0, Number(baseSalary || 0));
  const numBonus = Math.max(0, Number(bonus || 0));
  const numAdvance = Math.max(0, Number(advance || 0));
  const numDeductions = Math.max(0, Number(deductions || 0));

  // Auto-computed intermediate: Base Salary + Bonus - Advance
  const autoComputedSalary = Math.max(0, numBase + numBonus - numAdvance);

  // Auto-computed Net Salary: Base + Bonus - Advance - Deductions
  const expectedNetSalary = Math.max(0, autoComputedSalary - numDeductions);

  // Field change handlers with live auto-recalculation
  function handleBaseSalaryChange(e) {
    const val = e.target.value;
    setBaseSalary(val);
    const parsed = Math.max(0, Number(val || 0));
    const newComp = Math.max(0, parsed + numBonus - numAdvance);
    setComputedSalary(newComp);
    setNetSalary(Math.max(0, newComp - numDeductions));
  }

  function handleBonusChange(e) {
    const val = e.target.value;
    setBonus(val);
    const newComp = Math.max(0, numBase + Math.max(0, Number(val || 0)) - numAdvance);
    setComputedSalary(newComp);
    setNetSalary(Math.max(0, newComp - numDeductions));
  }

  function handleAdvanceChange(e) {
    const val = e.target.value;
    setAdvance(val);
    const newComp = Math.max(0, numBase + numBonus - Math.max(0, Number(val || 0)));
    setComputedSalary(newComp);
    setNetSalary(Math.max(0, newComp - numDeductions));
  }

  function handleDeductionsChange(e) {
    const val = e.target.value;
    setDeductions(val);
    setNetSalary(Math.max(0, autoComputedSalary - Math.max(0, Number(val || 0))));
  }

  // Reset helpers
  function handleResetBase() {
    setBaseSalary(prefilledValues.baseSalary);
    const newComp = Math.max(0, prefilledValues.baseSalary + numBonus - numAdvance);
    setComputedSalary(newComp);
    setNetSalary(Math.max(0, newComp - numDeductions));
  }

  function handleResetBonus() {
    setBonus(prefilledValues.bonus);
    const newComp = Math.max(0, numBase + prefilledValues.bonus - numAdvance);
    setComputedSalary(newComp);
    setNetSalary(Math.max(0, newComp - numDeductions));
  }

  function handleResetAdvance() {
    setAdvance(prefilledValues.advance);
    const newComp = Math.max(0, numBase + numBonus - prefilledValues.advance);
    setComputedSalary(newComp);
    setNetSalary(Math.max(0, newComp - numDeductions));
  }

  function handleResetDeductions() {
    setDeductions(prefilledValues.deductions);
    setNetSalary(Math.max(0, autoComputedSalary - prefilledValues.deductions));
  }

  // Determine which fields were customized
  const overriddenFieldsList = useMemo(() => {
    const list = [];
    if (Number(baseSalary) !== Number(prefilledValues.baseSalary)) {
      list.push("base_salary");
    }
    if (Number(bonus) !== Number(prefilledValues.bonus)) {
      list.push("bonus");
    }
    if (Number(advance) !== Number(prefilledValues.advance)) {
      list.push("advance_deduction");
    }
    if (Number(deductions) !== Number(prefilledValues.deductions)) {
      list.push("deductions");
    }
    return list;
  }, [
    baseSalary,
    bonus,
    advance,
    deductions,
    prefilledValues
  ]);

  // Real-time validation checks
  const rosterSalary = Number(currentEmp?.monthly_salary || 0);
  const isBaseSalaryMissing = (!rosterSalary || rosterSalary <= 0) && (!numBase || numBase <= 0);
  const isNegativePresent =
    Number(baseSalary) < 0 ||
    Number(bonus) < 0 ||
    Number(advance) < 0 ||
    Number(deductions) < 0 ||
    Number(expectedNetSalary) < 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canCreate) {
      setError("Permission denied: You do not have permission to disburse salary.");
      return;
    }
    setError("");

    // Edge Case: Employee with no base salary set → block save
    if (isBaseSalaryMissing) {
      setError(
        `Cannot process salary: Employee "${currentEmp?.full_name || "Staff"}" has no base monthly salary configured in the system. Please set their salary in the Staff Directory before generating a salary voucher.`
      );
      return;
    }

    // Validation: all amounts >= 0
    if (isNegativePresent) {
      setError("All salary fields (Base, Bonus, Advance, Deductions, Net Salary) must be greater than or equal to 0.");
      return;
    }

    if (isAlreadyPaid) {
      setError(`Salary for ${salaryMonth} was already disbursed to ${currentEmp?.full_name}. Duplicate disbursement is prohibited.`);
      return;
    }

    setSubmitting(true);
    try {
      const empId = currentEmp?.id || currentEmp?.employee_id || selectedEmpId;
      const targetBranch = currentEmp?.branch_id || defaultBranchId || branches?.[0]?.id;

      const payload = {
        branchId: targetBranch ? Number(targetBranch) : null,
        employeeId: Number(empId),
        salaryMonth,
        baseSalary: numBase,
        bonus: Number(bonus || 0),
        advanceDeduction: Number(advance || 0),
        computedSalary: Number(computedSalary || 0),
        deductions: Number(deductions || 0),
        netSalary: Number(netSalary || 0),
        overriddenFields: overriddenFieldsList,
        paymentMethod,
        paymentDate,
        notes,
        recordAsExpense
      };

      const res = await api.paySalary(payload);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setError(err.message || "Failed to process salary payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 1. EMPLOYEE & MONTH IDENTIFICATION BAR */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          padding: "1rem 1.25rem",
          background: "var(--surface-sunken, rgba(0,0,0,0.04))",
          borderRadius: "10px",
          border: "1px solid var(--border)"
        }}
      >
        <div>
          <label className="input-label" style={{ fontWeight: "700" }}>Employee / Staff Member *</label>
          {employeesList.length > 0 ? (
            <select
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                const found = employeesList.find((x) => Number(x.id) === Number(e.target.value));
                if (found) setCurrentEmp(found);
              }}
              className="input-select"
              required
            >
              {employeesList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.designation}) — Base: Rs. {Number(emp.monthly_salary || 0).toLocaleString()}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "4px" }}>
              <span style={{ fontSize: "1.2rem" }}>👤</span>
              <strong style={{ fontSize: "1.05rem" }}>{currentEmp?.full_name || currentEmp?.employee_name}</strong>
              <span className="status-pill status-info">{currentEmp?.designation || "Staff"}</span>
            </div>
          )}
        </div>

        <div>
          <label className="input-label" style={{ fontWeight: "700" }}>Salary Month *</label>
          <input
            type="month"
            value={salaryMonth}
            onChange={(e) => setSalaryMonth(e.target.value)}
            className="input-text"
            required
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="input-label" style={{ fontWeight: "700", margin: 0 }}>
              Base Monthly Salary (PKR) *
            </label>
            {Number(baseSalary) !== Number(prefilledValues.baseSalary) && (
              <span style={{ fontSize: "0.74rem", color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                roster: <strong>Rs. {prefilledValues.baseSalary.toLocaleString()}</strong>
                <button
                  type="button"
                  onClick={handleResetBase}
                  className="ghost-btn btn-sm"
                  style={{ padding: "0 4px", fontSize: "0.7rem", height: "18px" }}
                  title="Reset to configured monthly roster salary"
                >
                  ↺ Reset
                </button>
              </span>
            )}
          </div>
          <input
            type="number"
            min="0"
            step="any"
            value={baseSalary}
            onChange={handleBaseSalaryChange}
            className="input-text"
            style={{ fontWeight: "700" }}
            placeholder="0"
            required
          />
          {isBaseSalaryMissing && (
            <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: "600" }}>
              ⚠️ No base salary configured in roster!
            </span>
          )}
        </div>
      </div>

      {/* ERROR & NOTIFICATION BANNERS */}
      {error && (
        <div
          style={{
            padding: "0.85rem 1rem",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: "8px",
            color: "#ef4444",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>⛔</span>
          <div>{error}</div>
        </div>
      )}

      {/* EDGE CASE: BASE SALARY MISSING ALERT */}
      {isBaseSalaryMissing && (
        <div
          style={{
            padding: "0.85rem 1rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            color: "#ef4444",
            fontSize: "0.88rem",
            display: "flex",
            gap: "10px",
            alignItems: "center"
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>⛔</span>
          <div>
            <strong>Base Salary Missing:</strong> This employee has no base monthly salary set in the system.
            Please set a monthly salary in the Staff Directory before generating a salary disbursement.
          </div>
        </div>
      )}

      {/* DUPLICATE SALARY ALREADY PAID RESTRICTION */}
      {isAlreadyPaid && (
        <div
          style={{
            padding: "0.85rem 1rem",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "8px",
            display: "flex",
            gap: "12px",
            alignItems: "center"
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>⛔</span>
          <div>
            <div style={{ fontWeight: "800", color: "#ef4444", fontSize: "0.95rem" }}>
              Salary Already Disbursed For {salaryMonth}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Salary was already paid on <strong>{existingSalaryRecord?.payment_date}</strong> (Net:{" "}
              <strong>Rs. {Number(existingSalaryRecord?.net_salary || 0).toLocaleString()}</strong> via{" "}
              {existingSalaryRecord?.payment_method?.toUpperCase()}). Duplicate salary disbursement for an already given month is strictly prohibited.
            </div>
          </div>
        </div>
      )}

      {/* 2. THE CORE FIELDS (ALL SHOWN TOGETHER ON ONE SCREEN) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "14px"
        }}
      >
        {/* FIELD 1: BONUS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
            <label className="input-label" style={{ fontWeight: "700", margin: 0 }}>
              1. Bonus / Incentive (PKR)
            </label>
            {Number(bonus) !== Number(prefilledValues.bonus) ? (
              <span style={{ fontSize: "0.74rem", color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                prefilled: <strong>Rs. {prefilledValues.bonus.toLocaleString()}</strong>
                <button
                  type="button"
                  onClick={handleResetBonus}
                  className="ghost-btn btn-sm"
                  style={{ padding: "0 4px", fontSize: "0.7rem", height: "18px" }}
                  title="Reset to prefilled monthly bonus"
                >
                  ↺ Reset
                </button>
              </span>
            ) : (
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Default: 0</span>
            )}
          </div>
          <input
            type="number"
            min="0"
            step="any"
            value={bonus}
            onChange={handleBonusChange}
            className="input-text"
            placeholder="0"
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Prefilled from employee monthly bonus. Adds to Base.
          </span>
        </div>

        {/* FIELD 2: ADVANCE */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
            <label className="input-label" style={{ fontWeight: "700", margin: 0 }}>
              2. Advance Deduction (PKR)
            </label>
            {Number(advance) !== Number(prefilledValues.advance) ? (
              <span style={{ fontSize: "0.74rem", color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                prefilled: <strong>Rs. {prefilledValues.advance.toLocaleString()}</strong>
                <button
                  type="button"
                  onClick={handleResetAdvance}
                  className="ghost-btn btn-sm"
                  style={{ padding: "0 4px", fontSize: "0.7rem", height: "18px" }}
                  title="Reset to prefilled pending advance"
                >
                  ↺ Reset
                </button>
              </span>
            ) : pendingAdvanceTotal > 0 ? (
              <span style={{ fontSize: "0.74rem", color: "#f59e0b", fontWeight: "600" }}>
                Pending: Rs. {pendingAdvanceTotal.toLocaleString()}
              </span>
            ) : (
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Default: 0</span>
            )}
          </div>
          <input
            type="number"
            min="0"
            step="any"
            value={advance}
            onChange={handleAdvanceChange}
            className="input-text"
            placeholder="0"
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Prefilled from outstanding advance. Deducts from Base.
          </span>
        </div>

        {/* FIELD 3: DEDUCTIONS (TAX / STATUTORY / ABSENT) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
            <label className="input-label" style={{ fontWeight: "700", margin: 0 }}>
              3. Deductions (Tax / Statutory / Absent)
            </label>
            {Number(deductions) !== Number(prefilledValues.deductions) ? (
              <span style={{ fontSize: "0.74rem", color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                prefilled: <strong>Rs. {prefilledValues.deductions.toLocaleString()}</strong>
                <button
                  type="button"
                  onClick={handleResetDeductions}
                  className="ghost-btn btn-sm"
                  style={{ padding: "0 4px", fontSize: "0.7rem", height: "18px" }}
                  title="Reset to prefilled deductions"
                >
                  ↺ Reset
                </button>
              </span>
            ) : (
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Default: 0</span>
            )}
          </div>
          <input
            type="number"
            min="0"
            step="any"
            value={deductions}
            onChange={handleDeductionsChange}
            className="input-text"
            placeholder="0"
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Tax, statutory, attendance deductions. Subtracted from gross.
          </span>
        </div>

        {/* FIELD 4: NET SALARY (NON-EDITABLE AUTO-CALCULATED DISPLAY) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            background: "var(--positive-bg)",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid var(--positive-border, rgba(16, 185, 129, 0.25))"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
            <label className="input-label" style={{ fontWeight: "800", color: "var(--positive)", margin: 0 }}>
              4. Net Salary Payable (PKR)
            </label>
            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
              = Base + Bonus − Advance − Deductions
            </span>
          </div>
          <div
            style={{
              fontSize: "1.35rem",
              fontWeight: "900",
              color: "var(--positive)",
              padding: "2px 0"
            }}
          >
            Rs. {expectedNetSalary.toLocaleString()}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Auto-calculated net disbursement (non-editable).
          </span>
        </div>
      </div>

      {/* 3. DISBURSEMENT DETAILS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          padding: "1rem",
          background: "var(--surface-sunken, rgba(0,0,0,0.02))",
          borderRadius: "10px",
          border: "1px solid var(--border)"
        }}
      >
        <div>
          <label className="input-label">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="input-select"
          >
            <option value="cash">Cash in Hand</option>
            <option value="bank">Bank Transfer</option>
            <option value="easypaisa">EasyPaisa / JazzCash</option>
          </select>
        </div>

        <div>
          <label className="input-label">Disbursement Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="input-text"
            required
          />
        </div>

        <div>
          <label className="input-label">Remarks / Voucher Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-text"
            placeholder="e.g. Regular monthly payroll approved by manager"
          />
        </div>
      </div>

      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.86rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={recordAsExpense}
            onChange={(e) => setRecordAsExpense(e.target.checked)}
          />
          Automatically record net salary as Branch Operational Expense
        </label>
      </div>

      {/* 4. LIVE AUDIT RECONCILIATION CARD */}
      <div
        style={{
          padding: "1rem 1.25rem",
          background: "var(--surface-sunken, rgba(0,0,0,0.04))",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}
      >
        <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
          Formula & Audit Reconciliation
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem" }}>
          <span>Base Salary:</span>
          <span>Rs. {numBase.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", color: "#10b981" }}>
          <span>+ Bonus / Incentive:</span>
          <span>+Rs. {numBonus.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", color: "#f59e0b" }}>
          <span>− Advance Deduction:</span>
          <span>−Rs. {numAdvance.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", color: "#ef4444" }}>
          <span>− Deductions (Tax / Statutory / Absent):</span>
          <span>−Rs. {numDeductions.toLocaleString()}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid var(--border)",
            paddingTop: "8px",
            marginTop: "4px"
          }}
        >
          <div>
            <span style={{ fontSize: "1rem", fontWeight: "800" }}>Final Net Salary Payable:</span>
            {overriddenFieldsList.length > 0 && (
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Customized adjustments: <strong>{overriddenFieldsList.join(", ")}</strong>
              </div>
            )}
          </div>
          <span style={{ fontSize: "1.45rem", fontWeight: "900", color: "var(--positive)" }}>
            Rs. {expectedNetSalary.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 5. FORM FOOTER ACTIONS */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="secondary-btn" disabled={submitting}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="primary-btn"
          disabled={submitting || isBaseSalaryMissing || isAlreadyPaid || isNegativePresent || !canCreate}
          style={isBaseSalaryMissing || isAlreadyPaid || isNegativePresent || !canCreate ? { opacity: 0.6, cursor: "not-allowed" } : {}}
          title={
            !canCreate
              ? "Permission denied: Cannot disburse salary"
              : isBaseSalaryMissing
                ? "Base salary not set in roster"
                : isAlreadyPaid
                  ? "Salary already disbursed for this month"
                  : "Confirm & Disburse Salary"
          }
        >
          {submitting
            ? "Disbursing..."
            : isAlreadyPaid
              ? "⛔ Already Disbursed"
              : isBaseSalaryMissing
                ? "⛔ Missing Base Salary"
                : "✅ Confirm & Disburse Salary"}
        </button>
      </div>
    </form>
  );
}
