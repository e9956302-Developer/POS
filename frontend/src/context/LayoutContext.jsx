import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const LayoutContext = createContext({
  activeLayout: "classic",
  setLayout: () => {},
  isModernCompact: false,
  isMidnightExecutive: false,
  isClassic: true,
  isLoadingLayout: false,
  refreshLayout: async () => {}
});

export function LayoutProvider({ children }) {
  const [activeLayout, setActiveLayout] = useState(() => {
    // Check cached preference for instant zero-flash render, server is ground truth
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        return localStorage.getItem("pos_platform_layout") || "classic";
      }
    } catch {}
    return "classic";
  });
  const [isLoadingLayout, setIsLoadingLayout] = useState(true);

  async function fetchLayout() {
    try {
      const data = await api.getPlatformLayout();
      if (data && (data.active_layout === "classic" || data.active_layout === "modern_compact" || data.active_layout === "midnight_executive")) {
        setActiveLayout(data.active_layout);
        try {
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("pos_platform_layout", data.active_layout);
          }
        } catch {}
      }
    } catch (err) {
      console.warn("Could not fetch server platform layout, falling back to cached/default:", err.message);
    } finally {
      setIsLoadingLayout(false);
    }
  }

  useEffect(() => {
    fetchLayout();
  }, []);

  useEffect(() => {
    // Synchronize HTML data attribute and root class
    if (typeof document === "undefined") return;
    const layoutValue = activeLayout || "classic";
    document.documentElement?.setAttribute("data-layout", layoutValue);
    if (document.body) {
      document.body.classList.remove("layout-classic", "layout-modern-compact", "layout-midnight-executive");
      if (layoutValue === "modern_compact") {
        document.body.classList.add("layout-modern-compact");
      } else if (layoutValue === "midnight_executive") {
        document.body.classList.add("layout-midnight-executive");
      } else {
        document.body.classList.add("layout-classic");
      }
    }
  }, [activeLayout]);

  const value = {
    activeLayout,
    setLayout: (layout) => {
      setActiveLayout(layout);
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("pos_platform_layout", layout);
        }
      } catch {}
    },
    isModernCompact: activeLayout === "modern_compact",
    isMidnightExecutive: activeLayout === "midnight_executive",
    isClassic: activeLayout === "classic",
    isLoadingLayout,
    refreshLayout: fetchLayout
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
