import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inventoryPagePath = path.resolve(__dirname, "../src/pages/InventoryPage.jsx");
const universalEntryRowPath = path.resolve(__dirname, "../src/components/UniversalEntryRow.jsx");

test("PACK #10 - Part 1: Structural verification of Dispatch Stock Transfer Entry Row", () => {
  const source = fs.readFileSync(universalEntryRowPath, "utf8");

  // 1. Ensure NO "Type" dropdown exists in Dispatch Stock Transfer
  assert.equal(
    source.includes('name="transferType"'),
    false,
    "Must NOT have transferType select/dropdown"
  );
  assert.equal(
    source.includes('name="itemType"'),
    false,
    "Must NOT have itemType select/dropdown in transfer"
  );

  // 2. Tab index sequence: 1 (Scan Field) -> 2 (Product Dropdown) -> 3 (Quantity) -> 4 (Add Button)
  assert.match(source, /ref=\{transferScannerInputRef\}\s+tabIndex=\{1\}/, "Scan field must have tabIndex=1");
  assert.match(source, /ref=\{productDropdownInputRef\}\s+tabIndex=\{2\}/, "Product dropdown input must have tabIndex=2");
  assert.match(source, /ref=\{quantityInputRef\}\s+tabIndex=\{3\}/, "Quantity input must have tabIndex=3");
  assert.match(source, /ref=\{addButtonRef\}\s+tabIndex=\{4\}/, "Add button must have tabIndex=4");

  // 3. Quantity input disabled for phone handsets
  assert.match(
    source,
    /disabled=\{selectedEntryItem\?\.itemType === ["']handset["']\}/,
    "Quantity input must be disabled when a phone handset is selected"
  );

  // 4. Named inline error display and guidance banner
  assert.match(source, /transferInlineError/, "Must maintain transferInlineError state");
  assert.match(source, /transferAwaitingPhoneModel/, "Must maintain transferAwaitingPhoneModel state");
});

test("PACK #10 - Part 2: Auto-Detection & Scan Flow Simulation (Path A & Path B)", () => {
  const availableProducts = [
    { id: 201, name: "Fast USB-C Charger 20W", barcode: "8901234567890", sku: "CHG-20W", stock_quantity: 15, sale_price: 1200 },
    { id: 202, name: "Braided Lightning Cable 1m", barcode: "8901234567891", sku: "CBL-1M", stock_quantity: 0, sale_price: 450 }
  ];

  const sourceBranchUnits = [
    { id: 501, model_id: 10, company: "Apple", model_name: "iPhone 13", variant: "128GB Midnight", imei: "358291048291048", current_status: "in_stock", branch_id: 1 },
    { id: 502, model_id: 10, company: "Apple", model_name: "iPhone 13", variant: "128GB Midnight", imei: "358291048291049", current_status: "in_stock", branch_id: 1 }
  ];

  let transferItems = [];
  let selectedEntryItem = null;
  let entryQuantity = "1";
  let inlineError = "";

  function simulateScan(rawInput) {
    const raw = (rawInput || "").trim();
    inlineError = "";

    // 1. QR or IMEI
    let imeiCandidate = null;
    const qrMatch = raw.match(/IMEI[:=\s]+([0-9]{14,16})/i);
    if (qrMatch) {
      imeiCandidate = qrMatch[1];
    } else if (/^\d{14,16}$/.test(raw)) {
      imeiCandidate = raw;
    }

    if (imeiCandidate) {
      // Check duplicate
      const dup = transferItems.find((it) => it.itemType === "handset" && it.imei === imeiCandidate);
      if (dup) {
        const last4 = imeiCandidate.slice(-4);
        inlineError = `"${dup.name}" (IMEI ...${last4}) is already added to this transfer.`;
        return;
      }

      const unit = sourceBranchUnits.find((u) => u.imei === imeiCandidate);
      if (unit) {
        selectedEntryItem = {
          itemType: "handset",
          imei: unit.imei,
          name: `${unit.company} ${unit.model_name} (${unit.variant})`,
          stock: 1
        };
        entryQuantity = "1";
        return;
      } else {
        inlineError = "No product found for this code";
        return;
      }
    }

    // 2. Barcode or SKU
    const cleanRaw = raw.toLowerCase();
    const matched = availableProducts.find(
      (p) => (p.barcode && p.barcode.toLowerCase() === cleanRaw) || (p.sku && p.sku.toLowerCase() === cleanRaw)
    );

    if (matched) {
      if (matched.stock_quantity <= 0) {
        inlineError = `"${matched.name}" — no stock available at this branch`;
        return;
      }
      selectedEntryItem = {
        itemType: "product",
        productId: matched.id,
        name: matched.name,
        stock: matched.stock_quantity
      };
      entryQuantity = "1";
      return;
    }

    // 3. Unknown code
    inlineError = "No product found for this code";
  }

  function simulateAdd() {
    if (!selectedEntryItem) {
      inlineError = "Please scan or select a product first";
      return;
    }

    if (selectedEntryItem.itemType === "handset") {
      transferItems.push({
        itemType: "handset",
        imei: selectedEntryItem.imei,
        name: selectedEntryItem.name,
        quantity: 1
      });
      selectedEntryItem = null;
      entryQuantity = "1";
      return;
    }

    if (selectedEntryItem.itemType === "product") {
      const qty = parseInt(entryQuantity, 10);
      const existingIdx = transferItems.findIndex((it) => it.itemType === "product" && it.productId === selectedEntryItem.productId);
      const currentQty = existingIdx >= 0 ? transferItems[existingIdx].quantity : 0;
      const totalNew = currentQty + qty;

      if (totalNew > selectedEntryItem.stock) {
        inlineError = `"${selectedEntryItem.name}" — only ${selectedEntryItem.stock} available at this branch`;
        return;
      }

      if (existingIdx >= 0) {
        transferItems[existingIdx].quantity = totalNew;
      } else {
        transferItems.push({
          itemType: "product",
          productId: selectedEntryItem.productId,
          name: selectedEntryItem.name,
          quantity: qty
        });
      }
      selectedEntryItem = null;
      entryQuantity = "1";
    }
  }

  // T1: Cashier scans accessory barcode -> success, added to cart
  simulateScan("8901234567890");
  assert.equal(inlineError, "");
  assert.equal(selectedEntryItem?.name, "Fast USB-C Charger 20W");
  entryQuantity = "3";
  simulateAdd();
  assert.equal(transferItems.length, 1);
  assert.equal(transferItems[0].quantity, 3);

  // T2: Cashier scans phone IMEI -> success, added with quantity 1
  simulateScan("358291048291048");
  assert.equal(inlineError, "");
  assert.equal(selectedEntryItem?.itemType, "handset");
  simulateAdd();
  assert.equal(transferItems.length, 2);
  assert.equal(transferItems[1].imei, "358291048291048");

  // T6: Duplicate IMEI -> named error with last-4
  simulateScan("358291048291048");
  assert.match(inlineError, /already added to this transfer/);
  assert.match(inlineError, /\.\.\.1048/);

  // T7: Duplicate product -> increments existing row, enforces stock boundary
  simulateScan("CHG-20W");
  assert.equal(selectedEntryItem?.name, "Fast USB-C Charger 20W");
  entryQuantity = "5";
  simulateAdd();
  assert.equal(transferItems[0].quantity, 8, "Quantity incremented to 8 (3 + 5)");

  // Attempting to exceed stock (available 15, current 8, add 8 -> 16)
  simulateScan("CHG-20W");
  entryQuantity = "8";
  simulateAdd();
  assert.equal(inlineError, '"Fast USB-C Charger 20W" — only 15 available at this branch');
  assert.equal(transferItems[0].quantity, 8, "Quantity remains safely at 8");

  // T8: Unknown code -> "No product found for this code"
  simulateScan("UNKNOWN-CODE-999");
  assert.equal(inlineError, "No product found for this code");

  // Zero stock product
  simulateScan("8901234567891");
  assert.equal(inlineError, '"Braided Lightning Cable 1m" — no stock available at this branch');
});

test("PACK #10 - Part 3: Acceptance Scenarios T1 through T9 verification", () => {
  const source = fs.readFileSync(universalEntryRowPath, "utf8");

  // T1: No Type dropdown, TAB disabled between the 4 entry row fields
  assert.equal(source.includes('name="transferType"'), false, "T1: No transferType dropdown");
  assert.equal(source.includes('name="itemType"'), false, "T1: No itemType dropdown");

  // Check tab is prevented across all 4 controls
  const scanFieldSection = source.slice(source.indexOf("ref={transferScannerInputRef}"), source.indexOf("ref={productDropdownInputRef}"));
  assert.match(scanFieldSection, /e\.key === ["']Tab["'][\s\S]*?e\.preventDefault\(\)/, "T1: Scan field must preventDefault on Tab");

  const dropdownSection = source.slice(source.indexOf("ref={productDropdownInputRef}"), source.indexOf("ref={quantityInputRef}"));
  assert.match(dropdownSection, /e\.key === ["']Tab["'][\s\S]*?e\.preventDefault\(\)/, "T1: Product dropdown must preventDefault on Tab");

  const qtySection = source.slice(source.indexOf("ref={quantityInputRef}"), source.indexOf("ref={addButtonRef}"));
  assert.match(qtySection, /e\.key === ["']Tab["'][\s\S]*?e\.preventDefault\(\)/, "T1: Quantity input must preventDefault on Tab");

  const addButtonSection = source.slice(source.indexOf("ref={addButtonRef}"), source.indexOf("Transfer Line Items Table"));
  assert.match(addButtonSection, /e\.key === ["']Tab["'][\s\S]*?e\.preventDefault\(\)/, "T1: Add button must preventDefault on Tab");

  // T4 / Forward navigation:
  // Enter on empty scan field moves to Product Dropdown
  assert.match(scanFieldSection, /productDropdownInputRef\.current\?\.focus\(\)/, "T4: Empty scan field Enter moves to Product Dropdown");

  // Enter on Quantity moves to Add Button
  assert.match(qtySection, /addButtonRef\.current\?\.focus\(\)/, "T2/T3/T4: Quantity Enter moves to Add Button");

  // T6: Backward navigation with Left Arrow:
  // Add Button Left Arrow -> moves to Quantity
  assert.match(addButtonSection, /e\.key === ["']ArrowLeft["'][\s\S]*?quantityInputRef\.current(?:\?\.|\.)focus\(\)/, "T6: Add Button Left Arrow moves to Quantity");

  // Quantity Left Arrow -> moves to Product Dropdown
  assert.match(qtySection, /e\.key === ["']ArrowLeft["'][\s\S]*?productDropdownInputRef\.current(?:\?\.|\.)focus\(\)/, "T6: Quantity Left Arrow moves to Product Dropdown");

  // Product Dropdown Left Arrow -> moves to Scan Field
  assert.match(dropdownSection, /e\.key === ["']ArrowLeft["'][\s\S]*?transferScannerInputRef\.current(?:\?\.|\.)focus\(\)/, "T6: Product Dropdown Left Arrow moves to Scan Field");

  // T3 / T6: Quantity field readOnly and focusable for phone handset
  assert.match(qtySection, /readOnly=\{selectedEntryItem\?\.itemType === ["']handset["']\}/, "T3: Quantity readOnly when phone handset selected");

  // End-to-end multi-item rapid run simulation (T9)
  const products = [
    { id: 1, name: "USB Cable", barcode: "111", stock_quantity: 20 },
    { id: 2, name: "Wall Adapter", barcode: "222", stock_quantity: 10 }
  ];
  const handsets = [
    { id: 101, model_name: "iPhone 13", imei: "351111111111111", current_status: "in_stock", branch_id: 1 },
    { id: 102, model_name: "Galaxy S22", imei: "352222222222222", current_status: "in_stock", branch_id: 1 },
    { id: 103, model_name: "Pixel 7", imei: "353333333333333", current_status: "in_stock", branch_id: 1 }
  ];

  let transferItems = [];
  function runItem(type, code, qty) {
    if (type === "product") {
      const p = products.find((x) => x.barcode === code);
      assert.ok(p);
      const existing = transferItems.find((it) => it.productId === p.id);
      if (existing) {
        existing.quantity += qty;
      } else {
        transferItems.push({ itemType: "product", productId: p.id, name: p.name, quantity: qty });
      }
    } else {
      const h = handsets.find((x) => x.imei === code);
      assert.ok(h);
      assert.ok(!transferItems.some((it) => it.imei === code));
      transferItems.push({ itemType: "handset", imei: h.imei, name: h.model_name, quantity: 1 });
    }
  }

  // Rapid run: 5 items mixing phones and accessories
  runItem("product", "111", 5);
  runItem("phone", "351111111111111", 1);
  runItem("phone", "352222222222222", 1);
  runItem("product", "222", 2);
  runItem("phone", "353333333333333", 1);

  assert.equal(transferItems.length, 5, "T9: All 5 items added");
  assert.equal(transferItems[0].quantity, 5);
  assert.equal(transferItems[1].imei, "351111111111111");
  assert.equal(transferItems[2].imei, "352222222222222");
  assert.equal(transferItems[3].quantity, 2);
  assert.equal(transferItems[4].imei, "353333333333333");
});
