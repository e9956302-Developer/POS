import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const receiptModalPath = path.resolve(__dirname, "../src/components/ReceiptModal.jsx");
const stylesCssPath = path.resolve(__dirname, "../src/styles.css");
const purchasesPagePath = path.resolve(__dirname, "../src/pages/PurchasesPage.jsx");
const salesPagePath = path.resolve(__dirname, "../src/pages/SalesPage.jsx");
const backendPurchasesPath = path.resolve(__dirname, "../../backend/src/routes/modules/purchases.js");

test("ReceiptModal has printable-modal-backdrop and print trigger bindings", () => {
  const source = fs.readFileSync(receiptModalPath, "utf8");

  // 1. Must have printable-modal-backdrop to avoid display: none from .modal-backdrop:not(.printable-modal-backdrop)
  assert.match(
    source,
    /modal-backdrop\s+printable-modal-backdrop/,
    "ReceiptModal must include 'printable-modal-backdrop' in its outer backdrop"
  );

  // 2. Must contain printable-receipt-container
  assert.match(
    source,
    /printable-receipt-container/,
    "ReceiptModal must contain 'printable-receipt-container'"
  );

  // 3. Must handle purchase flow title and badges
  assert.match(
    source,
    /PURCHASE INWARD VOUCHER/,
    "ReceiptModal must handle purchase voucher badge"
  );

  // 4. Must support items extraction and resolution
  assert.match(
    source,
    /data\.items/,
    "ReceiptModal must process data.items"
  );

  // 5. Must support window.print
  assert.match(
    source,
    /window\.print\(\)/,
    "ReceiptModal must execute window.print()"
  );

  // 6. Must tag printing-receipt class during print
  assert.match(
    source,
    /printing-receipt/,
    "ReceiptModal must toggle printing-receipt class on body"
  );
});

test("CSS print styles do not blank receipts or standard reports", () => {
  const css = fs.readFileSync(stylesCssPath, "utf8");

  // 1. .modal-backdrop:not(.printable-modal-backdrop) hides non-printable modals
  assert.match(
    css,
    /\.modal-backdrop:not\(\.printable-modal-backdrop\)\s*\{\s*display:\s*none\s*!important;/,
    "Non-printable modals must be hidden in print"
  );

  // 2. .printable-modal-backdrop must be display: block !important
  assert.match(
    css,
    /\.printable-modal-backdrop\s*\{[\s\S]*?display:\s*block\s*!important;/,
    ".printable-modal-backdrop must be display: block in print"
  );

  // 3. Print isolation must target modals specifically rather than unconditionally hiding body *
  assert.match(
    css,
    /body:has\(\.printable-modal-backdrop\)\s*\*/,
    "Print isolation must target body:has(.printable-modal-backdrop)"
  );

  // 4. .printable-receipt-container must be visible and have max-height: none
  assert.match(
    css,
    /\.printable-receipt-container\s*\{[\s\S]*?max-height:\s*none\s*!important;/,
    ".printable-receipt-container must override max-height in print to prevent empty clipping"
  );
});

test("PurchasesPage and SalesPage integrate ReceiptModal with print isolation", () => {
  const purchasesSource = fs.readFileSync(purchasesPagePath, "utf8");
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // PurchasesPage renders ReceiptModal with type="purchase"
  assert.match(
    purchasesSource,
    /<ReceiptModal[\s\S]*?type=["']purchase["']/,
    "PurchasesPage must render ReceiptModal with type='purchase'"
  );

  // PurchasesPage has fallback items in catch block to ensure receipt is never empty
  assert.match(
    purchasesSource,
    /fallbackPurchase[\s\S]*?items:/,
    "PurchasesPage must provide fallback items if lookup fails"
  );

  // SalesPage receipt modal backdrop has printable-modal-backdrop
  assert.match(
    salesSource,
    /modal-backdrop\s+printable-modal-backdrop/,
    "SalesPage receipt modal must include printable-modal-backdrop"
  );
});

test("Backend purchases router returns items and branch details on create and fetch", () => {
  const backendSource = fs.readFileSync(backendPurchasesPath, "utf8");

  // GET /:id returns items and joins branches
  assert.match(
    backendSource,
    /b\.name AS branch_name/,
    "GET /:id must select branch_name"
  );

  // POST / returns items with the created purchase
  assert.match(
    backendSource,
    /res\.status\(201\)\.json\(\{\s*\.\.\.saved,\s*items:\s*savedItems\s*\}\)/,
    "POST / must return { ...saved, items: savedItems }"
  );
});
