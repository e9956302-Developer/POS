import { useState, useEffect } from "react";
import { api } from "../api.js";
import { SearchableSelect } from "./SearchableSelect.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export function QuickAddProductModal({ isOpen, onClose, onCreated, categories = [], branchId }) {
  const { t, isRtl, language } = useLanguage();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemType, setItemType] = useState("accessory");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Category loading & inline creation
  const [categoryList, setCategoryList] = useState(categories || []);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  // Reset inputs when opening
  useEffect(() => {
    if (isOpen) {
      setName("");
      setCategoryId("");
      setItemType("accessory");
      setCostPrice("");
      setSalePrice("");
      setBarcode("");
      setError("");
      setShowNewCategory(false);
      setNewCategoryName("");
      setCategoryError("");
    }
  }, [isOpen]);

  // Sync prop changes
  useEffect(() => {
    if (categories && categories.length > 0) {
      setCategoryList(categories);
    }
  }, [categories]);

  // Always fetch fresh categories from API when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function fetchCategories() {
      setIsLoadingCategories(true);
      try {
        const fetched = await api.categories();
        if (isMounted && Array.isArray(fetched)) {
          setCategoryList(fetched);
        }
      } catch (err) {
        console.warn("Failed to load categories for quick product modal:", err);
      } finally {
        if (isMounted) setIsLoadingCategories(false);
      }
    }
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  async function handleCreateCategory(e) {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    setCategoryError("");
    try {
      const created = await api.createCategory({
        name: newCategoryName.trim(),
        branchId: branchId ? Number(branchId) : undefined
      });
      setCategoryList((prev) => [...prev, created]);
      setCategoryId(String(created.id));
      setNewCategoryName("");
      setShowNewCategory(false);
    } catch (err) {
      setCategoryError(err.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Product name is required");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const created = await api.createProduct({
        name: name.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
        itemType,
        hasImei: 0,
        costPrice: Number(costPrice || 0),
        salePrice: Number(salePrice || 0),
        barcode: barcode.trim() || null,
        branchId: branchId ? Number(branchId) : undefined
      });
      if (onCreated) {
        onCreated(created);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px" }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.3rem" }}>📦</span>
            <h3 style={{ margin: 0 }}>{t("modals.quick_add_product", "Quick Add Simple Product")}</h3>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ overflow: "visible" }}>
            {error && <div className="alert error" style={{ marginBottom: "1rem" }}>{error}</div>}

            <div className="form-grid modal-compact-form">
              <label className="full-span">
                <span>{t("modals.product_name", "Product Name")} <span style={{ color: "var(--danger)" }}>*</span></span>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={t("modals.product_name_placeholder", "e.g. 20W Fast Charger, Type-C Cable...")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              {/* SEARCHABLE CATEGORY SELECT WITH INLINE + NEW CATEGORY */}
              <label>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{t("modals.category", "Category")}</span>
                  <button
                    type="button"
                    className="ghost-btn btn-sm"
                    onClick={() => {
                      setShowNewCategory(!showNewCategory);
                      setCategoryError("");
                    }}
                    style={{ fontSize: "0.75rem", padding: "0 4px", color: "var(--primary)" }}
                    title="Quick add a new category"
                  >
                    {showNewCategory ? t("common.cancel", "Cancel") : t("modals.new_category", "+ New")}
                  </button>
                </div>

                {showNewCategory ? (
                  <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.2rem" }}>
                    <input
                      type="text"
                      placeholder={t("modals.category", "Category name...")}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory(e);
                        }
                      }}
                      style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem" }}
                    />
                    <button
                      type="button"
                      className="primary-btn btn-sm"
                      onClick={handleCreateCategory}
                      disabled={isCreatingCategory || !newCategoryName.trim()}
                      style={{ whiteSpace: "nowrap", padding: "0.45rem 0.75rem" }}
                    >
                      {isCreatingCategory ? "..." : t("common.add", "Add")}
                    </button>
                  </div>
                ) : (
                  <SearchableSelect
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    placeholder={isLoadingCategories ? t("common.loading_data", "Loading categories...") : t("purchases.select_product", "Search category...")}
                    allowClear={true}
                  >
                    <option value="">-- {t("common.all", "General / No Category")} --</option>
                    {(categoryList || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </SearchableSelect>
                )}
                {categoryError && (
                  <span className="field-error" style={{ color: "var(--danger)", fontSize: "0.75rem", marginTop: "2px", display: "block" }}>
                    {categoryError}
                  </span>
                )}
              </label>

              <label>
                <span>{t("modals.item_type", "Item Type")}</span>
                <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
                  <option value="accessory">{t("modals.accessory", "Accessory")}</option>
                  <option value="part">{t("modals.repair_part", "Repair Part")}</option>
                  <option value="service">{t("modals.service", "Service")}</option>
                </select>
              </label>

              <label>
                <span>{t("modals.cost_price", "Purchase Cost (PKR)")}</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  style={{ direction: "ltr", unicodeBidi: "isolate" }}
                />
              </label>

              <label>
                <span>{t("modals.sale_price", "Sale Price (PKR)")}</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  style={{ direction: "ltr", unicodeBidi: "isolate" }}
                />
              </label>

              <label className="full-span">
                <span>{t("modals.barcode", "Barcode / SKU (Optional)")}</span>
                <input
                  type="text"
                  placeholder={t("modals.barcode_placeholder", "Scan or enter barcode / SKU...")}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  style={{ direction: "ltr", unicodeBidi: "isolate" }}
                />
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("modals.saving", "Saving...") : `➕ ${t("modals.create_product_btn", "Create Product")}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
