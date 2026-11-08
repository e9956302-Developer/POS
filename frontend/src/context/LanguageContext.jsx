import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations } from "../i18n/translations.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        return localStorage.getItem("pos_language") || "en";
      }
    } catch {}
    return "en";
  });

  const isRtl = language === "ur";

  // Synchronize document attributes and CSS body classes for instant layout reflow
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = isRtl ? "rtl" : "ltr";
      document.documentElement.setAttribute("data-lang", language);
      document.documentElement.setAttribute("data-dir", isRtl ? "rtl" : "ltr");

      if (document.body) {
        if (isRtl) {
          document.body.classList.add("lang-ur");
          document.body.classList.add("rtl-mode");
          document.body.classList.remove("lang-en");
          document.body.classList.remove("ltr-mode");
        } else {
          document.body.classList.add("lang-en");
          document.body.classList.add("ltr-mode");
          document.body.classList.remove("lang-ur");
          document.body.classList.remove("rtl-mode");
        }
      }
    }
  }, [language, isRtl]);

  const setLanguage = useCallback((nextLang) => {
    const valid = nextLang === "ur" ? "ur" : "en";
    setLanguageState(valid);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("pos_language", valid);
      }
    } catch {}
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "ur" : "en");
  }, [language, setLanguage]);

  // High performance nested translation lookup with fallback and parameter replacement
  const t = useCallback(
    (key, fallback = "", params = {}) => {
      if (!key) return "";
      let actualFallback = fallback;
      let actualParams = params;
      if (typeof fallback === "object" && fallback !== null && (!params || Object.keys(params).length === 0)) {
        actualParams = fallback;
        actualFallback = "";
      }

      const currentDict = translations[language] || translations.en;
      const parts = key.split(".");
      let val = currentDict;

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (val && typeof val === "object" && p in val) {
          val = val[p];
        } else {
          val = null;
          break;
        }
      }

      // Fallback to English if translation missing in current language
      if ((val === null || val === undefined) && language !== "en") {
        let engVal = translations.en;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (engVal && typeof engVal === "object" && p in engVal) {
            engVal = engVal[p];
          } else {
            engVal = null;
            break;
          }
        }
        val = engVal;
      }

      let res = typeof val === "string" ? val : (typeof actualFallback === "string" && actualFallback ? actualFallback : key);

      // Parameter interpolation (e.g. {amount}, {count}, {name})
      if (actualParams && typeof actualParams === "object") {
        Object.entries(actualParams).forEach(([paramKey, paramVal]) => {
          if (typeof res === "string") {
            res = res.replaceAll(`{${paramKey}}`, String(paramVal ?? ""));
          }
        });
      }

      return typeof res === "string" ? res : String(res ?? "");
    },
    [language]
  );

  const formatCurrency = useCallback(
    (amount, options = {}) => {
      const num = Number(amount || 0);
      const formattedNum = num.toLocaleString(undefined, {
        minimumFractionDigits: options.minimumFractionDigits ?? 0,
        maximumFractionDigits: options.maximumFractionDigits ?? 2
      });
      const symbol = isRtl ? "روپے" : "PKR";
      return isRtl ? `${formattedNum} ${symbol}` : `${symbol} ${formattedNum}`;
    },
    [isRtl]
  );

  const value = {
    language,
    isRtl,
    setLanguage,
    toggleLanguage,
    t,
    formatCurrency
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "en",
      isRtl: false,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key, defaultValue) => {
        if (typeof defaultValue === "string") return defaultValue;
        if (defaultValue && typeof defaultValue === "object") {
          if (defaultValue.total !== undefined) return `${defaultValue.total} items`;
          if (defaultValue.count !== undefined) return `${defaultValue.count} items`;
          return key;
        }
        return defaultValue || key;
      },
      formatCurrency: (val) => `PKR ${Number(val || 0).toLocaleString()}`
    };
  }
  return context;
}

export default LanguageContext;
