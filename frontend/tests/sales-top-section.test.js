import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const salesPagePath = path.resolve(__dirname, "../src/pages/SalesPage.jsx");

test("Sale Counter page — compact top section requirements", () => {
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
    "Short scanner heading 'Universal Scanner' must be removed"
  );

  // 2. PUT IN THAT EXACT SPACE: One compact row, three fields (Customer info, Sale Date, Store Outlet)
  assert.match(
    source,
    /pos-sale-row-1/,
    "Top sale info row container must be present"
  );
  assert.match(
    source,
    /value=\{form\.customerId\}/,
    "Row must bind Customer info to form.customerId"
  );
  assert.match(
    source,
    /value=\{form\.saleDate\}/,
    "Row must bind Sale Date to form.saleDate"
  );
  assert.match(
    source,
    /value=\{form\.branchId\}/,
    "Row must bind Store Outlet to form.branchId"
  );

  // No duplicate Customer Box in checkout sidebar
  assert.doesNotMatch(
    source,
    /t\("sales\.registered_account",\s*"Select Account Customer"\)/,
    "Duplicate Customer Box in checkout sidebar must be removed"
  );

  // 3. SCANNER FIELD DIRECTLY BELOW ROW: unchanged pipeline, attached dropdown, same add action
  assert.match(
    source,
    /ref=\{comboboxContainerRef\}/,
    "Scanner row must retain comboboxContainerRef for attached dropdown"
  );
  assert.match(
    source,
    /ref=\{scannerInputRef\}/,
    "Scanner input must retain ref={scannerInputRef}"
  );
  assert.match(
    source,
    /value=\{universalScanInput\}/,
    "Scanner input must bind to universalScanInput"
  );
  assert.match(
    source,
    /handleAddAction/,
    "Scanner row must use handleAddAction for Enter and Add button"
  );
  assert.match(
    source,
    />\s*\{isUrdu \? "شامل کریں" : "Add"\}\s*<\/button>/,
    "Scanner row Add button must render 'Add' label"
  );

  // 4. Do NOT add a "Quick Add New Model" / "Add Product/Accessories" button row to this page
  assert.doesNotMatch(
    source,
    /Quick Add New Model/,
    "Sale Counter page must NOT have 'Quick Add New Model' button"
  );
  assert.doesNotMatch(
    source,
    /pos-sale-row-3/,
    "Sale Counter page must NOT have row 3 quick-create buttons"
  );

  // 5. Order of rows: Sale Info Row -> Scanner Row -> Cart Table
  const idxRow1 = source.indexOf("pos-sale-row-1");
  const idxScanner = source.indexOf("pos-scanner-bar");
  const idxCart = source.indexOf("pos-cart-wrap");

  assert.ok(idxRow1 !== -1 && idxScanner !== -1 && idxCart !== -1, "Sale info row, scanner row, and cart must be present");
  assert.ok(idxRow1 < idxScanner, "Sale info row must come before scanner row");
  assert.ok(idxScanner < idxCart, "Scanner row must come directly before pos-cart-wrap");

  // 6. Sticky checkout sidebar & stable Complete Sale button preserved (Pack #20)
  assert.match(source, /pos-checkout-sidebar/, "Sticky checkout sidebar must remain");
  assert.match(source, /t\("sales\.complete_sale",\s*"Complete Sale"\)/, "Stable 'Complete Sale' label preserved");
});
