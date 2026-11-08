import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { SectionCard } from "../components/SectionCard.jsx";
import { PhoneQRTagModal } from "../components/PhoneQRTagModal.jsx";
import { exportToCSV } from "../utils/export.js";
import { smoothScrollTo } from "../utils/scroll.js";
import { AdaptiveTable } from "../components/AdaptiveTable.jsx";
import { SearchableSelect } from "../components/SearchableSelect.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export function InventoryPage({ context }) {
  const { t, isRtl, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("imei"); // "imei" | "products" | "transfers" | "returns"

  // IMEI state & pagination
  const [filters, setFilters] = useState({ branchId: "", status: "in_stock", search: "" });
  const [units, setUnits] = useState([]);
  const [trace, setTrace] = useState(null);
  const [imeiPage, setImeiPage] = useState(1);
  const [imeiPageSize, setImeiPageSize] = useState(15);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrItems, setQrItems] = useState([]);

  const shopName = context?.session?.business_name || "DigitalMarkaz360";

  // Products state & pagination
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productBranchId, setProductBranchId] = useState(context.session.branch_id || context.session.branchId || "");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(15);

  const availableProducts = useMemo(() => {
    if (products && products.length > 0) return products;
    if (context.products && context.products.length > 0) return context.products;
    return [];
  }, [products, context.products]);

  const [productForm, setProductForm] = useState({
    name: "",
    categoryId: "",
    itemType: "accessory",
    hasImei: false,
    costPrice: "",
    salePrice: "",
    alertQuantity: "5",
    initialStock: "0",
    openingStockQuantity: "",
    openingCostPrice: "",
    branchId: context.session.branch_id || context.session.branchId || ""
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProductForm, setEditProductForm] = useState({});
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [adjustModal, setAdjustModal] = useState(null);

  // Permissions
  const canCreate = context.can ? context.can("inventory", "create") : true;
  const canEdit = context.can ? context.can("inventory", "edit") : true;
  const canDelete = context.can ? context.can("inventory", "delete") : true;
  const canView = context.can ? context.can("inventory", "view") : true;

  // Transfers state & pagination
  const [transfers, setTransfers] = useState([]);
  const [transferFilterStatus, setTransferFilterStatus] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const [transferPage, setTransferPage] = useState(1);
  const [transferPageSize, setTransferPageSize] = useState(10);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [transferForm, setTransferForm] = useState({
    fromBranchId: context.session.branch_id || context.session.branchId || "",
    toBranchId: "",
    notes: "",
    items: [{ itemType: "handset", imei: "", productId: "", quantity: 1 }]
  });

  // Returns state & pagination
  const [returnsList, setReturnsList] = useState([]);
  const [returnTypeFilter, setReturnTypeFilter] = useState("");
  const [returnSearch, setReturnSearch] = useState("");
  const [returnPage, setReturnPage] = useState(1);
  const [returnPageSize, setReturnPageSize] = useState(10);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnForm, setReturnForm] = useState({
    branchId: context.session.branch_id || context.session.branchId || "",
    returnType: "customer_return",
    referenceId: "",
    returnDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash",
    reason: "",
    notes: "",
    items: [{ itemType: "handset", imei: "", productId: "", quantity: 1, refundRate: "", itemCondition: "good" }]
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (activeTab === "imei") {
      loadUnits();
    } else if (activeTab === "products") {
      loadCatalog();
    } else if (activeTab === "transfers") {
      loadTransfers();
      loadCatalog();
    } else if (activeTab === "returns") {
      loadReturns();
      loadCatalog();
    }
  }, [activeTab, productBranchId, selectedCategoryFilter, transferFilterStatus, returnTypeFilter]);

  async function loadUnits() {
    setError("");
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== "" && value !== null)
      ).toString();
      setUnits(await api.inventory(query ? `?${query}` : ""));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function loadCatalog() {
    setError("");
    try {
      const cats = await api.categories();
      setCategories(cats);

      const params = new URLSearchParams();
      if (productBranchId) params.append("branchId", productBranchId);
      if (selectedCategoryFilter) params.append("categoryId", selectedCategoryFilter);
      if (productSearch) params.append("search", productSearch);

      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const prods = await api.products(queryStr);
      setProducts(prods);
      if (context.setProducts) {
        context.setProducts(prods);
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function loadTransfers() {
    setError("");
    try {
      const queryStr = transferFilterStatus ? `?status=${transferFilterStatus}` : "";
      setTransfers(await api.transfers(queryStr));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function loadReturns() {
    setError("");
    try {
      const queryStr = returnTypeFilter ? `?returnType=${returnTypeFilter}` : "";
      setReturnsList(await api.returns(queryStr));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function lookupImei(imei) {
    try {
      setTrace(await api.imeiLookup(imei));
      smoothScrollTo("imei-traceability-card", { offset: 85, delay: 60 });
    } catch (lookupError) {
      setError(lookupError.message);
    }
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    if (!canCreate) {
      setError("Permission denied: You do not have permission to create products.");
      return;
    }
    setError("");
    setMessage("");
    try {
      const openQty = Number(productForm.openingStockQuantity || productForm.initialStock || 0);
      const openCost = Number(productForm.openingCostPrice || productForm.costPrice || 0);

      await api.createProduct({
        ...productForm,
        categoryId: productForm.categoryId ? Number(productForm.categoryId) : null,
        costPrice: Number(productForm.costPrice || 0),
        salePrice: Number(productForm.salePrice || 0),
        alertQuantity: Number(productForm.alertQuantity || 5),
        initialStock: openQty,
        openingStockQuantity: openQty,
        openingCostPrice: openCost,
        branchId: productForm.branchId ? Number(productForm.branchId) : null
      });
      setMessage(`Product "${productForm.name}" created with opening stock successfully`);
      setProductForm({
        name: "",
        categoryId: categories[0]?.id || "",
        itemType: "accessory",
        hasImei: false,
        costPrice: "",
        salePrice: "",
        alertQuantity: "5",
        initialStock: "0",
        openingStockQuantity: "",
        openingCostPrice: "",
        branchId: context.session.branch_id || context.session.branchId || ""
      });
      loadCatalog();
      context?.refreshAll?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEditProductSubmit(e) {
    e.preventDefault();
    if (!canEdit) {
      setError("Permission denied: You do not have permission to update products.");
      return;
    }
    if (!editingProduct) return;
    setError("");
    setMessage("");
    try {
      await api.updateProduct(editingProduct.id, {
        name: editProductForm.name,
        categoryId: editProductForm.categoryId ? Number(editProductForm.categoryId) : null,
        costPrice: Number(editProductForm.costPrice || 0),
        salePrice: Number(editProductForm.salePrice || 0),
        alertQuantity: Number(editProductForm.alertQuantity || 5),
        openingStockQuantity: Number(editProductForm.openingStockQuantity || 0),
        openingCostPrice: Number(editProductForm.openingCostPrice || 0)
      });
      setMessage(`Product "${editProductForm.name}" updated successfully`);
      setEditingProduct(null);
      loadCatalog();
      context?.refreshAll?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteProduct(product) {
    if (!canDelete) {
      setError("Permission denied: You do not have permission to delete products.");
      return;
    }
    if (!product) return;
    const confirmed = window.confirm(`Are you sure you want to delete product "${product.name}"?`);
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await api.deleteProduct(product.id);
      setMessage(`Product "${product.name}" deleted successfully.`);
      loadCatalog();
      context?.refreshAll?.();
    } catch (err) {
      setError(err.message || "Failed to delete product.");
    }
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    if (!canCreate) {
      setError("Permission denied: You do not have permission to create categories.");
      return;
    }
    if (!categoryName.trim()) return;
    setError("");
    setMessage("");
    try {
      await api.createCategory({ name: categoryName.trim() });
      setMessage(`Category '${categoryName}' added`);
      setCategoryName("");
      loadCatalog();
      context?.refreshAll?.();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleStartEditCategory(cat) {
    setEditingCategory(cat);
    setEditCategoryName(cat.name || "");
  }

  async function handleSaveEditCategory(e) {
    e.preventDefault();
    if (!canEdit) {
      setError("Permission denied: You do not have permission to update categories.");
      return;
    }
    if (!editingCategory || !editCategoryName.trim()) return;
    setError("");
    setMessage("");
    try {
      await api.updateCategory(editingCategory.id, { name: editCategoryName.trim() });
      setMessage(`Category updated to "${editCategoryName.trim()}" successfully.`);
      setEditingCategory(null);
      setEditCategoryName("");
      loadCatalog();
      context?.refreshAll?.();
    } catch (err) {
      setError(err.message || "Failed to update category.");
    }
  }

  async function handleDeleteCategory(cat) {
    if (!canDelete) {
      setError("Permission denied: You do not have permission to delete categories.");
      return;
    }
    if (!cat) return;
    const confirmed = window.confirm(`Are you sure you want to delete category "${cat.name}"?`);
    if (!confirmed) return;
    setError("");
    setMessage("");
    try {
      await api.deleteCategory(cat.id);
      setMessage(`Category "${cat.name}" deleted successfully.`);
      if (editingCategory?.id === cat.id) {
        setEditingCategory(null);
        setEditCategoryName("");
      }
      loadCatalog();
      context?.refreshAll?.();
    } catch (err) {
      setError(err.message || "Failed to delete category.");
    }
  }

  async function handleStockAdjust(e) {
    e.preventDefault();
    if (!canEdit) {
      setError("Permission denied: You do not have permission to adjust product stock.");
      return;
    }
    if (!adjustModal) return;
    setError("");
    setMessage("");
    try {
      await api.adjustProductStock({
        branchId: Number(adjustModal.branchId),
        productId: adjustModal.product.id,
        adjustmentType: adjustModal.adjustmentType,
        quantity: Number(adjustModal.quantity)
      });
      setMessage(`Stock adjusted for ${adjustModal.product.name}`);
      setAdjustModal(null);
      loadCatalog();
      context?.refreshAll?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateTransfer(e) {
    e.preventDefault();
    if (!canCreate) {
      setError("Permission denied: You do not have permission to dispatch transfers.");
      return;
    }
    setError("");
    setMessage("");
    try {
      const items = transferForm.items
        .filter((item) => (item.itemType === "handset" ? item.imei : item.productId))
        .map((item) => {
          if (item.itemType === "handset") {
            return { imei: item.imei.trim() };
          }
          return { productId: Number(item.productId), quantity: Number(item.quantity || 1) };
        });

      if (!items.length) {
        setError("Add at least one handset or accessory to transfer");
        return;
      }

      const res = await api.createTransfer({
        fromBranchId: Number(transferForm.fromBranchId),
        toBranchId: Number(transferForm.toBranchId),
        notes: transferForm.notes,
        items
      });
      setMessage(`Transfer ${res.transfer_number} dispatched successfully`);
      setTransferForm({
        fromBranchId: context.session.branch_id || context.session.branchId || "",
        toBranchId: "",
        notes: "",
        items: [{ itemType: "handset", imei: "", productId: "", quantity: 1 }]
      });
      loadTransfers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReceiveTransfer(id) {
    if (!canEdit) {
      setError("Permission denied: You do not have permission to receive transfers.");
      return;
    }
    if (!window.confirm("Confirm receiving all items in this transfer?")) return;
    setError("");
    setMessage("");
    try {
      const res = await api.receiveTransfer(id);
      setMessage(`Transfer ${res.transfer_number} marked completed!`);
      loadTransfers();
      if (selectedTransfer?.id === id) {
        setSelectedTransfer(await api.transfer(id));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancelTransfer(id) {
    if (!canDelete) {
      setError("Permission denied: You do not have permission to cancel transfers.");
      return;
    }
    if (!window.confirm("Cancel this transfer and restore stock to source branch?")) return;
    setError("");
    setMessage("");
    try {
      const res = await api.cancelTransfer(id);
      setMessage(`Transfer ${res.transfer_number} cancelled and stock reverted.`);
      loadTransfers();
      if (selectedTransfer?.id === id) {
        setSelectedTransfer(await api.transfer(id));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateReturn(e) {
    e.preventDefault();
    if (!canCreate) {
      setError("Permission denied: You do not have permission to process returns.");
      return;
    }
    setError("");
    setMessage("");
    try {
      const items = returnForm.items
        .filter((item) => (item.itemType === "handset" ? item.imei : item.productId))
        .map((item) => {
          if (item.itemType === "handset") {
            return {
              imei: item.imei.trim(),
              refundRate: Number(item.refundRate || 0),
              itemCondition: item.itemCondition || "good"
            };
          }
          return {
            productId: Number(item.productId),
            quantity: Number(item.quantity || 1),
            refundRate: Number(item.refundRate || 0),
            itemCondition: item.itemCondition || "good"
          };
        });

      if (!items.length) {
        setError("Add at least one item to return");
        return;
      }

      const res = await api.createReturn({
        branchId: Number(returnForm.branchId),
        returnType: returnForm.returnType,
        referenceId: Number(returnForm.referenceId),
        returnDate: returnForm.returnDate,
        paymentMethod: returnForm.paymentMethod,
        reason: returnForm.reason,
        notes: returnForm.notes,
        items
      });
      setMessage(`Return ${res.return_number} processed successfully`);
      setReturnForm({
        branchId: context.session.branch_id || context.session.branchId || "",
        returnType: "customer_return",
        referenceId: "",
        returnDate: new Date().toISOString().slice(0, 10),
        paymentMethod: "cash",
        reason: "",
        notes: "",
        items: [{ itemType: "handset", imei: "", productId: "", quantity: 1, refundRate: "", itemCondition: "good" }]
      });
      loadReturns();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-stack">
      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid var(--border)", paddingBottom: "0.5rem", flexWrap: "wrap" }}>
        <button
          className={activeTab === "imei" ? "primary-btn" : "ghost-btn"}
          onClick={() => setActiveTab("imei")}
        >
          📱 {t("inventory.tab_imei", "Handsets & Serialized IMEIs")}
        </button>
        <button
          className={activeTab === "products" ? "primary-btn" : "ghost-btn"}
          onClick={() => setActiveTab("products")}
        >
          📦 {t("inventory.tab_products", "Accessories & Products Catalog")}
        </button>
        <button
          className={activeTab === "transfers" ? "primary-btn" : "ghost-btn"}
          onClick={() => setActiveTab("transfers")}
        >
          🔄 {t("inventory.tab_transfers", "Inter-Branch Stock Transfers")}
        </button>
        <button
          className={activeTab === "returns" ? "primary-btn" : "ghost-btn"}
          onClick={() => setActiveTab("returns")}
        >
          ↩️ {t("inventory.tab_returns", "Returns & RMAs")}
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      {/* --- TAB 1: IMEI --- */}
      {activeTab === "imei" && (
        <>
          <SectionCard
            title={t("inventory.filter_units", "Filter Serialized Units")}
            subtitle={t("inventory.filter_units_subtitle", "Search handsets by IMEI, branch, and status.")}
          >
            <div className="form-grid">
              <label>
                {t("common.branch", "Branch")}
                <select
                  value={filters.branchId}
                  onChange={(event) => setFilters({ ...filters, branchId: event.target.value })}
                >
                  <option value="">{t("inventory.all_branches", "All accessible branches")}</option>
                  {context.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("inventory.status", "Status")}
                <select
                  value={filters.status}
                  onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                >
                  <option value="">All statuses</option>
                  <option value="in_stock">In Stock</option>
                  <option value="in_transit">In Transit (Transfer)</option>
                  <option value="sold">Sold</option>
                  <option value="returned">Returned</option>
                  <option value="returned_to_vendor">Returned to Vendor</option>
                </select>
              </label>
              <label>
                Search IMEI
                <input
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  placeholder="Paste or type IMEI"
                />
              </label>
              <div className="full-span row-actions">
                <button className="primary-btn" type="button" onClick={loadUnits}>
                  Filter
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Inventory In Hand"
            subtitle="Current serialized units matching filter."
            action={
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="primary-btn btn-sm"
                  onClick={() => {
                    const tags = units.slice(0, 50).map((u) => ({
                      imei: u.imei,
                      modelName: u.company ? `${u.company} ${u.model_name}` : (u.model_name || "Handset"),
                      unitCost: u.cost_price,
                      sellingPrice: u.selling_price
                    }));
                    setQrItems(tags);
                    setShowQRModal(true);
                  }}
                >
                  🏷️ Print QR Tags ({Math.min(units.length, 50)})
                </button>
                <button
                  type="button"
                  className="ghost-btn btn-sm"
                  onClick={() => exportToCSV("IMEI_Inventory", units)}
                >
                  📥 Export CSV
                </button>
              </div>
            }
          >
            {(() => {
              const totalPages = Math.max(1, Math.ceil(units.length / imeiPageSize));
              const currentPage = Math.min(imeiPage, totalPages);
              const start = (currentPage - 1) * imeiPageSize;
              const paginatedUnits = units.slice(start, start + imeiPageSize);

              return (
                <>
                  <AdaptiveTable
                    columns={[
                      {
                        key: "imei",
                        label: "IMEI",
                        priority: 1,
                        truncate: true,
                        tooltip: (unit) => unit.imei,
                        render: (_, unit) => <strong>{unit.imei}</strong>
                      },
                      {
                        key: "model_name",
                        label: "Model",
                        priority: 1,
                        truncate: true,
                        tooltip: (unit) => `${unit.company || ""} ${unit.model_name || ""}`.trim(),
                        render: (_, unit) => `${unit.company || ""} ${unit.model_name || ""}`.trim()
                      },
                      {
                        key: "branch_name",
                        label: "Branch",
                        priority: 3,
                        truncate: true,
                        render: (val) => val || "—"
                      },
                      {
                        key: "current_status",
                        label: "Status",
                        priority: 2,
                        width: "1%",
                        render: (val) => (
                          <span className={`status-pill ${val || ""}`}>
                            {val}
                          </span>
                        )
                      },
                      {
                        key: "cost_price",
                        label: "Cost Price",
                        priority: 3,
                        align: "right",
                        render: (val) => `PKR ${Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                      },
                      {
                        key: "sale_price",
                        label: "Sale Price",
                        priority: 2,
                        align: "right",
                        render: (val) => `PKR ${Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                      }
                    ]}
                    data={paginatedUnits}
                    keyField="id"
                    emptyMessage="No units found matching filter."
                    actions={(unit) => (
                      <button className="ghost-btn btn-sm" onClick={() => lookupImei(unit.imei)}>
                        Trace
                      </button>
                    )}
                    actionsHeader="Action"
                  />

                  <PaginationBar
                    page={currentPage}
                    pageSize={imeiPageSize}
                    total={units.length}
                    totalPages={totalPages}
                    onPageChange={(p) => setImeiPage(p)}
                    onPageSizeChange={(s) => {
                      setImeiPageSize(s);
                      setImeiPage(1);
                    }}
                  />
                </>
              );
            })()}
          </SectionCard>

          <div id="imei-traceability-card" style={{ scrollMarginTop: "90px" }}>
            <SectionCard title="IMEI Traceability" subtitle="Lifecycle history and audit trace.">
            {trace ? (
              <div className="two-column">
                <div>
                  <h4>Unit Details</h4>
                  <p><strong>Model:</strong> {trace.company} {trace.model_name}</p>
                  <p><strong>Current Branch:</strong> {trace.branch_name}</p>
                  <p><strong>Current Status:</strong> {trace.current_status}</p>
                  <p><strong>Cost Price:</strong> PKR {Number(trace.cost_price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  <p><strong>Sale Price:</strong> PKR {Number(trace.sale_price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <h4>Audit Events</h4>
                  <ul className="timeline">
                    {trace.timeline?.map((event, index) => (
                      <li key={index}>
                        <strong>{event.movement_type || event.action}</strong>
                        <p className="muted">{event.created_at || event.timestamp}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="muted">Click "Trace" next to any handset or enter an IMEI above to inspect its full lifecycle history.</p>
            )}
          </SectionCard>
        </div>
      </>
      )}

      {/* --- TAB 2: PRODUCTS CATALOG --- */}
      {activeTab === "products" && (
        <div className="page-stack">
          <div className="two-column">
            <SectionCard
              title={t("inventory.add_product", "Add Product / Accessory")}
              subtitle={t("inventory.add_product_subtitle", "Non-serialized item sold by quantity.")}
            >
              <form className="form-grid" onSubmit={handleCreateProduct}>
                <label>
                  {t("inventory.product_name", "Product Name")}
                  <input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  {t("inventory.category", "Category")}
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  >
                    <option value="">{t("inventory.select_category", "Select Category")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("inventory.type", "Type")}
                  <select
                    value={productForm.itemType}
                    onChange={(e) => setProductForm({ ...productForm, itemType: e.target.value })}
                  >
                    <option value="accessory">{t("modals.accessory", "Accessory")}</option>
                    <option value="part">{t("modals.repair_part", "Spare Part")}</option>
                    <option value="service">{t("modals.service", "Service (e.g. Screen Replacement)")}</option>
                  </select>
                </label>
                <label>
                  {t("inventory.cost_price", "Cost Price (PKR)")}
                  <input
                    type="number"
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </label>
                <label>
                  {t("inventory.sale_price", "Sale / Retail Price (PKR)")}
                  <input
                    type="number"
                    value={productForm.salePrice}
                    onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </label>
                <label>
                  {t("inventory.low_stock_alert", "Low Stock Alert Qty")}
                  <input
                    type="number"
                    value={productForm.alertQuantity}
                    onChange={(e) => setProductForm({ ...productForm, alertQuantity: e.target.value })}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </label>
                <label>
                  {t("inventory.opening_stock_qty", "Opening Stock Quantity")}
                  <input
                    type="number"
                    min="0"
                    placeholder="0 units"
                    value={productForm.openingStockQuantity}
                    onChange={(e) => setProductForm({ ...productForm, openingStockQuantity: e.target.value })}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </label>
                <label>
                  {t("inventory.opening_cost_price", "Opening Cost Price (PKR)")}
                  <input
                    type="number"
                    min="0"
                    placeholder="Defaults to Cost Price"
                    value={productForm.openingCostPrice}
                    onChange={(e) => setProductForm({ ...productForm, openingCostPrice: e.target.value })}
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  />
                </label>
                <label>
                  {t("inventory.branch_opening_stock", "Branch for Opening Stock")}
                  <select
                    value={productForm.branchId}
                    onChange={(e) => setProductForm({ ...productForm, branchId: e.target.value })}
                  >
                    <option value="">{t("common.select_branch", "Select Branch")}</option>
                    {(context.branches || []).map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
                {!canCreate && (
                  <div className="alert info full-span" style={{ fontSize: "0.85rem" }}>
                    ℹ️ <strong>{language === "ur" ? "اختیار محدود ہے:" : "Creation Restricted:"}</strong> {language === "ur" ? "آپ کے پاس نیا پروڈکٹ یا اسٹاک شامل کرنے کے اختیارات نہیں ہیں۔" : "Your account does not have permission to add new products or inventory."}
                  </div>
                )}
                <div className="full-span row-actions">
                  <button className="primary-btn" type="submit" disabled={!canCreate}>
                    {canCreate ? `➕ ${t("inventory.create_product_btn", "Create Product")}` : `🔒 ${t("inventory.create_product_restricted", "Create Product (Restricted)")}`}
                  </button>
                </div>
              </form>
            </SectionCard>

            <SectionCard
              title={t("inventory.product_categories_title", "Product Categories")}
              subtitle={t("inventory.product_categories_subtitle", "Add, edit, or delete categories to organize accessories and parts.")}
            >
              <form className="form-grid" onSubmit={editingCategory ? handleSaveEditCategory : handleCreateCategory}>
                <label className="full-span">
                  {editingCategory ? `${t("common.edit", "Edit Category Name")} (${editingCategory.name})` : t("inventory.category_name", "Category Name")}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                    <input
                      value={editingCategory ? editCategoryName : categoryName}
                      onChange={(e) => editingCategory ? setEditCategoryName(e.target.value) : setCategoryName(e.target.value)}
                      placeholder={editingCategory ? "Enter updated category name..." : "e.g. Cables, Adapters, Batteries"}
                      required
                    />
                    <button
                      className="primary-btn"
                      type="submit"
                      disabled={editingCategory ? !canEdit : !canCreate}
                      title={editingCategory ? (!canEdit ? "Permission denied: Cannot edit category" : "") : (!canCreate ? "Permission denied: Cannot create category" : "")}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {editingCategory ? `💾 ${t("common.update", "Update")}` : `➕ ${t("common.save", "Save")}`}
                    </button>
                    {editingCategory && (
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          setEditingCategory(null);
                          setEditCategoryName("");
                        }}
                      >
                        {t("common.cancel", "Cancel")}
                      </button>
                    )}
                  </div>
                </label>
              </form>

              {/* Saved Product Categories Table in the Same Panel */}
              <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.88rem", color: "var(--text)" }}>
                    📂 Saved Categories ({categories.length})
                  </h4>
                </div>

                {categories.length === 0 ? (
                  <div className="muted small" style={{ fontStyle: "italic", padding: "0.5rem 0" }}>
                    No categories saved yet. Enter a name above to create one.
                  </div>
                ) : (
                  <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-strong)", borderBottom: "1px solid var(--border)" }}>
                          <th style={{ padding: "6px 10px", textAlign: "left", fontSize: "0.74rem", color: "var(--muted)", fontWeight: "600" }}>Category Name</th>
                          <th style={{ padding: "6px 10px", textAlign: "left", fontSize: "0.74rem", color: "var(--muted)", fontWeight: "600" }}>Branch</th>
                          <th style={{ padding: "6px 10px", textAlign: "right", fontSize: "0.74rem", color: "var(--muted)", fontWeight: "600", width: "130px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((c) => (
                          <tr
                            key={c.id}
                            style={{
                              borderBottom: "1px solid var(--border)",
                              background: editingCategory?.id === c.id ? "var(--surface-hover)" : "transparent"
                            }}
                          >
                            <td style={{ padding: "6px 10px", fontWeight: "600", color: "var(--text)" }}>
                              {c.name}
                            </td>
                            <td style={{ padding: "6px 10px", color: "var(--muted)", fontSize: "0.78rem" }}>
                              {c.branch_name || "All Branches"}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", gap: "0.3rem", justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  className="ghost-btn btn-sm"
                                  style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                                  disabled={!canEdit}
                                  onClick={() => handleStartEditCategory(c)}
                                  title={!canEdit ? "Permission denied: Cannot edit category" : `Edit category ${c.name}`}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  className="secondary-btn btn-sm"
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: "0.75rem",
                                    color: "var(--danger, #ef4444)",
                                    borderColor: "rgba(239, 68, 68, 0.3)"
                                  }}
                                  disabled={!canDelete}
                                  onClick={() => handleDeleteCategory(c)}
                                  title={!canDelete ? "Permission denied: Cannot delete category" : `Delete category ${c.name}`}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Product Catalog & Branch Stock Levels" subtitle="Current non-serialized inventory.">
            <div className="form-grid" style={{ marginBottom: "1rem" }}>
              <label>
                Search Products
                <input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                  placeholder="🔍 Search name, SKU, or category..."
                />
              </label>
              <label>
                View Stock at Branch
                <select value={productBranchId} onChange={(e) => setProductBranchId(e.target.value)}>
                  <option value="">All Branches / Global</option>
                  {context.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Filter Category
                <select value={selectedCategoryFilter} onChange={(e) => setSelectedCategoryFilter(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {(() => {
              const filtered = products.filter((p) => {
                if (!productSearch.trim()) return true;
                const q = productSearch.toLowerCase();
                return (
                  (p.name && p.name.toLowerCase().includes(q)) ||
                  (p.category_name && p.category_name.toLowerCase().includes(q)) ||
                  (p.item_type && p.item_type.toLowerCase().includes(q))
                );
              });

              const totalPages = Math.max(1, Math.ceil(filtered.length / productPageSize));
              const currentPage = Math.min(productPage, totalPages);
              const start = (currentPage - 1) * productPageSize;
              const paginated = filtered.slice(start, start + productPageSize);

              return (
                <>
                  <AdaptiveTable
                    columns={[
                      {
                        key: "name",
                        label: "Product",
                        priority: 1,
                        truncate: true,
                        tooltip: (p) => p.name,
                        render: (val) => <strong>{val}</strong>
                      },
                      {
                        key: "category_name",
                        label: "Category",
                        priority: 3,
                        truncate: true,
                        render: (val) => val || "General"
                      },
                      {
                        key: "item_type",
                        label: "Type",
                        priority: 3,
                        width: "1%",
                        render: (val) => <span className="status-pill">{val}</span>
                      },
                      {
                        key: "cost_price",
                        label: "Cost Price",
                        priority: 2,
                        align: "right",
                        render: (val) => `PKR ${Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                      },
                      {
                        key: "sale_price",
                        label: "Retail Price",
                        priority: 2,
                        align: "right",
                        render: (val) => `PKR ${Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                      },
                      {
                        key: "opening_stock",
                        label: "Opening Stock",
                        priority: 4,
                        render: (_, p) =>
                          Number(p.opening_stock_quantity || 0) > 0 ? (
                            <div>
                              <span style={{ fontWeight: "700", color: "#10b981" }}>
                                {p.opening_stock_quantity} units
                              </span>
                              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                                @ PKR {Number(p.opening_cost_price || p.cost_price || 0).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="muted small">0 units</span>
                          )
                      },
                      {
                        key: "stock_quantity",
                        label: "Branch Stock",
                        priority: 2,
                        render: (val, p) =>
                          productBranchId ? (
                            <span
                              style={{
                                fontWeight: Number(val) <= Number(p.alert_quantity) ? "bold" : "normal",
                                color: Number(val) <= Number(p.alert_quantity) ? "var(--error)" : "inherit"
                              }}
                            >
                              {val} units
                            </span>
                          ) : (
                            <span className="muted">Select branch</span>
                          )
                      }
                    ]}
                    data={paginated}
                    keyField="id"
                    emptyMessage="No products found."
                    actions={(p) => (
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        {canEdit ? (
                          <button
                            type="button"
                            className="ghost-btn btn-sm"
                            onClick={() => {
                              setEditingProduct(p);
                              setEditProductForm({
                                name: p.name || "",
                                categoryId: p.category_id || "",
                                costPrice: p.cost_price || 0,
                                salePrice: p.sale_price || 0,
                                alertQuantity: p.alert_quantity || 5,
                                openingStockQuantity: p.opening_stock_quantity || 0,
                                openingCostPrice: p.opening_cost_price || p.cost_price || 0
                              });
                            }}
                            title="Edit product details & opening stock"
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
                        {canDelete ? (
                          <button
                            type="button"
                            className="secondary-btn btn-sm"
                            style={{ color: "var(--danger, #ef4444)", borderColor: "rgba(239, 68, 68, 0.3)" }}
                            onClick={() => handleDeleteProduct(p)}
                            title={`Delete ${p.name}`}
                          >
                            🗑️ Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="secondary-btn btn-sm"
                            style={{ opacity: 0.45, cursor: "not-allowed" }}
                            title="Delete permission required for your role"
                          >
                            🔒 Delete
                          </button>
                        )}
                      </div>
                    )}
                    actionsHeader="Actions"
                  />

                  <PaginationBar
                    page={currentPage}
                    pageSize={productPageSize}
                    total={filtered.length}
                    totalPages={totalPages}
                    onPageChange={(p) => setProductPage(p)}
                    onPageSizeChange={(s) => {
                      setProductPageSize(s);
                      setProductPage(1);
                    }}
                  />
                </>
              );
            })()}

            {adjustModal ? (
              <div style={{ marginTop: "1.5rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--surface)" }}>
                <h4>Adjust Stock for {adjustModal.product.name}</h4>
                <form className="form-grid" onSubmit={handleStockAdjust}>
                  <label>
                    Action
                    <select
                      value={adjustModal.adjustmentType}
                      onChange={(e) => setAdjustModal({ ...adjustModal, adjustmentType: e.target.value })}
                    >
                      <option value="in">Add Stock (+)</option>
                      <option value="out">Reduce Stock (-)</option>
                    </select>
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      value={adjustModal.quantity}
                      onChange={(e) => setAdjustModal({ ...adjustModal, quantity: e.target.value })}
                      required
                    />
                  </label>
                  <div className="full-span row-actions">
                    <button className="primary-btn" disabled={!canEdit} title={!canEdit ? "Permission denied: Cannot adjust stock" : ""}>Confirm Adjustment</button>
                    <button className="ghost-btn" type="button" onClick={() => setAdjustModal(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            ) : null}

            {editingProduct && (
              <div className="modal-backdrop" onClick={() => setEditingProduct(null)}>
                <div
                  className="modal-dialog"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: "560px" }}
                >
                  <div className="modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.4rem" }}>✏️</span>
                      <h3 style={{ margin: 0 }}>Edit Product #{editingProduct.id}</h3>
                    </div>
                    <button
                      type="button"
                      className="close-btn"
                      onClick={() => setEditingProduct(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleEditProductSubmit}>
                    <div className="modal-body" style={{ padding: "1.25rem" }}>
                      <div className="form-grid">
                        <label className="full-span">
                          <span>Product Name *</span>
                          <input
                            value={editProductForm.name || ""}
                            onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                            required
                          />
                        </label>
                        <label>
                          <span>Category</span>
                          <select
                            value={editProductForm.categoryId || ""}
                            onChange={(e) => setEditProductForm({ ...editProductForm, categoryId: e.target.value })}
                          >
                            <option value="">Select Category</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Cost Price (PKR)</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editProductForm.costPrice ?? ""}
                            onChange={(e) => setEditProductForm({ ...editProductForm, costPrice: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>Sale / Retail Price (PKR)</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editProductForm.salePrice ?? ""}
                            onChange={(e) => setEditProductForm({ ...editProductForm, salePrice: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>Low Stock Alert Qty</span>
                          <input
                            type="number"
                            min="0"
                            value={editProductForm.alertQuantity ?? 5}
                            onChange={(e) => setEditProductForm({ ...editProductForm, alertQuantity: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>Opening Stock Quantity</span>
                          <input
                            type="number"
                            min="0"
                            value={editProductForm.openingStockQuantity ?? 0}
                            onChange={(e) => setEditProductForm({ ...editProductForm, openingStockQuantity: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>Opening Cost Price (PKR)</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editProductForm.openingCostPrice ?? ""}
                            onChange={(e) => setEditProductForm({ ...editProductForm, openingCostPrice: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setEditingProduct(null)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="primary-btn" disabled={!canEdit} title={!canEdit ? "Permission denied: Cannot edit product" : ""}>
                        💾 Save Product
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* --- TAB 3: INTER-BRANCH TRANSFERS --- */}
      {activeTab === "transfers" && (
        <div className="page-stack">
          <SectionCard title="Dispatch Stock Transfer" subtitle="Safely transfer handsets and accessories between branches.">
            <form className="form-grid" onSubmit={handleCreateTransfer}>
              <label>
                Source Branch (From)
                <select
                  value={transferForm.fromBranchId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromBranchId: e.target.value })}
                  required
                >
                  <option value="">Select source branch</option>
                  {context.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Destination Branch (To)
                <select
                  value={transferForm.toBranchId}
                  onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}
                  required
                >
                  <option value="">Select destination branch</option>
                  {context.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>

              <label className="full-span">
                Transfer Notes
                <input
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  placeholder="e.g. Courier tracking # or driver name"
                />
              </label>

              <div className="full-span">
                <h4>Transfer Line Items</h4>
                <div className="table-wrap" style={{ overflowX: "auto", width: "100%" }}>
                  <table style={{ minWidth: "550px", width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>Type</th>
                        <th style={{ minWidth: "200px", whiteSpace: "nowrap" }}>Item Details</th>
                        <th style={{ minWidth: "90px", whiteSpace: "nowrap" }}>Quantity</th>
                        <th style={{ width: "45px" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {transferForm.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ width: "120px" }}>
                            <select
                              value={item.itemType}
                              onChange={(e) => {
                                const newItems = [...transferForm.items];
                                newItems[idx] = { itemType: e.target.value, imei: "", productId: "", quantity: 1 };
                                setTransferForm({ ...transferForm, items: newItems });
                              }}
                            >
                              <option value="handset">📱 Handset</option>
                              <option value="product">📦 Product</option>
                            </select>
                          </td>
                          <td>
                            {item.itemType === "handset" ? (
                              <input
                                placeholder="Scan or enter 15-digit IMEI"
                                value={item.imei}
                                onChange={(e) => {
                                  const newItems = [...transferForm.items];
                                  newItems[idx].imei = e.target.value.replace(/\s+/g, "");
                                  setTransferForm({ ...transferForm, items: newItems });
                                }}
                              />
                            ) : (
                              <select
                                value={item.productId || ""}
                                onChange={(e) => {
                                  const newItems = [...transferForm.items];
                                  newItems[idx].productId = e.target.value;
                                  setTransferForm({ ...transferForm, items: newItems });
                                }}
                                style={{
                                  width: "100%",
                                  padding: "0.45rem 0.65rem",
                                  borderRadius: "8px",
                                  border: "1.5px solid var(--border, #cbd5e1)",
                                  background: "var(--input-bg, var(--surface, #ffffff))",
                                  color: "var(--text, #111827)",
                                  fontSize: "0.88rem",
                                  fontWeight: item.productId ? 600 : 400
                                }}
                              >
                                <option value="">-- Select Product / Accessory --</option>
                                {availableProducts.length === 0 ? (
                                  <option value="" disabled>No products added yet</option>
                                ) : (
                                  availableProducts.map((p) => (
                                    <option key={p.id} value={String(p.id)}>
                                      {p.name} {p.sku ? `(${p.sku})` : ""} (Stock: {p.stock_quantity ?? 0})
                                    </option>
                                  ))
                                )}
                              </select>
                            )}
                          </td>
                          <td style={{ width: "100px" }}>
                            {item.itemType === "product" ? (
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...transferForm.items];
                                  newItems[idx].quantity = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  setTransferForm({ ...transferForm, items: newItems });
                                }}
                              />
                            ) : (
                              <span className="muted">1</span>
                            )}
                          </td>
                          <td style={{ width: "80px" }}>
                            <button
                              className="ghost-btn"
                              type="button"
                              onClick={() => {
                                setTransferForm({
                                  ...transferForm,
                                  items: transferForm.items.filter((_, i) => i !== idx)
                                });
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="row-actions" style={{ marginTop: "0.5rem" }}>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() =>
                      setTransferForm({
                        ...transferForm,
                        items: [...transferForm.items, { itemType: "handset", imei: "", productId: "", quantity: 1 }]
                      })
                    }
                  >
                    + Add Row
                  </button>
                </div>
              </div>

              <div className="full-span row-actions">
                <button className="primary-btn" type="submit" disabled={!canCreate} title={!canCreate ? "Permission denied: Cannot dispatch transfer" : ""}>Dispatch Transfer</button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Stock Transfers History" subtitle="Track in-transit, completed, and cancelled shipments.">
            <div className="form-grid" style={{ marginBottom: "1rem" }}>
              <label>
                Search Transfers
                <input
                  value={transferSearch}
                  onChange={(e) => {
                    setTransferSearch(e.target.value);
                    setTransferPage(1);
                  }}
                  placeholder="🔍 Search transfer #, branch, or staff..."
                />
              </label>
              <label>
                Filter Status
                <select value={transferFilterStatus} onChange={(e) => { setTransferFilterStatus(e.target.value); setTransferPage(1); }}>
                  <option value="">All Statuses</option>
                  <option value="in_transit">In Transit</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            {(() => {
              const filtered = transfers.filter((t) => {
                if (transferFilterStatus && t.status !== transferFilterStatus) return false;
                if (!transferSearch.trim()) return true;
                const q = transferSearch.toLowerCase();
                return (
                  (t.transfer_number && t.transfer_number.toLowerCase().includes(q)) ||
                  (t.from_branch_name && t.from_branch_name.toLowerCase().includes(q)) ||
                  (t.to_branch_name && t.to_branch_name.toLowerCase().includes(q)) ||
                  (t.created_by_name && t.created_by_name.toLowerCase().includes(q))
                );
              });

              const totalPages = Math.max(1, Math.ceil(filtered.length / transferPageSize));
              const currentPage = Math.min(transferPage, totalPages);
              const start = (currentPage - 1) * transferPageSize;
              const paginated = filtered.slice(start, start + transferPageSize);

              return (
                <>
                  <AdaptiveTable
                    columns={[
                      {
                        key: "transfer_number",
                        label: "Transfer #",
                        priority: 1,
                        truncate: true,
                        tooltip: (t) => t.transfer_number,
                        render: (val) => <strong>{val}</strong>
                      },
                      {
                        key: "route",
                        label: "Route",
                        priority: 1,
                        truncate: true,
                        tooltip: (t) => `${t.from_branch_name} ➔ ${t.to_branch_name}`,
                        render: (_, t) => `${t.from_branch_name} ➔ ${t.to_branch_name}`
                      },
                      {
                        key: "status",
                        label: "Status",
                        priority: 2,
                        width: "1%",
                        render: (val) => (
                          <span className={`status-pill ${val}`}>
                            {val}
                          </span>
                        )
                      },
                      {
                        key: "created_at",
                        label: "Date",
                        priority: 3,
                        render: (val) => new Date(val).toLocaleDateString()
                      },
                      {
                        key: "created_by_name",
                        label: "Dispatched By",
                        priority: 3,
                        truncate: true,
                        render: (val) => val || "Staff"
                      },
                      {
                        key: "received_by_name",
                        label: "Received By",
                        priority: 3,
                        truncate: true,
                        render: (val) => val || "—"
                      }
                    ]}
                    data={paginated}
                    keyField="id"
                    emptyMessage="No transfer records found."
                    actions={(t) => (
                      <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                        <button
                          className="ghost-btn btn-sm"
                          onClick={async () => {
                            setSelectedTransfer(await api.transfer(t.id));
                            smoothScrollTo("transfer-details-card", { offset: 85, delay: 60 });
                          }}
                        >
                          Details
                        </button>
                        {t.status === "in_transit" ? (
                          <>
                            <button
                              className="primary-btn btn-sm"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                              disabled={!canEdit}
                              onClick={() => handleReceiveTransfer(t.id)}
                              title={!canEdit ? "Permission denied: Cannot receive transfer" : ""}
                            >
                              Receive
                            </button>
                            <button
                              className="ghost-btn btn-sm"
                              style={{ color: "var(--error)" }}
                              disabled={!canDelete}
                              onClick={() => handleCancelTransfer(t.id)}
                              title={!canDelete ? "Permission denied: Cannot cancel transfer" : ""}
                            >
                              Cancel
                            </button>
                          </>
                        ) : null}
                      </div>
                    )}
                    actionsHeader="Actions"
                  />

                  <PaginationBar
                    page={currentPage}
                    pageSize={transferPageSize}
                    total={filtered.length}
                    totalPages={totalPages}
                    onPageChange={(p) => setTransferPage(p)}
                    onPageSizeChange={(s) => {
                      setTransferPageSize(s);
                      setTransferPage(1);
                    }}
                  />
                </>
              );
            })()}

            {selectedTransfer ? (
              <div id="transfer-details-card" style={{ marginTop: "1.5rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--surface)", scrollMarginTop: "90px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4>Transfer Details: {selectedTransfer.transfer_number}</h4>
                  <button className="ghost-btn" onClick={() => setSelectedTransfer(null)}>✕ Close</button>
                </div>
                <p><strong>Route:</strong> {selectedTransfer.from_branch_name} ➔ {selectedTransfer.to_branch_name}</p>
                <p><strong>Notes:</strong> {selectedTransfer.notes || "None"}</p>
                <div className="table-wrap" style={{ overflowX: "auto", width: "100%" }}>
                  <table style={{ minWidth: "520px", width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: "150px", whiteSpace: "nowrap" }}>Item</th>
                        <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>Identifier / SKU</th>
                        <th style={{ minWidth: "70px", whiteSpace: "nowrap" }}>Qty</th>
                        <th style={{ minWidth: "100px", whiteSpace: "nowrap" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTransfer.items?.map((item) => (
                        <tr key={item.id}>
                          <td>{item.mobile_unit_id ? "📱 Handset" : `📦 ${item.product_name}`}</td>
                          <td>{item.imei || item.product_sku || "—"}</td>
                          <td>{item.quantity}</td>
                          <td><span className="status-pill">{item.item_status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </SectionCard>
        </div>
      )}

      {/* --- TAB 4: RETURNS & RMAS --- */}
      {activeTab === "returns" && (
        <div className="page-stack">
          <SectionCard title="Process Return / RMA" subtitle="Handle customer returns and vendor supplier returns.">
            <form className="form-grid" onSubmit={handleCreateReturn}>
              <label>
                Branch
                <select
                  value={returnForm.branchId}
                  onChange={(e) => setReturnForm({ ...returnForm, branchId: e.target.value })}
                  required
                >
                  <option value="">Select branch</option>
                  {context.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Return Type
                <select
                  value={returnForm.returnType}
                  onChange={(e) => setReturnForm({ ...returnForm, returnType: e.target.value })}
                >
                  <option value="customer_return">Customer Sale Return</option>
                  <option value="vendor_return">Vendor RMA / Supplier Return</option>
                </select>
              </label>

              <label>
                Original Order ID (Reference)
                <input
                  type="number"
                  placeholder="Invoice Order ID"
                  value={returnForm.referenceId}
                  onChange={(e) => setReturnForm({ ...returnForm, referenceId: e.target.value })}
                  required
                />
              </label>

              <label>
                Payment / Refund Method
                <select
                  value={returnForm.paymentMethod}
                  onChange={(e) => setReturnForm({ ...returnForm, paymentMethod: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_wallet">Mobile Wallet</option>
                </select>
              </label>

              <label className="full-span">
                Reason for Return
                <input
                  placeholder="e.g. Defective display, customer remorse, wrong color"
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  required
                />
              </label>

              <div className="full-span">
                <h4>Items to Return</h4>
                <div className="table-wrap" style={{ overflowX: "auto", width: "100%" }}>
                  <table style={{ minWidth: "680px", width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>Type</th>
                        <th style={{ minWidth: "180px", whiteSpace: "nowrap" }}>IMEI / Product</th>
                        <th style={{ minWidth: "70px", whiteSpace: "nowrap" }}>Qty</th>
                        <th style={{ minWidth: "130px", whiteSpace: "nowrap" }}>Refund Rate (PKR)</th>
                        <th style={{ minWidth: "130px", whiteSpace: "nowrap" }}>Condition</th>
                        <th style={{ width: "45px" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {returnForm.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ width: "120px" }}>
                            <select
                              value={item.itemType}
                              onChange={(e) => {
                                const newItems = [...returnForm.items];
                                newItems[idx] = { itemType: e.target.value, imei: "", productId: "", quantity: 1, refundRate: "", itemCondition: "good" };
                                setReturnForm({ ...returnForm, items: newItems });
                              }}
                            >
                              <option value="handset">📱 Handset</option>
                              <option value="product">📦 Product</option>
                            </select>
                          </td>
                          <td>
                            {item.itemType === "handset" ? (
                              <input
                                placeholder="15-digit IMEI"
                                value={item.imei}
                                onChange={(e) => {
                                  const newItems = [...returnForm.items];
                                  newItems[idx].imei = e.target.value.replace(/\s+/g, "");
                                  setReturnForm({ ...returnForm, items: newItems });
                                }}
                              />
                            ) : (
                              <select
                                value={item.productId || ""}
                                onChange={(e) => {
                                  const prodId = e.target.value;
                                  const selectedProd = availableProducts.find((p) => String(p.id) === String(prodId));
                                  const autoRate = selectedProd
                                    ? (returnForm.returnType === "vendor_return"
                                        ? selectedProd.cost_price
                                        : (selectedProd.retail_price || selectedProd.sale_price))
                                    : "";
                                  const newItems = [...returnForm.items];
                                  newItems[idx] = {
                                    ...newItems[idx],
                                    productId: prodId,
                                    refundRate: autoRate || newItems[idx].refundRate
                                  };
                                  setReturnForm({ ...returnForm, items: newItems });
                                }}
                                style={{
                                  width: "100%",
                                  padding: "0.45rem 0.65rem",
                                  borderRadius: "8px",
                                  border: "1.5px solid var(--border, #cbd5e1)",
                                  background: "var(--input-bg, var(--surface, #ffffff))",
                                  color: "var(--text, #111827)",
                                  fontSize: "0.88rem",
                                  fontWeight: item.productId ? 600 : 400
                                }}
                              >
                                <option value="">-- Select Product to Return --</option>
                                {availableProducts.length === 0 ? (
                                  <option value="" disabled>No products added yet</option>
                                ) : (
                                  availableProducts.map((p) => (
                                    <option key={p.id} value={String(p.id)}>
                                      {p.name} {p.sku ? `(${p.sku})` : ""} - PKR {Number(p.sale_price || p.retail_price || 0).toLocaleString()} (Stock: {p.stock_quantity ?? 0})
                                    </option>
                                  ))
                                )}
                              </select>
                            )}
                          </td>
                          <td style={{ width: "90px" }}>
                            {item.itemType === "product" ? (
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...returnForm.items];
                                  newItems[idx].quantity = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  setReturnForm({ ...returnForm, items: newItems });
                                }}
                              />
                            ) : (
                              <span className="muted">1</span>
                            )}
                          </td>
                          <td style={{ width: "130px" }}>
                            <input
                              type="number"
                              placeholder="0"
                              value={item.refundRate}
                              onChange={(e) => {
                                const newItems = [...returnForm.items];
                                newItems[idx].refundRate = e.target.value;
                                setReturnForm({ ...returnForm, items: newItems });
                              }}
                            />
                          </td>
                          <td style={{ width: "120px" }}>
                            <select
                              value={item.itemCondition}
                              onChange={(e) => {
                                const newItems = [...returnForm.items];
                                newItems[idx].itemCondition = e.target.value;
                                setReturnForm({ ...returnForm, items: newItems });
                              }}
                            >
                              <option value="good">Good / Sealed</option>
                              <option value="defective">Defective</option>
                              <option value="damaged">Physical Damage</option>
                            </select>
                          </td>
                          <td style={{ width: "80px" }}>
                            <button
                              className="ghost-btn"
                              type="button"
                              onClick={() => {
                                setReturnForm({
                                  ...returnForm,
                                  items: returnForm.items.filter((_, i) => i !== idx)
                                });
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="row-actions" style={{ marginTop: "0.5rem" }}>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() =>
                      setReturnForm({
                        ...returnForm,
                        items: [...returnForm.items, { itemType: "handset", imei: "", productId: "", quantity: 1, refundRate: "", itemCondition: "good" }]
                      })
                    }
                  >
                    + Add Row
                  </button>
                </div>
              </div>

              <div className="full-span row-actions">
                <button className="primary-btn" type="submit" disabled={!canCreate} title={!canCreate ? "Permission denied: Cannot process return" : ""}>Process Return</button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Returns & RMA Audit History" subtitle="Full audit log of returned items and refund amounts.">
            <div className="form-grid" style={{ marginBottom: "1rem" }}>
              <label>
                Search Returns
                <input
                  value={returnSearch}
                  onChange={(e) => {
                    setReturnSearch(e.target.value);
                    setReturnPage(1);
                  }}
                  placeholder="🔍 Search return #, branch, staff, reason..."
                />
              </label>
              <label>
                Filter Return Type
                <select value={returnTypeFilter} onChange={(e) => { setReturnTypeFilter(e.target.value); setReturnPage(1); }}>
                  <option value="">All Types</option>
                  <option value="customer_return">Customer Return</option>
                  <option value="vendor_return">Vendor Return</option>
                </select>
              </label>
            </div>

            {(() => {
              const filtered = returnsList.filter((r) => {
                if (returnTypeFilter && r.return_type !== returnTypeFilter) return false;
                if (!returnSearch.trim()) return true;
                const q = returnSearch.toLowerCase();
                return (
                  (r.return_number && r.return_number.toLowerCase().includes(q)) ||
                  (r.branch_name && r.branch_name.toLowerCase().includes(q)) ||
                  (r.reason && r.reason.toLowerCase().includes(q)) ||
                  (r.created_by_name && r.created_by_name.toLowerCase().includes(q))
                );
              });

              const totalPages = Math.max(1, Math.ceil(filtered.length / returnPageSize));
              const currentPage = Math.min(returnPage, totalPages);
              const start = (currentPage - 1) * returnPageSize;
              const paginated = filtered.slice(start, start + returnPageSize);

              return (
                <>
                  <AdaptiveTable
                    columns={[
                      {
                        key: "return_number",
                        label: "Return #",
                        priority: 1,
                        truncate: true,
                        tooltip: (r) => r.return_number,
                        render: (val) => <strong>{val}</strong>
                      },
                      {
                        key: "total_refund_amount",
                        label: "Refund Amount",
                        priority: 1,
                        align: "right",
                        render: (val) => <strong>PKR {Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                      },
                      {
                        key: "return_type",
                        label: "Type",
                        priority: 2,
                        width: "1%",
                        render: (val) => <span className="status-pill">{val}</span>
                      },
                      {
                        key: "reason",
                        label: "Reason",
                        priority: 2,
                        truncate: true,
                        tooltip: (r) => r.reason,
                        render: (val) => val || "—"
                      },
                      {
                        key: "branch_name",
                        label: "Branch",
                        priority: 3,
                        truncate: true,
                        render: (val) => val || "—"
                      },
                      {
                        key: "return_date",
                        label: "Date",
                        priority: 3,
                        render: (val) => new Date(val).toLocaleDateString()
                      },
                      {
                        key: "created_by_name",
                        label: "Processed By",
                        priority: 4,
                        truncate: true,
                        render: (val) => val || "Staff"
                      }
                    ]}
                    data={paginated}
                    keyField="id"
                    emptyMessage="No return records found."
                  />

                  <PaginationBar
                    page={currentPage}
                    pageSize={returnPageSize}
                    total={filtered.length}
                    totalPages={totalPages}
                    onPageChange={(p) => setReturnPage(p)}
                    onPageSizeChange={(s) => {
                      setReturnPageSize(s);
                      setReturnPage(1);
                    }}
                  />
                </>
              );
            })()}
          </SectionCard>
        </div>
      )}

      <PhoneQRTagModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        items={qrItems}
        companyName={shopName}
      />
    </div>
  );
}
