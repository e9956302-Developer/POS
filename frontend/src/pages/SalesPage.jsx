import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { LineItemScanner } from "../components/LineItemScanner.jsx";
import { SectionCard } from "../components/SectionCard.jsx";
import { SearchableSelect } from "../components/SearchableSelect.jsx";
import { AdaptiveTable } from "../components/AdaptiveTable.jsx";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { QuickAddProductModal } from "../components/QuickAddProductModal.jsx";
import { ReturnOrderModal } from "../components/ReturnOrderModal.jsx";
import { TableActionButton } from "../components/TableActionColumn.jsx";
import { exportToCSV } from "../utils/export.js";
import { openWhatsAppReminder } from "../utils/whatsapp.js";
import { useLanguage } from "../context/LanguageContext.jsx";

function initialForm(defaultBranchId) {
  return {
    branchId: defaultBranchId || "",
    customerId: "",
    quickCustomerName: "",
    quickCustomerPhone: "",
    quickCustomerCnic: "",
    saleDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash",
    discountType: "fixed",
    discountValue: "",
    taxAmount: "",
    paidAmount: "",
    dueDate: "",
    notes: "",
    items: []
  };
}

export function SalesPage({ context }) {
  const { t, isRtl, language, formatCurrency } = useLanguage();
  const isUrdu = language === "ur";
  const defaultBranchId = context.session?.branch_id || context.session?.branchId || "";
  const shopName = context?.companyName || context?.session?.business_name || context?.session?.businessName || "DigitalMarkaz360";
  const companyLogo = context?.companyLogo || context?.session?.business_logo || context?.session?.logo_url || context?.session?.businessLogo || (typeof window !== "undefined" && window.__POS_COMPANY_LOGO__) || null;

  // Permission checks
  const canCreate = context.can ? context.can("sales", "create") : true;
  const canEdit = context.can ? context.can("sales", "edit") : false;
  const canDelete = context.can ? context.can("sales", "delete") : false;
  const canView = context.can ? context.can("sales", "view") : true;

  // View state: "checkout" (Add Sale) | "history" (Search, View, Edit, Delete)
  const [activeTab, setActiveTab] = useState("checkout");

  // POS Checkout Form State
  const [form, setForm] = useState(initialForm(defaultBranchId));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState(null);
  const [lastSavedSale, setLastSavedSale] = useState(null);
  const firstFieldRef = useRef(null);
  const formRef = useRef(null);

  // Redesigned POS Sales Counter States
  const [salesMode, setSalesMode] = useState("phone"); // "phone" | "product"
  const [phoneScanInput, setPhoneScanInput] = useState("");
  const [productCatalogSearch, setProductCatalogSearch] = useState("");
  const [branchUnits, setBranchUnits] = useState([]);
  const [isLoadingBranchUnits, setIsLoadingBranchUnits] = useState(false);
  const [selectedInStockUnitId, setSelectedInStockUnitId] = useState("");
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const phoneInputRef = useRef(null);
  const productInputRef = useRef(null);

  // Sales Directory & Search State
  const [salesList, setSalesList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(defaultBranchId);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "deleted"
  const [paymentFilter, setPaymentFilter] = useState("all"); // "all" | "paid" | "partial" | "unpaid"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Sale Modal State
  const [editModalOrder, setEditModalOrder] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete / Void Modal State
  const [deleteModalOrder, setDeleteModalOrder] = useState(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Receipt Modal State
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [receiptMode, setReceiptMode] = useState("thermal"); // "thermal" | "standard"
  const [returnOrder, setReturnOrder] = useState(null);

  const customerOptions = useMemo(
    () => (context.parties || []).filter((party) => party.party_type === "customer" || party.party_type === "both"),
    [context.parties]
  );

  // Fetch Sales Directory
  const fetchSalesList = useCallback(async () => {
    if (!canView) return;
    setLoadingList(true);
    try {
      const qParams = new URLSearchParams();
      if (branchFilter) qParams.append("branchId", branchFilter);
      if (search.trim()) qParams.append("search", search.trim());
      if (statusFilter !== "all") qParams.append("status", statusFilter);
      if (fromDate) qParams.append("from", fromDate);
      if (toDate) qParams.append("to", toDate);

      const queryStr = qParams.toString() ? `?${qParams.toString()}` : "";
      const res = await api.sales(queryStr);
      const rows = Array.isArray(res) ? res : (res.data || []);
      setSalesList(rows);
    } catch (err) {
      console.error("Failed to load sales directory:", err);
      setError(err.message || "Failed to load sales directory");
    } finally {
      setLoadingList(false);
    }
  }, [canView, branchFilter, search, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchSalesList();
    }
  }, [activeTab, fetchSalesList]);

  // Keep branch default updated
  useEffect(() => {
    if (defaultBranchId && !form.branchId) {
      setForm((prev) => ({ ...prev, branchId: defaultBranchId }));
    }
    if (defaultBranchId && !branchFilter) {
      setBranchFilter(defaultBranchId);
    }
  }, [defaultBranchId]);

  const [productsList, setProductsList] = useState(context.products || []);
  const availableProducts = useMemo(() => {
    if (Array.isArray(productsList) && productsList.length > 0) return productsList;
    if (Array.isArray(context.products) && context.products.length > 0) return context.products;
    return [];
  }, [context.products, productsList]);

  useEffect(() => {
    if (Array.isArray(context.products) && context.products.length > 0) {
      setProductsList(context.products);
    }
  }, [context.products]);

  useEffect(() => {
    let isMounted = true;
    api.products()
      .then((rows) => {
        if (isMounted && Array.isArray(rows)) {
          setProductsList(rows);
          if (context.setProducts) context.setProducts(rows);
        }
      })
      .catch((err) => {
        console.error("Failed to load products in SalesPage:", err);
      });
    return () => { isMounted = false; };
  }, [context.session?.branch_id, activeTab]);

  const loadBranchUnits = useCallback(async (bId) => {
    if (!bId) return;
    setIsLoadingBranchUnits(true);
    try {
      const units = await api.inventory(`?branchId=${bId}&status=in_stock`);
      setBranchUnits(Array.isArray(units) ? units : []);
    } catch (err) {
      console.error("Failed to load branch in-stock units:", err);
    } finally {
      setIsLoadingBranchUnits(false);
    }
  }, []);

  useEffect(() => {
    if (form.branchId) {
      loadBranchUnits(form.branchId);
    }
  }, [form.branchId, loadBranchUnits]);

  // Calculations for POS live cart
  const cartSubtotal = useMemo(() => {
    return (form.items || []).reduce((sum, item) => {
      const rate = Number(item.unitPrice || 0);
      const qty = item.itemType === "product" || item.productId ? Number(item.quantity || 1) : 1;
      return sum + rate * qty;
    }, 0);
  }, [form.items]);

  const cartDiscountAmount = useMemo(() => {
    const val = Number(form.discountValue || 0);
    if (val <= 0) return 0;
    if (form.discountType === "percentage") {
      return Math.min(cartSubtotal, Math.round(((cartSubtotal * val) / 100) * 100) / 100);
    }
    return Math.min(cartSubtotal, val);
  }, [cartSubtotal, form.discountType, form.discountValue]);

  const totalItemSavings = useMemo(() => {
    return (form.items || []).reduce((sum, item) => {
      const disc = Number(item.discountAmount || 0);
      const qty = item.itemType === "product" || item.productId ? Number(item.quantity || 1) : 1;
      return sum + disc * qty;
    }, 0);
  }, [form.items]);

  const totalSavings = useMemo(() => {
    return totalItemSavings + cartDiscountAmount;
  }, [totalItemSavings, cartDiscountAmount]);

  const grandTotal = useMemo(() => {
    const tax = Number(form.taxAmount || 0);
    return Math.max(0, cartSubtotal - cartDiscountAmount + tax);
  }, [cartSubtotal, cartDiscountAmount, form.taxAmount]);

  const cartCounts = useMemo(() => {
    let phones = 0;
    let accessories = 0;
    (form.items || []).forEach((it) => {
      if (it.itemType === "handset" || it.imei) {
        phones += 1;
      } else {
        accessories += Number(it.quantity || 1);
      }
    });
    return { phones, accessories, total: phones + accessories };
  }, [form.items]);

  const balanceDue = useMemo(() => {
    const paid = Number(form.paidAmount || 0);
    return Math.max(0, grandTotal - paid);
  }, [grandTotal, form.paidAmount]);

  // Top accessories for 1-click chip addition
  const popularAccessories = useMemo(() => {
    return (availableProducts || []).slice(0, 6);
  }, [availableProducts]);

  // Filtered accessories search
  const filteredProducts = useMemo(() => {
    if (!productCatalogSearch.trim()) return (availableProducts || []).slice(0, 30);
    const q = productCatalogSearch.toLowerCase().trim();
    return (availableProducts || []).filter((p) => {
      const matchName = p.name && p.name.toLowerCase().includes(q);
      const matchSku = p.sku && p.sku.toLowerCase().includes(q);
      const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
      return matchName || matchSku || matchBarcode;
    }).slice(0, 30);
  }, [availableProducts, productCatalogSearch]);

  // Cart actions
  function addPhoneToCart(unit, customPrice = null) {
    if (!unit || !unit.imei) return;
    const exists = (form.items || []).some((it) => it.imei === unit.imei);
    if (exists) {
      setError(`IMEI ${unit.imei} is already in the cart.`);
      return;
    }
    setError("");
    const name = `${unit.company || ""} ${unit.model_name || ""}${unit.variant ? ` (${unit.variant})` : ""}${unit.storage ? ` • ${unit.storage}` : ""}${unit.color ? ` • ${unit.color}` : ""}`.trim() || "Mobile Handset";
    const price = customPrice !== null ? customPrice : (unit.sale_price || unit.retail_price || unit.cost_price || 0);

    const nextItems = [
      ...(form.items || []),
      {
        itemType: "handset",
        imei: unit.imei,
        modelId: unit.model_id,
        name,
        unitPrice: price,
        costPrice: unit.cost_price || 0,
        quantity: 1
      }
    ];
    const newSubtotal = nextItems.reduce((s, it) => s + Number(it.unitPrice || 0) * (it.itemType === "product" ? Number(it.quantity || 1) : 1), 0);
    setForm((prev) => ({
      ...prev,
      items: nextItems,
      paidAmount: String(newSubtotal + Number(prev.taxAmount || 0))
    }));
  }

  function addProductToCart(product) {
    if (!product || !product.id) return;
    setError("");
    const existingIdx = (form.items || []).findIndex((it) => String(it.productId) === String(product.id));
    let nextItems;
    if (existingIdx >= 0) {
      nextItems = form.items.map((it, idx) =>
        idx === existingIdx ? { ...it, quantity: Number(it.quantity || 1) + 1 } : it
      );
    } else {
      nextItems = [
        ...(form.items || []),
        {
          itemType: "product",
          productId: product.id,
          name: product.name,
          categoryName: product.category_name || "Accessory",
          unitPrice: product.sale_price ?? product.retail_price ?? 0,
          stockQuantity: product.stock_quantity ?? 0,
          quantity: 1
        }
      ];
    }
    const newSubtotal = nextItems.reduce((s, it) => s + Number(it.unitPrice || 0) * (it.itemType === "product" ? Number(it.quantity || 1) : 1), 0);
    setForm((prev) => ({
      ...prev,
      items: nextItems,
      paidAmount: String(newSubtotal + Number(prev.taxAmount || 0))
    }));
  }

  async function handlePhoneScan(rawImei) {
    const imei = (rawImei || "").trim();
    if (!imei) return;
    if (imei.length < 14 || imei.length > 20) {
      setError(`Invalid IMEI (${imei.length} digits). Standard IMEI is 15 digits.`);
      return;
    }
    const localMatch = branchUnits.find((u) => u.imei === imei);
    if (localMatch) {
      addPhoneToCart(localMatch);
      setPhoneScanInput("");
      return;
    }
    try {
      const unit = await api.imeiLookup(imei);
      if (!unit || !unit.id) {
        setError(`IMEI ${imei} was not found in database.`);
        return;
      }
      if (unit.current_status !== "in_stock") {
        setError(`IMEI ${imei} is marked as '${unit.current_status}' and cannot be sold.`);
        return;
      }
      if (String(unit.branch_id) !== String(form.branchId)) {
        setError(`IMEI ${imei} belongs to branch #${unit.branch_id}, not currently selected branch.`);
        return;
      }
      addPhoneToCart(unit);
      setPhoneScanInput("");
    } catch (err) {
      setError(err.message || `Failed to lookup IMEI ${imei}`);
    }
  }

  function updateCartItemQty(index, newQty) {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    const nextItems = form.items.map((it, idx) => (idx === index ? { ...it, quantity: qty } : it));
    const newSubtotal = nextItems.reduce((s, it) => s + Number(it.unitPrice || 0) * (it.itemType === "product" ? Number(it.quantity || 1) : 1), 0);
    setForm((prev) => ({
      ...prev,
      items: nextItems,
      paidAmount: String(newSubtotal + Number(prev.taxAmount || 0))
    }));
  }

  function updateCartItemPrice(index, newPrice) {
    const nextItems = form.items.map((it, idx) => (idx === index ? { ...it, unitPrice: newPrice } : it));
    const newSubtotal = nextItems.reduce((s, it) => s + Number(it.unitPrice || 0) * (it.itemType === "product" ? Number(it.quantity || 1) : 1), 0);
    setForm((prev) => ({
      ...prev,
      items: nextItems,
      paidAmount: String(newSubtotal + Number(prev.taxAmount || 0))
    }));
  }

  function removeCartItem(index) {
    const nextItems = form.items.filter((_, idx) => idx !== index);
    const newSubtotal = nextItems.reduce((s, it) => s + Number(it.unitPrice || 0) * (it.itemType === "product" ? Number(it.quantity || 1) : 1), 0);
    setForm((prev) => ({
      ...prev,
      items: nextItems,
      paidAmount: nextItems.length ? String(newSubtotal + Number(prev.taxAmount || 0)) : ""
    }));
  }

  function handleQuickCash(mode) {
    if (mode === "exact") {
      setForm((prev) => ({ ...prev, paidAmount: String(grandTotal) }));
    } else if (typeof mode === "number") {
      setForm((prev) => ({ ...prev, paidAmount: String(grandTotal + mode) }));
    }
  }

  async function handleSubmit(event) {
    if (event) event.preventDefault();
    if (!canCreate) {
      setError("Company Super Admin or restricted staff cannot perform sales checkout directly. Operational sales must be performed by assigned Branch Managers or Cashiers.");
      return;
    }
    setError("");
    setMessage("");

    if (!form.items || form.items.length === 0) {
      setError("Please add at least one mobile handset or simple product to the cart before completing checkout.");
      return;
    }

    try {
      setValidationErrors(null);
      const saleItems = form.items
        .filter((item) => {
          if (item.itemType === "product" || item.productId) {
            return item.productId && item.unitPrice !== undefined && item.unitPrice !== "";
          }
          return item.imei && item.unitPrice !== undefined && item.unitPrice !== "";
        })
        .map((item) => {
          if (item.itemType === "product" || item.productId) {
            return {
              productId: Number(item.productId),
              productName: item.name || item.productName || item.modelName || "",
              quantity: Number(item.quantity || 1),
              unitPrice: Number(item.unitPrice || 0)
            };
          }
          return {
            imei: item.imei.trim(),
            productName: item.name || item.productName || item.modelName || "",
            unitPrice: Number(item.unitPrice || 0)
          };
        });

      if (!saleItems.length) {
        setError("Please add at least one valid handset (with IMEI and price) or product (with quantity and price)");
        return;
      }

      const saved = await api.createSale({
        branchId: Number(form.branchId),
        customerId: form.customerId ? Number(form.customerId) : null,
        quickCustomer: form.customerId
          ? null
          : {
              name: form.quickCustomerName || "Walk-in Customer",
              phone: form.quickCustomerPhone || null,
              cnic: form.quickCustomerCnic || null
            },
        saleDate: form.saleDate,
        paymentMethod: form.paymentMethod,
        taxAmount: Number(form.taxAmount || 0),
        paidAmount: Number(form.paidAmount || 0),
        dueDate: form.dueDate || null,
        notes: form.notes,
        items: saleItems
      });

      setMessage(`Sale #${saved.invoice_number} completed successfully!`);
      setLastSavedSale(saved);
      setForm(initialForm(defaultBranchId));
      setValidationErrors(null);
      context.refreshAll();
      loadBranchUnits(form.branchId);

      // Automatically open 80mm thermal receipt on sale creation
      handleOpenReceipt(saved);

      // Shift focus to scanner for continuous rapid entry
      setTimeout(() => {
        if (phoneInputRef.current) {
          phoneInputRef.current.focus();
        }
      }, 50);
    } catch (submitError) {
      if (submitError.errors && Array.isArray(submitError.errors) && submitError.errors.length > 0) {
        setValidationErrors({
          header: submitError.header || `Cannot complete sale — ${submitError.errors.length} products have issues:`,
          list: submitError.errors
        });
        setError("");
      } else {
        setError(submitError.message || "Failed to complete sale");
        setValidationErrors(null);
      }
    }
  }

  // Filter and pagination calculation
  const filteredSales = useMemo(() => {
    return salesList.filter((s) => {
      if (paymentFilter === "paid") {
        return Number(s.balance_amount || 0) <= 0;
      }
      if (paymentFilter === "partial") {
        return Number(s.paid_amount || 0) > 0 && Number(s.balance_amount || 0) > 0;
      }
      if (paymentFilter === "unpaid") {
        return Number(s.paid_amount || 0) === 0 && Number(s.total_amount || 0) > 0;
      }
      return true;
    });
  }, [salesList, paymentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedSales = filteredSales.slice(startIdx, startIdx + pageSize);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    let grossRevenue = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let activeOrdersCount = 0;

    filteredSales.forEach((s) => {
      if (!s.is_deleted) {
        grossRevenue += Number(s.total_amount || 0);
        totalPaid += Number(s.paid_amount || 0);
        totalBalance += Number(s.balance_amount || 0);
        activeOrdersCount += 1;
      }
    });

    return {
      count: filteredSales.length,
      activeCount: activeOrdersCount,
      grossRevenue,
      totalPaid,
      totalBalance
    };
  }, [filteredSales]);

  // Open Edit Modal
  async function handleOpenEditModal(order) {
    if (!canEdit) {
      setError("You do not have permission to edit sales transactions.");
      return;
    }
    setEditError("");
    setError("");
    try {
      const fullOrder = await api.getSale(order.id);
      setEditModalOrder(fullOrder);

      const mappedItems = (fullOrder.items || []).map((it) => {
        if (it.product_id) {
          return {
            itemType: "product",
            productId: it.product_id,
            quantity: it.quantity || 1,
            unitPrice: it.unit_price
          };
        }
        return {
          itemType: "handset",
          imei: it.imei || "",
          modelId: it.model_id,
          unitPrice: it.unit_price,
          quantity: 1
        };
      });

      if (mappedItems.length === 0) {
        mappedItems.push({ itemType: "handset", imei: "", modelId: "", unitPrice: "", quantity: 1 });
      }

      setEditForm({
        customerId: fullOrder.customer_id ? String(fullOrder.customer_id) : "",
        quickCustomerName: "",
        quickCustomerPhone: "",
        quickCustomerCnic: "",
        saleDate: fullOrder.sale_date ? fullOrder.sale_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        paymentMethod: fullOrder.payment_method || "cash",
        taxAmount: fullOrder.tax_amount || "",
        paidAmount: fullOrder.paid_amount || "",
        dueDate: fullOrder.due_date ? fullOrder.due_date.slice(0, 10) : "",
        notes: fullOrder.notes || "",
        items: mappedItems
      });
    } catch (err) {
      setError(err.message || "Failed to load order details for editing");
    }
  }

  // Save Edit Changes
  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editModalOrder || !editForm) return;

    const validItems = editForm.items
      .filter((item) => {
        if (item.itemType === "product" || item.productId) {
          return item.productId && item.unitPrice;
        }
        return item.imei && item.unitPrice;
      })
      .map((item) => {
        if (item.itemType === "product" || item.productId) {
          return {
            productId: Number(item.productId),
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice)
          };
        }
        return {
          imei: item.imei.trim(),
          unitPrice: Number(item.unitPrice)
        };
      });

    if (validItems.length === 0) {
      setEditError("Please enter at least one valid handset (with IMEI and price) or product (with quantity and price).");
      return;
    }

    setIsSavingEdit(true);
    setEditError("");
    try {
      const payload = {
        customerId: editForm.customerId ? Number(editForm.customerId) : null,
        quickCustomer: editForm.customerId
          ? null
          : editForm.quickCustomerName
          ? {
              name: editForm.quickCustomerName,
              phone: editForm.quickCustomerPhone,
              cnic: editForm.quickCustomerCnic
            }
          : null,
        saleDate: editForm.saleDate,
        paymentMethod: editForm.paymentMethod,
        taxAmount: Number(editForm.taxAmount || 0),
        paidAmount: Number(editForm.paidAmount || 0),
        dueDate: editForm.dueDate || null,
        notes: editForm.notes,
        items: validItems
      };

      const updated = await api.updateSale(editModalOrder.id, payload);
      setMessage(`Sale #${updated.invoice_number} updated successfully.`);
      setEditModalOrder(null);
      setEditForm(null);
      fetchSalesList();
      context?.refreshAll?.();
    } catch (err) {
      setEditError(err.message || "Failed to save sale edits");
    } finally {
      setIsSavingEdit(false);
    }
  }

  // Open Delete / Void Modal
  function handleOpenDeleteModal(order) {
    if (!canDelete) {
      setError("You do not have permission to void or delete sales transactions.");
      return;
    }
    setDeleteModalOrder(order);
    setDeletionReason("");
    setError("");
  }

  // Confirm Delete / Void
  async function handleConfirmDelete(e) {
    e.preventDefault();
    if (!deleteModalOrder) return;
    if (!deletionReason.trim()) {
      setError("Please provide a reason for voiding this transaction.");
      return;
    }

    setIsDeleting(true);
    setError("");
    try {
      await api.deleteSale(deleteModalOrder.id, deletionReason.trim());
      setMessage(`Sale #${deleteModalOrder.invoice_number} voided successfully. Handsets and accessories returned to stock.`);
      setDeleteModalOrder(null);
      fetchSalesList();
      context?.refreshAll?.();
    } catch (err) {
      setError(err.message || "Failed to void transaction");
    } finally {
      setIsDeleting(false);
    }
  }

  // Open Receipt Modal
  async function handleOpenReceipt(order) {
    setError("");
    try {
      const full = await api.getSale(order.id);
      setReceiptOrder(full);
      setReceiptMode("thermal");
    } catch (err) {
      setError(err.message || "Failed to load receipt details");
    }
  }

  // Export to CSV
  function handleExportSales() {
    const exportData = filteredSales.map((s) => ({
      invoice_number: s.invoice_number,
      sale_date: s.sale_date,
      customer_name: s.customer_name || "Walk-in Customer",
      branch_name: s.branch_name,
      payment_method: s.payment_method,
      total_amount: s.total_amount,
      paid_amount: s.paid_amount,
      balance_amount: s.balance_amount,
      status: s.is_deleted ? "Voided" : Number(s.balance_amount) <= 0 ? "Paid" : "Pending",
      notes: s.notes || ""
    }));

    exportToCSV(`Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`, exportData, [], {
      companyName: shopName,
      branchName: context.session?.branch_name || "All Branches",
      softwareName: "Mobile POS & ERP",
      reportTitle: "Sales & POS Transaction Journal"
    });
  }

  return (
    <div className="page-grid">
      {/* Top POS Switcher Tabs */}
      <div
        className="nav-tabs"
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.6rem",
          marginBottom: "1rem"
        }}
      >
        <button
          type="button"
          className={`tab-btn ${activeTab === "checkout" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("checkout");
            setError("");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.55rem 1.1rem",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "0.9rem",
            border: activeTab === "checkout" ? "1px solid var(--primary)" : "1px solid var(--border)",
            background: activeTab === "checkout" ? "var(--primary)" : "var(--surface)",
            color: activeTab === "checkout" ? "#ffffff" : "var(--text)"
          }}
        >
          <span>🛒</span> {t("sales.pos_counter", "Create Sale (POS Counter)")}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("history");
            setError("");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.55rem 1.1rem",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "0.9rem",
            border: activeTab === "history" ? "1px solid var(--primary)" : "1px solid var(--border)",
            background: activeTab === "history" ? "var(--primary)" : "var(--surface)",
            color: activeTab === "history" ? "#ffffff" : "var(--text)"
          }}
        >
          <span>📜</span> {t("sales.history", "Sales Directory & History")} ({salesList.length})
        </button>
      </div>

      {/* Global alert messages */}
      {error ? <div className="alert error full-span">{error}</div> : null}
      {message ? (
        <div
          className="alert success full-span"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}
        >
          <span>{message}</span>
          {lastSavedSale && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="secondary-btn btn-sm"
                onClick={() => handleOpenReceipt(lastSavedSale)}
                style={{ background: "#059669", color: "#ffffff", borderColor: "#047857" }}
              >
                🧾 {t("sales.print_receipt", "Print Receipt")}
              </button>
              <button
                type="button"
                className="ghost-btn btn-sm"
                onClick={() => {
                  setActiveTab("history");
                  fetchSalesList();
                }}
              >
                📋 {t("sales.view_history", "View in History")}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 1: POS COUNTER & CHECKOUT (ADD SALE) */}
      {activeTab === "checkout" && (
        <div className="pos-layout">
          {/* LEFT COLUMN: SCANNER, PICKER & LIVE CART */}
          <div className="pos-main-column">
            {/* Top Bar: Branch Selector & Summary */}
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
                <strong style={{ fontSize: "0.9rem" }}>{t("app.store_outlet", "Store Outlet")}:</strong>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", fontSize: "0.88rem" }}
                >
                  <option value="">{isUrdu ? "برانچ منتخب کریں" : "Select Branch"}</option>
                  {(context?.branches || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="muted small">
                  {isUrdu ? (
                    <>برانچ اسٹاک: <strong>{branchUnits.length}</strong> فونز • <strong>{availableProducts.length}</strong> سامان</>
                  ) : (
                    <>Branch Stock: <strong>{branchUnits.length}</strong> handsets • <strong>{availableProducts.length}</strong> products</>
                  )}
                </span>
                <button
                  type="button"
                  className="ghost-btn btn-sm"
                  onClick={() => loadBranchUnits(form.branchId)}
                  disabled={isLoadingBranchUnits}
                  title="Reload branch stock"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Explicit Mode Switcher Toggle */}
            <div className="pos-mode-toggle">
              <button
                type="button"
                className={`pos-mode-btn ${salesMode === "phone" ? "active" : ""}`}
                onClick={() => {
                  setSalesMode("phone");
                  setTimeout(() => phoneInputRef.current?.focus(), 50);
                }}
              >
                <span>📱</span> {t("sales.phone_mode", "Cell Phone Mode (Scan IMEI / In-Stock Handsets)")}
              </button>
              <button
                type="button"
                className={`pos-mode-btn ${salesMode === "product" ? "active" : ""}`}
                onClick={() => {
                  setSalesMode("product");
                  setTimeout(() => productInputRef.current?.focus(), 50);
                }}
              >
                <span>📦</span> {t("sales.product_mode", "Simple Product Mode (Scan Barcode / Accessories)")}
              </button>
            </div>

            {/* 1. CELL PHONE MODE CONTROLS */}
            {salesMode === "phone" && (
              <div style={{ marginBottom: "1rem" }}>
                {/* IMEI Scanner Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePhoneScan(phoneScanInput);
                  }}
                  className="pos-scanner-bar"
                >
                  <div className="pos-scanner-input-wrap">
                    <span className="pos-scanner-icon">⚡</span>
                    <input
                      ref={phoneInputRef}
                      type="text"
                      className="pos-scanner-input"
                      placeholder={t("sales.scan_imei_placeholder", "Scan or type 15-digit IMEI barcode and press Enter...")}
                      value={phoneScanInput}
                      onChange={(e) => setPhoneScanInput(e.target.value.replace(/\s+/g, ""))}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="primary-btn"
                    style={{ padding: "0.75rem 1.25rem", whiteSpace: "nowrap" }}
                  >
                    ➕ {t("purchases.add_imei_btn", "Add IMEI")}
                  </button>
                </form>

                {/* 1-Click In-Stock Handset Dropdown Picker */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="muted small" style={{ fontWeight: "600" }}>
                      👇 {t("sales.pick_from_inventory", "Or pick from branch in-stock handsets")}:
                    </span>
                    <span className="muted small">
                      {branchUnits.length} {isUrdu ? "دستیاب فونز" : "ready to sell"}
                    </span>
                  </div>
                  <select
                    value={selectedInStockUnitId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const unit = branchUnits.find((u) => String(u.id) === String(val));
                        if (unit) {
                          addPhoneToCart(unit);
                          setSelectedInStockUnitId("");
                        }
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      background: "var(--surface)",
                      borderColor: "var(--border)"
                    }}
                  >
                    <option value="">
                      {isUrdu
                        ? `-- برانچ کے دستیاب فونز منتخب کریں (${branchUnits.length} دستیاب) --`
                        : `-- Choose phone from branch inventory (${branchUnits.length} available) --`}
                    </option>
                    {branchUnits.map((u) => {
                      const spec = [u.variant, u.storage, u.color].filter(Boolean).join(" • ");
                      const rate = Number(u.sale_price || u.retail_price || u.cost_price || 0);
                      return (
                        <option key={u.id} value={u.id}>
                          📱 {u.company} {u.model_name} {spec ? `(${spec})` : ""} | IMEI: {u.imei} - PKR {rate.toLocaleString()}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* 2. SIMPLE PRODUCT MODE CONTROLS */}
            {salesMode === "product" && (
              <div style={{ marginBottom: "1rem" }}>
                {/* Search / Barcode Bar */}
                <div className="pos-scanner-bar">
                  <div className="pos-scanner-input-wrap">
                    <span className="pos-scanner-icon">🔍</span>
                    <input
                      ref={productInputRef}
                      type="text"
                      className="pos-scanner-input"
                      placeholder={t("sales.scan_barcode_placeholder", "Scan product barcode or search accessories by name/SKU...")}
                      value={productCatalogSearch}
                      onChange={(e) => setProductCatalogSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setShowQuickProductModal(true)}
                    style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}
                    title={isUrdu ? "نیا پروڈکٹ کیٹلاگ میں شامل کریں" : "Quick add new product if not in catalog"}
                  >
                    ➕ {t("inventory.add_product", "New Item")}
                  </button>
                </div>

                {/* Quick-Add Popular Accessory Chips */}
                {popularAccessories.length > 0 && (
                  <div>
                    <span className="muted small" style={{ display: "block", marginBottom: "0.35rem", fontWeight: "600" }}>
                      ⚡ {isUrdu ? "اکثر فروخت ہونے والی ایکسیسریز" : "1-Click Fast Accessories"}:
                    </span>
                    <div className="pos-quick-chips">
                      {popularAccessories.map((p) => {
                        const price = Number(p.sale_price || p.retail_price || 0);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className="pos-chip-btn"
                            onClick={() => addProductToCart(p)}
                          >
                            <span>📦</span> {p.name} (PKR {price.toLocaleString()})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Matching Products Grid / Dropdown (if typing) */}
                {productCatalogSearch.trim() && (
                  <div className="pos-instock-list">
                    {filteredProducts.length === 0 ? (
                      <div style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                        {isUrdu ? `کوئی پروڈکٹ "${productCatalogSearch}" سے مطابقت نہیں رکھتا۔` : `No product matching "${productCatalogSearch}".`}
                      </div>
                    ) : (
                      filteredProducts.map((p) => {
                        const price = Number(p.sale_price || p.retail_price || 0);
                        return (
                          <div
                            key={p.id}
                            className="pos-instock-item"
                            onClick={() => {
                              addProductToCart(p);
                              setProductCatalogSearch("");
                            }}
                          >
                            <div>
                              <strong>{p.name}</strong>
                              <span className="muted small" style={{ marginInlineStart: "0.5rem" }}>
                                ({p.category_name || (isUrdu ? "عام" : "General")} • {isUrdu ? "اسٹاک" : "Stock"}: {p.stock_quantity ?? 0})
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <strong style={{ color: "var(--primary)" }}>PKR {price.toLocaleString()}</strong>
                              <span className="primary-btn btn-sm" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                                + {t("common.add", "Add")}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Multi-Product Validation Error Banner */}
            {validationErrors && validationErrors.list && validationErrors.list.length > 0 && (
              <div
                className="pos-validation-error-card"
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "2px solid #ef4444",
                  borderRadius: "10px",
                  padding: "1rem 1.25rem",
                  marginBottom: "1rem",
                  color: "var(--text)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.4rem" }}>⚠️</span>
                    <div>
                      <strong style={{ color: "#ef4444", fontSize: "1rem" }}>
                        {validationErrors.header || `Cannot complete sale — ${validationErrors.list.length} products have issues:`}
                      </strong>
                      <p className="small muted" style={{ margin: "2px 0 0 0" }}>
                        {isUrdu ? "فروخت محفوظ نہیں کی گئی۔ نیچے سرخ رنگ سے نشان زد مصنوعات کو درست کریں۔" : "Sale was NOT recorded. Please fix the items highlighted in red below before proceeding."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    onClick={() => setValidationErrors(null)}
                    style={{ color: "#ef4444", fontWeight: 700 }}
                  >
                    ✕ {isUrdu ? "بند کریں" : "Dismiss"}
                  </button>
                </div>

                <ul style={{ margin: "0.75rem 0 0 0", paddingLeft: isRtl ? "0" : "1.5rem", paddingRight: isRtl ? "1.5rem" : "0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {validationErrors.list.map((err, idx) => (
                    <li key={idx} style={{ fontSize: "0.9rem" }}>
                      <strong style={{ color: "#f87171" }}>{err.product || "Product"}:</strong>{" "}
                      <span>{err.issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* LIVE POS CART TABLE */}
            <div className="pos-cart-wrap">
              <div className="pos-cart-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>🛒</span>
                  <strong>{t("sales.cart_title", "Sale Cart")}</strong>
                  <span className="pos-item-badge product" style={{ marginInlineStart: "0.25rem" }}>
                    {t("sales.items_in_cart", {
                      total: cartCounts.total,
                      phones: cartCounts.phones,
                      accessories: cartCounts.accessories
                    })}
                  </span>
                </div>
                {form.items.length > 0 && (
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, items: [], paidAmount: "" }));
                      setError("");
                    }}
                    style={{ color: "var(--danger)" }}
                  >
                    🗑️ {t("sales.clear_cart", "Clear Cart")}
                  </button>
                )}
              </div>

              {form.items.length === 0 ? (
                <div className="pos-cart-empty">
                  <div className="pos-cart-empty-icon">🛒</div>
                  <h4 style={{ margin: "0 0 0.35rem 0" }}>{t("sales.cart_empty_title", "Cart is empty")}</h4>
                  <p className="muted small" style={{ margin: 0 }}>
                    {t("sales.cart_empty_desc", "Scan an IMEI or barcode above, or pick from branch inventory to add items.")}
                  </p>
                </div>
              ) : (
                <div className="table-wrap" style={{ margin: 0, border: "none" }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>{t("sales.table_item", "Item & Identification")}</th>
                        <th style={{ width: "15%", textAlign: "center" }}>{t("sales.table_qty", "Qty")}</th>
                        <th style={{ width: "20%", textAlign: isRtl ? "left" : "right" }}>{t("sales.table_price", "Unit Price (PKR)")}</th>
                        <th style={{ width: "20%", textAlign: isRtl ? "left" : "right" }}>{t("sales.table_subtotal", "Subtotal")}</th>
                        <th style={{ width: "10%", textAlign: "center" }}>{t("sales.table_remove", "Remove")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, index) => {
                        const isPhone = item.itemType === "handset" || item.imei;
                        const qty = isPhone ? 1 : Number(item.quantity || 1);
                        const rate = Number(item.unitPrice || 0);
                        const lineSubtotal = qty * rate;

                        const matchedError = validationErrors?.list?.find((err) => {
                          if (item.productId && err.productId && Number(err.productId) === Number(item.productId)) return true;
                          if (item.imei && err.imei && String(err.imei).trim() === String(item.imei).trim()) return true;
                          if (err.product && item.name && (err.product === item.name || err.product.includes(item.name))) return true;
                          return false;
                        });

                        return (
                          <tr
                            key={`${item.imei || item.productId}-${index}`}
                            style={
                              matchedError
                                ? {
                                    background: "rgba(239, 68, 68, 0.08)",
                                    boxShadow: isRtl ? "inset -4px 0 0 #ef4444" : "inset 4px 0 0 #ef4444"
                                  }
                                : {}
                            }
                          >
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                  <span className={`pos-item-badge ${isPhone ? "phone" : "product"}`}>
                                    {isPhone ? (isUrdu ? "📱 موبائل" : "📱 Cell Phone") : (isUrdu ? "📦 پراڈکٹ" : "📦 Product")}
                                  </span>
                                  <strong>{item.name}</strong>
                                </div>
                                {isPhone ? (
                                  <span
                                    className="muted small"
                                    style={{
                                      fontFamily: "var(--font-mono, monospace)",
                                      fontSize: "0.78rem",
                                      letterSpacing: "0.5px",
                                      direction: "ltr",
                                      textAlign: isRtl ? "right" : "left",
                                      unicodeBidi: "isolate"
                                    }}
                                  >
                                    IMEI: <strong>{item.imei}</strong>
                                  </span>
                                ) : (
                                  <span className="muted small" style={{ fontSize: "0.75rem" }}>
                                    {item.categoryName || (isUrdu ? "لوازمات" : "Accessory")}
                                  </span>
                                )}
                                {matchedError && (
                                  <span
                                    style={{
                                      color: "#ef4444",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      marginTop: "2px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px"
                                    }}
                                  >
                                    ⚠️ {matchedError.issue}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td style={{ textAlign: "center" }}>
                              {isPhone ? (
                                <span className="muted" style={{ fontWeight: "700" }}>
                                  1
                                </span>
                              ) : (
                                <div className="pos-qty-stepper">
                                  <button
                                    type="button"
                                    className="pos-qty-btn"
                                    onClick={() => updateCartItemQty(index, qty - 1)}
                                    title="Decrease quantity"
                                  >
                                    -
                                  </button>
                                  <span className="pos-qty-num">{qty}</span>
                                  <button
                                    type="button"
                                    className="pos-qty-btn"
                                    onClick={() => updateCartItemQty(index, qty + 1)}
                                    title="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => updateCartItemPrice(index, e.target.value)}
                                style={{
                                  width: "110px",
                                  textAlign: "right",
                                  padding: "0.3rem 0.5rem",
                                  fontWeight: "600"
                                }}
                              />
                            </td>

                            <td style={{ textAlign: "right", fontWeight: "700" }}>
                              PKR {lineSubtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>

                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => removeCartItem(index)}
                                style={{ color: "var(--danger)", padding: "0.2rem 0.5rem" }}
                                title="Remove item"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: STICKY CHECKOUT & SETTLEMENT SIDEBAR */}
          <div className="pos-checkout-sidebar">
            {/* Customer Box */}
            <div className="pos-checkout-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  👤 {t("sales.customer_box_title", "Customer")}
                </span>
                <button
                  type="button"
                  className="ghost-btn btn-sm"
                  onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                  style={{ fontSize: "0.78rem" }}
                >
                  {showCustomerDetails ? t("sales.customer_hide", "Hide Details") : t("sales.customer_change", "Change / Account")}
                </button>
              </div>

              {!showCustomerDetails ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0" }}>
                  <span style={{ fontSize: "1.3rem" }}>🛒</span>
                  <div>
                    <strong style={{ fontSize: "0.95rem", display: "block" }}>
                      {form.customerId
                        ? customerOptions.find((c) => String(c.id) === String(form.customerId))?.name || (isUrdu ? "منتخب کھاتے دار" : "Selected Customer")
                        : form.quickCustomerName || t("sales.walk_in", "Walk in / new customer (Cash)")}
                    </strong>
                    <span className="muted small">
                      {isUrdu ? "کاؤنٹر کی نقد فروخت" : "Default Counter Sale"}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.35rem" }}>
                  <label>
                    {t("sales.registered_account", "Select Account Customer")}
                    <SearchableSelect
                      value={form.customerId}
                      onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                      placeholder={isUrdu ? "کھاتے دار تلاش کریں..." : "Search customer..."}
                    >
                      <option value="">{t("sales.walk_in", "Walk in / new customer")}</option>
                      {customerOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </option>
                      ))}
                    </SearchableSelect>
                  </label>

                  {!form.customerId && (
                    <>
                      <label>
                        {t("sales.customer_name", "Customer Name")}
                        <input
                          type="text"
                          placeholder={isUrdu ? "عام خریدار کا نام" : "Walk-in name"}
                          value={form.quickCustomerName}
                          onChange={(e) => setForm({ ...form, quickCustomerName: e.target.value })}
                        />
                      </label>
                      <label>
                        {t("sales.customer_phone", "Customer Phone")}
                        <input
                          type="text"
                          placeholder="e.g. 03001234567"
                          value={form.quickCustomerPhone}
                          onChange={(e) => setForm({ ...form, quickCustomerPhone: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Financial Totals & Payment Card */}
            <div className="pos-checkout-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <span className="muted">{t("sales.subtotal", "Subtotal")} ({cartCounts.total}):</span>
                <strong>PKR {cartSubtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span className="muted">{t("sales.tax", "Tax (PKR)")}:</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.taxAmount}
                  onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
                  placeholder="0"
                  style={{ width: "90px", textAlign: isRtl ? "left" : "right", padding: "0.25rem 0.4rem" }}
                />
              </div>

              {/* Grand Total Banner */}
              <div className="pos-total-banner">
                <div>
                  <span className="muted small" style={{ textTransform: "uppercase", fontWeight: "700" }}>
                    {t("sales.total_payable", "Total Payable")}
                  </span>
                  <div className="pos-total-amount">
                    PKR {grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ textAlign: isRtl ? "left" : "right" }}>
                  <span className="pos-item-badge phone" style={{ fontSize: "0.78rem" }}>
                    {cartCounts.phones} {isUrdu ? "فونز" : "Phones"}
                  </span>
                </div>
              </div>

              {/* Payment Method Pills */}
              <label style={{ display: "block", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: "600" }}>{t("sales.payment_method", "Payment Method")}</span>
                <div className="pos-pill-group">
                  <button
                    type="button"
                    className={`pos-pill-btn ${form.paymentMethod === "cash" ? "active" : ""}`}
                    onClick={() => setForm({ ...form, paymentMethod: "cash" })}
                  >
                    💵 {t("sales.cash", "Cash")}
                  </button>
                  <button
                    type="button"
                    className={`pos-pill-btn ${form.paymentMethod === "bank_transfer" ? "active" : ""}`}
                    onClick={() => setForm({ ...form, paymentMethod: "bank_transfer" })}
                  >
                    🏦 {t("sales.bank", "Bank")}
                  </button>
                  <button
                    type="button"
                    className={`pos-pill-btn ${form.paymentMethod === "mobile_wallet" ? "active" : ""}`}
                    onClick={() => setForm({ ...form, paymentMethod: "mobile_wallet" })}
                  >
                    📱 {t("sales.wallet", "Wallet")}
                  </button>
                </div>
              </label>

              {/* Paid Amount & Quick Cash */}
              <label style={{ display: "block", marginTop: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: "600" }}>{t("sales.amount_received", "Amount Paid (PKR)")}</span>
                  {balanceDue > 0 && (
                    <span style={{ color: "var(--warning, #fbbf24)", fontSize: "0.8rem", fontWeight: "700" }}>
                      {t("sales.balance_due", "Credit Due")}: PKR {balanceDue.toLocaleString()}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.paidAmount}
                  onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                  placeholder={`Exact: ${grandTotal}`}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", fontSize: "1rem", fontWeight: "700", marginTop: "0.25rem", direction: "ltr", textAlign: isRtl ? "right" : "left" }}
                />
              </label>

              {/* Quick Cash Buttons */}
              <div className="pos-quick-cash-row">
                <button
                  type="button"
                  className="pos-quick-cash-btn"
                  onClick={() => handleQuickCash("exact")}
                >
                  {t("sales.exact_net", "Exact Cash")}
                </button>
                <button
                  type="button"
                  className="pos-quick-cash-btn"
                  onClick={() => handleQuickCash(500)}
                >
                  +500
                </button>
                <button
                  type="button"
                  className="pos-quick-cash-btn"
                  onClick={() => handleQuickCash(1000)}
                >
                  +1,000
                </button>
                <button
                  type="button"
                  className="pos-quick-cash-btn"
                  onClick={() => handleQuickCash(5000)}
                >
                  +5,000
                </button>
              </div>

              {/* Credit Due Date if balance remains */}
              {balanceDue > 0 && (
                <label style={{ display: "block", marginTop: "0.6rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--warning)" }}>{t("sales.credit_due_date", "Credit Due Date")}</span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    style={{ width: "100%", padding: "0.4rem 0.6rem", marginTop: "0.2rem" }}
                  />
                </label>
              )}

              {/* Memo / Notes input */}
              <label style={{ display: "block", marginTop: "0.6rem" }}>
                <span className="muted small">{t("sales.memo_notes", "Memo / Warranty Terms")}</span>
                <input
                  type="text"
                  placeholder={isUrdu ? "رسید کے لیے اضافی نوٹس..." : "Optional note for invoice..."}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ width: "100%", padding: "0.35rem 0.6rem", fontSize: "0.82rem", marginTop: "0.2rem" }}
                />
              </label>

              {/* 1-Click Pay Button */}
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="pos-pay-btn"
                  onClick={handleSubmit}
                  disabled={!canCreate || form.items.length === 0}
                >
                  <span>💳</span>
                  <span>
                    {canCreate
                      ? (grandTotal > 0
                          ? `Save Sale • PKR ${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                          : t("sales.complete_sale", "Save Sale / Complete Sale"))
                      : t("sales.operational_role_required", "Create Sale (Restricted to Manager/Cashier)")}
                  </span>
                </button>
              </div>

              {/* Persistent Print Receipt Button on POS Counter */}
              {lastSavedSale && (
                <div style={{ marginTop: "0.6rem" }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => handleOpenReceipt(lastSavedSale)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      background: "#059669",
                      color: "#ffffff",
                      borderColor: "#047857",
                      fontWeight: "700",
                      fontSize: "0.88rem"
                    }}
                  >
                    <span>🧾</span>
                    <span>Print Receipt #{lastSavedSale.invoice_number}</span>
                  </button>
                </div>
              )}

              {!canCreate && (
                <div className="alert info" style={{ fontSize: "0.78rem", marginTop: "0.6rem" }}>
                  ℹ️ <strong>Operational Role Required:</strong> {t("sales.operational_role_required", "Sales transactions must be performed by assigned Branch Managers and Cashiers.")}
                </div>
              )}
            </div>
          </div>

          {/* Quick Add Product Modal */}
          <QuickAddProductModal
            isOpen={showQuickProductModal}
            onClose={() => setShowQuickProductModal(false)}
            onCreated={(newProd) => {
              addProductToCart(newProd);
              if (context.setProducts) {
                context.setProducts([...(context.products || []), newProd]);
              }
            }}
            branchId={form.branchId}
          />
        </div>
      )}

      {/* TAB 2: SALES DIRECTORY & HISTORY (SEARCH, VIEW, EDIT, DELETE) */}
      {activeTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "1rem"
            }}
          >
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
                {t("sales.total_orders", "Total Sales Orders")}
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: "700", color: "var(--text)", marginTop: "0.25rem" }}>
                {metrics.activeCount} <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: "normal" }}>{t("common.orders", "orders")}</span>
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
                {t("sales.total_revenue", "Total Revenue")}
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: "700", color: "var(--primary)", marginTop: "0.25rem" }}>
                PKR {metrics.grossRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
                {t("sales.total_collected", "Total Collected (Paid)")}
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: "700", color: "#10b981", marginTop: "0.25rem" }}>
                PKR {metrics.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
                {t("sales.outstanding_receivables", "Outstanding Receivables")}
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: "700", color: metrics.totalBalance > 0 ? "#f59e0b" : "var(--muted)", marginTop: "0.25rem" }}>
                PKR {metrics.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <SectionCard
            title="Sales Directory & Order History"
            subtitle="Search sales by invoice, customer name or phone. Inspect line items, edit quantities, print receipts, or void transactions."
            action={
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="secondary-btn btn-sm" onClick={handleExportSales}>
                  📥 Export CSV
                </button>
                <button type="button" className="primary-btn btn-sm" onClick={fetchSalesList} disabled={loadingList}>
                  {loadingList ? "Loading..." : "🔄 Refresh"}
                </button>
              </div>
            }
          >
            <div className="form-grid" style={{ marginBottom: "1rem" }}>
              <label>
                Search Sales Orders
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="🔍 Search Invoice #, customer, phone, notes..."
                />
              </label>

              <label>
                Filter Branch
                <select
                  value={branchFilter}
                  onChange={(e) => {
                    setBranchFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Branches</option>
                  {context.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Order Status
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Sales</option>
                  <option value="deleted">Voided / Deleted Only</option>
                </select>
              </label>

              <label>
                Payment Balance
                <select
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Fully Paid</option>
                  <option value="partial">Partial Payment</option>
                  <option value="unpaid">Unpaid / Full Credit</option>
                </select>
              </label>

              <label>
                From Date
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                />
              </label>

              <label>
                To Date
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>

            {/* Sales Table */}
            <AdaptiveTable
              columns={[
                {
                  key: "invoice_number",
                  label: "Invoice #",
                  priority: 1,
                  render: (val, row) => (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <strong>{val}</strong>
                      {Boolean(row.is_deleted) && (
                        <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
                          Voided
                        </span>
                      )}
                    </span>
                  )
                },
                {
                  key: "sale_date",
                  label: "Date",
                  priority: 2,
                  render: (val) => <span className="muted small">{val ? String(val).slice(0, 10) : "—"}</span>
                },
                {
                  key: "customer_name",
                  label: "Customer",
                  priority: 2,
                  truncate: true,
                  tooltip: (row) => row.customer_name || "Walk-in Customer",
                  render: (val) => val || "Walk-in Customer"
                },
                {
                  key: "branch_name",
                  label: "Branch",
                  priority: 3,
                  truncate: true,
                  render: (val, row) => val || `Branch #${row.branch_id}`
                },
                {
                  key: "total_items",
                  label: "Items",
                  priority: 3,
                  align: "center",
                  render: (val) => <span className="status-pill">{val || 1}</span>
                },
                {
                  key: "total_amount",
                  label: "Total",
                  priority: 1,
                  align: "right",
                  render: (val) => <strong>PKR {Number(val || 0).toLocaleString()}</strong>
                },
                {
                  key: "paid_amount",
                  label: "Paid",
                  priority: 2,
                  align: "right",
                  render: (val) => <span style={{ color: "#10b981", fontWeight: "600" }}>PKR {Number(val || 0).toLocaleString()}</span>
                },
                {
                  key: "balance_amount",
                  label: "Status / Balance",
                  priority: 2,
                  align: "right",
                  render: (val, row) => {
                    if (row.is_deleted) {
                      return <span className="badge" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>Voided</span>;
                    }
                    const numBal = Number(val || 0);
                    if (numBal <= 0) {
                      return <span className="badge" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>Paid</span>;
                    }
                    if (Number(row.paid_amount || 0) > 0) {
                      return (
                        <div style={{ textAlign: "right" }}>
                          <span className="badge" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>Partial</span>
                          <div style={{ fontSize: "0.74rem", color: "#f59e0b" }}>Due: PKR {numBal.toLocaleString()}</div>
                        </div>
                      );
                    }
                    return (
                      <div style={{ textAlign: "right" }}>
                        <span className="badge" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>Unpaid</span>
                        <div style={{ fontSize: "0.74rem", color: "#ef4444" }}>Due: PKR {numBal.toLocaleString()}</div>
                      </div>
                    );
                  }
                }
              ]}
              data={paginatedSales}
              keyField="id"
              emptyMessage={loadingList ? "Loading sales orders..." : "No sales orders found matching your search criteria."}
              actions={(row) => (
                <div className="table-actions-vertical">
                  {/* Receipt button - available to all who can view */}
                  <TableActionButton
                    variant="receipt"
                    icon="🧾"
                    label="Receipt"
                    onClick={() => handleOpenReceipt(row)}
                    title="View & Print 80mm Receipt or A4 Invoice"
                  />

                  {/* Edit button - guarded by canEdit permission */}
                  {!row.is_deleted && canEdit ? (
                    <TableActionButton
                      variant="edit"
                      icon="✏️"
                      label="Edit"
                      onClick={() => handleOpenEditModal(row)}
                      title="Edit items, customer, or prices"
                    />
                  ) : !row.is_deleted ? (
                    <TableActionButton
                      variant="edit"
                      icon="🔒"
                      label="Edit"
                      disabled
                      title="Edit permission required for your role"
                    />
                  ) : null}

                  {/* Return button */}
                  {!row.is_deleted && (
                    <TableActionButton
                      variant="return"
                      icon="↩️"
                      label="Return"
                      onClick={async () => {
                        const full = await api.getSale(row.id);
                        setReturnOrder(full);
                      }}
                      title="Create customer sale return"
                    />
                  )}

                  {/* Delete / Void button - guarded by canDelete permission */}
                  {!row.is_deleted && canDelete ? (
                    <TableActionButton
                      variant="delete"
                      icon="🗑️"
                      label="Void"
                      onClick={() => handleOpenDeleteModal(row)}
                      title="Void sale and return handsets/accessories to stock"
                    />
                  ) : !row.is_deleted ? (
                    <TableActionButton
                      variant="delete"
                      icon="🔒"
                      label="Void"
                      disabled
                      title="Void/Delete permission required for your role"
                    />
                  ) : null}
                </div>
              )}
              actionsHeader="Actions"
              actionsWidth="95px"
            />

            {/* Pagination Controls */}
            <PaginationBar
              page={currentPage}
              pageSize={pageSize}
              total={filteredSales.length}
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

      {/* EDIT SALE MODAL */}
      {editModalOrder && editForm && (
        <div className="modal-backdrop" onClick={() => !isSavingEdit && setEditModalOrder(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "860px" }}>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-header">
                <h3>✏️ Edit Sale #{editModalOrder.invoice_number}</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSavingEdit}
                  onClick={() => setEditModalOrder(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                {editError ? <div className="alert error" style={{ marginBottom: "1rem" }}>{editError}</div> : null}

                <div className="form-grid" style={{ marginBottom: "1rem" }}>
                  <label>
                    Customer Profile
                    <SearchableSelect
                      value={editForm.customerId}
                      onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                      placeholder="Search customer..."
                    >
                      <option value="">Walk in / new customer</option>
                      {customerOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </option>
                      ))}
                    </SearchableSelect>
                  </label>

                  {!editForm.customerId && (
                    <>
                      <label>
                        Walk-in Name
                        <input
                          value={editForm.quickCustomerName}
                          onChange={(e) => setEditForm({ ...editForm, quickCustomerName: e.target.value })}
                          placeholder="Walk-in name"
                        />
                      </label>
                      <label>
                        Walk-in Phone
                        <input
                          value={editForm.quickCustomerPhone}
                          onChange={(e) => setEditForm({ ...editForm, quickCustomerPhone: e.target.value })}
                          placeholder="Phone number"
                        />
                      </label>
                    </>
                  )}

                  <label>
                    Sale Date
                    <input
                      type="date"
                      value={editForm.saleDate}
                      onChange={(e) => setEditForm({ ...editForm, saleDate: e.target.value })}
                      required
                    />
                  </label>

                  <label>
                    Payment Method
                    <select
                      value={editForm.paymentMethod}
                      onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                    >
                      <option value="cash">Cash (Counter)</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="mobile_wallet">Mobile Wallet</option>
                    </select>
                  </label>

                  <label>
                    Tax Amount (PKR)
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.taxAmount}
                      onChange={(e) => setEditForm({ ...editForm, taxAmount: e.target.value })}
                    />
                  </label>

                  <label>
                    Paid Amount (PKR)
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.paidAmount}
                      onChange={(e) => setEditForm({ ...editForm, paidAmount: e.target.value })}
                    />
                  </label>

                  <label>
                    Due Date
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    />
                  </label>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem" }}>📦 Sold Handsets & Accessory Items</h4>
                  <LineItemScanner
                    models={context.models}
                    products={availableProducts}
                    mode="sale"
                    items={editForm.items}
                    onChange={(items) => setEditForm((prev) => ({ ...prev, items }))}
                  />
                </div>

                <label className="full-span">
                  Notes / Correction Reason
                  <textarea
                    rows="2"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Enter reason for changes or corrections..."
                  />
                </label>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSavingEdit}
                  onClick={() => setEditModalOrder(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving Changes..." : "💾 Save Changes & Reconcile Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / VOID TRANSACTION MODAL */}
      {deleteModalOrder && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeleteModalOrder(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <form onSubmit={handleConfirmDelete}>
              <div className="modal-header">
                <h3 style={{ color: "var(--danger, #ef4444)" }}>🗑️ Void Sale #{deleteModalOrder.invoice_number}</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isDeleting}
                  onClick={() => setDeleteModalOrder(null)}
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
                  <p style={{ margin: "0 0 0.5rem", fontWeight: "600", color: "var(--danger, #ef4444)" }}>
                    ⚠️ Warning: Irreversible Action
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)" }}>
                    Voiding this sale order will permanently mark it as deleted, restore all sold handsets back to
                    <strong> in_stock</strong>, and return accessories/parts to branch inventory quantities.
                  </p>
                </div>

                <div style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                  <div><strong>Customer:</strong> {deleteModalOrder.customer_name || "Walk-in Customer"}</div>
                  <div><strong>Total Amount:</strong> PKR {Number(deleteModalOrder.total_amount || 0).toLocaleString()}</div>
                  <div><strong>Sale Date:</strong> {deleteModalOrder.sale_date}</div>
                </div>

                <label className="full-span">
                  <span>Reason for Deletion / Void <strong style={{ color: "var(--danger)" }}>*</strong></span>
                  <textarea
                    rows={3}
                    required
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    placeholder="Enter mandatory reason for audit log (e.g. customer returned item before leaving, entered in error)..."
                  />
                </label>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isDeleting}
                  onClick={() => setDeleteModalOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ background: "var(--danger, #ef4444)", borderColor: "#dc2626", color: "#ffffff" }}
                  disabled={isDeleting || !deletionReason.trim()}
                >
                  {isDeleting ? "Voiding Order..." : "Confirm Void & Restore Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL (80MM THERMAL SLIP & A4 INVOICE) */}
      {receiptOrder && (
        <div className="modal-backdrop" onClick={() => setReceiptOrder(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px" }}>
            <div className="modal-header no-print">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h3 style={{ margin: 0 }}>🧾 Sale Receipt #{receiptOrder.invoice_number}</h3>
                <div style={{ display: "inline-flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setReceiptMode("thermal")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      background: receiptMode === "thermal" ? "var(--primary)" : "transparent",
                      color: receiptMode === "thermal" ? "#ffffff" : "var(--text)",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    Thermal 80mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptMode("standard")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      background: receiptMode === "standard" ? "var(--primary)" : "transparent",
                      color: receiptMode === "standard" ? "#ffffff" : "var(--text)",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    Standard A4
                  </button>
                </div>
              </div>
              <button type="button" className="close-btn" onClick={() => setReceiptOrder(null)}>✕</button>
            </div>

            <div className="modal-body printable-receipt-container" style={{ maxHeight: "75vh", overflowY: "auto", background: receiptMode === "thermal" ? "#ffffff" : "var(--surface)", color: receiptMode === "thermal" ? "#000000" : "var(--text)", padding: receiptMode === "thermal" ? "1.5rem" : "1.25rem", borderRadius: "8px" }}>
              {/* Thermal 80mm Slip Format */}
              {receiptMode === "thermal" ? (
                <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.82rem", lineHeight: "1.4", color: "#000000", maxWidth: "320px", margin: "0 auto" }}>
                  <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
                    <h3 className="receipt-company-title" style={{ margin: "0 0 2px", fontSize: "1.2rem", fontWeight: "900", letterSpacing: "0.8px", textTransform: "uppercase" }}>{shopName}</h3>
                    {/* Mono printed above branch name */}
                    <div className="receipt-mono-wrap" style={{ margin: "4px auto 6px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                      {companyLogo ? (
                        <img
                          src={companyLogo}
                          alt={shopName}
                          className="receipt-mono-img"
                          style={{
                            maxHeight: "50px",
                            maxWidth: "130px",
                            objectFit: "contain",
                            display: "block",
                            filter: "grayscale(100%) contrast(120%)"
                          }}
                        />
                      ) : (
                        <div className="receipt-mono-stamp">
                          {shopName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: "0.80rem", fontWeight: "700" }}>Branch: {receiptOrder.branch_name || "Outlet"}</div>
                    <div style={{ fontSize: "0.72rem", color: "#555" }}>Mobile POS & Billing Counter</div>
                    <div style={{ margin: "4px 0", borderBottom: "1px dashed #000" }} />
                    <div style={{ fontWeight: "700" }}>*** {isUrdu ? "فروخت کی رسید / SALE RECEIPT" : "SALE RECEIPT"} ***</div>
                  </div>

                  <div style={{ fontSize: "0.78rem", marginBottom: "0.5rem" }}>
                    <div><strong>{isUrdu ? "انوائس نمبر (Invoice) :" : "Invoice :"}</strong> <span style={{ direction: "ltr", display: "inline-block" }}>{receiptOrder.invoice_number}</span></div>
                    <div><strong>{isUrdu ? "تاریخ (Date) :" : "Date    :"}</strong> <span style={{ direction: "ltr", display: "inline-block" }}>{receiptOrder.sale_date || new Date().toISOString().slice(0, 10)}</span></div>
                    <div><strong>{isUrdu ? "گاہک (Customer) :" : "Customer:"}</strong> {receiptOrder.customer_name || (isUrdu ? "عام گاہک" : "Walk-in Customer")}</div>
                    {receiptOrder.customer_phone && <div><strong>{isUrdu ? "فون (Phone) :" : "Phone   :"}</strong> <span style={{ direction: "ltr", display: "inline-block" }}>{receiptOrder.customer_phone}</span></div>}
                    <div><strong>{isUrdu ? "ادائیگی (Payment) :" : "Payment :"}</strong> {receiptOrder.payment_method?.toUpperCase()}</div>
                  </div>

                  <div style={{ borderBottom: "1px dashed #000", marginBottom: "0.5rem" }} />

                  {/* Items header */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", marginBottom: "0.35rem", fontSize: "0.75rem" }}>
                    <span style={{ flex: 2 }}>{isUrdu ? "چیز / ITEM" : "ITEM / IMEI"}</span>
                    <span style={{ width: "35px", textAlign: "center" }}>{isUrdu ? "تعداد" : "QTY"}</span>
                    <span style={{ width: "65px", textAlign: "right" }}>{isUrdu ? "ریٹ" : "RATE"}</span>
                    <span style={{ width: "70px", textAlign: "right" }}>{isUrdu ? "رقم" : "AMOUNT"}</span>
                  </div>

                  <div style={{ borderBottom: "1px dashed #ccc", marginBottom: "0.45rem" }} />

                  {/* Line items */}
                  {(receiptOrder.items || []).map((it, idx) => {
                    const name = it.company ? `${it.company} ${it.model_name}` : (it.product_name || (isUrdu ? "لوازمات" : "Accessory"));
                    const qty = Number(it.quantity || 1);
                    const rate = Number(it.unit_price || 0);
                    return (
                      <div key={idx} style={{ marginBottom: "0.45rem", fontSize: "0.75rem" }}>
                        <div style={{ fontWeight: "700" }}>{name}</div>
                        {it.imei && <div style={{ fontSize: "0.7rem", color: "#333", direction: "ltr", textAlign: isRtl ? "right" : "left", unicodeBidi: "isolate" }}>IMEI: {it.imei}</div>}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ flex: 2 }} />
                          <span style={{ width: "35px", textAlign: "center" }}>{qty}</span>
                          <span style={{ width: "65px", textAlign: "right" }}>{rate.toLocaleString()}</span>
                          <span style={{ width: "70px", textAlign: "right", fontWeight: "700" }}>{(rate * qty).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ borderBottom: "1px dashed #000", margin: "0.5rem 0" }} />

                  {/* Totals Summary */}
                  <div style={{ fontSize: "0.82rem", lineHeight: "1.5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{isUrdu ? "کل میزان (Subtotal):" : "Subtotal:"}</span>
                      <span>Rs. {Number(receiptOrder.subtotal || receiptOrder.total_amount).toLocaleString()}</span>
                    </div>
                    {Number(receiptOrder.tax_amount) > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{isUrdu ? "ٹیکس (Tax):" : "Tax:"}</span>
                        <span>Rs. {Number(receiptOrder.tax_amount).toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "0.95rem", margin: "4px 0" }}>
                      <span>{isUrdu ? "کل رقم (TOTAL DUE):" : "TOTAL DUE:"}</span>
                      <span>Rs. {Number(receiptOrder.total_amount).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{isUrdu ? "ادا شدہ (Amount Paid):" : "Amount Paid:"}</span>
                      <span>Rs. {Number(receiptOrder.paid_amount || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: Number(receiptOrder.balance_amount) > 0 ? "#b45309" : "#059669" }}>
                      <span>{isUrdu ? "بقایا (Balance Due):" : "Balance Due:"}</span>
                      <span>Rs. {Number(receiptOrder.balance_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ borderBottom: "1px dashed #000", margin: "0.75rem 0" }} />

                  <div style={{ textAlign: "center", fontSize: "0.72rem", color: "#333" }}>
                    <div>{isUrdu ? "آپ کی خریداری کا شکریہ!" : "Thank you for your purchase!"}</div>
                    <div>{isUrdu ? "وارنٹی کلیم کیلئے رسید ضروری ہے۔" : "Exchange/warranty claims valid with receipt."}</div>
                    <div style={{ marginTop: "4px", fontSize: "0.68rem" }}>DigitalMarkaz360 POS & ERP</div>
                  </div>
                </div>
              ) : (
                /* Standard Invoice A4 Format */
                <div style={{ padding: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                    <div>
                      <h2 className="receipt-company-title" style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: "900", color: "var(--text)", textTransform: "uppercase" }}>{shopName}</h2>
                      {/* Mono printed above branch name */}
                      <div style={{ margin: "6px 0" }}>
                        {companyLogo ? (
                          <img
                            src={companyLogo}
                            alt={shopName}
                            style={{ maxHeight: "60px", maxWidth: "160px", objectFit: "contain", display: "block" }}
                          />
                        ) : (
                          <div className="receipt-mono-stamp-a4">
                            {shopName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div style={{ color: "var(--primary)", fontWeight: "700", fontSize: "0.90rem" }}>
                        Branch: {receiptOrder.branch_name || "Main Branch"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Retail Sales & Point of Sale Counter</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <h3 style={{ margin: "0 0 4px", color: "var(--text)" }}>INVOICE #{receiptOrder.invoice_number}</h3>
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Date: {receiptOrder.sale_date}</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Payment: {receiptOrder.payment_method?.toUpperCase()}</div>
                    </div>
                  </div>

                  <div style={{ background: "var(--surface-strong, rgba(0,0,0,0.02))", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem" }}>
                      <div><strong>Customer:</strong> {receiptOrder.customer_name || "Walk-in Customer"}</div>
                      <div><strong>Phone:</strong> {receiptOrder.customer_phone || "—"}</div>
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-strong, rgba(0,0,0,0.05))", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px", textAlign: "left" }}>#</th>
                        <th style={{ padding: "8px", textAlign: "left" }}>Description</th>
                        <th style={{ padding: "8px", textAlign: "center" }}>Qty</th>
                        <th style={{ padding: "8px", textAlign: "right" }}>Unit Price</th>
                        <th style={{ padding: "8px", textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(receiptOrder.items || []).map((it, idx) => {
                        const name = it.company ? `${it.company} ${it.model_name}` : (it.product_name || "Accessory");
                        const qty = Number(it.quantity || 1);
                        const rate = Number(it.unit_price || 0);
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "8px" }}>{idx + 1}</td>
                            <td style={{ padding: "8px" }}>
                              <strong>{name}</strong>
                              {it.imei && <div className="muted" style={{ fontSize: "0.78rem" }}>IMEI: {it.imei}</div>}
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{qty}</td>
                            <td style={{ padding: "8px", textAlign: "right" }}>PKR {rate.toLocaleString()}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: "600" }}>PKR {(rate * qty).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ width: "240px", fontSize: "0.88rem", lineHeight: "1.6" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Subtotal:</span>
                        <span>PKR {Number(receiptOrder.subtotal || receiptOrder.total_amount).toLocaleString()}</span>
                      </div>
                      {Number(receiptOrder.tax_amount) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Tax:</span>
                          <span>PKR {Number(receiptOrder.tax_amount).toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", borderTop: "1px solid var(--border)", paddingTop: "4px" }}>
                        <span>Total:</span>
                        <span>PKR {Number(receiptOrder.total_amount).toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981" }}>
                        <span>Paid:</span>
                        <span>PKR {Number(receiptOrder.paid_amount || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: Number(receiptOrder.balance_amount) > 0 ? "#f59e0b" : "#10b981" }}>
                        <span>Balance:</span>
                        <span>PKR {Number(receiptOrder.balance_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {(receiptOrder.customer_phone || receiptOrder.phone) && Number(receiptOrder.balance_amount) > 0 && (
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    style={{ color: "#10b981", borderColor: "#10b981" }}
                    onClick={() =>
                      openWhatsAppReminder({
                        phone: receiptOrder.customer_phone || receiptOrder.phone,
                        customerName: receiptOrder.customer_name,
                        invoiceNumber: receiptOrder.invoice_number,
                        balance: receiptOrder.balance_amount,
                        dueDate: receiptOrder.due_date,
                        shopName
                      })
                    }
                  >
                    💬 Send WhatsApp Reminder
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="secondary-btn" onClick={() => setReceiptOrder(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => window.print()}
                  style={{ background: "#059669", borderColor: "#047857" }}
                >
                  🖨️ Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RETURN ORDER MODAL */}
      <ReturnOrderModal
        isOpen={Boolean(returnOrder)}
        onClose={() => setReturnOrder(null)}
        defaultType="customer_return"
        referenceOrder={returnOrder}
        onReturnCreated={() => {
          fetchSalesList();
          context?.refreshAll?.();
        }}
      />
    </div>
  );
}
