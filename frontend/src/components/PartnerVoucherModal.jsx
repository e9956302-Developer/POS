/**
 * PartnerVoucherModal - Printable Official Partner Capital & Dividend Voucher Slip
 */
export function PartnerVoucherModal({ voucher, onClose, shopName: propShopName = "", companyLogo: propCompanyLogo = null }) {
  if (!voucher) return null;

  const shopName = propShopName || voucher.shop_name || (typeof window !== "undefined" && window.__POS_COMPANY_NAME__) || "DigitalMarkaz360";
  const companyLogo = propCompanyLogo || voucher.company_logo || voucher.business_logo || voucher.logo_url || (typeof window !== "undefined" && window.__POS_COMPANY_LOGO__) || null;

  const isDeposit = voucher.transaction_type === "capital_injection";
  const isDividend = voucher.transaction_type === "dividend_payout";
  const isDrawing = voucher.transaction_type === "drawing";
  const isWithdrawal = voucher.transaction_type === "capital_withdrawal";

  const voucherTitle = isDeposit
    ? "PARTNER CAPITAL DEPOSIT RECEIPT"
    : isDividend
    ? "PARTNER DIVIDEND PAYMENT VOUCHER"
    : isDrawing
    ? "PARTNER DRAWING ADVANCE VOUCHER"
    : "CAPITAL REDUCTION / WITHDRAWAL VOUCHER";

  const badgeColor = isDeposit ? "#047857" : isDividend ? "#1d4ed8" : "#b45309";
  const badgeBg = isDeposit ? "#ecfdf5" : isDividend ? "#eff6ff" : "#fffbeb";

  function handlePrint() {
    window.print();
  }

  return (
    <div className="modal-backdrop printable-modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>🧾 Partner Transaction Voucher</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Slip Document Sheet */}
          <div
            id="printable-partner-voucher"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1.5rem",
              background: "#fff",
              color: "#111"
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "2px solid #e5e7eb", paddingBottom: "12px", marginBottom: "14px" }}>
              <h2 className="receipt-company-title" style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: "900", color: "#111827", textTransform: "uppercase" }}>
                {shopName}
              </h2>
              {/* Mono printed above branch name */}
              <div className="receipt-mono-wrap" style={{ margin: "6px auto", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={shopName}
                    className="receipt-mono-img"
                    style={{ maxHeight: "55px", maxWidth: "150px", objectFit: "contain", display: "block" }}
                  />
                ) : (
                  <div className="receipt-mono-stamp">
                    {shopName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#4b5563" }}>
                Branch: {voucher.branch_name || "Main Branch"} {voucher.branch_code ? `(${voucher.branch_code})` : ""}
              </div>
              <div
                style={{
                  marginTop: "8px",
                  display: "inline-block",
                  background: badgeBg,
                  color: badgeColor,
                  border: `1px solid ${badgeColor}`,
                  padding: "4px 14px",
                  borderRadius: "14px",
                  fontSize: "0.82rem",
                  fontWeight: "800",
                  letterSpacing: "0.5px"
                }}
              >
                {voucherTitle}
              </div>
            </div>

            {/* Metadata Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.88rem", marginBottom: "16px" }}>
              <div>
                <span style={{ color: "#6b7280" }}>Voucher #: </span>
                <strong style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "1rem" }}>{voucher.voucher_number || `VCH-${voucher.id}`}</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#6b7280" }}>Transaction Date: </span>
                <strong>{voucher.transaction_date || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Partner Name: </span>
                <strong style={{ fontSize: "1rem" }}>{voucher.partner_name || "Partner"}</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#6b7280" }}>CNIC / Tax ID: </span>
                <strong style={{ fontFamily: "var(--font-mono, monospace)" }}>{voucher.partner_cnic || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Payment Method: </span>
                <strong style={{ textTransform: "uppercase" }}>{voucher.payment_method || "cash"}</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#6b7280" }}>Account Cycle: </span>
                <strong style={{ color: "#1d4ed8" }}>{voucher.period_label || "Spot Settlement"}</strong>
              </div>
              {voucher.reference_details && (
                <div style={{ gridColumn: "1 / -1", background: "#f9fafb", padding: "6px 10px", borderRadius: "6px", fontSize: "0.84rem" }}>
                  <span style={{ color: "#6b7280" }}>Bank / Ref Details: </span>
                  <strong>{voucher.reference_details}</strong>
                </div>
              )}
            </div>

            {/* Financial Details Box */}
            <div
              style={{
                background: isDeposit ? "rgba(16, 185, 129, 0.06)" : "rgba(59, 130, 246, 0.06)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "0.85rem", color: "#4b5563", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {isDeposit ? "Total Capital Deposited / Credited" : "Net Payout Disbursed"}
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: "900", color: isDeposit ? "#059669" : "#1d4ed8", margin: "6px 0" }}>
                Rs. {Math.round(Number(voucher.amount || 0)).toLocaleString()}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                Currency: PKR (Pakistani Rupee) — Double-Entry Equity Ledger Verified
              </div>
            </div>

            {/* Purpose Notes */}
            {voucher.notes && (
              <div style={{ fontSize: "0.82rem", color: "#4b5563", marginBottom: "16px", fontStyle: "italic", background: "#f8fafc", padding: "8px 12px", borderRadius: "6px" }}>
                <strong>Remarks / Notes:</strong> {voucher.notes}
              </div>
            )}

            {/* Signature Blocks */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "32px", paddingTop: "12px", borderTop: "1px dashed #d1d5db" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ height: "40px" }}></div>
                <div style={{ borderTop: "1px solid #9ca3af", paddingTop: "4px", fontSize: "0.8rem", fontWeight: "700", color: "#374151" }}>
                  Partner's Signature & Date
                </div>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Acknowledged & Received</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ height: "40px" }}></div>
                <div style={{ borderTop: "1px solid #9ca3af", paddingTop: "4px", fontSize: "0.8rem", fontWeight: "700", color: "#374151" }}>
                  Authorized Director / Financial Controller
                </div>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Company Seal & Verification</div>
              </div>
            </div>
          </div>

          {/* Modal Bottom Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="no-print">
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Official accounting receipt certified by system audit.
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="secondary-btn" onClick={onClose}>
                Close
              </button>
              <button type="button" className="primary-btn" onClick={handlePrint}>
                🖨️ Print Official Voucher
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
