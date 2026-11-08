import React, { useEffect, useRef } from "react";

export function SessionExpiredModal({ message, onOk }) {
  const okButtonRef = useRef(null);

  // Focus the OK button on mount for fast keyboard accessibility (Enter / Space)
  useEffect(() => {
    okButtonRef.current?.focus();
  }, []);

  // Allow pressing Enter or Escape key to immediately trigger onOk
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        onOk();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOk]);

  return (
    <div
      className="modal-backdrop session-expired-backdrop"
      style={{
        zIndex: 999999,
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
      onClick={onOk}
    >
      <div
        className="modal-dialog session-expired-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-desc"
        style={{
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          padding: "2.25rem 1.75rem",
          border: "1px solid var(--danger-border, rgba(239, 68, 68, 0.35))",
          borderRadius: "16px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px var(--danger-bg, rgba(239, 68, 68, 0.15))",
          background: "var(--surface)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.2rem",
            margin: "0 auto 1.25rem auto"
          }}
        >
          ⏱️
        </div>

        <h3
          id="session-expired-title"
          style={{
            margin: "0 0 0.5rem 0",
            fontSize: "1.35rem",
            fontWeight: "700",
            color: "var(--text)"
          }}
        >
          Session Expired
        </h3>

        <p
          id="session-expired-desc"
          style={{
            margin: "0 0 1.75rem 0",
            fontSize: "0.95rem",
            color: "var(--muted)",
            lineHeight: "1.55"
          }}
        >
          {message || "Your session has expired. Please log in again to continue."}
        </p>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            ref={okButtonRef}
            type="button"
            className="primary-btn"
            id="session-expired-ok-btn"
            style={{
              minWidth: "140px",
              padding: "0.7rem 2rem",
              fontSize: "1rem",
              fontWeight: "600",
              background: "var(--danger)",
              borderColor: "var(--danger)",
              borderRadius: "10px",
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 4px 14px var(--danger-border, rgba(239, 68, 68, 0.35))",
              transition: "all 0.2s ease"
            }}
            onClick={onOk}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
