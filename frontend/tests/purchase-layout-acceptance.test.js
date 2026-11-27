import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const purchasesPagePath = path.resolve(__dirname, "../src/pages/PurchasesPage.jsx");
const entryRowPath = path.resolve(__dirname, "../src/components/UniversalEntryRow.jsx");
const stylesPath = path.resolve(__dirname, "../src/styles.css");
const classicLayoutPath = path.resolve(__dirname, "../src/components/layouts/ClassicLayout.jsx");
const modernLayoutPath = path.resolve(__dirname, "../src/components/layouts/ModernLayout.jsx");
const executiveLayoutPath = path.resolve(__dirname, "../src/components/layouts/ExecutiveLayout.jsx");

test("Acceptance Criterion 1: Fixed-height non-scrolling layout, 2 info rows, sidebar rail, right-side panel", () => {
  const stylesSource = fs.readFileSync(stylesPath, "utf8");
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");

  // Media query >= 64rem (1024px) enforces 100dvh and no page scrolling
  assert.match(
    stylesSource,
    /\.app-shell\.purchase-counter-active\s*\{[^}]*height:\s*100dvh\s*!important;[^}]*overflow:\s*hidden\s*!important/s,
    "Shell must enforce 100dvh and overflow hidden at >= 64rem"
  );
  assert.match(
    stylesSource,
    /\.purchase-counter-form\s*\{[^}]*height:\s*100%\s*!important;/s,
    "Purchase counter form must be 100% height"
  );
  assert.match(
    stylesSource,
    /\.purchase-counter-form\s*\{[^}]*overflow:\s*hidden\s*!important;/s,
    "Purchase counter form must be overflow hidden"
  );

  // Exactly 2 purchaser info rows
  assert.match(
    purchasesSource,
    /pos-purchase-row-1 purchase-vendor-row purchase-info-row purchase-info-row-1/,
    "Row 1 container must be present"
  );
  assert.match(
    purchasesSource,
    /pos-purchase-row-2 purchase-info-row purchase-info-row-2/,
    "Row 2 container must be present"
  );

  // Row 1 & Row 2 min-height 3rem
  assert.match(
    stylesSource,
    /\.purchase-info-row\s*\{[^}]*min-height:\s*3rem;/s,
    "Purchaser info rows must have min-height 3rem"
  );

  // Date and Outlet in Row 2
  assert.match(
    stylesSource,
    /\.purchase-info-row-2\s+\.vendor-field-date\s*\{[^}]*width:\s*clamp\(8rem,\s*12%,\s*10rem\);/s,
    "Row 2 date must be clamp(8rem, 12%, 10rem)"
  );
  assert.match(
    stylesSource,
    /\.purchase-info-row-2\s+\.vendor-field-outlet\s*\{[^}]*width:\s*clamp\(11rem,\s*18%,\s*15rem\);/s,
    "Row 2 outlet must be clamp(11rem, 18%, 15rem)"
  );

  // No page title block under breadcrumb
  assert.doesNotMatch(
    purchasesSource,
    /<h[123][^>]*>\s*Create Purchase\s*\(Inward Counter\)\s*<\/h[123]>/i,
    "No page title block should appear under breadcrumb"
  );

  // Sidebar icon rail on Purchase page only
  assert.match(
    stylesSource,
    /\.sidebar\.is-rail,\s*\.modern-sidebar\.is-rail,\s*\.executive-sidebar\.is-rail\s*\{[^}]*width:\s*clamp\(3\.5rem,\s*6vw,\s*4\.5rem\)\s*!important;/s,
    "Sidebar icon rail must be clamp(3.5rem, 6vw, 4.5rem)"
  );
  assert.match(
    stylesSource,
    /\.app-shell\.purchase-counter-active:not\(\.rail-overlay-active\)\s*\{[^}]*grid-template-columns:\s*clamp\(3\.5rem,\s*6vw,\s*4\.5rem\)\s+minmax\(0,\s*1fr\)\s*!important;/s,
    "Shell grid must adjust to icon rail width on Purchase page"
  );
  assert.match(
    stylesSource,
    /\.app-shell\.purchase-counter-active\.rail-overlay-active\s*\{[^}]*grid-template-columns:\s*clamp\(3\.5rem,\s*6vw,\s*4\.5rem\)\s+minmax\(0,\s*1fr\)\s*!important;/s,
    "Overlay mode must keep content width unchanged"
  );

  // Right-side payment panel fixed clamp width clamp(17rem, 23%, 20rem)
  assert.match(
    stylesSource,
    /\.purchase-checkout-panel\s*\{[^}]*width:\s*clamp\(17rem,\s*23%,\s*20rem\)\s*!important;/s,
    "Payment panel must be clamp(17rem, 23%, 20rem)"
  );
});

test("Acceptance Criterion 2: 15 items in cart internally scrollable, sticky table header, pinned save button", () => {
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // Cart body scrollable internally
  assert.match(
    stylesSource,
    /\.purchase-cart-scroll-body\s*\{[^}]*overflow-y:\s*auto\s*!important;[^}]*overflow-x:\s*hidden\s*!important;/s,
    "Cart scroll body must have internal vertical scroll"
  );

  // Sticky table header
  assert.match(
    stylesSource,
    /\.purchase-products-table\s+thead\s+th\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/s,
    "Table thead th must be sticky at top: 0"
  );

  // Pinned Save Button
  assert.match(
    stylesSource,
    /\.purchase-checkout-footer\s*\{[^}]*flex-shrink:\s*0;/s,
    "Payment footer containing Save button must have flex-shrink 0"
  );
  assert.match(
    stylesSource,
    /\.purchase-panel-save-btn\s*\{[^}]*min-height:\s*2\.75rem;/s,
    "Save button must have min-height 2.75rem"
  );
});

test("Acceptance Criterion 3: Maximized row visibility (slim row height ~2.25rem)", () => {
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // Table row height 2.25rem to ensure >= 6 rows at 1024x600 and >= 11 rows at 1366x768
  assert.match(
    stylesSource,
    /\.purchase-products-table\s+tbody\s+tr\s*\{[^}]*height:\s*2\.25rem;/s,
    "Table row height must be slim 2.25rem"
  );
});

test("Acceptance Criterion 4: Walk-in vs Supplier selection rules", () => {
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // Conditional rendering of Name and CNIC when !form.vendorId
  assert.match(
    purchasesSource,
    /\{!form\.vendorId\s*&&\s*\(\s*<>\s*<div\s+className="vendor-row-item\s+vendor-field-purchaser"/s,
    "Purchaser Name & CNIC are rendered only when !form.vendorId"
  );

  // Supplier expands across full width when selected
  assert.match(
    purchasesSource,
    /className=\{`vendor-row-item\s+vendor-field-supplier\s+\$\{form\.vendorId\s*\?\s*"supplier-full-width"\s*:\s*""\}`\}/s,
    "Supplier field has supplier-full-width class when form.vendorId is selected"
  );
  assert.match(
    stylesSource,
    /\.purchase-info-row-1\s+\.vendor-field-supplier\.supplier-full-width\s*\{[^}]*flex:\s*1\s+1\s+100%\s*!important;/s,
    "supplier-full-width must have flex 1 1 100%"
  );

  // Clearing supplier restores empty & required
  assert.match(
    purchasesSource,
    /function\s+handleVendorChange\(e\)\s*\{[^}]*vendorId:\s*vId,[^}]*purchaserName:\s*vId\s*\?\s*""\s*:\s*\(prev\.vendorId\s*\?\s*""\s*:\s*prev\.purchaserName\)/s,
    "handleVendorChange clears purchaser fields when vendor is selected or restored"
  );
});

test("Acceptance Criterion 5: Entry row relative proportions", () => {
  const entryRowSource = fs.readFileSync(entryRowPath, "utf8");

  // 1. Scan field ~25-30% (flex 3 1 12rem, minWidth 12rem)
  assert.match(
    entryRowSource,
    /mode === "sale" \|\| mode === "purchase"\s*\?\s*\{\s*flex:\s*"3 1 12rem",\s*minWidth:\s*"12rem",\s*position:\s*"relative"\s*\}/s,
    "Universal scan field in purchase mode must have flex 3 1 12rem and minWidth 12rem"
  );

  // 2. Product field widest ~40-45% (flex 5 1 14rem, minWidth 14rem)
  assert.match(
    entryRowSource,
    /mode === "sale" \|\| mode === "purchase"\s*\?\s*\{\s*flex:\s*"5 1 14rem",\s*minWidth:\s*"14rem",\s*position:\s*"relative"\s*\}/s,
    "Product search field in purchase mode must have flex 5 1 14rem and minWidth 14rem"
  );

  // 3. Quantity clamp(5.5rem, 8%, 7rem)
  assert.match(
    entryRowSource,
    /mode === "sale" \|\| mode === "purchase"\s*\?\s*\{\s*width:\s*"clamp\(5\.5rem,\s*8%,\s*7rem\)",\s*flex:\s*"0 0 clamp\(5\.5rem,\s*8%,\s*7rem\)"/s,
    "Quantity field in purchase mode must have clamp(5.5rem, 8%, 7rem) width"
  );

  // 4. Purchase Rate clamp(5.5rem, 8%, 7rem)
  assert.match(
    entryRowSource,
    /mode === "purchase"\s*&&\s*\(\s*<div\s+style=\{\{\s*width:\s*"clamp\(5\.5rem,\s*8%,\s*7rem\)",\s*flex:\s*"0 0 clamp\(5\.5rem,\s*8%,\s*7rem\)"\s*\}\}>/s,
    "Purchase Rate field must have clamp(5.5rem, 8%, 7rem) width"
  );
});

test("Acceptance Criterion 6: Financial calculations and Due Date rules", () => {
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");

  // Net = Subtotal - Discount + Tax
  assert.match(
    purchasesSource,
    /const\s+netAmount\s*=\s*subtotal\s*-\s*discountVal\s*\+\s*taxVal;/s,
    "netAmount must be subtotal - discountVal + taxVal"
  );

  // Balance Due = Net - Paid
  assert.match(
    purchasesSource,
    /const\s+balanceAmount\s*=\s*netAmount\s*-\s*paidVal;/s,
    "balanceAmount must be netAmount - paidVal"
  );

  // Due Date disabled & cleared when balance is 0, enabled & required when balance > 0
  assert.match(
    purchasesSource,
    /disabled=\{balanceAmount\s*<=\s*0\}/,
    "Due date input must be disabled when balanceAmount <= 0"
  );
  assert.match(
    purchasesSource,
    /required=\{balanceAmount\s*>\s*0\}/,
    "Due date input must be required when balanceAmount > 0"
  );
  assert.match(
    purchasesSource,
    /value=\{balanceAmount\s*<=\s*0\s*\?\s*""\s*:\s*form\.dueDate\}/,
    "Due date value must be cleared when balanceAmount <= 0"
  );
});

test("Acceptance Criterion 7: Exact labeling ('Tax (PKR)' once, no 'Grand Total', 'Save Vendor Purchase')", () => {
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");

  // Tax (PKR) label appears exactly once in JSX UI
  const taxLabelMatches = purchasesSource.match(/\{t\("sales\.tax",\s*"Tax \(PKR\)"\)\}/g) || [];
  assert.equal(taxLabelMatches.length, 1, "'Tax (PKR)' label must appear exactly once in UI");

  // Grand Total does not appear anywhere
  assert.doesNotMatch(
    purchasesSource,
    /grand\s*total/i,
    "'Grand Total' must not appear anywhere on this page"
  );

  // Save button reads strictly "Save Vendor Purchase"
  assert.match(
    purchasesSource,
    /isUrdu \? "خریداری محفوظ کریں" : "Save Vendor Purchase"/,
    "Save button must read strictly 'Save Vendor Purchase'"
  );
});

test("Acceptance Criterion 8: Keyboard flow (initial scan focus, F8, F9, F2/Ctrl+Enter, Esc)", () => {
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");

  // Initial focus on Universal Scan Field on mount
  assert.match(
    purchasesSource,
    /useEffect\(\(\)\s*=>\s*\{[^}]*if\s*\(activeTab\s*===\s*"new"\)\s*\{[^}]*focusUniversalScanField\(\);/s,
    "Initial focus must be set to Universal Scan Field on mount"
  );

  // F8 focuses scan field
  assert.match(
    purchasesSource,
    /if\s*\(e\.key\s*===\s*"F8"\)\s*\{[^}]*focusUniversalScanField\(\);/s,
    "F8 must focus Universal Scan Field"
  );

  // F9 focuses Paid Amount
  assert.match(
    purchasesSource,
    /else\s+if\s*\(e\.key\s*===\s*"F9"\)\s*\{[^}]*paidAmountInputRef\.current\.focus\(\);/s,
    "F9 must focus Paid Amount input"
  );

  // F2 or Ctrl+Enter submits
  assert.match(
    purchasesSource,
    /e\.key\s*===\s*"F2"\s*\|\|\s*\(\(e\.ctrlKey\s*\|\|\s*e\.metaKey\)\s*&&\s*e\.key\s*===\s*"Enter"\)/,
    "F2 or Ctrl+Enter must trigger form submission"
  );

  // Esc refocuses scan field when no dropdown open
  assert.match(
    purchasesSource,
    /else\s+if\s*\(e\.key\s*===\s*"Escape"\)\s*\{[^}]*focusUniversalScanField\(\);/s,
    "Escape must refocus Universal Scan Field when dropdown closed"
  );
});

test("Layout Sidebars: Flyouts highlight active purchase tab in Classic, Modern, and Executive layouts", () => {
  const classic = fs.readFileSync(classicLayoutPath, "utf8");
  const modern = fs.readFileSync(modernLayoutPath, "utf8");
  const executive = fs.readFileSync(executiveLayoutPath, "utf8");

  for (const [name, code] of [["Classic", classic], ["Modern", modern], ["Executive", executive]]) {
    assert.match(
      code,
      /sub\.key === "purchases_new"\s*&&\s*isPurchaseCounter/,
      `${name} layout flyout must highlight purchases_new when on purchase counter`
    );
    assert.match(
      code,
      /sub\.key === "purchases_history"\s*&&\s*activeTab === "purchases"\s*&&\s*activePurchaseSub === "history"/,
      `${name} layout flyout must highlight purchases_history when on purchases directory`
    );
  }
});
