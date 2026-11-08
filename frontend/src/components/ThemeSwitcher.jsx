import React from "react";

export const THEMES = [
  { key: "dark", label: "🌙 Dark", name: "Obsidian Dark" },
  { key: "emerald", label: "🌲 Emerald", name: "Emerald Forest" },
  { key: "cobalt", label: "🔷 Cobalt", name: "Cobalt Blue" },
  { key: "crimson", label: "🍷 Crimson", name: "Crimson Slate" },
  { key: "high-contrast", label: "⚡ Contrast", name: "High Contrast" }
];

export function ThemeSwitcher({ currentTheme, onSelectTheme, collapsed, isLocked = false }) {
  if (isLocked) {
    if (collapsed) {
      return (
        <button
          key="theme-cycle-btn"
          className="theme-cycle-btn disabled"
          style={{ opacity: 0.6, cursor: "not-allowed" }}
          title="Theme customization is locked. Upgrade your subscription package to customize themes."
          type="button"
          aria-label="Theme selection locked"
          disabled
        >
          🔒
        </button>
      );
    }

    return (
      <div
        className="theme-switcher locked"
        style={{
          padding: "0.5rem 0.65rem",
          background: "rgba(0, 0, 0, 0.2)",
          borderRadius: "8px",
          border: "1px dashed rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          fontSize: "0.76rem",
          color: "rgba(255, 255, 255, 0.75)"
        }}
        title="Theme customization is locked. Upgrade your subscription package to unlock color themes."
      >
        <span>🔒</span>
        <span>Theme Customization (Locked)</span>
      </div>
    );
  }

  if (collapsed) {
    const current = THEMES.find((t) => t.key === currentTheme) || THEMES[0];
    const currentIdx = THEMES.findIndex((t) => t.key === currentTheme);
    const nextTheme = THEMES[(currentIdx + 1) % THEMES.length];
    return (
      <button
        key="theme-cycle-btn"
        className="theme-cycle-btn"
        onClick={() => onSelectTheme(nextTheme.key)}
        title={`Theme: ${current.name} (Click to switch to ${nextTheme.name})`}
        type="button"
        aria-label="Cycle theme"
      >
        {current.label.split(" ")[0]}
      </button>
    );
  }

  return (
    <div className="theme-switcher">
      {THEMES.map((t) => (
        <button
          key={t.key}
          className={`theme-pill-btn ${currentTheme === t.key ? "active" : ""}`}
          onClick={() => onSelectTheme(t.key)}
          title={`Switch to ${t.name}`}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
