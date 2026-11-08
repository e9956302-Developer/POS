import { useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { openWhatsAppReminder } from "../utils/whatsapp.js";

/**
 * Universal Multi-Flow Receipt & Voucher Modal
 * Supports:
 * 1. "sale"     - Sale Invoices / Retail POS Slips (80mm Thermal & A4)
 * 2. "purchase" - Purchase Inward Procurement Vouchers & Vendor Bills (80mm Thermal & A4)
 * 3. "return"   - Sale Return / Refund Slips & Vendor RMAs (80mm Thermal & A4)
 * 4. "payment"  - Cash Collection & Ledger Payment Slips (80mm Thermal & A4)
 * 5. "repair"   - Device Intake Claim Slips & Delivery Receipts (80mm Thermal & A4)
 */
export function ReceiptModal({
  isOpen,
  onClose,
  type = "sale",
  data,
  title = "",
  defaultMode = "thermal",
  shopName: propShopName = "",
  companyLogo: propCompanyLogo = ""
}) {
  const { isRtl, isUrdu } = useLanguage();
  const [receiptMode, setReceiptMode] = useState(defaultMode); // "thermal" | "standard"

  if (!isOpen || !data) return null;

  const shopName =
    propShopName ||
    data.shop_name ||
    data.business_name ||
    data.businessName ||
    (typeof window !== "undefined" && window.__POS_COMPANY_NAME__) ||
    "DigitalMarkaz360";
  const companyLogo =
    propCompanyLogo ||
    data.company_logo ||
    data.business_logo ||
    data.logo_url ||
    data.businessLogo ||
    (typeof window !== "undefined" && window.__POS_COMPANY_LOGO__) ||
    null;
  const branchName = data.branch_name || data.branchName || "Main Branch";
  const currentDate = new Date().toISOString().slice(0, 10);

  function handlePrint() {
    window.print();
  }

  // Determine modal title & slip header based on flow type
  let modalTitle = title;
  let thermalBadge = "";
  let standardBadge = "";

  if (type === "sale") {
    modalTitle = modalTitle || `🧾 Sale Receipt #${data.invoice_number || data.id}`;
    thermalBadge = isUrdu ? "فروخت کی رسید / SALE RECEIPT" : "SALE RECEIPT";
    standardBadge = "TAX INVOICE";
  } else if (type === "purchase") {
    modalTitle = modalTitle || `📦 Purchase Inward Voucher #${data.invoice_number || data.id}`;
    thermalBadge = isUrdu ? "خریداری واؤچر / PURCHASE INWARD VOUCHER" : "PURCHASE INWARD VOUCHER";
    standardBadge = "PURCHASE PROCUREMENT VOUCHER";
  } else if (type === "return") {
    const isCustomer = data.return_type === "customer_return" || !data.return_type;
    modalTitle = modalTitle || `↩️ ${isCustomer ? "Customer Sale Return" : "Vendor Purchase Return"} #${data.return_number || data.id}`;
    thermalBadge = isCustomer
      ? (isUrdu ? "واپسی و ریفنڈ سلپ / SALE RETURN & REFUND" : "SALE RETURN & REFUND")
      : (isUrdu ? "وینڈر واپسی سلپ / VENDOR RETURN (RMA)" : "VENDOR PURCHASE RETURN (RMA)");
    standardBadge = isCustomer ? "CREDIT NOTE / REFUND VOUCHER" : "DEBIT NOTE / VENDOR RETURN";
  } else if (type === "payment") {
    const isInward = data.direction === "in" || data.type === "sale" || !data.direction;
    modalTitle = modalTitle || `💳 Payment Receipt #${data.voucher_number || data.id}`;
    thermalBadge = isInward
      ? (isUrdu ? "ادائیگی کی رسید / CASH RECEIPT" : "PAYMENT RECEIPT (RECEIVED)")
      : (isUrdu ? "ادائیگی واؤچر / PAYMENT VOUCHER" : "PAYMENT VOUCHER (PAID OUT)");
    standardBadge = isInward ? "OFFICIAL CASH RECEIPT" : "DISBURSEMENT VOUCHER";
  } else if (type === "repair") {
    const isDelivered = data.status === "delivered" || data.is_delivery;
    modalTitle = modalTitle || `🔧 Repair ${isDelivered ? "Delivery Receipt" : "Intake Slip"} #${data.ticket_number || data.id}`;
    thermalBadge = isDelivered
      ? (isUrdu ? "مرمت ڈلیوری رسید / REPAIR DELIVERY" : "REPAIR DELIVERY & SETTLEMENT")
      : (isUrdu ? "مرمت داخلہ سلپ / REPAIR CLAIM SLIP" : "REPAIR INTAKE CLAIM SLIP");
    standardBadge = isDelivered ? "DEVICE REPAIR DELIVERY & WARRANTY" : "DEVICE REPAIR JOB INTAKE SLIP";
  }

  // Extract items list
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems.map((it) => {
    const name = it.company
      ? `${it.company} ${it.model_name || it.modelName || ""}`
      : it.model_name || it.product_name || it.description || (isUrdu ? "پراڈکٹ / اشیاء" : "Item / Product");
    const qty = Number(it.quantity || 1);
    const rate = Number(it.refund_rate || it.unit_price || it.unit_cost || it.price || it.rate || 0);
    const amount = Number(it.refund_rate ? it.refund_rate * qty : (it.total || rate * qty));
    const imei = it.imei || it.sku || it.product_sku || null;
    const condition = it.item_condition || it.condition || null;
    return { name, qty, rate, amount, imei, condition };
  });

  // Calculate totals
  const subtotal = Number(data.subtotal || data.total_amount || data.net_amount || data.total_refund_amount || 0);
  const discount = Number(data.discount_amount || data.discount || 0);
  const tax = Number(data.tax_amount || data.tax || 0);
  const totalAmount = Number(
    data.total_amount !== undefined
      ? data.total_amount
      : (data.total_refund_amount !== undefined ? data.total_refund_amount : subtotal - discount + tax)
  );
  const paidAmount = Number(data.paid_amount || data.amount_paid || data.paid || 0);
  const balanceAmount = Number(
    data.balance_amount !== undefined ? data.balance_amount : Math.max(0, totalAmount - paidAmount)
  );

  // Party info
  const partyLabel = type === "purchase" || data.return_type === "vendor_return"
    ? (isUrdu ? "وینڈر / سپلائر" : "Vendor / Supplier")
    : (isUrdu ? "گاہک" : "Customer");
  const partyName = data.customer_name || data.vendor_name || data.purchaser_name || data.party_name || (type === "purchase" ? "Walk-in Supplier" : "Walk-in Customer");
  const partyPhone = data.customer_phone || data.vendor_phone || data.phone || "";
  const partyCnic = data.purchaser_cnic || data.cnic || "";

  // Payment method
  const paymentMethodStr = String(data.payment_method || "CASH").toUpperCase();

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: receiptMode === "thermal" ? "420px" : "780px",
          width: "95%",
          transition: "max-width 0.2s ease"
        }}
      >
        {/* MODAL HEADER (Hidden in print) */}
        <div className="modal-header no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{modalTitle}</h3>
            <div style={{ display: "inline-flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setReceiptMode("thermal")}
                style={{
                  padding: "4px 9px",
                  fontSize: "0.72rem",
                  fontWeight: "600",
                  background: receiptMode === "thermal" ? "var(--primary)" : "transparent",
                  color: receiptMode === "thermal" ? "#ffffff" : "var(--text)",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Thermal 80mm
              </button>
              <button
                type="button"
                onClick={() => setReceiptMode("standard")}
                style={{
                  padding: "4px 9px",
                  fontSize: "0.72rem",
                  fontWeight: "600",
                  background: receiptMode === "standard" ? "var(--primary)" : "transparent",
                  color: receiptMode === "standard" ? "#ffffff" : "var(--text)",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Standard A4
              </button>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* RECEIPT DOCUMENT CONTAINER (Isolated in print) */}
        <div
          className="modal-body printable-receipt-container"
          style={{
            maxHeight: "75vh",
            overflowY: "auto",
            background: "#ffffff",
            color: "#000000",
            padding: receiptMode === "thermal" ? "1.2rem 1rem" : "1.75rem",
            borderRadius: "8px"
          }}
        >
          {receiptMode === "thermal" ? (
            /* ==============================================================
               80MM THERMAL RECEIPT SLIP LAYOUT
               Monospace font, crisp tabular columns, dashes, bilingual labels
               ============================================================== */
            <div
              className="receipt-thermal-slip"
              style={{
                fontFamily: "var(--font-mono, 'Courier New', Courier, monospace)",
                fontSize: "0.80rem",
                lineHeight: "1.35",
                color: "#000000",
                maxWidth: "320px",
                margin: "0 auto",
                padding: "2px"
              }}
            >
              {/* Slip Header */}
              <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                <h3 className="receipt-company-title" style={{ margin: "0 0 2px", fontSize: "1.2rem", fontWeight: "900", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                  {shopName}
                </h3>
                {/* Mono printed above branch name */}
                <div className="receipt-mono-wrap" style={{ margin: "4px auto 6px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt={shopName}
                      className="receipt-mono-img"
                      style={{
                        maxHeight: "50px",
                        maxWidth: "130px",
                        objectFit: "contain",
                        display: "block",
                        filter: "grayscale(100%) contrast(120%)"
                      }}
                    />
                  ) : (
                    <div className="receipt-mono-stamp">
                      {shopName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "0.80rem", fontWeight: "700" }}>Branch: {branchName}</div>
                <div style={{ fontSize: "0.70rem", color: "#444" }}>POS Billing & Inventory Management</div>
                <div style={{ margin: "4px 0", borderBottom: "1px dashed #000" }} />
                <div style={{ fontWeight: "800", fontSize: "0.78rem" }}>*** {thermalBadge} ***</div>
              </div>

              {/* Transaction Metadata */}
              <div style={{ fontSize: "0.76rem", marginBottom: "0.45rem", lineHeight: "1.4" }}>
                {/* Document Reference # */}
                <div>
                  <strong>{isUrdu ? "حوالہ نمبر (Ref #) :" : "Ref / No   :"}</strong>{" "}
                  <span style={{ direction: "ltr", display: "inline-block", fontWeight: "700" }}>
                    {data.invoice_number || data.voucher_number || data.ticket_number || data.return_number || `TX-${data.id}`}
                  </span>
                </div>

                {/* Date */}
                <div>
                  <strong>{isUrdu ? "تاریخ (Date)  :" : "Date       :"}</strong>{" "}
                  <span style={{ direction: "ltr", display: "inline-block" }}>
                    {data.sale_date || data.purchase_date || data.return_date || data.payment_date || data.received_date || currentDate}
                  </span>
                </div>

                {/* Linked Order Reference if Return or Payment */}
                {(data.reference_invoice || data.reference_number || (type === "return" && data.reference_order_number)) && (
                  <div>
                    <strong>{isUrdu ? "اصل انوائس (Order #):" : "Orig Order :"}</strong>{" "}
                    <span style={{ direction: "ltr", display: "inline-block" }}>
                      {data.reference_invoice || data.reference_number || data.reference_order_number}
                    </span>
                  </div>
                )}

                {/* Party Name */}
                <div>
                  <strong>{partyLabel} :</strong> {partyName}
                </div>

                {/* Party Phone */}
                {partyPhone && (
                  <div>
                    <strong>{isUrdu ? "فون (Phone)  :" : "Phone      :"}</strong>{" "}
                    <span style={{ direction: "ltr", display: "inline-block" }}>{partyPhone}</span>
                  </div>
                )}

                {/* Party CNIC */}
                {partyCnic && (
                  <div>
                    <strong>{isUrdu ? "شناختی کارڈ :" : "CNIC       :"}</strong>{" "}
                    <span style={{ direction: "ltr", display: "inline-block" }}>{partyCnic}</span>
                  </div>
                )}

                {/* Payment Channel */}
                {type !== "repair" && (
                  <div>
                    <strong>{isUrdu ? "ادائیگی (Method):" : "Payment    :"}</strong> {paymentMethodStr}
                  </div>
                )}

                {/* Repair Device Details */}
                {type === "repair" && (
                  <>
                    <div><strong>Device     :</strong> {data.model_name}</div>
                    {data.imei && <div><strong>IMEI / S#  :</strong> <span style={{ direction: "ltr" }}>{data.imei}</span></div>}
                    <div><strong>Issue / Fault:</strong> {data.issue_description}</div>
                    {data.technician_name && <div><strong>Tech Expert:</strong> {data.technician_name}</div>}
                    <div><strong>Status     :</strong> <span style={{ textTransform: "uppercase", fontWeight: "700" }}>{data.status || "Received"}</span></div>
                    {data.warranty_days > 0 && (
                      <div><strong>Warranty   :</strong> {data.warranty_days} Days {data.warranty_until ? `(until ${data.warranty_until})` : ""}</div>
                    )}
                  </>
                )}

                {/* Return Reason */}
                {type === "return" && data.reason && (
                  <div><strong>Reason     :</strong> {data.reason}</div>
                )}
              </div>

              {/* Items Section (Sales, Purchases, Returns) */}
              {items.length > 0 && (
                <>
                  <div style={{ borderBottom: "1px dashed #000", marginBottom: "0.4rem" }} />

                  {/* Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", fontSize: "0.72rem", marginBottom: "0.3rem" }}>
                    <span style={{ flex: 2 }}>{isUrdu ? "چیز / تفصیل" : "ITEM / DESCRIPTION"}</span>
                    <span style={{ width: "30px", textAlign: "center" }}>{isUrdu ? "تعداد" : "QTY"}</span>
                    <span style={{ width: "65px", textAlign: "right" }}>{isUrdu ? "ریٹ" : "RATE"}</span>
                    <span style={{ width: "70px", textAlign: "right" }}>{isUrdu ? "رقم" : "AMOUNT"}</span>
                  </div>

                  <div style={{ borderBottom: "1px dashed #ccc", marginBottom: "0.4rem" }} />

                  {/* Item Rows */}
                  {items.map((it, idx) => (
                    <div key={idx} style={{ marginBottom: "0.4rem", fontSize: "0.74rem" }}>
                      <div style={{ fontWeight: "700" }}>{it.name}</div>
                      {it.imei && (
                        <div style={{ fontSize: "0.68rem", color: "#333", direction: "ltr", textAlign: isRtl ? "right" : "left", unicodeBidi: "isolate" }}>
                          IMEI: {it.imei}
                        </div>
                      )}
                      {it.condition && (
                        <div style={{ fontSize: "0.68rem", color: "#555" }}>
                          Condition: <span style={{ textTransform: "capitalize" }}>{it.condition}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ flex: 2 }} />
                        <span style={{ width: "30px", textAlign: "center" }}>{it.qty}</span>
                        <span style={{ width: "65px", textAlign: "right" }}>{it.rate.toLocaleString()}</span>
                        <span style={{ width: "70px", textAlign: "right", fontWeight: "700" }}>{it.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Totals Section */}
              <div style={{ borderBottom: "1px dashed #000", margin: "0.5rem 0" }} />

              <div style={{ fontSize: "0.78rem", lineHeight: "1.45" }}>
                {type === "repair" ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Estimated Charges:</span>
                      <span>Rs. {Number(data.estimated_cost || 0).toLocaleString()}</span>
                    </div>
                    {data.actual_cost !== undefined && data.actual_cost !== null && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Final Bill / Actual:</span>
                        <span>Rs. {Number(data.actual_cost).toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                      <span>Advance Received:</span>
                      <span>Rs. {Number(data.advance_paid || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", fontSize: "0.85rem", marginTop: "3px" }}>
                      <span>Balance Payable:</span>
                      <span>
                        Rs. {Math.max(0, Number(data.actual_cost || data.estimated_cost || 0) - Number(data.advance_paid || 0)).toLocaleString()}
                      </span>
                    </div>
                  </>
                ) : type === "payment" ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "0.92rem", margin: "4px 0" }}>
                      <span>{isUrdu ? "وصول شدہ رقم (AMOUNT):" : "AMOUNT PAID:"}</span>
                      <span>Rs. {Number(data.amount || totalAmount).toLocaleString()}</span>
                    </div>
                    {data.previous_balance !== undefined && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Previous Balance:</span>
                        <span>Rs. {Number(data.previous_balance).toLocaleString()}</span>
                      </div>
                    )}
                    {data.new_balance !== undefined && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}>
                        <span>Remaining Balance:</span>
                        <span>Rs. {Number(data.new_balance).toLocaleString()}</span>
                      </div>
                    )}
                  </>
                ) : type === "return" ? (
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "0.92rem", margin: "4px 0" }}>
                    <span>{isUrdu ? "کل ریفنڈ رقم (TOTAL REFUND):" : "TOTAL REFUND:"}</span>
                    <span>Rs. {totalAmount.toLocaleString()}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{isUrdu ? "کل میزان (Subtotal):" : "Subtotal:"}</span>
                      <span>Rs. {subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                        <span>{isUrdu ? "رعایت (Discount):" : "Discount:"}</span>
                        <span>-Rs. {discount.toLocaleString()}</span>
                      </div>
                    )}
                    {tax > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{isUrdu ? "ٹیکس (Tax):" : "Tax:"}</span>
                        <span>Rs. {tax.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "0.92rem", margin: "4px 0" }}>
                      <span>{isUrdu ? "کل واجب الادا (NET TOTAL):" : "NET TOTAL:"}</span>
                      <span>Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{isUrdu ? "ادا شدہ (Paid Amount):" : "Paid Amount:"}</span>
                      <span>Rs. {paidAmount.toLocaleString()}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: "700",
                        color: balanceAmount > 0 ? "#b45309" : "#059669"
                      }}
                    >
                      <span>{isUrdu ? "بقایا (Balance Due):" : "Balance Due:"}</span>
                      <span>Rs. {balanceAmount.toLocaleString()}</span>
                    </div>
                    {data.due_date && balanceAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#b45309" }}>
                        <span>Credit Due Date:</span>
                        <span style={{ direction: "ltr" }}>{data.due_date.slice(0, 10)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Notes */}
              {data.notes && (
                <div style={{ marginTop: "0.45rem", fontSize: "0.70rem", color: "#444", borderTop: "1px dashed #ccc", paddingTop: "0.3rem" }}>
                  <strong>Notes:</strong> {data.notes}
                </div>
              )}

              {/* Signatures for Vouchers & Returns */}
              {(type === "purchase" || type === "return" || type === "payment" || type === "repair") && (
                <div style={{ marginTop: "1.2rem", paddingTop: "0.5rem", borderTop: "1px dashed #777", display: "flex", justifyContent: "space-between", fontSize: "0.68rem" }}>
                  <div style={{ textAlign: "center", width: "45%" }}>
                    <div style={{ borderBottom: "1px solid #000", height: "18px", marginBottom: "3px" }} />
                    <span>{type === "purchase" ? "Vendor Signature" : "Party / Customer"}</span>
                  </div>
                  <div style={{ textAlign: "center", width: "45%" }}>
                    <div style={{ borderBottom: "1px solid #000", height: "18px", marginBottom: "3px" }} />
                    <span>Authorized Stamp</span>
                  </div>
                </div>
              )}

              {/* Footer Policy Notes */}
              <div style={{ borderBottom: "1px dashed #000", margin: "0.6rem 0" }} />

              <div style={{ textAlign: "center", fontSize: "0.70rem", color: "#333", lineHeight: "1.3" }}>
                {type === "sale" && (
                  <>
                    <div>{isUrdu ? "آپ کی خریداری کا شکریہ!" : "Thank you for your business!"}</div>
                    <div>{isUrdu ? "وارنٹی کلیم کیلئے رسید ضروری ہے۔" : "Exchange / warranty valid with receipt."}</div>
                  </>
                )}
                {type === "purchase" && (
                  <>
                    <div>Official inward goods receipt recorded in inventory.</div>
                    <div>All items verified as received in specified condition.</div>
                  </>
                )}
                {type === "return" && (
                  <>
                    <div>Goods return & refund processed into business ledgers.</div>
                    <div>Thank you for choosing {shopName}.</div>
                  </>
                )}
                {type === "payment" && (
                  <>
                    <div>Official system settlement voucher.</div>
                    <div>Generated automatically upon fund transfer.</div>
                  </>
                )}
                {type === "repair" && (
                  <>
                    <div style={{ fontWeight: "700" }}>Claim slip required upon collection.</div>
                    <div>Not responsible for unclaimed devices after 30 days.</div>
                  </>
                )}
                <div style={{ marginTop: "4px", fontSize: "0.65rem", color: "#777" }}>
                  DigitalMarkaz360 POS & Multi-Branch Cloud ERP
                </div>
              </div>
            </div>
          ) : (
            /* ==============================================================
               STANDARD A4 DOCUMENT FORMAT
               Clean corporate borders, structured header, tabular itemization
               ============================================================== */
            <div style={{ padding: "0.5rem", color: "#111827" }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1.25rem",
                  borderBottom: "2px solid #e5e7eb",
                  paddingBottom: "1rem"
                }}
              >
                <div>
                  <h2 className="receipt-company-title" style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: "900", color: "#111827", textTransform: "uppercase" }}>
                    {shopName}
                  </h2>
                  {/* Mono printed above branch name */}
                  <div style={{ margin: "6px 0" }}>
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt={shopName}
                        style={{ maxHeight: "60px", maxWidth: "160px", objectFit: "contain", display: "block" }}
                      />
                    ) : (
                      <div className="receipt-mono-stamp-a4">
                        {shopName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ color: "#2563eb", fontWeight: "700", fontSize: "0.90rem" }}>
                    Branch: {branchName}
                  </div>
                  <div style={{ fontSize: "0.80rem", color: "#6b7280" }}>
                    Mobile Retail POS, Procurement & Device Repair Center
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-block", background: "#f3f4f6", padding: "4px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "0.82rem", color: "#1f2937", marginBottom: "4px" }}>
                    {standardBadge}
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "1rem", fontFamily: "var(--font-mono, monospace)" }}>
                    #{data.invoice_number || data.voucher_number || data.ticket_number || data.return_number || `TX-${data.id}`}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                    Date: {data.sale_date || data.purchase_date || data.return_date || data.payment_date || data.received_date || currentDate}
                  </div>
                </div>
              </div>

              {/* Party & Order Details Box */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.85rem 1.1rem",
                  marginBottom: "1.25rem",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  fontSize: "0.85rem"
                }}
              >
                <div>
                  <div><strong style={{ color: "#475569" }}>{partyLabel}:</strong> {partyName}</div>
                  {partyPhone && <div><strong style={{ color: "#475569" }}>Phone:</strong> <span style={{ direction: "ltr" }}>{partyPhone}</span></div>}
                  {partyCnic && <div><strong style={{ color: "#475569" }}>CNIC:</strong> <span style={{ direction: "ltr" }}>{partyCnic}</span></div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  {type !== "repair" && <div><strong style={{ color: "#475569" }}>Payment Mode:</strong> {paymentMethodStr}</div>}
                  {(data.reference_invoice || data.reference_number) && (
                    <div><strong style={{ color: "#475569" }}>Linked Order:</strong> {data.reference_invoice || data.reference_number}</div>
                  )}
                  {type === "repair" && (
                    <>
                      <div><strong style={{ color: "#475569" }}>Device:</strong> {data.model_name}</div>
                      {data.imei && <div><strong style={{ color: "#475569" }}>IMEI:</strong> <span style={{ direction: "ltr" }}>{data.imei}</span></div>}
                      <div><strong style={{ color: "#475569" }}>Status:</strong> <span style={{ textTransform: "uppercase", fontWeight: "700" }}>{data.status || "Received"}</span></div>
                    </>
                  )}
                </div>
              </div>

              {/* Items Table */}
              {items.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", width: "35px" }}>#</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Description</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", width: "50px" }}>Qty</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", width: "110px" }}>Rate</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", width: "120px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <strong style={{ color: "#0f172a" }}>{it.name}</strong>
                          {it.imei && <div style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "var(--font-mono, monospace)" }}>IMEI: {it.imei}</div>}
                          {it.condition && <div style={{ fontSize: "0.75rem", color: "#475569" }}>Condition: <span style={{ textTransform: "capitalize" }}>{it.condition}</span></div>}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.qty}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>PKR {it.rate.toLocaleString()}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600" }}>PKR {it.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Totals Grid */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
                <div style={{ width: "260px", fontSize: "0.88rem", lineHeight: "1.6" }}>
                  {type === "repair" ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Estimated Cost:</span>
                        <span>PKR {Number(data.estimated_cost || 0).toLocaleString()}</span>
                      </div>
                      {data.actual_cost !== undefined && data.actual_cost !== null && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Actual Cost:</span>
                          <span>PKR {Number(data.actual_cost).toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                        <span>Advance Paid:</span>
                        <span>PKR {Number(data.advance_paid || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", borderTop: "1px solid #cbd5e1", paddingTop: "4px" }}>
                        <span>Balance Payable:</span>
                        <span>PKR {Math.max(0, Number(data.actual_cost || data.estimated_cost || 0) - Number(data.advance_paid || 0)).toLocaleString()}</span>
                      </div>
                    </>
                  ) : type === "payment" ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "1rem" }}>
                        <span>Amount Paid:</span>
                        <span>PKR {Number(data.amount || totalAmount).toLocaleString()}</span>
                      </div>
                      {data.previous_balance !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Previous Balance:</span>
                          <span>PKR {Number(data.previous_balance).toLocaleString()}</span>
                        </div>
                      )}
                      {data.new_balance !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", color: "#059669" }}>
                          <span>Remaining Balance:</span>
                          <span>PKR {Number(data.new_balance).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  ) : type === "return" ? (
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "1rem", borderTop: "2px solid #cbd5e1", paddingTop: "4px" }}>
                      <span>Total Refund:</span>
                      <span>PKR {totalAmount.toLocaleString()}</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Subtotal:</span>
                        <span>PKR {subtotal.toLocaleString()}</span>
                      </div>
                      {discount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                          <span>Discount:</span>
                          <span>-PKR {discount.toLocaleString()}</span>
                        </div>
                      )}
                      {tax > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Tax:</span>
                          <span>PKR {tax.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", borderTop: "1px solid #cbd5e1", paddingTop: "4px" }}>
                        <span>Total:</span>
                        <span>PKR {totalAmount.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                        <span>Paid:</span>
                        <span>PKR {paidAmount.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: balanceAmount > 0 ? "#d97706" : "#059669" }}>
                        <span>Balance:</span>
                        <span>PKR {balanceAmount.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <div style={{ borderBottom: "1px solid #000", height: "24px", marginBottom: "6px" }} />
                  <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                    {type === "purchase" ? "Vendor / Supplier" : (type === "repair" ? "Customer Signature" : "Customer / Client")}
                  </span>
                </div>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <div style={{ borderBottom: "1px solid #000", height: "24px", marginBottom: "6px" }} />
                  <span style={{ fontSize: "0.82rem", color: "#475569" }}>Authorized Store Stamp</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER (Hidden in print) */}
        <div
          className="modal-footer no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.8rem 1rem",
            borderTop: "1px solid var(--border)",
            background: "var(--surface)"
          }}
        >
          <div>
            {partyPhone && balanceAmount > 0 && type === "sale" && (
              <button
                type="button"
                className="ghost-btn btn-sm"
                style={{ color: "#10b981", borderColor: "#10b981" }}
                onClick={() =>
                  openWhatsAppReminder({
                    phone: partyPhone,
                    customerName: partyName,
                    invoiceNumber: data.invoice_number,
                    balance: balanceAmount,
                    dueDate: data.due_date,
                    shopName
                  })
                }
              >
                💬 WhatsApp Reminder
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="secondary-btn" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handlePrint}
              style={{ background: "#059669", borderColor: "#047857" }}
            >
              🖨️ Print {receiptMode === "thermal" ? "80mm Thermal Receipt" : "A4 Document"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
