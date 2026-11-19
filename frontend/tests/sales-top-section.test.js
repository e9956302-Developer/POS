import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const salesPagePath = path.resolve(__dirname, "../src/pages/SalesPage.jsx");

test("Sales Register page — compact top section requirements", () => {
  const source = fs.readFileSync(salesPagePath, "utf8");

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
  assert.doesNotMatch(
    source,
    /⚡ \{isUrdu \? "یونیورسل اسکینر" : "Universal Scanner"\}/,
    "Short scanner heading must also be completely removed"
  );

  // 2. ROW 1: Sale info (Customer info, Sale Date, Outlet / Branch)
  assert.match(
    source,
    /pos-sale-row-1/,
    "Row 1 container must be present"
  );
  assert.match(
    source,
    /value=\{form\.customerId\}/,
    "Row 1 must bind to form.customerId"
  );
  assert.match(
    source,
    /value=\{form\.saleDate\}/,
    "Row 1 must bind to form.saleDate"
  );
  assert.match(
    source,
    /value=\{form\.branchId\}/,
    "Row 1 must bind to form.branchId"
  );

  // No duplicate Customer Box in checkout sidebar
  assert.doesNotMatch(
    source,
    /t\("sales\.registered_account",\s*"Select Account Customer"\)/,
    "Duplicate Customer Box in checkout sidebar must be removed"
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
    />\s*\{isUrdu \? "شامل کریں" : "Add"\}\s*<\/button>/,
    "Row 2 Add button must render 'Add' label"
  );

  // 4. ROW 3: Quick-create buttons
  assert.match(
    source,
    /pos-sale-row-3/,
    "Row 3 container must be present"
  );
  assert.match(
    source,
    /Quick Add New Model/,
    "Row 3 must contain 'Quick Add New Model' button"
  );
  assert.match(
    source,
    /Add Product\/Accessories/,
    "Row 3 must contain 'Add Product/Accessories' button"
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

  // Exactly 1 instance of setShowQuickModelModal and setShowQuickProductModal in POS counter
  const quickModelMatches = source.match(/setShowQuickModelModal\(true\)/g) || [];
  const quickProductMatches = source.match(/setShowQuickProductModal\(true\)/g) || [];
  assert.equal(quickModelMatches.length, 1, "Must have exactly 1 Quick Add Model trigger, no duplicates");
  assert.equal(quickProductMatches.length, 1, "Must have exactly 1 Quick Add Product trigger, no duplicates");

  // 5. Order of rows: Row 1 -> Row 2 -> Row 3 -> Cart Table
  const idxRow1 = source.indexOf("pos-sale-row-1");
  const idxRow2 = source.indexOf("pos-scanner-bar");
  const idxRow3 = source.indexOf("pos-sale-row-3");
  const idxCart = source.indexOf("pos-cart-wrap");

  assert.ok(idxRow1 !== -1 && idxRow2 !== -1 && idxRow3 !== -1 && idxCart !== -1, "All 3 rows and cart must be present");
  assert.ok(idxRow1 < idxRow2, "Row 1 must come before Row 2");
  assert.ok(idxRow2 < idxRow3, "Row 2 must come before Row 3");
  assert.ok(idxRow3 < idxCart, "Row 3 must come before pos-cart-wrap");

  // 6. Sticky checkout sidebar & stable Complete Sale button preserved (Pack #20)
  assert.match(source, /pos-checkout-sidebar/, "Sticky checkout sidebar must remain");
  assert.match(source, /t\("sales\.complete_sale",\s*"Complete Sale"\)/, "Stable 'Complete Sale' label preserved");
});
