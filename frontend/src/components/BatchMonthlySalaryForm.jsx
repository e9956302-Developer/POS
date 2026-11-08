import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "../api.js";
import { exportToCSV } from "../utils/export.js";
import { SalaryVoucherModal } from "./SalaryVoucherModal.jsx";
import { StatCard } from "./StatCard.jsx";
import { SectionCard } from "./SectionCard.jsx";

/**
 * BatchMonthlySalaryForm - Unified Batch Processing Screen for ALL Employees
 *
 * Processes monthly salary for all staff simultaneously in an interactive inline table.
 * Includes:
 * - Top Month/Year selector, search box, department filter, and Save All buttons.
 * - Editable rows: Employee (read-only), Base (read-only), Bonus (editable), Advance (editable), Deductions (editable), Net Salary (non-editable, auto-calculated).
 * - Live recalculation: Base + Bonus - Advance - Deductions -> Net Salary.
 * - Bulk actions: Apply bonus to all, Copy first row's bonus to all, Reset all adjustments.
 * - Totals footer row summing all columns and excluding invalid rows.
 * - All-or-nothing validation preventing partial saves.
 * - In-memory pagination / view limits so large rosters remain blazing fast.
 * - Month-wise previously disbursed salary report & historical voucher slips displayed right below the batch table.
 */
export function BatchMonthlySalaryForm({
  context,
  defaultBranchId,
  initialMonth = new Date().toISOString().slice(0, 7),
  onSuccess
}) {
  const [salaryMonth, setSalaryMonth] = useState(initialMonth);
  const [branchFilter, setBranchFilter] = useState(defaultBranchId || "");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Pagination state
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Rows state (in-memory master copy of all employees)
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  const canCreate = context?.can ? context.can("employees", "create") : true;

  // Bulk action inputs
  const [bulkBonusValue, setBulkBonusValue] = useState("");

  // Payment details applied to batch
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [batchNotes, setBatchNotes] = useState("");
  const [recordAsExpense, setRecordAsExpense] = useState(true);

  // Previously disbursed salary history & report state
  const [historicalSalaries, setHistoricalSalaries] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyScope, setHistoryScope] = useState("month"); // "month" (salaryMonth) | "all"
  const [historySearch, setHistorySearch] = useState("");
  const [viewingVoucher, setViewingVoucher] = useState(null);

  // Load preview data whenever salaryMonth or branchFilter changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");
    setValidationErrors([]);
    setSuccessMessage("");

    const params = new URLSearchParams();
    if (salaryMonth) params.append("month", salaryMonth);
    if (branchFilter) params.append("branchId", branchFilter);

    api
      .batchSalaryPreview(`?${params.toString()}`)
      .then((data) => {
        if (!isMounted) return;
        const employeeRows = (data.employees || []).map((emp) => {
          const base = Number(emp.baseSalary || 0);
          const bns = Number(emp.bonus || 0);
          const adv = Number(emp.advance || 0);
          const ded = Number(emp.deductions || 0);
          const comp = Math.max(0, base + bns - adv);
          const net = Math.max(0, base + bns - adv - ded);

          return {
            employeeId: emp.employeeId,
            employeeName: emp.employeeName,
            designation: emp.designation || "Staff",
            branchId: emp.branchId,
            branchName: emp.branchName || "Main Branch",
            baseSalary: base,
            hasBaseSalary: Boolean(emp.hasBaseSalary),

            // Prefilled reference values
            prefilledBonus: bns,
            prefilledAdvance: adv,
            pendingAdvanceTotal: Number(emp.pendingAdvance || 0),
            prefilledDeductions: ded,

            // Active editable / calculated values
            bonus: bns,
            advance: adv,
            computedSalary: comp,
            deductions: ded,
            netSalary: net,

            // Edit tracking
            isBonusEdited: false,
            isAdvanceEdited: false,

            // Duplicate status
            isAlreadyPaid: Boolean(emp.isAlreadyPaid),
            existingSalary: emp.existingSalary || null,

            // Validation flag
            hasError: false,
            errorMessage: ""
          };
        });

        setRows(employeeRows);
        setCurrentPage(1);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load batch salary preview.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [salaryMonth, branchFilter]);

  // Unique designations for filter dropdown
  const uniqueDesignations = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.designation) set.add(r.designation);
    });
    return Array.from(set).sort();
  }, [rows]);

  // Filtered rows based on search and department
  const filteredRows = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          String(r.employeeId).includes(q) ||
          r.designation.toLowerCase().includes(q) ||
          r.branchName.toLowerCase().includes(q)
      );
    }
    if (departmentFilter !== "all") {
      list = list.filter((r) => r.designation === departmentFilter);
    }
    return list;
  }, [rows, search, departmentFilter]);

  // Paginated rows for high performance rendering
  const paginatedRows = useMemo(() => {
    if (pageSize === "all") return filteredRows;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return filteredRows.slice(start, start + size);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = pageSize === "all" ? 1 : Math.ceil(filteredRows.length / Number(pageSize)) || 1;

  // Row edit handlers
  function updateRow(employeeId, updater) {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.employeeId !== employeeId) return r;
        return updater(r);
      })
    );
  }

  function handleBonusChange(empId, val) {
    updateRow(empId, (r) => {
      const numBase = Math.max(0, Number(r.baseSalary || 0));
      const numAdv = Math.max(0, Number(r.advance || 0));
      const numDed = Math.max(0, Number(r.deductions || 0));
      const newBonus = val;
      const numNewBonus = Math.max(0, Number(val || 0));
      const newComp = Math.max(0, numBase + numNewBonus - numAdv);
      const newNet = Math.max(0, numBase + numNewBonus - numAdv - numDed);

      return {
        ...r,
        bonus: newBonus,
        isBonusEdited: true,
        computedSalary: newComp,
        netSalary: newNet,
        hasError: false,
        errorMessage: ""
      };
    });
  }

  function handleAdvanceChange(empId, val) {
    updateRow(empId, (r) => {
      const numBase = Math.max(0, Number(r.baseSalary || 0));
      const numBonus = Math.max(0, Number(r.bonus || 0));
      const numDed = Math.max(0, Number(r.deductions || 0));
      const newAdv = val;
      const numNewAdv = Math.max(0, Number(val || 0));
      const newComp = Math.max(0, numBase + numBonus - numNewAdv);
      const newNet = Math.max(0, numBase + numBonus - numNewAdv - numDed);

      return {
        ...r,
        advance: newAdv,
        isAdvanceEdited: true,
        computedSalary: newComp,
        netSalary: newNet,
        hasError: false,
        errorMessage: ""
      };
    });
  }

  function handleDeductionsChange(empId, val) {
    updateRow(empId, (r) => {
      const numBase = Math.max(0, Number(r.baseSalary || 0));
      const numBonus = Math.max(0, Number(r.bonus || 0));
      const numAdv = Math.max(0, Number(r.advance || 0));
      const numNewDed = Math.max(0, Number(val || 0));
      const newComp = Math.max(0, numBase + numBonus - numAdv);
      const newNet = Math.max(0, numBase + numBonus - numAdv - numNewDed);

      return {
        ...r,
        deductions: val,
        computedSalary: newComp,
        netSalary: newNet,
        hasError: false,
        errorMessage: ""
      };
    });
  }

  // Per-row Reset to auto-computed values
  function handleResetRow(empId) {
    updateRow(empId, (r) => {
      const numBase = Math.max(0, Number(r.baseSalary || 0));
      const autoComp = Math.max(0, numBase + r.prefilledBonus - r.prefilledAdvance);
      const autoNet = Math.max(0, autoComp - r.prefilledDeductions);

      return {
        ...r,
        bonus: r.prefilledBonus,
        advance: r.prefilledAdvance,
        computedSalary: autoComp,
        deductions: r.prefilledDeductions,
        netSalary: autoNet,
        isBonusEdited: false,
        isAdvanceEdited: false,
        isComputedLocked: false,
        isNetLocked: false,
        hasError: false,
        errorMessage: ""
      };
    });
  }

  // Bulk Actions
  function handleApplyBonusToAll() {
    const val = Number(bulkBonusValue || 0);
    if (isNaN(val) || val < 0) {
      alert("Please enter a valid non-negative bonus amount to apply.");
      return;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.isAlreadyPaid || !r.hasBaseSalary) return r;
        const numBase = Math.max(0, Number(r.baseSalary || 0));
        const numAdv = Math.max(0, Number(r.advance || 0));
        const numDed = Math.max(0, Number(r.deductions || 0));
        const newComp = Math.max(0, numBase + val - numAdv);
        const newNet = Math.max(0, numBase + val - numAdv - numDed);

        return {
          ...r,
          bonus: val,
          isBonusEdited: val !== r.prefilledBonus,
          computedSalary: newComp,
          netSalary: newNet
        };
      })
    );
    setBulkBonusValue("");
  }

  function handleCopyFirstRowBonus() {
    const firstRow = filteredRows.find((r) => !r.isAlreadyPaid && r.hasBaseSalary);
    if (!firstRow) {
      alert("No valid employee rows available to copy bonus from.");
      return;
    }
    const val = Number(firstRow.bonus || 0);

    setRows((prev) =>
      prev.map((r) => {
        if (r.isAlreadyPaid || !r.hasBaseSalary) return r;
        const numBase = Math.max(0, Number(r.baseSalary || 0));
        const numAdv = Math.max(0, Number(r.advance || 0));
        const numDed = Math.max(0, Number(r.deductions || 0));
        const newComp = Math.max(0, numBase + val - numAdv);
        const newNet = Math.max(0, numBase + val - numAdv - numDed);

        return {
          ...r,
          bonus: val,
          isBonusEdited: val !== r.prefilledBonus,
          computedSalary: newComp,
          netSalary: newNet
        };
      })
    );
  }

  function handleResetAllOverrides() {
    if (!window.confirm("Reset all custom bonuses, advances, and deductions back to standard calculations?")) {
      return;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.isAlreadyPaid) return r;
        const numBase = Math.max(0, Number(r.baseSalary || 0));
        const autoComp = Math.max(0, numBase + r.prefilledBonus - r.prefilledAdvance);
        const autoNet = Math.max(0, autoComp - r.prefilledDeductions);

        return {
          ...r,
          bonus: r.prefilledBonus,
          advance: r.prefilledAdvance,
          computedSalary: autoComp,
          deductions: r.prefilledDeductions,
          netSalary: autoNet,
          isBonusEdited: false,
          isAdvanceEdited: false,
          hasError: false,
          errorMessage: ""
        };
      })
    );
  }

  // Totals calculations across all rows (excluding missing base salary and already paid)
  const totals = useMemo(() => {
    let totalBase = 0;
    let totalBonus = 0;
    let totalAdvance = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let eligibleCount = 0;
    let alreadyPaidCount = 0;
    let invalidCount = 0;

    rows.forEach((r) => {
      if (r.isAlreadyPaid) {
        alreadyPaidCount++;
        return;
      }
      if (!r.hasBaseSalary) {
        invalidCount++;
        return; // exclude invalid base salary rows from totals as requested
      }

      const numBase = Math.max(0, Number(r.baseSalary || 0));
      const numBonus = Math.max(0, Number(r.bonus || 0));
      const numAdv = Math.max(0, Number(r.advance || 0));
      const numDed = Math.max(0, Number(r.deductions || 0));
      const numNet = Math.max(0, numBase + numBonus - numAdv - numDed);

      totalBase += numBase;
      totalBonus += numBonus;
      totalAdvance += numAdv;
      totalDeductions += numDed;
      totalNet += numNet;
      eligibleCount++;
    });

    return {
      totalBase,
      totalBonus,
      totalAdvance,
      totalDeductions,
      totalNet,
      eligibleCount,
      alreadyPaidCount,
      invalidCount
    };
  }, [rows]);

  // All-or-nothing save handler
  async function handleSaveAll() {
    if (!canCreate) {
      setError("Permission denied: You do not have permission to disburse monthly salaries.");
      return;
    }
    setError("");
    setValidationErrors([]);
    setSuccessMessage("");

    // Identify eligible rows to disburse
    const rowsToDisburse = rows.filter((r) => !r.isAlreadyPaid);

    if (rowsToDisburse.length === 0) {
      setError("No eligible employees to disburse. All employees for this month are either already paid or none found.");
      return;
    }

    // Comprehensive client-side all-or-nothing validation
    const errorsList = [];
    const updatedRows = rows.map((r) => {
      if (r.isAlreadyPaid) return r;

      let rowHasError = false;
      let msg = "";

      // Edge case: Employee with no base salary set
      if (!r.hasBaseSalary || Number(r.baseSalary || 0) <= 0) {
        rowHasError = true;
        msg = `Missing base salary in employee record.`;
        errorsList.push(`Employee "${r.employeeName}" (ID #${r.employeeId}) has no base monthly salary configured.`);
      }

      // Validation: All amounts >= 0
      const b = Number(r.bonus || 0);
      const a = Number(r.advance || 0);
      const d = Number(r.deductions || 0);
      const n = Number(r.netSalary || 0);

      if (b < 0 || a < 0 || d < 0 || n < 0) {
        rowHasError = true;
        msg = msg ? `${msg} | Negative values present.` : `Negative values not allowed.`;
        errorsList.push(`Employee "${r.employeeName}" (ID #${r.employeeId}) contains negative salary numbers.`);
      }

      return {
        ...r,
        hasError: rowHasError,
        errorMessage: msg
      };
    });

    setRows(updatedRows);

    if (errorsList.length > 0) {
      setValidationErrors(errorsList);
      setError(`Cannot Save All: ${errorsList.length} row(s) need fixing before any salary can be disbursed. Please review the highlighted red rows.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Prepare batch payload
    const disbursements = rowsToDisburse.map((r) => {
      const numBase = Math.max(0, Number(r.baseSalary || 0));
      const numBonus = Math.max(0, Number(r.bonus || 0));
      const numAdv = Math.max(0, Number(r.advance || 0));
      const autoComp = Math.max(0, numBase + numBonus - numAdv);
      const numDed = Math.max(0, Number(r.deductions || 0));
      const expectedNet = Math.max(0, autoComp - numDed);

      // Track which cells were customized
      const overriddenFields = [];
      if (numBonus !== r.prefilledBonus) overriddenFields.push("bonus");
      if (numAdv !== r.prefilledAdvance) overriddenFields.push("advance_deduction");
      if (numDed !== r.prefilledDeductions) overriddenFields.push("deductions");

      return {
        employeeId: r.employeeId,
        branchId: r.branchId,
        baseSalary: numBase,
        bonus: numBonus,
        advanceDeduction: numAdv,
        computedSalary: autoComp,
        deductions: numDed,
        netSalary: expectedNet,
        overriddenFields,
        notes: overriddenFields.length > 0 ? "Batch processed with adjustments" : "Batch processed"
      };
    });

    setSaving(true);
    try {
      const payload = {
        salaryMonth,
        branchId: branchFilter ? Number(branchFilter) : null,
        paymentMethod,
        paymentDate,
        notes: batchNotes || `Batch monthly salary for ${salaryMonth}`,
        recordAsExpense,
        disbursements
      };

      const res = await api.batchPaySalary(payload);
      setSuccessMessage(res.message || `Successfully disbursed monthly salaries for ${disbursements.length} employees.`);

      // Refresh list to show updated paid statuses
      const updatedData = await api.batchSalaryPreview(
        `?month=${salaryMonth}${branchFilter ? `&branchId=${branchFilter}` : ""}`
      );
      if (updatedData && updatedData.employees) {
        setRows(
          updatedData.employees.map((emp) => ({
            employeeId: emp.employeeId,
            employeeName: emp.employeeName,
            designation: emp.designation || "Staff",
            branchId: emp.branchId,
            branchName: emp.branchName || "Main Branch",
            baseSalary: Number(emp.baseSalary || 0),
            hasBaseSalary: Boolean(emp.hasBaseSalary),
            prefilledBonus: Number(emp.bonus || 0),
            prefilledAdvance: Number(emp.advance || 0),
            pendingAdvanceTotal: Number(emp.pendingAdvance || 0),
            prefilledDeductions: Number(emp.deductions || 0),
            bonus: Number(emp.bonus || 0),
            advance: Number(emp.advance || 0),
            computedSalary: Number(emp.computedSalary || 0),
            deductions: Number(emp.deductions || 0),
            netSalary: Number(emp.netSalary || 0),
            isBonusEdited: false,
            isAdvanceEdited: false,
            isAlreadyPaid: Boolean(emp.isAlreadyPaid),
            existingSalary: emp.existingSalary || null,
            hasError: false,
            errorMessage: ""
          }))
        );
      }

      if (onSuccess) {
        onSuccess(res);
      }
      loadHistory();
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        setValidationErrors(err.errors);
        setError(`Batch save rejected: ${err.errors.length} issue(s) detected.`);
      } else {
        setError(err.message || "Failed to process batch salary disbursement.");
      }
    } finally {
      setSaving(false);
    }
  }

  // Load previously disbursed salaries history for selected month / all
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      if (historyScope === "month" && salaryMonth) {
        params.append("month", salaryMonth);
      }
      if (branchFilter) {
        params.append("branchId", branchFilter);
      }
      const q = params.toString() ? `?${params.toString()}` : "";
      const data = await api.salaries(q);
      setHistoricalSalaries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load historical salaries:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyScope, salaryMonth, branchFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historicalSalaries;
    const q = historySearch.toLowerCase().trim();
    return historicalSalaries.filter(
      (s) =>
        s.employee_name?.toLowerCase().includes(q) ||
        String(s.employee_id).includes(q) ||
        s.designation?.toLowerCase().includes(q) ||
        s.branch_name?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
    );
  }, [historicalSalaries, historySearch]);

  const historyMetrics = useMemo(() => {
    let totalBase = 0;
    let totalBonus = 0;
    let totalAdvance = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    historicalSalaries.forEach((s) => {
      totalBase += Number(s.base_salary || 0);
      totalBonus += Number(s.bonus || 0);
      totalAdvance += Number(s.advance_deduction || 0);
      totalDeductions += Number(s.deductions || 0);
      totalNet += Number(s.net_salary || 0);
    });
    return {
      count: historicalSalaries.length,
      totalBase,
      totalBonus,
      totalAdvance,
      totalDeductions,
      totalNet
    };
  }, [historicalSalaries]);

  function handleExportHistoryCSV() {
    const cols = [
      { key: "id", label: "VOUCHER #" },
      { key: "salary_month", label: "SALARY MONTH" },
      { key: "payment_date", label: "PAYMENT DATE" },
      { key: "employee_name", label: "EMPLOYEE NAME" },
      { key: "designation", label: "DESIGNATION" },
      { key: "branch_name", label: "BRANCH" },
      { key: "base_salary", label: "BASE SALARY" },
      { key: "bonus", label: "BONUS" },
      { key: "advance_deduction", label: "ADVANCE DEDUCTED" },
      { key: "deductions", label: "OTHER DEDUCTIONS" },
      { key: "net_salary", label: "NET SALARY PAID" },
      { key: "payment_method", label: "PAYMENT METHOD" },
      { key: "paid_by_name", label: "AUTHORIZED BY" },
      { key: "notes", label: "NOTES" }
    ];
    exportToCSV(
      `Salary_Disbursement_Report_${historyScope === "month" ? salaryMonth : "All_Months"}`,
      filteredHistory,
      cols,
      {
        companyName: context?.session?.business_name || "DigitalMarkaz360",
        branchName: branchFilter ? "Filtered Branch" : "All Branches",
        reportTitle: `Salary Disbursement Report (${historyScope === "month" ? `Month: ${salaryMonth}` : "All Historical Months"})`
      }
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. TOP BAR: TITLE, MONTH PICKER, SEARCH, FILTERS & SAVE ALL */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          padding: "1.25rem",
          background: "var(--surface)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.8rem" }}>⚡</span>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: "800" }}>
              Batch Monthly Salary Processing
            </h2>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Process monthly salary for all staff simultaneously in a single batch table.
            </div>
          </div>
        </div>

        {/* Top Controls: Month Selector, Branch & Top Save All */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", margin: 0, fontWeight: "700" }}>
            <span style={{ fontSize: "0.88rem" }}>🗓️ Month:</span>
            <input
              type="month"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              className="input-text"
              style={{ width: "auto", padding: "6px 10px", fontWeight: "700" }}
            />
          </label>

          {context?.branches && context.branches.length > 1 && (
            <label style={{ display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
              <span style={{ fontSize: "0.88rem" }}>🏢 Branch:</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="input-select"
                style={{ width: "auto", padding: "6px 10px" }}
              >
                <option value="">All Branches</option>
                {context.branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            className="primary-btn"
            onClick={handleSaveAll}
            disabled={saving || loading || totals.eligibleCount === 0 || !canCreate}
            style={{
              padding: "8px 18px",
              fontWeight: "800",
              fontSize: "0.95rem",
              background: totals.invalidCount > 0 ? "var(--danger)" : "var(--primary)",
              color: "var(--primary-contrast, #ffffff)"
            }}
            title={!canCreate ? "Permission denied: Cannot disburse salaries" : totals.invalidCount > 0 ? "Errors exist on some rows" : "Save and disburse for all eligible employees"}
          >
            {saving ? "Saving All..." : `💾 Save All (${totals.eligibleCount} Staff)`}
          </button>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {successMessage && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            background: "var(--positive-bg)",
            border: "1px solid var(--positive-border, rgba(16, 185, 129, 0.4))",
            borderRadius: "10px",
            color: "var(--positive)",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>✅</span>
          <div>{successMessage}</div>
        </div>
      )}

      {/* ERROR & VALIDATION ALERT */}
      {error && (
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border, rgba(239, 68, 68, 0.4))",
            borderRadius: "10px",
            color: "var(--danger)",
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "0.98rem" }}>
            <span>⛔</span>
            <span>{error}</span>
          </div>
          {validationErrors.length > 0 && (
            <ul style={{ margin: "4px 0 0 24px", padding: 0, fontSize: "0.85rem", color: "#b91c1c" }}>
              {validationErrors.map((errText, idx) => (
                <li key={idx} style={{ marginBottom: "2px" }}>{errText}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 2. FILTER & BULK ACTIONS TOOLBAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "0.85rem 1.25rem",
          background: "var(--surface-sunken, rgba(0,0,0,0.03))",
          borderRadius: "10px",
          border: "1px solid var(--border)"
        }}
      >
        {/* Search & Department Filters */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ minWidth: "220px", flex: "1 1 220px" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search employee name or ID..."
              className="input-text"
              style={{ width: "100%", padding: "7px 12px" }}
            />
          </div>

          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input-select"
              style={{ width: "auto", padding: "7px 12px" }}
            >
              <option value="all">All Roles / Designations ({rows.length})</option>
              {uniqueDesignations.map((desig) => (
                <option key={desig} value={desig}>
                  {desig}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Tools: Apply Bonus to All, Copy First Row, Reset All Overrides */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="number"
              min="0"
              placeholder="Bonus amount"
              value={bulkBonusValue}
              onChange={(e) => setBulkBonusValue(e.target.value)}
              className="input-text"
              style={{ width: "120px", padding: "6px 8px" }}
            />
            <button
              type="button"
              className="secondary-btn btn-sm"
              onClick={handleApplyBonusToAll}
              title="Apply this bonus to all eligible visible employees"
            >
              Apply to All
            </button>
          </div>

          <button
            type="button"
            className="ghost-btn btn-sm"
            onClick={handleCopyFirstRowBonus}
            title="Copy the bonus value from the first row to all other rows"
          >
            📋 Copy 1st Bonus
          </button>

          <button
            type="button"
            className="ghost-btn btn-sm"
            onClick={handleResetAllOverrides}
            title="Clear all manual edits and restore formula computations"
            style={{ color: "#f59e0b" }}
          >
            ↺ Reset All Overrides
          </button>
        </div>
      </div>

      {/* 3. BATCH SALARY TABLE */}
      <div
        className="table-responsive"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "10px",
          background: "var(--surface)",
          maxHeight: "68vh",
          overflowY: "auto"
        }}
      >
        <table className="data-table" style={{ margin: 0, minWidth: "960px", width: "100%" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--surface)" }}>
            <tr>
              <th style={{ width: "40px", textAlign: "center" }}>#</th>
              <th style={{ minWidth: "180px" }}>Employee</th>
              <th style={{ minWidth: "120px" }}>Base Salary</th>
              <th style={{ minWidth: "130px" }}>Bonus (PKR)</th>
              <th style={{ minWidth: "130px" }}>Advance (PKR)</th>
              <th style={{ minWidth: "130px" }}>Deductions</th>
              <th style={{ minWidth: "150px" }}>Net Salary</th>
              <th style={{ minWidth: "110px", textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  ⏳ Loading employees and calculating monthly preview data...
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  No employees found matching the filters for month {salaryMonth}.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const numBase = Math.max(0, Number(row.baseSalary || 0));
                const numBonus = Math.max(0, Number(row.bonus || 0));
                const numAdv = Math.max(0, Number(row.advance || 0));
                const numDed = Math.max(0, Number(row.deductions || 0));
                const autoNet = Math.max(0, numBase + numBonus - numAdv - numDed);

                const isRowEdited =
                  row.isBonusEdited ||
                  row.isAdvanceEdited ||
                  Number(row.deductions || 0) !== Number(row.prefilledDeductions || 0);

                const rowBg = row.hasError
                  ? "rgba(239, 68, 68, 0.08)"
                  : row.isAlreadyPaid
                  ? "rgba(16, 185, 129, 0.04)"
                  : isRowEdited
                  ? "rgba(245, 158, 11, 0.04)"
                  : "transparent";

                const rowBorder = row.hasError ? "2px solid #ef4444" : "none";

                return (
                  <tr
                    key={row.employeeId}
                    style={{
                      background: rowBg,
                      outline: rowBorder,
                      transition: "background 0.15s ease"
                    }}
                  >
                    {/* Index */}
                    <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      {(currentPage - 1) * (pageSize === "all" ? 0 : Number(pageSize)) + idx + 1}
                    </td>

                    {/* Column 1: Employee */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <strong style={{ fontSize: "0.95rem" }}>{row.employeeName}</strong>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          <span className="small muted">ID: #{row.employeeId}</span>
                          <span className="status-pill status-info" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                            {row.designation}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Base Salary (Read-Only) */}
                    <td>
                      <div>
                        {row.hasBaseSalary ? (
                          <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>
                            Rs. {row.baseSalary.toLocaleString()}
                          </strong>
                        ) : (
                          <span
                            className="status-pill status-danger"
                            style={{ fontSize: "0.72rem", fontWeight: "700" }}
                            title="Base monthly salary is not configured on employee roster."
                          >
                            ⛔ No Base Salary
                          </span>
                        )}
                        {row.errorMessage && (
                          <div style={{ fontSize: "0.72rem", color: "#ef4444", fontWeight: "600", marginTop: "2px" }}>
                            {row.errorMessage}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Column 3: Bonus (Number input, prefilled, editable) */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.bonus}
                          disabled={row.isAlreadyPaid || !row.hasBaseSalary}
                          onChange={(e) => handleBonusChange(row.employeeId, e.target.value)}
                          className="input-text"
                          style={{
                            padding: "4px 8px",
                            fontWeight: "600",
                            background: row.isAlreadyPaid ? "transparent" : undefined
                          }}
                        />
                        {row.isBonusEdited && Number(row.bonus) !== row.prefilledBonus && (
                          <span style={{ fontSize: "0.7rem", color: "#f59e0b" }}>
                            prefilled: {row.prefilledBonus}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 4: Advance (Number input, prefilled from outstanding, editable) */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.advance}
                          disabled={row.isAlreadyPaid || !row.hasBaseSalary}
                          onChange={(e) => handleAdvanceChange(row.employeeId, e.target.value)}
                          className="input-text"
                          style={{
                            padding: "4px 8px",
                            fontWeight: "600",
                            background: row.isAlreadyPaid ? "transparent" : undefined
                          }}
                        />
                        {row.pendingAdvanceTotal > 0 && (
                          <span style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: "600" }}>
                            Loan: Rs. {row.pendingAdvanceTotal.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 5: Deductions (tax/absent/statutory) */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.deductions}
                          disabled={row.isAlreadyPaid || !row.hasBaseSalary}
                          onChange={(e) => handleDeductionsChange(row.employeeId, e.target.value)}
                          className="input-text"
                          style={{ padding: "4px 8px", fontWeight: "600" }}
                        />
                      </div>
                    </td>

                    {/* Column 6: Net Salary (Read-Only Auto-Calculated Display) */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <strong
                          style={{
                            color: "#10b981",
                            fontSize: "1.05rem",
                            fontWeight: "800",
                            padding: "4px 0"
                          }}
                        >
                          Rs. {autoNet.toLocaleString()}
                        </strong>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          Auto-calculated
                        </span>
                      </div>
                    </td>

                    {/* Column 7: Status & Per-Row Reset */}
                    <td style={{ textAlign: "center" }}>
                      {row.isAlreadyPaid ? (
                        <span
                          className="status-pill status-success"
                          style={{ fontSize: "0.75rem", fontWeight: "700" }}
                          title={`Salary was already disbursed on ${row.existingSalary?.payment_date || ""}`}
                        >
                          ✅ Paid
                        </span>
                      ) : !row.hasBaseSalary ? (
                        <span className="status-pill status-danger" style={{ fontSize: "0.72rem" }}>
                          ⛔ Blocked
                        </span>
                      ) : isRowEdited ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <span
                            className="status-pill status-warning"
                            style={{ fontSize: "0.72rem", padding: "1px 6px" }}
                            title="Admin modified adjustments"
                          >
                            adjusted
                          </span>
                          <button
                            type="button"
                            onClick={() => handleResetRow(row.employeeId)}
                            className="ghost-btn btn-sm"
                            style={{ padding: "0 4px", fontSize: "0.7rem", height: "20px" }}
                            title="Reset this row to auto-computed values"
                          >
                            ↺
                          </button>
                        </div>
                      ) : (
                        <span
                          className="status-pill status-info"
                          style={{ fontSize: "0.72rem", padding: "1px 6px" }}
                          title="All values calculated automatically from base formula"
                        >
                          auto
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* TOTALS FOOTER ROW (SUM OF ALL COLUMNS, EXCLUDING INVALID) */}
          <tfoot style={{ position: "sticky", bottom: 0, zIndex: 2, background: "var(--surface)", borderTop: "2px solid var(--border)" }}>
            <tr style={{ fontWeight: "800", background: "var(--surface-sunken, rgba(0,0,0,0.06))" }}>
              <td colSpan="2" style={{ padding: "10px 12px", fontSize: "0.92rem" }}>
                <span>TOTALS ({totals.eligibleCount} Eligible Staff):</span>
                {totals.invalidCount > 0 && (
                  <span style={{ fontSize: "0.75rem", color: "#ef4444", marginLeft: "8px", fontWeight: "600" }}>
                    ({totals.invalidCount} excluded due to missing base salary)
                  </span>
                )}
              </td>
              <td>Rs. {totals.totalBase.toLocaleString()}</td>
              <td style={{ color: "#10b981" }}>+Rs. {totals.totalBonus.toLocaleString()}</td>
              <td style={{ color: "#f59e0b" }}>-Rs. {totals.totalAdvance.toLocaleString()}</td>
              <td style={{ color: "#ef4444" }}>-Rs. {totals.totalDeductions.toLocaleString()}</td>
              <td style={{ color: "#10b981", fontSize: "1.1rem", fontWeight: "900" }}>
                Rs. {totals.totalNet.toLocaleString()}
              </td>
              <td style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {totals.alreadyPaidCount > 0 ? `${totals.alreadyPaidCount} paid` : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. PAGINATION & VIEW LIMIT CONTROLS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          padding: "0.5rem 0.5rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <span>Showing {paginatedRows.length} of {filteredRows.length} employees</span>
          <span>•</span>
          <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value);
                setCurrentPage(1);
              }}
              className="input-select"
              style={{ width: "auto", padding: "2px 6px", fontSize: "0.82rem" }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>

        {pageSize !== "all" && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              className="ghost-btn btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ◀ Prev
            </button>
            <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="ghost-btn btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next ▶
            </button>
          </div>
        )}
      </div>

      {/* 5. BOTTOM BAR: DISBURSEMENT SETTINGS & BOTTOM SAVE ALL */}
      <div
        style={{
          padding: "1.25rem",
          background: "var(--surface)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
        }}
      >
        <div style={{ fontWeight: "800", fontSize: "1rem" }}>
          Disbursement Batch Configuration
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px"
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

          <div style={{ gridColumn: "span 2" }}>
            <label className="input-label">Remarks / Batch Notes</label>
            <input
              type="text"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              className="input-text"
              placeholder="e.g. Monthly payroll approved by Business Admin for all staff"
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
            Automatically record each net salary disbursement as Branch Operational Expense
          </label>
        </div>

        {/* Action footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            borderTop: "1px solid var(--border)",
            paddingTop: "12px"
          }}
        >
          <div>
            <span style={{ fontSize: "0.95rem", fontWeight: "700" }}>Total Payout: </span>
            <span style={{ fontSize: "1.45rem", fontWeight: "900", color: "#10b981", marginLeft: "4px" }}>
              Rs. {totals.totalNet.toLocaleString()}
            </span>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: "8px" }}>
              ({totals.eligibleCount} staff members)
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleSaveAll}
              disabled={saving || loading || totals.eligibleCount === 0 || !canCreate}
              style={{
                padding: "10px 24px",
                fontWeight: "800",
                fontSize: "1rem",
                background: totals.invalidCount > 0 ? "var(--danger)" : "var(--primary)",
                color: "var(--primary-contrast, #ffffff)"
              }}
              title={!canCreate ? "Permission denied: Cannot disburse salaries" : totals.invalidCount > 0 ? "Fix highlighted errors before saving" : "Save All eligible monthly salaries"}
            >
              {saving ? "Processing Batch..." : `💾 Save All (${totals.eligibleCount} Staff)`}
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MONTH-WISE SALARY DISBURSEMENT REPORT & HISTORICAL RECORDS */}
      {/* ======================================================== */}
      <SectionCard
        title="📜 Previously Disbursed Salaries & Monthly Report"
        subtitle={`Historical salary records for ${historyScope === "month" ? `month ${salaryMonth}` : "all recorded months"}, including bonuses, advances recovered, deductions, and net payouts.`}
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }} className="no-print">
            <div style={{ display: "inline-flex", background: "var(--surface-sunken, rgba(0,0,0,0.04))", padding: "3px", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <button
                type="button"
                className={historyScope === "month" ? "primary-btn btn-sm" : "ghost-btn btn-sm"}
                onClick={() => setHistoryScope("month")}
                style={{ fontSize: "0.82rem", padding: "4px 10px" }}
              >
                📅 Selected Month ({salaryMonth})
              </button>
              <button
                type="button"
                className={historyScope === "all" ? "primary-btn btn-sm" : "ghost-btn btn-sm"}
                onClick={() => setHistoryScope("all")}
                style={{ fontSize: "0.82rem", padding: "4px 10px" }}
              >
                🗓️ All Months History
              </button>
            </div>

            <button
              type="button"
              className="ghost-btn btn-sm"
              onClick={handleExportHistoryCSV}
              disabled={filteredHistory.length === 0}
              title="Export visible salary records to CSV"
            >
              📥 Export CSV
            </button>
            <button
              type="button"
              className="secondary-btn btn-sm"
              onClick={() => window.print()}
              disabled={filteredHistory.length === 0}
              title="Print report"
            >
              🖨️ Print
            </button>
            <button
              type="button"
              className="ghost-btn btn-sm"
              onClick={loadHistory}
              title="Refresh records"
            >
              🔄
            </button>
          </div>
        }
      >
        {/* KPI Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <StatCard label="Disbursed Net Payout" value={`Rs. ${Math.round(historyMetrics.totalNet).toLocaleString()}`} tone="success" />
          <StatCard label="Base Salaries" value={`Rs. ${Math.round(historyMetrics.totalBase).toLocaleString()}`} />
          <StatCard label="Bonuses Awarded" value={`+Rs. ${Math.round(historyMetrics.totalBonus).toLocaleString()}`} tone="info" />
          <StatCard label="Advances Deducted" value={`-Rs. ${Math.round(historyMetrics.totalAdvance).toLocaleString()}`} tone="warning" />
          <StatCard label="Other Deductions" value={`-Rs. ${Math.round(historyMetrics.totalDeductions).toLocaleString()}`} tone="danger" />
          <StatCard label="Staff Paid" value={`${historyMetrics.count} Staff`} />
        </div>

        {/* Filter bar */}
        <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }} className="no-print">
          <input
            type="text"
            placeholder="🔍 Search disbursed records by employee name, ID, or notes..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            className="input-text"
            style={{ maxWidth: "380px" }}
          />
          <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
            Showing {filteredHistory.length} disbursed record(s) {historyScope === "month" ? `for ${salaryMonth}` : "across all months"}
          </span>
        </div>

        {/* Table of previously given salaries */}
        <div className="table-responsive" style={{ border: "1px solid var(--border)", borderRadius: "8px", overflowX: "auto", width: "100%" }}>
          <table className="data-table" style={{ margin: 0, minWidth: "1380px", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "45px", minWidth: "45px", textAlign: "center", whiteSpace: "nowrap" }}>#</th>
                <th style={{ minWidth: "110px", whiteSpace: "nowrap" }}>Payment Date</th>
                <th style={{ minWidth: "110px", whiteSpace: "nowrap" }}>Salary Month</th>
                <th style={{ minWidth: "150px", whiteSpace: "nowrap" }}>Employee</th>
                <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>Designation</th>
                <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>Branch</th>
                <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Base Salary</th>
                <th style={{ minWidth: "100px", textAlign: "right", whiteSpace: "nowrap" }}>Bonus (+)</th>
                <th style={{ minWidth: "130px", textAlign: "right", whiteSpace: "nowrap" }}>Advance Ded. (-)</th>
                <th style={{ minWidth: "120px", textAlign: "right", whiteSpace: "nowrap" }}>Other Ded. (-)</th>
                <th style={{ minWidth: "130px", textAlign: "right", whiteSpace: "nowrap" }}>Net Salary Paid</th>
                <th style={{ minWidth: "100px", whiteSpace: "nowrap" }}>Method</th>
                <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>Authorized By / Notes</th>
                <th style={{ minWidth: "70px", textAlign: "center", whiteSpace: "nowrap" }} className="no-print">Slip</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    ⏳ Loading previously disbursed salary records...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "1.6rem", marginBottom: "6px" }}>🧾</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "var(--text-primary)" }}>
                      {historyScope === "month"
                        ? `No Salaries Disbursed For ${salaryMonth} Yet`
                        : "No Historical Salary Disbursements Found"}
                    </div>
                    <p style={{ margin: "4px 0 12px 0", fontSize: "0.85rem" }}>
                      {historyScope === "month"
                        ? `Use the batch table above to review and disburse salaries for ${salaryMonth}. Once saved, records will automatically appear here with full bonus, advance, and deduction breakdown.`
                        : "No salary payments have been recorded yet."}
                    </p>
                    {historyScope === "month" && (
                      <button
                        type="button"
                        className="secondary-btn btn-sm"
                        onClick={() => setHistoryScope("all")}
                      >
                        🗓️ View All Months History
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      {idx + 1}
                    </td>
                    <td>{s.payment_date}</td>
                    <td>
                      <span style={{ fontWeight: "700", color: "#059669" }}>{s.salary_month}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: "700" }}>{s.employee_name}</div>
                      <span className="small muted">ID: #{s.employee_id}</span>
                    </td>
                    <td>{s.designation}</td>
                    <td><span className="small">{s.branch_name}</span></td>
                    <td style={{ textAlign: "right" }}>Rs. {Number(s.base_salary || 0).toLocaleString()}</td>
                    <td style={{ textAlign: "right", color: "#10b981", fontWeight: "600" }}>
                      {Number(s.bonus || 0) > 0 ? `+Rs. ${Number(s.bonus).toLocaleString()}` : "Rs. 0"}
                    </td>
                    <td style={{ textAlign: "right", color: "#f59e0b", fontWeight: "600" }}>
                      {Number(s.advance_deduction || 0) > 0 ? `-Rs. ${Number(s.advance_deduction).toLocaleString()}` : "Rs. 0"}
                    </td>
                    <td style={{ textAlign: "right", color: "#ef4444" }}>
                      {Number(s.deductions || 0) > 0 ? `-Rs. ${Number(s.deductions).toLocaleString()}` : "Rs. 0"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "800", color: "#10b981", fontSize: "1.05rem" }}>
                      Rs. {Number(s.net_salary || 0).toLocaleString()}
                    </td>
                    <td>
                      <span className="status-pill status-info">
                        {String(s.payment_method || "cash").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      <div>{s.notes || "—"}</div>
                      {s.paid_by_name && (
                        <span className="small muted" style={{ fontSize: "0.72rem" }}>By: {s.paid_by_name}</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }} className="no-print">
                      <button
                        type="button"
                        className="ghost-btn btn-sm"
                        onClick={() => setViewingVoucher(s)}
                        title="View & print official salary payment voucher slip"
                      >
                        🧾 Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="accounting-total-row">
                <td colSpan={6} style={{ fontWeight: "800" }}>
                  TOTAL DISBURSED SALARIES ({filteredHistory.length} Staff)
                </td>
                <td style={{ textAlign: "right", fontWeight: "700" }}>
                  Rs. {Math.round(filteredHistory.reduce((s, r) => s + Number(r.base_salary || 0), 0)).toLocaleString()}
                </td>
                <td style={{ textAlign: "right", fontWeight: "700", color: "#10b981" }}>
                  +Rs. {Math.round(filteredHistory.reduce((s, r) => s + Number(r.bonus || 0), 0)).toLocaleString()}
                </td>
                <td style={{ textAlign: "right", fontWeight: "700", color: "#f59e0b" }}>
                  -Rs. {Math.round(filteredHistory.reduce((s, r) => s + Number(r.advance_deduction || 0), 0)).toLocaleString()}
                </td>
                <td style={{ textAlign: "right", fontWeight: "700", color: "#ef4444" }}>
                  -Rs. {Math.round(filteredHistory.reduce((s, r) => s + Number(r.deductions || 0), 0)).toLocaleString()}
                </td>
                <td style={{ textAlign: "right", fontWeight: "900", color: "#10b981", fontSize: "1.1rem" }}>
                  Rs. {Math.round(filteredHistory.reduce((s, r) => s + Number(r.net_salary || 0), 0)).toLocaleString()}
                </td>
                <td colSpan={2} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Verified
                </td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      {/* Salary Voucher Slip Modal */}
      {viewingVoucher && (
        <SalaryVoucherModal
          voucher={viewingVoucher}
          onClose={() => setViewingVoucher(null)}
          shopName={context?.companyName || context?.session?.business_name || "DigitalMarkaz360"}
          companyLogo={context?.companyLogo || context?.session?.business_logo || context?.session?.logo_url}
        />
      )}
    </div>
  );
}
