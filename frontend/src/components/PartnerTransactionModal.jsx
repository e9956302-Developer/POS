import { useState, useEffect } from "react";
import { api } from "../api.js";

/**
 * PartnerDepositModal - Form to deposit capital or record drawing/withdrawal
 */
export function PartnerDepositModal({ partner, branches = [], onClose, onSuccess }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ? String(branches[0].id) : "");
  const [transactionType, setTransactionType] = useState("capital_injection");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceDetails, setReferenceDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!partner) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }
    if (!branchId) {
      setError("Please select a store branch.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createPartnerTransaction(partner.id, {
        branchId,
        transactionType,
        amount: numAmount,
        paymentMethod,
        transactionDate,
        referenceDetails: referenceDetails.trim() || undefined,
        notes: notes.trim() || undefined
      });
      if (onSuccess) {
        onSuccess(created);
      }
    } catch (err) {
      setError(err.message || "Failed to record partner transaction.");
    } finally {
      setSubmitting(false);
    }
  }

  const isDeposit = transactionType === "capital_injection";

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div>
              <h3 style={{ margin: 0 }}>
                {isDeposit ? "➕ Deposit Partner Capital" : "➖ Record Partner Withdrawal"}
              </h3>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
                Partner: <strong>{partner.name}</strong> {partner.cnic ? `(${partner.cnic})` : ""}
              </p>
            </div>
            <button type="button" className="close-btn" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="modal-body form-grid">
            {error && <div className="alert error full-span">{error}</div>}

            <label className="full-span">
              <span>Transaction Action *</span>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
              >
                <option value="capital_injection">➕ Capital Deposit / Investment (Money In)</option>
                <option value="drawing">➖ Partner Personal Drawing / Advance (Money Out)</option>
                <option value="capital_withdrawal">➖ Permanent Capital Reduction / Exit (Money Out)</option>
              </select>
            </label>

            <label>
              <span>Store Branch *</span>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Transaction Date *</span>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </label>

            <label>
              <span>Amount (PKR) *</span>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="e.g. 500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ fontWeight: "700" }}
                required
              />
            </label>

            <label>
              <span>Payment Channel *</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">💵 Cash In Register / Hand</option>
                <option value="bank_transfer">🏦 Bank Wire / IBFT</option>
                <option value="cheque">📜 Cheque</option>
                <option value="online">📱 Online / Mobile Wallet</option>
              </select>
            </label>

            <label className="full-span">
              <span>Reference / Bank Details (Optional)</span>
              <input
                type="text"
                placeholder="e.g. Bank Alfalah Slip #88412 or Cheque #004812"
                value={referenceDetails}
                onChange={(e) => setReferenceDetails(e.target.value)}
              />
            </label>

            <label className="full-span">
              <span>Remarks / Purpose Notes</span>
              <textarea
                rows={2}
                placeholder="State the purpose of this capital entry..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? "Saving Voucher..." : isDeposit ? "Confirm Capital Deposit" : "Confirm Withdrawal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * PartnerLedgerModal - Comprehensive running capital statement & transaction history
 */
export function PartnerLedgerModal({ partner, onClose, onOpenVoucher }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ transactions: [], summary: {} });
  const [error, setError] = useState("");

  useEffect(() => {
    if (partner?.id) {
      loadLedger();
    }
  }, [partner?.id]);

  async function loadLedger() {
    setLoading(true);
    setError("");
    try {
      const res = await api.partnerTransactions(partner.id);
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load partner transaction ledger.");
    } finally {
      setLoading(false);
    }
  }

  if (!partner) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>📖 Partner Capital Account Ledger</h3>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.84rem" }}>
              Partner: <strong>{partner.name}</strong> | Phone: {partner.phone || "—"} | CNIC: {partner.cnic || "—"}
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && <div className="alert error">{error}</div>}

          {/* Capital Metrics Ribbon */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
              background: "var(--card-bg, #f8fafc)",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid var(--border)"
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Capital Injected</div>
              <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "#059669" }}>
                Rs. {Math.round(data.summary?.totalInjected || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Dividends Disbursed</div>
              <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "#1d4ed8" }}>
                Rs. {Math.round(data.summary?.totalDividends || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Personal Drawings</div>
              <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "#d97706" }}>
                Rs. {Math.round(data.summary?.totalDrawings || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Current Equity Balance</div>
              <div style={{ fontSize: "1.25rem", fontWeight: "900", color: (data.summary?.currentBalance || 0) >= 0 ? "#059669" : "#dc2626" }}>
                Rs. {Math.round(data.summary?.currentBalance || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="table-responsive" style={{ maxHeight: "380px", overflowY: "auto", overflowX: "auto", width: "100%" }}>
            <table className="accounting-data-table" style={{ margin: 0, width: "100%", minWidth: "780px" }}>
              <thead>
                <tr>
                  <th style={{ minWidth: "105px", whiteSpace: "nowrap" }}>Date</th>
                  <th style={{ minWidth: "125px", whiteSpace: "nowrap" }}>Voucher #</th>
                  <th style={{ minWidth: "135px", whiteSpace: "nowrap" }}>Branch</th>
                  <th style={{ minWidth: "165px", whiteSpace: "nowrap" }}>Type / Classification</th>
                  <th style={{ minWidth: "105px", whiteSpace: "nowrap" }}>Method</th>
                  <th style={{ minWidth: "135px", textAlign: "right", whiteSpace: "nowrap" }}>Amount (PKR)</th>
                  <th style={{ minWidth: "65px", textAlign: "center", whiteSpace: "nowrap" }}>Slip</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      ⏳ Loading transactions...
                    </td>
                  </tr>
                ) : data.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      No capital movements or dividend disbursements recorded for this partner yet.
                    </td>
                  </tr>
                ) : (
                  data.transactions.map((tx) => {
                    const isIn = tx.direction === "in";
                    return (
                      <tr key={tx.id}>
                        <td>{tx.transaction_date}</td>
                        <td style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: "700" }}>{tx.voucher_number}</td>
                        <td>{tx.branch_name}</td>
                        <td>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              background: isIn ? "#ecfdf5" : "#eff6ff",
                              color: isIn ? "#059669" : "#1d4ed8"
                            }}
                          >
                            {tx.transaction_type === "capital_injection"
                              ? "Capital Deposit"
                              : tx.transaction_type === "dividend_payout"
                              ? "Dividend Payout"
                              : tx.transaction_type === "drawing"
                              ? "Personal Drawing"
                              : "Capital Reduction"}
                          </span>
                          {tx.period_label && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              {tx.period_label}
                            </div>
                          )}
                        </td>
                        <td style={{ textTransform: "capitalize", fontSize: "0.82rem" }}>{tx.payment_method}</td>
                        <td className={`num-cell ${isIn ? "positive-amount" : "negative-amount"}`} style={{ fontWeight: "700" }}>
                          {isIn ? `+Rs. ${Math.round(tx.amount).toLocaleString()}` : `-Rs. ${Math.round(tx.amount).toLocaleString()}`}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="ghost-btn btn-sm"
                            style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                            onClick={() => onOpenVoucher(tx)}
                            title="View official voucher slip"
                          >
                            🧾
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Showing {data.transactions.length} recorded capital movements.
          </span>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
