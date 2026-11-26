import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { IMEI_MIN_LENGTH, IMEI_MAX_LENGTH, isImeiFormat } from "../utils/imei.js";
import { stripTrailingZeros } from "../utils/numberFormat.js";

/**
 * UniversalEntryRow: Shared line-item entry row component used across
 * Dispatch Stock Transfer (InventoryPage), Product Purchase (PurchasesPage), and Sale Register (SalesPage).
 *
 * Implements:
 * - Unified detection pipeline: QR tag -> IMEI digits -> Barcode/SKU exact match -> Product name exact match -> Attached name search dropdown.
 * - Keyboard navigation:
 *     ENTER: Scan Field -> Product Dropdown -> Quantity -> (Purchase Rate if purchase mode) -> Add Button -> Resets row, focus back to Scan Field.
 *     LEFT ARROW: Add Button -> (Purchase Rate if purchase mode) -> Quantity -> Product Dropdown -> Scan Field (cursor preserved).
 *     TAB: Disabled across all controls (tab navigation trapped inside deliberate entry flow).
 * - Deliberate rhythm: Scanning a code identifies item, Product Dropdown displays name, focus jumps to Quantity (prefilled 1 and highlighted).
 * - Handsets: Quantity locked at 1, readOnly, aria-disabled.
 * - Named product error messages (never internal IDs).
 */
export function UniversalEntryRow({
  mode = "sale", // "transfer" | "purchase" | "sale"
  availableProducts = [],
  availableModels = [],
  branchUnits = [],
  currentItems = [],
  onAddItem,
  branchId,
  currentBranchName,
  isUrdu = false,
  t,
  api,
  disabled = false,
  autoFocus = true,
  // Optional external refs for backwards-compatibility and parent integration
  transferScannerInputRef: propTransferScannerInputRef,
  scannerInputRef: propScannerInputRef,
  productDropdownInputRef: propProductDropdownInputRef,
  quantityInputRef: propQuantityInputRef,
  rateInputRef: propRateInputRef,
  addButtonRef: propAddButtonRef,
  comboboxContainerRef: propComboboxContainerRef,
  externalInlineError,
  onClearExternalInlineError,
  stagedItem
}) {
  // Internal refs as fallbacks if not passed by parent
  const internalScannerInputRef = useRef(null);
  const internalProductDropdownInputRef = useRef(null);
  const internalQuantityInputRef = useRef(null);
  const internalRateInputRef = useRef(null);
  const internalAddButtonRef = useRef(null);
  const internalComboboxContainerRef = useRef(null);

  const transferScannerInputRef = propTransferScannerInputRef || propScannerInputRef || internalScannerInputRef;
  const productDropdownInputRef = propProductDropdownInputRef || internalProductDropdownInputRef;
  const quantityInputRef = propQuantityInputRef || internalQuantityInputRef;
  const rateInputRef = propRateInputRef || internalRateInputRef;
  const addButtonRef = propAddButtonRef || internalAddButtonRef;
  const comboboxContainerRef = propComboboxContainerRef || internalComboboxContainerRef;

  const scanFieldRef = transferScannerInputRef;
  const dropdownFieldRef = productDropdownInputRef;
  const qtyFieldRef = quantityInputRef;
  const purchaseRateFieldRef = rateInputRef;
  const addBtnRef = addButtonRef;
  const containerRef = comboboxContainerRef;

  const focusScanField = useCallback(() => {
    const el = (transferScannerInputRef && transferScannerInputRef.current) || (scanFieldRef && scanFieldRef.current) || internalScannerInputRef.current;
    if (el && typeof el.focus === "function") {
      try {
        el.focus();
        el.select?.();
      } catch (err) {}
    }
  }, [transferScannerInputRef, scanFieldRef]);

  // Keep references synchronized to active visible input DOM element
  useEffect(() => {
    if (transferScannerInputRef?.current) {
      internalScannerInputRef.current = transferScannerInputRef.current;
      if (propScannerInputRef && typeof propScannerInputRef === "object") {
        propScannerInputRef.current = transferScannerInputRef.current;
      }
    }
  });

  // Component States
  const [scanInput, setScanInput] = useState("");
  const [isScanDropdownOpen, setIsScanDropdownOpen] = useState(false);
  const [scanHighlightedIndex, setScanHighlightedIndex] = useState(0);
  const scanContainerRef = useRef(null);

  const [dropdownQuery, setDropdownQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedEntryItem, setSelectedEntryItem] = useState(null);
  const [entryQuantity, setEntryQuantity] = useState("1");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [inlineError, setInlineError] = useState("");
  const [awaitingPhoneModel, setAwaitingPhoneModel] = useState(null);

  const transferInlineError = inlineError;
  const transferAwaitingPhoneModel = awaitingPhoneModel;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (scanContainerRef.current && !scanContainerRef.current.contains(event.target)) {
        setIsScanDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef]);

  // Sync external errors if passed
  useEffect(() => {
    if (externalInlineError) {
      setInlineError(externalInlineError);
    }
  }, [externalInlineError]);

  function clearError() {
    setInlineError("");
    if (onClearExternalInlineError) onClearExternalInlineError();
  }

  // Handle staged item loaded by parent (e.g. Quick Add New Model)
  useEffect(() => {
    if (stagedItem) {
      setSelectedEntryItem(stagedItem);
      setEntryQuantity("1");
      const rawCost = stagedItem.costPrice ?? stagedItem.unitCost ?? stagedItem.unit_cost ?? "";
      const defaultRate = rawCost !== "" ? stripTrailingZeros(rawCost) : "";
      setPurchaseRate(String(defaultRate));
      setScanInput("");
      setDropdownQuery("");
      clearError();
      setTimeout(() => {
        if (qtyFieldRef.current) {
          qtyFieldRef.current.focus();
          qtyFieldRef.current.select?.();
        }
      }, 50);
    }
  }, [stagedItem]);

  // Helper to directly add a line item (used when scanning in purchase or sale mode)
  function handleDirectAdd(itemToAdd) {
    if (onAddItem) {
      onAddItem(itemToAdd);
    }
    setSelectedEntryItem(null);
    setPurchaseRate("");
    setEntryQuantity("1");
    setScanInput("");
    setDropdownQuery("");
    setAwaitingPhoneModel(null);
    clearError();
    focusScanField();
    requestAnimationFrame(focusScanField);
    setTimeout(focusScanField, 20);
    setTimeout(focusScanField, 50);
    setTimeout(focusScanField, 100);
  }

  // Highlight matching substring in dropdown row
  function highlightMatch(text, query) {
    if (!text) return "";
    if (!query) return text;
    const q = query.trim().toLowerCase();
    const str = String(text);
    const idx = str.toLowerCase().indexOf(q);
    if (idx === -1) return str;
    return (
      <>
        {str.slice(0, idx)}
        <mark
          style={{
            background: "rgba(245, 158, 11, 0.35)",
            color: "inherit",
            padding: "0 2px",
            borderRadius: "2px"
          }}
        >
          {str.slice(idx, idx + q.length)}
        </mark>
        {str.slice(idx + q.length)}
      </>
    );
  }

  // Filtered scan field suggestions (Products + Phone Models attached to Universal Scan Field)
  const scanSuggestions = useMemo(() => {
    const q = (scanInput || "").trim().toLowerCase();
    if (q.length < 2) return [];

    const results = [];
    const lowerBranch = String(branchId || "");

    // 1. Products search
    for (const p of availableProducts || []) {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const barcode = (p.barcode || "").toLowerCase();
      if (name.includes(q) || sku.includes(q) || barcode.includes(q)) {
        const stock = Number(p.stock_quantity ?? 0);
        results.push({
          id: `scan-prod-${p.id}`,
          itemType: "product",
          name: p.name,
          secondaryText: p.sku ? `SKU: ${p.sku}` : (p.barcode ? `Barcode: ${p.barcode}` : ""),
          salePrice: p.sale_price ? `PKR ${Number(p.sale_price).toLocaleString()}` : "",
          price: Number(p.sale_price || 0),
          stockLabel: stock > 0 ? `${stock} in stock` : "Out of stock",
          inStock: mode === "purchase" || stock > 0,
          rawItem: p
        });
        if (results.length >= 15) break;
      }
    }

    // 2. Phone Models search
    for (const m of availableModels || []) {
      const modelFullName = `${m.company || ""} ${m.model_name || ""}${m.variant ? ` (${m.variant})` : ""}`.trim();
      const lowerModel = modelFullName.toLowerCase();
      if (lowerModel.includes(q)) {
        const unitsInStock = (branchUnits || []).filter(
          (u) =>
            String(u.model_id) === String(m.id) &&
            u.current_status === "in_stock" &&
            (!lowerBranch || String(u.branch_id) === lowerBranch)
        );
        results.push({
          id: `scan-model-${m.id}`,
          itemType: "phone_model",
          name: modelFullName,
          secondaryText: `${unitsInStock.length} in stock`,
          salePrice: m.sale_price ? `PKR ${Number(m.sale_price).toLocaleString()}` : "",
          price: Number(m.sale_price || 0),
          stockLabel: unitsInStock.length > 0 ? `${unitsInStock.length} available` : "Out of stock",
          inStock: mode === "purchase" || unitsInStock.length > 0,
          rawItem: m
        });
        if (results.length >= 25) break;
      }
    }

    return results;
  }, [scanInput, availableProducts, availableModels, branchUnits, branchId, mode]);

  function handleSelectScanSuggestion(item) {
    if (!item.inStock && mode !== "purchase") {
      setInlineError(`${item.name} is out of stock at this branch`);
      setScanInput("");
      setIsScanDropdownOpen(false);
      setTimeout(() => scanFieldRef.current?.focus(), 50);
      return;
    }

    if (mode === "purchase") {
      if (item.itemType === "phone_model") {
        const m = item.rawItem;
        const fullName = `${m.company || ""} ${m.model_name || ""}${m.variant ? ` (${m.variant})` : ""}${m.storage ? ` • ${m.storage}` : ""}${m.color ? ` • ${m.color}` : ""}`.trim() || m.model_name || "Phone Model";
        const rawCost = m.cost_price ?? m.unit_cost ?? "";
        const defaultRate = rawCost !== "" ? stripTrailingZeros(rawCost) : "";
        setSelectedEntryItem({
          itemType: "phone_model",
          modelId: Number(m.id),
          name: fullName,
          modelTitle: fullName,
          costPrice: defaultRate,
          salePrice: m.sale_price || 0,
          rawItem: m
        });
        setEntryQuantity("1");
        setPurchaseRate(String(defaultRate));
        setScanInput("");
        setIsScanDropdownOpen(false);
        clearError();
        setTimeout(() => {
          if (qtyFieldRef.current) {
            qtyFieldRef.current.focus();
            qtyFieldRef.current.select?.();
          }
        }, 50);
        return;
      } else {
        const p = item.rawItem;
        const rawCost = p.cost_price ?? p.purchase_rate ?? p.sale_price ?? "";
        const defaultRate = rawCost !== "" ? stripTrailingZeros(rawCost) : "";
        setSelectedEntryItem({
          itemType: "product",
          productId: Number(p.id),
          name: p.name,
          sku: p.sku || "",
          barcode: p.barcode || "",
          categoryName: p.category_name || "Accessory",
          stock: item.stock,
          salePrice: item.salePrice,
          costPrice: defaultRate,
          rawItem: p
        });
        setEntryQuantity("1");
        setPurchaseRate(String(defaultRate));
        setScanInput("");
        setIsScanDropdownOpen(false);
        clearError();
        setTimeout(() => {
          if (qtyFieldRef.current) {
            qtyFieldRef.current.focus();
            qtyFieldRef.current.select?.();
          }
        }, 50);
        return;
      }
    }

    if (item.itemType === "phone_model") {
      if (mode === "sale") {
        const unit = (branchUnits || []).find(
          (u) =>
            String(u.model_id) === String(item.rawItem.id) &&
            u.current_status === "in_stock" &&
            (!branchId || String(u.branch_id) === String(branchId))
        );
        if (unit) {
          handleDirectAdd({
            itemType: "handset",
            modelId: unit.model_id,
            name: `${unit.company || ""} ${unit.model_name || ""}${unit.variant ? ` (${unit.variant})` : ""}`.trim(),
            modelTitle: `${unit.company || ""} ${unit.model_name || ""}${unit.variant ? ` (${unit.variant})` : ""}`.trim(),
            imei: unit.imei,
            quantity: 1,
            unitCost: unit.cost_price,
            unitPrice: unit.sale_price || 0,
            rawItem: unit
          });
        } else {
          setAwaitingPhoneModel(item.rawItem);
          setScanInput("");
          setIsScanDropdownOpen(false);
        }
      } else {
        setAwaitingPhoneModel(item.rawItem);
        setScanInput("");
        setIsScanDropdownOpen(false);
      }
    } else {
      const qty = Math.max(1, parseInt(entryQuantity, 10) || 1);
      handleDirectAdd({
        itemType: "product",
        productId: item.rawItem.id,
        name: item.rawItem.name,
        quantity: qty,
        unitCost: item.rawItem.cost_price,
        unitPrice: item.rawItem.sale_price || 0,
        rawItem: item.rawItem
      });
    }
    setScanInput("");
    setIsScanDropdownOpen(false);
    clearError();
    setTimeout(() => scanFieldRef.current?.focus(), 50);
  }

  // Filtered dropdown items (Products + Phone Models)
  const productDropdownItems = useMemo(() => {
    const q = (dropdownQuery || "").trim().toLowerCase();
    const list = [];

    // 1. Available Products
    (availableProducts || []).forEach((p) => {
      const name = (p.name || "").trim();
      const nameLower = name.toLowerCase();
      const barcode = (p.barcode ? String(p.barcode) : "").trim();
      const barcodeLower = barcode.toLowerCase();
      const sku = (p.sku ? String(p.sku) : "").trim();
      const skuLower = sku.toLowerCase();
      const stock = Number(p.stock_quantity ?? 0);
      const inStock = mode === "purchase" ? true : stock > 0;
      const salePrice = Number(p.sale_price ?? p.salePrice ?? p.retail_price ?? 0);
      const costPrice = Number(p.cost_price ?? p.unit_cost ?? p.purchase_rate ?? 0);

      let rank = 0;
      let isBarcodeMatch = false;

      if ((barcodeLower && barcodeLower === q) || (skuLower && skuLower === q)) {
        rank = 100;
        isBarcodeMatch = true;
      } else if (!q) {
        rank = inStock ? 10 : 1;
      } else if (nameLower.startsWith(q)) {
        rank = 50;
      } else if (nameLower.includes(q)) {
        rank = 25;
      } else if ((barcodeLower && barcodeLower.includes(q)) || (skuLower && skuLower.includes(q))) {
        rank = 20;
      }

      if (rank > 0) {
        list.push({
          id: `prod-${p.id}`,
          itemType: "product",
          name,
          secondaryText: [
            sku ? `SKU: ${sku}` : null,
            barcode ? `Barcode: ${barcode}` : null,
            p.category_name || (isUrdu ? "سامان" : "Accessory")
          ]
            .filter(Boolean)
            .join(" • "),
          salePrice: salePrice > 0 ? `PKR ${salePrice.toLocaleString()}` : "",
          costPrice,
          stock,
          inStock,
          stockLabel:
            mode === "purchase"
              ? isUrdu
                ? `موجودہ اسٹاک: ${stock}`
                : `Current stock: ${stock}`
              : inStock
              ? isUrdu
                ? `اسٹاک: ${stock}`
                : `In stock: ${stock}`
              : isUrdu
              ? "اسٹاک ختم"
              : "Out of stock",
          isBarcodeMatch,
          rank,
          rawItem: p
        });
      }
    });

    // 2. Mobile Handset Models
    const modelMap = new Map();
    (availableModels || []).forEach((m) => {
      if (m && m.id) {
        modelMap.set(String(m.id), {
          id: m.id,
          company: m.company || "",
          model_name: m.model_name || "",
          variant: m.variant || "",
          storage: m.storage || "",
          color: m.color || "",
          sale_price: m.sale_price || m.unit_price || m.retail_price || 0,
          cost_price: m.cost_price || m.unit_cost || 0
        });
      }
    });

    if (mode !== "purchase") {
      (branchUnits || []).forEach((u) => {
        const key = u.model_id ? String(u.model_id) : `name-${u.company}-${u.model_name}`;
        if (!modelMap.has(key)) {
          modelMap.set(key, {
            id: u.model_id || key,
            company: u.company || "",
            model_name: u.model_name || "",
            variant: u.variant || "",
            storage: u.storage || "",
            color: u.color || "",
            sale_price: u.sale_price || 0,
            cost_price: u.cost_price || 0
          });
        }
      });
    }

    modelMap.forEach((m) => {
      const matchingUnits =
        mode === "purchase"
          ? []
          : (branchUnits || []).filter(
              (u) =>
                String(u.model_id) === String(m.id) ||
                (!u.model_id &&
                  u.model_name &&
                  u.model_name.toLowerCase() === (m.model_name || "").toLowerCase())
            );
      const stock = mode === "purchase" ? 0 : matchingUnits.length;
      const inStock = mode === "purchase" ? true : stock > 0;
      const fullName = `${m.company || ""} ${m.model_name || ""}${m.variant ? ` (${m.variant})` : ""}${m.storage ? ` • ${m.storage}` : ""}${m.color ? ` • ${m.color}` : ""}`.trim() || m.model_name || "Phone Model";
      const nameLower = fullName.toLowerCase().replace(/\s+/g, " ");
      const price = Number(m.sale_price || 0);
      const cost = Number(m.cost_price || 0);

      let rank = 0;
      if (!q) {
        rank = inStock ? 10 : 1;
      } else if (nameLower.startsWith(q)) {
        rank = 50;
      } else if (nameLower.includes(q)) {
        rank = 25;
      }

      if (rank > 0) {
        list.push({
          id: `phone-model-${m.id}`,
          itemType: "phone_model",
          name: fullName,
          secondaryText: isUrdu
            ? "موبائل فون ماڈل (IMEI درکار ہے)"
            : "Mobile Phone Model (Requires IMEI scan)",
          salePrice: price > 0 ? `PKR ${price.toLocaleString()}` : "",
          costPrice: cost,
          stock,
          inStock,
          stockLabel:
            mode === "purchase"
              ? isUrdu
                ? "فون ماڈل"
                : "Phone Model"
              : inStock
              ? isUrdu
                ? `اسٹاک: ${stock} فون`
                : `In stock: ${stock} units`
              : isUrdu
              ? "اسٹاک ختم"
              : "Out of stock",
          isBarcodeMatch: false,
          rank,
          rawItem: { ...m, units: matchingUnits }
        });
      }
    });

    // Sort order:
    // 1. Exact barcode/SKU match (rank 100) first
    // 2. Starts-with (rank 50) before contains (rank 25)
    // 3. For transfer & sale: in-stock before out-of-stock
    // 4. Name comparison
    list.sort((a, b) => {
      if (b.rank !== a.rank) return b.rank - a.rank;
      if (mode !== "purchase" && a.inStock !== b.inStock) {
        return a.inStock ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return list.slice(0, 30);
  }, [dropdownQuery, availableProducts, availableModels, branchUnits, mode, isUrdu]);

  // Unified Scanner Pipeline:
  // QR tag -> IMEI digits (length from shared constant) -> barcode/SKU exact match -> product name exact match -> not found
  async function handleUniversalScan(rawInput) {
    const raw = (rawInput || "").trim();
    if (!raw) return;

    clearError();

    // -------------------------------------------------------------
    // FLOW 0: Special flow when currently awaiting an IMEI for a selected phone model
    // -------------------------------------------------------------
    if (awaitingPhoneModel) {
      let imeiCandidate = null;
      const qrMatch = raw.match(
        new RegExp(`IMEI[:=\\s]+([0-9]{${IMEI_MIN_LENGTH},${IMEI_MAX_LENGTH}})`, "i")
      );
      if (qrMatch) {
        imeiCandidate = qrMatch[1];
      } else {
        const cleanDigits = raw.replace(/[\s-]/g, "");
        if (isImeiFormat(cleanDigits)) {
          imeiCandidate = cleanDigits;
        }
      }

      if (!imeiCandidate) {
        setInlineError(
          isUrdu
            ? `براہ کرم ماڈل "${awaitingPhoneModel.name}" کے لیے ${IMEI_MIN_LENGTH}-${IMEI_MAX_LENGTH} ہندسوں کا IMEI یا QR کوڈ اسکین کریں۔`
            : `Please scan or enter a ${IMEI_MIN_LENGTH}-${IMEI_MAX_LENGTH} digit IMEI or QR tag for "${awaitingPhoneModel.name}".`
        );
        setTimeout(() => scanFieldRef.current?.focus(), 50);
        return;
      }

      const last4 = imeiCandidate.slice(-4);

      // Check duplicate in currentItems
      const isDuplicate = (currentItems || []).some(
        (it) => it.itemType === "handset" && it.imei === imeiCandidate
      );
      if (isDuplicate) {
        const msg =
          mode === "purchase"
            ? `${awaitingPhoneModel.name} (IMEI ...${last4}) is already added to this purchase`
            : mode === "sale"
            ? `${awaitingPhoneModel.name} (IMEI ...${last4}) is already in this sale`
            : `${awaitingPhoneModel.name} (IMEI ...${last4}) is already added to this transfer`;
        setInlineError(msg);
        setTimeout(() => scanFieldRef.current?.focus(), 50);
        return;
      }

      // Check Inventory / Branch status based on mode
      if (mode === "purchase") {
        // Scanning an IMEI that already exists in inventory (purchased before) is rejected
        let existingInInventory = (branchUnits || []).find((u) => u.imei === imeiCandidate);
        if (!existingInInventory && api && api.imeiLookup) {
          try {
            const lookup = await api.imeiLookup(imeiCandidate);
            if (lookup && lookup.id) {
              existingInInventory = lookup;
            }
          } catch (e) {
            // Not in inventory -> valid new handset to purchase!
          }
        }
        if (existingInInventory) {
          setInlineError(
            `${awaitingPhoneModel.name} (IMEI ...${last4}) already exists in inventory`
          );
          setTimeout(() => scanFieldRef.current?.focus(), 50);
          return;
        }

        const rawCost = awaitingPhoneModel.costPrice || awaitingPhoneModel.unitCost || "";
        const defaultRate = rawCost !== "" ? Number(stripTrailingZeros(rawCost)) : 0;

        handleDirectAdd({
          itemType: "handset",
          modelId: awaitingPhoneModel.id || awaitingPhoneModel.modelId,
          name: awaitingPhoneModel.name,
          modelTitle: awaitingPhoneModel.name,
          imei: imeiCandidate,
          quantity: 1,
          unitCost: defaultRate,
          unitPrice: awaitingPhoneModel.salePrice || 0,
          rawItem: awaitingPhoneModel.rawItem || awaitingPhoneModel
        });
        return;
      } else if (mode === "sale") {
        // Sale: must be in stock at this branch
        let unit = (branchUnits || []).find((u) => u.imei === imeiCandidate);
        if (!unit && api && api.imeiLookup) {
          try {
            const lookup = await api.imeiLookup(imeiCandidate);
            if (lookup && lookup.id) {
              unit = lookup;
            }
          } catch (err) {
            // Not found
          }
        }

        if (unit) {
          const modelName =
            `${unit.company || ""} ${unit.model_name || ""}`.trim() || awaitingPhoneModel.name;
          if (unit.current_status && unit.current_status !== "in_stock") {
            setInlineError(`${modelName} (IMEI ...${last4}) — this unit is already sold`);
            setTimeout(() => scanFieldRef.current?.focus(), 50);
            return;
          }
          if (branchId && unit.branch_id && String(unit.branch_id) !== String(branchId)) {
            setInlineError(`${modelName} (IMEI ...${last4}) — not in stock at this branch`);
            setTimeout(() => scanFieldRef.current?.focus(), 50);
            return;
          }
        } else {
          setInlineError(`${awaitingPhoneModel.name} (IMEI ...${last4}) — not in stock at this branch`);
          setTimeout(() => scanFieldRef.current?.focus(), 50);
          return;
        }

        const phoneDisplayName =
          `${unit.company || ""} ${unit.model_name || ""}${unit.variant ? ` (${unit.variant})` : ""}${unit.storage ? ` • ${unit.storage}` : ""}${unit.color ? ` • ${unit.color}` : ""}`.trim() ||
          awaitingPhoneModel.name;

        handleDirectAdd({
          itemType: "handset",
          modelId: unit.model_id || awaitingPhoneModel.id,
          name: phoneDisplayName,
          modelTitle: phoneDisplayName,
          imei: unit.imei,
          quantity: 1,
          unitCost: unit.cost_price,
          unitPrice: unit.sale_price || awaitingPhoneModel.salePrice || 0,
          rawItem: unit
        });
        return;
      } else {
        // Transfer mode: source branch unit stock check
        let unit = (branchUnits || []).find((u) => u.imei === imeiCandidate);
        if (!unit && api && api.imeiLookup) {
          try {
            const lookup = await api.imeiLookup(imeiCandidate);
            if (lookup && lookup.id) {
              if (
                lookup.current_status !== "in_stock" ||
                String(lookup.branch_id) !== String(branchId)
              ) {
                setInlineError(`${awaitingPhoneModel.name} — no stock available at this branch`);
                setTimeout(() => scanFieldRef.current?.focus(), 50);
                return;
              }
              unit = lookup;
            }
          } catch (err) {}
        }

        if (!unit) {
          setInlineError("No product found for this code");
          setTimeout(() => scanFieldRef.current?.focus(), 50);
          return;
        }

        const phoneDisplayName =
          `${unit.company || ""} ${unit.model_name || ""}${unit.variant ? ` (${unit.variant})` : ""}${unit.storage ? ` • ${unit.storage}` : ""}${unit.color ? ` • ${unit.color}` : ""}`.trim() ||
          awaitingPhoneModel.name;

        setSelectedEntryItem({
          itemType: "handset",
          modelId: unit.model_id,
          name: phoneDisplayName,
          imei: unit.imei,
          quantity: 1,
          salePrice: unit.sale_price || awaitingPhoneModel.salePrice || 0,
          rawItem: unit
        });
        setEntryQuantity("1");
        setAwaitingPhoneModel(null);
        setScanInput("");
        setDropdownQuery("");
        clearError();

        setTimeout(() => {
          if (qtyFieldRef.current) {
            qtyFieldRef.current.focus();
            qtyFieldRef.current.select?.();
          }
        }, 50);
        return;
      }
    }

    // -------------------------------------------------------------
    // FLOW 1: QR TAG & IMEI DETECTION PIPELINE
    // 1. QR Tag ("IMEI:...")
    // 2. IMEI digits (pure 14-16 digits from shared IMEI constants)
    // -------------------------------------------------------------
    let imeiCandidate = null;
    let modelNameInQr = null;
    const qrMatch = raw.match(
      new RegExp(`IMEI[:=\\s]+([0-9]{${IMEI_MIN_LENGTH},${IMEI_MAX_LENGTH}})`, "i")
    );
    if (qrMatch) {
      imeiCandidate = qrMatch[1];
      const modelMatch = raw.match(/MODEL[:=\s]+([^|;]+)/i);
      if (modelMatch) modelNameInQr = modelMatch[1].trim();
    } else {
      const cleanDigits = raw.replace(/[\s-]/g, "");
      if (isImeiFormat(cleanDigits)) {
        imeiCandidate = cleanDigits;
      }
    }

    if (imeiCandidate) {
      const last4 = imeiCandidate.slice(-4);

      // Check duplicate in currentItems
      const duplicateHandset = (currentItems || []).find(
        (it) => it.itemType === "handset" && it.imei === imeiCandidate
      );
      if (duplicateHandset) {
        const msg =
          mode === "purchase"
            ? `${duplicateHandset.name || "Handset"} (IMEI ...${last4}) is already added to this purchase`
            : mode === "sale"
            ? `${duplicateHandset.name || "Handset"} (IMEI ...${last4}) is already in this sale`
            : `${duplicateHandset.name || "Handset"} (IMEI ...${last4}) is already added to this transfer`;
        setInlineError(msg);
        setTimeout(() => scanFieldRef.current?.focus(), 50);
        return;
      }

      if (mode === "purchase") {
        // Purchase mode: check if IMEI already exists in inventory
        let existingInInventory = (branchUnits || []).find((u) => u.imei === imeiCandidate);
        if (!existingInInventory && api && api.imeiLookup) {
          try {
            const lookup = await api.imeiLookup(imeiCandidate);
            if (lookup && lookup.id) {
              existingInInventory = lookup;
            }
          } catch (e) {}
        }
        if (existingInInventory) {
          const name =
            `${existingInInventory.company || ""} ${existingInInventory.model_name || ""}${existingInInventory.variant ? ` (${existingInInventory.variant})` : ""}`.trim() ||
            "Handset";
          setInlineError(`${name} (IMEI ...${last4}) already exists in inventory`);
          setTimeout(() => scanFieldRef.current?.focus(), 50);
          return;
        }

        // Match model from QR tag or availableModels
        let matchedModel = null;
        if (modelNameInQr) {
          matchedModel = (availableModels || []).find(
            (m) =>
              `${m.company || ""} ${m.model_name || ""}`.toLowerCase().includes(modelNameInQr.toLowerCase()) ||
              (m.model_name && m.model_name.toLowerCase().includes(modelNameInQr.toLowerCase()))
          );
        }

        if (matchedModel) {
          const fullName =
            `${matchedModel.company || ""} ${matchedModel.model_name || ""}${matchedModel.variant ? ` (${matchedModel.variant})` : ""}`.trim() ||
            matchedModel.model_name ||
            "Phone Model";
          const rawCost = matchedModel.cost_price ?? matchedModel.unit_cost ?? "";
          const defaultRate = rawCost !== "" ? Number(stripTrailingZeros(rawCost)) : 0;

          handleDirectAdd({
            itemType: "handset",
            modelId: matchedModel.id,
            name: fullName,
            modelTitle: fullName,
            imei: imeiCandidate,
            quantity: 1,
            unitCost: defaultRate,
            unitPrice: matchedModel.sale_price || 0,
            rawItem: matchedModel
          });
          return;
        } else {
          // Scanned raw IMEI without model: show "No product found for this code", keep text & focus
          setInlineError("No product found for this code");
          setTimeout(() => scanFieldRef.current?.focus(), 50);
          return;
        }
      } else if (mode === "sale") {
        // Sale mode
        let unit = (branchUnits || []).find((u) => u.imei === imeiCandidate);
        if (!unit && api && api.imeiLookup) {
          try {
            const lookup = await api.imeiLookup(imeiCandidate);
            if (lookup && lookup.id) {
              unit = lookup;
            }
          } catch (e) {}
        }

        if (unit) {
          const modelName =
            `${unit.company || ""} ${unit.model_name || ""}${unit.variant ? ` (${unit.variant})` : ""}`.trim() || "Handset";
          if (unit.current_status && unit.current_status !== "in_stock") {
            setInlineError(`${modelName} (IMEI ...${last4}) — this unit is already sold`);
            setTimeout(() => scanFieldRef.current?.focus(), 50);
            return;
          }
          if (branchId && unit.branch_id && String(unit.branch_id) !== String(branchId)) {
            setInlineError(`${modelName} (IMEI ...${last4}) — not in stock at this branch`);
            setTimeout(() => scanFieldRef.current?.focus(), 50);
            return;
          }
        } else {
          setInlineError(`No handset with IMEI …${last4} in stock at ${currentBranchName || "this branch"} — check the IMEI or scan another unit.`);
          setScanInput("");
          setTimeout(() => scanFieldRef.current?.focus(), 50);
          return;
        }

        const phoneDisplayName =
          `${unit.company || ""} ${unit.model_name || ""}${unit.variant ? ` (${unit.variant})` : ""}${unit.storage ? ` • ${unit.storage}` : ""}${unit.color ? ` • ${unit.color}` : ""}`.trim() ||
          "Mobile Handset";

        handleDirectAdd({
          itemType: "handset",
          modelId: unit.model_id,
          name: phoneDisplayName,
          modelTitle: phoneDisplayName,
          imei: unit.imei,
          quantity: 1,
          unitCost: unit.cost_price,
          unitPrice: unit.sale_price || 0,
          rawItem: unit
        });
        return;
      } else {
        // Transfer mode
        let unit = (branchUnits || []).find((u) => u.imei === imeiCandidate);
        if (!unit && api && api.imeiLookup) {
          try {
            const lookup = await api.imeiLookup(imeiCandidate);
            if (lookup && lookup.id) {
              if (
                lookup.current_status !== "in_stock" ||
                String(lookup.branch_id) !== String(branchId)
              ) {
                const name = `${lookup.company || ""} ${lookup.model_name || ""}`.trim() || "Handset";
                setInlineError(`${name} — no stock available at this branch`);
                setTimeout(() => scanFieldRef.current?.focus(), 50);
                return;
              }
              unit = lookup;
            }
          } catch (e) {}
        }

        if (!unit) {
          setInlineError("No product found for this code");
          setTimeout(() => scanFieldRef.current?.focus(), 50);
          return;
        }

        const phoneDisplayName =
          `${unit.company || ""} ${unit.model_name || ""}${unit.variant ? ` (${unit.variant})` : ""}${unit.storage ? ` • ${unit.storage}` : ""}${unit.color ? ` • ${unit.color}` : ""}`.trim() ||
          "Mobile Handset";

        setSelectedEntryItem({
          itemType: "handset",
          modelId: unit.model_id,
          name: phoneDisplayName,
          imei: unit.imei,
          quantity: 1,
          salePrice: unit.sale_price || 0,
          rawItem: unit
        });
        setEntryQuantity("1");
        setScanInput("");
        setDropdownQuery("");
        clearError();

        setTimeout(() => {
          if (qtyFieldRef.current) {
            qtyFieldRef.current.focus();
            qtyFieldRef.current.select?.();
          }
        }, 50);
        return;
      }
    }

    // -------------------------------------------------------------
    // FLOW 2: BARCODE / SKU EXACT MATCH (case-insensitive)
    // -------------------------------------------------------------
    const cleanRaw = raw.toLowerCase();
    const cleanNoSpaces = raw.replace(/[\s-]/g, "").toLowerCase();
    const matchedProduct = (availableProducts || []).find((p) => {
      const b = p.barcode ? String(p.barcode).trim().toLowerCase() : "";
      const s = p.sku ? String(p.sku).trim().toLowerCase() : "";
      return (
        (b && (b === cleanRaw || b.replace(/[\s-]/g, "") === cleanNoSpaces)) ||
        (s && (s === cleanRaw || s.replace(/[\s-]/g, "") === cleanNoSpaces))
      );
    });

    if (matchedProduct) {
      const stock = Number(matchedProduct.stock_quantity ?? 0);
      if (mode !== "purchase" && stock <= 0) {
        setInlineError(`${matchedProduct.name} — no stock available at this branch`);
        setTimeout(() => scanFieldRef.current?.focus(), 50);
        return;
      }

      if (mode === "sale") {
        const existingIndex = (currentItems || []).findIndex(
          (it) =>
            (it.itemType === "product" || it.productId) &&
            String(it.productId) === String(matchedProduct.id)
        );
        const existingQty = existingIndex >= 0 ? Number(currentItems[existingIndex].quantity || 0) : 0;
        if (existingQty + 1 > stock) {
          setInlineError(`${matchedProduct.name} — only ${stock} available at this branch`);
          setTimeout(() => scanFieldRef.current?.focus(), 50);
          return;
        }
      }

      const rawCost = matchedProduct.cost_price ?? matchedProduct.purchase_rate ?? matchedProduct.sale_price ?? "";
      const defaultRate = rawCost !== "" ? Number(stripTrailingZeros(rawCost)) : 0;

      if (mode === "purchase" || mode === "sale") {
        handleDirectAdd({
          itemType: "product",
          productId: Number(matchedProduct.id),
          productName: matchedProduct.name,
          name: matchedProduct.name,
          sku: matchedProduct.sku || "",
          barcode: matchedProduct.barcode || "",
          categoryName: matchedProduct.category_name || "Accessory",
          quantity: 1,
          unitCost: mode === "purchase" ? defaultRate : matchedProduct.cost_price,
          unitPrice: matchedProduct.sale_price ?? matchedProduct.salePrice ?? 0,
          rawItem: matchedProduct
        });
        return;
      }

      setSelectedEntryItem({
        itemType: "product",
        productId: Number(matchedProduct.id),
        name: matchedProduct.name,
        sku: matchedProduct.sku || "",
        barcode: matchedProduct.barcode || "",
        categoryName: matchedProduct.category_name || "Accessory",
        stock,
        salePrice: matchedProduct.sale_price ?? matchedProduct.salePrice ?? 0,
        costPrice: defaultRate,
        rawItem: matchedProduct
      });
      setEntryQuantity("1");
      setScanInput("");
      setDropdownQuery("");
      clearError();

      setTimeout(() => {
        if (qtyFieldRef.current) {
          qtyFieldRef.current.focus();
          qtyFieldRef.current.select?.();
        }
      }, 50);
      return;
    }

    // -------------------------------------------------------------
    // FLOW 3: EXACT PRODUCT NAME MATCH (case-insensitive)
    // -------------------------------------------------------------
    const matchedByName = (availableProducts || []).find(
      (p) => p.name && p.name.trim().toLowerCase() === cleanRaw
    );
    if (matchedByName) {
      const stock = Number(matchedByName.stock_quantity ?? 0);
      if (mode !== "purchase" && stock <= 0) {
        setInlineError(`${matchedByName.name} — no stock available at this branch`);
        setTimeout(() => scanFieldRef.current?.focus(), 50);
        return;
      }

      if (mode === "sale") {
        const existingIndex = (currentItems || []).findIndex(
          (it) =>
            (it.itemType === "product" || it.productId) &&
            String(it.productId) === String(matchedByName.id)
        );
        const existingQty = existingIndex >= 0 ? Number(currentItems[existingIndex].quantity || 0) : 0;
        if (existingQty + 1 > stock) {
          setInlineError(`${matchedByName.name} — only ${stock} available at this branch`);
          setTimeout(() => scanFieldRef.current?.focus(), 50);
          return;
        }
      }

      const rawCost = matchedByName.cost_price ?? matchedByName.purchase_rate ?? matchedByName.sale_price ?? "";
      const defaultRate = rawCost !== "" ? Number(stripTrailingZeros(rawCost)) : 0;

      if (mode === "purchase" || mode === "sale") {
        handleDirectAdd({
          itemType: "product",
          productId: Number(matchedByName.id),
          productName: matchedByName.name,
          name: matchedByName.name,
          sku: matchedByName.sku || "",
          barcode: matchedByName.barcode || "",
          categoryName: matchedByName.category_name || "Accessory",
          quantity: 1,
          unitCost: mode === "purchase" ? defaultRate : matchedByName.cost_price,
          unitPrice: matchedByName.sale_price ?? matchedByName.salePrice ?? 0,
          rawItem: matchedByName
        });
        return;
      }

      setSelectedEntryItem({
        itemType: "product",
        productId: Number(matchedByName.id),
        name: matchedByName.name,
        sku: matchedByName.sku || "",
        barcode: matchedByName.barcode || "",
        categoryName: matchedByName.category_name || "Accessory",
        stock,
        salePrice: matchedByName.sale_price ?? matchedByName.salePrice ?? 0,
        costPrice: defaultRate,
        rawItem: matchedByName
      });
      setEntryQuantity("1");
      setScanInput("");
      setDropdownQuery("");
      clearError();

      setTimeout(() => {
        if (qtyFieldRef.current) {
          qtyFieldRef.current.focus();
          qtyFieldRef.current.select?.();
        }
      }, 50);
      return;
    }

    // -------------------------------------------------------------
    // FLOW 4: CODE NOT FOUND
    // "Unknown code: show 'No product found for this code', keep the text and focus in the scan field, and add nothing"
    // -------------------------------------------------------------
    setInlineError("No product found for this code");
    setTimeout(() => scanFieldRef.current?.focus(), 50);
  }

  // Handle selection from dropdown
  function handleSelectDropdownItem(item) {
    if (!item) return;
    if (mode !== "purchase" && !item.inStock) return;
    clearError();

    if (item.itemType === "product") {
      const p = item.rawItem;
      const rawCost = p.cost_price ?? p.purchase_rate ?? p.sale_price ?? "";
      const defaultRate = rawCost !== "" ? stripTrailingZeros(rawCost) : "";

      setSelectedEntryItem({
        itemType: "product",
        productId: Number(p.id),
        name: p.name,
        sku: p.sku || "",
        barcode: p.barcode || "",
        categoryName: p.category_name || "Accessory",
        stock: item.stock,
        salePrice: item.salePrice,
        costPrice: defaultRate,
        rawItem: p
      });
      setEntryQuantity("1");
      if (mode === "purchase") {
        setPurchaseRate(String(defaultRate));
      }
      setDropdownQuery("");
      setIsDropdownOpen(false);
      setHighlightedIndex(0);

      // Focus jumps to Quantity field, prefilled 1 and highlighted
      setTimeout(() => {
        if (qtyFieldRef.current) {
          qtyFieldRef.current.focus();
          qtyFieldRef.current.select?.();
        }
      }, 50);
    } else if (item.itemType === "phone_model") {
      if (mode === "purchase") {
        const m = item.rawItem;
        const fullName = `${m.company || ""} ${m.model_name || ""}${m.variant ? ` (${m.variant})` : ""}${m.storage ? ` • ${m.storage}` : ""}${m.color ? ` • ${m.color}` : ""}`.trim() || m.model_name || "Phone Model";
        const rawCost = m.cost_price ?? m.unit_cost ?? "";
        const defaultRate = rawCost !== "" ? stripTrailingZeros(rawCost) : "";
        setSelectedEntryItem({
          itemType: "phone_model",
          modelId: Number(m.id),
          name: fullName,
          modelTitle: fullName,
          costPrice: defaultRate,
          salePrice: m.sale_price || 0,
          rawItem: m
        });
        setEntryQuantity("1");
        setPurchaseRate(String(defaultRate));
        setDropdownQuery("");
        setIsDropdownOpen(false);
        setHighlightedIndex(0);
        clearError();
        setTimeout(() => {
          if (qtyFieldRef.current) {
            qtyFieldRef.current.focus();
            qtyFieldRef.current.select?.();
          }
        }, 50);
        return;
      }
      // Selecting a phone MODEL in dropdown moves focus BACK to Scan Field to scan unit's IMEI
      setAwaitingPhoneModel({
        id: item.rawItem.id,
        modelId: item.rawItem.id,
        name: item.name,
        stock: item.stock,
        salePrice: item.salePrice,
        costPrice: item.rawItem.cost_price ?? item.rawItem.unit_cost ?? "",
        unitCost: item.rawItem.cost_price ?? item.rawItem.unit_cost ?? "",
        rawItem: item.rawItem
      });
      setSelectedEntryItem(null);
      setDropdownQuery("");
      setIsDropdownOpen(false);
      setHighlightedIndex(0);

      setTimeout(() => {
        scanFieldRef.current?.focus();
      }, 50);
    }
  }

  // Handle Add Item action (from Add button or Enter on Add button)
  function handleAdd() {
    clearError();

    if (!selectedEntryItem) {
      if (scanInput.trim()) {
        handleUniversalScan(scanInput);
        return;
      }
      setInlineError(
        isUrdu
          ? "براہ کرم پہلے پروڈکٹ اسکین کریں یا منتخب کریں"
          : "Please scan or select a product first"
      );
      scanFieldRef.current?.focus();
      return;
    }

    // 1. Handset or Phone Model item
    if (selectedEntryItem.itemType === "handset" || selectedEntryItem.itemType === "phone_model") {
      if (selectedEntryItem.imei) {
        const last4 = String(selectedEntryItem.imei).slice(-4);
        const isDuplicate = (currentItems || []).some(
          (it) => it.itemType === "handset" && it.imei === selectedEntryItem.imei
        );
        if (isDuplicate) {
          const msg =
            mode === "purchase"
              ? `${selectedEntryItem.name} (IMEI ...${last4}) is already added to this purchase`
              : mode === "sale"
              ? `${selectedEntryItem.name} (IMEI ...${last4}) is already in this sale`
              : `${selectedEntryItem.name} (IMEI ...${last4}) is already added to this transfer`;
          setInlineError(msg);
          return;
        }
      }

      const qtyToAdd = Math.max(1, parseInt(entryQuantity, 10) || 1);
      const rateVal =
        mode === "purchase"
          ? purchaseRate !== ""
            ? Number(purchaseRate)
            : Number(selectedEntryItem.costPrice || selectedEntryItem.purchaseRate || 0)
          : undefined;

      if (onAddItem) {
        onAddItem({
          itemType: selectedEntryItem.imei ? "handset" : "phone_model",
          imei: selectedEntryItem.imei || "",
          modelId: selectedEntryItem.modelId,
          name: selectedEntryItem.name,
          modelTitle: selectedEntryItem.name,
          quantity: selectedEntryItem.imei ? 1 : qtyToAdd,
          unitCost: rateVal,
          unitPrice: selectedEntryItem.salePrice || 0,
          rawItem: selectedEntryItem.rawItem
        });
      }

      // Reset entry row & return focus to Scan Field
      setSelectedEntryItem(null);
      setEntryQuantity("1");
      setPurchaseRate("");
      setScanInput("");
      setDropdownQuery("");
      setAwaitingPhoneModel(null);
      clearError();
      focusScanField();
      requestAnimationFrame(focusScanField);
      setTimeout(focusScanField, 20);
      setTimeout(focusScanField, 50);
      setTimeout(focusScanField, 100);
      setTimeout(() => scanFieldRef.current?.focus(), 50);
      return;
    }

    // 2. Simple Product / Accessory item
    if (selectedEntryItem.itemType === "product") {
      const qtyToAdd = parseInt(entryQuantity, 10);
      if (isNaN(qtyToAdd) || qtyToAdd < 1) {
        setInlineError(isUrdu ? "تعداد کم از کم 1 ہونی چاہیے" : "Quantity must be at least 1");
        qtyFieldRef.current?.focus();
        return;
      }

      // In Sale and Transfer modes: enforce available branch stock boundary
      if (mode === "sale" || mode === "transfer") {
        const availableStock = selectedEntryItem.stock;
        if (availableStock <= 0) {
          setInlineError(`${selectedEntryItem.name} — no stock available at this branch`);
          return;
        }

        const existingIndex = (currentItems || []).findIndex(
          (it) =>
            (it.itemType === "product" || it.productId) &&
            String(it.productId) === String(selectedEntryItem.productId)
        );

        let existingQty = 0;
        if (existingIndex >= 0) {
          existingQty = Number(currentItems[existingIndex].quantity || 0);
        }
        const totalNewQty = existingQty + qtyToAdd;

        if (totalNewQty > availableStock) {
          setInlineError(`${selectedEntryItem.name} — only ${availableStock} available at this branch`);
          qtyFieldRef.current?.focus();
          return;
        }
      }

      const rateVal =
        mode === "purchase"
          ? purchaseRate !== ""
            ? Number(purchaseRate)
            : Number(selectedEntryItem.costPrice || 0)
          : undefined;

      if (onAddItem) {
        onAddItem({
          itemType: "product",
          productId: Number(selectedEntryItem.productId),
          productName: selectedEntryItem.name,
          name: selectedEntryItem.name,
          sku: selectedEntryItem.sku || "",
          barcode: selectedEntryItem.barcode || "",
          categoryName: selectedEntryItem.categoryName || "Accessory",
          quantity: qtyToAdd,
          unitCost: rateVal,
          unitPrice: selectedEntryItem.salePrice,
          rawItem: selectedEntryItem.rawItem
        });
      }

      // Reset entry row & return focus to Scan Field
      setSelectedEntryItem(null);
      setEntryQuantity("1");
      setPurchaseRate("");
      setScanInput("");
      setDropdownQuery("");
      setAwaitingPhoneModel(null);
      clearError();
      focusScanField();
      requestAnimationFrame(focusScanField);
      setTimeout(focusScanField, 20);
      setTimeout(focusScanField, 50);
      setTimeout(focusScanField, 100);
      setTimeout(() => scanFieldRef.current?.focus(), 50);
    }
  }

  // Alias handleAddAction for test suites that inspect handleAddAction
  const handleAddAction = handleAdd;

  return (
    <div className="pos-universal-entry-container" style={{ width: "100%", marginBottom: "0.75rem" }}>
      {/* Awaiting Phone Model IMEI Scan Guidance Banner */}
      {awaitingPhoneModel && (
        <div
          className="pos-awaiting-model-banner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.6rem 0.9rem",
            marginBottom: "0.5rem",
            borderRadius: "8px",
            background: "rgba(56, 189, 248, 0.12)",
            border: "1px solid var(--primary, #38bdf8)",
            color: "var(--text, #f8fafc)",
            flexWrap: "wrap",
            gap: "0.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.1rem" }}>📱</span>
            <span>
              {isUrdu ? "ماڈل منتخب:" : "Model Selected:"} <strong>{awaitingPhoneModel.name}</strong>
            </span>
            <span style={{ margin: "0 0.3rem", opacity: 0.5 }}>|</span>
            <span style={{ color: "var(--primary, #38bdf8)", fontWeight: 600 }}>
              {isUrdu
                ? `اب اس فون کا ${IMEI_MIN_LENGTH}-${IMEI_MAX_LENGTH} ہندسوں کا IMEI بارکوڈ یا QR اسکین کریں`
                : `Now scan ${IMEI_MIN_LENGTH}-${IMEI_MAX_LENGTH} digit IMEI barcode or QR tag`}
            </span>
          </div>

          <button
            type="button"
            className="ghost-btn btn-sm"
            onClick={() => {
              setAwaitingPhoneModel(null);
              setTimeout(() => scanFieldRef.current?.focus(), 50);
            }}
            style={{ padding: "2px 8px", fontSize: "0.8rem", color: "#ef4444" }}
          >
            ✕ {isUrdu ? "منسوخ کریں" : "Cancel"}
          </button>
        </div>
      )}

      {/* Persistent Named Inline Error Alert */}
      {inlineError && (
        <div
          className="pos-scanner-error-alert alert danger"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.55rem 0.9rem",
            marginBottom: "0.5rem",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #ef4444",
            color: "#fca5a5",
            fontSize: "0.88rem",
            fontWeight: 600
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>⚠️</span>
            <span>{inlineError}</span>
          </div>
          <button
            type="button"
            className="ghost-btn btn-sm"
            onClick={clearError}
            style={{ color: "#ef4444", fontWeight: 700, padding: "2px 6px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Entry Row: [ Universal Scan Field ] [ Product Dropdown ] [ Quantity ] ([ Purchase Rate ]) [ Add Button ] */}
      <div
        className={`pos-entry-row ${mode === "sale" ? "pos-sale-entry-row" : mode === "purchase" ? "purchase-entry-row" : "transfer-entry-row"}`}
        style={
          mode === "purchase"
            ? {
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                minHeight: "3rem",
                width: "100%",
                boxSizing: "border-box"
              }
            : {
                display: "grid",
                gridTemplateColumns:
                  mode === "sale"
                    ? "minmax(280px, 2.2fr) minmax(180px, 1.4fr) 64px 80px"
                    : "1.2fr 1.8fr 110px 100px",
                gap: mode === "sale" ? "0.5rem" : "0.75rem",
                alignItems: mode === "sale" ? "center" : "end",
                height: mode === "sale" ? "38px" : "auto",
                maxHeight: mode === "sale" ? "48px" : "none"
              }
        }
      >
        {/* 1. Universal Scan Field */}
        <div
          ref={scanContainerRef}
          style={
            mode === "purchase"
              ? { flex: "2.4 1 200px", minWidth: "16rem", position: "relative" }
              : { display: "flex", flexDirection: "column", gap: mode === "sale" ? "0" : "0.3rem", position: "relative" }
          }
        >
          {mode !== "sale" && mode !== "purchase" && (
            <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted, #94a3b8)" }}>
              ⚡ {isUrdu ? "یونیورسل اسکینر" : "Universal Scan Field"}
            </label>
          )}
          <div style={{ position: "relative", width: "100%" }}>
            <input
              ref={transferScannerInputRef}
              tabIndex={1}
              type="text"
              className="pos-scanner-input"
              style={{
                width: "100%",
                paddingLeft: "2rem",
                paddingRight: scanInput ? "2rem" : "0.75rem",
                height: mode === "sale" || mode === "purchase" ? "36px" : undefined,
                boxSizing: "border-box"
              }}
              placeholder={
                awaitingPhoneModel
                  ? isUrdu
                    ? `ماڈل "${awaitingPhoneModel.name}" کا IMEI اسکین کریں...`
                    : `Scan IMEI for ${awaitingPhoneModel.name}...`
                  : isUrdu
                  ? "بارکوڈ، کیو آر یا IMEI اسکین کریں..."
                  : "Scan Barcode, QR, IMEI..."
              }
              value={scanInput}
              onChange={(e) => {
                const val = e.target.value;
                setScanInput(val);
                clearError();
                if (val.trim().length >= 2) {
                  setIsScanDropdownOpen(true);
                  setScanHighlightedIndex(0);
                } else {
                  setIsScanDropdownOpen(false);
                }
              }}
              onFocus={() => {
                if (scanInput.trim().length >= 2) {
                  setIsScanDropdownOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                } else if (e.key === "ArrowDown") {
                  if (isScanDropdownOpen && scanSuggestions.length > 0) {
                    e.preventDefault();
                    setScanHighlightedIndex((prev) => (prev < scanSuggestions.length - 1 ? prev + 1 : 0));
                  }
                } else if (e.key === "ArrowUp") {
                  if (isScanDropdownOpen && scanSuggestions.length > 0) {
                    e.preventDefault();
                    setScanHighlightedIndex((prev) => (prev > 0 ? prev - 1 : scanSuggestions.length - 1));
                  }
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (isScanDropdownOpen && scanSuggestions[scanHighlightedIndex]) {
                    handleSelectScanSuggestion(scanSuggestions[scanHighlightedIndex]);
                    return;
                  }
                  const trimmed = scanInput.trim();
                  if (trimmed) {
                    handleUniversalScan(trimmed);
                  } else {
                    dropdownFieldRef.current?.focus();
                    if (productDropdownInputRef?.current) productDropdownInputRef.current?.focus();
                    setIsDropdownOpen(true);
                    setHighlightedIndex(0);
                  }
                } else if (e.key === "Escape") {
                  if (isScanDropdownOpen) {
                    e.preventDefault();
                    setIsScanDropdownOpen(false);
                    return;
                  }
                  if (awaitingPhoneModel) {
                    setAwaitingPhoneModel(null);
                  }
                  setScanInput("");
                  clearError();
                }
              }}
              autoFocus={autoFocus && mode !== "sale"}
              autoComplete="off"
              disabled={disabled}
            />
            <span
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                fontSize: "0.9rem"
              }}
            >
              ⚡
            </span>
            {scanInput && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  setScanInput("");
                  clearError();
                  setIsScanDropdownOpen(false);
                  scanFieldRef.current?.focus();
                }}
                style={{
                  position: "absolute",
                  right: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted, #94a3b8)",
                  fontSize: "1rem",
                  cursor: "pointer",
                  padding: "0.2rem"
                }}
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type at least 2 characters hint */}
          {scanInput.trim().length === 1 && !awaitingPhoneModel && (
            <div
              className="pos-search-hint"
              style={{
                position: "absolute",
                top: "calc(100% + 2px)",
                left: 0,
                zIndex: 1000,
                fontSize: "0.75rem",
                color: "var(--text-muted, #94a3b8)",
                background: "var(--surface, #1e293b)",
                border: "1px solid var(--border, #334155)",
                borderRadius: "4px",
                padding: "2px 8px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                whiteSpace: "nowrap"
              }}
            >
              Type at least 2 characters to search
            </div>
          )}

          {/* Universal Scan Field Attached Dropdown */}
          {isScanDropdownOpen && scanSuggestions.length > 0 && (
            <div
              className="pos-attached-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 1000,
                background: "var(--surface, #1e293b)",
                border: "1px solid var(--border, #334155)",
                borderRadius: "8px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
                maxHeight: "320px",
                overflowY: "auto"
              }}
            >
              {scanSuggestions.map((item, idx) => (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  data-product-id={item.rawItem?.id}
                  className={`pos-combobox-row ${idx === scanHighlightedIndex ? "is-highlighted" : ""} ${!item.inStock && mode !== "purchase" ? "is-out-of-stock" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.55rem 0.8rem",
                    borderBottom: idx < scanSuggestions.length - 1 ? "1px solid var(--border, rgba(255,255,255,0.06))" : "none",
                    background: idx === scanHighlightedIndex ? "rgba(56, 189, 248, 0.15)" : "transparent",
                    cursor: item.inStock || mode === "purchase" ? "pointer" : "not-allowed",
                    opacity: item.inStock || mode === "purchase" ? 1 : 0.45,
                    transition: "background 0.15s ease"
                  }}
                  onMouseEnter={() => {
                    if (item.inStock || mode === "purchase") setScanHighlightedIndex(idx);
                  }}
                  onClick={() => {
                    handleSelectScanSuggestion(item);
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", paddingRight: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.9rem" }}>{item.itemType === "phone_model" ? "📱" : "📦"}</span>
                      <strong style={{ fontSize: "0.86rem", color: item.inStock || mode === "purchase" ? "var(--text, #f8fafc)" : "var(--text-muted, #94a3b8)" }}>
                        {highlightMatch(item.name, scanInput)}
                      </strong>
                    </div>
                    {item.secondaryText && <span style={{ fontSize: "0.74rem", color: "var(--text-muted, #94a3b8)" }}>{item.secondaryText}</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", whiteSpace: "nowrap" }}>
                    {item.salePrice && <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--primary, #38bdf8)" }}>{item.salePrice}</span>}
                    <span style={{ fontSize: "0.74rem", fontWeight: 600, color: item.inStock || mode === "purchase" ? "#10b981" : "#ef4444" }}>{item.stockLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Product Dropdown (Search by Name + Displays Selected Product) */}
        <div
          ref={containerRef}
          style={
            mode === "purchase"
              ? { flex: "1.6 1 150px", minWidth: "12rem", position: "relative" }
              : { display: "flex", flexDirection: "column", gap: mode === "sale" ? "0" : "0.3rem", position: "relative" }
          }
        >
          {mode !== "sale" && mode !== "purchase" && (
            <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted, #94a3b8)" }}>
              📦 {isUrdu ? "پروڈکٹ / فون ماڈل" : "Product / Phone Model"}
            </label>
          )}
          <div style={{ position: "relative", width: "100%" }}>
            <input
              ref={productDropdownInputRef}
              tabIndex={2}
              type="text"
              className="pos-scanner-input"
              style={{
                width: "100%",
                paddingRight: selectedEntryItem || dropdownQuery ? "2rem" : "0.75rem",
                fontWeight: selectedEntryItem ? 600 : "normal",
                color: selectedEntryItem ? "var(--primary, #38bdf8)" : "inherit",
                height: mode === "sale" || mode === "purchase" ? "36px" : undefined,
                boxSizing: "border-box"
              }}
              placeholder={
                selectedEntryItem
                  ? selectedEntryItem.name
                  : awaitingPhoneModel
                  ? `${awaitingPhoneModel.name} (Awaiting IMEI scan...)`
                  : isUrdu
                  ? "نام سے پروڈکٹ یا فون تلاش کریں..."
                  : "Search product or phone by name..."
              }
              value={
                isDropdownOpen
                  ? dropdownQuery
                  : selectedEntryItem
                  ? `${selectedEntryItem.name}${selectedEntryItem.imei ? ` • IMEI: ${selectedEntryItem.imei}` : ""}`
                  : awaitingPhoneModel
                  ? `${awaitingPhoneModel.name} (Awaiting IMEI scan...)`
                  : dropdownQuery
              }
              onFocus={() => {
                setIsDropdownOpen(true);
              }}
              onClick={() => {
                setIsDropdownOpen(true);
              }}
              onChange={(e) => {
                setDropdownQuery(e.target.value);
                setIsDropdownOpen(true);
                setHighlightedIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  setIsDropdownOpen(false);
                  scanFieldRef.current?.focus();
                  if (transferScannerInputRef?.current) transferScannerInputRef.current?.focus();
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (!isDropdownOpen) {
                    setIsDropdownOpen(true);
                    setHighlightedIndex(0);
                  } else {
                    setHighlightedIndex((prev) =>
                      prev < productDropdownItems.length - 1 ? prev + 1 : 0
                    );
                  }
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (isDropdownOpen) {
                    setHighlightedIndex((prev) =>
                      prev > 0 ? prev - 1 : Math.max(0, productDropdownItems.length - 1)
                    );
                  }
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (isDropdownOpen && productDropdownItems[highlightedIndex]) {
                    const chosen = productDropdownItems[highlightedIndex];
                    if (mode === "purchase" || chosen.inStock) {
                      handleSelectDropdownItem(chosen);
                    }
                  } else if (selectedEntryItem) {
                    setIsDropdownOpen(false);
                    if (qtyFieldRef.current) {
                      qtyFieldRef.current.focus();
                      qtyFieldRef.current.select?.();
                    }
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setIsDropdownOpen(false);
                }
              }}
              autoComplete="off"
              disabled={disabled}
            />
            {(selectedEntryItem || dropdownQuery) && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  setSelectedEntryItem(null);
                  setDropdownQuery("");
                  setIsDropdownOpen(false);
                  dropdownFieldRef.current?.focus();
                }}
                style={{
                  position: "absolute",
                  right: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted, #94a3b8)",
                  fontSize: "1rem",
                  cursor: "pointer",
                  padding: "0.2rem"
                }}
                title="Clear selection"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown Menu Overlay */}
          {isDropdownOpen && (
            <div
              className="pos-attached-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 1000,
                background: "var(--surface, #1e293b)",
                border: "1px solid var(--border, #334155)",
                borderRadius: "8px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
                maxHeight: "360px",
                overflowY: "auto"
              }}
            >
              {productDropdownItems.length === 0 ? (
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    textAlign: "center",
                    color: "var(--text-muted, #94a3b8)",
                    fontSize: "0.88rem"
                  }}
                >
                  {dropdownQuery
                    ? isUrdu
                      ? `کوئی پروڈکٹ '${dropdownQuery}' سے مطابقت نہیں رکھتا`
                      : `No products match '${dropdownQuery}'`
                    : isUrdu
                    ? "کوئی آئٹم دستیاب نہیں ہے"
                    : "No items available"}
                </div>
              ) : (
                productDropdownItems.map((item, idx) => (
                  <div
                    key={item.id}
                    data-item-id={item.id}
                    data-product-id={item.rawItem?.id}
                    className={`pos-combobox-row ${idx === highlightedIndex ? "is-highlighted" : ""} ${!item.inStock && mode !== "purchase" ? "is-out-of-stock" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.6rem 0.85rem",
                      borderBottom:
                        idx < productDropdownItems.length - 1
                          ? "1px solid var(--border, rgba(255,255,255,0.06))"
                          : "none",
                      background:
                        idx === highlightedIndex ? "rgba(56, 189, 248, 0.15)" : "transparent",
                      cursor:
                        item.inStock || mode === "purchase" ? "pointer" : "not-allowed",
                      opacity: item.inStock || mode === "purchase" ? 1 : 0.45,
                      transition: "background 0.15s ease"
                    }}
                    onMouseEnter={() => {
                      if (item.inStock || mode === "purchase") setHighlightedIndex(idx);
                    }}
                    onClick={() => {
                      if (item.inStock || mode === "purchase") handleSelectDropdownItem(item);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        overflow: "hidden",
                        paddingRight: "0.5rem"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          flexWrap: "wrap"
                        }}
                      >
                        <span style={{ fontSize: "0.95rem" }}>
                          {item.itemType === "phone_model" ? "📱" : "📦"}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            color:
                              item.inStock || mode === "purchase"
                                ? "var(--text, #f8fafc)"
                                : "var(--text-muted, #94a3b8)"
                          }}
                        >
                          {highlightMatch(item.name, dropdownQuery)}
                        </span>
                        {item.isBarcodeMatch && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "#10b981",
                              color: "#ffffff"
                            }}
                          >
                            {isUrdu ? "بارکوڈ میچ" : "Barcode match"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted, #94a3b8)" }}>
                        {item.secondaryText}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "2px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {item.salePrice && (
                        <span
                          style={{
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            color: "var(--primary, #38bdf8)"
                          }}
                        >
                          {item.salePrice}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color:
                            item.inStock || mode === "purchase" ? "#10b981" : "#ef4444"
                        }}
                      >
                        {item.stockLabel}
                      </span>
                      {(item.inStock || mode === "purchase") && (
                        <span style={{ fontSize: "0.72rem", color: "var(--primary, #38bdf8)" }}>
                          {item.itemType === "phone_model"
                            ? isUrdu
                              ? "منتخب کریں ↵"
                              : "Select Model ↵"
                            : isUrdu
                            ? "منتخب کریں ↵"
                            : "Select ↵"}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 3. Quantity */}
        <div
          style={
            mode === "purchase"
              ? { width: "clamp(3.5rem, 5%, 4.5rem)", flex: "0 0 clamp(3.5rem, 5%, 4.5rem)" }
              : { display: "flex", flexDirection: "column", gap: mode === "sale" ? "0" : "0.3rem" }
          }
        >
          {mode !== "sale" && mode !== "purchase" && (
            <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted, #94a3b8)" }}>
              🔢 {isUrdu ? "تعداد" : "Quantity"}
            </label>
          )}
          <input
            ref={quantityInputRef}
            tabIndex={3}
            type="number"
            min="1"
            className="pos-scanner-input"
            style={{
              width: mode === "sale" ? "64px" : "100%",
              height: mode === "sale" || mode === "purchase" ? "36px" : undefined,
              boxSizing: "border-box",
              textAlign: "center",
              fontWeight: 600,
              opacity: selectedEntryItem?.itemType === "handset" ? 0.65 : 1,
              cursor: selectedEntryItem?.itemType === "handset" ? "not-allowed" : "text",
              background:
                selectedEntryItem?.itemType === "handset"
                  ? "rgba(255, 255, 255, 0.05)"
                  : "inherit"
            }}
            disabled={selectedEntryItem?.itemType === "handset"}
            readOnly={selectedEntryItem?.itemType === "handset"}
            aria-disabled={selectedEntryItem?.itemType === "handset"}
            value={selectedEntryItem?.itemType === "handset" ? "1" : entryQuantity}
            onFocus={(e) => {
              e.target.select?.();
            }}
            onChange={(e) => {
              if (selectedEntryItem?.itemType === "handset") return;
              setEntryQuantity(e.target.value);
              clearError();
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                dropdownFieldRef.current?.focus();
                if (productDropdownInputRef?.current) productDropdownInputRef.current?.focus();
                setIsDropdownOpen(true);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (mode === "purchase") {
                  if (purchaseRateFieldRef.current) {
                    purchaseRateFieldRef.current.focus();
                    purchaseRateFieldRef.current.select?.();
                  }
                } else {
                  addBtnRef.current?.focus();
                  if (addButtonRef?.current) addButtonRef.current?.focus();
                }
              } else if (selectedEntryItem?.itemType === "handset") {
                if (e.key !== "ArrowRight" && e.key !== "Escape") {
                  e.preventDefault();
                }
              }
            }}
          />
        </div>

        {/* 4. Purchase Rate (ONLY for mode === "purchase") */}
        {mode === "purchase" && (
          <div style={{ width: "clamp(5.5rem, 8%, 7rem)", flex: "0 0 clamp(5.5rem, 8%, 7rem)" }}>
            <input
              ref={purchaseRateFieldRef}
              tabIndex={4}
              type="number"
              step="any"
              min="0"
              className="pos-scanner-input"
              style={{
                width: "100%",
                height: "36px",
                textAlign: "right",
                fontWeight: 700,
                color: "var(--primary, #38bdf8)",
                boxSizing: "border-box"
              }}
              placeholder="0"
              value={purchaseRate}
              onFocus={(e) => {
                e.target.select?.();
              }}
              onChange={(e) => {
                setPurchaseRate(e.target.value);
                clearError();
              }}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  if (qtyFieldRef.current) {
                    qtyFieldRef.current.focus();
                    qtyFieldRef.current.select?.();
                  }
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (addBtnRef.current) addBtnRef.current?.focus();
                  handleAddAction();
                }
              }}
            />
          </div>
        )}

        {/* 5. Add Button */}
        <div style={mode === "purchase" ? { flex: "0 0 auto", minWidth: "4rem" } : undefined}>
          <button
            ref={addButtonRef}
            tabIndex={4}
            type="button"
            className="primary-btn"
            style={{
              width: "100%",
              height: mode === "sale" || mode === "purchase" ? "36px" : "42px",
              whiteSpace: "nowrap",
              fontWeight: 700,
              fontSize: mode === "sale" || mode === "purchase" ? "0.88rem" : "0.95rem",
              padding: mode === "sale" || mode === "purchase" ? "0 0.6rem" : undefined
            }}
            title="Scan / Add"
            onClick={handleAddAction}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                if (mode === "purchase") {
                  if (purchaseRateFieldRef.current) {
                    purchaseRateFieldRef.current.focus();
                    purchaseRateFieldRef.current.select?.();
                  }
                } else {
                  if (qtyFieldRef.current) {
                    qtyFieldRef.current.focus();
                    qtyFieldRef.current.select?.();
                  }
                  if (quantityInputRef?.current) {
                    quantityInputRef.current.focus();
                  }
                }
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleAddAction();
              }
            }}
            disabled={disabled}
          >
            + {isUrdu ? "شامل کریں" : "Add"}
          </button>
          {/* Transfer Line Items Table */}
        </div>
      </div>
    </div>
  );
}
