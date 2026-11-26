import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const salesPagePath = path.resolve(__dirname, "../src/pages/SalesPage.jsx");
const universalEntryRowPath = path.resolve(__dirname, "../src/components/UniversalEntryRow.jsx");
const searchableSelectPath = path.resolve(__dirname, "../src/components/SearchableSelect.jsx");
const stylesPath = path.resolve(__dirname, "../src/styles.css");

test("Create Sale UX: Requirement 1 - Discount Option in POS Checkout & API payload", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // Discount row in pos-checkout-card
  assert.match(salesSource, /t\("sales\.discount",\s*"Discount"\)/, "Discount label rendered in checkout card");
  assert.match(salesSource, /setForm\(\{\s*\.\.\.form,\s*discountType:\s*"fixed"\s*\}\)/, "PKR fixed discount toggle supported");
  assert.match(salesSource, /setForm\(\{\s*\.\.\.form,\s*discountType:\s*"percentage"\s*\}\)/, "Percentage discount toggle supported");
  assert.match(salesSource, /value=\{form\.discountValue\}/, "Discount input binds to form.discountValue");

  // Grand total & payload integration
  assert.match(salesSource, /cartDiscountAmount/, "Calculates cartDiscountAmount");
  assert.match(salesSource, /discountType:\s*form\.discountType\s*\|\|\s*"fixed"/, "Passes discountType in createSale payload");
  assert.match(salesSource, /discountValue:\s*Number\(form\.discountValue\s*\|\|\s*0\)/, "Passes discountValue in createSale payload");
  assert.match(salesSource, /discountAmount:\s*cartDiscountAmount/, "Passes discountAmount in createSale payload");
});

test("Create Sale UX: Requirement 2 - Remove repetitive Create Sale (POS Counter) text & define sr-only", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // Repetitive text removed from page body
  assert.doesNotMatch(
    salesSource,
    /<span className="sr-only">\{t\("sales\.pos_counter",\s*"Create Sale \(POS Counter\)"\)\}<\/span>/,
    "Repetitive 'Create Sale (POS Counter)' span above customer info must be removed"
  );

  // sr-only CSS utility defined in styles.css
  assert.match(
    stylesSource,
    /\.sr-only\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?clip:\s*rect\(0,\s*0,\s*0,\s*0\);/,
    "sr-only utility class properly defined in styles.css"
  );
});

test("Create Sale UX: Requirement 3 - Sale Cart text smaller & tighter", () => {
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // Check pos-cart-wrap typography styling
  assert.match(stylesSource, /\.pos-cart-wrap\s*\{[\s\S]*?font-size:\s*0\.82rem/, "pos-cart-wrap base font size is compact");
  assert.match(stylesSource, /\.pos-cart-wrap\s+table\s*\{[\s\S]*?font-size:\s*0\.82rem/, "pos-cart-wrap table font size is compact");
  assert.match(stylesSource, /\.pos-cart-wrap\s+th\s*\{[\s\S]*?font-size:\s*0\.76rem/, "pos-cart-wrap header font size is compact");
});

test("Create Sale UX: Requirement 4 - Default focus on Customer field & no focus stealing", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const rowSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // customerInputRef defined and passed to SearchableSelect
  assert.match(salesSource, /const\s+customerInputRef\s*=\s*useRef\(null\)/, "customerInputRef is defined");
  assert.match(salesSource, /<SearchableSelect[\s\S]*?inputRef=\{customerInputRef\}/, "customerInputRef passed to Customer SearchableSelect");
  assert.match(salesSource, /customerInputRef\.current\.focus\(\)/, "Customer input focused on checkout tab active / mount");

  // UniversalEntryRow does not autofocus when mode === 'sale'
  assert.match(rowSource, /autoFocus=\{autoFocus\s*&&\s*mode\s*!==\s*["']sale["']\}/, "UniversalEntryRow does not steal focus in sale mode");
});

test("Create Sale UX: Requirement 5 - Enter/Tab key navigation flow to universal scan field & refocus on add", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const selectSource = fs.readFileSync(searchableSelectPath, "utf8");

  // SearchableSelect supports onSelectNext
  assert.match(selectSource, /onSelectNext\s*=\s*null/, "SearchableSelect accepts onSelectNext prop");
  assert.match(selectSource, /onSelectNext\(e\)/, "SearchableSelect triggers onSelectNext on Enter/Tab");

  // Customer onSelectNext moves to customerName or saleDate
  assert.match(salesSource, /onSelectNext=\{handleCustomerNext\}/, "Customer SearchableSelect wires onSelectNext");
  assert.match(salesSource, /const\s+handleCustomerNext\s*=/, "handleCustomerNext callback handles branch to name or date");

  // Customer Name / Phone / Date / Branch onKeyDown handles Enter/Tab
  assert.match(salesSource, /e\.key\s*===\s*["']Enter["']\s*\|\|\s*e\.key\s*===\s*["']Tab["']/, "Enter/Tab key detection wired");
  assert.match(salesSource, /focusUniversalScanField\(\)/, "Moves focus to universal scan field from top row");

  // onAddItem returns focus to scan field
  assert.match(salesSource, /onAddItem=\{\(item\)\s*=>\s*\{[\s\S]*?focusUniversalScanField\(\)/, "onAddItem returns focus to universal scan field");
});
