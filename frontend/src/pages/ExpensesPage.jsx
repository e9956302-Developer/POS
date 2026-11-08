import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "../api.js";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { SectionCard } from "../components/SectionCard.jsx";
import { exportToCSV } from "../utils/export.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const CATEGORY_PRESETS = [
  { id: "tea", label: "Tea & Refreshments", icon: "☕", category: "misc", defaultTitle: "Tea & Refreshments" },
  { id: "utility", label: "Electricity / Utility Bills", icon: "💡", category: "utility_bill", defaultTitle: "Electricity / Utility Bill" },
  { id: "fuel", label: "Fuel & Transport", icon: "🚚", category: "transport", defaultTitle: "Fuel & Transport" },
  { id: "rent", label: "Shop Rent", icon: "🏢", category: "misc", defaultTitle: "Shop Rent" },
  { id: "repairs", label: "Repairs & Maintenance", icon: "🛠️", category: "misc", defaultTitle: "Shop Maintenance & Repair" },
  { id: "supplies", label: "Packaging & Supplies", icon: "📦", category: "misc", defaultTitle: "Shop Packaging & Supplies" },
  { id: "internet", label: "Internet & Telecom", icon: "🌐", category: "utility_bill", defaultTitle: "Internet / Telecom Bill" },
  { id: "salary", label: "Staff Daily Salary", icon: "💰", category: "salary", defaultTitle: "Staff Daily Wage / Salary" },
  { id: "misc", label: "Other / Misc", icon: "📑", category: "misc", defaultTitle: "" }
];

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash Drawer", icon: "💵" },
  { id: "bank", label: "Bank Account", icon: "🏦" },
  { id: "wallet", label: "Mobile Wallet", icon: "📱" }
];

const CATEGORY_LABELS = {
  salary: "Salary / Wages",
  utility_bill: "Utility Bills",
  transport: "Transport & Fuel",
  misc: "Miscellaneous"
};

export function createInitialBlankRows(count = 5, defaultPaidFrom = "cash", defaultDate = "") {
  const dateVal = defaultDate || new Date().toISOString().slice(0, 10);
  return Array.from({ length: count }, (_, i) => ({
    id: `batch-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    category: "misc",
    presetId: "",
    title: "",
    expenseDate: dateVal,
    amount: "",
    paymentMethod: defaultPaidFrom || "",
    isPaymentManual: false,
    notes: ""
  }));
}

export function classifyBulkRows(rows, batchPaidFrom = "cash", defaultDate = "") {
  let hasPartiallyFilled = false;
  const newRowErrors = {};
  const filledRows = [];
  let blankCount = 0;
  const effectiveDate = defaultDate || new Date().toISOString().slice(0, 10);

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    const hasTitle = Boolean(row.title && row.title.trim());
    const hasAmount = Boolean(
      row.amount !== "" && row.amount !== null && row.amount !== undefined && String(row.amount).trim() !== ""
    );
    const numAmount = Number(row.amount);
    const hasNotes = Boolean(row.notes && row.notes.trim());
    const hasCustomPreset = Boolean(row.presetId && row.presetId !== "");
    const isPaymentManual = Boolean(row.isPaymentManual);

    // FULLY BLANK: nothing entered in any field, Paid From untouched (Rule 5)
    const isFullyBlank = !hasTitle && !hasAmount && !hasNotes && !hasCustomPreset && !isPaymentManual;

    if (isFullyBlank) {
      blankCount++;
      return; // SKIP it silently!
    }

    // PARTIALLY FILLED: validate required fields
    const errors = {};
    if (!hasTitle) {
      errors.title = `Row ${rowNum}: Title is required`;
    }
    if (!hasAmount) {
      errors.amount = `Row ${rowNum}: Amount is required`;
    } else if (isNaN(numAmount) || numAmount <= 0) {
      errors.amount = `Row ${rowNum}: Amount must be greater than 0`;
    }
    if (!row.paymentMethod) {
      errors.paidFrom = `Row ${rowNum}: Paid From is required`;
    }

    const rowDate = defaultDate || row.expenseDate || effectiveDate;

    if (Object.keys(errors).length > 0) {
      hasPartiallyFilled = true;
      newRowErrors[row.id] = errors;
    } else {
      filledRows.push({
        rowNum,
        category: row.category || "misc",
        title: row.title.trim(),
        expenseDate: rowDate,
        amount: numAmount,
        paymentMethod: row.paymentMethod,
        notes: row.notes?.trim() || ""
      });
    }
  });

  return {
    hasPartiallyFilled,
    newRowErrors,
    filledRows,
    blankCount
  };
}

export function ExpensesPage({ context, initialMode = "single" }) {
  const { t, isRtl, language } = useLanguage();
  const defaultBranch =
    context?.session?.branch_id ||
    context?.session?.branchId ||
    (context?.branches && context?.branches[0]?.id ? String(context.branches[0].id) : "");

  // Main Page View Tabs: 'entry' (Record Expense Counter) vs 'directory' (Directory & History)
  const [activeTab, setActiveTab] = useState("entry"); // "entry" | "directory"

  // Entry Mode inside Record Tab: 'single' vs 'bulk'
  const [entryMode, setEntryMode] = useState(initialMode);

  // Single Quick Entry Form State
  const [singleForm, setSingleForm] = useState({
    branchId: defaultBranch,
    category: "misc",
    title: "Tea & Refreshments",
    expenseDate: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMethod: "cash",
    notes: ""
  });
  const [activePresetId, setActivePresetId] = useState("tea");
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // Bulk Batch Intake Form State (Master station at top of bulk mode)
  const [bulkIntake, setBulkIntake] = useState({
    category: "misc",
    presetId: "tea",
    title: "Tea & Refreshments",
    expenseDate: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMethod: "cash",
    notes: ""
  });
  const [bulkActivePresetId, setBulkActivePresetId] = useState("tea");
  const [bulkBranchId, setBulkBranchId] = useState(defaultBranch);

  // Batch Default Paid From (tracks default for rows & new rows)
  const [batchPaidFrom, setBatchPaidFrom] = useState("cash");

  // Exactly 5 blank rows on start (Rule 1)
  const [bulkRows, setBulkRows] = useState(() =>
    createInitialBlankRows(5, "cash", new Date().toISOString().slice(0, 10))
  );
  const [rowErrors, setRowErrors] = useState({});
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  const bulkAmountInputRef = useRef(null);
  const singleAmountInputRef = useRef(null);

  // General State
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canCreate = context?.can ? context.can("expenses", "create") : true;
  const canEdit = context?.can ? context.can("expenses", "edit") : true;
  const canDelete = context?.can ? context.can("expenses", "delete") : true;
  const canView = context?.can ? context.can("expenses", "view") : true;

  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // 'all' | 'today' | 'week' | 'month'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit modal state
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    amount: "",
    category: "misc",
    expense_date: "",
    notes: "",
    branch_id: ""
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, [context?.session?.branch_id, context?.branches?.length]);

  // Keep branch in sync if session loads branch later
  useEffect(() => {
    if (!singleForm.branchId && defaultBranch) {
      setSingleForm((prev) => ({ ...prev, branchId: defaultBranch }));
      setBulkBranchId(defaultBranch);
    }
  }, [defaultBranch]);

  function loadExpenses() {
    api.expenses()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.expenses || res?.data || []);
        setExpenses(Array.isArray(list) ? list : []);
      })
      .catch((loadError) => setError(loadError?.message || "Failed to load expenses."));
  }

  // --- Financial Pulse KPI Metrics ---
  const kpi = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    let todayTotal = 0;
    let todayCount = 0;
    let monthTotal = 0;
    let monthCount = 0;
    const catTotals = { salary: 0, utility_bill: 0, transport: 0, misc: 0 };

    const list = Array.isArray(expenses) ? expenses : [];
    for (const item of list) {
      const d = item.expense_date ? String(item.expense_date).slice(0, 10) : "";
      const amt = Number(item.amount) || 0;

      if (d === todayStr) {
        todayTotal += amt;
        todayCount += 1;
      }
      if (d.startsWith(monthStr)) {
        monthTotal += amt;
        monthCount += 1;
        const c = item.category in catTotals ? item.category : "misc";
        catTotals[c] += amt;
      }
    }

    let topCatKey = "misc";
    let topCatAmt = 0;
    for (const [key, val] of Object.entries(catTotals)) {
      if (val > topCatAmt) {
        topCatAmt = val;
        topCatKey = key;
      }
    }

    const topCatPct = monthTotal > 0 ? Math.round((topCatAmt / monthTotal) * 100) : 0;
    const currentMonthLabel = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });

    return {
      todayTotal,
      todayCount,
      monthTotal,
      monthCount,
      currentMonthLabel,
      topCatLabel: topCatAmt > 0 ? CATEGORY_LABELS[topCatKey] : "None Yet",
      topCatAmt,
      topCatPct
    };
  }, [expenses]);

  const activeCategoryPreset = CATEGORY_PRESETS.find((p) => p.id === activePresetId) || CATEGORY_PRESETS[0];

  // --- Single Category Preset Selection Handler ---
  function handleSelectSinglePreset(preset) {
    setActivePresetId(preset.id);
    setSingleForm((prev) => {
      const isDefaultTitle =
        !prev.title ||
        CATEGORY_PRESETS.some((p) => p.defaultTitle && p.defaultTitle.toLowerCase() === prev.title.toLowerCase());
      return {
        ...prev,
        category: preset.category,
        title: isDefaultTitle ? preset.defaultTitle : prev.title
      };
    });
    singleAmountInputRef.current?.focus();
  }

  // --- Quick Amount Shortcuts (Single Mode) ---
  function handleSingleQuickAmount(addVal) {
    if (addVal === null) {
      setSingleForm((prev) => ({ ...prev, amount: "" }));
      return;
    }
    setSingleForm((prev) => {
      const cur = Number(prev.amount) || 0;
      return { ...prev, amount: String(cur + addVal) };
    });
  }

  // --- Bulk Category Preset Selection Handler ---
  function handleSelectBulkPreset(preset) {
    setBulkActivePresetId(preset.id);
    setBulkIntake((prev) => {
      const isDefaultTitle =
        !prev.title ||
        CATEGORY_PRESETS.some((p) => p.defaultTitle && p.defaultTitle.toLowerCase() === prev.title.toLowerCase());
      return {
        ...prev,
        category: preset.category,
        presetId: preset.id,
        title: isDefaultTitle ? preset.defaultTitle : prev.title
      };
    });
    bulkAmountInputRef.current?.focus();
  }

  // --- Quick Amount Shortcuts (Bulk Mode) ---
  function handleBulkQuickAmount(addVal) {
    if (addVal === null) {
      setBulkIntake((prev) => ({ ...prev, amount: "" }));
      return;
    }
    setBulkIntake((prev) => {
      const cur = Number(prev.amount) || 0;
      return { ...prev, amount: String(cur + addVal) };
    });
  }

  // --- Single Expense Submission ---
  async function handleSingleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!canCreate) {
      setError("You do not have permission to record expenses.");
      return;
    }
    if (!singleForm.branchId) {
      setError("Please select a branch.");
      return;
    }
    if (!singleForm.title.trim()) {
      setError("Please enter an expense title.");
      return;
    }
    const numAmount = Number(singleForm.amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid expense amount greater than 0.");
      return;
    }

    setError("");
    setMessage("");
    setIsSubmittingSingle(true);

    try {
      const selectedPayMethod = PAYMENT_METHODS.find((p) => p.id === singleForm.paymentMethod);
      const paymentTag = selectedPayMethod ? `[Paid via: ${selectedPayMethod.label}]` : "";
      const finalNotes = [singleForm.notes.trim(), paymentTag].filter(Boolean).join(" • ");

      const payload = {
        branchId: Number(singleForm.branchId),
        category: singleForm.category,
        title: singleForm.title.trim(),
        expenseDate: singleForm.expenseDate,
        amount: numAmount,
        notes: finalNotes || null
      };

      const saved = await api.createExpense(payload);
      setExpenses([saved, ...expenses]);
      setMessage(`Expense "${singleForm.title}" for PKR ${numAmount.toLocaleString()} recorded successfully!`);

      // Reset amount and notes for next rapid entry
      setSingleForm((prev) => ({
        ...prev,
        amount: "",
        notes: ""
      }));
      if (context?.refreshAll) {
        context.refreshAll();
      }
    } catch (err) {
      setError(err.message || "Failed to record expense.");
    } finally {
      setIsSubmittingSingle(false);
    }
  }

  // --- Transfer Single Entry into Bulk Batch ---
  function handleSendSingleToBatch() {
    if (!singleForm.title.trim() || Number(singleForm.amount) <= 0) {
      setError("Please provide a title and valid amount before adding to batch.");
      return;
    }
    const newRow = {
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category: singleForm.category,
      presetId: activePresetId,
      title: singleForm.title.trim(),
      expenseDate: singleForm.expenseDate,
      amount: singleForm.amount,
      paymentMethod: singleForm.paymentMethod,
      isPaymentManual: true,
      notes: singleForm.notes.trim()
    };

    // If there is an untouched blank row, populate it; otherwise append
    const firstBlankIdx = bulkRows.findIndex(
      (r) => !r.title?.trim() && !r.amount && !r.isPaymentManual && !r.presetId
    );
    if (firstBlankIdx !== -1) {
      const next = [...bulkRows];
      next[firstBlankIdx] = newRow;
      setBulkRows(next);
    } else {
      setBulkRows((prev) => [...prev, newRow]);
    }

    setBulkBranchId(singleForm.branchId);
    setEntryMode("bulk");
    setMessage(`Added "${newRow.title}" (PKR ${Number(newRow.amount).toLocaleString()}) to bulk batch.`);
    setSingleForm((prev) => ({ ...prev, amount: "", notes: "" }));
  }

  // --- Add Item from Bulk Intake Station into Batch Table ---
  function handleAddIntakeToBatch() {
    setError("");
    const numAmount = Number(bulkIntake.amount);
    if (!bulkIntake.title.trim()) {
      setError("Please enter a title for this expense.");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid expense amount greater than 0.");
      return;
    }

    const newRow = {
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category: bulkIntake.category,
      presetId: bulkActivePresetId,
      title: bulkIntake.title.trim(),
      expenseDate: bulkIntake.expenseDate,
      amount: String(numAmount),
      paymentMethod: bulkIntake.paymentMethod || batchPaidFrom || "cash",
      isPaymentManual: Boolean(bulkIntake.paymentMethod && bulkIntake.paymentMethod !== batchPaidFrom),
      notes: bulkIntake.notes.trim()
    };

    const firstBlankIdx = bulkRows.findIndex(
      (r) => !r.title?.trim() && !r.amount && !r.isPaymentManual && !r.presetId
    );
    if (firstBlankIdx !== -1) {
      const next = [...bulkRows];
      next[firstBlankIdx] = newRow;
      setBulkRows(next);
    } else {
      setBulkRows((prev) => [...prev, newRow]);
    }

    setMessage(`Added "${newRow.title}" (PKR ${numAmount.toLocaleString()}) to batch list!`);

    // Reset amount & notes for next intake
    setBulkIntake((prev) => ({
      ...prev,
      amount: "",
      notes: ""
    }));
    bulkAmountInputRef.current?.focus();
  }

  // --- Batch Paid From Change Handler (Batch default + per-row override tracking) ---
  function handleBatchPaidFromChange(newMethod, allowToggle = false) {
    const targetMethod = allowToggle && batchPaidFrom === newMethod ? "" : newMethod;
    setBatchPaidFrom(targetMethod);
    setBulkIntake((prev) => ({ ...prev, paymentMethod: targetMethod }));
    // Update all rows whose Paid From was never touched individually
    setBulkRows((prev) =>
      prev.map((row) => {
        if (row.isPaymentManual) {
          // Keep their manually chosen source (Rule 10)
          return row;
        }
        return {
          ...row,
          paymentMethod: targetMethod
        };
      })
    );
  }

  // --- Per-row Paid From Change Handler ---
  function handleRowPaidFromChange(rowId, newMethod) {
    setBulkRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          paymentMethod: newMethod,
          isPaymentManual: true // mark that the user manually customized this row
        };
      })
    );
    // Clear error for paidFrom on this row if any
    setRowErrors((prev) => {
      if (!prev[rowId]?.paidFrom) return prev;
      const next = { ...prev };
      const updatedRowErr = { ...next[rowId] };
      delete updatedRowErr.paidFrom;
      if (Object.keys(updatedRowErr).length === 0) {
        delete next[rowId];
      } else {
        next[rowId] = updatedRowErr;
      }
      return next;
    });
  }

  // --- Bulk Multi-row Helpers ---
  function updateBulkRow(id, patch) {
    setBulkRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, ...patch };
        // If category preset is changed
        if (patch.presetId !== undefined) {
          if (patch.presetId === "") {
            updated.category = "misc";
          } else {
            const matchPreset = CATEGORY_PRESETS.find((p) => p.id === patch.presetId);
            if (matchPreset) {
              updated.category = matchPreset.category;
              if (!row.title || CATEGORY_PRESETS.some((p) => p.defaultTitle === row.title)) {
                updated.title = matchPreset.defaultTitle;
              }
            }
          }
        }
        return updated;
      })
    );

    // Clear field-specific error if editing that field
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      const updatedRowErr = { ...next[id] };
      if (patch.title !== undefined && patch.title.trim()) delete updatedRowErr.title;
      if (patch.amount !== undefined && Number(patch.amount) > 0) delete updatedRowErr.amount;
      if (patch.expenseDate !== undefined && patch.expenseDate) delete updatedRowErr.date;
      if (Object.keys(updatedRowErr).length === 0) {
        delete next[id];
      } else {
        next[id] = updatedRowErr;
      }
      return next;
    });
  }

  // Add one blank row at bottom (Rule 2)
  function addBlankBulkRow() {
    const newRow = {
      id: `batch-${Date.now()}-${bulkRows.length}-${Math.random().toString(36).slice(2, 7)}`,
      category: "misc",
      presetId: "",
      title: "",
      expenseDate: bulkIntake.expenseDate || new Date().toISOString().slice(0, 10),
      amount: "",
      paymentMethod: batchPaidFrom || "", // defaults to current batch default!
      isPaymentManual: false, // untouched!
      notes: ""
    };
    setBulkRows((prev) => [...prev, newRow]);
  }

  // Remove row (at least 1 row must remain, Rule 3)
  function removeBulkRow(id) {
    setBulkRows((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((r) => r.id !== id);
    });
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // Clear batch back to 5 fresh blank rows (Rule 7)
  function clearBulkBatch() {
    setBulkRows(createInitialBlankRows(5, batchPaidFrom, bulkIntake.expenseDate));
    setRowErrors({});
    setMessage("");
    setError("");
  }

  // Tab / Enter cell-to-cell navigation (Rule 13)
  function handleCellKeyDown(e, rowIndex, fieldName) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (fieldName === "title") {
        document.getElementById(`bulk-amount-${rowIndex}`)?.focus();
      } else if (fieldName === "amount" || fieldName === "notes") {
        if (rowIndex < bulkRows.length - 1) {
          document.getElementById(`bulk-title-${rowIndex + 1}`)?.focus();
        } else {
          addBlankBulkRow();
          setTimeout(() => {
            document.getElementById(`bulk-title-${rowIndex + 1}`)?.focus();
          }, 40);
        }
      }
    }
  }

  // --- Bulk Multi-row Submission with Smart Validation (Rules 5, 6, 7) ---
  async function handleBulkSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!canCreate) {
      setError("You do not have permission to record expenses.");
      return;
    }
    if (!bulkBranchId) {
      setError("Please select a destination branch for this batch.");
      return;
    }
    setError("");
    setMessage("");

    const { hasPartiallyFilled, newRowErrors, filledRows, blankCount } = classifyBulkRows(
      bulkRows,
      batchPaidFrom,
      bulkIntake.expenseDate
    );

    if (hasPartiallyFilled) {
      setRowErrors(newRowErrors);
      const errorList = Object.values(newRowErrors).flatMap((errObj) => Object.values(errObj));
      setError(errorList.join(" • "));
      return;
    }

    if (filledRows.length === 0) {
      setError("Please fill in at least one expense row with a title and amount.");
      return;
    }

    setIsSubmittingBulk(true);
    try {
      const validRowsPayload = filledRows.map((row) => {
        const selectedPayMethod = PAYMENT_METHODS.find((p) => p.id === row.paymentMethod);
        const paymentTag = selectedPayMethod ? `[Paid via: ${selectedPayMethod.label}]` : "";
        const finalNotes = [row.notes, paymentTag].filter(Boolean).join(" • ");
        return {
          category: row.category,
          title: row.title,
          expenseDate: row.expenseDate,
          amount: row.amount,
          notes: finalNotes || null
        };
      });

      const saved = await api.createExpenses({
        branchId: Number(bulkBranchId),
        expenses: validRowsPayload
      });

      const savedList = saved?.expenses || [];
      setExpenses((prev) => [...savedList, ...prev]);

      // Success message (Rule 6)
      let successMsg = `${filledRows.length} expense${filledRows.length === 1 ? "" : "s"} saved`;
      if (blankCount > 0) {
        successMsg += ` (${blankCount} blank row${blankCount === 1 ? "" : "s"} ignored)`;
      } else {
        successMsg += ` successfully!`;
      }
      setMessage(successMsg);

      // Reset Step 2 back to 5 fresh blank rows (Rule 7)
      setBulkRows(createInitialBlankRows(5, batchPaidFrom, bulkIntake.expenseDate));
      setRowErrors({});

      if (context?.refreshAll) {
        context.refreshAll();
      }
    } catch (submitError) {
      setError(submitError.message || "Failed to save bulk expenses.");
    } finally {
      setIsSubmittingBulk(false);
    }
  }

  // --- Edit Modal Handlers ---
  function startEdit(expense) {
    setEditTarget(expense);
    setEditForm({
      title: expense.title || "",
      amount: expense.amount || "",
      category: expense.category || "misc",
      expense_date: expense.expense_date ? String(expense.expense_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: expense.notes || "",
      branch_id: expense.branch_id || singleForm.branchId || ""
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!canEdit) {
      setError("Permission denied: You do not have permission to edit expenses.");
      return;
    }
    if (!editTarget) return;
    setIsSavingEdit(true);
    setError("");
    setMessage("");
    try {
      await api.updateExpense(editTarget.id, {
        title: editForm.title.trim(),
        amount: Number(editForm.amount),
        category: editForm.category,
        expenseDate: editForm.expense_date,
        notes: editForm.notes.trim() || null,
        branchId: editForm.branch_id ? Number(editForm.branch_id) : undefined
      });
      setMessage(`Expense "${editForm.title}" updated successfully.`);
      setEditTarget(null);
      loadExpenses();
      if (context?.refreshAll) {
        context.refreshAll();
      }
    } catch (err) {
      setError(err.message || "Failed to update expense");
    } finally {
      setIsSavingEdit(false);
    }
  }

  // --- Deletion Modal Handlers ---
  async function handleConfirmDelete(e) {
    e.preventDefault();
    if (!canDelete) {
      setError("Permission denied: You do not have permission to delete expenses.");
      return;
    }
    if (!deleteTarget) return;
    if (!deleteReason.trim()) {
      setError("Please provide a reason for deleting this expense.");
      return;
    }

    setIsDeleting(true);
    setError("");
    setMessage("");
    try {
      await api.deleteExpense(deleteTarget.id, deleteReason.trim());
      setMessage(`Expense "${deleteTarget.title}" deleted successfully.`);
      setDeleteTarget(null);
      setDeleteReason("");
      loadExpenses();
      if (context?.refreshAll) {
        context.refreshAll();
      }
    } catch (err) {
      setError(err.message || "Failed to delete expense");
    } finally {
      setIsDeleting(false);
    }
  }

  // --- Date and Category Filtering for Directory ---
  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    // Calculate start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const mondayStr = monday.toISOString().slice(0, 10);

    const list = Array.isArray(expenses) ? expenses : [];
    return list.filter((e) => {
      // Category filter
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;

      // Date range filter
      const expDate = e.expense_date ? String(e.expense_date).slice(0, 10) : "";
      if (dateFilter === "today" && expDate !== todayStr) return false;
      if (dateFilter === "week" && (expDate < mondayStr || expDate > todayStr)) return false;
      if (dateFilter === "month" && !expDate.startsWith(monthStr)) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q))
      );
    });
  }, [expenses, categoryFilter, dateFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paginatedExpenses = filteredExpenses.slice(start, start + pageSize);

  // Running total & stats of filled rows (Rule 14)
  const bulkBatchStats = useMemo(() => {
    const filled = bulkRows.filter((r) => {
      const num = Number(r.amount);
      return !isNaN(num) && num > 0 && r.title && r.title.trim();
    });
    const liveSum = bulkRows.reduce((acc, r) => {
      const num = Number(r.amount);
      return !isNaN(num) && num > 0 ? acc + num : acc;
    }, 0);

    return {
      count: filled.length,
      totalAmount: liveSum
    };
  }, [bulkRows]);

  return (
    <div>
      {/* Top View Tabs (Matching Sales & Purchases) */}
      <div
        className="nav-tabs"
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.6rem",
          marginBottom: "1.25rem"
        }}
      >
        <button
          type="button"
          className={`tab-btn ${activeTab === "entry" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("entry");
            setError("");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.55rem 1.15rem",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "0.9rem",
            border: activeTab === "entry" ? "1px solid var(--primary)" : "1px solid var(--border)",
            background: activeTab === "entry" ? "var(--primary)" : "var(--surface)",
            color: activeTab === "entry" ? "#ffffff" : "var(--text)"
          }}
        >
          <span>💸</span> {t("expenses.record_expense_tab", "Record Expense (Outflow Counter)")}
        </button>

        {canView && (
          <button
            type="button"
            className={`tab-btn ${activeTab === "directory" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("directory");
              setError("");
              loadExpenses();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "0.9rem",
              border: activeTab === "directory" ? "1px solid var(--primary)" : "1px solid var(--border)",
              background: activeTab === "directory" ? "var(--primary)" : "var(--surface)",
              color: activeTab === "directory" ? "#ffffff" : "var(--text)"
            }}
          >
            <span>📜</span> {t("expenses.directory_tab", "Expense Directory & History")} ({expenses.length})
          </button>
        )}
      </div>

      {/* Global alert feedback */}
      {error ? (
        <div className="alert error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="alert success" style={{ marginBottom: "1rem" }}>
          {message}
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* TAB 1: RECORD EXPENSE (2-COLUMN OUTFLOW COUNTER)          */}
      {/* ========================================================= */}
      {activeTab === "entry" && (
        <div className={entryMode === "single" ? "pos-layout" : "pos-bulk-layout"}>
          {/* LEFT COLUMN: OUTLET BAR, MODE TOGGLE & INTAKE STATION */}
          <div className="pos-main-column" style={entryMode === "bulk" ? { width: "100%", maxWidth: "100%" } : undefined}>
            {/* Top Outlet / Branch & Date Selector Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "0.85rem",
                background: "var(--surface)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.1rem" }}>🏪</span>
                <strong style={{ fontSize: "0.9rem" }}>{t("common.branch", "Destination Outlet")}:</strong>
                <select
                  value={entryMode === "single" ? singleForm.branchId : bulkBranchId}
                  onChange={(e) => {
                    setSingleForm((prev) => ({ ...prev, branchId: e.target.value }));
                    setBulkBranchId(e.target.value);
                  }}
                  style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", fontSize: "0.88rem" }}
                >
                  <option value="">{t("common.select_branch", "Select Branch")}</option>
                  {(context.branches || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1rem" }}>📅</span>
                <strong style={{ fontSize: "0.9rem" }}>{t("expenses.expense_date", "Date")}:</strong>
                <input
                  type="date"
                  value={entryMode === "single" ? singleForm.expenseDate : bulkIntake.expenseDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setSingleForm((prev) => ({ ...prev, expenseDate: newDate }));
                    setBulkIntake((prev) => ({ ...prev, expenseDate: newDate }));
                  }}
                  style={{ padding: "0.35rem 0.6rem", borderRadius: "6px", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Explicit Mode Switcher Toggle (Matching POS) */}
            <div className="pos-mode-toggle" style={{ marginBottom: "1rem" }}>
              <button
                type="button"
                className={`pos-mode-btn ${entryMode === "single" ? "active" : ""}`}
                onClick={() => setEntryMode("single")}
              >
                <span>⚡ {t("expenses.quick_single_tab", "Quick Single Entry")}</span>
              </button>
              <button
                type="button"
                className={`pos-mode-btn ${entryMode === "bulk" ? "active" : ""}`}
                onClick={() => setEntryMode("bulk")}
              >
                <span>📋 {t("expenses.bulk_tab", "Bulk / Multi-Row Entry")}</span>
                {bulkBatchStats.count > 0 && (
                  <span
                    style={{
                      background: "var(--primary)",
                      color: "#ffffff",
                      fontSize: "0.75rem",
                      padding: "1px 6px",
                      borderRadius: "9999px",
                      fontWeight: 700,
                      marginLeft: "4px"
                    }}
                  >
                    {bulkBatchStats.count}
                  </span>
                )}
              </button>
            </div>

            {/* MODE 1: QUICK SINGLE EXPENSE INTAKE */}
            {entryMode === "single" && (
              <div className="purchase-intake-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Category One-Click Chips */}
                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: 600 }}>{t("expenses.quick_category", "Quick Select Category")}</span>
                  </label>
                  <div className="expense-category-chips">
                    {CATEGORY_PRESETS.map((preset) => {
                      const isSelected =
                        activePresetId === preset.id ||
                        (singleForm.category === preset.category && singleForm.title === preset.defaultTitle);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={`expense-cat-chip ${isSelected ? "active" : ""}`}
                          onClick={() => handleSelectSinglePreset(preset)}
                        >
                          <span>{preset.icon}</span>
                          <span>{t(`expenses.presets.${preset.id}`, preset.label)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input with Currency Tag & Quick Shortcuts */}
                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: 600 }}>{t("expenses.amount_label", "Expense Amount (PKR)")} *</span>
                  </label>
                  <div className="expense-amount-wrap">
                    <span className="expense-amount-currency">PKR</span>
                    <input
                      ref={singleAmountInputRef}
                      type="number"
                      min="1"
                      step="any"
                      placeholder="0.00"
                      required
                      value={singleForm.amount}
                      onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSingleSubmit(e);
                        }
                      }}
                      className="expense-amount-input"
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                      autoFocus
                    />
                  </div>
                  {/* Fast Cash Shortcut Buttons */}
                  <div className="expense-quick-amounts">
                    <button
                      type="button"
                      className="expense-quick-btn"
                      onClick={() => handleSingleQuickAmount(100)}
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      className="expense-quick-btn"
                      onClick={() => handleSingleQuickAmount(500)}
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                    >
                      +500
                    </button>
                    <button
                      type="button"
                      className="expense-quick-btn"
                      onClick={() => handleSingleQuickAmount(1000)}
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                    >
                      +1,000
                    </button>
                    <button
                      type="button"
                      className="expense-quick-btn"
                      onClick={() => handleSingleQuickAmount(5000)}
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                    >
                      +5,000
                    </button>
                    <button
                      type="button"
                      className="expense-quick-btn clear"
                      onClick={() => handleSingleQuickAmount(null)}
                    >
                      ✕ {t("expenses.clear", "Clear")}
                    </button>
                  </div>
                </div>

                {/* Title / Description */}
                <label>
                  <span style={{ fontWeight: 600 }}>{t("expenses.title_label", "Expense Title / Item Description")} *</span>
                  <input
                    required
                    placeholder={t(
                      "expenses.title_placeholder",
                      "e.g. Daily staff lunch, Electric bill meter #14, Generator fuel..."
                    )}
                    value={singleForm.title}
                    onChange={(e) => setSingleForm({ ...singleForm, title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSingleSubmit(e);
                      }
                    }}
                  />
                </label>

                {/* Staging helper / Queue into Bulk Batch */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                  <span className="muted small">
                    {language === "ur"
                      ? "ایک سے زائد اخراجات کو ایک ساتھ محفوظ کرنے کے لیے بیچ میں شامل کریں۔"
                      : "Staging multiple expenses? You can queue this into a bulk batch before posting."}
                  </span>
                  <button
                    type="button"
                    className="secondary-btn btn-sm"
                    onClick={handleSendSingleToBatch}
                    disabled={!canCreate || !singleForm.amount || !singleForm.title}
                    style={{ whiteSpace: "nowrap" }}
                    title="Queue this item to bulk batch without saving immediately"
                  >
                    ➕ {t("expenses.add_to_batch", "Queue into Bulk Batch")}
                  </button>
                </div>
              </div>
            )}

            {/* MODE 2: MODERN BULK BATCH INTAKE */}
            {entryMode === "bulk" && (
              <div style={{ width: "100%" }}>
                {/* BULK BATCH ROWS WORKSPACE (Spacious full-width entry, Step 1 removed) */}
                <div className="expense-batch-card" style={{ width: "100%", margin: 0 }}>
                  <div
                    className="expense-batch-header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.85rem",
                      padding: "0.85rem 1.25rem"
                    }}
                  >
                    <strong style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem" }}>
                      <span>📋</span>
                      <span>{t("expenses.bulk_entry_title", "Bulk Expense Entries")}</span>
                      <span
                        style={{
                          background: bulkBatchStats.count > 0 ? "var(--primary)" : "var(--border)",
                          color: bulkBatchStats.count > 0 ? "#ffffff" : "var(--text-muted)",
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          fontWeight: 700
                        }}
                      >
                        {bulkRows.length} rows ({bulkBatchStats.count} filled)
                      </span>
                    </strong>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                      {/* Buttons of "Paid From" for default entry in rows */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-muted)" }}>
                          💳 {t("expenses.default_paid_from", "Default Paid From")}:
                        </span>
                        <div className="pos-pill-group" style={{ margin: 0, gap: "0.3rem" }}>
                          {PAYMENT_METHODS.map((pm) => (
                            <button
                              key={pm.id}
                              type="button"
                              className={`pos-pill-btn ${batchPaidFrom === pm.id ? "active" : ""}`}
                              onClick={() => handleBatchPaidFromChange(pm.id)}
                              style={{
                                padding: "0.35rem 0.75rem",
                                fontSize: "0.82rem",
                                borderRadius: "6px"
                              }}
                              title={`Set default source for rows to ${pm.label}`}
                            >
                              <span>{pm.icon}</span> {pm.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            className={`pos-pill-btn ${batchPaidFrom === "" ? "active" : ""}`}
                            onClick={() => handleBatchPaidFromChange("")}
                            style={{
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.82rem",
                              borderRadius: "6px"
                            }}
                            title="Leave empty to require picking Paid From on each row"
                          >
                            <span>⚪</span> {t("expenses.per_row", "Per Row (None)")}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="ghost-btn btn-sm"
                        onClick={clearBulkBatch}
                        style={{ color: "var(--text-muted)" }}
                        title="Reset table to 5 fresh blank rows"
                      >
                        🔄 {t("expenses.reset_rows", "Reset 5 Rows")}
                      </button>
                    </div>
                  </div>

                  {/* Batch Table */}
                  <div className="table-wrap">
                    <table className="expense-batch-table">
                      <thead>
                        <tr>
                          <th style={{ width: "35px", textAlign: "center" }}>#</th>
                          <th style={{ minWidth: "150px" }}>{t("expenses.category", "Category Preset")}</th>
                          <th style={{ minWidth: "175px" }}>{t("common.title", "Title / Description")} *</th>
                          <th style={{ minWidth: "140px" }}>{t("expenses.paid_from", "Paid From")}</th>
                          <th style={{ minWidth: "120px" }}>{t("expenses.amount", "Amount (PKR)")} *</th>
                          <th style={{ minWidth: "140px" }}>{t("expenses.notes", "Notes / Ref")}</th>
                          <th style={{ width: "45px", textAlign: "center" }}>✕</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((row, index) => {
                          const rowNum = index + 1;
                          const rowErr = rowErrors[row.id] || {};
                          return (
                            <tr key={row.id}>
                              {/* Visual sequential row number (Rule 4) */}
                              <td style={{ textAlign: "center", fontWeight: 700, color: "var(--text-muted)" }}>
                                {rowNum}
                              </td>

                              {/* Category Preset */}
                              <td>
                                <select
                                  value={row.presetId || ""}
                                  onChange={(e) => updateBulkRow(row.id, { presetId: e.target.value })}
                                  className="expense-batch-input"
                                >
                                  <option value="">-- Custom / Misc --</option>
                                  {CATEGORY_PRESETS.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.icon} {p.label}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Title / Description * */}
                              <td>
                                <input
                                  id={`bulk-title-${index}`}
                                  className={`expense-batch-input ${rowErr.title ? "input-error" : ""}`}
                                  placeholder="Title / description..."
                                  value={row.title}
                                  onChange={(e) => updateBulkRow(row.id, { title: e.target.value })}
                                  onKeyDown={(e) => handleCellKeyDown(e, index, "title")}
                                />
                                {rowErr.title && (
                                  <span className="expense-row-error-msg">{rowErr.title}</span>
                                )}
                              </td>

                              {/* Paid From Dropdown (Rule 9, 10, 11) */}
                              <td>
                                <select
                                  value={row.paymentMethod || ""}
                                  onChange={(e) => handleRowPaidFromChange(row.id, e.target.value)}
                                  className={`expense-batch-input ${rowErr.paidFrom ? "input-error" : ""}`}
                                >
                                  <option value="">-- Pick Source --</option>
                                  {PAYMENT_METHODS.map((pm) => (
                                    <option key={pm.id} value={pm.id}>
                                      {pm.icon} {pm.label}
                                    </option>
                                  ))}
                                </select>
                                {rowErr.paidFrom && (
                                  <span className="expense-row-error-msg">{rowErr.paidFrom}</span>
                                )}
                              </td>

                              {/* Amount (PKR) * */}
                              <td>
                                <input
                                  id={`bulk-amount-${index}`}
                                  type="number"
                                  min="1"
                                  step="any"
                                  placeholder="0.00"
                                  className={`expense-batch-input ${rowErr.amount ? "input-error" : ""}`}
                                  style={{ fontWeight: 700, direction: "ltr", unicodeBidi: "isolate" }}
                                  value={row.amount}
                                  onChange={(e) => updateBulkRow(row.id, { amount: e.target.value })}
                                  onKeyDown={(e) => handleCellKeyDown(e, index, "amount")}
                                />
                                {rowErr.amount && (
                                  <span className="expense-row-error-msg">{rowErr.amount}</span>
                                )}
                              </td>

                              {/* Notes / Ref */}
                              <td>
                                <input
                                  id={`bulk-notes-${index}`}
                                  className="expense-batch-input"
                                  placeholder="Voucher, notes..."
                                  value={row.notes}
                                  onChange={(e) => updateBulkRow(row.id, { notes: e.target.value })}
                                  onKeyDown={(e) => handleCellKeyDown(e, index, "notes")}
                                />
                              </td>

                              {/* Remove trash button (Rule 3) */}
                              <td style={{ textAlign: "center" }}>
                                <button
                                  className="ghost-btn"
                                  type="button"
                                  onClick={() => removeBulkRow(row.id)}
                                  title={bulkRows.length <= 1 ? "At least 1 row must always remain on screen" : `Remove Row ${rowNum}`}
                                  disabled={bulkRows.length <= 1}
                                  style={{
                                    color: bulkRows.length <= 1 ? "var(--text-muted)" : "var(--danger)",
                                    opacity: bulkRows.length <= 1 ? 0.35 : 1,
                                    cursor: bulkRows.length <= 1 ? "not-allowed" : "pointer",
                                    padding: "4px 8px"
                                  }}
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* BOTTOM ACTION BAR DIRECTLY BELOW ADDED ROWS (Total expense + Save button) */}
                  <div className="expense-batch-footer" style={{ padding: "1.1rem 1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      {/* Add Row Button */}
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={addBlankBulkRow}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          fontWeight: 700,
                          padding: "0.6rem 1.15rem",
                          fontSize: "0.92rem"
                        }}
                        title="Add a new blank row at bottom of batch table"
                      >
                        ➕ {t("expenses.add_row_btn", "Add Row")}
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                      {/* Total Expense Listed Here */}
                      <div
                        className="expense-batch-summary-box"
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "0.65rem",
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          padding: "0.45rem 1rem",
                          borderRadius: "8px"
                        }}
                      >
                        <span className="muted small" style={{ textTransform: "uppercase", fontWeight: 800, color: "var(--danger, #ef4444)" }}>
                          {t("expenses.total_expense", "Total Expense")}:
                        </span>
                        <span
                          className="expense-batch-total-tag"
                          style={{
                            color: "var(--danger, #ef4444)",
                            fontSize: "1.35rem",
                            fontWeight: 800,
                            direction: "ltr",
                            unicodeBidi: "isolate"
                          }}
                        >
                          PKR {bulkBatchStats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          ({bulkBatchStats.count} {bulkBatchStats.count === 1 ? "expense" : "expenses"} ready)
                        </span>
                      </div>

                      {/* Save Button Below Added Rows */}
                      <button
                        type="button"
                        className="expense-save-all-btn"
                        onClick={handleBulkSubmit}
                        disabled={!canCreate || isSubmittingBulk}
                        style={{
                          padding: "0.75rem 2rem",
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
                        }}
                      >
                        {isSubmittingBulk ? (
                          <span>⏳ {t("expenses.saving_batch", "Saving Batch...")}</span>
                        ) : (
                          <span>💾 {t("expenses.save_batch_btn", "Save Batch Expenses")}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: STICKY OUTFLOW VOUCHER & SETTLEMENT SIDEBAR (Single Mode Only) */}
          {entryMode === "single" && (
            <div className="pos-checkout-sidebar">
              {/* 1. Payment Source Card */}
              <div className="pos-checkout-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    💳 {t("expenses.paid_from", "Payment Source / Account")}
                  </span>
                  <span className="pos-item-badge phone" style={{ fontSize: "0.75rem" }}>
                    {PAYMENT_METHODS.find((p) => p.id === singleForm.paymentMethod)?.label || "Cash"}
                  </span>
                </div>

                <div className="pos-pill-group">
                  {PAYMENT_METHODS.map((pm) => {
                    const isActive = singleForm.paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        className={`pos-pill-btn ${isActive ? "active" : ""}`}
                        onClick={() => setSingleForm((prev) => ({ ...prev, paymentMethod: pm.id }))}
                      >
                        <span>{pm.icon}</span> {pm.label}
                      </button>
                    );
                  })}
                </div>

                <label style={{ display: "block", marginTop: "0.85rem" }}>
                  <span className="muted small">{t("expenses.notes", "Voucher Memo / Payee Notes (Optional)")}</span>
                  <input
                    type="text"
                    placeholder="Receipt #, vendor / payee, memo..."
                    value={singleForm.notes}
                    onChange={(e) => setSingleForm((prev) => ({ ...prev, notes: e.target.value }))}
                    style={{ width: "100%", padding: "0.45rem 0.65rem", fontSize: "0.85rem", marginTop: "0.25rem" }}
                  />
                </label>
              </div>

              {/* 2. Outflow Voucher Summary Card */}
              <div className="pos-checkout-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    🧾 {t("expenses.voucher_summary", "Outflow Voucher")}
                  </span>
                  <span className="pos-item-badge phone">
                    ⚡ {t("expenses.single_mode_badge", "Single Outflow")}
                  </span>
                </div>

                {/* Outlet & Date Breakdown */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                  <span className="muted small">{t("common.branch", "Destination Branch")}:</span>
                  <strong style={{ fontSize: "0.88rem" }}>
                    {(context.branches || []).find((b) => String(b.id) === String(singleForm.branchId))?.name || "Main Branch"}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                  <span className="muted small">{t("expenses.category", "Category")}:</span>
                  <strong style={{ fontSize: "0.88rem" }}>
                    {CATEGORY_PRESETS.find((p) => p.id === activePresetId)?.icon}{" "}
                    {CATEGORY_PRESETS.find((p) => p.id === activePresetId)?.label || singleForm.category}
                  </strong>
                </div>

                {singleForm.title && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                    <span className="muted small">{t("common.title", "Title")}:</span>
                    <strong style={{ fontSize: "0.85rem", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {singleForm.title}
                    </strong>
                  </div>
                )}

                {/* Grand Total Banner */}
                <div className="pos-total-banner" style={{ borderColor: "rgba(239, 68, 68, 0.35)", background: "rgba(239, 68, 68, 0.05)" }}>
                  <div>
                    <span className="muted small" style={{ textTransform: "uppercase", fontWeight: "700", color: "var(--danger, #ef4444)" }}>
                      {t("expenses.total_outflow", "Total Outflow")}
                    </span>
                    <div className="pos-total-amount" style={{ color: "var(--danger, #ef4444)", direction: "ltr", unicodeBidi: "isolate" }}>
                      PKR{" "}
                      {Number(singleForm.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "1.75rem", opacity: 0.85 }}>💸</span>
                  </div>
                </div>

                {/* Operational role warning if not cashier/manager */}
                {!canCreate && (
                  <div className="alert info" style={{ margin: "0 0 0.85rem 0", padding: "0.5rem 0.65rem", fontSize: "0.8rem", display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
                    <span>⚠️</span>
                    <div>
                      <strong>{language === "ur" ? "آپریشنل رول درکار ہے:" : "Role Notice:"}</strong>{" "}
                      {t("expenses.operational_role_alert", "Branch Manager or Cashier role is required to record expenses. Review history below.")}
                    </div>
                  </div>
                )}

                {/* Primary Action Button (Single Outflow) */}
                <button
                  type="button"
                  className="pos-pay-btn"
                  onClick={handleSingleSubmit}
                  disabled={!canCreate || isSubmittingSingle || !singleForm.amount || Number(singleForm.amount) <= 0 || !singleForm.title.trim()}
                  style={{
                    background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)"
                  }}
                >
                  {isSubmittingSingle ? (
                    <span>{t("expenses.recording", "Recording Expense...")}</span>
                  ) : !canCreate ? (
                    <span>⚠️ {t("expenses.restricted_btn", "Restricted to Manager/Staff")}</span>
                  ) : (
                    <span>
                      💸 {t("expenses.record_btn", "Record Expense")}
                      {singleForm.amount && Number(singleForm.amount) > 0
                        ? ` (PKR ${Number(singleForm.amount).toLocaleString()})`
                        : ""}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: EXPENSE DIRECTORY & HISTORY (FULL WIDTH VIEW)      */}
      {/* ========================================================= */}
      {activeTab === "directory" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* FINANCIAL PULSE KPI SUMMARY CARDS */}
          <div className="expense-kpi-grid" style={{ marginBottom: 0 }}>
            <div className="expense-kpi-card">
              <div className="expense-kpi-icon today">💸</div>
              <div className="expense-kpi-content">
                <div className="expense-kpi-label">{t("expenses.todays_outflow", "Today's Outflow")}</div>
                <div className="expense-kpi-value">
                  PKR {kpi.todayTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="expense-kpi-sub">
                  {kpi.todayCount} {t("expenses.transaction_count", "transactions today", { count: kpi.todayCount })}
                </div>
              </div>
            </div>

            <div className="expense-kpi-card">
              <div className="expense-kpi-icon month">📅</div>
              <div className="expense-kpi-content">
                <div className="expense-kpi-label">
                  {t("expenses.this_month", "This Month")} ({kpi.currentMonthLabel})
                </div>
                <div className="expense-kpi-value">
                  PKR {kpi.monthTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="expense-kpi-sub">
                  {kpi.monthCount} {t("expenses.total_entries", "total entries", { count: kpi.monthCount })}
                </div>
              </div>
            </div>

            <div className="expense-kpi-card">
              <div className="expense-kpi-icon category">📊</div>
              <div className="expense-kpi-content">
                <div className="expense-kpi-label">{t("expenses.top_category", "Top Expense Category")}</div>
                <div className="expense-kpi-value">{kpi.topCatLabel}</div>
                <div className="expense-kpi-sub">
                  {kpi.topCatAmt > 0
                    ? `PKR ${kpi.topCatAmt.toLocaleString()} (${kpi.topCatPct}% of monthly spend)`
                    : "No expenses recorded this month"}
                </div>
              </div>
            </div>
          </div>

          <SectionCard
            title={t("expenses.directory_title", "Expense Directory & History")}
          subtitle={t("expenses.directory_subtitle", "Filter, review, edit, or export historical branch expenditures.")}
          action={
            <button
              type="button"
              className="ghost-btn btn-sm"
              onClick={() => exportToCSV("Branch_Expenses", filteredExpenses)}
              title="Download CSV export of currently filtered expenses"
            >
              📥 {t("common.export_csv", "Export CSV")}
            </button>
          }
        >
          {/* Quick Date Period Filter Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              flexWrap: "wrap",
              marginBottom: "0.85rem"
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--text-muted)"
              }}
            >
              {t("expenses.period", "Period")}:
            </span>
            <div className="expense-filter-pills">
              <button
                type="button"
                className={`expense-filter-pill ${dateFilter === "all" ? "active" : ""}`}
                onClick={() => {
                  setDateFilter("all");
                  setPage(1);
                }}
              >
                {t("expenses.all_time", "All Time")}
              </button>
              <button
                type="button"
                className={`expense-filter-pill ${dateFilter === "today" ? "active" : ""}`}
                onClick={() => {
                  setDateFilter("today");
                  setPage(1);
                }}
              >
                {t("expenses.today", "Today")}
              </button>
              <button
                type="button"
                className={`expense-filter-pill ${dateFilter === "week" ? "active" : ""}`}
                onClick={() => {
                  setDateFilter("week");
                  setPage(1);
                }}
              >
                {t("expenses.this_week", "This Week")}
              </button>
              <button
                type="button"
                className={`expense-filter-pill ${dateFilter === "month" ? "active" : ""}`}
                onClick={() => {
                  setDateFilter("month");
                  setPage(1);
                }}
              >
                {t("expenses.this_month_filter", "This Month")}
              </button>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="toolbar wrap" style={{ marginBottom: "1rem" }}>
            <input
              style={{ minWidth: "220px", flex: 2 }}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("expenses.search_placeholder", "🔍 Search title, notes, payee, or amount...")}
            />

            <select
              style={{ flex: 1, minWidth: "160px" }}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t("expenses.all_categories", "All Categories")}</option>
              <option value="salary">{t("expenses.presets.salary", "Salary / Wages")}</option>
              <option value="utility_bill">{t("expenses.presets.utility", "Utility Bills")}</option>
              <option value="transport">{t("expenses.presets.fuel", "Transport & Fuel")}</option>
              <option value="misc">{t("expenses.presets.misc", "Miscellaneous")}</option>
            </select>

            {(searchQuery || categoryFilter !== "all" || dateFilter !== "all") && (
              <button
                type="button"
                className="secondary-btn btn-sm"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setDateFilter("all");
                  setPage(1);
                }}
              >
                {t("common.reset_filters", "Reset Filters")}
              </button>
            )}
          </div>

          {/* Results Summary Subtitle */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.6rem"
            }}
          >
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {t("common.showing", "Showing")} {filteredExpenses.length} {t("expenses.directory_count", "records", { count: filteredExpenses.length })}
            </span>
            <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>
              {t("expenses.filtered_total", "Filtered Outflow Total")}: PKR{" "}
              {filteredExpenses
                .reduce((sum, e) => sum + Number(e.amount || 0), 0)
                .toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Full-width Responsive Table for Expense Directory */}
          <div className="table-wrap" style={{ borderRadius: "8px", border: "1px solid var(--border)", overflowX: "auto", width: "100%" }}>
            <table style={{ minWidth: "780px", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "110px", minWidth: "110px", whiteSpace: "nowrap" }}>{t("common.date", "Date")}</th>
                  <th style={{ width: "130px", minWidth: "130px", whiteSpace: "nowrap" }}>{t("expenses.category", "Category")}</th>
                  <th style={{ minWidth: "180px", whiteSpace: "nowrap" }}>{t("expenses.title_label", "Title / Item Description")}</th>
                  <th style={{ width: "120px", minWidth: "120px", whiteSpace: "nowrap" }}>{t("common.branch", "Branch")}</th>
                  <th style={{ width: "135px", minWidth: "135px", textAlign: isRtl ? "left" : "right", whiteSpace: "nowrap" }}>
                    {t("expenses.amount", "Amount (PKR)")}
                  </th>
                  <th style={{ width: "100px", minWidth: "100px", textAlign: "center", whiteSpace: "nowrap" }}>{t("common.actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      {expenses.length > 0
                        ? t("expenses.no_matching_filter", "No expenses match the current filter criteria.")
                        : t("expenses.no_expenses_recorded", "No branch expenses recorded yet. Use the 'Record Expense' tab to log your first expenditure!")}
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((expense) => {
                    const badgeClass = `expense-badge-${expense.category || "misc"}`;
                    const branchName =
                      (context.branches || []).find((b) => Number(b.id) === Number(expense.branch_id))?.name ||
                      "Branch #" + expense.branch_id;

                    return (
                      <tr key={expense.id}>
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                          📅 {expense.expense_date ? String(expense.expense_date).slice(0, 10) : ""}
                        </td>
                        <td>
                          <span className={`badge ${badgeClass}`}>
                            {CATEGORY_LABELS[expense.category] || expense.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <strong style={{ fontSize: "0.92rem" }}>{expense.title}</strong>
                            {expense.notes && (
                              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                {expense.notes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          🏪 {branchName}
                        </td>
                        <td
                          style={{
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            textAlign: isRtl ? "left" : "right",
                            whiteSpace: "nowrap"
                          }}
                        >
                          PKR {Number(expense.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                            {canEdit ? (
                              <button
                                type="button"
                                className="ghost-btn"
                                style={{ padding: "0.25rem 0.45rem", fontSize: "0.8rem" }}
                                onClick={() => startEdit(expense)}
                                title="Edit expense"
                              >
                                ✏️
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="ghost-btn"
                                style={{ padding: "0.25rem 0.45rem", opacity: 0.4, cursor: "not-allowed" }}
                                title="Edit permission required"
                              >
                                🔒
                              </button>
                            )}

                            {canDelete ? (
                              <button
                                type="button"
                                className="ghost-btn"
                                style={{ color: "#ef4444", padding: "0.25rem 0.45rem", fontSize: "0.8rem" }}
                                onClick={() => {
                                  setDeleteReason("");
                                  setDeleteTarget(expense);
                                }}
                                title="Delete expense"
                              >
                                🗑️
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="ghost-btn"
                                style={{ padding: "0.25rem 0.45rem", opacity: 0.4, cursor: "not-allowed" }}
                                title="Delete permission required"
                              >
                                🔒
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={currentPage}
            pageSize={pageSize}
            total={filteredExpenses.length}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </SectionCard>
      </div>
    )}

      {/* EDIT EXPENSE MODAL */}
      {editTarget && (
        <div className="modal-backdrop" onClick={() => !isSavingEdit && setEditTarget(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-header">
                <h3>{t("expenses.edit_expense", "Edit Expense")}</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSavingEdit}
                  onClick={() => setEditTarget(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <label>
                  <span>{t("common.title", "Title")} *</span>
                  <input
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <label>
                    <span>{t("expenses.category", "Category")} *</span>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    >
                      <option value="salary">Salary / Wages</option>
                      <option value="utility_bill">Utility Bill</option>
                      <option value="transport">Transport</option>
                      <option value="misc">Miscellaneous</option>
                    </select>
                  </label>

                  <label>
                    <span>{t("expenses.amount", "Amount (PKR)")} *</span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <label>
                    <span>{t("common.date", "Date")} *</span>
                    <input
                      type="date"
                      required
                      value={editForm.expense_date}
                      onChange={(e) => setEditForm({ ...editForm, expense_date: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>{t("common.branch", "Branch")}</span>
                    <select
                      value={editForm.branch_id}
                      onChange={(e) => setEditForm({ ...editForm, branch_id: e.target.value })}
                    >
                      {(context.branches || []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span>{t("expenses.notes", "Notes")}</span>
                  <input
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Details, bill number, payee..."
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSavingEdit}
                  onClick={() => setEditTarget(null)}
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSavingEdit || !editForm.title || !editForm.amount || !canEdit}
                  title={!canEdit ? "Permission denied: Cannot edit expense" : ""}
                >
                  {isSavingEdit ? t("common.saving", "Saving...") : t("common.save_changes", "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL ON DELETING EXPENSE */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleConfirmDelete}>
              <div className="modal-header">
                <h3>{t("expenses.confirm_delete", "Confirm Expense Deletion")}</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1rem"
                  }}
                >
                  <h4 style={{ color: "#ef4444", margin: "0 0 0.5rem 0" }}>
                    {t("common.confirm_action", "Do you want to perform this?")}
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.92rem" }}>
                    Are you sure you want to delete expense <strong>"{deleteTarget.title}"</strong> for{" "}
                    <strong>
                      PKR {Number(deleteTarget.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </strong>
                    ?
                  </p>
                  <p className="muted small" style={{ margin: "0.5rem 0 0 0" }}>
                    This will remove the expense from branch ledgers and record it in the TOP Admin deleted audit trail.
                  </p>
                </div>

                <label className="full-span" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <span>{t("common.reason_for_deletion", "Reason for Deletion")} *</span>
                  <input
                    required
                    placeholder="e.g. Duplicate entry, incorrect category, cancelled payment..."
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ background: "#ef4444", borderColor: "#dc2626" }}
                  disabled={isDeleting || !deleteReason.trim() || !canDelete}
                  title={!canDelete ? "Permission denied: Cannot delete expense" : ""}
                >
                  {isDeleting ? t("common.deleting", "Deleting...") : t("common.yes_delete", "Yes, Delete Expense")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
