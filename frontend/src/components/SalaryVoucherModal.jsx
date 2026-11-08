/**
 * SalaryVoucherModal - Printable Official Salary Payment Voucher Slip
 */
export function SalaryVoucherModal({ voucher, onClose, shopName: propShopName = "", companyLogo: propCompanyLogo = null }) {
  if (!voucher) return null;

  const shopName = propShopName || voucher.shop_name || (typeof window !== "undefined" && window.__POS_COMPANY_NAME__) || "DigitalMarkaz360";
  const companyLogo = propCompanyLogo || voucher.company_logo || voucher.business_logo || voucher.logo_url || (typeof window !== "undefined" && window.__POS_COMPANY_LOGO__) || null;

  let overrides = [];
  try {
    overrides = Array.isArray(voucher.overridden_fields)
      ? voucher.overridden_fields
      : JSON.parse(voucher.overridden_fields || "[]");
  } catch {
    overrides = [];
  }

  return (
    <div className="modal-backdrop printable-modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "560px", width: "95%", margin: "2rem auto" }}
      >
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>🧾 Salary Payment Voucher</h3>
          <button
            type="button"
            className="ghost-btn"
            onClick={onClose}
            style={{ fontSize: "1.1rem", padding: "2px 8px" }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Slip Document Sheet */}
          <div
            id="printable-salary-voucher"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1.5rem",
              background: "#fff",
              color: "#111"
            }}
          >
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
                Branch: {voucher.branch_name || "Main Branch"}
              </div>
              <div style={{ marginTop: "6px", display: "inline-block", background: "#f3f4f6", padding: "3px 12px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "700", color: "#374151" }}>
                OFFICIAL SALARY DISBURSEMENT VOUCHER
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.88rem", marginBottom: "16px" }}>
              <div>
                <span style={{ color: "#6b7280" }}>Voucher #: </span>
                <strong>SAL-{voucher.id}</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#6b7280" }}>Payment Date: </span>
                <strong>{voucher.payment_date}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Employee Name: </span>
                <strong style={{ fontSize: "1rem" }}>{voucher.employee_name}</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#6b7280" }}>Salary Month: </span>
                <strong style={{ fontSize: "1rem", color: "#047857" }}>{voucher.salary_month}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Designation: </span>
                <strong>{voucher.designation}</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#6b7280" }}>Payment Method: </span>
                <strong>{String(voucher.payment_method || "cash").toUpperCase()}</strong>
              </div>
            </div>

            {/* Breakdown Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", marginBottom: "16px" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 4px", color: "#374151" }}>Base Monthly Salary:</td>
                  <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700" }}>
                    Rs. {Number(voucher.base_salary || 0).toLocaleString()}
                  </td>
                </tr>
                {Number(voucher.bonus || 0) > 0 && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#047857" }}>
                    <td style={{ padding: "8px 4px" }}>Incentive / Bonus:</td>
                    <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700" }}>
                      +Rs. {Number(voucher.bonus).toLocaleString()}
                    </td>
                  </tr>
                )}
                {Number(voucher.advance_deduction || 0) > 0 && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#b45309" }}>
                    <td style={{ padding: "8px 4px" }}>Advance Loan Deduction:</td>
                    <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700" }}>
                      -Rs. {Number(voucher.advance_deduction).toLocaleString()}
                    </td>
                  </tr>
                )}
                {Number(voucher.deductions || 0) > 0 && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#b91c1c" }}>
                    <td style={{ padding: "8px 4px" }}>Absent / Other Deductions:</td>
                    <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "700" }}>
                      -Rs. {Number(voucher.deductions).toLocaleString()}
                    </td>
                  </tr>
                )}
                <tr style={{ borderTop: "2px solid #111827", background: "#f9fafb" }}>
                  <td style={{ padding: "10px 4px", fontWeight: "800", fontSize: "1.05rem" }}>
                    NET SALARY PAID:
                  </td>
                  <td style={{ padding: "10px 4px", textAlign: "right", fontWeight: "900", fontSize: "1.25rem", color: "#047857" }}>
                    Rs. {Number(voucher.net_salary || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {overrides && overrides.length > 0 && (
              <div style={{ fontSize: "0.78rem", color: "#b45309", marginBottom: "12px", background: "#fef3c7", padding: "6px 10px", borderRadius: "6px" }}>
                ℹ️ Note: Adjusted fields audited: <strong>{overrides.join(", ")}</strong>
              </div>
            )}

            {voucher.notes && (
              <div style={{ fontSize: "0.82rem", color: "#4b5563", marginBottom: "16px", fontStyle: "italic" }}>
                Remarks: {voucher.notes}
              </div>
            )}

            {/* Signatures */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "32px", paddingTop: "16px" }}>
              <div style={{ borderTop: "1px dashed #9ca3af", textAlign: "center", fontSize: "0.82rem", color: "#4b5563", paddingTop: "6px" }}>
                Employee Signature
              </div>
              <div style={{ borderTop: "1px dashed #9ca3af", textAlign: "center", fontSize: "0.82rem", color: "#4b5563", paddingTop: "6px" }}>
                Authorized Manager
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
          <button type="button" onClick={onClose} className="secondary-btn">
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="primary-btn"
          >
            🖨️ Print Slip
          </button>
        </div>
      </div>
    </div>
  );
}
