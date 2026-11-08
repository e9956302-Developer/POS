import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "../api.js";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { SectionCard } from "../components/SectionCard.jsx";
import { exportToCSV } from "../utils/export.js";
import { openWhatsAppReminder } from "../utils/whatsapp.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export function PartiesPage({ context }) {
  const { t, isRtl, language } = useLanguage();
  const firstFieldRef = useRef(null);
  const formRef = useRef(null);
  const [form, setForm] = useState({
    branchId: context.session?.branch_id || context.session?.branchId || "",
    partyType: "customer",
    name: "",
    phone: "",
    cnic: "",
    address: "",
    notes: "",
    openingBalance: "",
    openingBalanceType: "receivable",
    openingBalanceDate: new Date().toISOString().slice(0, 10)
  });
  const [list, setList] = useState(context.parties || []);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null); // Modal details view
  const [editingParty, setEditingParty] = useState(null); // Modal edit view
  const [editForm, setEditForm] = useState({});
  const canCreate = context.can ? context.can("parties", "create") : true;
  const canEdit = context.can ? context.can("parties", "edit") : true;
  const canDelete = context.can ? context.can("parties", "delete") : true;
  const canView = context.can ? context.can("parties", "view") : true;
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setList(context.parties || []);
  }, [context.parties]);

  function resetForm() {
    setForm({
      branchId: context.session?.branch_id || context.session?.branchId || "",
      partyType: "customer",
      name: "",
      phone: "",
      cnic: "",
      address: "",
      notes: "",
      openingBalance: "",
      openingBalanceType: "receivable",
      openingBalanceDate: new Date().toISOString().slice(0, 10)
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canCreate) {
      setError("You do not have permission to create parties");
      return;
    }
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      await api.createParty({
        ...form,
        branchId: form.branchId ? Number(form.branchId) : null,
        openingBalance: Number(form.openingBalance || 0),
        openingBalanceType: form.openingBalanceType || (form.partyType === "vendor" ? "payable" : "receivable"),
        openingBalanceDate: form.openingBalanceDate || null
      });
      setSuccess(`Party "${form.name}" registered successfully!`);
      resetForm();
      context.refreshAll();
      setTimeout(() => {
        if (firstFieldRef.current?.focus) {
          firstFieldRef.current.focus();
        } else if (formRef.current) {
          const firstInput = formRef.current.querySelector(
            "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])"
          );
          firstInput?.focus();
        }
      }, 50);
      setTimeout(() => setSuccess(""), 4000);
    } catch (submitError) {
      setError(submitError.message || "Failed to create party");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!canEdit) {
      setError("Permission denied: You do not have permission to edit parties.");
      return;
    }
    if (!editingParty) return;
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      await api.updateParty(editingParty.id, {
        name: editForm.name,
        partyType: editForm.partyType,
        branchId: editForm.branchId ? Number(editForm.branchId) : null,
        phone: editForm.phone,
        cnic: editForm.cnic,
        address: editForm.address,
        notes: editForm.notes,
        openingBalance: Number(editForm.openingBalance || 0),
        openingBalanceType: editForm.openingBalanceType,
        openingBalanceDate: editForm.openingBalanceDate || null
      });
      setSuccess(`Party "${editForm.name}" updated successfully!`);
      setEditingParty(null);
      context.refreshAll();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to update party");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!canDelete) {
      setDeleteError("Permission denied: You do not have permission to delete parties.");
      return;
    }
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await api.deleteParty(deleteTarget.id);
      setSuccess(`Party "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      context.refreshAll();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setDeleteError(err.message || "Failed to delete party");
    } finally {
      setIsDeleting(false);
    }
  }

  // Filtered & Paginated list
  const filteredParties = useMemo(() => {
    return list.filter((p) => {
      if (typeFilter !== "all" && p.party_type !== typeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.cnic && p.cnic.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    });
  }, [list, searchQuery, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredParties.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedParties = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredParties.slice(start, start + pageSize);
  }, [filteredParties, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const total = list.length;
    const customers = list.filter((p) => p.party_type === "customer").length;
    const vendors = list.filter((p) => p.party_type === "vendor").length;
    const both = list.filter((p) => p.party_type === "both").length;
    return { total, customers, vendors, both };
  }, [list]);

  function getBranchName(branchId) {
    if (!branchId) return "Common / All Branches";
    const b = (context.branches || []).find((row) => String(row.id) === String(branchId));
    return b ? b.name : `Branch #${branchId}`;
  }

  return (
    <div className="page-stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* TOP SECTION: PARTY CREATION */}
      <SectionCard
        title={t("parties.card_title", "Party Master & Registration")}
        subtitle={t("parties.card_subtitle", "Create vendors, customers, and hybrid trading contacts.")}
      >
        <form ref={formRef} onSubmit={handleSubmit}>
          {error && (
            <div
              className="alert error"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem"
              }}
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "1.1rem" }}
              >
                ✕
              </button>
            </div>
          )}
          {success && (
            <div
              className="alert success"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem"
              }}
            >
              <span>{success}</span>
              <button
                type="button"
                onClick={() => setSuccess("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "1.1rem" }}
              >
                ✕
              </button>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem"
            }}
          >
            <label>
              <span>{t("parties.branch_access", "Branch Access")}</span>
              <select
                ref={firstFieldRef}
                value={form.branchId}
                onChange={(event) => setForm({ ...form, branchId: event.target.value })}
              >
                <option value="">{t("parties.common_all_branches", "Common / All Branches")}</option>
                {(context.branches || []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t("parties.party_type", "Party Type")} *</span>
              <select
                value={form.partyType}
                onChange={(event) => {
                  const val = event.target.value;
                  setForm({
                    ...form,
                    partyType: val,
                    openingBalanceType: val === "vendor" ? "payable" : "receivable"
                  });
                }}
              >
                <option value="customer">{t("parties.customers", "Customer")}</option>
                <option value="vendor">{t("purchases.vendor_profile", "Vendor")}</option>
                <option value="both">{t("parties.both", "Both (Customer & Vendor)")}</option>
              </select>
            </label>

            <label>
              <span>{t("parties.party_name_label", "Party Name")} *</span>
              <input
                placeholder={t("parties.party_name_placeholder", "e.g. Ali Electronics / Ahmed Khan")}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>

            <label>
              <span>{t("parties.opening_balance", "Opening Balance")} (PKR)</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={form.openingBalance}
                onChange={(event) => setForm({ ...form, openingBalance: event.target.value })}
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
              />
            </label>

            <label>
              <span>{t("parties.balance_nature", "Balance Nature")}</span>
              <select
                value={form.openingBalanceType}
                onChange={(event) => setForm({ ...form, openingBalanceType: event.target.value })}
              >
                <option value="receivable">{t("parties.receivable", "Receivable (Customer owes us)")}</option>
                <option value="payable">{t("parties.payable", "Payable (We owe Vendor)")}</option>
              </select>
            </label>

            <label>
              <span>{t("parties.opening_as_of_date", "Opening As-Of Date")}</span>
              <input
                type="date"
                value={form.openingBalanceDate}
                onChange={(event) => setForm({ ...form, openingBalanceDate: event.target.value })}
              />
            </label>

            <label>
              <span>{t("parties.phone", "Phone Number")}</span>
              <input
                placeholder="e.g. 03001234567"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
              />
            </label>

            <label>
              <span>{t("parties.cnic", "CNIC / National ID")}</span>
              <input
                placeholder="e.g. 42101-1234567-1"
                value={form.cnic}
                onChange={(event) => setForm({ ...form, cnic: event.target.value })}
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
              />
            </label>

            <label>
              <span>{t("parties.address_label", "Shop / Billing Address")}</span>
              <input
                placeholder={t("parties.address_placeholder", "Shop #, Plaza, Market, City")}
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span>{t("parties.notes_label", "Notes & Terms")}</span>
              <input
                placeholder={t("parties.notes_placeholder", "Credit limit, repayment notes, contact person...")}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>
          </div>

          {!canCreate && (
            <div className="alert info" style={{ marginBottom: "1rem" }}>
              ℹ️ <strong>{language === "ur" ? "کھاتے دار بنانے کی اجازت نہیں ہے:" : "Creation Restricted:"}</strong> {t("parties.creation_restricted", "Your account does not have permission to add new parties.")}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setError("");
                setSuccess("");
                resetForm();
              }}
            >
              {t("parties.reset_form", "Reset Form")}
            </button>
            <button className="primary-btn" disabled={!canCreate || isSubmitting}>
              {isSubmitting ? t("parties.saving", "Saving...") : `➕ ${t("parties.save_party_btn", "Save Party")}`}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* BOTTOM SECTION: PARTY DETAILS & DIRECTORY */}
      <SectionCard
        title={t("parties.directory_title", "Party Details & Directory")}
        subtitle={t("parties.directory_subtitle", "Available vendors and customers for transactions.")}
        action={
          <button
            type="button"
            className="ghost-btn btn-sm"
            onClick={() => exportToCSV("Parties_Directory", list)}
            title="Export all parties to CSV spreadsheet"
          >
            📥 {t("common.export_csv", "Export CSV")}
          </button>
        }
      >
        {/* KPI Mini-Counters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.25rem"
          }}
        >
          <div
            style={{
              padding: "0.65rem 0.85rem",
              background: "var(--surface-sunken, rgba(0,0,0,0.1))",
              borderRadius: "10px",
              border: "1px solid var(--border)"
            }}
          >
            <div className="muted small" style={{ fontSize: "0.75rem" }}>{t("parties.all_parties", "Total Parties")}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>{stats.total}</div>
          </div>
          <div
            style={{
              padding: "0.65rem 0.85rem",
              background: "var(--surface-sunken, rgba(0,0,0,0.1))",
              borderRadius: "10px",
              border: "1px solid var(--border)"
            }}
          >
            <div className="muted small" style={{ fontSize: "0.75rem" }}>{t("parties.customers", "Customers")}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#38bdf8" }}>{stats.customers}</div>
          </div>
          <div
            style={{
              padding: "0.65rem 0.85rem",
              background: "var(--surface-sunken, rgba(0,0,0,0.1))",
              borderRadius: "10px",
              border: "1px solid var(--border)"
            }}
          >
            <div className="muted small" style={{ fontSize: "0.75rem" }}>{t("purchases.vendor_profile", "Vendors")}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#f59e0b" }}>{stats.vendors}</div>
          </div>
          <div
            style={{
              padding: "0.65rem 0.85rem",
              background: "var(--surface-sunken, rgba(0,0,0,0.1))",
              borderRadius: "10px",
              border: "1px solid var(--border)"
            }}
          >
            <div className="muted small" style={{ fontSize: "0.75rem" }}>{t("parties.both", "Both (Dual)")}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#a855f7" }}>{stats.both}</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="table-filter-bar wrap" style={{ marginBottom: "1rem" }}>
          <div className="search-input-wrapper" style={{ flex: "1 1 240px" }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("parties.search_placeholder", "Search name, phone, CNIC, address...")}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              style={{ minWidth: "140px" }}
            >
              <option value="all">{t("parties.all_parties", "All Party Types")}</option>
              <option value="customer">{t("parties.customers", "Customers Only")}</option>
              <option value="vendor">{t("purchases.vendor_profile", "Vendors Only")}</option>
              <option value="both">{t("parties.both", "Both (Dual)")}</option>
            </select>

            {(searchQuery || typeFilter !== "all") && (
              <button
                type="button"
                className="secondary-btn btn-sm"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setPage(1);
                }}
              >
                {t("common.reset_filters", "Reset Filters")}
              </button>
            )}
          </div>
        </div>

        {/* Detailed Table View */}
        <div className="table-container" style={{ overflowX: "auto" }}>
          {paginatedParties.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem 1rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👥</div>
              <p style={{ margin: 0, fontWeight: "600" }}>
                {filteredParties.length === 0 && list.length > 0
                  ? t("parties.no_match", "No parties match your filter criteria.")
                  : t("parties.no_parties", "No parties registered yet.")}
              </p>
              <small className="muted">
                {list.length === 0
                  ? t("parties.add_first", "Use the form above to add your first customer or vendor contact.")
                  : t("parties.adjust_filter", "Try adjusting your search query or type filter.")}
              </small>
            </div>
          ) : (
            <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
              <table className="data-table" style={{ width: "100%", minWidth: "960px", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>{t("parties.party_name_label", "Party Name")}</th>
                    <th style={{ minWidth: "95px", whiteSpace: "nowrap" }}>{t("parties.party_type", "Type")}</th>
                    <th style={{ minWidth: "130px", whiteSpace: "nowrap" }}>{t("parties.phone", "Contact Phone")}</th>
                    <th style={{ minWidth: "130px", whiteSpace: "nowrap" }}>{t("parties.cnic", "CNIC / ID")}</th>
                    <th style={{ minWidth: "110px", whiteSpace: "nowrap" }}>{t("common.branch", "Branch")}</th>
                    <th style={{ minWidth: "140px", whiteSpace: "nowrap" }}>{t("parties.opening_balance", "Opening Balance")}</th>
                    <th style={{ minWidth: "160px" }}>{t("parties.address", "Address")}</th>
                    <th style={{ minWidth: "180px", textAlign: isRtl ? "left" : "right", whiteSpace: "nowrap" }}>{t("common.actions", "Actions")}</th>
                  </tr>
                </thead>
              <tbody>
                {paginatedParties.map((party) => {
                  const typeBadgeClass =
                    party.party_type === "customer"
                      ? "status-info"
                      : party.party_type === "vendor"
                      ? "status-warning"
                      : "status-purple";

                  return (
                    <tr key={party.id}>
                      <td>
                        <div style={{ fontWeight: "700" }}>{party.name}</div>
                        {party.notes && (
                          <small className="muted" style={{ fontSize: "0.76rem" }}>
                            {party.notes}
                          </small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${typeBadgeClass}`}
                          style={{ textTransform: "capitalize" }}
                        >
                          {party.party_type}
                        </span>
                      </td>
                      <td>
                        {party.phone ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <a
                              href={`tel:${party.phone}`}
                              style={{ color: "var(--primary)", textDecoration: "none" }}
                            >
                              {party.phone}
                            </a>
                            <button
                              type="button"
                              className="ghost-btn btn-sm"
                              style={{ padding: "2px 6px", fontSize: "0.75rem", color: "#10b981", borderColor: "#10b981" }}
                              onClick={() => {
                                const phoneNum = party.phone.replace(/[^0-9]/g, "");
                                if (phoneNum) {
                                  window.open(`https://wa.me/${phoneNum}`, "_blank", "noopener,noreferrer");
                                }
                              }}
                              title="Chat on WhatsApp"
                            >
                              💬
                            </button>
                          </div>
                        ) : (
                          <span className="muted small">No phone</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem" }}>
                          {party.cnic || <span className="muted">—</span>}
                        </span>
                      </td>
                      <td>
                        <span className="small">{getBranchName(party.branch_id)}</span>
                      </td>
                      <td>
                        {Number(party.opening_balance || 0) > 0 ? (
                          <div>
                            <span
                              style={{
                                fontWeight: "700",
                                color: party.opening_balance_type === "payable" ? "#f59e0b" : "#10b981"
                              }}
                            >
                              PKR {Number(party.opening_balance).toLocaleString()}
                            </span>
                            <div style={{ fontSize: "0.74rem", textTransform: "capitalize", color: "var(--text-muted)" }}>
                              {party.opening_balance_type || "receivable"}{" "}
                              {party.opening_balance_date ? `(${String(party.opening_balance_date).slice(0, 10)})` : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="muted small">PKR 0</span>
                        )}
                      </td>
                      <td style={{ maxWidth: "220px" }}>
                        <span
                          className="small muted"
                          style={{
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                          title={party.address || "No address"}
                        >
                          {party.address || "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.35rem" }}>
                          {/* Edit Button - guarded by canEdit */}
                          {canEdit ? (
                            <button
                              type="button"
                              className="ghost-btn btn-sm"
                              onClick={() => {
                                setEditingParty(party);
                                setEditForm({
                                  name: party.name || "",
                                  partyType: party.party_type || "customer",
                                  branchId: party.branch_id || "",
                                  phone: party.phone || "",
                                  cnic: party.cnic || "",
                                  address: party.address || "",
                                  notes: party.notes || "",
                                  openingBalance: party.opening_balance ?? 0,
                                  openingBalanceType: party.opening_balance_type || (party.party_type === "vendor" ? "payable" : "receivable"),
                                  openingBalanceDate: party.opening_balance_date ? String(party.opening_balance_date).slice(0, 10) : new Date().toISOString().slice(0, 10)
                                });
                              }}
                              title="Edit party details & opening balance"
                            >
                              ✏️ Edit
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="ghost-btn btn-sm"
                              style={{ opacity: 0.45, cursor: "not-allowed" }}
                              title="Edit permission required for your role"
                            >
                              🔒 Edit
                            </button>
                          )}

                          <button
                            type="button"
                            className="secondary-btn btn-sm"
                            onClick={() => setSelectedParty(party)}
                            title="View full party profile & contact details"
                          >
                            👁️ Details
                          </button>

                          {/* Delete Button - guarded by canDelete */}
                          {canDelete ? (
                            <button
                              type="button"
                              className="ghost-btn btn-sm"
                              style={{ color: "var(--danger, #ef4444)" }}
                              onClick={() => {
                                setDeleteError("");
                                setDeleteTarget(party);
                              }}
                              title="Delete party profile"
                            >
                              🗑️ Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="ghost-btn btn-sm"
                              style={{ opacity: 0.45, cursor: "not-allowed" }}
                              title="Delete permission required for your role"
                            >
                              🔒 Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <PaginationBar
          page={currentPage}
          pageSize={pageSize}
          total={filteredParties.length}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </SectionCard>

      {/* PARTY DETAILS MODAL */}
      {selectedParty && (
        <div className="modal-backdrop" onClick={() => setSelectedParty(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "540px" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.4rem" }}>👤</span>
                <h3 style={{ margin: 0 }}>Party Details</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedParty(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: "1.25rem" }}>
              <div
                style={{
                  padding: "1rem",
                  background: "var(--surface-sunken, rgba(0,0,0,0.1))",
                  borderRadius: "12px",
                  marginBottom: "1rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 0.25rem 0" }}>{selectedParty.name}</h3>
                    <span
                      className={`status-pill ${
                        selectedParty.party_type === "customer"
                          ? "status-info"
                          : selectedParty.party_type === "vendor"
                          ? "status-warning"
                          : "status-purple"
                      }`}
                      style={{ textTransform: "capitalize" }}
                    >
                      {selectedParty.party_type} Party
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="muted small">Party ID</span>
                    <div style={{ fontWeight: "700", fontFamily: "var(--font-mono, monospace)" }}>#{selectedParty.id}</div>
                  </div>
                </div>
              </div>

              {/* Opening Balance Card */}
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background:
                    selectedParty.opening_balance_type === "payable"
                      ? "rgba(245, 158, 11, 0.08)"
                      : "rgba(16, 185, 129, 0.08)",
                  border: `1px solid ${
                    selectedParty.opening_balance_type === "payable"
                      ? "rgba(245, 158, 11, 0.3)"
                      : "rgba(16, 185, 129, 0.3)"
                  }`,
                  borderRadius: "10px",
                  marginBottom: "1rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span className="small muted">Opening Balance</span>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        color:
                          selectedParty.opening_balance_type === "payable" ? "#f59e0b" : "#10b981"
                      }}
                    >
                      PKR {Number(selectedParty.opening_balance || 0).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`status-pill ${
                      selectedParty.opening_balance_type === "payable"
                        ? "status-warning"
                        : "status-success"
                    }`}
                    style={{ textTransform: "capitalize" }}
                  >
                    {selectedParty.opening_balance_type || "receivable"}
                  </span>
                </div>
                {selectedParty.opening_balance_date && (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    As of: {String(selectedParty.opening_balance_date).slice(0, 10)}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <span className="muted small" style={{ display: "block" }}>Phone Number</span>
                  <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>
                    {selectedParty.phone || "Not recorded"}
                  </div>
                </div>

                <div>
                  <span className="muted small" style={{ display: "block" }}>CNIC / National ID</span>
                  <div style={{ fontWeight: "600", fontFamily: "var(--font-mono, monospace)", marginTop: "0.2rem" }}>
                    {selectedParty.cnic || "Not recorded"}
                  </div>
                </div>

                <div>
                  <span className="muted small" style={{ display: "block" }}>Assigned Branch</span>
                  <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>
                    {getBranchName(selectedParty.branch_id)}
                  </div>
                </div>

                <div>
                  <span className="muted small" style={{ display: "block" }}>Registered Date</span>
                  <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>
                    {selectedParty.created_at ? new Date(selectedParty.created_at).toLocaleDateString() : "Active"}
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <span className="muted small" style={{ display: "block" }}>Address</span>
                  <div style={{ fontWeight: "500", marginTop: "0.2rem" }}>
                    {selectedParty.address || "No address recorded."}
                  </div>
                </div>

                {selectedParty.notes && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span className="muted small" style={{ display: "block" }}>Notes & Terms</span>
                    <div
                      style={{
                        padding: "0.6rem 0.85rem",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        marginTop: "0.3rem",
                        fontSize: "0.9rem"
                      }}
                    >
                      {selectedParty.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {selectedParty.phone && (
                  <button
                    type="button"
                    className="secondary-btn btn-sm"
                    style={{ color: "#10b981", borderColor: "#10b981" }}
                    onClick={() => {
                      const phoneNum = selectedParty.phone.replace(/[^0-9]/g, "");
                      if (phoneNum) {
                        window.open(`https://wa.me/${phoneNum}`, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    💬 WhatsApp
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    const party = selectedParty;
                    setSelectedParty(null);
                    setEditingParty(party);
                    setEditForm({
                      name: party.name || "",
                      partyType: party.party_type || "customer",
                      branchId: party.branch_id || "",
                      phone: party.phone || "",
                      cnic: party.cnic || "",
                      address: party.address || "",
                      notes: party.notes || "",
                      openingBalance: party.opening_balance ?? 0,
                      openingBalanceType: party.opening_balance_type || (party.party_type === "vendor" ? "payable" : "receivable"),
                      openingBalanceDate: party.opening_balance_date ? String(party.opening_balance_date).slice(0, 10) : new Date().toISOString().slice(0, 10)
                    });
                  }}
                >
                  ✏️ Edit Party
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setSelectedParty(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PARTY MODAL */}
      {editingParty && (
        <div className="modal-backdrop" onClick={() => setEditingParty(null)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "560px" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.4rem" }}>✏️</span>
                <h3 style={{ margin: 0 }}>{t("common.edit", "Edit")} #{editingParty.id}</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setEditingParty(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ padding: "1.25rem" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1rem"
                  }}
                >
                  <label>
                    <span>{t("parties.branch_access", "Branch Access")}</span>
                    <select
                      value={editForm.branchId || ""}
                      onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                    >
                      <option value="">{t("parties.common_all_branches", "Common / All Branches")}</option>
                      {(context.branches || []).map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>{t("parties.party_type", "Party Type")} *</span>
                    <select
                      value={editForm.partyType || "customer"}
                      onChange={(e) => setEditForm({ ...editForm, partyType: e.target.value })}
                    >
                      <option value="customer">{t("parties.customers", "Customer")}</option>
                      <option value="vendor">{t("purchases.vendor_profile", "Vendor")}</option>
                      <option value="both">{t("parties.both", "Both (Customer & Vendor)")}</option>
                    </select>
                  </label>

                  <label style={{ gridColumn: "1 / -1" }}>
                    <span>{t("parties.party_name_label", "Party Name")} *</span>
                    <input
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </label>

                  <label>
                    <span>{t("parties.opening_balance", "Opening Balance")} (PKR)</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.openingBalance ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, openingBalance: e.target.value })}
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                    />
                  </label>

                  <label>
                    <span>{t("parties.balance_nature", "Balance Nature")}</span>
                    <select
                      value={editForm.openingBalanceType || "receivable"}
                      onChange={(e) => setEditForm({ ...editForm, openingBalanceType: e.target.value })}
                    >
                      <option value="receivable">{t("parties.receivable", "Receivable (Customer owes us)")}</option>
                      <option value="payable">{t("parties.payable", "Payable (We owe Vendor)")}</option>
                    </select>
                  </label>

                  <label>
                    <span>{t("parties.opening_as_of_date", "Opening As-Of Date")}</span>
                    <input
                      type="date"
                      value={editForm.openingBalanceDate || ""}
                      onChange={(e) => setEditForm({ ...editForm, openingBalanceDate: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>{t("parties.phone", "Phone Number")}</span>
                    <input
                      value={editForm.phone || ""}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                    />
                  </label>

                  <label>
                    <span>{t("parties.cnic", "CNIC / National ID")}</span>
                    <input
                      value={editForm.cnic || ""}
                      onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })}
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                    />
                  </label>

                  <label>
                    <span>{t("parties.address_label", "Shop / Billing Address")}</span>
                    <input
                      value={editForm.address || ""}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </label>

                  <label style={{ gridColumn: "1 / -1" }}>
                    <span>{t("parties.notes_label", "Notes & Terms")}</span>
                    <input
                      value={editForm.notes || ""}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setEditingParty(null)}
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSubmitting || !canEdit}
                  title={!canEdit ? "Permission denied: Cannot edit party" : ""}
                >
                  {isSubmitting ? t("parties.saving", "Saving...") : `💾 ${t("common.save_changes", "Save Changes")}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PARTY CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <h3 style={{ color: "var(--danger, #ef4444)", margin: 0 }}>⚠️ Delete Party</h3>
              <button
                type="button"
                className="close-btn"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: "1.25rem" }}>
              {deleteError && <div className="alert error" style={{ marginBottom: "1rem" }}>{deleteError}</div>}
              <p style={{ margin: "0 0 0.5rem 0" }}>
                Are you sure you want to delete party <strong>"{deleteTarget.name}"</strong>?
              </p>
              <p className="muted small" style={{ margin: 0 }}>
                This party profile will be removed from future transactions. Past invoices and sales linked to this party remain securely archived in audit logs.
              </p>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", padding: "1rem 1.25rem" }}>
              <button
                type="button"
                className="secondary-btn"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{ background: "var(--danger, #ef4444)", borderColor: "#dc2626" }}
                disabled={isDeleting || !canDelete}
                title={!canDelete ? "Permission denied: Cannot delete party" : ""}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
