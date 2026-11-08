import React from "react";

/**
 * ReportLetterhead - Executive Corporate Header for Reports & PDF Export
 */
export function ReportLetterhead({
  context,
  title,
  subtitle,
  periodLabel,
  activeBranchName,
  activeBranch,
  docRef,
  status = "CONFIDENTIAL • INTERNAL AUDIT",
  currency = "PKR (Rs.)"
}) {
  const companyName = context?.session?.business_name || context?.session?.businessName || "DigitalMarkaz360";
  const branchName = activeBranchName || context?.session?.branch_name || context?.session?.branchName || "All Store Branches";
  const softwareName = context?.session?.business_software_name || context?.session?.software_name || "DigitalMarkaz360";
  const logoUrl = context?.session?.business_logo || context?.session?.businessLogo;
  const userName = context?.session?.user_name || context?.session?.name || "System Admin";
  const userRole = context?.session?.role ? String(context.session.role).toUpperCase() : "ADMIN";

  const branchAddress = activeBranch?.address || "Main Commercial Avenue, Commercial Zone";
  const branchPhone = activeBranch?.phone || "+92 (300) 123-4567";
  const branchCode = activeBranch?.code ? `BR-${activeBranch.code}` : "HQ-001";

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const generatedDocRef = docRef || `REP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

  return (
    <div className="report-pdf-header-container">
      {/* Top Corporate Accent Bar */}
      <div className="report-pdf-top-bar" />

      <div className="report-pdf-header-main">
        {/* Left: Corporate Identity */}
        <div className="report-pdf-brand-block">
          <div className="report-pdf-logo-wrapper">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="report-pdf-logo"
              />
            ) : (
              <div className="report-pdf-monogram">
                {companyName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="report-pdf-company-info">
            <h1 className="report-pdf-company-name">{companyName}</h1>
            <div className="report-pdf-company-tagline">
              Retail Handset Dealership, Repair Services & Enterprise ERP
            </div>
            <div className="report-pdf-contact-line">
              <span>📍 {branchAddress}</span>
              <span className="dot-sep">&bull;</span>
              <span>📞 {branchPhone}</span>
            </div>
            <div className="report-pdf-branch-badge-row">
              <span className="report-pdf-branch-badge">
                🏢 {branchName} ({branchCode})
              </span>
              <span className="report-pdf-software-badge">
                💻 {softwareName}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Document Title & Metadata Box */}
        <div className="report-pdf-meta-block">
          <div className="report-pdf-title-badge">
            <h2 className="report-pdf-doc-title">{title}</h2>
            {subtitle && <div className="report-pdf-doc-subtitle">{subtitle}</div>}
          </div>

          <table className="report-pdf-meta-table">
            <tbody>
              <tr>
                <td className="meta-key">Document Ref:</td>
                <td className="meta-val highlight-val">{generatedDocRef}</td>
              </tr>
              <tr>
                <td className="meta-key">Accounting Period:</td>
                <td className="meta-val">{periodLabel || "Current Month"}</td>
              </tr>
              <tr>
                <td className="meta-key">Generation Date:</td>
                <td className="meta-val">{today} &bull; {time}</td>
              </tr>
              <tr>
                <td className="meta-key">Authorized User:</td>
                <td className="meta-val">{userName} ({userRole})</td>
              </tr>
              <tr>
                <td className="meta-key">Currency & Standard:</td>
                <td className="meta-val">{currency} &bull; Accrual Basis</td>
              </tr>
              <tr>
                <td className="meta-key">Classification:</td>
                <td className="meta-val status-val">{status}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * AccountingSummaryRibbon - Professional Accounting Key Figures Ribbon
 * Slim, single-tier, formal financial presentation without oversized blocks or loud cards.
 */
export function AccountingSummaryRibbon({ items = [], metrics = [], title = "" }) {
  const data = items.length > 0 ? items : metrics;
  if (!data || data.length === 0) return null;

  return (
    <div className="accounting-summary-ribbon">
      {title && (
        <div className="accounting-summary-header">
          <span className="accounting-summary-title">{title}</span>
          <span className="accounting-summary-currency">PKR (RS.) &bull; ACCRUAL</span>
        </div>
      )}
      <div className="accounting-summary-grid">
        {data.map((item, idx) => {
          const toneClass = item.tone ? `tone-${item.tone}` : "";
          const highlightClass = item.highlight ? `highlight-${item.highlight}` : "";
          return (
            <div key={idx} className={`accounting-summary-cell ${toneClass} ${highlightClass}`}>
              <div className="accounting-summary-cell-top">
                <span className="accounting-summary-label">{item.label}</span>
                {item.badge && <span className="accounting-summary-badge">{item.badge}</span>}
              </div>
              <div className="accounting-summary-value">{item.value}</div>
              {item.subtitle && <div className="accounting-summary-sub">{item.subtitle}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Backwards compatibility alias for components calling ReportMetricsBar
 */
export function ReportMetricsBar(props) {
  return <AccountingSummaryRibbon {...props} />;
}

/**
 * ReportSignatures - Official 3-Party Audit & Verification Block
 */
export function ReportSignatures({
  preparedBy,
  auditedBy,
  approvedBy,
  disclaimer
}) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="report-pdf-footer-container">
      <div className="report-pdf-signatures-grid">
        {/* Column 1: Prepared By */}
        <div className="report-pdf-sign-box">
          <div className="sign-role-title">PREPARED BY</div>
          <div className="sign-signature-space">
            <div className="sign-dotted-line" />
          </div>
          <div className="sign-name-title">{preparedBy || "Accountant / Cashier"}</div>
          <div className="sign-date-line">Date: {today}</div>
        </div>

        {/* Column 2: Audited By */}
        <div className="report-pdf-sign-box">
          <div className="sign-role-title">AUDITED & VERIFIED BY</div>
          <div className="sign-signature-space">
            <div className="sign-dotted-line" />
          </div>
          <div className="sign-name-title">{auditedBy || "Internal Financial Auditor"}</div>
          <div className="sign-date-line">Date: {today}</div>
        </div>

        {/* Column 3: Approved By */}
        <div className="report-pdf-sign-box">
          <div className="sign-role-title">AUTHORIZED & APPROVED BY</div>
          <div className="sign-signature-space">
            <div className="sign-dotted-line" />
          </div>
          <div className="sign-name-title">{approvedBy || "Managing Director / Partner"}</div>
          <div className="sign-date-line">Date: {today}</div>
        </div>
      </div>

      {/* Compliance Legal Disclaimer */}
      <div className="report-pdf-compliance-footer">
        <div className="compliance-row">
          <span>
            ⚖️ {disclaimer || "OFFICIAL FINANCIAL DOCUMENT — Issued automatically by DigitalMarkaz360 Enterprise ERP."}
          </span>
          <span className="compliance-timestamp">
            Immutable Audit Trail Verified &bull; Document Tampering is Strictly Prohibited
          </span>
        </div>
      </div>
    </div>
  );
}
