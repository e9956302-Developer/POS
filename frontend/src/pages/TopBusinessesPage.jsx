import { useEffect, useState } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { ToggleSwitch } from "../components/ToggleSwitch.jsx";
import { SearchableSelect } from "../components/SearchableSelect.jsx";
import {
  TableActionHeader,
  TableActionCell,
  TableActionButton
} from "../components/TableActionColumn.jsx";

export function deriveCompanyCode(name) {
  if (!name || !name.trim()) return "";
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) {
    return words[0].slice(0, 5).toUpperCase();
  }
  if (words.length === 2) {
    return `${words[0].slice(0, 3)}${words[1].slice(0, 2)}`.toUpperCase();
  }
  const initials = words.map((w) => w[0]).join("").toUpperCase();
  if (initials.length >= 3) {
    return initials.slice(0, 6);
  }
  return (initials + words[0].slice(1)).slice(0, 5).toUpperCase();
}

export function deriveBranchCode(companyCode, branchNameOrIndex = 1) {
  const comp = (companyCode || "").trim().toUpperCase();
  if (!comp) return "";
  if (typeof branchNameOrIndex === "number") {
    return `${comp}-${String(branchNameOrIndex).padStart(2, "0")}`;
  }
  const str = String(branchNameOrIndex).trim();
  if (!str) return `${comp}-01`;
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  if (clean.length === 0) return `${comp}-01`;
  if (/^\d+$/.test(clean[0])) {
    return `${comp}-${clean[0].padStart(2, "0")}`;
  }
  return `${comp}-${clean[0].slice(0, 4).toUpperCase()}`;
}

export function TopBusinessesPage({ initialView = "companies", initialStatus = "all", onNavigate }) {
  const [viewMode, setViewMode] = useState(initialView); // "companies" | "branches"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Companies state
  const [companies, setCompanies] = useState([]);
  const [companyPagination, setCompanyPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [companySearch, setCompanySearch] = useState("");
  const [companyStatus, setCompanyStatus] = useState("all"); // "all" | "active" | "inactive"

  // Branches state
  const [branches, setBranches] = useState([]);
  const [branchPagination, setBranchPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [branchSearch, setBranchSearch] = useState("");
  const [branchStatus, setBranchStatus] = useState(initialStatus || "all");
  const [branchCompanyFilter, setBranchCompanyFilter] = useState("");

  // All companies list for dropdowns
  const [allCompaniesList, setAllCompaniesList] = useState([]);
  const [plansList, setPlansList] = useState([]);

  // Modals & Panels
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState(null); // company detail object
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Create Company Modal
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [createCompanyMode, setCreateCompanyMode] = useState("bundle"); // "bundle" | "standalone"
  const [companyForm, setCompanyForm] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    branchName: "",
    branchCode: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    planId: 1,
    receiptFooter: ""
  });

  // Edit Company Modal
  const [editingCompany, setEditingCompany] = useState(null);
  const [editCompanyForm, setEditCompanyForm] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    receiptFooter: ""
  });

  // Create Branch Modal
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({
    businessId: "",
    name: "",
    code: "",
    address: "",
    planId: 1
  });

  // Edit Branch Modal
  const [editingBranch, setEditingBranch] = useState(null);
  const [editBranchForm, setEditBranchForm] = useState({
    name: "",
    code: "",
    address: "",
    planId: 1,
    isActive: 1
  });

  // Extend Subscription Modal
  const [extendingBranch, setExtendingBranch] = useState(null);
  const [extensionDate, setExtensionDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load packages & simple companies for dropdowns
    api.subscriptionPlans().then(setPlansList).catch(() => {});
    api.businesses().then(setAllCompaniesList).catch(() => {});
  }, []);

  useEffect(() => {
    if (viewMode === "companies") {
      loadCompanies();
    } else {
      loadBranches();
    }
  }, [viewMode, companyPagination.page, companyPagination.pageSize, companyStatus, branchPagination.page, branchPagination.pageSize, branchStatus, branchCompanyFilter]);

  async function loadCompanies() {
    setLoading(true);
    setError("");
    try {
      const q = `?page=${companyPagination.page}&pageSize=${companyPagination.pageSize}&status=${companyStatus}&search=${encodeURIComponent(companySearch)}`;
      const res = await api.businesses(q);
      if (res.data && res.pagination) {
        setCompanies(res.data);
        setCompanyPagination(res.pagination);
      } else if (Array.isArray(res)) {
        setCompanies(res);
        setCompanyPagination((p) => ({ ...p, total: res.length, totalPages: 1 }));
      }
    } catch (err) {
      setError(err.message || "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches() {
    setLoading(true);
    setError("");
    try {
      let q = `?page=${branchPagination.page}&pageSize=${branchPagination.pageSize}&status=${branchStatus}&search=${encodeURIComponent(branchSearch)}`;
      if (branchCompanyFilter) {
        q += `&businessId=${branchCompanyFilter}`;
      }
      const res = await api.topBranches(q);
      if (res.data && res.pagination) {
        setBranches(res.data);
        setBranchPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message || "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }

  async function openCompanyDetail(companyId) {
    setIsDetailLoading(true);
    setError("");
    try {
      const detail = await api.topBusinessDetail(companyId);
      setSelectedCompanyDetail(detail);
    } catch (err) {
      setError(err.message || "Failed to load company detail");
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleToggleCompany(company) {
    setError("");
    setMessage("");
    try {
      const saved = await api.toggleBusiness(company.id, !company.is_active);
      setMessage(`Company '${saved.name}' ${saved.is_active ? "enabled" : "disabled"} successfully`);
      loadCompanies();
      if (selectedCompanyDetail?.id === company.id) {
        setSelectedCompanyDetail((prev) => ({ ...prev, is_active: saved.is_active }));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleBranch(branch) {
    setError("");
    setMessage("");
    try {
      const saved = await api.topToggleBranch(branch.id, !branch.is_active);
      setMessage(`Branch '${saved.name}' ${saved.is_active ? "enabled" : "disabled"}`);
      loadBranches();
      if (selectedCompanyDetail) {
        openCompanyDetail(selectedCompanyDetail.id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateCompany(e) {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (companyForm.email && companyForm.email.trim() && !emailRegex.test(companyForm.email.trim())) {
      setError("Please enter a valid company contact email address");
      return;
    }
    if (createCompanyMode === "bundle" && (!companyForm.adminEmail || !emailRegex.test(companyForm.adminEmail.trim()))) {
      setError("Please enter a valid administrator login email address");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const payload = createCompanyMode === "bundle"
        ? { ...companyForm, planId: Number(companyForm.planId) }
        : {
            name: companyForm.name,
            code: companyForm.code,
            email: companyForm.email,
            phone: companyForm.phone,
            address: companyForm.address,
            receiptFooter: companyForm.receiptFooter
          };

      await api.createBusiness(payload);
      setMessage(`Company '${companyForm.name}' created successfully`);
      setShowCreateCompanyModal(false);
      setCompanyForm({
        name: "",
        code: "",
        email: "",
        phone: "",
        address: "",
        branchName: "",
        branchCode: "",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        planId: plansList[0]?.id || 1,
        receiptFooter: ""
      });
      loadCompanies();
      api.businesses().then(setAllCompaniesList).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditCompany(e) {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editCompanyForm.email && editCompanyForm.email.trim() && !emailRegex.test(editCompanyForm.email.trim())) {
      setError("Please enter a valid company contact email address");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.updateBusiness(editingCompany.id, editCompanyForm);
      setMessage(`Company '${updated.name}' updated successfully`);
      setEditingCompany(null);
      loadCompanies();
      if (selectedCompanyDetail?.id === editingCompany.id) {
        openCompanyDetail(editingCompany.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateBranch(e) {
    e.preventDefault();
    if (!branchForm.businessId) {
      setError("Please select a company for this branch");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      await api.topCreateBranch({
        ...branchForm,
        businessId: Number(branchForm.businessId),
        planId: Number(branchForm.planId)
      });
      setMessage(`Branch '${branchForm.name}' created successfully`);
      setShowCreateBranchModal(false);
      setBranchForm({
        businessId: "",
        name: "",
        code: "",
        address: "",
        planId: plansList[0]?.id || 1
      });
      if (viewMode === "branches") {
        loadBranches();
      }
      if (selectedCompanyDetail) {
        openCompanyDetail(selectedCompanyDetail.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditBranch(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.topUpdateBranch(editingBranch.id, {
        ...editBranchForm,
        planId: Number(editBranchForm.planId),
        isActive: Number(editBranchForm.isActive)
      });
      setMessage(`Branch '${updated.name}' updated successfully`);
      setEditingBranch(null);
      loadBranches();
      if (selectedCompanyDetail) {
        openCompanyDetail(selectedCompanyDetail.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCompany(company) {
    const hasData = Number(company.data_count || 0) > 0;
    if (hasData) {
      setError(`Cannot delete company '${company.name}' because it contains active transaction or inventory records.`);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete company '${company.name}' (${company.code})?\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      await api.deleteBusiness(company.id);
      setMessage(`Company '${company.name}' deleted successfully.`);
      loadCompanies();
      api.businesses().then(setAllCompaniesList).catch(() => {});
      if (selectedCompanyDetail?.id === company.id) {
        setSelectedCompanyDetail(null);
      }
    } catch (err) {
      setError(err.message || "Failed to delete company");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteBranch(branch) {
    const hasData = Number(branch.data_count || 0) > 0;
    if (hasData) {
      setError(`Cannot delete branch '${branch.name}' because it contains active transaction or inventory records.`);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete branch '${branch.name}' (${branch.code})?\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      await api.topDeleteBranch(branch.id);
      setMessage(`Branch '${branch.name}' deleted successfully.`);
      loadBranches();
      if (selectedCompanyDetail) {
        openCompanyDetail(selectedCompanyDetail.id);
      }
    } catch (err) {
      setError(err.message || "Failed to delete branch");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExtendBranchSubscription(e) {
    e.preventDefault();
    if (!extensionDate) {
      setError("Choose an extension date");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      await api.extendBranchSubscription(extendingBranch.id, extensionDate);
      setMessage(`Subscription for '${extendingBranch.name}' extended through ${extensionDate}`);
      setExtendingBranch(null);
      setExtensionDate("");
      if (viewMode === "branches") {
        loadBranches();
      }
      if (selectedCompanyDetail) {
        openCompanyDetail(selectedCompanyDetail.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="topadmin-management-page">
      {/* Page Header */}
      <div className="management-header">
        <div>
          <h1>Business & Branch Management</h1>
          <p className="muted">
            Provision and manage registered companies, multi-branch networks, assigned packages, and subscriptions.
          </p>
        </div>

        <div className="view-toggle-bar">
          <button
            type="button"
            className={`toggle-tab-btn ${viewMode === "companies" ? "active" : ""}`}
            onClick={() => setViewMode("companies")}
          >
            🏢 Companies ({companyPagination.total || companies.length})
          </button>
          <button
            type="button"
            className={`toggle-tab-btn ${viewMode === "branches" ? "active" : ""}`}
            onClick={() => setViewMode("branches")}
          >
            🏬 All Store Branches ({branchPagination.total || branches.length})
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {/* ========================================================
          VIEW 1: COMPANIES MANAGEMENT
          ======================================================== */}
      {viewMode === "companies" && (
        <SectionCard
          title="Registered Companies"
          subtitle="All subscriber organizations on the DigitalMarkaz360 platform."
          action={
            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowCreateCompanyModal(true)}
            >
              ➕ Register New Company
            </button>
          }
        >
          {/* Companies Toolbar */}
          <div className="table-filter-bar">
            <div className="search-field">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by company name, code, email..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadCompanies()}
              />
              {companySearch && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => {
                    setCompanySearch("");
                    setTimeout(loadCompanies, 0);
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="filter-group">
              <label>
                <span>Status:</span>
                <select
                  value={companyStatus}
                  onChange={(e) => {
                    setCompanyStatus(e.target.value);
                    setCompanyPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Disabled Only</option>
                </select>
              </label>

              <button
                type="button"
                className="secondary-btn btn-sm"
                onClick={loadCompanies}
                title="Search / Refresh"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Companies Table */}
          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading companies...</p>
            </div>
          ) : companies.length > 0 ? (
            <div className="table-wrapper" style={{ overflowX: "auto", width: "100%" }}>
              <table className="data-table" style={{ minWidth: "960px", width: "100%" }}>
                <thead>
                  <tr>
                    <th>Company Name & Code</th>
                    <th>Contact Info</th>
                    <th>Branches</th>
                    <th>Primary Administrator</th>
                    <th>Status</th>
                    <th>Created</th>
                    <TableActionHeader />
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <button
                          type="button"
                          className="link-title-btn"
                          onClick={() => openCompanyDetail(c.id)}
                        >
                          <strong>{c.name}</strong>
                        </button>
                        <p className="font-mono text-muted small">{c.code}</p>
                      </td>
                      <td>
                        <p className="small">{c.email || "No email"}</p>
                        <p className="small muted">{c.phone || "No phone"}</p>
                      </td>
                      <td>
                        <span className="badge badge-branches" onClick={() => {
                          setBranchCompanyFilter(c.id);
                          setViewMode("branches");
                        }}>
                          {c.branches_count || 0} branches
                        </span>
                      </td>
                      <td>
                        {c.admin_name ? (
                          <div>
                            <span className="small"><strong>{c.admin_name}</strong></span>
                            <p className="small muted font-mono">{c.admin_email}</p>
                          </div>
                        ) : (
                          <span className="muted small">No admin assigned</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <ToggleSwitch
                            checked={Boolean(c.is_active)}
                            onChange={() => handleToggleCompany(c)}
                            onLabel="Active"
                            offLabel="Disabled"
                            size="sm"
                          />
                          {!Boolean(c.is_active) && (
                            <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 600 }} title="Deactivated by SaaS Admin. Users under this company will be instructed to contact SaaS Admin.">
                              ⛔ Deactivated by SaaS Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="small muted">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "N/A"}
                      </td>
                      <TableActionCell>
                        <TableActionButton
                          variant="details"
                          icon="👁️"
                          label="Details"
                          onClick={() => openCompanyDetail(c.id)}
                          title="View detailed company overview"
                        />
                        <TableActionButton
                          variant="edit"
                          icon="✏️"
                          label="Edit"
                          onClick={() => {
                            setEditingCompany(c);
                            setEditCompanyForm({
                              name: c.name,
                              code: c.code,
                              email: c.email || "",
                              phone: c.phone || "",
                              address: c.address || "",
                              receiptFooter: c.receipt_footer || c.receiptFooter || ""
                            });
                          }}
                          title="Edit company profile"
                        />
                        <TableActionButton
                          variant="add"
                          icon="➕"
                          label="Branch"
                          onClick={() => {
                            setBranchForm({
                              businessId: c.id,
                              name: "",
                              code: `${c.code}-0${Number(c.branches_count || 0) + 1}`,
                              address: "",
                              planId: plansList[0]?.id || 1
                            });
                            setShowCreateBranchModal(true);
                          }}
                          title="Add a new branch under this company"
                        />
                        <TableActionButton
                          variant="delete"
                          icon="🗑️"
                          label="Delete"
                          disabled={Number(c.data_count || 0) > 0}
                          onClick={() => handleDeleteCompany(c)}
                          title={
                            Number(c.data_count || 0) > 0
                              ? "Cannot delete company with active sales, purchases, inventory, or expenses."
                              : `Delete empty company '${c.name}'`
                          }
                        />
                      </TableActionCell>
                    </tr>
                  ))}
                </tbody>
              </table>

              <PaginationBar
                page={companyPagination.page}
                pageSize={companyPagination.pageSize}
                total={companyPagination.total}
                totalPages={companyPagination.totalPages}
                onPageChange={(newPage) => setCompanyPagination((p) => ({ ...p, page: newPage }))}
                onPageSizeChange={(newSize) => setCompanyPagination((p) => ({ ...p, pageSize: newSize, page: 1 }))}
              />
            </div>
          ) : (
            <div className="empty-state-card">
              <span className="empty-icon">🏢</span>
              <p>No companies found matching your criteria.</p>
              <button
                type="button"
                className="primary-btn btn-sm"
                onClick={() => setShowCreateCompanyModal(true)}
              >
                Create Company
              </button>
            </div>
          )}
        </SectionCard>
      )}

      {/* ========================================================
          VIEW 2: BRANCHES MANAGEMENT
          ======================================================== */}
      {viewMode === "branches" && (
        <SectionCard
          title="All Store Branches"
          subtitle="Branch locations, assigned packages, validity, and operational statuses across all companies."
          action={
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setBranchForm({
                  businessId: allCompaniesList[0]?.id || "",
                  name: "",
                  code: "",
                  address: "",
                  planId: plansList[0]?.id || 1
                });
                setShowCreateBranchModal(true);
              }}
            >
              ➕ Provision New Branch
            </button>
          }
        >
          {/* Branches Toolbar */}
          <div className="table-filter-bar">
            <div className="search-field">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search branch name, code, company..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadBranches()}
              />
              {branchSearch && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => {
                    setBranchSearch("");
                    setTimeout(loadBranches, 0);
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="filter-group">
              <label>
                <span>Company:</span>
                <select
                  value={branchCompanyFilter}
                  onChange={(e) => {
                    setBranchCompanyFilter(e.target.value);
                    setBranchPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <option value="">All Companies</option>
                  {allCompaniesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status:</span>
                <select
                  value={branchStatus}
                  onChange={(e) => {
                    setBranchStatus(e.target.value);
                    setBranchPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <option value="all">All Branches</option>
                  <option value="active">Active Subscription</option>
                  <option value="trialing">Trialing</option>
                  <option value="overdue">Overdue / Grace</option>
                  <option value="expired">Expired</option>
                  <option value="inactive">Disabled Branch</option>
                </select>
              </label>

              <button
                type="button"
                className="secondary-btn btn-sm"
                onClick={loadBranches}
                title="Search / Refresh"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Branches Table */}
          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading branches...</p>
            </div>
          ) : branches.length > 0 ? (
            <div className="table-wrapper" style={{ overflowX: "auto", width: "100%" }}>
              <table className="data-table" style={{ minWidth: "960px", width: "100%" }}>
                <thead>
                  <tr>
                    <th>Branch Name & Code</th>
                    <th>Parent Company</th>
                    <th>Subscription Package</th>
                    <th>Subscription Status</th>
                    <th>Validity Date</th>
                    <th>Branch Active</th>
                    <TableActionHeader />
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => {
                    const expiryDate = b.current_period_ends_on || b.trial_ends_on;
                    const isOverdue = b.is_overdue === 1;
                    return (
                      <tr key={b.id} className={isOverdue ? "row-highlight-danger" : ""}>
                        <td>
                          <strong>{b.name}</strong>
                          <p className="font-mono text-muted small">{b.code}</p>
                          {b.address && <p className="small muted">{b.address}</p>}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="link-title-btn"
                            onClick={() => openCompanyDetail(b.business_id)}
                          >
                            <strong>{b.business_name}</strong>
                          </button>
                        </td>
                        <td>
                          <span className="badge muted-badge">{b.plan_name || "Starter"}</span>
                        </td>
                        <td>
                          {b.effective_status === "active" && !isOverdue && (
                            <span className="status-pill status-success">Active</span>
                          )}
                          {b.effective_status === "trialing" && !isOverdue && (
                            <span className="status-pill status-info">Trialing</span>
                          )}
                          {isOverdue && (
                            <span className="status-pill status-danger">Overdue / Expired</span>
                          )}
                          {b.effective_status === "suspended" && (
                            <span className="status-pill status-disabled">Suspended</span>
                          )}
                        </td>
                        <td className="small">
                          {expiryDate ? (
                            <div>
                              <span>{new Date(expiryDate).toLocaleDateString()}</span>
                              {isOverdue && <span className="text-danger small block">Requires Renewal</span>}
                            </div>
                          ) : (
                            <span className="muted">N/A</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <ToggleSwitch
                              checked={Boolean(b.is_active)}
                              onChange={() => handleToggleBranch(b)}
                              onLabel="Active"
                              offLabel="Disabled"
                              size="sm"
                            />
                            {!Boolean(b.is_active) && (
                              <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 600 }} title="Deactivated by SaaS Admin. Branch staff cannot operate and will be told to contact SaaS Admin.">
                                ⛔ Deactivated by SaaS Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <TableActionCell>
                          <TableActionButton
                            variant="edit"
                            icon="✏️"
                            label="Edit"
                            onClick={() => {
                              setEditingBranch(b);
                              setEditBranchForm({
                                name: b.name,
                                code: b.code,
                                address: b.address || "",
                                planId: b.plan_id || 1,
                                isActive: b.is_active
                              });
                            }}
                            title="Edit branch details"
                          />
                          <TableActionButton
                            variant="extend"
                            icon="⚡"
                            label="Extend"
                            onClick={() => {
                              setExtendingBranch(b);
                              const futureDate = new Date();
                              futureDate.setMonth(futureDate.getMonth() + 1);
                              setExtensionDate(futureDate.toISOString().slice(0, 10));
                            }}
                            title="Manually extend branch subscription"
                          />
                          <TableActionButton
                            variant="delete"
                            icon="🗑️"
                            label="Delete"
                            disabled={Number(b.data_count || 0) > 0}
                            onClick={() => handleDeleteBranch(b)}
                            title={
                              Number(b.data_count || 0) > 0
                                ? "Cannot delete branch with active sales, purchases, inventory, or expenses."
                                : `Delete empty branch '${b.name}'`
                            }
                          />
                        </TableActionCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <PaginationBar
                page={branchPagination.page}
                pageSize={branchPagination.pageSize}
                total={branchPagination.total}
                totalPages={branchPagination.totalPages}
                onPageChange={(newPage) => setBranchPagination((p) => ({ ...p, page: newPage }))}
                onPageSizeChange={(newSize) => setBranchPagination((p) => ({ ...p, pageSize: newSize, page: 1 }))}
              />
            </div>
          ) : (
            <div className="empty-state-card">
              <span className="empty-icon">🏬</span>
              <p>No store branches found matching your filter criteria.</p>
            </div>
          )}
        </SectionCard>
      )}

      {/* ========================================================
          MODAL: COMPANY DETAIL DRAWER / MODAL
          ======================================================== */}
      {selectedCompanyDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedCompanyDetail(null)}>
          <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedCompanyDetail.name}</h2>
                <p className="muted font-mono">{selectedCompanyDetail.code}</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedCompanyDetail(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body detail-drawer-body">
              {/* Company Info Header Cards */}
              <div className="detail-meta-grid">
                <div className="meta-card">
                  <span className="muted small">Company Status</span>
                  <strong>{selectedCompanyDetail.is_active ? "Active" : "Disabled"}</strong>
                </div>
                <div className="meta-card">
                  <span className="muted small">Total Branches</span>
                  <strong>{selectedCompanyDetail.branches?.length || 0}</strong>
                </div>
                <div className="meta-card">
                  <span className="muted small">Staff Accounts</span>
                  <strong>{selectedCompanyDetail.staffCount || 0}</strong>
                </div>
                <div className="meta-card">
                  <span className="muted small">Total Subscription Paid</span>
                  <strong>PKR {Number(selectedCompanyDetail.totalPaid || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* Primary Admin Section */}
              <div className="detail-section">
                <div className="section-title-row">
                  <h3>Primary Company Administrator</h3>
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    onClick={() => onNavigate && onNavigate("top_admins", { businessId: selectedCompanyDetail.id })}
                  >
                    Manage Admins »
                  </button>
                </div>
                {selectedCompanyDetail.primaryAdmin ? (
                  <div className="admin-chip-card">
                    <div className="admin-avatar">
                      {selectedCompanyDetail.primaryAdmin.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-info">
                      <strong>{selectedCompanyDetail.primaryAdmin.full_name}</strong>
                      <p className="font-mono small muted">{selectedCompanyDetail.primaryAdmin.email}</p>
                      <span className={`status-pill small ${selectedCompanyDetail.primaryAdmin.is_active ? "status-success" : "status-disabled"}`}>
                        {selectedCompanyDetail.primaryAdmin.is_active ? "Active Admin" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="empty-inline-card">
                    <p className="muted small">No active company admin assigned.</p>
                  </div>
                )}
              </div>

              {/* Receipt & Invoice Footer Section */}
              <div className="detail-section">
                <div className="section-title-row">
                  <h3>Receipt & Invoice Footer Note</h3>
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    onClick={() => {
                      setEditingCompany(selectedCompanyDetail);
                      setEditCompanyForm({
                        name: selectedCompanyDetail.name,
                        code: selectedCompanyDetail.code,
                        email: selectedCompanyDetail.email || "",
                        phone: selectedCompanyDetail.phone || "",
                        address: selectedCompanyDetail.address || "",
                        receiptFooter: selectedCompanyDetail.receipt_footer || selectedCompanyDetail.receiptFooter || ""
                      });
                    }}
                  >
                    ✏️ Edit Profile & Footer Note
                  </button>
                </div>
                <div style={{ padding: "0.85rem 1rem", background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  {selectedCompanyDetail.receipt_footer ? (
                    <p style={{ margin: 0, fontStyle: "italic", color: "var(--text)" }}>
                      &ldquo;{selectedCompanyDetail.receipt_footer}&rdquo;
                    </p>
                  ) : (
                    <p className="muted small" style={{ margin: 0 }}>
                      No custom footer note configured. Sale receipts and invoices for this company will use the standard default footer.
                    </p>
                  )}
                </div>
              </div>

              {/* Branches Section */}
              <div className="detail-section">
                <div className="section-title-row">
                  <h3>Company Branches ({selectedCompanyDetail.branches?.length || 0})</h3>
                  <button
                    type="button"
                    className="primary-btn btn-sm"
                    onClick={() => {
                      const nextBranchNum = (selectedCompanyDetail.branches?.length || 0) + 1;
                      setBranchForm({
                        businessId: selectedCompanyDetail.id,
                        name: "",
                        code: `${selectedCompanyDetail.code}-${String(nextBranchNum).padStart(2, "0")}`,
                        address: "",
                        planId: plansList[0]?.id || 1
                      });
                      setShowCreateBranchModal(true);
                    }}
                  >
                    + Add Branch
                  </button>
                </div>

                <div className="table-wrapper" style={{ overflowX: "auto", width: "100%" }}>
                  <table className="compact-table" style={{ minWidth: "550px", width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>Package</th>
                        <th>Valid Through</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCompanyDetail.branches?.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <strong>{b.name}</strong>
                            <p className="font-mono small muted">{b.code}</p>
                          </td>
                          <td>
                            <span className="badge muted-badge">{b.plan_name || "Starter"}</span>
                          </td>
                          <td className="small">
                            {b.current_period_ends_on
                              ? new Date(b.current_period_ends_on).toLocaleDateString()
                              : b.trial_ends_on
                              ? `Trial: ${new Date(b.trial_ends_on).toLocaleDateString()}`
                              : "N/A"}
                          </td>
                          <td>
                            <span className={`status-pill ${b.subscription_status === "active" ? "status-success" : b.subscription_status === "trialing" ? "status-info" : "status-warning"}`}>
                              {b.subscription_status || "Active"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                            <TableActionButton
                              variant="extend"
                              icon="⚡"
                              label="Extend"
                              onClick={() => {
                                setExtendingBranch(b);
                                const futureDate = new Date();
                                futureDate.setMonth(futureDate.getMonth() + 1);
                                setExtensionDate(futureDate.toISOString().slice(0, 10));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <span className="muted small" style={{ fontWeight: 600 }}>Company Status:</span>
                <ToggleSwitch
                  checked={selectedCompanyDetail.is_active}
                  onChange={() => handleToggleCompany(selectedCompanyDetail)}
                  onLabel="Company Active"
                  offLabel="Company Inactive"
                  size="md"
                />
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSelectedCompanyDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE COMPANY
          ======================================================== */}
      {showCreateCompanyModal && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setShowCreateCompanyModal(false)}>
          <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateCompany}>
              <div className="modal-header">
                <div>
                  <h3>Register New Business / Company</h3>
                  <p className="muted small">Set up a customer company on MobilePOS.</p>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setShowCreateCompanyModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {/* Creation Mode Switcher */}
                <div className="form-mode-selector">
                  <button
                    type="button"
                    className={`mode-btn ${createCompanyMode === "bundle" ? "active" : ""}`}
                    onClick={() => setCreateCompanyMode("bundle")}
                  >
                    Full Provisioning (Company + First Branch + Admin Account)
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${createCompanyMode === "standalone" ? "active" : ""}`}
                    onClick={() => setCreateCompanyMode("standalone")}
                  >
                    Standalone Company Profile Only
                  </button>
                </div>

                <div className="form-grid">
                  <label>
                    <span>Company Name *</span>
                    <input
                      placeholder="e.g. Al-Madina Telecom"
                      value={companyForm.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        const prevDerived = deriveCompanyCode(companyForm.name);
                        const autoCode = deriveCompanyCode(newName);
                        const shouldUpdateCode = !companyForm.code || companyForm.code === prevDerived;
                        const newCode = shouldUpdateCode ? autoCode : companyForm.code;
                        const shouldUpdateBranch = !companyForm.branchCode || companyForm.branchCode === `${prevDerived}-01`;
                        const newBranchCode = shouldUpdateBranch ? (newCode ? `${newCode}-01` : "") : companyForm.branchCode;
                        setCompanyForm({
                          ...companyForm,
                          name: newName,
                          code: newCode,
                          branchCode: newBranchCode
                        });
                      }}
                      required
                    />
                  </label>

                  <label>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Company Unique Code *</span>
                      <button
                        type="button"
                        className="btn-sm ghost-btn"
                        style={{ padding: "0 0.35rem", fontSize: "0.72rem", height: "18px" }}
                        onClick={() => {
                          const auto = deriveCompanyCode(companyForm.name);
                          if (auto) {
                            setCompanyForm((prev) => ({
                              ...prev,
                              code: auto,
                              branchCode: prev.branchCode ? `${auto}-01` : prev.branchCode
                            }));
                          }
                        }}
                        title="Auto-derive code from company name"
                      >
                        ⚡ Auto-Generate
                      </button>
                    </div>
                    <input
                      placeholder="e.g. AMT"
                      value={companyForm.code}
                      onChange={(e) => {
                        const newCode = e.target.value.toUpperCase();
                        const oldCode = companyForm.code;
                        let newBranch = companyForm.branchCode;
                        if (!newBranch || (oldCode && newBranch.startsWith(oldCode))) {
                          const suffix = oldCode && newBranch.startsWith(`${oldCode}-`)
                            ? newBranch.slice(oldCode.length + 1)
                            : "01";
                          newBranch = newCode ? `${newCode}-${suffix}` : "";
                        }
                        setCompanyForm({ ...companyForm, code: newCode, branchCode: newBranch });
                      }}
                      required
                    />
                  </label>

                  <label>
                    <span>Contact Email</span>
                    <input
                      type="email"
                      placeholder="info@company.com"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>Contact Phone</span>
                    <input
                      placeholder="+92 300 1234567"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    />
                  </label>

                  <label className="full-span">
                    <span>Headquarters Address</span>
                    <input
                      placeholder="Shop #12, Plaza, City"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    />
                  </label>

                  <label className="full-span">
                    <span>Receipt / Invoice Footer Note</span>
                    <input
                      placeholder="e.g. Thank you for shopping with us! Goods once sold can be exchanged within 3 days."
                      value={companyForm.receiptFooter}
                      onChange={(e) => setCompanyForm({ ...companyForm, receiptFooter: e.target.value })}
                    />
                    <span className="small muted">Printed at the bottom of sale receipts & invoices for this company.</span>
                  </label>

                  {createCompanyMode === "bundle" && (
                    <>
                      <div className="form-divider full-span">
                        <span>First Branch Details</span>
                      </div>

                      <label>
                        <span>Branch Name *</span>
                        <input
                          placeholder="e.g. Main Branch"
                          value={companyForm.branchName}
                          onChange={(e) => {
                            const newBranchName = e.target.value;
                            const comp = companyForm.code || deriveCompanyCode(companyForm.name);
                            setCompanyForm((prev) => ({
                              ...prev,
                              branchName: newBranchName,
                              branchCode: prev.branchCode || (comp ? `${comp}-01` : "")
                            }));
                          }}
                          required
                        />
                      </label>

                      <label>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>Branch Code *</span>
                          <button
                            type="button"
                            className="btn-sm ghost-btn"
                            style={{ padding: "0 0.35rem", fontSize: "0.72rem", height: "18px" }}
                            onClick={() => {
                              const comp = companyForm.code || deriveCompanyCode(companyForm.name);
                              if (comp) {
                                setCompanyForm((prev) => ({ ...prev, branchCode: `${comp}-01` }));
                              }
                            }}
                            title="Auto-derive branch code based on company code"
                          >
                            ⚡ Auto
                          </button>
                        </div>
                        <input
                          placeholder={`e.g. ${companyForm.code || "AMT"}-01`}
                          value={companyForm.branchCode}
                          onChange={(e) => setCompanyForm({ ...companyForm, branchCode: e.target.value.toUpperCase() })}
                          required
                        />
                      </label>

                      <label className="full-span">
                        <span>Subscription Package *</span>
                        <SearchableSelect
                          value={companyForm.planId}
                          onChange={(e) => setCompanyForm({ ...companyForm, planId: e.target.value })}
                          placeholder="Search subscription package..."
                        >
                          {plansList.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} (PKR {Number(plan.price).toLocaleString(undefined, { maximumFractionDigits: 2 })} / {plan.billing_period || "month"} • {Number(plan.max_branches) === 0 ? "Unlimited branches" : `${plan.max_branches || 1} ${Number(plan.max_branches) === 1 ? "branch" : "branches"}`})
                            </option>
                          ))}
                        </SearchableSelect>
                      </label>

                      <div className="form-divider full-span">
                        <span>Primary Company Administrator</span>
                      </div>

                      <label>
                        <span>Admin Full Name *</span>
                        <input
                          placeholder="e.g. Muhammad Ali"
                          value={companyForm.adminName}
                          onChange={(e) => setCompanyForm({ ...companyForm, adminName: e.target.value })}
                          required
                        />
                      </label>

                      <label>
                        <span>Admin Login Email *</span>
                        <input
                          type="email"
                          placeholder="admin@almadina.com"
                          value={companyForm.adminEmail}
                          onChange={(e) => setCompanyForm({ ...companyForm, adminEmail: e.target.value })}
                          required
                        />
                      </label>

                      <label className="full-span">
                        <span>Admin Initial Password *</span>
                        <input
                          type="password"
                          placeholder="Create initial password"
                          autoComplete="new-password"
                          value={companyForm.adminPassword}
                          onChange={(e) => setCompanyForm({ ...companyForm, adminPassword: e.target.value })}
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setShowCreateCompanyModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Provisioning..." : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT COMPANY
          ======================================================== */}
      {editingCompany && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setEditingCompany(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEditCompany}>
              <div className="modal-header">
                <h3>Edit Company Profile</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setEditingCompany(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid">
                <label>
                  <span>Company Name *</span>
                  <input
                    value={editCompanyForm.name}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, name: e.target.value })}
                    required
                  />
                </label>

                <label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Company Code</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>🔒 Locked</span>
                  </div>
                  <input
                    value={editCompanyForm.code}
                    disabled
                    readOnly
                    style={{
                      background: "var(--bg, #f1f5f9)",
                      cursor: "not-allowed",
                      opacity: 0.85,
                      fontWeight: "700"
                    }}
                    title="Company code cannot be modified once created"
                  />
                </label>

                <label>
                  <span>Contact Email</span>
                  <input
                    type="email"
                    value={editCompanyForm.email}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, email: e.target.value })}
                  />
                </label>

                <label>
                  <span>Contact Phone</span>
                  <input
                    value={editCompanyForm.phone}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, phone: e.target.value })}
                  />
                </label>

                <label className="full-span">
                  <span>Address</span>
                  <input
                    value={editCompanyForm.address}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, address: e.target.value })}
                  />
                </label>

                <label className="full-span">
                  <span>Receipt / Invoice Footer Note</span>
                  <textarea
                    rows={2}
                    placeholder="e.g. Thank you for shopping with us! Warranty claims valid within 7 days with original invoice."
                    value={editCompanyForm.receiptFooter}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, receiptFooter: e.target.value })}
                  />
                  <span className="small muted">
                    This note will be printed at the bottom of customer sale receipts and invoices for this company.
                  </span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setEditingCompany(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE BRANCH
          ======================================================== */}
      {showCreateBranchModal && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setShowCreateBranchModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateBranch}>
              <div className="modal-header">
                <h3>Provision New Store Branch</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setShowCreateBranchModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid">
                <label className="full-span">
                  <span>Parent Company *</span>
                  <SearchableSelect
                    value={branchForm.businessId}
                    onChange={(e) => {
                      const bizId = e.target.value;
                      const targetBiz = allCompaniesList.find((c) => String(c.id) === String(bizId));
                      const existingCount = branches.filter((b) => String(b.business_id) === String(bizId)).length;
                      const autoCode = targetBiz ? `${targetBiz.code}-${String(existingCount + 1).padStart(2, "0")}` : "";
                      setBranchForm({
                        ...branchForm,
                        businessId: bizId,
                        code: autoCode || branchForm.code
                      });
                    }}
                    placeholder="Search parent company by name or code..."
                    required
                  >
                    <option value="">Select Company</option>
                    {allCompaniesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </SearchableSelect>
                </label>

                <label>
                  <span>Branch Name *</span>
                  <input
                    placeholder="e.g. Saddar Branch"
                    value={branchForm.name}
                    onChange={(e) => {
                      const bName = e.target.value;
                      const targetBiz = allCompaniesList.find((c) => String(c.id) === String(branchForm.businessId));
                      const existingCount = branches.filter((b) => String(b.business_id) === String(branchForm.businessId)).length;
                      setBranchForm((prev) => ({
                        ...prev,
                        name: bName,
                        code: prev.code || (targetBiz ? `${targetBiz.code}-${String(existingCount + 1).padStart(2, "0")}` : "")
                      }));
                    }}
                    required
                  />
                </label>

                <label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Branch Code *</span>
                    <button
                      type="button"
                      className="btn-sm ghost-btn"
                      style={{ padding: "0 0.35rem", fontSize: "0.72rem", height: "18px" }}
                      onClick={() => {
                        const targetBiz = allCompaniesList.find((c) => String(c.id) === String(branchForm.businessId));
                        if (targetBiz) {
                          const existingCount = branches.filter((b) => String(b.business_id) === String(targetBiz.id)).length;
                          setBranchForm((prev) => ({
                            ...prev,
                            code: `${targetBiz.code}-${String(existingCount + 1).padStart(2, "0")}`
                          }));
                        }
                      }}
                      title="Auto-derive branch code based on selected company"
                    >
                      ⚡ Auto
                    </button>
                  </div>
                  <input
                    placeholder="e.g. AMT-02"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </label>

                <label className="full-span">
                  <span>Location Address</span>
                  <input
                    placeholder="Street, City"
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  />
                </label>

                <label className="full-span">
                  <span>Subscription Package *</span>
                  <SearchableSelect
                    value={branchForm.planId}
                    onChange={(e) => setBranchForm({ ...branchForm, planId: e.target.value })}
                    placeholder="Search subscription package..."
                  >
                    {plansList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (PKR {Number(p.price).toLocaleString(undefined, { maximumFractionDigits: 2 })} / {p.billing_period || "month"})
                      </option>
                    ))}
                  </SearchableSelect>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setShowCreateBranchModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Provisioning..." : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT BRANCH
          ======================================================== */}
      {editingBranch && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setEditingBranch(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEditBranch}>
              <div className="modal-header">
                <h3>Edit Branch Information</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setEditingBranch(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid">
                <label>
                  <span>Branch Name *</span>
                  <input
                    value={editBranchForm.name}
                    onChange={(e) => setEditBranchForm({ ...editBranchForm, name: e.target.value })}
                    required
                  />
                </label>

                <label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Branch Code</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>🔒 Locked</span>
                  </div>
                  <input
                    value={editBranchForm.code}
                    disabled
                    readOnly
                    style={{
                      background: "var(--bg, #f1f5f9)",
                      cursor: "not-allowed",
                      opacity: 0.85,
                      fontWeight: "700"
                    }}
                    title="Branch code cannot be modified once created"
                  />
                </label>

                <label className="full-span">
                  <span>Address</span>
                  <input
                    value={editBranchForm.address}
                    onChange={(e) => setEditBranchForm({ ...editBranchForm, address: e.target.value })}
                  />
                </label>

                <label className="full-span">
                  <span>Assigned Package (Fixed for Branch)</span>
                  <div
                    style={{
                      padding: "0.75rem 0.9rem",
                      background: "var(--surface-strong)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span>🔒</span>
                      <strong>
                        {plansList.find((p) => Number(p.id) === Number(editBranchForm.planId))?.name || "Assigned Package"}
                      </strong>
                      <span className="muted small">
                        (PKR {Number(plansList.find((p) => Number(p.id) === Number(editBranchForm.planId))?.price || 0).toLocaleString()})
                      </span>
                    </div>
                    <span className="status-pill status-info" style={{ fontSize: "0.72rem" }}>
                      Fixed for Branch
                    </span>
                  </div>
                  <span className="small muted" style={{ display: "block", marginTop: "0.25rem" }}>
                    Package and price are fixed for this branch. Cannot be changed here. To reassign, use &quot;Assign Branch Packages&quot; in the menu.
                  </span>
                </label>

                <div className="full-span form-toggle-row">
                  <div>
                    <strong>Branch Operational Status</strong>
                    <span className="muted small">Enable or disable branch operational access</span>
                  </div>
                  <ToggleSwitch
                    checked={Number(editBranchForm.isActive) === 1}
                    onChange={(val) => setEditBranchForm({ ...editBranchForm, isActive: val ? 1 : 0 })}
                    onLabel="Operational"
                    offLabel="Suspended"
                    size="md"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setEditingBranch(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EXTEND SUBSCRIPTION
          ======================================================== */}
      {extendingBranch && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setExtendingBranch(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleExtendBranchSubscription}>
              <div className="modal-header">
                <h3>Extend Branch Subscription</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSubmitting}
                  onClick={() => setExtendingBranch(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <p>
                  Extend subscription validity for <strong>{extendingBranch.name}</strong> (
                  {extendingBranch.business_name || "Company"}).
                </p>

                <label className="form-group">
                  <span>New Valid-Through Expiry Date *</span>
                  <input
                    type="date"
                    value={extensionDate}
                    onChange={(e) => setExtensionDate(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSubmitting}
                  onClick={() => setExtendingBranch(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Extending..." : "Confirm Extension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
