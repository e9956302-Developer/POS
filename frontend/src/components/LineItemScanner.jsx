import { useMemo } from "react";
import { SearchableSelect } from "./SearchableSelect.jsx";

export function LineItemScanner({ models: rawModels = [], products: rawProducts = [], mode = "sale", items: rawItems = [], onChange }) {
  const models = useMemo(() => (Array.isArray(rawModels) ? rawModels : []), [rawModels]);
  const products = useMemo(() => (Array.isArray(rawProducts) ? rawProducts : []), [rawProducts]);
  const items = useMemo(() => (Array.isArray(rawItems) ? rawItems : []), [rawItems]);

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const rate = Number(mode === "purchase" ? item.unitCost || 0 : item.unitPrice || 0);
        const qty = item.itemType === "product" || item.productId ? Number(item.quantity || 1) : 1;
        return sum + rate * qty;
      }, 0),
    [items, mode]
  );

  function updateItem(index, patch) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function addHandsetRow() {
    onChange([
      ...items,
      { itemType: "handset", modelId: "", imei: "", quantity: 1, unitCost: "", unitPrice: "" }
    ]);
  }

  function addProductRow() {
    onChange([
      ...items,
      { itemType: "product", productId: "", quantity: 1, unitCost: "", unitPrice: "" }
    ]);
  }

  function removeRow(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleModelSelect(index, modelId) {
    const model = models.find((m) => String(m.id) === String(modelId));
    const defaultRate = mode === "purchase"
      ? (model?.unit_cost || model?.cost_price || "")
      : (model?.selling_price || model?.retail_price || "");

    updateItem(index, {
      itemType: "handset",
      modelId: modelId ? Number(modelId) : "",
      productId: "",
      quantity: 1,
      [mode === "purchase" ? "unitCost" : "unitPrice"]: defaultRate
    });
  }

  function handleProductSelect(index, productId) {
    const prod = products.find((p) => String(p.id) === String(productId));
    const defaultRate = mode === "purchase"
      ? (prod?.cost_price || "")
      : (prod?.retail_price ?? prod?.sale_price ?? "");

    updateItem(index, {
      itemType: "product",
      productId: productId ? Number(productId) : "",
      modelId: "",
      imei: "",
      quantity: items[index]?.quantity ? Math.max(1, Number(items[index].quantity)) : 1,
      [mode === "purchase" ? "unitCost" : "unitPrice"]: defaultRate
    });
  }

  return (
    <div className="scanner-block">
      <div className="table-wrap" style={{ overflowX: "auto", width: "100%" }}>
        <table style={{ minWidth: "780px", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "115px", minWidth: "115px", whiteSpace: "nowrap" }}>Type</th>
              <th style={{ minWidth: "220px", whiteSpace: "nowrap" }}>Item / Catalog Selection</th>
              <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>IMEI / Details</th>
              <th style={{ width: "75px", minWidth: "75px", textAlign: "center", whiteSpace: "nowrap" }}>Qty</th>
              <th style={{ width: "125px", minWidth: "125px", textAlign: "right", whiteSpace: "nowrap" }}>{mode === "purchase" ? "Unit Cost" : "Unit Price"}</th>
              <th style={{ width: "120px", minWidth: "120px", textAlign: "right", whiteSpace: "nowrap" }}>Subtotal</th>
              <th style={{ width: "45px", minWidth: "45px", textAlign: "center", whiteSpace: "nowrap" }} />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)" }}>
                  No items in order. Use the buttons below to add a cell phone or simple product.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const isHandset = item.itemType === "handset" || Boolean(item.modelId) || Boolean(item.imei);
                const qty = isHandset ? 1 : Math.max(1, Number(item.quantity || 1));
                const rate = Number(mode === "purchase" ? item.unitCost || 0 : item.unitPrice || 0);
                const lineTotal = qty * rate;

                const selectedProduct = item.productId
                  ? products.find((p) => String(p.id) === String(item.productId))
                  : null;

                return (
                  <tr key={`${item.imei || item.productId || item.modelId}-${index}`}>
                    <td>
                      <select
                        value={isHandset ? "handset" : "product"}
                        onChange={(e) => {
                          const newType = e.target.value;
                          if (newType === "handset") {
                            updateItem(index, { itemType: "handset", productId: "", quantity: 1 });
                          } else {
                            updateItem(index, { itemType: "product", modelId: "", imei: "", quantity: 1 });
                          }
                        }}
                        style={{
                          padding: "0.3rem 0.5rem",
                          fontSize: "0.82rem",
                          borderRadius: "6px",
                          background: "var(--input-bg)",
                          color: "var(--text)",
                          border: "1px solid var(--border)"
                        }}
                      >
                        <option value="handset">📱 Cell Phone</option>
                        <option value="product">📦 Product</option>
                      </select>
                    </td>

                    <td>
                      {isHandset ? (
                        <SearchableSelect
                          value={item.modelId ? String(item.modelId) : ""}
                          placeholder="Select phone model..."
                          onChange={(e) => handleModelSelect(index, e.target.value)}
                        >
                          <option value="">-- Choose Phone Model --</option>
                          {models.map((m) => (
                            <option key={m.id} value={m.id}>
                              📱 {m.company} {m.model_name} {m.variant ? `(${m.variant})` : ""} {m.storage ? `• ${m.storage}` : ""} {m.color ? `• ${m.color}` : ""}
                            </option>
                          ))}
                        </SearchableSelect>
                      ) : (
                        <SearchableSelect
                          value={item.productId ? String(item.productId) : ""}
                          placeholder="Select product / accessory..."
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              📦 {p.name} {p.sku ? `(${p.sku})` : ""} - Stock: {p.stock_quantity ?? 0}
                            </option>
                          ))}
                        </SearchableSelect>
                      )}
                    </td>

                    <td>
                      {isHandset ? (
                        <input
                          value={item.imei || ""}
                          onChange={(e) => updateItem(index, { imei: e.target.value.replace(/\s+/g, "") })}
                          placeholder="15-digit IMEI"
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            fontWeight: item.imei ? 600 : 400,
                            letterSpacing: "0.5px",
                            padding: "0.3rem 0.5rem",
                            fontSize: "0.84rem",
                            borderRadius: "6px",
                            background: "var(--input-bg)",
                            color: "var(--text)",
                            border: "1px solid var(--border)"
                          }}
                        />
                      ) : (
                        <span className="muted small" style={{ color: "var(--muted)" }}>
                          {selectedProduct ? `${selectedProduct.category_name || "General"} • Stock: ${selectedProduct.stock_quantity ?? 0}` : "Non-serialized"}
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: "center" }}>
                      {isHandset ? (
                        <span className="muted" style={{ fontWeight: "700", color: "var(--text)" }}>
                          1
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) =>
                            updateItem(index, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                          }
                          style={{
                            width: "65px",
                            textAlign: "center",
                            padding: "0.3rem 0.4rem",
                            fontSize: "0.84rem",
                            borderRadius: "6px",
                            background: "var(--input-bg)",
                            color: "var(--text)",
                            border: "1px solid var(--border)"
                          }}
                        />
                      )}
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={mode === "purchase" ? item.unitCost ?? "" : item.unitPrice ?? ""}
                        onChange={(e) =>
                          updateItem(index, {
                            [mode === "purchase" ? "unitCost" : "unitPrice"]: e.target.value
                          })
                        }
                        placeholder="0"
                        style={{
                          textAlign: "right",
                          fontWeight: "600",
                          padding: "0.3rem 0.5rem",
                          fontSize: "0.84rem",
                          borderRadius: "6px",
                          background: "var(--input-bg)",
                          color: "var(--text)",
                          border: "1px solid var(--border)"
                        }}
                      />
                    </td>

                    <td style={{ textAlign: "right", fontWeight: "700", color: "var(--text)", whiteSpace: "nowrap" }}>
                      PKR {lineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => removeRow(index)}
                        title="Remove row"
                        style={{ color: "var(--danger)", padding: "0.2rem 0.4rem" }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        className="row-actions"
        style={{
          marginTop: "0.85rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem"
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="secondary-btn btn-sm"
            type="button"
            onClick={addHandsetRow}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: "600" }}
          >
            <span>📱</span> Add Cell Phone (IMEI)
          </button>
          <button
            className="secondary-btn btn-sm"
            type="button"
            onClick={addProductRow}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: "600" }}
          >
            <span>📦</span> Add Simple Product
          </button>
        </div>
        <strong style={{ fontSize: "1.05rem", color: "var(--text)" }}>
          Total: PKR {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </strong>
      </div>
    </div>
  );
}

