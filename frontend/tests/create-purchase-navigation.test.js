import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const purchasesPagePath = path.resolve(__dirname, "../src/pages/PurchasesPage.jsx");
const searchableSelectPath = path.resolve(__dirname, "../src/components/SearchableSelect.jsx");
const universalEntryRowPath = path.resolve(__dirname, "../src/components/UniversalEntryRow.jsx");

test("Create Purchase Navigation: Requirement 1 - SearchableSelect accepts onSelectNext and triggers it on Enter/Tab", () => {
  const selectSource = fs.readFileSync(searchableSelectPath, "utf8");

  assert.match(selectSource, /onSelectNext\s*=\s*null/, "SearchableSelect accepts onSelectNext prop");
  assert.match(selectSource, /onSelectNext\(e\)/, "SearchableSelect triggers onSelectNext on Enter/Tab");
});

test("Create Purchase Navigation: Requirement 2 - Party (Supplier) SearchableSelect wired with inputRef and onSelectNext", () => {
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");

  assert.match(purchasesSource, /const\s+vendorInputRef\s*=\s*useRef\(null\)/, "vendorInputRef is defined");
  assert.match(purchasesSource, /<SearchableSelect[\s\S]*?inputRef=\{vendorInputRef\}/, "vendorInputRef passed to Supplier SearchableSelect");
  assert.match(purchasesSource, /<SearchableSelect[\s\S]*?onSelectNext=\{handleVendorNext\}/, "Supplier SearchableSelect wires onSelectNext");
  assert.match(purchasesSource, /const\s+handleVendorNext\s*=\s*useCallback\(/, "handleVendorNext is defined");
});

test("Create Purchase Navigation: Requirement 3 - Sequential Enter/Tab key navigation from Party -> Purchaser Name/Date -> Branch -> Universal Scan Field", () => {
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");

  // Purchaser Name & CNIC refs and onKeyDown
  assert.match(purchasesSource, /const\s+purchaserNameInputRef\s*=\s*useRef\(null\)/, "purchaserNameInputRef is defined");
  assert.match(purchasesSource, /const\s+purchaserCnicInputRef\s*=\s*useRef\(null\)/, "purchaserCnicInputRef is defined");
  assert.match(purchasesSource, /const\s+purchaseDateInputRef\s*=\s*useRef\(null\)/, "purchaseDateInputRef is defined");

  // Purchaser Name handles Enter/Tab
  assert.match(purchasesSource, /ref=\{purchaserNameInputRef\}[\s\S]*?e\.key\s*===\s*["']Enter["']\s*\|\|\s*\(e\.key\s*===\s*["']Tab["']\s*&&\s*!e\.shiftKey\)/, "Purchaser Name handles Enter and forward Tab");

  // Purchaser CNIC handles Enter/Tab
  assert.match(purchasesSource, /ref=\{purchaserCnicInputRef\}[\s\S]*?e\.key\s*===\s*["']Enter["']\s*\|\|\s*\(e\.key\s*===\s*["']Tab["']\s*&&\s*!e\.shiftKey\)/, "Purchaser CNIC handles Enter and forward Tab");

  // Purchase Date handles Enter/Tab and focuses branch (firstFieldRef)
  assert.match(purchasesSource, /ref=\{purchaseDateInputRef\}[\s\S]*?firstFieldRef\.current\.focus\(\)/, "Purchase Date moves focus to branch (firstFieldRef) on Enter/Tab");

  // Branch (firstFieldRef) handles Enter/Tab and focuses Universal Scan Field
  assert.match(purchasesSource, /ref=\{firstFieldRef\}[\s\S]*?focusUniversalScanField\(\)/, "Branch select moves focus to Universal Scan Field on Enter/Tab");
});

test("Create Purchase Navigation: Requirement 4 - When a product is added into cart, focus returns to Universal Scan Field", () => {
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");

  // addProductToCart calls focusUniversalScanField
  assert.match(purchasesSource, /function\s+addProductToCart[\s\S]*?focusUniversalScanField\(\)/, "addProductToCart returns focus to universal scan field");

  // addPhoneToCart calls focusUniversalScanField
  assert.match(purchasesSource, /function\s+addPhoneToCart[\s\S]*?focusUniversalScanField\(\)/, "addPhoneToCart returns focus to universal scan field");

  // UniversalEntryRow onAddItem calls focusUniversalScanField
  assert.match(purchasesSource, /<UniversalEntryRow[\s\S]*?onAddItem=\{[\s\S]*?focusUniversalScanField\(\)/, "UniversalEntryRow onAddItem returns focus to universal scan field");

  // Cart table inputs refocus universal scan field on Enter
  assert.match(purchasesSource, /className=["']purchase-table-qty-input["'][\s\S]*?focusUniversalScanField\(\)/, "Qty table input refocuses scan field on Enter");
  assert.match(purchasesSource, /className=["']purchase-table-rate-input["'][\s\S]*?focusUniversalScanField\(\)/, "Rate table input refocuses scan field on Enter");
});
