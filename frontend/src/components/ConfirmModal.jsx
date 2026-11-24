import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = true,
  onConfirm,
  onCancel,
  confirmDisabled = false
}) {
  const { isUrdu, isRtl } = useLanguage();
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 40);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const defaultTitle = isUrdu ? "کیا آپ کو یقین ہے؟" : "Confirm Action";
  const defaultConfirmText = isDanger
    ? (isUrdu ? "ہاں، حذف کریں" : "Yes, Delete")
    : (isUrdu ? "تصدیق کریں" : "Confirm");
  const defaultCancelText = isUrdu ? "منسوخ کریں" : "Cancel";

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1rem"
      }}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "440px",
          width: "100%",
          background: "var(--surface, #1e293b)",
          border: "1px solid var(--border, #334155)",
          borderRadius: "14px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          overflow: "hidden"
        }}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div
          className="modal-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border, #334155)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.3rem" }}>{isDanger ? "⚠️" : "❓"}</span>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text, #f8fafc)" }}>
              {title || defaultTitle}
            </h3>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #94a3b8)",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0.2rem"
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            padding: "1.5rem 1.25rem",
            fontSize: "0.95rem",
            color: "var(--text, #f1f5f9)",
            lineHeight: 1.5
          }}
        >
          {message}
        </div>

        <div
          className="modal-footer"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--border, #334155)",
            background: "rgba(0, 0, 0, 0.1)"
          }}
        >
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancel}
            style={{ padding: "0.5rem 1.1rem", fontSize: "0.9rem" }}
          >
            {cancelText || defaultCancelText}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={isDanger ? "primary-btn btn-danger" : "primary-btn"}
            onClick={onConfirm}
            disabled={confirmDisabled}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              ...(isDanger ? { background: "#ef4444", borderColor: "#dc2626" } : {})
            }}
          >
            {confirmText || defaultConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
