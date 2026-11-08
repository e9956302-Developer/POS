import React from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

export function LanguageSwitcher({
  variant = "pill", // "pill" | "compact" | "badge" | "icon"
  className = "",
  style = {}
}) {
  const { language, toggleLanguage, setLanguage } = useLanguage();
  const isUrdu = language === "ur";

  if (variant === "compact" || variant === "icon") {
    return (
      <button
        type="button"
        className={`lang-switcher-compact ${className}`}
        onClick={toggleLanguage}
        title={isUrdu ? "Switch to English" : "اردو زبان میں دیکھیں (Switch to Urdu)"}
        aria-label="Toggle language"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.35rem",
          padding: "0.35rem 0.65rem",
          borderRadius: "8px",
          border: "1px solid var(--border, #334155)",
          background: "var(--surface-strong, rgba(255, 255, 255, 0.05))",
          color: "var(--text, #f1f5f9)",
          fontSize: "0.82rem",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.15s ease",
          ...style
        }}
      >
        <span style={{ fontSize: "1rem", lineHeight: 1 }}>🌐</span>
        <span style={{ fontFamily: isUrdu ? "var(--font-sans)" : "'Noto Nastaliq Urdu', 'Noto Sans Arabic', sans-serif" }}>
          {isUrdu ? "EN" : "اردو"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`lang-switcher-btn ${isUrdu ? "is-urdu" : "is-english"} ${className}`}
      onClick={toggleLanguage}
      title={isUrdu ? "Switch to English" : "اردو زبان میں تبدیل کریں"}
      aria-label="Toggle language between Urdu and English"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.38rem 0.85rem",
        borderRadius: "9999px",
        border: isUrdu
          ? "1.5px solid #059669"
          : "1.5px solid var(--border, #334155)",
        background: isUrdu
          ? "rgba(5, 150, 105, 0.15)"
          : "var(--surface, rgba(255, 255, 255, 0.04))",
        color: isUrdu ? "#10b981" : "var(--text, #f1f5f9)",
        fontSize: "0.85rem",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        userSelect: "none",
        ...style
      }}
    >
      <span style={{ fontSize: "1.05rem", lineHeight: 1 }}>🌐</span>
      <span
        style={{
          fontFamily: isUrdu
            ? "Inter, -apple-system, sans-serif"
            : "'Noto Sans Arabic', 'Noto Nastaliq Urdu', sans-serif",
          fontSize: isUrdu ? "0.84rem" : "0.9rem",
          letterSpacing: isUrdu ? "0.3px" : "0"
        }}
      >
        {isUrdu ? "English" : "اردو"}
      </span>
    </button>
  );
}

export default LanguageSwitcher;
