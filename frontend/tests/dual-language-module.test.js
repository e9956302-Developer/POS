import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Dual Language Module: SYSTEM_MODULES and backend catalogs include dual_language", async () => {
  const { SYSTEM_MODULES, isPackagePageAllowed } = await import("../src/services/rightsManagementService.js");
  
  const dualLangModule = SYSTEM_MODULES.find((m) => m.key === "dual_language");
  assert.ok(dualLangModule, "dual_language must exist in SYSTEM_MODULES catalog");
  assert.equal(dualLangModule.category, "Appearance & Branding", "Category should be Appearance & Branding");
  assert.equal(dualLangModule.icon, "🌐", "Icon should be 🌐");
  assert.match(dualLangModule.label, /Dual Language/i, "Label should indicate Dual Language Support");

  // Backend catalog check
  const adminJsContent = fs.readFileSync(path.resolve(__dirname, "../../backend/src/routes/modules/admin.js"), "utf8");
  assert.ok(adminJsContent.includes('"dual_language"'), "admin.js must include dual_language in SYSTEM_MODULES_LIST");

  const authJsContent = fs.readFileSync(path.resolve(__dirname, "../../backend/src/middleware/auth.js"), "utf8");
  assert.ok(authJsContent.includes('"dual_language"'), "auth.js must include dual_language package checks");
});

test("Dual Language Module: isPackagePageAllowed validates access by subscription package", async () => {
  const { isPackagePageAllowed } = await import("../src/services/rightsManagementService.js");

  // Package with dual_language
  const allowedPlan = ["dashboard", "sales", "dual_language"];
  assert.equal(isPackagePageAllowed("dual_language", allowedPlan), true, "Allowed when in package allowedPages");

  // Package without dual_language (e.g. Starter Monthly)
  const starterPlan = ["dashboard", "sales", "purchases", "inventory", "cash_register", "parties", "invoices"];
  assert.equal(isPackagePageAllowed("dual_language", starterPlan), false, "Denied when NOT in package allowedPages");
});

test("Dual Language Module: canUseLanguage helper checks Top Admin and package entitlements", async () => {
  const { canUseLanguage } = await import("../src/services/rightsManagementService.js");

  // 1. Unauthenticated / guest (e.g. landing page)
  assert.equal(canUseLanguage(null), true, "Guest/landing page allowed default");

  // 2. Top Admin (SaaS owner) always has access
  const topAdminUser = { id: 1, role_name: "top_admin", email: "topadmin@digitalmarkaz360.local" };
  assert.equal(canUseLanguage(topAdminUser), true, "Top Admin always has access to dual language");

  // 3. User with dual_language in company package
  const enterpriseUser = {
    id: 10,
    role_name: "manager",
    allowedPages: ["dashboard", "sales", "inventory", "dual_language"]
  };
  assert.equal(canUseLanguage(enterpriseUser), true, "User with dual_language in allowedPages is granted access");

  // 4. User without dual_language in company package (Starter package)
  const starterUser = {
    id: 11,
    role_name: "manager",
    allowedPages: ["dashboard", "sales", "purchases", "inventory", "cash_register", "parties", "invoices"]
  };
  assert.equal(canUseLanguage(starterUser), false, "User on Starter package without dual_language is denied access");

  // 5. User whose role permission explicitly denies dual_language
  const deniedUser = {
    id: 12,
    role_name: "cashier",
    allowedPages: ["dashboard", "sales", "dual_language"],
    permissions: [{ page_key: "dual_language", is_allowed: 0 }]
  };
  assert.equal(canUseLanguage(deniedUser), false, "User with explicit role permission denial is denied access");
});

test("Dual Language Module: Layouts conditionally gate LanguageSwitcher with hasLanguageAccess", () => {
  const classic = fs.readFileSync(path.resolve(__dirname, "../src/components/layouts/ClassicLayout.jsx"), "utf8");
  assert.ok(classic.includes("hasLanguageAccess"), "ClassicLayout must accept hasLanguageAccess prop");
  assert.ok(classic.includes("{hasLanguageAccess && <LanguageSwitcher"), "ClassicLayout must gate LanguageSwitcher");

  const modern = fs.readFileSync(path.resolve(__dirname, "../src/components/layouts/ModernLayout.jsx"), "utf8");
  assert.ok(modern.includes("hasLanguageAccess"), "ModernLayout must accept hasLanguageAccess prop");
  assert.ok(modern.includes("{hasLanguageAccess && <LanguageSwitcher"), "ModernLayout must gate LanguageSwitcher");

  const executive = fs.readFileSync(path.resolve(__dirname, "../src/components/layouts/ExecutiveLayout.jsx"), "utf8");
  assert.ok(executive.includes("hasLanguageAccess"), "ExecutiveLayout must accept hasLanguageAccess prop");
  assert.ok(executive.includes("{hasLanguageAccess && <LanguageSwitcher"), "ExecutiveLayout must gate LanguageSwitcher");
});

test("Dual Language Module: LanguageSwitcher component source handles isLocked and hasAccess props", () => {
  const switcherSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/LanguageSwitcher.jsx"), "utf8");
  assert.ok(switcherSrc.includes("isLocked"), "LanguageSwitcher accepts isLocked");
  assert.ok(switcherSrc.includes("hasAccess"), "LanguageSwitcher accepts hasAccess");
  assert.ok(switcherSrc.includes("if (isLocked || hasAccess === false)"), "LanguageSwitcher returns null when locked or access denied");
});

test("Dual Language Module: Landing Page does NOT provide language switcher and enforces English LTR", () => {
  const landingSrc = fs.readFileSync(path.resolve(__dirname, "../src/pages/LandingPage.jsx"), "utf8");
  assert.equal(landingSrc.includes("LanguageSwitcher"), false, "LandingPage must NOT include LanguageSwitcher component");
  assert.ok(landingSrc.includes('document.documentElement.lang = "en"'), "LandingPage must lock language to English");
  assert.ok(landingSrc.includes('document.documentElement.dir = "ltr"'), "LandingPage must lock orientation to LTR");

  const appSrc = fs.readFileSync(path.resolve(__dirname, "../src/App.jsx"), "utf8");
  assert.ok(appSrc.includes('guestView === "landing" && language !== "en"'), "App must enforce English when guest is on Landing Page");
});
