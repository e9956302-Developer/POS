import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { SectionCard } from "../components/SectionCard.jsx";
import { ReturnOrderModal } from "../components/ReturnOrderModal.jsx";
import { LineItemScanner } from "../components/LineItemScanner.jsx";
import { SearchableSelect } from "../components/SearchableSelect.jsx";
import { exportToCSV } from "../utils/export.js";
import { openWhatsAppReminder } from "../utils/whatsapp.js";
import { smoothScrollTo } from "../utils/scroll.js";
import { AdaptiveTable } from "../components/AdaptiveTable.jsx";
import { ReceiptModal } from "../components/ReceiptModal.jsx";
import { TableActionButton } from "../components/TableActionColumn.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

function printInvoice() {
  window.print();
}

function formatCnic(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}
const CNIC_REGEX = /^(\d{5}-\d{7}-\d{1}|\d{13})$/;

export function InvoicesPage({ context }) {
  const { t, isRtl, formatCurrency } = useLanguage();
  const [type, setType] = useState("sale");
  const [id, setId] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Invoice directory list state
  const [invoicesList, setInvoicesList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [orderForReturn, setOrderForReturn] = useState(null);

  // Receipt Modal State
  const [receiptModal, setReceiptModal] = useState({
    isOpen: false,
    data: null,
    type: "sale",
    defaultMode: "thermal"
  });
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  async function handleOpenInvoiceReceipt(ord, targetType = type, mode = "thermal") {
    try {
      const full = targetType === "sale" ? await api.getSale(ord.id) : await api.getPurchase(ord.id);
      setReceiptModal({
        isOpen: true,
        data: full,
        type: targetType,
        defaultMode: mode
      });
    } catch {
      setReceiptModal({
        isOpen: true,
        data: ord,
        type: targetType,
        defaultMode: mode
      });
    }
  }

  const shopName = context?.companyName || context?.session?.business_name || context?.session?.businessName || "DigitalMarkaz360";
  const companyLogo = context?.companyLogo || context?.session?.business_logo || context?.session?.logo_url || context?.session?.businessLogo || (typeof window !== "undefined" && window.__POS_COMPANY_LOGO__) || null;

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "cash",
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: ""
  });

  // Deletion Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Order Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [hasAttemptedEditSubmit, setHasAttemptedEditSubmit] = useState(false);

  // Edit Form Computed Values
  const editSubtotal = useMemo(() => {
    if (!editForm?.items) return 0;
    return editForm.items.reduce((sum, item) => {
      const isProduct = item.itemType === "product" || Boolean(item.productId);
      const qty = isProduct ? Number(item.quantity || 1) : 1;
      const rate = Number(type === "sale" ? item.unitPrice : item.unitCost) || 0;
      return sum + (qty * rate);
    }, 0);
  }, [editForm?.items, type]);

  const editDiscountVal = Number(editForm?.discountAmount || 0);
  const editTaxVal = Number(editForm?.taxAmount || 0);
  const editNetAmount = editSubtotal - (type === "purchase" ? editDiscountVal : 0) + editTaxVal;
  const editPaidVal = Number(editForm?.paidAmount || 0);
  const editBalanceAmount = editNetAmount - editPaidVal;
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (type === "purchase" && editForm && editBalanceAmount <= 0 && editForm.dueDate) {
      setEditForm((prev) => (prev ? { ...prev, dueDate: "" } : prev));
    }
  }, [type, editBalanceAmount, editForm?.dueDate]);

  const editDiscountError = type === "purchase"
    ? (editDiscountVal < 0
      ? "Discount cannot be negative"
      : (editDiscountVal > editSubtotal ? "Discount cannot be more than Subtotal" : ""))
    : "";

  const editPaidError = type === "purchase"
    ? (editPaidVal < 0
      ? "Paid Amount cannot be negative"
      : (editPaidVal > editNetAmount ? "Paid Amount cannot be more than Net Amount" : ""))
    : "";

  const editDueDateError = type === "purchase" && editBalanceAmount > 0
    ? (!editForm?.dueDate
      ? (hasAttemptedEditSubmit ? "Due Date is required when a balance is due" : "")
      : (editForm.dueDate < todayStr ? "Due Date cannot be in the past" : ""))
    : "";

  const editPurchaserNameError = type === "purchase" && editForm && !editForm.vendorId
    ? (!editForm.purchaserName?.trim() && hasAttemptedEditSubmit ? "Purchaser Name is required" : "")
    : "";

  const editPurchaserCnicError = type === "purchase" && editForm && !editForm.vendorId
    ? (!editForm.purchaserCnic?.trim()
      ? (hasAttemptedEditSubmit ? "Purchaser CNIC is required" : "")
      : (!CNIC_REGEX.test(editForm.purchaserCnic.trim()) ? "Invalid CNIC format. Expected format: 12345-1234567-1 or 13 digits" : ""))
    : "";

  const canPostPayment = context?.can ? context.can("invoices", "payment") : true;
  const canEdit = context?.can ? context.can(type === "sale" ? "sales" : "purchases", "edit") : true;
  const canDelete = context?.can ? context.can(type === "sale" ? "sales" : "purchases", "delete") : true;

  const customerOptions = useMemo(
    () => (context?.parties || []).filter((party) => party.party_type === "customer" || party.party_type === "both"),
    [context?.parties]
  );
  const vendorOptions = useMemo(
    () => (context?.parties || []).filter((party) => party.party_type === "vendor" || party.party_type === "both"),
    [context?.parties]
  );

  const [productsList, setProductsList] = useState(context?.products || []);
  const availableProducts = useMemo(() => {
    if (Array.isArray(productsList) && productsList.length > 0) return productsList;
    if (Array.isArray(context?.products) && context?.products.length > 0) return context?.products;
    return [];
  }, [context?.products, productsList]);

  useEffect(() => {
    if (Array.isArray(context?.products) && context?.products.length > 0) {
      setProductsList(context.products);
    }
  }, [context?.products]);

  useEffect(() => {
    let isMounted = true;
    api.products()
      .then((rows) => {
        if (isMounted && Array.isArray(rows)) {
          setProductsList(rows);
          if (context?.setProducts) context.setProducts(rows);
        }
      })
      .catch(() => { });
    return () => { isMounted = false; };
  }, [context?.session?.branch_id]);

  async function fetchInvoiceDirectory() {
    setLoadingList(true);
    try {
      const qParams = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });
      if (search.trim()) qParams.append("search", search.trim());
      if (statusFilter && statusFilter !== "all") qParams.append("status", statusFilter);

      const res = type === "sale"
        ? await api.sales(`?${qParams.toString()}`)
        : await api.purchases(`?${qParams.toString()}`);

      setInvoicesList(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      } else {
        setPagination({ page: 1, limit: limit, total: (res.data || []).length, totalPages: 1 });
      }
    } catch (e) {
      console.error("Failed to load invoice directory:", e);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchInvoiceDirectory();
  }, [type, page, limit, statusFilter]);

  async function handleSearchSubmit(e) {
    if (e) e.preventDefault();
    setPage(1);
    fetchInvoiceDirectory();
  }

  async function loadInvoiceById(targetId) {
    setError("");
    setMessage("");
    try {
      const result = type === "sale" ? await api.getSale(targetId) : await api.getPurchase(targetId);
      setInvoice(result);
      setId(result.id);
      smoothScrollTo("invoice-details-view", { offset: 85, delay: 70 });
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function loadInvoice(event) {
    if (event) event.preventDefault();
    if (!id) return;
    loadInvoiceById(id);
  }

  async function postPayment(event) {
    event.preventDefault();
    if (!canPostPayment) {
      setError("You do not have permission to post payments");
      return;
    }
    if (!invoice) return;

    setError("");
    setMessage("");
    try {
      await api.createPayment({
        referenceType: type,
        referenceId: invoice.id,
        branchId: invoice.branch_id,
        partyId: invoice.customer_id || invoice.vendor_id || null,
        paymentMethod: paymentForm.paymentMethod,
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes
      });
      const refreshed = type === "sale" ? await api.getSale(invoice.id) : await api.getPurchase(invoice.id);
      setInvoice(refreshed);
      setMessage("Payment recorded successfully!");

      // Open Payment Collection / Disbursement Receipt (Thermal 80mm & A4)
      setPaymentReceipt({
        voucher_number: `PAY-${Date.now().toString().slice(-6)}`,
        payment_date: paymentForm.paymentDate,
        reference_invoice: invoice.invoice_number,
        direction: type === "sale" ? "in" : "out",
        type: type,
        customer_name: invoice.customer_name,
        vendor_name: invoice.vendor_name,
        party_name: invoice.customer_name || invoice.vendor_name || invoice.party_name || invoice.purchaser_name,
        party_phone: invoice.customer_phone || invoice.vendor_phone || invoice.phone,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.paymentMethod,
        previous_balance: Number(invoice.balance_amount || 0),
        new_balance: Math.max(0, Number(invoice.balance_amount || 0) - Number(paymentForm.amount)),
        notes: paymentForm.notes
      });

      setPaymentForm({
        amount: "",
        paymentMethod: "cash",
        paymentDate: new Date().toISOString().slice(0, 10),
        notes: ""
      });
      fetchInvoiceDirectory();
    } catch (paymentError) {
      setError(paymentError.message);
    }
  }

  function openEditModal(targetOrder = null) {
    const ord = targetOrder || invoice;
    if (!ord) return;
    setEditError("");
    setHasAttemptedEditSubmit(false);

    const initialItems = (ord.items || []).map((it) => {
      if (it.product_id) {
        return {
          itemType: "product",
          productId: it.product_id,
          quantity: it.quantity || 1,
          unitPrice: it.unit_price,
          unitCost: it.unit_cost
        };
      }
      return {
        itemType: "handset",
        imei: it.imei || "",
        modelId: it.model_id,
        unitPrice: it.unit_price,
        unitCost: it.unit_cost,
        quantity: 1
      };
    });

    if (initialItems.length === 0) {
      initialItems.push({
        itemType: "handset",
        imei: "",
        modelId: "",
        unitPrice: "",
        unitCost: "",
        quantity: 1
      });
    }

    if (type === "sale") {
      setEditForm({
        customerId: ord.customer_id ? String(ord.customer_id) : "",
        saleDate: ord.sale_date ? ord.sale_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        paymentMethod: ord.payment_method || "cash",
        taxAmount: ord.tax_amount || "",
        paidAmount: ord.paid_amount || "",
        dueDate: ord.due_date ? ord.due_date.slice(0, 10) : "",
        notes: ord.notes || "",
        items: initialItems
      });
    } else {
      setEditForm({
        vendorId: ord.vendor_id ? String(ord.vendor_id) : "",
        purchaserName: ord.purchaser_name || "",
        purchaserCnic: ord.purchaser_cnic || "",
        purchaseDate: ord.purchase_date ? ord.purchase_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        paymentMethod: ord.payment_method || "cash",
        discountAmount: Number(ord.discount_amount || 0),
        taxAmount: Number(ord.tax_amount || 0),
        paidAmount: Number(ord.paid_amount || 0),
        dueDate: ord.due_date ? ord.due_date.slice(0, 10) : "",
        notes: ord.notes || "",
        items: initialItems
      });
    }

    setShowEditModal(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!canEdit) {
      setEditError("Permission denied: You do not have permission to edit this transaction.");
      return;
    }
    setHasAttemptedEditSubmit(true);
    if (!invoice || !editForm) return;

    if (type === "purchase") {
      if (!editForm.vendorId) {
        if (!editForm.purchaserName || !editForm.purchaserName.trim()) {
          setEditError("Purchaser Name is required when no vendor is selected");
          return;
        }
        if (!editForm.purchaserCnic || !editForm.purchaserCnic.trim()) {
          setEditError("Purchaser CNIC is required when no vendor is selected");
          return;
        }
        if (!CNIC_REGEX.test(editForm.purchaserCnic.trim())) {
          setEditError("Invalid CNIC format. Expected format: 12345-1234567-1 or 13 digits");
          return;
        }
      }
      if (editDiscountVal < 0) {
        setEditError("Discount amount cannot be negative");
        return;
      }
      if (editDiscountVal > editSubtotal) {
        setEditError("Discount cannot be more than Subtotal");
        return;
      }
      if (editTaxVal < 0) {
        setEditError("Tax amount cannot be negative");
        return;
      }
      if (editPaidVal < 0) {
        setEditError("Paid amount cannot be negative");
        return;
      }
      if (editPaidVal > editNetAmount) {
        setEditError("Paid Amount cannot be more than Net Amount");
        return;
      }
      if (editBalanceAmount > 0) {
        if (!editForm.dueDate) {
          setEditError("Due Date is required when a balance is due");
          return;
        }
        if (editForm.dueDate < todayStr) {
          setEditError("Due Date cannot be in the past");
          return;
        }
      }
    }

    const validItems = editForm.items
      .filter((item) => {
        if (item.itemType === "product" || item.productId) {
          return item.productId && (type === "sale" ? item.unitPrice : item.unitCost);
        }
        return item.imei && (type === "sale" ? item.unitPrice : (item.modelId && item.unitCost));
      })
      .map((item) => {
        if (item.itemType === "product" || item.productId) {
          return {
            productId: Number(item.productId),
            quantity: Number(item.quantity || 1),
            ...(type === "sale"
              ? { unitPrice: Number(item.unitPrice) }
              : { unitCost: Number(item.unitCost) })
          };
        }
        return {
          imei: item.imei.trim(),
          ...(item.modelId ? { modelId: Number(item.modelId) } : {}),
          ...(type === "sale"
            ? { unitPrice: Number(item.unitPrice) }
            : { unitCost: Number(item.unitCost) })
        };
      });

    if (validItems.length === 0) {
      setEditError("Please ensure at least one handset or accessory item is entered with a valid price/cost.");
      return;
    }

    setIsSavingEdit(true);
    setEditError("");
    setError("");

    try {
      let updated;
      if (type === "sale") {
        const payload = {
          customerId: editForm.customerId ? Number(editForm.customerId) : null,
          saleDate: editForm.saleDate,
          paymentMethod: editForm.paymentMethod,
          taxAmount: Number(editForm.taxAmount || 0),
          paidAmount: Number(editForm.paidAmount || 0),
          dueDate: editForm.dueDate || null,
          notes: editForm.notes,
          items: validItems
        };
        updated = await api.updateSale(invoice.id, payload);
      } else {
        const payload = {
          vendorId: editForm.vendorId ? Number(editForm.vendorId) : null,
          purchaserName: editForm.vendorId ? null : (editForm.purchaserName ? editForm.purchaserName.trim() : null),
          purchaserCnic: editForm.vendorId ? null : (editForm.purchaserCnic ? editForm.purchaserCnic.trim() : null),
          purchaseDate: editForm.purchaseDate,
          paymentMethod: editForm.paymentMethod,
          discountAmount: editDiscountVal,
          taxAmount: editTaxVal,
          paidAmount: editPaidVal,
          dueDate: editBalanceAmount > 0 ? (editForm.dueDate || null) : null,
          notes: editForm.notes,
          items: validItems
        };
        updated = await api.updatePurchase(invoice.id, payload);
      }

      setInvoice(updated);
      setShowEditModal(false);
      setMessage(`Transaction #${invoice.invoice_number} products and details updated successfully.`);
      fetchInvoiceDirectory();
      context?.refreshAll?.();
    } catch (err) {
      setEditError(err.message || "Failed to update transaction");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleConfirmDelete(e) {
    e.preventDefault();
    if (!canDelete) {
      setError("Permission denied: You do not have permission to delete this transaction.");
      return;
    }
    if (!invoice) return;
    if (!deletionReason.trim()) {
      setError("Please provide a reason for deleting this transaction.");
      return;
    }

    setIsDeleting(true);
    setError("");
    setMessage("");
    try {
      if (type === "sale") {
        await api.deleteSale(invoice.id, deletionReason.trim());
      } else {
        await api.deletePurchase(invoice.id, deletionReason.trim());
      }

      setShowDeleteModal(false);
      setDeletionReason("");
      setMessage(`Transaction #${invoice.invoice_number} voided successfully.`);

      // Refresh invoice to show updated deletion status
      const refreshed = type === "sale" ? await api.getSale(invoice.id) : await api.getPurchase(invoice.id);
      setInvoice(refreshed);
      fetchInvoiceDirectory();
    } catch (err) {
      setError(err.message || "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="page-grid">
      {/* Searchable, Paginated Invoices List */}
      <SectionCard
        title={type === "sale" ? t("invoices.sales_invoices", "Sale Invoices Directory") : t("invoices.purchase_bills", "Purchase Bills Directory")}
        subtitle={t("invoices.subtitle", "Search, filter, and select invoices to inspect, print, or record payments.")}
        action={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className={type === "sale" ? "primary-btn btn-sm" : "secondary-btn btn-sm"}
              onClick={() => {
                setType("sale");
                setPage(1);
                setInvoice(null);
                setId("");
              }}
            >
              🛒 {t("invoices.sales_invoices", "Sale Invoices")}
            </button>
            <button
              type="button"
              className={type === "purchase" ? "primary-btn btn-sm" : "secondary-btn btn-sm"}
              onClick={() => {
                setType("purchase");
                setPage(1);
                setInvoice(null);
                setId("");
              }}
            >
              📦 {t("invoices.purchase_bills", "Purchase Bills")}
            </button>
          </div>
        }
      >
        <form className="toolbar wrap" onSubmit={handleSearchSubmit} style={{ marginBottom: "1rem" }}>
          <input
            style={{ minWidth: "240px", flex: 1 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("invoices.search_placeholder", `Search ${type} by invoice #, party name, phone...`)}
          />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("invoices.all_payment_statuses", "All Payment Statuses")}</option>
            <option value="paid">{t("invoices.status_paid", "Paid")}</option>
            <option value="partial">{t("invoices.status_partial", "Partial")}</option>
            <option value="unpaid">{t("invoices.status_unpaid", "Unpaid")}</option>
          </select>
          <button className="primary-btn" type="submit">
            🔍 {t("invoices.search_btn", "Search")}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => exportToCSV(`${type}_invoices`, invoicesList)}
          >
            📥 {t("invoices.export_csv", "Export CSV")}
          </button>
          {search && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setSearch("");
                setPage(1);
                setTimeout(fetchInvoiceDirectory, 50);
              }}
            >
              {t("invoices.reset_btn", "Reset")}
            </button>
          )}

          {/* Quick manual ID lookup */}
          <div style={{ display: "flex", gap: "0.4rem", marginLeft: "auto", alignItems: "center" }}>
            <span className="muted small">{t("invoices.quick_id", "Quick ID:")}</span>
            <input
              style={{ width: "90px", direction: "ltr", unicodeBidi: "isolate" }}
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="ID #"
            />
            <button className="secondary-btn btn-sm" type="button" onClick={loadInvoice}>
              {t("invoices.load_btn", "Load")}
            </button>
          </div>
        </form>

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        {loadingList ? (
          <div className="empty-state" style={{ padding: "1.5rem" }}>Loading invoices...</div>
        ) : invoicesList.length === 0 ? (
          <div className="empty-state" style={{ padding: "1.5rem" }}>
            No {type} invoices found matching your filters.
          </div>
        ) : (
          <AdaptiveTable
            columns={[
              {
                key: "invoice_number",
                label: "Invoice #",
                priority: 1,
                truncate: true,
                tooltip: (row) => row.invoice_number || `#${row.id}`,
                render: (_, row) => (
                  <span>
                    <strong>{row.invoice_number || `#${row.id}`}</strong>
                    {Boolean(row.is_deleted) && (
                      <span className="badge" style={{ marginLeft: "0.4rem", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
                        Voided
                      </span>
                    )}
                  </span>
                )
              },
              {
                key: "party",
                label: "Party",
                priority: 2,
                truncate: true,
                tooltip: (row) => row.customer_name || row.vendor_name || row.party_name || "—",
                render: (_, row) => row.customer_name || row.vendor_name || row.party_name || "—"
              },
              {
                key: "total_amount",
                label: "Total",
                priority: 1,
                align: "right",
                render: (val) => <strong>PKR {Number(val || 0).toLocaleString()}</strong>
              },
              {
                key: "payment_status",
                label: "Status",
                priority: 2,
                width: "1%",
                render: (val) => (
                  <span
                    className="badge"
                    style={{
                      background:
                        val === "paid"
                          ? "rgba(16, 185, 129, 0.12)"
                          : val === "partial"
                            ? "rgba(245, 158, 11, 0.12)"
                            : "rgba(239, 68, 68, 0.12)",
                      color:
                        val === "paid"
                          ? "#10b981"
                          : val === "partial"
                            ? "#f59e0b"
                            : "#ef4444"
                    }}
                  >
                    {val || "unpaid"}
                  </span>
                )
              },
              {
                key: "balance_amount",
                label: "Balance",
                priority: 2,
                align: "right",
                render: (val) => (
                  <span style={{ color: Number(val) > 0 ? "#f59e0b" : "#64748b" }}>
                    PKR {Number(val || 0).toLocaleString()}
                  </span>
                )
              },
              {
                key: "date",
                label: "Date",
                priority: 3,
                render: (_, row) => <span className="muted small">{row.sale_date || row.purchase_date || "—"}</span>
              },
              {
                key: "branch_name",
                label: "Branch",
                priority: 3,
                truncate: true,
                render: (val, row) => val || `Branch #${row.branch_id}`
              },
              {
                key: "paid_amount",
                label: "Paid",
                priority: 4,
                align: "right",
                render: (val) => <span style={{ color: "#10b981" }}>PKR {Number(val || 0).toLocaleString()}</span>
              }
            ]}
            data={invoicesList}
            keyField="id"
            selectedId={invoice?.id}
            onRowClick={(row) => loadInvoiceById(row.id)}
            emptyMessage={`No ${type} invoices found matching your filters.`}
            actionsWidth="95px"
            actions={(row) => {
              const isSelected = invoice && invoice.id === row.id;
              return (
                <div className="table-actions-vertical">
                  <TableActionButton
                    variant="receipt"
                    icon="🧾"
                    label="Slip"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInvoiceReceipt(row, type, "thermal");
                    }}
                    title="Print 80mm thermal receipt slip"
                  />
                  <TableActionButton
                    variant={isSelected ? "primary" : "view"}
                    icon="👁️"
                    label={isSelected ? "Viewing" : "View"}
                    onClick={(e) => {
                      e.stopPropagation();
                      loadInvoiceById(row.id);
                    }}
                    title="View invoice details"
                  />
                  {!row.is_deleted && canEdit && (
                    <TableActionButton
                      variant="edit"
                      icon="✏️"
                      label="Edit"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const full = type === "sale" ? await api.getSale(row.id) : await api.getPurchase(row.id);
                        setInvoice(full);
                        setId(full.id);
                        openEditModal(full);
                      }}
                      title={`Edit ${type === "sale" ? "Sale" : "Purchase"} Products & Amounts`}
                    />
                  )}
                  <TableActionButton
                    variant="return"
                    icon="↩️"
                    label="Return"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const full = type === "sale" ? await api.getSale(row.id) : await api.getPurchase(row.id);
                      setOrderForReturn(full);
                      setShowReturnModal(true);
                    }}
                    title={`Create ${type === "sale" ? "Sale" : "Purchase"} Return`}
                  />
                  {Number(row.balance_amount) > 0 && (row.customer_phone || row.phone) && (
                    <TableActionButton
                      variant="whatsapp"
                      icon="💬"
                      label="WhatsApp"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWhatsAppReminder({
                          phone: row.customer_phone || row.phone,
                          customerName: row.customer_name || row.party_name,
                          invoiceNumber: row.invoice_number,
                          balance: row.balance_amount,
                          dueDate: row.due_date,
                          shopName
                        });
                      }}
                      title="Send WhatsApp Payment Reminder"
                    />
                  )}
                </div>
              );
            }}
            actionsHeader="Actions"
          />
        )}

        <PaginationBar
          page={pagination.page || page}
          pageSize={pagination.limit || limit}
          total={pagination.total || 0}
          totalPages={pagination.totalPages || 1}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setLimit(s);
            setPage(1);
          }}
        />
      </SectionCard>

      {invoice ? (
        <div className="page-grid two-column" id="invoice-details-view" style={{ scrollMarginTop: "90px" }}>
          <SectionCard title={`${type === "sale" ? "Sale" : "Purchase"} Bill`} subtitle="Short print format with totals and party details.">
            {invoice.is_deleted ? (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid #ef4444",
                  borderRadius: "10px",
                  padding: "1rem",
                  marginBottom: "1rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ef4444", fontWeight: 700 }}>
                  <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                  <span>THIS TRANSACTION IS VOIDED / DELETED</span>
                </div>
                <div style={{ marginTop: "0.35rem", fontSize: "0.9rem" }}>
                  <strong>Reason:</strong> {invoice.deletion_reason || "Transaction voided by staff"}
                </div>
                {invoice.deleted_at && (
                  <div className="muted small" style={{ marginTop: "0.2rem" }}>
                    Deleted on: {new Date(invoice.deleted_at).toLocaleString()}
                  </div>
                )}
              </div>
            ) : null}

            <div className="invoice-sheet">
              <div className="invoice-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {(context?.session?.business_logo || context?.session?.businessLogo) && (
                    <img
                      src={context?.session?.business_logo || context?.session?.businessLogo}
                      alt="Logo"
                      style={{ height: "50px", width: "auto", maxWidth: "90px", objectFit: "contain", borderRadius: "6px", background: "#ffffff", padding: "2px" }}
                    />
                  )}
                  <div>
                    <h2 style={{ margin: "0 0 2px" }}>{context?.session?.business_name || invoice.business_name || "DigitalMarkaz360"}</h2>
                    <div style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "600" }}>
                      Branch: {invoice.branch_name || context?.session?.branch_name || "Main Outlet"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Software: {context?.session?.business_software_name || context?.session?.software_name || "DigitalMarkaz360"}
                    </div>
                    <p style={{ margin: "4px 0 0", fontWeight: "700" }}>{type === "sale" ? "Sale Bill / Cash Memo" : "Purchase Bill"}</p>
                  </div>
                </div>
                <div className="right" style={{ textAlign: "right" }}>
                  <p><strong>Invoice:</strong> {invoice.invoice_number}</p>
                  <p><strong>Date:</strong> {invoice.sale_date || invoice.purchase_date}</p>
                </div>
              </div>

              <div className="invoice-grid">
                <p>
                  <strong>Party:</strong>{" "}
                  {invoice.customer_name ||
                    invoice.vendor_name ||
                    (invoice.purchaser_name
                      ? `${invoice.purchaser_name}${invoice.purchaser_cnic ? ` (CNIC: ${invoice.purchaser_cnic})` : ""}`
                      : "Walk-in / N/A")}
                </p>
                <p><strong>Payment:</strong> {invoice.payment_method || "N/A"}</p>
                {Number(invoice.discount_amount || 0) > 0 && (
                  <p><strong>Discount:</strong> PKR {Number(invoice.discount_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                )}
                <p><strong>Total:</strong> PKR {Number(invoice.total_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p><strong>Paid:</strong> PKR {Number(invoice.paid_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p><strong>Balance:</strong> PKR {Number(invoice.balance_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p><strong>Due Date:</strong> {invoice.due_date ? String(invoice.due_date).slice(0, 10) : "N/A"}</p>
              </div>

              <div className="table-wrap" style={{ overflowX: "auto", width: "100%", margin: "1rem 0" }}>
                <table style={{ minWidth: "540px", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "45px", minWidth: "45px", whiteSpace: "nowrap" }}>#</th>
                      <th style={{ minWidth: "180px", whiteSpace: "nowrap" }}>Item Description</th>
                      <th style={{ width: "70px", minWidth: "70px", textAlign: "center", whiteSpace: "nowrap" }}>Qty</th>
                      <th style={{ width: "120px", minWidth: "120px", textAlign: "right", whiteSpace: "nowrap" }}>Rate</th>
                      <th style={{ width: "125px", minWidth: "125px", textAlign: "right", whiteSpace: "nowrap" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item, index) => {
                      const itemName = item.company
                        ? `${item.company} ${item.model_name}`
                        : (item.product_name || "Accessory");
                      const rate = Number(item.unit_price || item.unit_cost || 0);
                      const qty = Number(item.quantity || 1);
                      return (
                        <tr key={item.id || index}>
                          <td style={{ width: "45px", minWidth: "45px" }}>{index + 1}</td>
                          <td>
                            <strong>{itemName}</strong>
                            {item.imei ? <div className="muted" style={{ fontSize: "0.85rem" }}>IMEI: {item.imei}</div> : null}
                            {item.product_sku ? <div className="muted" style={{ fontSize: "0.85rem" }}>SKU: {item.product_sku}</div> : null}
                          </td>
                          <td style={{ textAlign: "center", width: "70px", minWidth: "70px" }}>{qty}</td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>PKR {rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: "600" }}>PKR {(rate * qty).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handleOpenInvoiceReceipt(invoice, type, "standard")}
                >
                  🖨️ {t("invoices.print_a4", "Print A4 Invoice")}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => handleOpenInvoiceReceipt(invoice, type, "thermal")}
                >
                  🧾 {t("invoices.print_thermal", "58mm/80mm Thermal Receipt")}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setOrderForReturn(invoice);
                    setShowReturnModal(true);
                  }}
                >
                  ↩️ {t("invoices.return_items_btn", "Return Items from this Bill")}
                </button>
                {!invoice.is_deleted && canEdit && (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => openEditModal()}
                    title="Edit products, prices, quantities, or party details if wrong entry was made"
                  >
                    ✏️ {t("invoices.edit_bill_btn", "Edit Bill & Products")}
                  </button>
                )}
                {!invoice.is_deleted && canDelete && (
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                    onClick={() => setShowDeleteModal(true)}
                  >
                    🗑️ {t("invoices.void_bill_btn", "Void Bill")}
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t("invoices.post_payment_title", "Post Payment")} subtitle={t("invoices.post_payment_subtitle", "Record a later collection or supplier payment against this invoice.")}>
            {invoice.is_deleted ? (
              <div className="alert error">
                Cannot record payments on a voided transaction.
              </div>
            ) : (
              <form className="form-grid" onSubmit={postPayment}>
                <label>
                  {t("invoices.payment_amount", "Amount (PKR)")}
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </label>
                <label>
                  {t("invoices.payment_method", "Payment Method")}
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value })}
                  >
                    <option value="cash">{t("sales.cash", "Cash")}</option>
                    <option value="bank_transfer">{t("sales.bank_transfer", "Bank Transfer")}</option>
                    <option value="mobile_wallet">{t("sales.mobile_wallet", "Mobile Wallet")}</option>
                  </select>
                </label>
                <label>
                  {t("invoices.payment_date", "Date")}
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </label>
                <label className="full-span">
                  {t("invoices.payment_notes", "Notes")}
                  <textarea
                    rows="3"
                    value={paymentForm.notes}
                    onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })}
                  />
                </label>
                <div className="full-span row-actions">
                  <button className="primary-btn" type="submit" disabled={!canPostPayment || Number(invoice.balance_amount) <= 0}>
                    {t("invoices.record_payment_btn", "Record Payment")}
                  </button>
                </div>
              </form>
            )}
          </SectionCard>
        </div>
      ) : null}

      {/* CONFIRMATION MODAL ON DELETING / VOIDING INVOICE */}
      {showDeleteModal && invoice && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleConfirmDelete}>
              <div className="modal-header">
                <h3>Confirm Transaction Deletion</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div
                  style={{
                    background: "var(--danger-bg)",
                    border: "1px solid var(--danger-border)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1rem"
                  }}
                >
                  <h4 style={{ color: "var(--danger)", margin: "0 0 0.5rem 0" }}>Do you want to perform this?</h4>
                  <p style={{ margin: 0, fontSize: "0.92rem" }}>
                    Are you sure you want to void / delete <strong>{type.toUpperCase()} #{invoice.invoice_number}</strong>?
                  </p>
                  <ul style={{ margin: "0.5rem 0 0 1.25rem", padding: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                    <li>This will remove the transaction from active sales and revenue figures.</li>
                    <li>Associated mobile inventory / IMEIs will be released and returned to stock.</li>
                    <li>The transaction will be recorded in the SaaS Top Admin Deleted Transactions audit log.</li>
                  </ul>
                </div>

                <label className="full-span" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <span>Reason for Deletion / Voiding *</span>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Mistaken entry, customer cancelled, wrong billing items..."
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                  disabled={isDeleting || !deletionReason.trim() || !canDelete}
                  title={!canDelete ? "Permission denied: Cannot void transaction" : ""}
                >
                  {isDeleting ? "Voiding..." : "Yes, Void Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReturnOrderModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        defaultType={type === "sale" ? "customer_return" : "vendor_return"}
        referenceOrder={orderForReturn}
        onReturnCreated={() => {
          fetchInvoiceDirectory();
          if (invoice && orderForReturn && invoice.id === orderForReturn.id) {
            loadInvoiceById(invoice.id);
          }
        }}
      />

      {/* MODAL: EDIT SALE OR PURCHASE TRANSACTION */}
      {showEditModal && editForm && invoice && (
        <div className="modal-backdrop" onClick={() => !isSavingEdit && setShowEditModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: "920px", width: "95vw" }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-header">
                <h3>
                  ✏️ Edit {type === "sale" ? "Sale Order" : "Purchase Bill"}: #{invoice.invoice_number}
                </h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSavingEdit}
                  onClick={() => setShowEditModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {editError && <div className="alert error" style={{ marginBottom: "1rem" }}>{editError}</div>}

                {type === "sale" ? (
                  <>
                    <div className="form-grid" style={{ marginBottom: "1.25rem" }}>
                      <label>
                        <span>Customer</span>
                        <SearchableSelect
                          value={editForm.customerId}
                          onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                          placeholder="Search customer by name or phone..."
                        >
                          <option value="">Walk in / Unassigned</option>
                          {customerOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.phone ? `(${c.phone})` : ""}
                            </option>
                          ))}
                        </SearchableSelect>
                      </label>

                      <label>
                        <span>Date</span>
                        <input
                          type="date"
                          value={editForm.saleDate}
                          onChange={(e) => setEditForm({ ...editForm, saleDate: e.target.value })}
                          required
                        />
                      </label>

                      <label>
                        <span>Payment Method</span>
                        <select
                          value={editForm.paymentMethod}
                          onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                        >
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="mobile_wallet">Mobile Wallet</option>
                        </select>
                      </label>

                      <label>
                        <span>Tax Amount (PKR)</span>
                        <input
                          type="number"
                          value={editForm.taxAmount}
                          onChange={(e) => setEditForm({ ...editForm, taxAmount: e.target.value })}
                          placeholder="0"
                        />
                      </label>

                      <label>
                        <span>Paid Amount (PKR)</span>
                        <input
                          type="number"
                          value={editForm.paidAmount}
                          onChange={(e) => setEditForm({ ...editForm, paidAmount: e.target.value })}
                          placeholder="0"
                        />
                      </label>

                      <label>
                        <span>Due Date</span>
                        <input
                          type="date"
                          value={editForm.dueDate}
                          onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                        />
                      </label>
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h4 style={{ margin: 0 }}>📦 Sold Handsets & Products</h4>
                        <span className="muted small">Edit IMEIs, models, accessories, quantities, or prices</span>
                      </div>

                      <LineItemScanner
                        models={context?.models || []}
                        products={availableProducts}
                        mode="sale"
                        items={editForm.items}
                        onChange={(items) => setEditForm((prev) => ({ ...prev, items }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* 1. VENDOR / PURCHASER HEADER */}
                    <div className="form-grid" style={{ marginBottom: "1rem" }}>
                      <label>
                        <span>Purchase Date</span>
                        <input
                          type="date"
                          value={editForm.purchaseDate}
                          onChange={(e) => setEditForm({ ...editForm, purchaseDate: e.target.value })}
                          required
                        />
                      </label>

                      <label className={!editForm.vendorId ? "" : "full-span"}>
                        <span>Vendor / Supplier</span>
                        <SearchableSelect
                          value={editForm.vendorId}
                          onChange={(e) => {
                            const selectedVendorId = e.target.value;
                            setEditForm((prev) => ({
                              ...prev,
                              vendorId: selectedVendorId,
                              purchaserName: selectedVendorId ? "" : prev.purchaserName,
                              purchaserCnic: selectedVendorId ? "" : prev.purchaserCnic
                            }));
                          }}
                          placeholder="Search vendor..."
                        >
                          <option value="">Walk in / new vendor</option>
                          {vendorOptions.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} {v.phone ? `(${v.phone})` : ""}
                            </option>
                          ))}
                        </SearchableSelect>
                      </label>

                      {/* CHANGE 1: Purchaser Name & CNIC only when NO vendor is selected */}
                      {!editForm.vendorId && (
                        <>
                          <label>
                            <span>
                              Purchaser Name <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                            </span>
                            <input
                              type="text"
                              value={editForm.purchaserName}
                              onChange={(e) => setEditForm({ ...editForm, purchaserName: e.target.value })}
                              placeholder="e.g. Muhammad Ali"
                              required
                            />
                            {editPurchaserNameError && (
                              <span className="field-error" style={{ color: "var(--danger, #ef4444)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                                {editPurchaserNameError}
                              </span>
                            )}
                          </label>

                          <label>
                            <span>
                              Purchaser CNIC <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                            </span>
                            <input
                              type="text"
                              value={editForm.purchaserCnic}
                              onChange={(e) => setEditForm({ ...editForm, purchaserCnic: formatCnic(e.target.value) })}
                              placeholder="e.g. 42101-1234567-1"
                              required
                            />
                            {editPurchaserCnicError && (
                              <span className="field-error" style={{ color: "var(--danger, #ef4444)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                                {editPurchaserCnicError}
                              </span>
                            )}
                          </label>
                        </>
                      )}
                    </div>

                    {/* 2 & 3. PRODUCT SEARCH & ADDED PRODUCTS TABLE */}
                    <div style={{ marginBottom: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h4 style={{ margin: 0 }}>📦 Purchased Handsets & Products</h4>
                        <span className="muted small">Edit IMEIs, models, accessories, quantities, or costs</span>
                      </div>

                      <LineItemScanner
                        models={context?.models || []}
                        products={availableProducts}
                        mode="purchase"
                        items={editForm.items}
                        onChange={(items) => setEditForm((prev) => ({ ...prev, items }))}
                      />
                    </div>

                    {/* 4. PAYMENT SUMMARY BLOCK */}
                    <div className="payment-summary-block" style={{
                      marginBottom: "1.25rem"
                    }}>
                      <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "600" }}>
                        💳 Payment Summary
                      </h4>
                      <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                        {/* 1. Subtotal */}
                        <label>
                          <span>Subtotal (PKR)</span>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={`PKR ${editSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            style={{ fontWeight: "600", cursor: "not-allowed" }}
                          />
                        </label>

                        {/* 2. Discount Amount */}
                        <label>
                          <span>Discount Amount (PKR)</span>
                          <input
                            type="number"
                            min="0"
                            max={editSubtotal}
                            step="any"
                            value={editForm.discountAmount === 0 ? 0 : editForm.discountAmount}
                            onChange={(e) => setEditForm({ ...editForm, discountAmount: e.target.value })}
                            placeholder="0"
                          />
                          {editDiscountError && (
                            <span className="field-error" style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                              {editDiscountError}
                            </span>
                          )}
                        </label>

                        {/* 3. Tax Amount */}
                        <label>
                          <span>Tax Amount (PKR)</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editForm.taxAmount === 0 ? 0 : editForm.taxAmount}
                            onChange={(e) => setEditForm({ ...editForm, taxAmount: e.target.value })}
                            placeholder="0"
                          />
                        </label>

                        {/* 4. Net Amount */}
                        <label>
                          <span>Net Amount (PKR)</span>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={`PKR ${editNetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            style={{ fontWeight: "700", color: "var(--primary)", cursor: "not-allowed" }}
                          />
                        </label>

                        {/* 5. Paid Amount */}
                        <label>
                          <span>Paid Amount (PKR)</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editForm.paidAmount === 0 ? 0 : editForm.paidAmount}
                            onChange={(e) => setEditForm({ ...editForm, paidAmount: e.target.value })}
                            placeholder="0"
                          />
                          {editPaidError && (
                            <span className="field-error" style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                              {editPaidError}
                            </span>
                          )}
                        </label>

                        {/* 6. Balance Amount */}
                        <label>
                          <span>Balance Amount (PKR)</span>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={`PKR ${editBalanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            style={{
                              fontWeight: "700",
                              color: editBalanceAmount > 0 ? "var(--danger)" : "var(--positive)",
                              cursor: "not-allowed"
                            }}
                          />
                        </label>

                        {/* 7. Payment Method */}
                        <label>
                          <span>Payment Method</span>
                          <select
                            value={editForm.paymentMethod}
                            onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                          >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="mobile_wallet">Mobile Wallet</option>
                            <option value="cheque">Cheque</option>
                          </select>
                        </label>

                        {/* 8. Due Date */}
                        <label>
                          <span>
                            Due Date {editBalanceAmount > 0 && <span style={{ color: "var(--danger)" }}>*</span>}
                          </span>
                          <input
                            type="date"
                            disabled={editBalanceAmount <= 0}
                            min={todayStr}
                            value={editBalanceAmount <= 0 ? "" : editForm.dueDate}
                            onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                            style={{
                              opacity: editBalanceAmount <= 0 ? 0.6 : 1,
                              cursor: editBalanceAmount <= 0 ? "not-allowed" : "pointer"
                            }}
                          />
                          {editDueDateError && (
                            <span className="field-error" style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                              {editDueDateError}
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <label className="full-span" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <span>Notes / Remarks</span>
                  <textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Enter reason for edit or corrections..."
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSavingEdit}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSavingEdit || !canEdit}
                  title={!canEdit ? "Permission denied: Cannot edit transaction" : ""}
                >
                  {isSavingEdit ? "Saving Corrections..." : "💾 Save Changes & Reconcile Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE / PURCHASE BILL RECEIPT MODAL */}
      <ReceiptModal
        isOpen={receiptModal.isOpen}
        onClose={() => setReceiptModal((prev) => ({ ...prev, isOpen: false }))}
        type={receiptModal.type}
        data={receiptModal.data}
        defaultMode={receiptModal.defaultMode}
        shopName={shopName}
        companyLogo={companyLogo}
      />

      {/* PAYMENT COLLECTION / DISBURSEMENT RECEIPT MODAL */}
      <ReceiptModal
        isOpen={Boolean(paymentReceipt)}
        onClose={() => setPaymentReceipt(null)}
        type="payment"
        data={paymentReceipt}
        defaultMode="thermal"
        shopName={shopName}
        companyLogo={companyLogo}
      />
    </div>
  );
}
