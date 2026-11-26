import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const purchasesPagePath = path.resolve(__dirname, "../src/pages/PurchasesPage.jsx");

test("Purchase page — compact inward counter layout requirements", () => {
  const source = fs.readFileSync(purchasesPagePath, "utf8");

  // 1. REMOVE: Tall scanner heading block and "Auto-detects..." subtitle
  assert.doesNotMatch(
    source,
    /Universal Scanner & Search Field/,
    "Tall scanner heading 'Universal Scanner & Search Field' must be removed"
  );
  assert.doesNotMatch(
    source,
    /Auto-detects Barcodes, QR tags, Phone IMEIs & Live Product\/Model Search/,
    "Subtitle 'Auto-detects Barcodes...' must be removed"
  );
  assert.doesNotMatch(
    source,
    /Auto-detects/i,
    "No 'Auto-detects' text should remain on the page"
  );

  // 2. ROW 1: Purchase info (Vendor, Purchase Date, Destination Outlet)
  assert.match(
    source,
    /pos-purchase-row-1/,
    "Row 1 container must be present"
  );
  assert.match(
    source,
    /value=\{form\.vendorId\}/,
    "Row 1 must bind to form.vendorId"
  );
  assert.match(
    source,
    /value=\{form\.purchaseDate\}/,
    "Row 1 must bind to form.purchaseDate"
  );
  assert.match(
    source,
    /value=\{form\.branchId\}/,
    "Row 1 must bind to form.branchId"
  );
  assert.match(
    source,
    /ref=\{firstFieldRef\}/,
    "Destination Outlet in Row 1 must retain ref={firstFieldRef}"
  );

  // Pack #15 rule: when no vendor, purchaserName and purchaserCnic appear in Row 1
  assert.match(
    source,
    /!form\.vendorId\s*&&/,
    "Row 1 must conditionally render purchaser info when no vendor is selected"
  );
  assert.match(
    source,
    /value=\{form\.purchaserName\}/,
    "Row 1 must bind to form.purchaserName"
  );
  assert.match(
    source,
    /value=\{form\.purchaserCnic\}/,
    "Row 1 must bind to form.purchaserCnic"
  );

  // No duplicate Vendor Profile Card in checkout sidebar
  assert.doesNotMatch(
    source,
    /t\("purchases\.vendor_profile_title",\s*"Vendor Profile"\)/,
    "Duplicate Vendor Profile Card in sidebar must be removed"
  );

  // 3. ROW 2: Scanner row (universal scanner field + Add button)
  assert.match(
    source,
    /ref=\{comboboxContainerRef\}/,
    "Row 2 must retain comboboxContainerRef for attached dropdown"
  );
  assert.match(
    source,
    /ref=\{scannerInputRef\}/,
    "Row 2 scanner input must retain ref={scannerInputRef}"
  );
  assert.match(
    source,
    /value=\{universalScanInput\}/,
    "Row 2 scanner input must bind to universalScanInput"
  );
  assert.match(
    source,
    /handleAddAction/,
    "Row 2 must use handleAddAction for Enter and Add button"
  );
  assert.match(
    source,
    /onClick=\{handleAddAction\}/,
    "Add button in Row 2 must trigger handleAddAction"
  );
  assert.match(
    source,
    />\s*\{isUrdu \? "شامل کریں" : "Add"\}\s*<\/button>/,
    "Row 2 Add button must render 'Add' label"
  );

  // 4. Cart panel header contains Quick-create buttons
  assert.match(
    source,
    /purchase-cart-panel-header/,
    "Cart panel header must be present"
  );
  assert.match(
    source,
    /Quick Add New Model/,
    "Cart panel header must contain 'Quick Add New Model' button"
  );
  assert.match(
    source,
    /Add Product\/Accessories/,
    "Cart panel header must contain 'Add Product/Accessories' button"
  );
  assert.match(
    source,
    /setShowQuickModelModal\(true\)/,
    "Quick Add New Model must trigger setShowQuickModelModal(true)"
  );
  assert.match(
    source,
    /setShowQuickProductModal\(true\)/,
    "Add Product/Accessories must trigger setShowQuickProductModal(true)"
  );

  // Exactly 1 instance of setShowQuickModelModal and setShowQuickProductModal in new purchase form
  const quickModelMatches = source.match(/setShowQuickModelModal\(true\)/g) || [];
  const quickProductMatches = source.match(/setShowQuickProductModal\(true\)/g) || [];
  assert.equal(quickModelMatches.length, 1, "Must have exactly 1 Quick Add Model trigger, no duplicates");
  assert.equal(quickProductMatches.length, 1, "Must have exactly 1 Quick Add Product trigger, no duplicates");

  // 5. Order of sections: Row 1 -> Entry Row (pos-scanner-bar) -> Products List (pos-cart-wrap) -> Payment Strip (purchase-payment-strip)
  const idxRow1 = source.indexOf("pos-purchase-row-1");
  const idxRow2 = source.indexOf("pos-scanner-bar");
  const idxCart = source.indexOf("pos-cart-wrap");
  const idxPayment = source.indexOf("purchase-payment-strip");

  assert.ok(idxRow1 !== -1 && idxRow2 !== -1 && idxCart !== -1 && idxPayment !== -1, "All 4 sections must be present");
  assert.ok(idxRow1 < idxRow2, "Row 1 must come before Entry Row");
  assert.ok(idxRow2 < idxCart, "Entry Row must come before pos-cart-wrap");
  assert.ok(idxCart < idxPayment, "pos-cart-wrap must come before payment strip");

  // 6. Payment strip requirements
  assert.doesNotMatch(
    source,
    /grand\s*total/i,
    "'Grand Total' must not appear anywhere on this page"
  );
  assert.match(
    source,
    /Save Vendor Purchase/,
    "Save button must be labelled 'Save Vendor Purchase'"
  );
  assert.match(
    source,
    /Exact Net/,
    "Exact Net button must be present beside Paid Amount"
  );
});
