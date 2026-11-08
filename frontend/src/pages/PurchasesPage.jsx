import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { LineItemScanner } from "../components/LineItemScanner.jsx";
import { SectionCard } from "../components/SectionCard.jsx";
import { PhoneQRTagModal } from "../components/PhoneQRTagModal.jsx";
import { SearchableSelect } from "../components/SearchableSelect.jsx";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { QuickAddProductModal } from "../components/QuickAddProductModal.jsx";
import { QuickAddModelModal } from "../components/QuickAddModelModal.jsx";
import { ReceiptModal } from "../components/ReceiptModal.jsx";
import { ReturnOrderModal } from "../components/ReturnOrderModal.jsx";
import { TableActionButton } from "../components/TableActionColumn.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

function formatCnic(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}
const CNIC_REGEX = /^(\d{5}-\d{7}-\d{1}|\d{13})$/;

function initialForm(defaultBranchId) {
  return {
    branchId: defaultBranchId || "",
    vendorId: "",
    purchaserName: "",
    purchaserCnic: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash",
    discountAmount: 0,
    taxAmount: 0,
    paidAmount: 0,
    dueDate: "",
    notes: "",
    items: []
  };
}

export function PurchasesPage({ context = {} }) {
  const { t, isRtl, language, formatCurrency } = useLanguage();
  const isUrdu = language === "ur";
  const defaultBranchId = context?.session?.branch_id || context?.session?.branchId || "";
  const [form, setForm] = useState(initialForm(defaultBranchId));
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [hasAttemptedEditSubmit, setHasAttemptedEditSubmit] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrItems, setQrItems] = useState([]);
  const [activeTab, setActiveTab] = useState("new"); // "new" | "history"

  // Dedicated Purchase Intake States
  const [purchaseMode, setPurchaseMode] = useState("phone"); // "phone" | "product"
  const [selectedPhoneModelId, setSelectedPhoneModelId] = useState("");
  const [phoneUnitCost, setPhoneUnitCost] = useState("");
  const [singleImeiInput, setSingleImeiInput] = useState("");
  const [bulkImeiText, setBulkImeiText] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productQty, setProductQty] = useState("1");
  const [productUnitCost, setProductUnitCost] = useState("");
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [showQuickModelModal, setShowQuickModelModal] = useState(false);
  const [showVendorDetails, setShowVendorDetails] = useState(false);
  const singleImeiInputRef = useRef(null);

  // Permissions
  const canCreate = context.can ? context.can("purchases", "create") : true;
  const canEdit = context.can ? context.can("purchases", "edit") : true;
  const canDelete = context.can ? context.can("purchases", "delete") : true;
  const canView = context.can ? context.can("purchases", "view") : true;

  const firstFieldRef = useRef(null);
  const formRef = useRef(null);
  const [productsList, setProductsList] = useState(context?.products || []);
  const [modelsList, setModelsList] = useState(context?.models || []);

  // Purchases History State
  const [purchasesList, setPurchasesList] = useState([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Purchase Modal State
  const [editModalOrder, setEditModalOrder] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete / Void Modal State
  const [deleteModalOrder, setDeleteModalOrder] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Receipt Modal State
  const [receiptPurchase, setReceiptPurchase] = useState(null);
  const [lastSavedPurchase, setLastSavedPurchase] = useState(null);
  const [returnPurchaseOrder, setReturnPurchaseOrder] = useState(null);

  const availableProducts = useMemo(() => {
    if (Array.isArray(productsList) && productsList.length > 0) return productsList;
    if (Array.isArray(context?.products) && context.products.length > 0) return context.products;
    return [];
  }, [context?.products, productsList]);

  const availableModels = useMemo(() => {
    if (Array.isArray(modelsList) && modelsList.length > 0) return modelsList;
    if (Array.isArray(context?.models) && context.models.length > 0) return context.models;
    return [];
  }, [context?.models, modelsList]);

  const availableBranches = useMemo(() => {
    if (Array.isArray(context?.branches) && context.branches.length > 0) return context.branches;
    return [];
  }, [context?.branches]);

  useEffect(() => {
    if (Array.isArray(context?.products) && context.products.length > 0) {
      setProductsList(context.products);
    }
  }, [context?.products]);

  useEffect(() => {
    if (Array.isArray(context?.models) && context.models.length > 0) {
      setModelsList(context.models);
    }
  }, [context?.models]);

  useEffect(() => {
    let isMounted = true;
    api.products()
      .then((rows) => {
        if (isMounted && Array.isArray(rows)) {
          setProductsList(rows);
          if (context?.setProducts) context.setProducts(rows);
        }
      })
      .catch((err) => {
        console.error("Failed to load products in PurchasesPage:", err);
      });
    return () => { isMounted = false; };
  }, [context?.session?.branch_id]);

  useEffect(() => {
    let isMounted = true;
    api.models()
      .then((rows) => {
        if (isMounted && Array.isArray(rows)) {
          setModelsList(rows);
          if (context?.setModels) context.setModels(rows);
        }
      })
      .catch((err) => {
        console.error("Failed to load models in PurchasesPage:", err);
      });
    return () => { isMounted = false; };
  }, []);

  // Ensure default branch is set when available
  useEffect(() => {
    if (!form.branchId && (defaultBranchId || (availableBranches.length > 0 ? String(availableBranches[0].id) : ""))) {
      setForm((prev) => ({
        ...prev,
        branchId: defaultBranchId || (availableBranches.length > 0 ? String(availableBranches[0].id) : "")
      }));
    }
  }, [defaultBranchId, availableBranches, form.branchId]);

  const loadPurchases = useCallback(async () => {
    if (!canView) return;
    setIsLoadingPurchases(true);
    try {
      const data = await api.purchases();
      setPurchasesList(Array.isArray(data) ? data : (data.purchases || []));
    } catch (err) {
      console.error("Failed to load purchases history:", err);
    } finally {
      setIsLoadingPurchases(false);
    }
  }, [canView]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases, context?.session?.branch_id]);

  const shopName = context?.companyName || context?.session?.business_name || context?.session?.businessName || "DigitalMarkaz360";
  const companyLogo = context?.companyLogo || context?.session?.business_logo || context?.session?.logo_url || context?.session?.businessLogo || (typeof window !== "undefined" && window.__POS_COMPANY_LOGO__) || null;

  const vendorOptions = useMemo(
    () => (context?.parties || []).filter((party) => party.party_type === "vendor" || party.party_type === "both"),
    [context?.parties]
  );

  function handleVendorChange(e) {
    const vId = e.target.value;
    setForm((prev) => ({
      ...prev,
      vendorId: vId,
      purchaserName: vId ? "" : prev.purchaserName,
      purchaserCnic: vId ? "" : prev.purchaserCnic
    }));
  }

  // Live calculation for Record New Purchase form
  const subtotal = useMemo(() => {
    return (form.items || []).reduce((sum, item) => {
      const isProduct = item.itemType === "product" || Boolean(item.productId);
      const qty = isProduct ? Number(item.quantity || 1) : 1;
      const rate = Number(item.unitCost || 0);
      return sum + (qty * rate);
    }, 0);
  }, [form.items]);

  const purchaseCounts = useMemo(() => {
    let phones = 0;
    let accessories = 0;
    (form.items || []).forEach((it) => {
      if (it.itemType === "handset" || it.imei) phones += 1;
      else accessories += Number(it.quantity || 1);
    });
    return { total: (form.items || []).length, phones, accessories };
  }, [form.items]);

  const discountVal = Number(form.discountAmount || 0);
  const taxVal = Number(form.taxAmount || 0);
  const netAmount = subtotal - discountVal + taxVal;
  const paidVal = Number(form.paidAmount || 0);
  const balanceAmount = netAmount - paidVal;
  const todayStr = new Date().toISOString().slice(0, 10);

  // CHANGE 4: Clear Due Date if Balance becomes 0
  useEffect(() => {
    if (balanceAmount <= 0 && form.dueDate) {
      setForm((prev) => ({ ...prev, dueDate: "" }));
    }
  }, [balanceAmount, form.dueDate]);

  // Inline error conditions
  const discountError = discountVal < 0
    ? "Discount cannot be negative"
    : (discountVal > subtotal ? "Discount cannot be more than Subtotal" : "");

  const paidError = paidVal < 0
    ? "Paid Amount cannot be negative"
    : (paidVal > netAmount ? "Paid Amount cannot be more than Net Amount" : "");

  const dueDateError = balanceAmount > 0
    ? (!form.dueDate
        ? (hasAttemptedSubmit ? "Due Date is required when a balance is due" : "")
        : (form.dueDate < todayStr ? "Due Date cannot be in the past" : ""))
    : "";

  const purchaserNameError = !form.vendorId
    ? (!form.purchaserName?.trim() && hasAttemptedSubmit ? "Purchaser Name is required" : "")
    : "";

  const purchaserCnicError = !form.vendorId
    ? (!form.purchaserCnic?.trim()
        ? (hasAttemptedSubmit ? "Purchaser CNIC is required" : "")
        : (!CNIC_REGEX.test(form.purchaserCnic.trim()) ? "Invalid CNIC format. Expected format: 12345-1234567-1 or 13 digits" : ""))
    : "";

  // --- Dedicated Purchase Intake Helpers ---
  function handleAddSingleImei(e) {
    if (e) e.preventDefault();
    setError("");
    const imei = (singleImeiInput || "").trim().replace(/\s+/g, "");
    if (!selectedPhoneModelId) {
      setError("Please select a Mobile Model before adding IMEI.");
      return;
    }
    if (!phoneUnitCost || Number(phoneUnitCost) <= 0) {
      setError("Please enter a valid Purchase Cost (PKR) for this phone.");
      return;
    }
    if (imei.length < 14 || imei.length > 20) {
      setError(`Invalid IMEI (${imei.length} digits). Standard IMEI is 15 digits.`);
      return;
    }
    if ((form.items || []).some((it) => it.imei === imei)) {
      setError(`IMEI ${imei} is already added in this purchase order.`);
      return;
    }

    const model = (availableModels || []).find((m) => String(m.id) === String(selectedPhoneModelId));
    const modelTitle = model
      ? `${model.company} ${model.model_name}${model.variant ? ` (${model.variant})` : ""}${model.storage ? ` • ${model.storage}` : ""}${model.color ? ` • ${model.color}` : ""}`.trim()
      : "Mobile Handset";

    setForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          itemType: "handset",
          modelId: Number(selectedPhoneModelId),
          modelTitle,
          imei,
          unitCost: Number(phoneUnitCost),
          quantity: 1
        }
      ]
    }));
    setSingleImeiInput("");
    if (singleImeiInputRef.current) {
      singleImeiInputRef.current.focus();
    }
  }

  function handleAddBulkImeis() {
    setError("");
    if (!selectedPhoneModelId) {
      setError("Please select a Mobile Model before adding IMEIs.");
      return;
    }
    if (!phoneUnitCost || Number(phoneUnitCost) <= 0) {
      setError("Please enter a valid Purchase Cost (PKR) for this batch of phones.");
      return;
    }
    const lines = bulkImeiText
      .split(/[\r\n,]+/)
      .map((l) => l.trim().replace(/\s+/g, ""))
      .filter((l) => l.length >= 14 && l.length <= 20);

    if (!lines.length) {
      setError("No valid 14-20 digit IMEIs found in the bulk paste box.");
      return;
    }

    const model = (availableModels || []).find((m) => String(m.id) === String(selectedPhoneModelId));
    const modelTitle = model
      ? `${model.company} ${model.model_name}${model.variant ? ` (${model.variant})` : ""}${model.storage ? ` • ${model.storage}` : ""}${model.color ? ` • ${model.color}` : ""}`.trim()
      : "Mobile Handset";

    const currentImeis = new Set((form.items || []).map((it) => it.imei).filter(Boolean));
    const newItems = [];
    const duplicates = [];

    lines.forEach((imei) => {
      if (currentImeis.has(imei)) {
        duplicates.push(imei);
      } else {
        currentImeis.add(imei);
        newItems.push({
          itemType: "handset",
          modelId: Number(selectedPhoneModelId),
          modelTitle,
          imei,
          unitCost: Number(phoneUnitCost),
          quantity: 1
        });
      }
    });

    if (newItems.length > 0) {
      setForm((prev) => ({
        ...prev,
        items: [...(prev.items || []), ...newItems]
      }));
      setBulkImeiText("");
      setShowBulkPaste(false);
      setMessage(`Added ${newItems.length} mobile handset(s) to purchase order.`);
    }

    if (duplicates.length > 0) {
      setError(`Skipped ${duplicates.length} duplicate IMEI(s) already in order: ${duplicates.slice(0, 3).join(", ")}...`);
    }
  }

  function handleAddProductItem(e) {
    if (e) e.preventDefault();
    setError("");
    if (!selectedProductId) {
      setError("Please select a product from the list.");
      return;
    }
    const qty = Math.max(1, parseInt(productQty, 10) || 1);
    if (!productUnitCost || Number(productUnitCost) <= 0) {
      setError("Please enter a valid unit cost price.");
      return;
    }

    const prod = availableProducts.find((p) => String(p.id) === String(selectedProductId));
    const existingIdx = (form.items || []).findIndex((it) => String(it.productId) === String(selectedProductId));

    if (existingIdx >= 0) {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((it, idx) =>
          idx === existingIdx
            ? { ...it, quantity: Number(it.quantity || 1) + qty, unitCost: Number(productUnitCost) }
            : it
        )
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        items: [
          ...(prev.items || []),
          {
            itemType: "product",
            productId: Number(selectedProductId),
            productName: prod?.name || "Product",
            categoryName: prod?.category_name || "Accessory",
            quantity: qty,
            unitCost: Number(productUnitCost)
          }
        ]
      }));
    }

    setSelectedProductId("");
    setProductQty("1");
    setProductUnitCost("");
  }

  function updatePurchaseItemQty(index, newQty) {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, idx) => (idx === index ? { ...it, quantity: qty } : it))
    }));
  }

  function updatePurchaseItemCost(index, newCost) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, idx) => (idx === index ? { ...it, unitCost: newCost } : it))
    }));
  }

  function removePurchaseItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (!canCreate) {
      setError("Purchase creation restricted. Your account does not have permission to create purchases.");
      return;
    }
    setError("");
    setMessage("");

    // CHANGE 1 validation: Purchaser Name & CNIC when no vendor
    if (!form.vendorId) {
      if (!form.purchaserName || !form.purchaserName.trim()) {
        setError("Purchaser Name is required when no vendor is selected");
        return;
      }
      if (!form.purchaserCnic || !form.purchaserCnic.trim()) {
        setError("Purchaser CNIC is required when no vendor is selected");
        return;
      }
      if (!CNIC_REGEX.test(form.purchaserCnic.trim())) {
        setError("Invalid CNIC format. Expected format: 12345-1234567-1 or 13 digits");
        return;
      }
    }

    const purchaseItems = form.items
      .filter((item) => {
        if (item.itemType === "product" || item.productId) {
          return item.productId && item.unitCost;
        }
        return item.imei && item.modelId && item.unitCost;
      })
      .map((item) => {
        if (item.itemType === "product" || item.productId) {
          return {
            productId: Number(item.productId),
            quantity: Number(item.quantity || 1),
            unitCost: Number(item.unitCost)
          };
        }
        return {
          imei: item.imei.trim(),
          modelId: Number(item.modelId),
          unitCost: Number(item.unitCost)
        };
      });

    if (!purchaseItems.length) {
      setError("Please select at least one valid mobile handset (with model, IMEI and cost) or accessory (with quantity and cost)");
      return;
    }

    const imeis = purchaseItems.filter((item) => item.imei).map((item) => item.imei);
    const duplicateImeis = imeis.filter((imei, index) => imeis.indexOf(imei) !== index);
    if (duplicateImeis.length) {
      setError(`Duplicate IMEIs in form: ${[...new Set(duplicateImeis)].join(", ")}`);
      return;
    }

    // Amount validations
    if (discountVal < 0) {
      setError("Discount amount cannot be negative");
      return;
    }
    if (discountVal > subtotal) {
      setError("Discount cannot be more than Subtotal");
      return;
    }
    if (taxVal < 0) {
      setError("Tax amount cannot be negative");
      return;
    }
    if (paidVal < 0) {
      setError("Paid amount cannot be negative");
      return;
    }
    if (paidVal > netAmount) {
      setError("Paid Amount cannot be more than Net Amount");
      return;
    }

    // CHANGE 4: Due Date validation
    if (balanceAmount > 0) {
      if (!form.dueDate) {
        setError("Due Date is required when a balance is due");
        return;
      }
      if (form.dueDate < todayStr) {
        setError("Due Date cannot be in the past");
        return;
      }
    }

    try {
      const saved = await api.createPurchase({
        branchId: Number(form.branchId),
        vendorId: form.vendorId ? Number(form.vendorId) : null,
        purchaserName: form.vendorId ? null : form.purchaserName.trim(),
        purchaserCnic: form.vendorId ? null : form.purchaserCnic.trim(),
        purchaseDate: form.purchaseDate,
        paymentMethod: form.paymentMethod,
        discountAmount: discountVal,
        taxAmount: taxVal,
        paidAmount: paidVal,
        dueDate: balanceAmount > 0 ? form.dueDate : null,
        notes: form.notes,
        items: purchaseItems
      });

      const phoneTags = purchaseItems
        .filter((item) => item.imei)
        .map((item) => {
          const model = (availableModels || []).find((m) => m.id === item.modelId);
          return {
            imei: item.imei,
            modelName: model ? `${model.company} ${model.model_name} ${model.variant || ""}` : "Mobile Handset",
            unitCost: item.unitCost,
            sellingPrice: model?.selling_price || 0
          };
        });

      if (phoneTags.length > 0) {
        setQrItems(phoneTags);
      }

      setMessage(`Purchase saved successfully: #${saved.invoice_number}`);
      setForm(initialForm(defaultBranchId));
      setHasAttemptedSubmit(false);
      context.refreshAll();
      loadPurchases();

      // Automatically open Thermal / A4 Purchase Receipt
      try {
        const fullPurchase = await api.getPurchase(saved.id);
        setReceiptPurchase(fullPurchase);
        setLastSavedPurchase(fullPurchase);
      } catch {
        setReceiptPurchase(saved);
        setLastSavedPurchase(saved);
      }

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
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  // Open Purchase Receipt Modal
  async function handleOpenReceipt(purchase) {
    try {
      const full = await api.getPurchase(purchase.id);
      setReceiptPurchase(full);
    } catch {
      setReceiptPurchase(purchase);
    }
  }

  // Open Edit Purchase Modal
  async function handleOpenEditModal(purchase) {
    setEditError("");
    setHasAttemptedEditSubmit(false);
    try {
      const full = await api.getPurchase(purchase.id);
      const items = (full.items || []).map((it) => {
        if (it.product_id) {
          return {
            itemType: "product",
            productId: it.product_id,
            quantity: Number(it.quantity || 1),
            unitCost: Number(it.unit_cost || 0)
          };
        }
        return {
          itemType: "handset",
          imei: it.imei || "",
          modelId: it.model_id,
          unitCost: Number(it.unit_cost || 0),
          quantity: 1
        };
      });

      setEditForm({
        id: full.id,
        invoiceNumber: full.invoice_number,
        branchId: full.branch_id,
        vendorId: full.vendor_id ? String(full.vendor_id) : "",
        purchaserName: full.purchaser_name || "",
        purchaserCnic: full.purchaser_cnic || "",
        purchaseDate: String(full.purchase_date || "").slice(0, 10),
        paymentMethod: full.payment_method || "cash",
        discountAmount: Number(full.discount_amount || 0),
        taxAmount: Number(full.tax_amount || 0),
        paidAmount: Number(full.paid_amount || 0),
        dueDate: full.due_date ? String(full.due_date).slice(0, 10) : "",
        notes: full.notes || "",
        items: items.length > 0 ? items : [{ imei: "", modelId: "", productId: "", unitCost: "", quantity: 1 }]
      });
      setEditModalOrder(full);
    } catch (err) {
      setError("Failed to load purchase details for editing: " + err.message);
    }
  }

  // Edit Form Computed Values
  const editSubtotal = useMemo(() => {
    if (!editForm?.items) return 0;
    return editForm.items.reduce((sum, item) => {
      const isProduct = item.itemType === "product" || Boolean(item.productId);
      const qty = isProduct ? Number(item.quantity || 1) : 1;
      const rate = Number(item.unitCost || 0);
      return sum + (qty * rate);
    }, 0);
  }, [editForm?.items]);

  const editDiscountVal = Number(editForm?.discountAmount || 0);
  const editTaxVal = Number(editForm?.taxAmount || 0);
  const editNetAmount = editSubtotal - editDiscountVal + editTaxVal;
  const editPaidVal = Number(editForm?.paidAmount || 0);
  const editBalanceAmount = editNetAmount - editPaidVal;

  useEffect(() => {
    if (editForm && editBalanceAmount <= 0 && editForm.dueDate) {
      setEditForm((prev) => (prev ? { ...prev, dueDate: "" } : prev));
    }
  }, [editBalanceAmount, editForm?.dueDate]);

  const editDiscountError = editDiscountVal < 0
    ? "Discount cannot be negative"
    : (editDiscountVal > editSubtotal ? "Discount cannot be more than Subtotal" : "");

  const editPaidError = editPaidVal < 0
    ? "Paid Amount cannot be negative"
    : (editPaidVal > editNetAmount ? "Paid Amount cannot be more than Net Amount" : "");

  const editDueDateError = editBalanceAmount > 0
    ? (!editForm?.dueDate
        ? (hasAttemptedEditSubmit ? "Due Date is required when a balance is due" : "")
        : (editForm.dueDate < todayStr ? "Due Date cannot be in the past" : ""))
    : "";

  const editPurchaserNameError = editForm && !editForm.vendorId
    ? (!editForm.purchaserName?.trim() && hasAttemptedEditSubmit ? "Purchaser Name is required" : "")
    : "";

  const editPurchaserCnicError = editForm && !editForm.vendorId
    ? (!editForm.purchaserCnic?.trim()
        ? (hasAttemptedEditSubmit ? "Purchaser CNIC is required" : "")
        : (!CNIC_REGEX.test(editForm.purchaserCnic.trim()) ? "Invalid CNIC format. Expected format: 12345-1234567-1 or 13 digits" : ""))
    : "";

  async function handleSaveEdit(e) {
    e.preventDefault();
    setHasAttemptedEditSubmit(true);
    if (!canEdit) {
      setEditError("Edit restricted. Your account does not have permission to edit purchases.");
      return;
    }
    setEditError("");

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

    const items = (editForm.items || [])
      .filter((item) => {
        if (item.itemType === "product" || item.productId) {
          return item.productId && item.unitCost;
        }
        return item.imei && item.modelId && item.unitCost;
      })
      .map((item) => {
        if (item.itemType === "product" || item.productId) {
          return {
            productId: Number(item.productId),
            quantity: Number(item.quantity || 1),
            unitCost: Number(item.unitCost)
          };
        }
        return {
          imei: item.imei.trim(),
          modelId: Number(item.modelId),
          unitCost: Number(item.unitCost)
        };
      });

    if (!items.length) {
      setEditError("Please include at least one valid mobile handset or accessory item.");
      return;
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

    setIsSavingEdit(true);

    try {
      await api.updatePurchase(editForm.id, {
        vendorId: editForm.vendorId ? Number(editForm.vendorId) : null,
        purchaserName: editForm.vendorId ? null : editForm.purchaserName.trim(),
        purchaserCnic: editForm.vendorId ? null : editForm.purchaserCnic.trim(),
        purchaseDate: editForm.purchaseDate,
        paymentMethod: editForm.paymentMethod,
        discountAmount: editDiscountVal,
        taxAmount: editTaxVal,
        paidAmount: editPaidVal,
        dueDate: editBalanceAmount > 0 ? editForm.dueDate : null,
        notes: editForm.notes,
        items
      });

      setMessage(`Purchase #${editForm.invoiceNumber} updated successfully!`);
      setEditModalOrder(null);
      setEditForm(null);
      setHasAttemptedEditSubmit(false);
      context.refreshAll();
      loadPurchases();
    } catch (err) {
      setEditError(err.message || "Failed to update purchase");
    } finally {
      setIsSavingEdit(false);
    }
  }

  // Open Delete / Void Modal
  function handleOpenDeleteModal(purchase) {
    setDeleteError("");
    setDeleteReason("");
    setDeleteModalOrder(purchase);
  }

  async function handleConfirmDelete(e) {
    e.preventDefault();
    if (!canDelete) {
      setDeleteError("Delete restricted. Your account does not have permission to void purchases.");
      return;
    }
    if (!deleteReason.trim()) {
      setDeleteError("Please provide an audit reason for voiding this purchase order.");
      return;
    }
    setIsDeleting(true);
    setDeleteError("");

    try {
      await api.deletePurchase(deleteModalOrder.id, deleteReason.trim());
      setMessage(`Purchase #${deleteModalOrder.invoice_number} voided successfully.`);
      setDeleteModalOrder(null);
      setDeleteReason("");
      context.refreshAll();
      loadPurchases();
    } catch (err) {
      setDeleteError(err.message || "Failed to void purchase");
    } finally {
      setIsDeleting(false);
    }
  }

  // Filtered & Paginated Purchases List
  const filteredPurchases = useMemo(() => {
    return purchasesList.filter((p) => {
      if (branchFilter && String(p.branch_id) !== String(branchFilter)) return false;
      if (statusFilter === "deleted" && !p.is_deleted) return false;
      if (statusFilter === "active" && p.is_deleted) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesInv = p.invoice_number && p.invoice_number.toLowerCase().includes(q);
        const matchesVendor = p.vendor_name && p.vendor_name.toLowerCase().includes(q);
        const matchesNotes = p.notes && p.notes.toLowerCase().includes(q);
        if (!matchesInv && !matchesVendor && !matchesNotes) return false;
      }
      return true;
    });
  }, [purchasesList, branchFilter, statusFilter, search]);

  const totalPages = Math.ceil(filteredPurchases.length / pageSize) || 1;
  const paginatedPurchases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, page, pageSize]);

  // KPI Metrics Calculation (Matching SalesPage pattern)
  const purchaseMetrics = useMemo(() => {
    let grossPurchases = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let activeOrdersCount = 0;

    filteredPurchases.forEach((p) => {
      if (!p.is_deleted) {
        const total = Number(p.total_amount || 0);
        const paid = Number(p.paid_amount || 0);
        const bal = Math.max(0, total - paid);
        grossPurchases += total;
        totalPaid += paid;
        totalBalance += bal;
        activeOrdersCount += 1;
      }
    });

    return {
      activeCount: activeOrdersCount,
      grossPurchases,
      totalPaid,
      totalBalance
    };
  }, [filteredPurchases]);

  return (
    <>
      {/* VIEW SELECTION TABS */}
      <div className="nav-tabs" style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem", marginBottom: "1rem" }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "new" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("new");
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
            border: activeTab === "new" ? "1px solid var(--primary)" : "1px solid var(--border)",
            background: activeTab === "new" ? "var(--primary)" : "var(--surface)",
            color: activeTab === "new" ? "#ffffff" : "var(--text)"
          }}
        >
          <span>📥</span> {t("purchases.create_purchase", "Create Purchase (Inward Counter)")}
        </button>
        {canView && (
          <button
            type="button"
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("history");
              setError("");
              loadPurchases();
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
            <span>📜</span> {t("purchases.history", "Purchases Directory & History")} ({purchasesList.length})
          </button>
        )}
      </div>

      {/* Global alert messages */}
      {error ? <div className="alert error full-span">{error}</div> : null}
      {message ? (
        <div
          className="alert success full-span"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}
        >
          <span>{message}</span>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {lastSavedPurchase && (
              <button
                type="button"
                className="secondary-btn btn-sm"
                onClick={() => handleOpenReceipt(lastSavedPurchase)}
                style={{ background: "#059669", color: "#ffffff", borderColor: "#047857", padding: "6px 12px", fontSize: "0.85rem", fontWeight: "700" }}
              >
                🧾 Print Voucher #{lastSavedPurchase.invoice_number}
              </button>
            )}
            {qrItems.length > 0 && (
              <button
                type="button"
                className="primary-btn btn-sm"
                onClick={() => setShowQRModal(true)}
                style={{ background: "#059669", borderColor: "#047857", padding: "6px 12px", fontSize: "0.85rem" }}
              >
                🏷️ {t("purchases.print_qr_tags", { count: qrItems.length })}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* 1. MODERN 2-COLUMN PURCHASE INWARD LAYOUT */}
      {activeTab === "new" && (
        <form onSubmit={handleSubmit} ref={formRef}>
          <div className="pos-layout">
            {/* LEFT COLUMN: SCANNER, INTAKE CONTROLS & LIVE PURCHASE CART */}
            <div className="pos-main-column">
              {/* Top Outlet / Branch Selector Bar */}
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
                  <strong style={{ fontSize: "0.9rem" }}>{t("purchases.destination_outlet", "Destination Outlet")}:</strong>
                  <select
                    ref={firstFieldRef}
                    value={form.branchId}
                    onChange={(event) => setForm({ ...form, branchId: event.target.value })}
                    required
                    style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", fontSize: "0.88rem" }}
                  >
                    <option value="">{isUrdu ? "برانچ منتخب کریں" : "Select Branch"}</option>
                    {(availableBranches || []).map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="muted small">
                    {isUrdu ? (
                      <>کیٹلاگ: <strong>{availableModels.length}</strong> فون ماڈلز • <strong>{availableProducts.length}</strong> سامان</>
                    ) : (
                      <>Catalog: <strong>{availableModels.length}</strong> Phone Models • <strong>{availableProducts.length}</strong> Products</>
                    )}
                  </span>
                </div>
              </div>

              {/* Explicit Mode Switcher Toggle */}
              <div className="pos-mode-toggle">
                <button
                  type="button"
                  className={`pos-mode-btn ${purchaseMode === "phone" ? "active" : ""}`}
                  onClick={() => {
                    setPurchaseMode("phone");
                    setTimeout(() => singleImeiInputRef.current?.focus(), 50);
                  }}
                >
                  <span>📱</span> {t("purchases.phone_inward", "Inward Cell Phones (Scan IMEI / Serialized)")}
                </button>
                <button
                  type="button"
                  className={`pos-mode-btn ${purchaseMode === "product" ? "active" : ""}`}
                  onClick={() => setPurchaseMode("product")}
                >
                  <span>📦</span> {t("purchases.product_inward", "Inward Simple Products (Accessories & Parts)")}
                </button>
              </div>

              {/* 1. CELL PHONE INWARD PANEL */}
              {purchaseMode === "phone" && (
                <div className="purchase-intake-card">
                  <div className="purchase-intake-header">
                    <strong style={{ fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span>📱</span> {t("purchases.step1_header", "Step 1: Select Model & Batch Purchase Cost")}
                    </strong>
                    <button
                      type="button"
                      className="secondary-btn btn-sm"
                      onClick={() => setShowQuickModelModal(true)}
                    >
                      ➕ {t("purchases.quick_add_model", "Quick Add New Model")}
                    </button>
                  </div>

                  <div className="form-grid" style={{ marginBottom: "0.85rem" }}>
                    <label>
                      {t("purchases.select_model", "Mobile Model")} *
                      <SearchableSelect
                        value={selectedPhoneModelId}
                        onChange={(e) => setSelectedPhoneModelId(e.target.value)}
                        placeholder={isUrdu ? "برانڈ یا ماڈل تلاش کریں..." : "Search brand/model (e.g. iPhone 15, S24)..."}
                      >
                        <option value="">{t("purchases.choose_model", "-- Select Mobile Model --")}</option>
                        {(availableModels || []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.company} {m.model_name} {m.variant ? `(${m.variant})` : ""} {m.storage ? `• ${m.storage}` : ""} {m.color ? `• ${m.color}` : ""}
                          </option>
                        ))}
                      </SearchableSelect>
                    </label>

                    <label>
                      {t("purchases.unit_cost", "Unit Cost Price (PKR)")} *
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={phoneUnitCost}
                        onChange={(e) => setPhoneUnitCost(e.target.value)}
                      />
                    </label>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {t("purchases.step2_header", "Step 2: Add Handset IMEIs")}
                      </strong>
                      <button
                        type="button"
                        className="ghost-btn btn-sm"
                        onClick={() => setShowBulkPaste(!showBulkPaste)}
                        style={{ color: "var(--primary)" }}
                      >
                        {showBulkPaste ? t("purchases.hide_bulk_paste", "Hide Bulk Paste") : `📋 ${t("purchases.paste_multiple_imeis", "Paste Multiple IMEIs")}`}
                      </button>
                    </div>

                    {!showBulkPaste ? (
                      <div className="pos-scanner-bar">
                        <div className="pos-scanner-input-wrap">
                          <span className="pos-scanner-icon">⚡</span>
                          <input
                            ref={singleImeiInputRef}
                            type="text"
                            className="pos-scanner-input"
                            placeholder={t("purchases.scan_imei_prompt", "Scan or type 15-digit IMEI and press Enter...")}
                            value={singleImeiInput}
                            onChange={(e) => setSingleImeiInput(e.target.value.replace(/\s+/g, ""))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddSingleImei();
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={handleAddSingleImei}
                          style={{ padding: "0.75rem 1.25rem", whiteSpace: "nowrap" }}
                        >
                          ➕ {t("purchases.add_imei_btn", "Add IMEI")}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <textarea
                          rows={3}
                          placeholder={t("purchases.bulk_paste_placeholder", "Paste multiple IMEIs from vendor delivery packing list (separated by newlines or commas)...")}
                          value={bulkImeiText}
                          onChange={(e) => setBulkImeiText(e.target.value)}
                          style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem", direction: "ltr" }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="muted small">
                            {t("purchases.bulk_tip", "Tip: Model and unit cost set above will be automatically applied to all pasted IMEIs.")}
                          </span>
                          <button
                            type="button"
                            className="primary-btn btn-sm"
                            onClick={handleAddBulkImeis}
                            disabled={!bulkImeiText.trim()}
                          >
                            ➕ {t("purchases.add_all_pasted", "Add All Pasted IMEIs")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. SIMPLE PRODUCT INTAKE PANEL */}
              {purchaseMode === "product" && (
                <div className="purchase-intake-card">
                  <div className="purchase-intake-header">
                    <strong style={{ fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span>📦</span> {t("purchases.product_inward_card", "Inward Simple Product / Accessory")}
                    </strong>
                    <button
                      type="button"
                      className="secondary-btn btn-sm"
                      onClick={() => setShowQuickProductModal(true)}
                    >
                      ➕ {t("purchases.quick_add_product", "Quick Add New Product")}
                    </button>
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                    <label style={{ gridColumn: "span 2" }}>
                      {t("purchases.select_product", "Select Product")} *
                      <SearchableSelect
                        value={selectedProductId}
                        onChange={(e) => {
                          const pId = e.target.value;
                          setSelectedProductId(pId);
                          if (pId) {
                            const prod = availableProducts.find((p) => String(p.id) === String(pId));
                            if (prod && prod.cost_price) {
                              setProductUnitCost(String(prod.cost_price));
                            }
                          }
                        }}
                        placeholder={isUrdu ? "پروڈکٹ تلاش کریں..." : "Search product / accessory..."}
                      >
                        <option value="">{t("purchases.choose_product", "-- Choose Product --")}</option>
                        {(availableProducts || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `(${p.sku})` : ""} - {isUrdu ? "اسٹاک" : "Stock"}: {p.stock_quantity ?? 0}
                          </option>
                        ))}
                      </SearchableSelect>
                    </label>

                    <label>
                      {t("purchases.product_qty", "Quantity")} *
                      <input
                        type="number"
                        min="1"
                        value={productQty}
                        onChange={(e) => setProductQty(e.target.value)}
                      />
                    </label>

                    <label>
                      {t("purchases.unit_cost", "Unit Cost (PKR)")} *
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={productUnitCost}
                        onChange={(e) => setProductUnitCost(e.target.value)}
                        placeholder="0"
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={handleAddProductItem}
                    >
                      ➕ {t("purchases.add_product_to_order", "Add Product to Order")}
                    </button>
                  </div>
                </div>
              )}

              {/* LIVE PURCHASE CART TABLE */}
              <div className="pos-cart-wrap" style={{ marginTop: "1rem" }}>
                <div className="pos-cart-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>📋</span>
                    <strong>{t("purchases.added_items_title", "Added Purchase Order Items")}</strong>
                    <span className="pos-item-badge product" style={{ marginInlineStart: "0.25rem" }}>
                      {purchaseCounts.total} {isUrdu ? "اشیاء" : "items"} ({purchaseCounts.phones} {isUrdu ? "فونز" : "phones"}, {purchaseCounts.accessories} {isUrdu ? "سامان" : "accessories"})
                    </span>
                  </div>
                  {form.items.length > 0 && (
                    <button
                      type="button"
                      className="ghost-btn btn-sm"
                      onClick={() => setForm((prev) => ({ ...prev, items: [] }))}
                      style={{ color: "var(--danger)" }}
                    >
                      🗑️ {t("purchases.clear_items", "Clear All Items")}
                    </button>
                  )}
                </div>

                {form.items.length === 0 ? (
                  <div className="pos-cart-empty">
                    <div className="pos-cart-empty-icon">📦</div>
                    <h4 style={{ margin: "0 0 0.35rem 0" }}>{t("purchases.empty_title", "Purchase order is empty")}</h4>
                    <p className="muted small" style={{ margin: 0 }}>
                      {t("purchases.empty_desc", "Select a phone model and scan/paste IMEIs, or choose simple products above to add items to this inward order.")}
                    </p>
                  </div>
                ) : (
                  <div className="table-wrap" style={{ margin: 0, border: "none", overflowX: "auto", width: "100%" }}>
                    <table style={{ minWidth: "640px", width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ minWidth: "200px", whiteSpace: "nowrap" }}>{t("sales.table_item", "Item & Identification")}</th>
                          <th style={{ width: "70px", minWidth: "70px", textAlign: "center", whiteSpace: "nowrap" }}>{t("sales.table_qty", "Qty")}</th>
                          <th style={{ width: "130px", minWidth: "130px", textAlign: isRtl ? "left" : "right", whiteSpace: "nowrap" }}>{t("purchases.unit_cost", "Unit Cost (PKR)")}</th>
                          <th style={{ width: "120px", minWidth: "120px", textAlign: isRtl ? "left" : "right", whiteSpace: "nowrap" }}>{t("sales.table_subtotal", "Subtotal")}</th>
                          <th style={{ width: "80px", minWidth: "80px", textAlign: "center", whiteSpace: "nowrap" }}>{t("sales.table_remove", "Remove")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((item, index) => {
                          const isPhone = item.itemType === "handset" || item.imei;
                          const qty = isPhone ? 1 : Number(item.quantity || 1);
                          const rate = Number(item.unitCost || 0);
                          const lineSubtotal = qty * rate;

                          return (
                            <tr key={`${item.imei || item.productId}-${index}`}>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <span className={`pos-item-badge ${isPhone ? "phone" : "product"}`}>
                                      {isPhone ? "📱 Handset" : "📦 Product"}
                                    </span>
                                    <strong>{item.modelTitle || item.productName || "Item"}</strong>
                                  </div>
                                  {isPhone ? (
                                    <span
                                      className="muted small"
                                      style={{
                                        fontFamily: "var(--font-mono, monospace)",
                                        fontSize: "0.78rem",
                                        letterSpacing: "0.5px"
                                      }}
                                    >
                                      IMEI: <strong>{item.imei}</strong>
                                    </span>
                                  ) : (
                                    <span className="muted small" style={{ fontSize: "0.75rem" }}>
                                      {item.categoryName || "Accessory"}
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
                                  <div className="pos-qty-stepper" style={{ display: "inline-flex" }}>
                                    <button
                                      type="button"
                                      className="pos-qty-btn"
                                      onClick={() => updatePurchaseItemQty(index, Math.max(1, qty - 1))}
                                    >
                                      -
                                    </button>
                                    <span className="pos-qty-num">{qty}</span>
                                    <button
                                      type="button"
                                      className="pos-qty-btn"
                                      onClick={() => updatePurchaseItemQty(index, qty + 1)}
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
                                  value={item.unitCost}
                                  onChange={(e) => updatePurchaseItemCost(index, e.target.value)}
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
                                  onClick={() => removePurchaseItem(index)}
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

            {/* RIGHT COLUMN: STICKY CHECKOUT & VENDOR SETTLEMENT SIDEBAR */}
            <div className="pos-checkout-sidebar">
              {/* Vendor Profile Card */}
              <div className="pos-checkout-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    👤 {t("purchases.vendor_profile_title", "Vendor Profile")}
                  </span>
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    onClick={() => setShowVendorDetails(!showVendorDetails)}
                    style={{ fontSize: "0.78rem" }}
                  >
                    {showVendorDetails ? t("sales.customer_hide", "Hide Details") : t("purchases.change_walkin", "Change / Walk-in")}
                  </button>
                </div>

                {!showVendorDetails ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0" }}>
                    <span style={{ fontSize: "1.3rem" }}>🏢</span>
                    <div>
                      <strong style={{ fontSize: "0.95rem", display: "block" }}>
                        {form.vendorId
                          ? vendorOptions.find((v) => String(v.id) === String(form.vendorId))?.name || "Selected Vendor"
                          : form.purchaserName || t("purchases.select_vendor", "Select vendor / walk in")}
                      </strong>
                      <span className="muted small">
                        {form.vendorId ? t("purchases.registered_supplier_tag", "Official Registered Supplier") : t("purchases.walk_in_tag", "Walk-in Supplier")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.35rem" }}>
                    <label>
                      {t("purchases.vendor_profile", "Vendor / Supplier")}
                      <SearchableSelect
                        value={form.vendorId}
                        onChange={handleVendorChange}
                        placeholder={t("purchases.select_vendor", "Search vendor / supplier...")}
                      >
                        <option value="">{t("purchases.select_vendor", "Select vendor / walk in")}</option>
                        {(vendorOptions || []).map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name} {vendor.phone ? `(${vendor.phone})` : ""}
                          </option>
                        ))}
                      </SearchableSelect>
                    </label>

                    {!form.vendorId && (
                      <>
                        <label>
                          <span>
                            {t("purchases.purchaser_name_label", "Purchaser Name")} <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                          </span>
                          <input
                            type="text"
                            value={form.purchaserName}
                            onChange={(event) => setForm({ ...form, purchaserName: event.target.value })}
                            placeholder="e.g. Muhammad Ali"
                            required
                          />
                          {purchaserNameError && (
                            <span className="field-error" style={{ color: "var(--danger, #ef4444)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                              {purchaserNameError}
                            </span>
                          )}
                        </label>

                        <label>
                          <span>
                            {t("purchases.purchaser_cnic_label", "Purchaser CNIC")} <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                          </span>
                          <input
                            type="text"
                            value={form.purchaserCnic}
                            onChange={(event) => setForm({ ...form, purchaserCnic: formatCnic(event.target.value) })}
                            placeholder="e.g. 42101-1234567-1"
                            required
                            style={{ direction: "ltr", unicodeBidi: "isolate" }}
                          />
                          {purchaserCnicError && (
                            <span className="field-error" style={{ color: "var(--danger, #ef4444)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                              {purchaserCnicError}
                            </span>
                          )}
                        </label>
                      </>
                    )}
                  </div>
                )}

                <label style={{ display: "block", marginTop: "0.6rem" }}>
                  <span className="muted small">{t("purchases.purchase_date", "Purchase Date")}</span>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })}
                    required
                    style={{ width: "100%", padding: "0.35rem 0.6rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
                  />
                </label>
              </div>

              {/* Financial Totals & Payment Card */}
              <div className="pos-checkout-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span className="muted">{t("sales.subtotal", "Subtotal")} ({purchaseCounts.total} items):</span>
                  <strong style={{ direction: "ltr", unicodeBidi: "isolate" }}>PKR {subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span className="muted">{t("sales.discount", "Discount")} (PKR):</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="any"
                    value={form.discountAmount === 0 ? "" : form.discountAmount}
                    onChange={(event) => setForm({ ...form, discountAmount: event.target.value })}
                    placeholder="0"
                    style={{ width: "95px", textAlign: "right", padding: "0.25rem 0.4rem", direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </div>
                {discountError && (
                  <span className="field-error" style={{ color: "var(--danger, #ef4444)", fontSize: "0.78rem", display: "block", marginBottom: "0.3rem" }}>
                    {discountError}
                  </span>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span className="muted">{t("sales.tax", "Tax")} (PKR):</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.taxAmount === 0 ? "" : form.taxAmount}
                    onChange={(event) => setForm({ ...form, taxAmount: event.target.value })}
                    placeholder="0"
                    style={{ width: "95px", textAlign: "right", padding: "0.25rem 0.4rem", direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </div>

                {/* Grand Total Banner */}
                <div className="pos-total-banner">
                  <div>
                    <span className="muted small" style={{ textTransform: "uppercase", fontWeight: "700" }}>{t("sales.total_payable", "Total Payable")}</span>
                    <div className="pos-total-amount" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                      PKR {netAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ textAlign: isRtl ? "left" : "right" }}>
                    <span className="pos-item-badge phone" style={{ fontSize: "0.78rem" }}>
                      {purchaseCounts.phones} {language === "ur" ? "موبائل فون" : "Phones"}
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
                    <button
                      type="button"
                      className={`pos-pill-btn ${form.paymentMethod === "cheque" ? "active" : ""}`}
                      onClick={() => setForm({ ...form, paymentMethod: "cheque" })}
                    >
                      📝 {t("sales.cheque", "Cheque")}
                    </button>
                  </div>
                </label>

                {/* Paid Amount */}
                <label style={{ display: "block", marginTop: "0.6rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: "600" }}>{t("purchases.amount_paid_to_vendor", "Amount Paid to Vendor (PKR)")}</span>
                    {netAmount > 0 && (
                      <button
                        type="button"
                        className="ghost-btn btn-sm"
                        onClick={() => setForm((prev) => ({ ...prev, paidAmount: netAmount }))}
                        style={{ padding: "0 4px", fontSize: "0.75rem", color: "var(--primary)" }}
                        title="Set paid amount equal to net amount"
                      >
                        {t("purchases.paid_in_full", "Paid in Full")}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={netAmount >= 0 ? netAmount : undefined}
                    step="any"
                    value={form.paidAmount === 0 ? "" : form.paidAmount}
                    onChange={(event) => setForm({ ...form, paidAmount: event.target.value })}
                    placeholder={`Exact: ${netAmount}`}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", fontSize: "1rem", fontWeight: "700", marginTop: "0.25rem", direction: "ltr", unicodeBidi: "isolate" }}
                  />
                  {paidError && (
                    <span className="field-error" style={{ color: "var(--danger, #ef4444)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                      {paidError}
                    </span>
                  )}
                </label>

                {/* Quick Cash Buttons */}
                <div className="pos-quick-cash-row">
                  <button
                    type="button"
                    className="pos-quick-cash-btn"
                    onClick={() => setForm((prev) => ({ ...prev, paidAmount: netAmount }))}
                  >
                    {t("purchases.exact_net", "Exact Net")}
                  </button>
                  <button
                    type="button"
                    className="pos-quick-cash-btn"
                    onClick={() => setForm((prev) => ({ ...prev, paidAmount: Number(prev.paidAmount || 0) + 1000 }))}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  >
                    +1,000
                  </button>
                  <button
                    type="button"
                    className="pos-quick-cash-btn"
                    onClick={() => setForm((prev) => ({ ...prev, paidAmount: Number(prev.paidAmount || 0) + 5000 }))}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  >
                    +5,000
                  </button>
                  <button
                    type="button"
                    className="pos-quick-cash-btn"
                    onClick={() => setForm((prev) => ({ ...prev, paidAmount: Number(prev.paidAmount || 0) + 10000 }))}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  >
                    +10,000
                  </button>
                </div>

                {/* Balance status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem" }}>
                  <span className="muted small">{t("sales.balance_due", "Balance Due:")}</span>
                  <strong style={{ color: balanceAmount > 0 ? "var(--danger, #ef4444)" : "var(--success, #10b981)", fontSize: "0.95rem", direction: "ltr", unicodeBidi: "isolate" }}>
                    PKR {balanceAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* Credit Due Date if balance remains */}
                {balanceAmount > 0 && (
                  <label style={{ display: "block", marginTop: "0.6rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--warning, #fbbf24)" }}>
                      {t("sales.credit_due_date", "Credit Due Date")} <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                    </span>
                    <input
                      type="date"
                      min={todayStr}
                      value={form.dueDate}
                      onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                      style={{ width: "100%", padding: "0.4rem 0.6rem", marginTop: "0.2rem" }}
                      required
                    />
                    {dueDateError && (
                      <span className="field-error" style={{ color: "var(--danger, #ef4444)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                        {dueDateError}
                      </span>
                    )}
                  </label>
                )}

                {/* Order Notes / Terms memo input */}
                <label style={{ display: "block", marginTop: "0.6rem" }}>
                  <span className="muted small">{t("purchases.order_notes_label", "Order Notes / Terms")}</span>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    placeholder="Vendor invoice #, warranty notes..."
                    style={{ width: "100%", padding: "0.35rem 0.6rem", fontSize: "0.82rem", marginTop: "0.2rem" }}
                  />
                </label>

                {/* Big Action Button */}
                <div style={{ marginTop: "1rem" }}>
                  <button
                    type="submit"
                    className="pos-pay-btn"
                    disabled={!canCreate || form.items.length === 0}
                  >
                    <span>💾</span>
                    <span>
                      {canCreate
                        ? t("purchases.save_vendor_purchase", "Save Vendor Purchase • PKR {amount}", { amount: netAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) })
                        : t("purchases.save_purchase_restricted", "Save Purchase (Restricted to Manager/Staff)")}
                    </span>
                  </button>
                </div>

                {/* Persistent Print Purchase Voucher Button on Entry Form */}
                {lastSavedPurchase && (
                  <div style={{ marginTop: "0.6rem" }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => handleOpenReceipt(lastSavedPurchase)}
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
                      <span>Print Purchase Voucher #{lastSavedPurchase.invoice_number}</span>
                    </button>
                  </div>
                )}

                {!canCreate && (
                  <div className="alert info" style={{ fontSize: "0.78rem", marginTop: "0.6rem" }}>
                    ℹ️ <strong>{language === "ur" ? "آپریشنل رول لازمی ہے:" : "Operational Role Required:"}</strong> {t("purchases.operational_role_alert", "Company Super Admins cannot perform purchase entry directly. Purchases must be performed by assigned Branch Managers or authorized inventory staff.")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 2. RECENT PURCHASES & INWARD STOCK HISTORY */}
      {activeTab === "history" && canView && (
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
                {t("purchases.total_orders", "Total Purchase Orders")}
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: "700", color: "var(--text)", marginTop: "0.25rem" }}>
                {purchaseMetrics.activeCount} <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: "normal" }}>{t("common.orders", "orders")}</span>
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
                {t("purchases.total_cost", "Total Procurement Cost")}
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: "700", color: "var(--primary)", marginTop: "0.25rem" }}>
                PKR {purchaseMetrics.grossPurchases.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
                {t("purchases.total_paid", "Total Paid to Vendors")}
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: "700", color: "#10b981", marginTop: "0.25rem" }}>
                PKR {purchaseMetrics.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>
                {t("purchases.outstanding_payables", "Outstanding Payables")}
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: "700", color: purchaseMetrics.totalBalance > 0 ? "#f59e0b" : "var(--muted)", marginTop: "0.25rem" }}>
                PKR {purchaseMetrics.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <SectionCard
            title="Recent Purchases & Inward Stock"
          subtitle="View procurement history, print handset QR tags, or edit/void purchases according to your granted permissions."
          action={
            <button
              type="button"
              className="secondary-btn btn-sm"
              onClick={loadPurchases}
              disabled={isLoadingPurchases}
            >
              🔄 Refresh
            </button>
          }
        >
          {/* Filters Bar */}
          <div className="form-grid" style={{ marginBottom: "1rem" }}>
            <label>
              Search Purchases
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="🔍 Search Invoice #, vendor, notes..."
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
              Status Filter
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Orders</option>
                <option value="active">Active Only</option>
                <option value="deleted">Voided / Deleted Only</option>
              </select>
            </label>
          </div>

          {/* Table */}
          <div className="table-wrap" style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ minWidth: "980px", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ minWidth: "110px", whiteSpace: "nowrap" }}>Invoice #</th>
                  <th style={{ minWidth: "95px", whiteSpace: "nowrap" }}>Date</th>
                  <th style={{ minWidth: "170px", whiteSpace: "nowrap" }}>Vendor / Purchaser</th>
                  <th style={{ minWidth: "110px", whiteSpace: "nowrap" }}>Branch</th>
                  <th style={{ minWidth: "125px", textAlign: "right", whiteSpace: "nowrap" }}>Subtotal / Disc</th>
                  <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Net Amount</th>
                  <th style={{ minWidth: "100px", textAlign: "right", whiteSpace: "nowrap" }}>Paid</th>
                  <th style={{ minWidth: "100px", textAlign: "right", whiteSpace: "nowrap" }}>Balance</th>
                  <th style={{ minWidth: "90px", textAlign: "center", whiteSpace: "nowrap" }}>Status</th>
                  <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "2rem" }}>
                      {isLoadingPurchases ? "Loading purchases..." : "No purchases found matching filter."}
                    </td>
                  </tr>
                ) : (
                  paginatedPurchases.map((purchase) => {
                    const subtotalAmount = Number(purchase.subtotal || 0);
                    const discount = Number(purchase.discount_amount || 0);
                    const total = Number(purchase.total_amount || 0);
                    const paid = Number(purchase.paid_amount || 0);
                    const balance = Math.max(0, total - paid);

                    return (
                      <tr key={purchase.id} style={{ opacity: purchase.is_deleted ? 0.6 : 1 }}>
                        <td>
                          <strong>{purchase.invoice_number}</strong>
                          {purchase.notes && (
                            <div className="muted small" style={{ fontSize: "0.75rem" }}>
                              {purchase.notes}
                            </div>
                          )}
                        </td>
                        <td>{String(purchase.purchase_date || "").slice(0, 10)}</td>
                        <td>
                          <div>{purchase.vendor_name || purchase.purchaser_name || "Walk-in Vendor"}</div>
                          {purchase.purchaser_cnic && (
                            <div className="muted small" style={{ fontSize: "0.75rem" }}>
                              CNIC: {purchase.purchaser_cnic}
                            </div>
                          )}
                        </td>
                        <td>{purchase.branch_name}</td>
                        <td style={{ textAlign: "right" }}>
                          <div>PKR {subtotalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                          {discount > 0 && (
                            <span style={{ color: "#10b981", fontSize: "0.75rem", display: "block" }}>
                              Disc: -PKR {discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "600" }}>
                          PKR {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "right", color: "#10b981" }}>
                          PKR {paid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "right", color: balance > 0 ? "#ef4444" : "var(--muted)" }}>
                          PKR {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          {purchase.due_date && balance > 0 && (
                            <div style={{ fontSize: "0.72rem", color: "#f59e0b" }}>
                              Due: {String(purchase.due_date).slice(0, 10)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {purchase.is_deleted ? (
                            <span className="status-pill status-danger">Voided</span>
                          ) : balance <= 0 ? (
                            <span className="status-pill status-success">Paid</span>
                          ) : (
                            <span className="status-pill status-warning">Credit</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                          <div className="table-actions-vertical">
                            {/* Receipt Button */}
                            <TableActionButton
                              variant="receipt"
                              icon="🧾"
                              label="Receipt"
                              onClick={() => handleOpenReceipt(purchase)}
                              title="Print purchase receipt / voucher (80mm thermal & A4)"
                            />

                            {/* Edit Button - Guarded by canEdit */}
                            {!purchase.is_deleted && canEdit ? (
                              <TableActionButton
                                variant="edit"
                                icon="✏️"
                                label="Edit"
                                onClick={() => handleOpenEditModal(purchase)}
                                title="Edit purchase details and items"
                              />
                            ) : !purchase.is_deleted ? (
                              <TableActionButton
                                variant="edit"
                                icon="🔒"
                                label="Edit"
                                disabled
                                title="Edit permission required for your role"
                              />
                            ) : null}

                            {/* Return to Vendor Button */}
                            {!purchase.is_deleted && (
                              <TableActionButton
                                variant="return"
                                icon="↪️"
                                label="Return"
                                onClick={async () => {
                                  const full = await api.getPurchase(purchase.id);
                                  setReturnPurchaseOrder(full);
                                }}
                                title="Create vendor return (RMA)"
                              />
                            )}

                            {/* Delete / Void Button - Guarded by canDelete */}
                            {!purchase.is_deleted && canDelete ? (
                              <TableActionButton
                                variant="delete"
                                icon="🗑️"
                                label="Void"
                                onClick={() => handleOpenDeleteModal(purchase)}
                                title="Void purchase and adjust inventory"
                              />
                            ) : !purchase.is_deleted ? (
                              <TableActionButton
                                variant="delete"
                                icon="🔒"
                                label="Void"
                                disabled
                                title="Delete/Void permission required for your role"
                              />
                            ) : null}
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
            page={page}
            pageSize={pageSize}
            total={filteredPurchases.length}
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

      {/* EDIT PURCHASE MODAL */}
      {editModalOrder && editForm && (
        <div className="modal-backdrop" onClick={() => !isSavingEdit && setEditModalOrder(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "860px" }}>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-header">
                <h3>✏️ Edit Purchase #{editModalOrder.invoice_number}</h3>
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

                {/* 1. VENDOR / PURCHASER HEADER */}
                <div className="form-grid" style={{ marginBottom: "1rem" }}>
                  <label>
                    Purchase Date
                    <input
                      type="date"
                      value={editForm.purchaseDate}
                      onChange={(e) => setEditForm({ ...editForm, purchaseDate: e.target.value })}
                      required
                    />
                  </label>

                  <label className={!editForm.vendorId ? "" : "full-span"}>
                    Vendor / Supplier
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

                {/* 2 & 3. PRODUCTS SCANNER / TABLE */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <LineItemScanner
                    models={availableModels}
                    products={availableProducts}
                    mode="purchase"
                    items={editForm.items}
                    onChange={(items) => setEditForm({ ...editForm, items })}
                  />
                </div>

                {/* 4. PAYMENT SUMMARY BLOCK */}
                <div className="payment-summary-block" style={{
                  background: "var(--card-subtle-bg, var(--surface-strong))",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  marginBottom: "1.25rem"
                }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "600" }}>
                    💳 Payment Summary
                  </h4>
                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    {/* Subtotal */}
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

                    {/* Discount Amount */}
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

                    {/* Tax Amount */}
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

                    {/* Net Amount */}
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

                    {/* Paid Amount */}
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

                    {/* Balance Amount */}
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

                    {/* Payment Method */}
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

                    {/* Due Date */}
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

                <label>
                  Notes
                  <textarea
                    rows="2"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
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
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOID / DELETE CONFIRMATION MODAL */}
      {deleteModalOrder && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeleteModalOrder(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <form onSubmit={handleConfirmDelete}>
              <div className="modal-header">
                <h3 style={{ color: "var(--danger, #ef4444)" }}>
                  ⚠️ Void Purchase #{deleteModalOrder.invoice_number}
                </h3>
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
                {deleteError ? <div className="alert error" style={{ marginBottom: "1rem" }}>{deleteError}</div> : null}
                <p>
                  Are you sure you want to void purchase <strong>#{deleteModalOrder.invoice_number}</strong>?
                </p>
                <p className="muted small">
                  This will remove received handsets and accessories from store inventory, reverse supplier balances, and log the action in the security audit trail.
                </p>
                <label>
                  Audit Reason (Mandatory)
                  <textarea
                    rows="2"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="e.g. Returned to supplier, duplicate entry, incorrect IMEI..."
                    required
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
                  style={{ background: "var(--danger, #ef4444)", borderColor: "#dc2626" }}
                  disabled={isDeleting || !deleteReason.trim()}
                >
                  {isDeleting ? "Voiding..." : "Confirm Void Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHONE QR TAG MODAL */}
      <PhoneQRTagModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        items={qrItems}
        companyName={shopName}
      />

      {/* QUICK ADD SIMPLE PRODUCT MODAL */}
      <QuickAddProductModal
        isOpen={showQuickProductModal}
        onClose={() => setShowQuickProductModal(false)}
        onCreated={(newProd) => {
          setSelectedProductId(String(newProd.id));
          setProductUnitCost(String(newProd.cost_price || ""));
          setProductsList((prev) => [...prev, newProd]);
          if (context.setProducts) {
            context.setProducts([...(context.products || []), newProd]);
          }
        }}
        branchId={form.branchId}
      />

      {/* QUICK ADD PHONE MODEL MODAL */}
      <QuickAddModelModal
        isOpen={showQuickModelModal}
        onClose={() => setShowQuickModelModal(false)}
        onCreated={(newModel) => {
          setSelectedPhoneModelId(String(newModel.id));
          setModelsList((prev) => [...prev, newModel]);
          if (context.setModels) {
            context.setModels([...(context.models || []), newModel]);
          }
        }}
      />

      {/* PURCHASE RECEIPT / VOUCHER MODAL */}
      <ReceiptModal
        isOpen={Boolean(receiptPurchase)}
        onClose={() => setReceiptPurchase(null)}
        type="purchase"
        data={receiptPurchase}
        shopName={shopName}
        companyLogo={companyLogo}
      />

      {/* VENDOR RETURN (RMA) MODAL */}
      <ReturnOrderModal
        isOpen={Boolean(returnPurchaseOrder)}
        onClose={() => setReturnPurchaseOrder(null)}
        defaultType="vendor_return"
        referenceOrder={returnPurchaseOrder}
        onReturnCreated={() => {
          loadPurchases();
          context?.refreshAll?.();
        }}
      />
    </>
  );
}
