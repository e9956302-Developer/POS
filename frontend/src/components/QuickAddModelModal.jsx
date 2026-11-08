import { useState } from "react";
import { api } from "../api.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export function QuickAddModelModal({ isOpen, onClose, onCreated }) {
  const { t, isRtl, language } = useLanguage();
  const [company, setCompany] = useState("");
  const [modelName, setModelName] = useState("");
  const [variant, setVariant] = useState("");
  const [color, setColor] = useState("");
  const [storage, setStorage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!company.trim() || !modelName.trim()) {
      setError(language === "ur" ? "کمپنی اور ماڈل کا نام درج کرنا لازمی ہے" : "Company and Model Name are required");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const created = await api.createModel({
        company: company.trim(),
        modelName: modelName.trim(),
        variant: variant.trim() || null,
        color: color.trim() || null,
        storage: storage.trim() || null
      });
      if (onCreated) {
        onCreated(created);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create model");
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
            <span style={{ fontSize: "1.3rem" }}>📱</span>
            <h3 style={{ margin: 0 }}>{t("modals.quick_add_model", "Quick Add Mobile Model")}</h3>
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
          <div className="modal-body">
            {error && <div className="alert error" style={{ marginBottom: "1rem" }}>{error}</div>}

            <div className="form-grid modal-compact-form">
              <label>
                <span>{t("modals.brand_company", "Brand / Company")} <span style={{ color: "var(--danger)" }}>*</span></span>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={t("modals.brand_placeholder", "e.g. Apple, Samsung, Xiaomi...")}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </label>

              <label>
                <span>{t("modals.model_name", "Model Name")} <span style={{ color: "var(--danger)" }}>*</span></span>
                <input
                  type="text"
                  required
                  placeholder={t("modals.model_placeholder", "e.g. iPhone 15 Pro Max, Galaxy S24...")}
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              </label>

              <label>
                <span>{t("modals.storage", "Storage (ROM/RAM)")}</span>
                <input
                  type="text"
                  placeholder={t("modals.storage_placeholder", "e.g. 128GB, 256GB, 8/256GB...")}
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                />
              </label>

              <label>
                <span>{t("modals.color", "Color")}</span>
                <input
                  type="text"
                  placeholder={t("modals.color_placeholder", "e.g. Titanium Blue, Black, Silver...")}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>

              <label className="full-span">
                <span>{t("modals.variant_specs", "Variant / Specs (Optional)")}</span>
                <input
                  type="text"
                  placeholder={t("modals.variant_placeholder", "e.g. Dual SIM, PTA Approved, Non-PTA...")}
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
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
              {isSubmitting ? t("modals.saving", "Saving...") : `➕ ${t("modals.create_model_btn", "Create Phone Model")}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
