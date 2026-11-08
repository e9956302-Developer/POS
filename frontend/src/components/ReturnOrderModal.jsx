import { useState } from "react";
import { api } from "../api.js";
import { ReceiptModal } from "./ReceiptModal.jsx";

export function ReturnOrderModal({ isOpen, onClose, defaultType = "customer_return", referenceOrder = null, onReturnCreated }) {
  const [returnType, setReturnType] = useState(defaultType); // "customer_return" (Sale Return) | "vendor_return" (Purchase Return)
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [itemCondition, setItemCondition] = useState("good");
  const [selectedItems, setSelectedItems] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successResult, setSuccessResult] = useState(null);

  if (!isOpen) return null;

  const items = referenceOrder?.items || [];
  const isSaleReturn = returnType === "customer_return";

  function toggleItemSelection(item, checked) {
    setSelectedItems((prev) => {
      const next = { ...prev };
      const key = item.id || item.imei || `${item.model_id}-${item.product_id}`;
      if (checked) {
        next[key] = {
          ...item,
          refundRate: item.unit_price || item.unit_cost || item.price || 0,
          quantity: item.quantity || 1
        };
      } else {
        delete next[key];
      }
      return next;
    });
  }

  function updateRefundRate(key, rate) {
    setSelectedItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], refundRate: Number(rate) || 0 }
    }));
  }

  const totalRefund = Object.values(selectedItems).reduce((sum, it) => sum + (Number(it.refundRate) * Number(it.quantity || 1)), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const selectedList = Object.values(selectedItems);
    if (selectedList.length === 0) {
      setError("Please select at least one item to return.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        branchId: referenceOrder?.branch_id || referenceOrder?.branchId,
        returnType,
        referenceType: isSaleReturn ? "sale_order" : "purchase_order",
        referenceId: referenceOrder?.id,
        partyId: isSaleReturn ? referenceOrder?.customer_id : referenceOrder?.vendor_id,
        returnDate,
        totalRefundAmount: totalRefund,
        paymentMethod,
        reason: reason || (isSaleReturn ? "Customer Return" : "Vendor Return"),
        notes,
        items: selectedList.map((it) => ({
          mobileUnitId: it.mobile_unit_id || it.unit_id || null,
          imei: it.imei || null,
          productId: it.product_id || null,
          quantity: Number(it.quantity || 1),
          refundRate: Number(it.refundRate || 0),
          itemCondition
        }))
      };

      const res = await api.createReturn(payload);
      setSuccessResult(res);
      if (onReturnCreated) onReturnCreated(res);
    } catch (err) {
      setError(err.message || "Failed to process return.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successResult) {
    const returnReceiptData = {
      return_number: successResult.return_number || successResult.returnNumber || `RET-${successResult.id}`,
      return_date: returnDate,
      return_type: returnType,
      reference_invoice: referenceOrder?.invoice_number || `Order #${referenceOrder?.id}`,
      party_name: referenceOrder?.party_name || referenceOrder?.customer_name || referenceOrder?.vendor_name || referenceOrder?.purchaser_name,
      party_phone: referenceOrder?.party_phone || referenceOrder?.customer_phone || referenceOrder?.vendor_phone,
      payment_method: paymentMethod,
      reason: reason || (isSaleReturn ? "Customer Return" : "Vendor Return"),
      items: Object.values(selectedItems).map((it) => ({
        model_name: it.model_name ? `${it.company || ""} ${it.model_name}` : (it.product_name || "Item"),
        imei: it.imei || it.product_sku,
        quantity: Number(it.quantity || 1),
        refund_rate: Number(it.refundRate || 0),
        item_condition: itemCondition
      })),
      total_refund_amount: totalRefund,
      notes
    };

    return (
      <ReceiptModal
        isOpen={true}
        onClose={onClose}
        type="return"
        data={returnReceiptData}
      />
    );
  }

  return (
    <div className="modal-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px"
    }}>
      <div className="modal-dialog modal-large" style={{
        background: "var(--surface)",
        color: "var(--text)",
        borderRadius: "14px",
        width: "90%",
        maxWidth: "750px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border)"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>
              {isSaleReturn ? "↩️ Process Sale Return (Customer Refund)" : "↪️ Process Purchase Return (Return to Vendor)"}
            </h3>
            {referenceOrder && (
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                Order #{referenceOrder.invoice_number || referenceOrder.id} • {referenceOrder.party_name || referenceOrder.customer_name || referenceOrder.vendor_name || "Direct Party"}
              </p>
            )}
          </div>
          <button onClick={onClose} className="close-btn" style={{ fontSize: "1.2rem", padding: "4px 10px" }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", overflowY: "auto" }}>
          {error && <div className="alert-banner alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Type Switcher */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className={isSaleReturn ? "primary-btn" : "ghost-btn"}
                  onClick={() => setReturnType("customer_return")}
                  style={{ flex: 1, padding: "8px" }}
                >
                  ↩️ Sale Return (Customer)
                </button>
                <button
                  type="button"
                  className={!isSaleReturn ? "primary-btn" : "ghost-btn"}
                  onClick={() => setReturnType("vendor_return")}
                  style={{ flex: 1, padding: "8px" }}
                >
                  ↪️ Purchase Return (Vendor)
                </button>
              </div>

              {/* Items selection table */}
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                  Select Item(s) to Return:
                </label>
                {items.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    No items found on this order. Ensure the order was loaded with items.
                  </p>
                ) : (
                  <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflowX: "auto", width: "100%" }}>
                    <table className="data-table" style={{ width: "100%", minWidth: "660px", margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: "45px", minWidth: "45px", textAlign: "center", whiteSpace: "nowrap" }}></th>
                          <th style={{ minWidth: "180px", whiteSpace: "nowrap" }}>Description</th>
                          <th style={{ minWidth: "140px", whiteSpace: "nowrap" }}>IMEI / SKU</th>
                          <th style={{ minWidth: "125px", whiteSpace: "nowrap" }}>Original Price</th>
                          <th style={{ minWidth: "135px", whiteSpace: "nowrap" }}>Refund Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => {
                          const key = it.id || it.imei || `${it.model_id}-${it.product_id}`;
                          const isSelected = Boolean(selectedItems[key]);
                          const desc = it.model_name 
                            ? `${it.company || ""} ${it.model_name}` 
                            : it.product_name || "Item";

                          return (
                            <tr key={key} style={{ background: isSelected ? "rgba(var(--primary-rgb), 0.16)" : "transparent" }}>
                              <td style={{ width: "45px", minWidth: "45px", textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => toggleItemSelection(it, e.target.checked)}
                                />
                              </td>
                              <td style={{ fontWeight: "600" }}>{desc}</td>
                              <td style={{ fontFamily: "var(--font-mono, monospace)" }}>{it.imei || it.product_sku || "N/A"}</td>
                              <td style={{ whiteSpace: "nowrap" }}>Rs. {Number(it.unit_price || it.unit_cost || 0).toLocaleString()}</td>
                              <td>
                                {isSelected ? (
                                  <input
                                    type="number"
                                    className="input-text"
                                    style={{ width: "110px", padding: "4px 8px" }}
                                    value={selectedItems[key]?.refundRate || ""}
                                    onChange={(e) => updateRefundRate(key, e.target.value)}
                                  />
                                ) : (
                                  <span style={{ color: "var(--text-muted)" }}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Form Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label className="input-label">Item Condition</label>
                  <select
                    value={itemCondition}
                    onChange={(e) => setItemCondition(e.target.value)}
                    className="input-select"
                  >
                    <option value="good">Good / Restockable</option>
                    <option value="damaged">Damaged</option>
                    <option value="defective">Defective / Faulty</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input-select"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="account">Adjust Ledger / Balance</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label className="input-label">Reason for Return</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Customer changed mind, display fault, incorrect specs"
                    className="input-text"
                  />
                </div>
              </div>

              {/* Total Refund Summary */}
              <div style={{
                padding: "14px",
                background: "var(--surface-strong)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Total Refund Amount:</span>
                  <div style={{ fontSize: "1.4rem", fontWeight: "800", color: isSaleReturn ? "var(--danger)" : "var(--positive)" }}>
                    Rs. {totalRefund.toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={onClose} className="ghost-btn" disabled={submitting}>Cancel</button>
                  <button type="submit" className="primary-btn" disabled={submitting || totalRefund <= 0}>
                    {submitting ? "Processing..." : `Confirm ${isSaleReturn ? "Sale Return" : "Purchase Return"}`}
                  </button>
                </div>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
}
