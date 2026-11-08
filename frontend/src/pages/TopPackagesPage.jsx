import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { SectionCard } from "../components/SectionCard.jsx";
import { ToggleSwitch } from "../components/ToggleSwitch.jsx";
import { SearchableSelect } from "../components/SearchableSelect.jsx";
import {
  TableActionHeader,
  TableActionCell,
  TableActionButton
} from "../components/TableActionColumn.jsx";

import { SYSTEM_MODULES } from "../services/rightsManagementService.js";
export { SYSTEM_MODULES };

// Fixed duration options: 1 Month / 2 Months / 3 Months / 6 Months / 1 Year
export const FIXED_DURATIONS = [
  { key: "1_month", label: "1 Month", durationValue: 1, durationUnit: "month", months: 1 },
  { key: "2_months", label: "2 Months", durationValue: 2, durationUnit: "month", months: 2 },
  { key: "3_months", label: "3 Months", durationValue: 3, durationUnit: "month", months: 3 },
  { key: "6_months", label: "6 Months", durationValue: 6, durationUnit: "month", months: 6 },
  { key: "1_year", label: "1 Year", durationValue: 1, durationUnit: "year", months: 12 }
];

export function getDurationKeyFromPlan(plan) {
  if (!plan) return "1_month";
  const val = Number(plan.duration_value) || 1;
  const unit = (plan.duration_unit || "month").toLowerCase();
  if (unit === "year") return val === 1 ? "1_year" : "1_year";
  if (val === 2) return "2_months";
  if (val === 3) return "3_months";
  if (val === 6) return "6_months";
  if (val === 12) return "1_year";
  return "1_month";
}

export function formatDurationLabel(plan) {
  const key = getDurationKeyFromPlan(plan);
  const found = FIXED_DURATIONS.find((d) => d.key === key);
  return found ? found.label : `${plan.duration_value || 1} ${plan.duration_unit || "month"}(s)`;
}

export function computeEndDate(startDateStr, durationKeyOrPlan) {
  if (!startDateStr) return "";
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return "";

  let monthsToAdd = 1;
  let isYear = false;
  let yearCount = 1;

  if (typeof durationKeyOrPlan === "string") {
    const found = FIXED_DURATIONS.find((d) => d.key === durationKeyOrPlan);
    if (found) {
      if (found.durationUnit === "year") {
        isYear = true;
        yearCount = found.durationValue;
      } else {
        monthsToAdd = found.durationValue;
      }
    }
  } else if (durationKeyOrPlan) {
    const unit = (durationKeyOrPlan.duration_unit || "month").toLowerCase();
    const val = Number(durationKeyOrPlan.duration_value) || 1;
    if (unit === "year") {
      isYear = true;
      yearCount = val;
    } else {
      monthsToAdd = val;
    }
  }

  if (isYear) {
    d.setFullYear(d.getFullYear() + yearCount);
  } else {
    d.setMonth(d.getMonth() + monthsToAdd);
  }

  return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
}

export const VALID_MODULE_KEYS = new Set(SYSTEM_MODULES.map((m) => m.key));

export function sanitizeAllowedPages(pages) {
  if (!Array.isArray(pages)) return [];
  return Array.from(new Set(pages.filter((key) => VALID_MODULE_KEYS.has(key))));
}

export function TopPackagesPage({ initialView = "packages" }) {
  // Simple 2-screen architecture: "packages" | "subscriptions"
  const [activeScreen, setActiveScreen] = useState(
    initialView === "branches" || initialView === "subscriptions" ? "subscriptions" : "packages"
  );

  useEffect(() => {
    if (initialView === "branches" || initialView === "subscriptions") {
      setActiveScreen("subscriptions");
    } else {
      setActiveScreen("packages");
    }
  }, [initialView]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingModules, setSavingModules] = useState(false);

  // Core Data
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Selected package for module blocks below the table
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  // Draft of module keys for the selected package (allows toggling switches before clicking Save)
  const [draftModulesByPlan, setDraftModulesByPlan] = useState({});

  // Screen 1: Packages State
  const [packageSearch, setPackageSearch] = useState("");
  const [packagePage, setPackagePage] = useState(1);
  const [packagePageSize, setPackagePageSize] = useState(10);

  // Screen 2: Subscriptions State
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("all");
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(10);

  // Modal 1: Create / Edit / Clone Package
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageForm, setPackageForm] = useState({
    id: null,
    isClone: false,
    cloneSourcePlanName: "",
    allowedPages: null,
    name: "",
    durationKey: "1_month",
    price: "200",
    maxBranches: 1,
    isActive: 1,
    subscribersCount: 0
  });

  // Modal 2: Assign / Change Package Dialog
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    branchId: "",
    planId: "",
    startDate: new Date().toISOString().slice(0, 10),
    isBackdated: false
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [plansData, subsData, branchesData] = await Promise.all([
        api.subscriptionPlans().catch(() => []),
        api.branchSubscriptions().catch(() => []),
        api.topBranches("?pageSize=1000").catch(() => ({ data: [] }))
      ]);

      const pList = Array.isArray(plansData) ? plansData : [];
      setPlans(pList);
      setSubscriptions(Array.isArray(subsData) ? subsData : []);
      const bList = Array.isArray(branchesData?.data) ? branchesData.data : (Array.isArray(branchesData) ? branchesData : []);
      setCustomers(bList);

      // Initialize selected plan and draft modules
      if (pList.length > 0) {
        setSelectedPlanId((prev) => {
          if (prev && pList.some((p) => p.id === prev)) return prev;
          return pList[0].id;
        });

        const initialDrafts = {};
        for (const p of pList) {
          const sanitized = sanitizeAllowedPages(p.allowedPages);
          p.allowedPages = sanitized;
          initialDrafts[p.id] = sanitized.length ? [...sanitized] : SYSTEM_MODULES.map((m) => m.key);
        }
        setDraftModulesByPlan(initialDrafts);
      }
    } catch (err) {
      setError(err.message || "Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }

  // Active packages only for customer assignment
  const activePlans = useMemo(() => {
    return plans.filter((p) => Boolean(p.is_active));
  }, [plans]);

  // Selected package object
  const selectedPlan = useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || plans[0] || null;
  }, [plans, selectedPlanId]);

  // Current draft allowed modules for the selected package
  const currentDraftModules = useMemo(() => {
    if (!selectedPlan) return [];
    if (draftModulesByPlan[selectedPlan.id] !== undefined) {
      return sanitizeAllowedPages(draftModulesByPlan[selectedPlan.id]);
    }
    return sanitizeAllowedPages(selectedPlan.allowedPages);
  }, [draftModulesByPlan, selectedPlan]);

  // Check if there are unsaved changes for the selected package
  const hasUnsavedModuleChanges = useMemo(() => {
    if (!selectedPlan) return false;
    const original = sanitizeAllowedPages(selectedPlan.allowedPages).sort();
    const draft = [...currentDraftModules].sort();
    if (original.length !== draft.length) return true;
    for (let i = 0; i < original.length; i++) {
      if (original[i] !== draft[i]) return true;
    }
    return false;
  }, [selectedPlan, currentDraftModules]);

  // Grouped system modules for the blocks section
  const groupedModules = useMemo(() => {
    const groups = {};
    for (const mod of SYSTEM_MODULES) {
      if (!groups[mod.category]) groups[mod.category] = [];
      groups[mod.category].push(mod);
    }
    return groups;
  }, []);

  // Filtered packages
  const filteredPlans = useMemo(() => {
    let result = [...plans];
    if (packageSearch.trim()) {
      const q = packageSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [plans, packageSearch]);

  const totalPackagePages = Math.ceil(filteredPlans.length / packagePageSize) || 1;
  const paginatedPlans = useMemo(() => {
    const start = (packagePage - 1) * packagePageSize;
    return filteredPlans.slice(start, start + packagePageSize);
  }, [filteredPlans, packagePage, packagePageSize]);

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    let result = [...subscriptions];

    if (subSearch.trim()) {
      const q = subSearch.toLowerCase().trim();
      result = result.filter((s) => {
        const custName = (s.customer_name || s.branch_name || "").toLowerCase();
        const bizName = (s.business_name || "").toLowerCase();
        const code = (s.branch_code || "").toLowerCase();
        const pkg = (s.package_name || s.plan_name || "").toLowerCase();
        return custName.includes(q) || bizName.includes(q) || code.includes(q) || pkg.includes(q);
      });
    }

    if (subStatusFilter !== "all") {
      result = result.filter((s) => s.status === subStatusFilter);
    }

    return result;
  }, [subscriptions, subSearch, subStatusFilter]);

  const totalSubPages = Math.ceil(filteredSubscriptions.length / subPageSize) || 1;
  const paginatedSubs = useMemo(() => {
    const start = (subPage - 1) * subPageSize;
    return filteredSubscriptions.slice(start, start + subPageSize);
  }, [filteredSubscriptions, subPage, subPageSize]);

  // ==========================================
  // PACKAGE ACTIONS
  // ==========================================
  function handleOpenCreatePackage() {
    setPackageForm({
      id: null,
      isClone: false,
      cloneSourcePlanName: "",
      allowedPages: null,
      name: "",
      durationKey: "1_month",
      price: "200",
      maxBranches: 1,
      isActive: 1,
      subscribersCount: 0
    });
    setError("");
    setMessage("");
    setPackageModalOpen(true);
  }

  function handleOpenEditPackage(plan) {
    setPackageForm({
      id: plan.id,
      isClone: false,
      cloneSourcePlanName: "",
      allowedPages: plan.allowedPages || null,
      name: plan.name,
      durationKey: getDurationKeyFromPlan(plan),
      price: String(Number(plan.price || 0)),
      maxBranches: plan.max_branches !== undefined ? Number(plan.max_branches) : 1,
      isActive: plan.is_active ? 1 : 0,
      subscribersCount: Number(plan.subscribersCount || plan.assigned_branches_count || 0)
    });
    setError("");
    setMessage("");
    setPackageModalOpen(true);
  }

  function handleOpenClonePackage(plan) {
    const modulesToClone = sanitizeAllowedPages(draftModulesByPlan[plan.id] || plan.allowedPages || []);
    const currentDuration = getDurationKeyFromPlan(plan);
    let defaultNewDuration = currentDuration;
    if (currentDuration === "1_month") defaultNewDuration = "2_months";
    else if (currentDuration === "2_months") defaultNewDuration = "3_months";
    else if (currentDuration === "3_months") defaultNewDuration = "6_months";

    setPackageForm({
      id: null,
      isClone: true,
      cloneSourcePlanName: plan.name,
      allowedPages: [...modulesToClone],
      name: `${plan.name} (Copy)`,
      durationKey: defaultNewDuration,
      price: String(Number(plan.price || 0)),
      maxBranches: plan.max_branches !== undefined ? Number(plan.max_branches) : 1,
      isActive: 1,
      subscribersCount: 0
    });
    setError("");
    setMessage("");
    setPackageModalOpen(true);
  }

  async function handleSavePackage(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!packageForm.name.trim()) {
      setError("Package name is required.");
      return;
    }

    const priceNum = Number(packageForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Price must be 0 or greater (0 = free package).");
      return;
    }

    const maxBranchesNum = Number(packageForm.maxBranches);
    if (isNaN(maxBranchesNum) || maxBranchesNum < 0) {
      setError("Allowed branches must be 0 or greater (0 = unlimited branches).");
      return;
    }

    const durationOpt = FIXED_DURATIONS.find((d) => d.key === packageForm.durationKey) || FIXED_DURATIONS[0];

    const payload = {
      name: packageForm.name.trim(),
      price: priceNum,
      billingPeriod: durationOpt.key,
      durationValue: durationOpt.durationValue,
      durationUnit: durationOpt.durationUnit,
      maxBranches: maxBranchesNum,
      isActive: packageForm.isActive ? 1 : 0
    };

    setIsSubmitting(true);
    try {
      if (packageForm.id) {
        await api.updateSubscriptionPlan(packageForm.id, payload);
        setMessage(`Subscription package '${payload.name}' updated successfully!`);
      } else {
        const pagesToUse =
          packageForm.allowedPages && packageForm.allowedPages.length > 0
            ? sanitizeAllowedPages(packageForm.allowedPages)
            : SYSTEM_MODULES.slice(0, 8).map((m) => m.key);

        const created = await api.createSubscriptionPlan({
          ...payload,
          allowedPages: pagesToUse
        });

        setMessage(
          packageForm.isClone
            ? `Package '${created.name}' cloned successfully with all ${pagesToUse.length} module permissions copied from '${packageForm.cloneSourcePlanName}'!`
            : `Subscription package '${created.name}' created successfully! You can toggle its module blocks below.`
        );
        setSelectedPlanId(created.id);
      }
      setPackageModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save package");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTogglePackageActive(plan) {
    setError("");
    setMessage("");
    try {
      const nextActive = plan.is_active ? 0 : 1;
      await api.toggleSubscriptionPlan(plan.id, nextActive);
      setMessage(
        `Package '${plan.name}' is now ${nextActive ? "Active" : "Inactive"}.${
          !nextActive ? " (Existing subscribers keep working until their term ends)" : ""
        }`
      );
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update package status");
    }
  }

  async function handleDeletePackage(plan) {
    const subsCount = Number(plan.subscribersCount || plan.assigned_branches_count || 0);
    if (subsCount > 0) {
      setError(`Cannot delete package '${plan.name}' because it has ${subsCount} subscriber(s). You can deactivate it instead.`);
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to permanently delete package '${plan.name}'?`);
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await api.deleteSubscriptionPlan(plan.id);
      setMessage(`Package '${plan.name}' deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete package");
    }
  }

  // ==========================================
  // MODULE BLOCKS SWITCH & SAVE HANDLERS
  // ==========================================
  function handleToggleModuleSwitch(moduleKey, nextState) {
    if (!selectedPlan) return;
    const planId = selectedPlan.id;
    const current = currentDraftModules;
    const next = nextState
      ? (current.includes(moduleKey) ? current : [...current, moduleKey])
      : current.filter((k) => k !== moduleKey);

    setDraftModulesByPlan({
      ...draftModulesByPlan,
      [planId]: next
    });
  }

  function handleSelectAllModulesForSelectedPlan() {
    if (!selectedPlan) return;
    setDraftModulesByPlan({
      ...draftModulesByPlan,
      [selectedPlan.id]: SYSTEM_MODULES.map((m) => m.key)
    });
  }

  function handleClearAllModulesForSelectedPlan() {
    if (!selectedPlan) return;
    setDraftModulesByPlan({
      ...draftModulesByPlan,
      [selectedPlan.id]: []
    });
  }

  function handleScrollToModuleBlocks(plan) {
    setSelectedPlanId(plan.id);
    setTimeout(() => {
      const anchor = document.getElementById("module-blocks-grid-anchor");
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        anchor.style.transition = "box-shadow 0.3s ease, transform 0.2s ease";
        anchor.style.boxShadow = "0 0 0 3px var(--primary)";
        setTimeout(() => {
          anchor.style.boxShadow = "none";
        }, 1400);
      } else {
        const fallback = document.getElementById("package-module-blocks-section");
        if (fallback) fallback.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 70);
  }

  async function handleSaveModuleAccess() {
    if (!selectedPlan) return;
    setError("");
    setMessage("");

    if (currentDraftModules.length === 0) {
      setError(`At least one module must be included for package '${selectedPlan.name}'.`);
      return;
    }

    const subsCount = Number(selectedPlan.subscribersCount || selectedPlan.assigned_branches_count || 0);
    if (subsCount > 0) {
      const confirmed = window.confirm(
        `⚠️ This will immediately update module access for ${subsCount} subscriber(s) of package '${selectedPlan.name}'. Continue?`
      );
      if (!confirmed) return;
    }

    setSavingModules(true);
    const targetPlanId = selectedPlan.id;
    const sanitizedModules = sanitizeAllowedPages(currentDraftModules);
    try {
      await api.updateSubscriptionPlan(targetPlanId, {
        allowedPages: sanitizedModules
      });

      // Update local plans state
      setPlans((prev) =>
        prev.map((p) =>
          p.id === targetPlanId ? { ...p, allowedPages: sanitizedModules } : p
        )
      );

      setMessage(`Module access for package '${selectedPlan.name}' saved successfully! (${sanitizedModules.length} of ${SYSTEM_MODULES.length} modules included).`);

      // Once saved, automatically scroll back to the same package row in the table above!
      setTimeout(() => {
        const rowEl = document.getElementById(`package-row-${targetPlanId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
          rowEl.style.transition = "background-color 0.4s ease";
          rowEl.style.backgroundColor = "rgba(16, 185, 129, 0.25)";
          setTimeout(() => {
            rowEl.style.backgroundColor = "";
          }, 1800);
        } else {
          const tableEl = document.getElementById("packages-table-section");
          if (tableEl) {
            tableEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }, 100);
    } catch (err) {
      setError(err.message || "Failed to save module access");
    } finally {
      setSavingModules(false);
    }
  }

  // ==========================================
  // SUBSCRIPTION ACTIONS
  // ==========================================
  function handleOpenAssignModal(prefillSub = null) {
    const today = new Date().toISOString().slice(0, 10);
    const defaultPlan = activePlans[0] || plans[0];

    setAssignForm({
      branchId: prefillSub ? String(prefillSub.branch_id) : (customers[0]?.id ? String(customers[0].id) : ""),
      planId: prefillSub?.plan_id ? String(prefillSub.plan_id) : (defaultPlan ? String(defaultPlan.id) : ""),
      startDate: today,
      isBackdated: false
    });

    setError("");
    setMessage("");
    setAssignModalOpen(true);
  }

  async function handleSaveAssignment(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!assignForm.branchId) {
      setError("Please pick a customer.");
      return;
    }

    if (!assignForm.planId) {
      setError("Please pick an active package.");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (!assignForm.isBackdated && assignForm.startDate < todayStr) {
      setError("Start date cannot be in the past when creating a new subscription. Check 'Backdate subscription' if recording an existing one.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.assignBranchSubscription({
        branchId: Number(assignForm.branchId),
        planId: Number(assignForm.planId),
        startDate: assignForm.startDate,
        isBackdated: assignForm.isBackdated
      });

      setMessage(res.message || "Package assigned successfully!");
      setAssignModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to assign package");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelSubscription(sub) {
    const custName = sub.customer_name || sub.branch_name;
    const confirmed = window.confirm(
      `Are you sure you want to cancel the subscription for '${custName}'? The customer will lose access to paid modules immediately.`
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await api.cancelBranchSubscription(sub.branch_id);
      setMessage(`Subscription for '${custName}' has been cancelled.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to cancel subscription");
    }
  }

  // Auto-calculated end date in the assignment modal
  const selectedAssignPlan = useMemo(() => {
    return plans.find((p) => String(p.id) === String(assignForm.planId));
  }, [plans, assignForm.planId]);

  const computedAssignEndDate = useMemo(() => {
    return computeEndDate(assignForm.startDate, selectedAssignPlan);
  }, [assignForm.startDate, selectedAssignPlan]);

  return (
    <div className="page-container">
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>
            {activeScreen === "subscriptions" ? "Assign Branch Packages" : "Subscription Packages"}
          </h1>
          <p className="muted small" style={{ margin: "0.25rem 0 0 0" }}>
            {activeScreen === "subscriptions"
              ? "Assign different subscription packages created to different customer store branches."
              : "A customer's module access comes ONLY from their active package. Nothing else."}
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          <span>{error}</span>
          <button type="button" className="close-btn" onClick={() => setError("")}>✕</button>
        </div>
      )}
      {message && (
        <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
          <span>{message}</span>
          <button type="button" className="close-btn" onClick={() => setMessage("")}>✕</button>
        </div>
      )}

      {/* ========================================================
          SCREEN 1: PACKAGES & MODULE ACCESS BLOCKS
          ======================================================== */}
      {activeScreen === "packages" && (
        <div className="page-stack" style={{ gap: "1.5rem" }} id="packages-table-section">
          {/* Top Section: Table of Packages */}
          <SectionCard
            title="Configured Subscription Packages"
            subtitle="Click '🛡️ Modules ⬇' on any package to smoothly scroll down and manage its module blocks. Module access comes only from the active package."
            action={
              <button
                type="button"
                className="primary-btn btn-sm"
                onClick={handleOpenCreatePackage}
              >
                ➕ Create Package
              </button>
            }
          >
            {/* Search Toolbar */}
            <div className="table-filter-bar">
              <div className="search-field">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search packages by name or description..."
                  value={packageSearch}
                  onChange={(e) => {
                    setPackageSearch(e.target.value);
                    setPackagePage(1);
                  }}
                />
                {packageSearch && (
                  <button type="button" className="clear-search-btn" onClick={() => setPackageSearch("")}>✕</button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="empty-state">Loading subscription packages...</div>
            ) : paginatedPlans.length === 0 ? (
              <div className="empty-state">No subscription packages found. Click &quot;Create Package&quot; to add one.</div>
            ) : (
              <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
                <table style={{ width: "100%", tableLayout: "auto", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: "120px", padding: "0.55rem 0.6rem" }}>Name</th>
                      <th style={{ whiteSpace: "nowrap", padding: "0.55rem 0.5rem" }}>Duration</th>
                      <th style={{ whiteSpace: "nowrap", padding: "0.55rem 0.5rem" }}>Price</th>
                      <th style={{ whiteSpace: "nowrap", padding: "0.55rem 0.5rem" }}>Allowed Branches</th>
                      <th style={{ whiteSpace: "nowrap", padding: "0.55rem 0.5rem" }}>Modules</th>
                      <th style={{ whiteSpace: "nowrap", padding: "0.55rem 0.5rem" }}>Subscribers</th>
                      <th style={{ textAlign: "center", whiteSpace: "nowrap", padding: "0.55rem 0.4rem" }}>Status</th>
                      <TableActionHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPlans.map((plan) => {
                      const isSelected = selectedPlan && selectedPlan.id === plan.id;
                      const count = sanitizeAllowedPages(plan.allowedPages).length;
                      const subsCount = Number(plan.subscribersCount || plan.assigned_branches_count || 0);
                      const isFree = Number(plan.price) === 0;

                      return (
                        <tr
                          key={plan.id}
                          id={`package-row-${plan.id}`}
                          className={isSelected ? "selected" : ""}
                          onClick={() => setSelectedPlanId(plan.id)}
                          style={{
                            cursor: "pointer",
                            background: isSelected ? "rgba(99, 102, 241, 0.08)" : undefined,
                            borderLeft: isSelected ? "4px solid var(--primary)" : "4px solid transparent",
                            transition: "all 0.15s ease"
                          }}
                          title="Click to select this package"
                        >
                          <td style={{ minWidth: "120px", maxWidth: "200px", padding: "0.45rem 0.55rem", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                              <strong style={{ fontSize: "0.88rem" }}>{plan.name}</strong>
                              {isSelected && (
                                <span className="status-pill status-info" style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem" }}>
                                  Active Below
                                </span>
                              )}
                            </div>
                            {plan.description && (
                              <p
                                className="small muted"
                                title={plan.description}
                                style={{
                                  margin: "0.15rem 0 0 0",
                                  fontSize: "0.72rem",
                                  lineHeight: 1.25,
                                  maxWidth: "180px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {plan.description}
                              </p>
                            )}
                          </td>
                          <td style={{ whiteSpace: "nowrap", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                            <span className="status-pill status-info" style={{ fontSize: "0.76rem", padding: "0.22rem 0.45rem" }}>
                              ⏱️ {formatDurationLabel(plan)}
                            </span>
                          </td>
                          <td style={{ whiteSpace: "nowrap", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                            <strong style={{ fontSize: "0.85rem" }}>{isFree ? "Free (PKR 0)" : `PKR ${Number(plan.price).toLocaleString()}`}</strong>
                          </td>
                          <td style={{ whiteSpace: "nowrap", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                            <span
                              className="status-pill"
                              style={{
                                background: "rgba(16, 185, 129, 0.12)",
                                color: "#059669",
                                fontWeight: 700,
                                fontSize: "0.76rem",
                                padding: "0.22rem 0.45rem"
                              }}
                            >
                              🏢 {Number(plan.max_branches) === 0 ? "Unlimited" : `${plan.max_branches || 1} ${Number(plan.max_branches) === 1 ? "Branch" : "Branches"}`}
                            </span>
                          </td>
                          <td style={{ whiteSpace: "nowrap", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                            <button
                              type="button"
                              className="status-pill"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScrollToModuleBlocks(plan);
                              }}
                              style={{
                                background: count === 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                                color: count === 0 ? "#ef4444" : "#10b981",
                                fontWeight: 700,
                                fontSize: "0.76rem",
                                border: "none",
                                cursor: "pointer",
                                padding: "0.22rem 0.45rem"
                              }}
                              title="Click to scroll directly down to module blocks below"
                            >
                              🛡️ {count} / {SYSTEM_MODULES.length} ⬇
                            </button>
                          </td>
                          <td style={{ whiteSpace: "nowrap", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                            <span className="status-pill" style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--primary)", fontSize: "0.76rem", padding: "0.22rem 0.45rem" }}>
                              🏬 {subsCount} {subsCount === 1 ? "Sub" : "Subs"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", padding: "0.45rem 0.4rem", borderBottom: "1px solid var(--border)" }}>
                            <div onClick={(e) => e.stopPropagation()} style={{ display: "inline-block" }}>
                              <ToggleSwitch
                                checked={Boolean(plan.is_active)}
                                onChange={() => handleTogglePackageActive(plan)}
                                onLabel="Active"
                                offLabel="Inactive"
                                size="sm"
                              />
                            </div>
                          </td>
                          <TableActionCell>
                            <TableActionButton
                              variant="edit"
                              icon="✏️"
                              label="Edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditPackage(plan);
                              }}
                              title="Edit package name, duration and price"
                            />
                            <TableActionButton
                              variant="clone"
                              icon="📋"
                              label="Clone"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenClonePackage(plan);
                              }}
                              title="Clone this package with all its module access"
                            />
                            <TableActionButton
                              variant="access"
                              icon="🛡️"
                              label="Access"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScrollToModuleBlocks(plan);
                              }}
                              title="Scroll down directly to this package's module buttons"
                            />
                            <TableActionButton
                              variant="delete"
                              icon="🗑️"
                              label="Delete"
                              disabled={subsCount > 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePackage(plan);
                              }}
                              title={subsCount > 0 ? "A package with active subscribers cannot be deleted, only deactivated." : "Delete package"}
                            />
                          </TableActionCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <PaginationBar
              page={packagePage}
              pageSize={packagePageSize}
              total={filteredPlans.length}
              totalPages={totalPackagePages}
              onPageChange={(p) => setPackagePage(p)}
              onPageSizeChange={(s) => {
                setPackagePageSize(s);
                setPackagePage(1);
              }}
            />
          </SectionCard>

          {/* ========================================================
              BOTTOM SECTION: ACCESS OF EACH/ALL MODULES IN BLOCKS
              WITH INCLUDED / NOT INCLUDED SWITCH OPTION
              ======================================================== */}
          {selectedPlan && (
            <div id="package-module-blocks-section">
              <SectionCard
                title={`Module Access: ${selectedPlan.name}`}
              >
                {/* Module Access Banner & Actions for Selected Package */}
                <div
                  id="module-blocks-grid-anchor"
                  style={{
                    background: "rgba(17, 100, 102, 0.08)",
                    border: "1.5px solid rgba(17, 100, 102, 0.25)",
                    borderRadius: "10px",
                    padding: "0.85rem 1.25rem",
                    marginBottom: "1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    scrollMarginTop: "20px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "1.3rem" }}>🛡️</span>
                    <div>
                      <strong style={{ fontSize: "0.95rem", color: "var(--primary-strong, var(--primary))" }}>
                        Module Access for &quot;{selectedPlan.name}&quot;
                      </strong>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                        <span className="status-pill status-info" style={{ fontSize: "0.75rem" }}>
                          {Number(selectedPlan.price) === 0 ? "Free" : `PKR ${Number(selectedPlan.price).toLocaleString()} / ${formatDurationLabel(selectedPlan)}`}
                        </span>
                        <span className="status-pill" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "0.75rem" }}>
                          ✓ {currentDraftModules.length} of {SYSTEM_MODULES.length} Modules Included
                        </span>
                        <span className="status-pill" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontSize: "0.75rem", fontWeight: 700 }}>
                          🏢 {Number(selectedPlan.max_branches) === 0 ? "Unlimited Branches" : `${selectedPlan.max_branches || 1} ${Number(selectedPlan.max_branches) === 1 ? "Branch" : "Branches"} Allowed`}
                        </span>
                        {hasUnsavedModuleChanges && (
                          <span className="status-pill status-warning" style={{ fontSize: "0.75rem" }}>
                            ⚠️ Unsaved Changes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="ghost-btn btn-sm"
                      onClick={handleSelectAllModulesForSelectedPlan}
                      title="Include all modules in this package"
                    >
                      ✓ Include All
                    </button>
                    <button
                      type="button"
                      className="ghost-btn btn-sm"
                      onClick={handleClearAllModulesForSelectedPlan}
                      title="Exclude all modules from this package"
                    >
                      ✕ Exclude All
                    </button>
                    <button
                      type="button"
                      className="primary-btn btn-sm"
                      disabled={savingModules || !hasUnsavedModuleChanges}
                      onClick={handleSaveModuleAccess}
                      style={{ fontWeight: 700 }}
                    >
                      {savingModules ? "Saving..." : "💾 Save Module Access"}
                    </button>
                    <button
                      type="button"
                      className="secondary-btn btn-sm"
                      onClick={() => {
                        const rowEl = document.getElementById(`package-row-${selectedPlan.id}`);
                        if (rowEl) rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
                        else window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      title="Scroll back up to packages table"
                    >
                      ⬆ Back to Table
                    </button>
                  </div>
                </div>

                {/* MODULE BLOCKS GRID GROUPED BY CATEGORY */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                {Object.entries(groupedModules).map(([category, mods]) => (
                  <div key={category}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", paddingBottom: "0.35rem", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontWeight: 800, fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                        {category}
                      </span>
                      <span className="badge" style={{ fontSize: "0.72rem" }}>
                        {mods.filter((m) => currentDraftModules.includes(m.key)).length} of {mods.length} Included
                      </span>
                    </div>

                    {/* Responsive Grid of Module Blocks */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: "1rem"
                      }}
                    >
                      {mods.map((mod) => {
                        const isIncluded = currentDraftModules.includes(mod.key);

                        return (
                          <div
                            key={mod.key}
                            style={{
                              background: isIncluded ? "rgba(16, 185, 129, 0.05)" : "var(--surface)",
                              border: isIncluded ? "1.5px solid rgba(16, 185, 129, 0.45)" : "1.5px solid var(--border)",
                              borderRadius: "10px",
                              padding: "1rem",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              boxShadow: isIncluded ? "0 2px 8px rgba(16, 185, 129, 0.08)" : "none",
                              transition: "all 0.18s ease"
                            }}
                          >
                            <div>
                              {/* Block Header */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                  <span style={{ fontSize: "1.35rem" }}>{mod.icon}</span>
                                  <strong style={{ fontSize: "0.95rem" }}>{mod.label}</strong>
                                </div>
                                <span
                                  className="badge"
                                  style={{
                                    fontSize: "0.68rem",
                                    background: isIncluded ? "rgba(16, 185, 129, 0.15)" : "var(--surface-strong)",
                                    color: isIncluded ? "#10b981" : "var(--muted)"
                                  }}
                                >
                                  {isIncluded ? "✓ Included" : "✕ Excluded"}
                                </span>
                              </div>

                              {/* Block Description */}
                              <p className="small muted" style={{ margin: "0.25rem 0 1rem 0", lineHeight: 1.4 }}>
                                {mod.description}
                              </p>
                            </div>

                            {/* Block Footer with Included / Not Included Switch Type Option */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingTop: "0.75rem",
                                borderTop: "1px solid var(--border)"
                              }}
                            >
                              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: isIncluded ? "#10b981" : "var(--muted)" }}>
                                {isIncluded ? "Status: Included" : "Status: Not Included"}
                              </span>

                              <ToggleSwitch
                                checked={isIncluded}
                                onChange={(next) => handleToggleModuleSwitch(mod.key, next)}
                                onLabel="Included"
                                offLabel="Not Included"
                                size="md"
                                title={`Toggle ${mod.label} access`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1rem",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}
              >
                <div>
                  <strong>{currentDraftModules.length} of {SYSTEM_MODULES.length}</strong> modules selected for <strong>{selectedPlan.name}</strong>.
                  {hasUnsavedModuleChanges && (
                    <span style={{ color: "var(--warning)", marginLeft: "0.5rem", fontWeight: 600 }}>
                      (You have unsaved changes)
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={!hasUnsavedModuleChanges}
                    onClick={() => {
                      setDraftModulesByPlan({
                        ...draftModulesByPlan,
                        [selectedPlan.id]: sanitizeAllowedPages(selectedPlan.allowedPages)
                      });
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      const rowEl = document.getElementById(`package-row-${selectedPlan.id}`);
                      if (rowEl) rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
                      else window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    title="Scroll back up to packages table"
                  >
                    ⬆ Back to Table
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={savingModules || !hasUnsavedModuleChanges}
                    onClick={handleSaveModuleAccess}
                  >
                    {savingModules ? "Saving Access..." : "💾 Save Module Access"}
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    )}

      {/* ========================================================
          SCREEN 2: SUBSCRIPTIONS SCREEN (Who has what)
          ======================================================== */}
      {activeScreen === "subscriptions" && (
        <SectionCard
          title="Customer Subscriptions"
          subtitle="Track active customer packages and auto-computed expiration dates. Customer access comes only from their active package."
          action={
            <button
              type="button"
              className="primary-btn"
              onClick={() => handleOpenAssignModal()}
            >
              ➕ Assign / Change Package
            </button>
          }
        >
          {/* Subscriptions Filter Toolbar */}
          <div className="table-filter-bar">
            <div className="search-field">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search customers by store name, business, or package..."
                value={subSearch}
                onChange={(e) => {
                  setSubSearch(e.target.value);
                  setSubPage(1);
                }}
              />
              {subSearch && (
                <button type="button" className="clear-search-btn" onClick={() => setSubSearch("")}>✕</button>
              )}
            </div>

            <div className="filter-controls">
              <select
                value={subStatusFilter}
                onChange={(e) => {
                  setSubStatusFilter(e.target.value);
                  setSubPage(1);
                }}
              >
                <option value="all">All Statuses ({subscriptions.length})</option>
                <option value="active">Active Only</option>
                <option value="expiring_soon">Expiring Soon (≤ 7 days)</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading subscriptions...</div>
          ) : paginatedSubs.length === 0 ? (
            <div className="empty-state">No subscription records match your search filter.</div>
          ) : (
            <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
              <table style={{ width: "100%", tableLayout: "auto", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: "130px", padding: "0.55rem 0.6rem" }}>Customer</th>
                    <th style={{ minWidth: "120px", padding: "0.55rem 0.5rem" }}>Package</th>
                    <th style={{ whiteSpace: "nowrap", padding: "0.55rem 0.5rem" }}>Start Date</th>
                    <th style={{ whiteSpace: "nowrap", padding: "0.55rem 0.5rem" }}>End Date</th>
                    <th style={{ whiteSpace: "nowrap", padding: "0.55rem 0.5rem" }}>Days Left</th>
                    <th style={{ whiteSpace: "nowrap", padding: "0.55rem 0.5rem" }}>Status</th>
                    <TableActionHeader />
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubs.map((sub) => {
                    const custName = sub.customer_name || sub.branch_name;
                    const days = sub.daysLeft;
                    const isExp = sub.status === "expired" || (days !== null && days < 0);
                    const isSoon = sub.status === "expiring_soon" || (days !== null && days >= 0 && days <= 7);

                    return (
                      <tr key={sub.subscription_id || sub.branch_id}>
                        <td style={{ minWidth: "130px", maxWidth: "200px", padding: "0.45rem 0.6rem", borderBottom: "1px solid var(--border)" }}>
                          <strong>{custName}</strong>
                          <p className="small muted" style={{ margin: "0.15rem 0 0 0" }}>
                            {sub.business_name} {sub.branch_code ? `(${sub.branch_code})` : ""}
                          </p>
                        </td>
                        <td style={{ minWidth: "120px", maxWidth: "180px", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                          <strong>{sub.package_name || sub.plan_name}</strong>
                          <p className="small muted" style={{ margin: 0 }}>
                            {formatDurationLabel(sub)}
                          </p>
                        </td>
                        <td style={{ whiteSpace: "nowrap", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                          {sub.startDate ? sub.startDate.slice(0, 10) : "N/A"}
                        </td>
                        <td style={{ whiteSpace: "nowrap", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                          <strong>{sub.endDate ? sub.endDate.slice(0, 10) : "N/A"}</strong>
                        </td>
                        <td style={{ whiteSpace: "nowrap", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                          {sub.status === "cancelled" ? (
                            <span className="small muted">—</span>
                          ) : isExp ? (
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>
                              ⛔ Expired {Math.abs(days)}d ago
                            </span>
                          ) : isSoon ? (
                            <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                              ⚠️ {days}d left
                            </span>
                          ) : (
                            <span style={{ color: "#10b981" }}>
                              {days}d left
                            </span>
                          )}
                        </td>
                        <td style={{ whiteSpace: "nowrap", padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border)" }}>
                          {sub.status === "cancelled" ? (
                            <span className="status-pill status-disabled">Cancelled</span>
                          ) : isExp ? (
                            <span className="status-pill status-danger">Expired</span>
                          ) : isSoon ? (
                            <span className="status-pill status-warning">Expiring soon</span>
                          ) : (
                            <span className="status-pill status-success">Active</span>
                          )}
                        </td>
                        <TableActionCell>
                          <TableActionButton
                            variant="edit"
                            icon="🔄"
                            label="Change"
                            onClick={() => handleOpenAssignModal(sub)}
                            title="Assign or change active package"
                          />
                          {sub.status !== "cancelled" && (
                            <TableActionButton
                              variant="delete"
                              icon="✕"
                              label="Cancel"
                              onClick={() => handleCancelSubscription(sub)}
                              title="Cancel subscription immediately"
                            />
                          )}
                        </TableActionCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <PaginationBar
            page={subPage}
            pageSize={subPageSize}
            total={filteredSubscriptions.length}
            totalPages={totalSubPages}
            onPageChange={(p) => setSubPage(p)}
            onPageSizeChange={(s) => {
              setSubPageSize(s);
              setSubPage(1);
            }}
          />
        </SectionCard>
      )}

      {/* ========================================================
          MODAL 1: CREATE / EDIT PACKAGE — ONE SIMPLE FORM
          ======================================================== */}
      {packageModalOpen && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setPackageModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <form onSubmit={handleSavePackage}>
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>
                    {packageForm.isClone
                      ? `📋 Clone Package: ${packageForm.cloneSourcePlanName}`
                      : packageForm.id
                      ? `Edit Package: ${packageForm.name}`
                      : "Create Subscription Package"}
                  </h3>
                  <p className="muted small" style={{ margin: "0.2rem 0 0 0" }}>
                    {packageForm.isClone
                      ? `Creates a new package with the exact same ${sanitizeAllowedPages(packageForm.allowedPages).length} module permissions from '${packageForm.cloneSourcePlanName}'. You can rename it and set a different duration & price.`
                      : "Configure the package name, fixed duration, and price. Module blocks can be toggled below."}
                  </p>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setPackageModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid">
                {packageForm.isClone && (
                  <div
                    className="full-span"
                    style={{
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem"
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "var(--primary)" }}>
                        📋 Inheriting Module Access from &quot;{packageForm.cloneSourcePlanName}&quot;
                      </strong>
                      <p className="small muted" style={{ margin: "0.15rem 0 0 0" }}>
                        All <strong>{sanitizeAllowedPages(packageForm.allowedPages).length} modules</strong> will be copied into this new package.
                      </p>
                    </div>
                    <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "0.75rem" }}>
                      ✓ {sanitizeAllowedPages(packageForm.allowedPages).length} Modules
                    </span>
                  </div>
                )}

                {/* 1. Package Name */}
                <label className="full-span">
                  <span>Package Name *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Starter, Business, or Enterprise"
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  />
                  {packageForm.isClone && (
                    <span className="small muted" style={{ display: "block", marginTop: "0.25rem" }}>
                      ✏️ You can rename this package if desired (e.g. for monthly, 2 months, paying customers).
                    </span>
                  )}
                </label>

                {/* 2. Duration — fixed options only */}
                <label>
                  <span>Duration *</span>
                  <select
                    value={packageForm.durationKey}
                    onChange={(e) => setPackageForm({ ...packageForm, durationKey: e.target.value })}
                  >
                    {FIXED_DURATIONS.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 3. Price — single number = full price for that whole duration */}
                <label>
                  <span>Price (PKR) *</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={packageForm.price}
                    onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                  />
                  <span className="small muted" style={{ display: "block", marginTop: "0.25rem" }}>
                    Display: <strong>{Number(packageForm.price) === 0 ? "Free (PKR 0)" : `PKR ${Number(packageForm.price || 0).toLocaleString()} / ${FIXED_DURATIONS.find((d) => d.key === packageForm.durationKey)?.label}`}</strong>
                  </span>
                </label>

                {/* 4. Branches Allowed */}
                <label className="full-span">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Branches Allowed (Outlets Limit) *</span>
                    <span className="small muted">0 = Unlimited</span>
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="e.g. 1 for single outlet, 3 for multi-branch, 0 for unlimited"
                    value={packageForm.maxBranches}
                    onChange={(e) => setPackageForm({ ...packageForm, maxBranches: e.target.value })}
                  />
                  <span className="small muted" style={{ display: "block", marginTop: "0.25rem" }}>
                    🏢 Maximum store branches a subscriber can create under this package:{" "}
                    <strong>
                      {Number(packageForm.maxBranches) === 0
                        ? "Unlimited branches"
                        : `${packageForm.maxBranches || 1} ${Number(packageForm.maxBranches) === 1 ? "branch" : "branches"} allowed`}
                    </strong>
                  </span>
                </label>

                {/* 5. Active Toggle */}
                <div className="full-span" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  <ToggleSwitch
                    checked={Boolean(packageForm.isActive)}
                    onChange={() => setPackageForm({ ...packageForm, isActive: packageForm.isActive ? 0 : 1 })}
                    onLabel="Active"
                    offLabel="Inactive"
                  />
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>{packageForm.isActive ? "Active Package" : "Inactive Package"}</strong>
                    <p className="small muted" style={{ margin: 0 }}>
                      {packageForm.isActive
                        ? "Available for assigning to new and existing customers."
                        : "Cannot be assigned to new customers, but keeps working for current subscribers until their term ends."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setPackageModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : packageForm.isClone
                    ? "📋 Clone & Create Package"
                    : packageForm.id
                    ? "Save Package Changes"
                    : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: ASSIGN / CHANGE PACKAGE — ONE SMALL DIALOG
          ======================================================== */}
      {assignModalOpen && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setAssignModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <form onSubmit={handleSaveAssignment}>
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>Assign / Change Customer Package</h3>
                  <p className="muted small" style={{ margin: "0.2rem 0 0 0" }}>
                    Select customer and active package. End date auto-computes automatically.
                  </p>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setAssignModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid">
                {/* 1. Pick Customer */}
                <label className="full-span">
                  <span>Customer (Store Branch) *</span>
                  <SearchableSelect
                    required
                    value={assignForm.branchId}
                    onChange={(e) => setAssignForm({ ...assignForm, branchId: e.target.value })}
                    placeholder="Search customer store branch by name or code..."
                  >
                    <option value="">Select Customer Store...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.business_name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </SearchableSelect>
                </label>

                {/* 2. Pick Package (Only active ones) */}
                <label className="full-span">
                  <span>Package (Active Only) *</span>
                  <SearchableSelect
                    required
                    value={assignForm.planId}
                    onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
                    placeholder="Search active package by name or price..."
                  >
                    <option value="">Select Active Package...</option>
                    {activePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {Number(p.price) === 0 ? "Free" : `PKR ${Number(p.price).toLocaleString()}`} / {formatDurationLabel(p)} • {Number(p.max_branches) === 0 ? "Unlimited branches" : `${p.max_branches || 1} ${Number(p.max_branches) === 1 ? "branch" : "branches"}`} ({sanitizeAllowedPages(p.allowedPages).length} modules)
                      </option>
                    ))}
                  </SearchableSelect>
                </label>

                {/* 3. Start Date */}
                <label className="full-span">
                  <span>Start Date *</span>
                  <input
                    type="date"
                    required
                    value={assignForm.startDate}
                    min={assignForm.isBackdated ? undefined : new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                  />
                  <div style={{ marginTop: "0.35rem" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={assignForm.isBackdated}
                        onChange={(e) => setAssignForm({ ...assignForm, isBackdated: e.target.checked })}
                      />
                      <span>Backdate this subscription (allow past start date)</span>
                    </label>
                  </div>
                </label>

                {/* 4. End Date (Auto-computes from package duration — admin never types it) */}
                <div className="full-span" style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.25)", borderRadius: "8px", padding: "0.85rem" }}>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Calculated Expiration / End Date:</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.2rem" }}>
                    📅 {computedAssignEndDate || "Select package & start date"}
                  </div>
                  <div className="small muted" style={{ marginTop: "0.25rem" }}>
                    Auto-computed from duration: <strong>{selectedAssignPlan ? formatDurationLabel(selectedAssignPlan) : "1 Month"}</strong>. Admin never types this.
                  </div>
                </div>

                <div className="full-span small muted">
                  ℹ️ <strong>Rule:</strong> A customer has exactly ONE active package at a time. Changing package replaces the old one immediately (prorating is out of scope).
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setAssignModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
