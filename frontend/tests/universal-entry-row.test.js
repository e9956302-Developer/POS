import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const universalEntryRowPath = path.resolve(__dirname, "../src/components/UniversalEntryRow.jsx");
const purchasesPagePath = path.resolve(__dirname, "../src/pages/PurchasesPage.jsx");
const salesPagePath = path.resolve(__dirname, "../src/pages/SalesPage.jsx");
const inventoryPagePath = path.resolve(__dirname, "../src/pages/InventoryPage.jsx");

// =====================================================================
// PART A: PRODUCT PURCHASE ENTRY ROW TESTS (P1 - P5)
// =====================================================================

test("P1: Purchase entry row fields [1..5] present in fixed order, Tab disabled, Enter moves forward, Left Arrow backward", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");
  const purchaseSource = fs.readFileSync(purchasesPagePath, "utf8");

  // 1. PurchasesPage renders UniversalEntryRow in purchase mode
  assert.match(
    purchaseSource,
    /<UniversalEntryRow[\s\S]*?mode=["']purchase["']/,
    "PurchasesPage must render UniversalEntryRow with mode='purchase'"
  );

  // 2. Fixed order in purchase mode:
  // [1] Scan Field -> [2] Product Dropdown -> [3] Quantity -> [4] Purchase Rate -> [5] Add Button
  const idxScan = componentSource.indexOf("ref={transferScannerInputRef}");
  const idxDropdown = componentSource.indexOf("ref={productDropdownInputRef}");
  const idxQty = componentSource.indexOf("ref={quantityInputRef}");
  const idxRate = componentSource.indexOf("ref={purchaseRateFieldRef}");
  const idxAdd = componentSource.indexOf("ref={addButtonRef}");

  assert.ok(idxScan !== -1 && idxDropdown !== -1 && idxQty !== -1 && idxRate !== -1 && idxAdd !== -1, "All 5 fields must exist");
  assert.ok(idxScan < idxDropdown, "[1] Scan field must precede [2] Product Dropdown");
  assert.ok(idxDropdown < idxQty, "[2] Product Dropdown must precede [3] Quantity");
  assert.ok(idxQty < idxRate, "[3] Quantity must precede [4] Purchase Rate");
  assert.ok(idxRate < idxAdd, "[4] Purchase Rate must precede [5] Add Button");

  // 3. Tab navigation disabled across all fields in the entry row
  const scanSection = componentSource.slice(idxScan, idxDropdown);
  const dropdownSection = componentSource.slice(idxDropdown, idxQty);
  const qtySection = componentSource.slice(idxQty, idxRate);
  const rateSection = componentSource.slice(idxRate, idxAdd);
  const addSection = componentSource.slice(idxAdd, componentSource.indexOf("</div>", idxAdd));

  assert.match(scanSection, /e\.key === ["']Tab["'][\s\S]*?e\.preventDefault\(\)/, "Scan field must disable Tab");
  assert.match(dropdownSection, /e\.key === ["']Tab["'][\s\S]*?e\.preventDefault\(\)/, "Dropdown field must disable Tab");
  assert.match(qtySection, /e\.key === ["']Tab["'][\s\S]*?e\.preventDefault\(\)/, "Quantity field must disable Tab");
  assert.match(rateSection, /e\.key === ["']Tab["'][\s\S]*?e\.preventDefault\(\)/, "Purchase Rate field must disable Tab");
  assert.match(addSection, /e\.key === ["']Tab["'][\s\S]*?e\.preventDefault\(\)/, "Add button must disable Tab");

  // 4. Enter moves forward:
  // Empty scan field Enter -> moves to Product Dropdown
  assert.match(scanSection, /productDropdownInputRef\.current\?\.focus\(\)/, "Empty scan field Enter moves to Product Dropdown");
  // Quantity Enter -> moves to Purchase Rate in purchase mode
  assert.match(qtySection, /purchaseRateFieldRef\.current\.focus\(\)/, "Quantity Enter moves to Purchase Rate");
  // Purchase Rate Enter -> moves to Add button
  assert.match(rateSection, /addBtnRef\.current\?\.focus\(\)/, "Purchase Rate Enter moves to Add Button");

  // 5. Left Arrow moves backward:
  // Add button Left Arrow -> moves to Purchase Rate
  assert.match(addSection, /purchaseRateFieldRef\.current(?:\?\.|\.)focus\(\)/, "Add button Left Arrow moves to Purchase Rate");
  // Purchase Rate Left Arrow -> moves to Quantity
  assert.match(rateSection, /qtyFieldRef\.current(?:\?\.|\.)focus\(\)/, "Purchase Rate Left Arrow moves to Quantity");
  // Quantity Left Arrow -> moves to Product Dropdown
  assert.match(qtySection, /productDropdownInputRef\.current(?:\?\.|\.)focus\(\)/, "Quantity Left Arrow moves to Product Dropdown");
  // Product Dropdown Left Arrow -> moves to Scan Field
  assert.match(dropdownSection, /transferScannerInputRef\.current(?:\?\.|\.)focus\(\)/, "Dropdown Left Arrow moves to Scan Field");
});

test("P2: Purchase scan jumps to Quantity (prefilled 1), Enter to Rate (prefilled/editable), Enter to Add, resets row and returns focus to Scan", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // Focus jumps to Quantity with prefilled 1 and highlighted select()
  assert.match(componentSource, /qtyFieldRef\.current\.focus\(\);\s*qtyFieldRef\.current\.select\?\.\(\);/, "Scan jumps focus to Quantity and highlights text");

  // Rate prefilled from product defined cost/purchase rate
  assert.match(componentSource, /setPurchaseRate\(String\(defaultRate\)\)/, "Purchase rate prefilled from costPrice");

  // Enter on Add button adds line, resets entry row, and returns focus to Scan Field
  assert.match(componentSource, /setSelectedEntryItem\(null\)/, "Resets selectedEntryItem on add");
  assert.match(componentSource, /setEntryQuantity\(["']1["']\)/, "Resets quantity to 1 on add");
  assert.match(componentSource, /setPurchaseRate\(["']["']\)/, "Resets purchase rate on add");
  assert.match(componentSource, /setScanInput\(["']["']\)/, "Resets scan input on add");
  assert.match(componentSource, /scanFieldRef\.current\?\.focus\(\)/, "Returns focus to scan field on add");
});

test("P3: Purchase phone locks Quantity at 1", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // Handset has quantity locked at 1, disabled, readOnly, and aria-disabled
  assert.match(componentSource, /disabled=\{selectedEntryItem\?\.itemType === ["']handset["']\}/, "Quantity disabled for handset");
  assert.match(componentSource, /readOnly=\{selectedEntryItem\?\.itemType === ["']handset["']\}/, "Quantity readOnly for handset");
  assert.match(componentSource, /aria-disabled=\{selectedEntryItem\?\.itemType === ["']handset["']\}/, "Quantity aria-disabled for handset");
  assert.match(componentSource, /value=\{selectedEntryItem\?\.itemType === ["']handset["'] \? ["']1["'] : entryQuantity\}/, "Quantity value locked to '1' for handset");
});

test("P4: Duplicate IMEI in purchase rejected with '<Model Name> (IMEI ...2019) is already added to this purchase' or 'already exists in inventory'", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // Check duplicate in purchase
  assert.match(
    componentSource,
    /\$\{.*\} \(IMEI \.\.\.\$\{last4\}\) is already added to this purchase/,
    "Duplicate IMEI in purchase rejected with exact pattern: <Model Name> (IMEI ...last4) is already added to this purchase"
  );

  // Check already exists in inventory
  assert.match(
    componentSource,
    /\$\{.*\} \(IMEI \.\.\.\$\{last4\}\) already exists in inventory/,
    "Scanned IMEI already in inventory rejected with exact pattern: <Model Name> (IMEI ...last4) already exists in inventory"
  );
});

test("P5: Purchase payment summary (Subtotal, Discount, Tax, Net, Paid, Balance, Due Date) stays intact and reactive", () => {
  const purchaseSource = fs.readFileSync(purchasesPagePath, "utf8");

  // Subtotal calculation reactive to form.items
  assert.match(purchaseSource, /const subtotal = useMemo\(\(\) => \{[\s\S]*?form\.items[\s\S]*?qty \* rate/, "Subtotal reactive to form.items");

  // Net Amount calculation = Subtotal - Discount + Tax
  assert.match(purchaseSource, /const netAmount = subtotal - discountVal \+ taxVal;/, "Net Amount formula strictly Subtotal - Discount + Tax");

  // Balance calculation = Net Amount - Paid Amount
  assert.match(purchaseSource, /const balanceAmount = netAmount - paidVal;/, "Balance Amount formula strictly Net Amount - Paid Amount");

  // Due Date cleared when Balance <= 0
  assert.match(purchaseSource, /if \(balanceAmount <= 0 && form\.dueDate\) \{[\s\S]*?dueDate: ""/, "Due Date automatically cleared when Balance <= 0");

  // Payment summary order in pos-checkout-card: Subtotal -> Discount Amount -> Tax Amount -> Net Amount -> Payment Method -> Paid Amount -> Balance Amount -> Due Date
  const idxCart = purchaseSource.indexOf("pos-cart-wrap");
  const idxSubtotal = purchaseSource.indexOf('"sales.subtotal"');
  const idxDiscount = purchaseSource.indexOf('"sales.discount"');
  const idxTax = purchaseSource.indexOf('"sales.tax"');
  const idxNet = purchaseSource.indexOf('"sales.total_payable"');
  const idxMethod = purchaseSource.indexOf('"sales.payment_method"');
  const idxPaid = purchaseSource.indexOf('"purchases.amount_paid_to_vendor"');
  const idxBalance = purchaseSource.indexOf('"sales.balance_due"');
  const idxDueDate = purchaseSource.indexOf('"sales.credit_due_date"');

  assert.ok(idxCart < idxSubtotal, "Payment summary must be in sidebar next to/below products table");
  assert.ok(idxSubtotal < idxDiscount, "Subtotal precedes Discount");
  assert.ok(idxDiscount < idxTax, "Discount precedes Tax");
  assert.ok(idxTax < idxNet, "Tax precedes Net Amount");
  assert.ok(idxNet < idxMethod, "Net Amount precedes Payment Method");
  assert.ok(idxMethod < idxPaid, "Payment Method precedes Paid Amount");
  assert.ok(idxPaid < idxBalance, "Paid Amount precedes Balance Amount");
  assert.ok(idxBalance < idxDueDate, "Balance Amount precedes Due Date");
});

// =====================================================================
// PART B: SALE REGISTER ENTRY ROW TESTS (S1 - S6)
// =====================================================================

test("S1: Sale entry row fields [1..4] present in fixed order, Tab disabled, Enter moves forward, Left Arrow backward", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // 1. SalesPage renders UniversalEntryRow in sale mode
  assert.match(
    salesSource,
    /<UniversalEntryRow[\s\S]*?mode=["']sale["']/,
    "SalesPage must render UniversalEntryRow with mode='sale'"
  );

  // 2. Fixed order in sale mode:
  // [1] Scan Field -> [2] Product Dropdown -> [3] Quantity -> [4] Add Button
  const idxScan = componentSource.indexOf("ref={transferScannerInputRef}");
  const idxDropdown = componentSource.indexOf("ref={productDropdownInputRef}");
  const idxQty = componentSource.indexOf("ref={quantityInputRef}");
  const idxAdd = componentSource.indexOf("ref={addButtonRef}");

  assert.ok(idxScan !== -1 && idxDropdown !== -1 && idxQty !== -1 && idxAdd !== -1, "All 4 sale fields must exist");
  assert.ok(idxScan < idxDropdown, "[1] Scan field must precede [2] Product Dropdown");
  assert.ok(idxDropdown < idxQty, "[2] Product Dropdown must precede [3] Quantity");
  assert.ok(idxQty < idxAdd, "[3] Quantity must precede [4] Add Button");

  // 3. Purchase rate must NOT be rendered when mode !== 'purchase'
  assert.match(componentSource, /\{mode === ["']purchase["'] && \(/, "Purchase Rate is strictly omitted in sale mode");

  // 4. In sale mode: Quantity Enter moves directly to Add Button
  const qtySection = componentSource.slice(idxQty, componentSource.indexOf("ref={purchaseRateFieldRef}"));
  assert.match(qtySection, /addBtnRef\.current\?\.focus\(\)/, "In sale mode, Quantity Enter moves directly to Add Button");

  // 5. In sale mode: Add Button Left Arrow moves directly to Quantity
  const addSection = componentSource.slice(idxAdd, componentSource.indexOf("</div>", idxAdd));
  assert.match(addSection, /qtyFieldRef\.current(?:\?\.|\.)focus\(\)/, "In sale mode, Add Button Left Arrow moves directly to Quantity");
});

test("S2: Sale scan jumps to Quantity (prefilled 1), Enter to Add, resets row and returns focus to Scan (deliberate rhythm)", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // Scan does not instant-add; it jumps focus to Quantity with prefilled 1
  assert.match(componentSource, /qtyFieldRef\.current\.focus\(\);\s*qtyFieldRef\.current\.select\?\.\(\);/, "Scan jumps focus to Quantity with text highlighted");

  // Enter on Add button executes deliberate add and resets row
  assert.match(componentSource, /setSelectedEntryItem\(null\)/, "Resets item selection on add");
  assert.match(componentSource, /setEntryQuantity\(["']1["']\)/, "Resets quantity to 1 on add");
  assert.match(componentSource, /scanFieldRef\.current\?\.focus\(\)/, "Returns focus to scan field on add");
});

test("S3: Sale phone locks Quantity at 1", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // Quantity input is locked at 1, readOnly and disabled for handset
  assert.match(componentSource, /disabled=\{selectedEntryItem\?\.itemType === ["']handset["']\}/, "Quantity disabled for phone handset");
  assert.match(componentSource, /readOnly=\{selectedEntryItem\?\.itemType === ["']handset["']\}/, "Quantity readOnly for phone handset");
  assert.match(componentSource, /value=\{selectedEntryItem\?\.itemType === ["']handset["'] \? ["']1["'] : entryQuantity\}/, "Quantity locked at 1");
});

test("S4: Sale stock check at Add time rejects over-stock with '<Product Name> — only <N> available at this branch'", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // Check over-stock error message
  assert.match(
    componentSource,
    /\$\{selectedEntryItem\.name\} — only \$\{.*\} available at this branch/,
    "Rejects over-stock with '<Product Name> — only <N> available at this branch'"
  );

  // Check 0 stock error message
  assert.match(
    componentSource,
    /\$\{selectedEntryItem\.name\} — no stock available at this branch/,
    "Rejects zero-stock with '<Product Name> — no stock available at this branch'"
  );

  // Focus and highlight kept on Quantity field on stock error
  assert.match(componentSource, /qtyFieldRef\.current(?:\?\.|\.)focus\(\);\s*qtyFieldRef\.current(?:\?\.|\.)select\?\.\(\);/, "Keeps focus and highlights quantity on stock rejection");
});

test("S5: Sale duplicate IMEI rejected with '<Model Name> (IMEI ...2019) is already in this sale', already-sold with '...already sold', other-branch with '...not in stock at this branch'", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");

  // Duplicate in sale
  assert.match(
    componentSource,
    /\$\{.*\} \(IMEI \.\.\.\$\{last4\}\) is already in this sale/,
    "Duplicate IMEI rejected with '<Model Name> (IMEI ...2019) is already in this sale'"
  );

  // Already sold
  assert.match(
    componentSource,
    /\$\{modelName\} \(IMEI \.\.\.\$\{last4\}\) — this unit is already sold/,
    "Already sold unit rejected with '<Model Name> (IMEI ...2019) — this unit is already sold'"
  );

  // Not in stock at this branch
  assert.match(
    componentSource,
    /\$\{.*\} \(IMEI \.\.\.\$\{last4\}\) — not in stock at this branch/,
    "Other branch unit rejected with '<Model Name> (IMEI ...2019) — not in stock at this branch'"
  );
});

test("S6: Enter inside the sale entry row never submits the sale form or triggers Complete Sale", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // All keydown handlers in entry row call e.preventDefault() on Enter
  assert.match(componentSource, /if \(e\.key === ["']Enter["']\) \{\s*e\.preventDefault\(\);/, "Scan field Enter calls preventDefault()");
  assert.match(componentSource, /else if \(e\.key === ["']Enter["']\) \{\s*e\.preventDefault\(\);/, "Dropdown field Enter calls preventDefault()");

  // Add button is type="button" and prevents form submission
  assert.match(componentSource, /<button[\s\S]*?ref=\{addButtonRef\}[\s\S]*?type=["']button["']/, "Add button is explicitly type='button'");

  // Complete Sale checkout button remains isolated in pos-checkout-sidebar
  assert.match(salesSource, /pos-checkout-sidebar[\s\S]*?t\("sales\.complete_sale",\s*"Complete Sale"\)/, "Complete Sale button isolated in checkout sidebar");
});

// =====================================================================
// PART C: SHARED ARCHITECTURE & DRIFT PREVENTION
// =====================================================================

test("C1-C3: Single shared UniversalEntryRow component used across Purchases, Sales, and Transfers with zero drift", () => {
  const componentSource = fs.readFileSync(universalEntryRowPath, "utf8");
  const purchaseSource = fs.readFileSync(purchasesPagePath, "utf8");
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const inventorySource = fs.readFileSync(inventoryPagePath, "utf8");

  // 1. Both PurchasesPage and SalesPage import and use UniversalEntryRow
  assert.match(purchaseSource, /import \{ UniversalEntryRow \} from ["']\.\.\/components\/UniversalEntryRow\.jsx["']/, "PurchasesPage imports UniversalEntryRow");
  assert.match(salesSource, /import \{ UniversalEntryRow \} from ["']\.\.\/components\/UniversalEntryRow\.jsx["']/, "SalesPage imports UniversalEntryRow");

  // 2. UniversalEntryRow supports all 3 modes
  assert.match(componentSource, /mode = ["']sale["']/, "Defaults mode to sale");
  assert.match(componentSource, /mode === ["']purchase["']/, "Supports purchase mode");
  assert.match(componentSource, /mode === ["']transfer["']|mode !== ["']purchase["']/, "Supports transfer and sale modes");

  // 3. Shared IMEI constants imported from shared utils/imei.js
  assert.match(componentSource, /import \{ IMEI_MIN_LENGTH, IMEI_MAX_LENGTH, isImeiFormat \} from ["']\.\.\/utils\/imei\.js["']/, "Uses shared IMEI constants from imei.js");

  // 4. No Type dropdown (phone/product selector) on any page
  assert.equal(componentSource.includes('name="itemType"'), false, "No itemType select in shared component");
  assert.equal(componentSource.includes('name="transferType"'), false, "No transferType select in shared component");

  // 5. Errors always use product/model names, never internal IDs
  assert.doesNotMatch(componentSource, /product_id\s*#|model_id\s*#/, "No raw internal database IDs shown in error messages");
});
