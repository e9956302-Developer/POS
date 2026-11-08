import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { exportToCSV } from "../utils/export.js";
import { formatPhoneNumberForWhatsApp } from "../utils/whatsapp.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { ReceiptModal } from "../components/ReceiptModal.jsx";
import { TableActionButton } from "../components/TableActionColumn.jsx";

export function RepairsPage({ context }) {
  const { t, isRtl, formatCurrency } = useLanguage();
  const canCreate = context?.can ? context.can("repairs", "create") : false;
  const canEdit = context?.can ? context.can("repairs", "edit") : false;
  const canDelete = context?.can ? context.can("repairs", "delete") : false;
  const canView = context?.can ? context.can("repairs", "view") : true;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [receiptTicket, setReceiptTicket] = useState(null);
  const [lastSavedTicket, setLastSavedTicket] = useState(null);

  const defaultBranchId = context?.session?.branch_id || context?.session?.branchId || "";
  const shopName = context?.companyName || context?.session?.business_name || context?.session?.businessName || "DigitalMarkaz360";
  const companyLogo = context?.companyLogo || context?.session?.business_logo || context?.session?.logo_url || context?.session?.businessLogo || (typeof window !== "undefined" && window.__POS_COMPANY_LOGO__) || null;

  const [createForm, setCreateForm] = useState({
    branchId: defaultBranchId,
    customerName: "",
    customerPhone: "",
    modelName: "",
    imei: "",
    issueDescription: "",
    estimatedCost: "",
    advancePaid: "",
    technicianName: ""
  });

  const [updateForm, setUpdateForm] = useState({
    status: "received",
    actualCost: "",
    diagnosisNotes: "",
    technicianName: "",
    warrantyDays: 30
  });

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  async function loadTickets() {
    setLoading(true);
    setError("");
    try {
      let q = "";
      if (statusFilter !== "all") q += `?status=${statusFilter}`;
      const data = await api.repairs(q);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load repair tickets.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTicket(e) {
    e.preventDefault();
    if (!canCreate) {
      setError("Permission denied: You do not have permission to create repair tickets.");
      return;
    }
    setError("");
    setMessage("");
    try {
      const res = await api.createRepair(createForm);
      setMessage(`Ticket ${res.ticketNumber} created successfully!`);
      setShowCreateModal(false);

      // Open Repair Intake Claim Slip (80mm Thermal & A4)
      const newTicketData = {
        id: res.id,
        ticket_number: res.ticketNumber,
        received_date: new Date().toISOString().slice(0, 10),
        customer_name: createForm.customerName,
        customer_phone: createForm.customerPhone,
        model_name: createForm.modelName,
        imei: createForm.imei,
        issue_description: createForm.issueDescription,
        estimated_cost: Number(createForm.estimatedCost || 0),
        advance_paid: Number(createForm.advancePaid || 0),
        technician_name: createForm.technicianName,
        status: "received",
        is_delivery: false
      };
      setReceiptTicket(newTicketData);
      setLastSavedTicket(newTicketData);

      setCreateForm({
        branchId: defaultBranchId,
        customerName: "",
        customerPhone: "",
        modelName: "",
        imei: "",
        issueDescription: "",
        estimatedCost: "",
        advancePaid: "",
        technicianName: ""
      });
      loadTickets();
    } catch (err) {
      setError(err.message || "Failed to create repair ticket.");
    }
  }

  function openUpdateModal(ticket) {
    if (!canEdit) {
      setError("Permission denied: You do not have permission to update repair tickets.");
      return;
    }
    setSelectedTicket(ticket);
    setUpdateForm({
      status: ticket.status,
      actualCost: ticket.actual_cost || ticket.estimated_cost || "",
      diagnosisNotes: ticket.diagnosis_notes || "",
      technicianName: ticket.technician_name || "",
      warrantyDays: ticket.warranty_days || 30
    });
    setShowUpdateModal(true);
  }

  async function handleUpdateTicket(e) {
    e.preventDefault();
    if (!canEdit) {
      setError("Permission denied: You do not have permission to update repair tickets.");
      return;
    }
    if (!selectedTicket) return;
    setError("");
    setMessage("");
    try {
      await api.updateRepairStatus(selectedTicket.id, updateForm);
      setMessage(`Ticket #${selectedTicket.ticket_number} updated.`);
      setShowUpdateModal(false);

      // If status marked as delivered, open Repair Delivery & Payment Receipt
      if (updateForm.status === "delivered") {
        setReceiptTicket({
          ...selectedTicket,
          ...updateForm,
          status: "delivered",
          is_delivery: true,
          delivered_date: new Date().toISOString().slice(0, 10),
          actual_cost: Number(updateForm.actualCost || selectedTicket.estimated_cost || 0),
          advance_paid: Number(selectedTicket.advance_paid || 0),
          warranty_days: Number(updateForm.warrantyDays || 0)
        });
      }

      loadTickets();
    } catch (err) {
      setError(err.message || "Failed to update ticket.");
    }
  }

  async function handleCancelTicket(ticket) {
    if (!canDelete) {
      setError("Permission denied: You do not have permission to cancel or delete repair tickets.");
      return;
    }
    if (!window.confirm(`Are you sure you want to cancel repair ticket #${ticket.ticket_number}?`)) return;
    setError("");
    setMessage("");
    try {
      await api.cancelRepair(ticket.id);
      setMessage(`Ticket #${ticket.ticket_number} cancelled.`);
      loadTickets();
    } catch (err) {
      setError(err.message || "Failed to cancel ticket.");
    }
  }

  function sendWhatsAppStatus(ticket) {
    const clean = formatPhoneNumberForWhatsApp(ticket.customer_phone);
    if (!clean) {
      alert("No valid customer phone number recorded on this ticket.");
      return;
    }
    const statusText = ticket.status === "repaired" 
      ? "is repaired and ready for pickup!" 
      : `is currently in status: ${ticket.status.toUpperCase()}.`;
    const costText = ticket.actual_cost > 0 ? ` Outstanding charges: Rs. ${Number(ticket.actual_cost - ticket.advance_paid).toLocaleString()}.` : "";
    const msg = `Hello ${ticket.customer_name},\n\nUpdate regarding your repair ticket *${ticket.ticket_number}* from *${shopName}*:\nYour device *${ticket.model_name}* ${statusText}${costText}\n\nThank you!`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  const stats = useMemo(() => {
    let inProgress = 0;
    let ready = 0;
    let delivered = 0;
    for (const t of tickets) {
      if (t.status === "received" || t.status === "diagnosing" || t.status === "waiting_parts") inProgress++;
      if (t.status === "repaired") ready++;
      if (t.status === "delivered") delivered++;
    }
    return { total: tickets.length, inProgress, ready, delivered };
  }, [tickets]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.6rem", fontWeight: "800" }}>🔧 {t("repairs.title", "Device Repairs & Warranty")}</h2>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            {t("repairs.subtitle", "Mobile handset repair ticketing, technician tracking, and warranty claim management.")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="primary-btn"
            disabled={!canCreate}
            onClick={() => canCreate && setShowCreateModal(true)}
            title={!canCreate ? "Creation restricted" : ""}
          >
            {canCreate ? t("repairs.new_ticket_btn", "➕ New Repair Ticket") : `🔒 ${t("repairs.new_ticket_btn", "New Ticket (Restricted)")}`}
          </button>
          <button className="ghost-btn" onClick={() => exportToCSV("Repair_Tickets", tickets)}>
            {t("repairs.export_csv", "📥 Export CSV")}
          </button>
        </div>
      </div>

      {error && <div className="alert-banner alert-error">{error}</div>}
      {message && (
        <div className="alert-banner alert-success" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <span>{message}</span>
          {lastSavedTicket && (
            <button
              type="button"
              className="secondary-btn btn-sm"
              onClick={() => setReceiptTicket(lastSavedTicket)}
              style={{ background: "#059669", color: "#ffffff", borderColor: "#047857", fontWeight: "700" }}
            >
              🧾 Print Intake Slip #{lastSavedTicket.ticket_number}
            </button>
          )}
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <StatCard label={t("repairs.stat_total", "Total Tickets")} value={stats.total} />
        <StatCard label={t("repairs.stat_in_progress", "In Progress / Diagnosing")} value={stats.inProgress} />
        <StatCard label={t("repairs.stat_ready", "Ready for Delivery")} value={stats.ready} />
        <StatCard label={t("repairs.stat_delivered", "Delivered")} value={stats.delivered} />
      </div>

      {/* Tickets Directory */}
      <SectionCard title={t("repairs.active_tickets", "Active Repair Tickets")} subtitle={t("repairs.active_tickets_subtitle", "Track device diagnostics, repair stages, and customer delivery.")}>
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder={t("repairs.search_placeholder", "Search ticket #, customer, model, IMEI...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-text"
            style={{ maxWidth: "340px" }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-select"
            style={{ maxWidth: "200px" }}
          >
            <option value="all">{t("repairs.all_statuses", "All Statuses")}</option>
            <option value="received">{t("repairs.status_received", "Received")}</option>
            <option value="diagnosing">{t("repairs.status_diagnosing", "Diagnosing")}</option>
            <option value="waiting_parts">{t("repairs.status_waiting_parts", "Waiting for Parts")}</option>
            <option value="repaired">{t("repairs.status_repaired", "Repaired (Ready)")}</option>
            <option value="delivered">{t("repairs.status_delivered", "Delivered")}</option>
            <option value="cancelled">{t("repairs.status_cancelled", "Cancelled")}</option>
          </select>
        </div>

        <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
          <table className="data-table" style={{ minWidth: "900px", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ minWidth: "110px", whiteSpace: "nowrap" }}>{t("repairs.table_ticket", "Ticket #")}</th>
                <th style={{ minWidth: "140px", whiteSpace: "nowrap" }}>{t("repairs.table_customer", "Customer")}</th>
                <th style={{ minWidth: "150px", whiteSpace: "nowrap" }}>{t("repairs.table_device", "Device Model")}</th>
                <th style={{ minWidth: "140px", whiteSpace: "nowrap" }}>{t("repairs.table_imei", "IMEI / Serial")}</th>
                <th style={{ minWidth: "160px" }}>{t("repairs.table_issue", "Issue")}</th>
                <th style={{ minWidth: "125px", textAlign: "right", whiteSpace: "nowrap" }}>{t("repairs.table_cost", "Est / Act Cost")}</th>
                <th style={{ minWidth: "100px", textAlign: "center", whiteSpace: "nowrap" }}>{t("repairs.table_status", "Status")}</th>
                <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>{t("repairs.table_actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {tickets
                .filter((t) => {
                  if (!search.trim()) return true;
                  const q = search.toLowerCase();
                  return (
                    t.ticket_number.toLowerCase().includes(q) ||
                    t.customer_name.toLowerCase().includes(q) ||
                    (t.customer_phone && t.customer_phone.includes(q)) ||
                    t.model_name.toLowerCase().includes(q) ||
                    (t.imei && t.imei.includes(q))
                  );
                })
                .map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: "700", fontFamily: "var(--font-mono, monospace)", direction: "ltr", unicodeBidi: "isolate" }}>{t.ticket_number}</td>
                    <td>
                      <div style={{ fontWeight: "600" }}>{t.customer_name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", direction: "ltr", unicodeBidi: "isolate" }}>{t.customer_phone || "—"}</div>
                    </td>
                    <td style={{ fontWeight: "600" }}>{t.model_name}</td>
                    <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem", direction: "ltr", unicodeBidi: "isolate" }}>{t.imei || t.serial_number || "—"}</td>
                    <td style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.issue_description}
                    </td>
                    <td>
                      <span style={{ fontWeight: "700", color: "#10b981", direction: "ltr", unicodeBidi: "isolate" }}>
                        {formatCurrency(Number(t.actual_cost > 0 ? t.actual_cost : t.estimated_cost))}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        t.status === "delivered" ? "badge-success" :
                        t.status === "repaired" ? "badge-info" :
                        t.status === "cancelled" ? "badge-error" : "badge-warning"
                      }`}>
                        {t(`repairs.status_${t.status}`, t.status.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                      <div className="table-actions-vertical">
                        <TableActionButton
                          variant="receipt"
                          icon="🧾"
                          label="Slip"
                          onClick={() => setReceiptTicket(t)}
                          title="Print 80mm thermal repair intake/delivery slip"
                        />
                        {canEdit && (
                          <TableActionButton
                            variant="edit"
                            icon="✏️"
                            label={t("common.edit", "Update")}
                            onClick={() => openUpdateModal(t)}
                            title="Update repair progress, parts or charges"
                          />
                        )}
                        {canDelete && t.status !== "cancelled" && (
                          <TableActionButton
                            variant="delete"
                            icon="❌"
                            label={t("common.cancel", "Cancel")}
                            onClick={() => handleCancelTicket(t)}
                            title="Cancel this ticket"
                          />
                        )}
                        {t.customer_phone && (
                          <TableActionButton
                            variant="whatsapp"
                            icon="💬"
                            label="WhatsApp"
                            onClick={() => sendWhatsAppStatus(t)}
                            title="Send WhatsApp update to customer"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* CREATE REPAIR TICKET MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px"
        }}>
          <div className="modal-dialog" style={{
            background: "var(--surface)", color: "var(--text)",
            borderRadius: "14px", width: "90%", maxWidth: "650px", border: "1px solid var(--border)", padding: "24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>➕ {t("repairs.new_ticket_title", "New Device Repair Intake")}</h3>
              <button onClick={() => setShowCreateModal(false)} className="ghost-btn">✕</button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="input-label">{t("repairs.customer_name", "Customer Name *")}</label>
                  <input
                    type="text" required
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                    className="input-text" placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="input-label">{t("repairs.customer_phone", "Customer Phone")}</label>
                  <input
                    type="text"
                    value={createForm.customerPhone}
                    onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                    className="input-text" placeholder="03XXXXXXXXX"
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </div>
                <div>
                  <label className="input-label">{t("repairs.device_model", "Device Model *")}</label>
                  <input
                    type="text" required
                    value={createForm.modelName}
                    onChange={(e) => setCreateForm({ ...createForm, modelName: e.target.value })}
                    className="input-text" placeholder="e.g. iPhone 13 Pro Max"
                  />
                </div>
                <div>
                  <label className="input-label">{t("repairs.imei_serial", "IMEI / Serial #")}</label>
                  <input
                    type="text"
                    value={createForm.imei}
                    onChange={(e) => setCreateForm({ ...createForm, imei: e.target.value })}
                    className="input-text" placeholder="15-digit IMEI"
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="input-label">{t("repairs.issue_desc", "Issue Description *")}</label>
                  <textarea
                    required rows="2"
                    value={createForm.issueDescription}
                    onChange={(e) => setCreateForm({ ...createForm, issueDescription: e.target.value })}
                    className="input-text" placeholder="Fault description, damaged screen, battery replacement..."
                  />
                </div>
                <div>
                  <label className="input-label">{t("repairs.estimated_cost", "Estimated Cost (Rs.)")}</label>
                  <input
                    type="number"
                    value={createForm.estimatedCost}
                    onChange={(e) => setCreateForm({ ...createForm, estimatedCost: e.target.value })}
                    className="input-text" placeholder="0"
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </div>
                <div>
                  <label className="input-label">{t("repairs.advance_paid", "Advance Paid (Rs.)")}</label>
                  <input
                    type="number"
                    value={createForm.advancePaid}
                    onChange={(e) => setCreateForm({ ...createForm, advancePaid: e.target.value })}
                    className="input-text" placeholder="0"
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="input-label">{t("repairs.assigned_technician", "Assigned Technician")}</label>
                  <input
                    type="text"
                    value={createForm.technicianName}
                    onChange={(e) => setCreateForm({ ...createForm, technicianName: e.target.value })}
                    className="input-text" placeholder="Technician Name"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="ghost-btn">{t("common.cancel", "Cancel")}</button>
                <button type="submit" className="primary-btn" disabled={!canCreate}>{t("repairs.create_ticket_btn", "Create Ticket")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {showUpdateModal && selectedTicket && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px"
        }}>
          <div className="modal-dialog" style={{
            background: "var(--surface)", color: "var(--text)",
            borderRadius: "14px", width: "90%", maxWidth: "550px", border: "1px solid var(--border)", padding: "24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>{t("repairs.update_ticket_title", { ticket: selectedTicket.ticket_number })}</h3>
              <button onClick={() => setShowUpdateModal(false)} className="ghost-btn">✕</button>
            </div>

            <form onSubmit={handleUpdateTicket} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="input-label">{t("repairs.repair_status", "Repair Status")}</label>
                <select
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="input-select"
                >
                  <option value="received">{t("repairs.status_received", "Received")}</option>
                  <option value="diagnosing">{t("repairs.status_diagnosing", "Diagnosing")}</option>
                  <option value="waiting_parts">{t("repairs.status_waiting_parts", "Waiting for Parts")}</option>
                  <option value="repaired">{t("repairs.status_repaired", "Repaired (Ready for Delivery)")}</option>
                  <option value="delivered">{t("repairs.status_delivered", "Delivered to Customer")}</option>
                  <option value="cancelled">{t("repairs.status_cancelled", "Cancelled")}</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="input-label">{t("repairs.actual_cost", "Actual Cost (Rs.)")}</label>
                  <input
                    type="number"
                    value={updateForm.actualCost}
                    onChange={(e) => setUpdateForm({ ...updateForm, actualCost: e.target.value })}
                    className="input-text"
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </div>
                <div>
                  <label className="input-label">{t("repairs.warranty_days", "Warranty (Days)")}</label>
                  <input
                    type="number"
                    value={updateForm.warrantyDays}
                    onChange={(e) => setUpdateForm({ ...updateForm, warrantyDays: e.target.value })}
                    className="input-text"
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">{t("repairs.diagnosis_notes", "Diagnosis & Work Notes")}</label>
                <textarea
                  rows="3"
                  value={updateForm.diagnosisNotes}
                  onChange={(e) => setUpdateForm({ ...updateForm, diagnosisNotes: e.target.value })}
                  className="input-text" placeholder="Parts replaced, repair details..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => setShowUpdateModal(false)} className="ghost-btn">{t("common.cancel", "Cancel")}</button>
                <button type="submit" className="primary-btn" disabled={!canEdit}>{t("repairs.update_ticket_btn", "Save Changes")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPAIR INTAKE & DELIVERY RECEIPT MODAL */}
      <ReceiptModal
        isOpen={Boolean(receiptTicket)}
        onClose={() => setReceiptTicket(null)}
        type="repair"
        data={receiptTicket}
        defaultMode="thermal"
        shopName={shopName}
        companyLogo={companyLogo}
      />
    </div>
  );
}
