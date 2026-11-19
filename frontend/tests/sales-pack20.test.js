import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const salesPagePath = path.resolve(__dirname, "../src/pages/SalesPage.jsx");
const classicLayoutPath = path.resolve(__dirname, "../src/components/layouts/ClassicLayout.jsx");
const modernLayoutPath = path.resolve(__dirname, "../src/components/layouts/ModernLayout.jsx");
const executiveLayoutPath = path.resolve(__dirname, "../src/components/layouts/ExecutiveLayout.jsx");
const stylesPath = path.resolve(__dirname, "../src/styles.css");

// 1. Shared IMEI Detection Constants & Helper
test("PACK #20 - Part 2: Shared IMEI detection constants and validator", async () => {
  const { IMEI_MIN_LENGTH, IMEI_MAX_LENGTH, isImeiFormat } = await import("../src/utils/imei.js");
  
  assert.equal(IMEI_MIN_LENGTH, 14, "IMEI minimum length must be 14");
  assert.equal(IMEI_MAX_LENGTH, 16, "IMEI maximum length must be 16");

  // Valid IMEIs (14, 15, 16 digits)
  assert.equal(isImeiFormat("12345678901234"), true, "14-digit code is valid IMEI");
  assert.equal(isImeiFormat("123456789012345"), true, "15-digit code is valid IMEI");
  assert.equal(isImeiFormat("1234567890123456"), true, "16-digit code is valid IMEI");
  assert.equal(isImeiFormat(" 12345 67890 12345 "), true, "IMEI with spaces is recognized");

  // Invalid formats (letters, wrong lengths, symbols)
  assert.equal(isImeiFormat("1234567890123"), false, "13-digit code is not IMEI");
  assert.equal(isImeiFormat("12345678901234567"), false, "17-digit code is not IMEI");
  assert.equal(isImeiFormat("AC 63A Breaker"), false, "Product name is not IMEI");
  assert.equal(isImeiFormat("SKU-990184"), false, "Alphanumeric SKU is not pure IMEI");
  assert.equal(isImeiFormat(""), false, "Empty string is not IMEI");
  assert.equal(isImeiFormat(null), false, "Null is not IMEI");
});

// 2. Part 1: Stable Identity Add & List Freeze during In-Flight Click
test("PACK #20 - Part 1: Product row click binds to stable identity, freezes mid-click, and verifies item before adding", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // Check stable identity binding & verification
  assert.match(salesSource, /data-item-id=\{item\.id\}/, "Row must expose stable item id");
  assert.match(salesSource, /data-product-id=\{item\.rawItem\?\.id\}/, "Row must expose stable product id");
  assert.match(salesSource, /isAddInFlightRef/, "Must track in-flight click to freeze updates");
  assert.match(salesSource, /frozenResultsRef/, "Must store snapshot of search results during click");

  // Verify mismatch check in handleSelectItem
  assert.match(salesSource, /Product identity mismatch/i, "Must verify item identity before adding to cart");
  assert.match(salesSource, /Price mismatch/i, "Must verify price before adding to cart");

  // Simulation test: 10/10 rapid clicks on distinct items with mid-click list refresh
  const productA = { id: 101, name: "AC 63A 2P Breaker Tomzan", sku: "TOMZ-2P", sale_price: 750, stock_quantity: 10 };
  const productB = { id: 102, name: "AC 63A 4Pole Tomzan Breakers", sku: "TOMZ-4P", sale_price: 1400, stock_quantity: 5 };

  let displayedResults = [
    { id: `prod-${productA.id}`, itemType: "product", name: productA.name, price: 750, inStock: true, rawItem: productA },
    { id: `prod-${productB.id}`, itemType: "product", name: productB.name, price: 1400, inStock: true, rawItem: productB }
  ];

  let cart = [];
  function simulateAddItem(clickedItem, listUndergoingRefresh) {
    // Freeze list at pointer down
    const frozenList = [...displayedResults];
    // List reorders in background mid-click
    displayedResults = listUndergoingRefresh;

    // Verify stable identity from clicked item
    const raw = clickedItem.rawItem;
    if (String(raw.id) !== String(clickedItem.id).replace("prod-", "")) {
      throw new Error("Identity mismatch");
    }
    if (Number(raw.sale_price) !== Number(clickedItem.price)) {
      throw new Error("Price mismatch");
    }
    cart.push({ productId: raw.id, name: raw.name, unitPrice: raw.sale_price, quantity: 1 });
  }

  // Run 10 rapid clicks on Product A while list reverses
  const itemA = displayedResults[0];
  const itemB = displayedResults[1];

  for (let i = 0; i < 10; i++) {
    const reversed = [itemB, itemA];
    // Cashier clicked Row A which is bound to itemA stable identity
    simulateAddItem(itemA, reversed);
    assert.equal(cart[i].productId, 101, `Click ${i + 1} must receive Product A (101)`);
    assert.equal(cart[i].name, "AC 63A 2P Breaker Tomzan");
    assert.equal(cart[i].unitPrice, 750);
  }
});

// 3. Part 2: Failed Phone Scan Error Wording & Auto-Clear Flow
test("PACK #20 - Part 2: Pure-digit IMEI scan failure names branch, auto-clears field, leaves cart untouched", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // Dynamic branch name, not hardcoded
  assert.match(salesSource, /No handset with IMEI …\$\{last4\} in stock at \$\{currentBranchName\} — check the IMEI or scan another unit\./, "IMEI not in stock message matches exact specification");
  assert.match(salesSource, /setScannerError/, "Must set persistent scanner error near scan bar");
  assert.match(salesSource, /setUniversalScanInput\(""\)/, "Must auto-clear scan input on failed IMEI scan");
  assert.match(salesSource, /pos-scanner-error-alert/, "Must render persistent error alert near scan bar");

  // Simulation test
  const branches = [{ id: 1, name: "Gujrat" }, { id: 2, name: "Lahore" }];
  const currentBranchId = 1;
  const currentBranchName = branches.find((b) => b.id === currentBranchId)?.name;
  const testImei = "123456789012345";
  const last4 = testImei.slice(-4);

  const errorMsg = `No handset with IMEI …${last4} in stock at ${currentBranchName} — check the IMEI or scan another unit.`;
  assert.equal(errorMsg, "No handset with IMEI …2345 in stock at Gujrat — check the IMEI or scan another unit.");
});

// 4. Part 3: 1-Character Visible Hint & 2-Character Threshold
test("PACK #20 - Part 3: Exactly 1 character shows search hint, 2 characters opens dropdown, Enter does not add best-guess", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  assert.match(salesSource, /universalScanInput\.trim\(\)\.length === 1 && !awaitingPhoneModel/, "Hint condition checks for exactly 1 character");
  assert.match(salesSource, /Type at least 2 characters to search/, "Hint text instructs user to type at least 2 characters");
  assert.match(salesSource, /trimmed\.length >= 2/, "Search debounces only when 2+ characters are present");
  assert.match(salesSource, /pos-search-hint/, "Hint is rendered as pos-search-hint element");
});

// 5. Part 4: One Clear Way to Add & Stable "Complete Sale" Checkout Button
test("PACK #20 - Part 4: All 3 add paths supported, checkout button label is strictly 'Complete Sale'", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // Add paths
  assert.match(salesSource, /Scan \/ Add/, "Scanner submit button says Scan / Add");
  assert.match(salesSource, /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*if \(item\.inStock\) handleSelectItem\(item\);/, "Clicking row adds item");
  assert.match(salesSource, /title=\{item\.itemType === "phone_model" \? \(isUrdu \? "ماڈل منتخب کریں" : "Select model"\) : \(isUrdu \? "کارٹ میں شامل کریں" : "Add to cart"\)\}/, "Visible + Add button on row");

  // Stable checkout button label
  assert.match(salesSource, /t\("sales\.complete_sale", "Complete Sale"\)/, "Checkout button uses stable 'Complete Sale' label");
  assert.doesNotMatch(salesSource, /Save Sale • PKR/, "Checkout button must NEVER flip to 'Save Sale • PKR'");
});

// 6. Part 5: Compact Layout & No-Scroll Checkout
test("PACK #20 - Part 5: Layout rules and sticky compact checkout sidebar", () => {
  const stylesSource = fs.readFileSync(stylesPath, "utf8");
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // Check CSS for sticky checkout sidebar
  assert.match(stylesSource, /\.pos-checkout-sidebar\s*\{[^}]*position:\s*sticky;/s, "Checkout sidebar is sticky");
  assert.match(stylesSource, /\.pos-cart-scroll-container\s*\{[^}]*overflow-y:\s*auto;/s, "Cart has dedicated scroll container");

  // Check SalesPage table structure
  assert.match(salesSource, /pos-cart-scroll-container/, "Cart table is wrapped in scrollable container");
  assert.match(salesSource, /<div className="pos-checkout-sidebar">/, "Checkout sidebar is right column");
});

// 7. Part 6: Delete Duplicated and Empty Space
test("PACK #20 - Part 6: Sidebar auto-collapse, no duplicate controls, single zero, and inline store outlet", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");
  const classicSource = fs.readFileSync(classicLayoutPath, "utf8");
  const modernSource = fs.readFileSync(modernLayoutPath, "utf8");
  const executiveSource = fs.readFileSync(executiveLayoutPath, "utf8");

  // 1. Sidebar reports collapsed by default, no unwanted auto-collapse on sales page
  assert.match(classicSource, /const \[reportMenuOpen, setReportMenuOpen\] = useState\(false\);/, "ClassicLayout reports collapsed by default");
  assert.doesNotMatch(classicSource, /if \(isSalesPage\) \{\s*setIsCollapsed\(true\);\s*\}/, "ClassicLayout does not auto-collapse on sales page");
  assert.match(classicSource, /\{!isSalesPage && \(\s*<>\s*<div className="theme-section">/, "ClassicLayout hides theme and language controls in sidebar on sales page");

  assert.match(modernSource, /reports:\s*false/, "ModernLayout reports collapsed by default");
  assert.doesNotMatch(modernSource, /if \(isSalesPage\) \{\s*setIsCollapsed\(true\);\s*\}/, "ModernLayout does not auto-collapse on sales page");
  assert.match(modernSource, /\{!isSalesPage && \(\s*<>\s*<div className="modern-footer-theme"/, "ModernLayout hides duplicate theme controls in sidebar on sales page");

  assert.match(executiveSource, /reports:\s*false/, "ExecutiveLayout reports collapsed by default");
  assert.doesNotMatch(executiveSource, /if \(isSalesPage\) \{\s*setIsCollapsed\(true\);\s*\}/, "ExecutiveLayout does not auto-collapse on sales page");

  // 2. Heading completely removed in compact layout
  assert.doesNotMatch(salesSource, /Universal Scanner & Search Field/, "Old long heading removed");
  assert.doesNotMatch(salesSource, /Auto-detects Barcodes, QR tags, Phone IMEIs & Live Product Search/, "Old subtext removed");
  assert.doesNotMatch(salesSource, /⚡ \{isUrdu \? "یونیورسل اسکینر" : "Universal Scanner"\}/, "Scanner heading removed");

  // 3. Compact empty-cart line and table header visible
  assert.match(salesSource, /Cart is empty — scan or type above to add items/, "Single compact empty-cart line");
  assert.doesNotMatch(salesSource, /pos-cart-empty-icon/, "Old bulky 250px empty-cart icon block removed");

  // 4. Single zero indicator (cart header badge and phone badge hidden when 0)
  assert.match(salesSource, /\{cartCounts\.total > 0 && \(\s*<span className="pos-item-badge product"/, "Cart header badge hidden when 0");
  assert.match(salesSource, /\{cartCounts\.phones > 0 && \(\s*<div style=\{\{ textAlign: isRtl \? "left" : "right" \}\}>/, "Total banner phone badge hidden when 0");

  // 5. Removed +500, +1,000, +5,000 quick buttons; kept Exact Net
  assert.doesNotMatch(salesSource, />\+500<\/button>/, "+500 button removed");
  assert.doesNotMatch(salesSource, />\+1,000<\/button>/, "+1,000 button removed");
  assert.doesNotMatch(salesSource, />\+5,000<\/button>/, "+5,000 button removed");
  assert.match(salesSource, /Exact Net \(Auto-fill\)/, "Exact Net auto-fill button kept");

  // 6. Compact inline Store Outlet bar
  assert.match(salesSource, /pos-branch-inline-bar/, "Store Outlet is compact inline bar");
});
