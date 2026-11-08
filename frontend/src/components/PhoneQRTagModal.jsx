import { useState } from "react";
import { QRCodeSVG } from "../utils/qrcode.jsx";

export function PhoneQRTagModal({ isOpen, onClose, items = [], companyName = "DigitalMarkaz360" }) {
  const [showPrice, setShowPrice] = useState(true);
  const [priceType, setPriceType] = useState("selling"); // "selling" | "cost"

  if (!isOpen || !items || items.length === 0) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="modal-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.75)",
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
        maxWidth: "850px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        border: "1px solid var(--border)"
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>
              🏷️ Print QR Tags for Purchased Cell Phones
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
              {items.length} handset sticker tag{items.length > 1 ? "s" : ""} ready for thermal or A4 label printing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="close-btn"
            style={{ fontSize: "1.2rem", padding: "4px 10px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Modal Controls */}
        <div style={{
          padding: "12px 24px",
          background: "var(--surface-strong)",
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--border)"
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
            />
            Include Price on Tag
          </label>

          {showPrice && (
            <select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
              className="input-select"
              style={{ padding: "4px 8px", fontSize: "0.85rem" }}
            >
              <option value="selling">Show Selling Price</option>
              <option value="cost">Show Cost Price</option>
            </select>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
            <button onClick={handlePrint} className="primary-btn" style={{ padding: "8px 18px", fontWeight: "600" }}>
              🖨️ Print Labels Now
            </button>
            <button onClick={onClose} className="ghost-btn" style={{ padding: "8px 14px" }}>
              Close
            </button>
          </div>
        </div>

        {/* Tags Container (Printable) */}
        <div
          id="printable-qr-tags"
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "16px"
          }}
        >
          {items.map((item, idx) => {
            const modelName = item.modelName || item.model_name || (item.company ? `${item.company} ${item.model_name}` : "Mobile Device");
            const imei = item.imei || "N/A";
            const price = priceType === "cost" ? (item.unitCost || item.cost_price || 0) : (item.sellingPrice || item.selling_price || 0);

            // QR code payload (IMEI and model)
            const qrPayload = `IMEI:${imei}|MODEL:${modelName}|CO:${companyName}`;

            return (
              <div
                key={idx}
                className="qr-phone-tag"
                style={{
                  background: "#ffffff",
                  color: "#0f172a",
                  border: "1px dashed #64748b",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                  pageBreakInside: "avoid"
                }}
              >
                {/* 1. Company Name */}
                <div style={{
                  fontSize: "0.85rem",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#1e293b",
                  borderBottom: "1px solid #cbd5e1",
                  width: "100%",
                  paddingBottom: "4px",
                  marginBottom: "6px"
                }}>
                  {companyName}
                </div>

                {/* 2. Device Model Name */}
                <div style={{
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  color: "#0f172a",
                  lineHeight: "1.2",
                  marginBottom: "8px",
                  wordBreak: "break-word"
                }}>
                  {modelName}
                </div>

                {/* 3. QR Code */}
                <div style={{ margin: "4px 0", padding: "4px", background: "#ffffff" }}>
                  <QRCodeSVG text={qrPayload} size={88} />
                </div>

                {/* 4. IMEI details */}
                <div style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  letterSpacing: "0.5px",
                  color: "#334155",
                  marginTop: "4px"
                }}>
                  IMEI: {imei}
                </div>

                {/* 5. Optional Price */}
                {showPrice && Number(price) > 0 && (
                  <div style={{
                    fontSize: "0.85rem",
                    fontWeight: "800",
                    color: "#059669",
                    marginTop: "4px"
                  }}>
                    Rs. {Number(price).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
