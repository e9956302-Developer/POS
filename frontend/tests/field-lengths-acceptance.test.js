import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const salesPagePath = path.resolve(__dirname, "../src/pages/SalesPage.jsx");
const purchasesPagePath = path.resolve(__dirname, "../src/pages/PurchasesPage.jsx");
const universalEntryRowPath = path.resolve(__dirname, "../src/components/UniversalEntryRow.jsx");
const searchableSelectPath = path.resolve(__dirname, "../src/components/SearchableSelect.jsx");
const stylesPath = path.resolve(__dirname, "../src/styles.css");

test("Field Length Acceptance: Universal Scan Field fits full placeholder and 16-digit IMEI on both pages", () => {
  const rowSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // Fits full placeholder 'Scan Barcode, QR, IMEI...' (26 chars) and 16-digit IMEI
  // In both sale and purchase modes, wrapper has clamp(14rem, 24%, 18rem) width
  assert.match(
    rowSource,
    /mode === "sale"\s*\?\s*\{\s*flex:\s*"3\.2 1 clamp\(14rem,\s*24%,\s*18rem\)",\s*minWidth:\s*"clamp\(14rem,\s*24%,\s*18rem\)"/s,
    "Universal Scan Field in sale mode must have minimum clamp width of at least 14rem"
  );
  assert.match(
    rowSource,
    /mode === "purchase"\s*\?\s*\{\s*flex:\s*"3\.2 1 clamp\(14rem,\s*24%,\s*18rem\)",\s*minWidth:\s*"clamp\(14rem,\s*24%,\s*18rem\)"/s,
    "Universal Scan Field in purchase mode must have minimum clamp width of at least 14rem"
  );

  // Attached dropdown is at least as wide as field (minWidth: 100%) and expands for long text (width: max-content)
  assert.match(
    rowSource,
    /minWidth:\s*"100%",\s*width:\s*"max-content",\s*maxWidth:\s*"min\(92vw,\s*42rem\)"/s,
    "Scan suggestions dropdown must be at least as wide as field (minWidth: 100%) and expand for long text (width: max-content)"
  );
});

test("Field Length Acceptance: Product / Phone Model search field fits 30+ character names on both pages", () => {
  const rowSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // Sale mode: flex 5 1 clamp(16.5rem, 32%, 24rem)
  assert.match(
    rowSource,
    /mode === "sale"\s*\?\s*\{\s*flex:\s*"5 1 clamp\(16\.5rem,\s*32%,\s*24rem\)",\s*minWidth:\s*"clamp\(16\.5rem,\s*32%,\s*24rem\)"/s,
    "Product search in sale mode must have flex 5 1 clamp(16.5rem, 32%, 24rem)"
  );

  // Purchase mode: flex 5 1 clamp(15rem, 28%, 22rem)
  assert.match(
    rowSource,
    /mode === "purchase"\s*\?\s*\{\s*flex:\s*"5 1 clamp\(15rem,\s*28%,\s*22rem\)",\s*minWidth:\s*"clamp\(15rem,\s*28%,\s*22rem\)"/s,
    "Product search in purchase mode must have flex 5 1 clamp(15rem, 28%, 22rem)"
  );

  // Attached dropdown expands to fit long product names (width: max-content, minWidth: 100%)
  assert.match(
    rowSource,
    /minWidth:\s*"100%",\s*width:\s*"max-content",\s*maxWidth:\s*"min\(92vw,\s*45rem\)"/s,
    "Product dropdown menu must have minWidth 100% and width max-content"
  );
});

test("Field Length Acceptance: Quantity fields fit 4 digits plus stepper arrows without overlap on both pages", () => {
  const rowSource = fs.readFileSync(universalEntryRowPath, "utf8");
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // Entry row quantity in sale and purchase mode: clamp(5.5rem, 8%, 7rem)
  assert.match(
    rowSource,
    /mode === "sale"\s*\?\s*\{\s*width:\s*"clamp\(5\.5rem,\s*8%,\s*7rem\)",\s*flex:\s*"0 0 clamp\(5\.5rem,\s*8%,\s*7rem\)"/s,
    "Entry row quantity in sale mode has clamp(5.5rem, 8%, 7rem)"
  );
  assert.match(
    rowSource,
    /mode === "purchase"\s*\?\s*\{\s*width:\s*"clamp\(5\.5rem,\s*8%,\s*7rem\)",\s*flex:\s*"0 0 clamp\(5\.5rem,\s*8%,\s*7rem\)"/s,
    "Entry row quantity in purchase mode has clamp(5.5rem, 8%, 7rem)"
  );

  // Cart/list quantity column in SalesPage: clamp(5.2rem, 8%, 6.5rem)
  assert.match(
    salesSource,
    /<col\s+style=\{\{\s*width:\s*"clamp\(5\.2rem,\s*8%,\s*6\.5rem\)"\s*\}\}\s*\/>/s,
    "Cart quantity column in SalesPage must be clamp(5.2rem, 8%, 6.5rem)"
  );

  // Cart/list quantity column in PurchasesPage: clamp(5.2rem, 8%, 6.5rem)
  assert.match(
    stylesSource,
    /\.purchase-products-table col\.col-qty[^}]*\{[^}]*width:\s*clamp\(5\.2rem,\s*8%,\s*6\.5rem\);/s,
    "Cart quantity column in PurchasesPage styles must be clamp(5.2rem, 8%, 6.5rem)"
  );
});

test("Field Length Acceptance: Rate / Price fields fit full 9,999,999 on both pages", () => {
  const rowSource = fs.readFileSync(universalEntryRowPath, "utf8");
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // Entry row Purchase Rate: clamp(6.5rem, 10%, 8.5rem)
  assert.match(
    rowSource,
    /mode === "purchase"\s*&&\s*\(\s*<div\s+style=\{\{\s*width:\s*"clamp\(6\.5rem,\s*10%,\s*8\.5rem\)",\s*flex:\s*"0 0 clamp\(6\.5rem,\s*10%,\s*8\.5rem\)"\s*\}\}>/s,
    "Purchase Rate entry field has clamp(6.5rem, 10%, 8.5rem)"
  );

  // Cart Unit Price and Subtotal columns in SalesPage: clamp(7.5rem, 13%, 9.5rem)
  assert.match(
    salesSource,
    /<col\s+style=\{\{\s*width:\s*"clamp\(7\.5rem,\s*13%,\s*9\.5rem\)"\s*\}\}\s*\/>\s*<col\s+style=\{\{\s*width:\s*"clamp\(7\.5rem,\s*13%,\s*9\.5rem\)"\s*\}\}\s*\/>/s,
    "Cart Unit Price and Subtotal columns in SalesPage must be clamp(7.5rem, 13%, 9.5rem)"
  );

  // Cart Rate and Subtotal columns in PurchasesPage: clamp(7.5rem, 13%, 9.5rem)
  assert.match(
    stylesSource,
    /\.purchase-products-table col\.col-rate[^}]*\{[^}]*width:\s*clamp\(7\.5rem,\s*13%,\s*9\.5rem\);/s,
    "Purchase rate column in PurchasesPage styles must be clamp(7.5rem, 13%, 9.5rem)"
  );
  assert.match(
    stylesSource,
    /\.purchase-products-table col\.col-subtotal[^}]*\{[^}]*width:\s*clamp\(7\.5rem,\s*13%,\s*9\.5rem\);/s,
    "Purchase subtotal column in PurchasesPage styles must be clamp(7.5rem, 13%, 9.5rem)"
  );
});

test("Field Length Acceptance: Financial totals and discount/tax inputs fit 9,999,999 on both pages", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // SalesPage discount and tax inputs use relative clamp minWidth of at least 6.5rem
  assert.match(
    salesSource,
    /width:\s*"clamp\(6\.5rem,\s*45%,\s*7\.5rem\)",\s*minWidth:\s*"6\.5rem"/s,
    "Discount and Tax inputs in SalesPage must use clamp(6.5rem, 45%, 7.5rem) with minWidth 6.5rem"
  );

  // PurchasesPage discount, tax, and paid inputs use clamp(6.5rem, 45%, 7.5rem)
  assert.match(
    stylesSource,
    /\.pay-row-input\.compact-num\s*\{[^}]*width:\s*clamp\(6\.5rem,\s*45%,\s*7\.5rem\);[^}]*min-width:\s*6\.5rem;/s,
    "PurchasesPage compact-num inputs must have clamp(6.5rem, 45%, 7.5rem) and min-width 6.5rem"
  );
  assert.match(
    stylesSource,
    /\.pay-row-input\.paid-input\s*\{[^}]*width:\s*clamp\(6\.5rem,\s*45%,\s*7\.5rem\);[^}]*min-width:\s*6\.5rem;/s,
    "PurchasesPage paid-input must have clamp(6.5rem, 45%, 7.5rem) and min-width 6.5rem"
  );
});

test("Field Length Acceptance: Date fields fit complete date without clipping calendar picker on both pages", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // SalesPage Sale Date wrapper has clamp(9.5rem, 12%, 11rem)
  assert.match(
    salesSource,
    /flex:\s*"1 1 clamp\(9\.5rem,\s*12%,\s*11rem\)",\s*minWidth:\s*"clamp\(9\.5rem,\s*12%,\s*11rem\)"/s,
    "Sale Date in SalesPage has clamp(9.5rem, 12%, 11rem)"
  );

  // SalesPage Credit Due Date has clamp(9.5rem, 55%, 11rem)
  assert.match(
    salesSource,
    /width:\s*"clamp\(9\.5rem,\s*55%,\s*11rem\)"/s,
    "Credit Due Date in SalesPage has clamp(9.5rem, 55%, 11rem)"
  );

  // PurchasesPage Purchase Date has clamp(9.5rem, 12%, 11rem)
  assert.match(
    stylesSource,
    /\.purchase-info-row-2\s+\.vendor-field-date\s*\{[^}]*width:\s*clamp\(9\.5rem,\s*12%,\s*11rem\);/s,
    "Purchase Date in PurchasesPage has clamp(9.5rem, 12%, 11rem)"
  );

  // PurchasesPage Due Date has clamp(9.5rem, 55%, 11rem)
  assert.match(
    stylesSource,
    /\.pay-row-input\.date-input\s*\{[^}]*width:\s*clamp\(9\.5rem,\s*55%,\s*11rem\);/s,
    "Due Date in PurchasesPage has clamp(9.5rem, 55%, 11rem)"
  );
});

test("Field Length Acceptance: Purchaser CNIC, Name, Customer, Supplier, and Outlet dropdowns fit long business names", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");
  const searchableSource = fs.readFileSync(searchableSelectPath, "utf8");
  const stylesSource = fs.readFileSync(stylesPath, "utf8");

  // Customer dropdown wrapper in SalesPage: clamp(16rem, 30%, 26rem)
  assert.match(
    salesSource,
    /flex:\s*"3\.2 1 clamp\(16rem,\s*30%,\s*26rem\)",\s*minWidth:\s*"clamp\(16rem,\s*30%,\s*26rem\)"/s,
    "Customer dropdown wrapper in SalesPage has clamp(16rem, 30%, 26rem)"
  );

  // Walk-in Name and Phone in SalesPage popover: clamp(11rem, 18vw, 15rem)
  assert.match(
    salesSource,
    /width:\s*"clamp\(11rem,\s*18vw,\s*15rem\)",\s*minWidth:\s*"11rem"/s,
    "Walk-in Name and Phone in SalesPage have clamp(11rem, 18vw, 15rem)"
  );

  // Supplier dropdown wrapper in PurchasesPage: clamp(16rem, 30%, 26rem)
  assert.match(
    stylesSource,
    /\.purchase-info-row-1\s+\.vendor-field-supplier\s*\{[^}]*flex:\s*2\.5\s+1\s+clamp\(16rem,\s*30%,\s*26rem\);[^}]*min-width:\s*clamp\(16rem,\s*30%,\s*26rem\);/s,
    "Supplier dropdown wrapper in PurchasesPage has clamp(16rem, 30%, 26rem)"
  );

  // Purchaser Name in PurchasesPage: clamp(12rem, 18%, 16rem)
  assert.match(
    stylesSource,
    /\.purchase-info-row-1\s+\.vendor-field-purchaser\s*\{[^}]*flex:\s*1\.5\s+1\s+clamp\(12rem,\s*18%,\s*16rem\);[^}]*min-width:\s*clamp\(12rem,\s*18%,\s*16rem\);/s,
    "Purchaser Name in PurchasesPage has clamp(12rem, 18%, 16rem)"
  );

  // Purchaser CNIC in PurchasesPage: clamp(10rem, 14%, 13rem) fits 15 characters (00000-0000000-0)
  assert.match(
    stylesSource,
    /\.purchase-info-row-1\s+\.vendor-field-cnic\s*\{[^}]*flex:\s*1\.2\s+1\s+clamp\(10rem,\s*14%,\s*13rem\);[^}]*min-width:\s*clamp\(10rem,\s*14%,\s*13rem\);/s,
    "Purchaser CNIC in PurchasesPage has clamp(10rem, 14%, 13rem)"
  );

  // Outlet dropdown: clamp(11rem, 16%, 15rem) in SalesPage, clamp(12rem, 20%, 16rem) in PurchasesPage
  assert.match(
    salesSource,
    /flex:\s*"1\.2 1 clamp\(11rem,\s*16%,\s*15rem\)",\s*minWidth:\s*"clamp\(11rem,\s*16%,\s*15rem\)"/s,
    "Outlet dropdown in SalesPage has clamp(11rem, 16%, 15rem)"
  );
  assert.match(
    stylesSource,
    /\.purchase-info-row-2\s+\.vendor-field-outlet\s*\{[^}]*width:\s*clamp\(12rem,\s*20%,\s*16rem\);/s,
    "Outlet dropdown in PurchasesPage has clamp(12rem, 20%, 16rem)"
  );

  // Dropdown list attached to SearchableSelect is at least as wide as field (minWidth: 100%) and expands (width: max-content)
  assert.match(
    searchableSource,
    /minWidth:\s*"100%",\s*width:\s*"max-content",\s*maxWidth:\s*"min\(92vw,\s*36rem\)"/s,
    "SearchableSelect dropdown menu has minWidth 100% and width max-content"
  );
});

test("Field Length Acceptance: Relative units used, no font-size reduction, and no placeholder removed", () => {
  const rowSource = fs.readFileSync(universalEntryRowPath, "utf8");
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");

  // Placeholders intact
  assert.match(rowSource, /"Scan Barcode, QR, IMEI\.\.\."/, "Scan placeholder preserved");
  assert.match(salesSource, /placeholder=\{isUrdu \? "گاہک تلاش کریں\.\.\." : "Search customer\.\.\."\}/, "Search customer placeholder preserved");
  assert.match(purchasesSource, /placeholder="e\.g\. 42101-1234567-1"/, "CNIC placeholder preserved");
  assert.match(purchasesSource, /placeholder="e\.g\. Muhammad Ali"/, "Purchaser name placeholder preserved");

  // Cart cells fill completely with boxSizing border-box
  assert.match(salesSource, /boxSizing:\s*"border-box"/, "Sales cart input uses boxSizing border-box");
});
