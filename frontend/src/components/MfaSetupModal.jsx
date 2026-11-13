import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { api } from "../api.js";

export function MfaSetupModal({ isOpen, onClose, user, currentUser, onMfaUpdated }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const targetUserId = user?.id;
  const targetEmail = user?.email || "";
  const targetName = user?.full_name || user?.fullName || targetEmail || "Administrator";
  const isSelf = !currentUser || !targetUserId || Number(currentUser?.id) === Number(targetUserId);

  // Current status
  const [mfaStatus, setMfaStatus] = useState(null);

  // Wizard flow states: 'status' | 'step1_qr' | 'step2_codes' | 'step3_verify' | 'completed' | 'disable_confirm'
  const [viewState, setViewState] = useState("status");

  // Setup payload from server
  const [setupData, setSetupData] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [savedCodesConfirmed, setSavedCodesConfirmed] = useState(false);

  // Verification input
  const [verifyCode, setVerifyCode] = useState("");

  // Disable inputs
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    } else {
      resetModal();
    }
  }, [isOpen]);

  function resetModal() {
    setLoading(true);
    setSubmitting(false);
    setError("");
    setSuccessMsg("");
    setViewState("status");
    setSetupData(null);
    setQrDataUrl("");
    setCopiedKey(false);
    setCopiedCodes(false);
    setSavedCodesConfirmed(false);
    setVerifyCode("");
    setDisablePassword("");
    setDisableCode("");
  }

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      const status = await api.mfaStatus(targetUserId);
      setMfaStatus(status);
      if (status.mfaEnabled) {
        setViewState("status");
      } else {
        await startEnrollmentWizard();
      }
    } catch (err) {
      setError(err.message || "Failed to load MFA status");
    } finally {
      setLoading(false);
    }
  }

  async function startEnrollmentWizard() {
    setLoading(true);
    setError("");
    try {
      const data = await api.mfaSetup(targetUserId ? { userId: targetUserId } : undefined);
      setSetupData(data);
      if (data.uri) {
        const url = await QRCode.toDataURL(data.uri, {
          width: 220,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" }
        });
        setQrDataUrl(url);
      }
      setViewState("step1_qr");
    } catch (err) {
      setError(err.message || "Failed to initiate MFA setup");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyKey() {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  }

  function handleCopyAllCodes() {
    if (!setupData?.recoveryCodes) return;
    const text = `DigitalMarkaz360 One-Time Backup Recovery Codes:\nAccount: ${targetEmail || "User"}\n\n${setupData.recoveryCodes.join("\n")}\n\nKeep these codes in a safe place. Each code can only be used once.`;
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  }

  function handleDownloadCodes() {
    if (!setupData?.recoveryCodes) return;
    const text = `====================================================\nDIGITALMARKAZ360 - EMERGENCY RECOVERY CODES\nAccount: ${targetEmail || user?.email || "User"}\nGenerated: ${new Date().toLocaleString()}\n====================================================\n\n${setupData.recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nIMPORTANT:\n- Each code can only be used once to log in if you lose access to your authenticator app.\n- Store this file in a secure password manager or encrypted drive.`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `digitalmarkaz360-recovery-codes-${targetEmail || user?.email || "backup"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSavedCodesConfirmed(true);
  }

  async function handleConfirmMfa(e) {
    e?.preventDefault();
    const cleanCode = verifyCode.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6) {
      setError("Please enter the complete 6-digit code from your authenticator app.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await api.mfaConfirm({
        secret: setupData.secret,
        code: cleanCode,
        recoveryCodes: setupData.recoveryCodes,
        ...(targetUserId ? { userId: targetUserId } : {})
      });
      setSuccessMsg(res.message || "Two-Factor Authentication successfully enabled!");
      setViewState("completed");
      if (onMfaUpdated) {
        onMfaUpdated(true, user);
      }
    } catch (err) {
      setError(err.message || "Failed to confirm MFA code. Check your clock.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisableMfa(e) {
    e?.preventDefault();
    if (isSelf && (!disablePassword || !disableCode)) {
      setError("Both your password and current 6-digit code are required.");
      return;
    }
    if (!isSelf && !disablePassword) {
      setError("Your admin password is required to reset 2FA for this user.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.mfaDisable({
        currentPassword: disablePassword,
        code: isSelf ? disableCode.trim() : undefined,
        ...(targetUserId ? { userId: targetUserId } : {})
      });
      setSuccessMsg(`Two-Factor Authentication has been disabled for ${targetEmail || "account"}.`);
      if (onMfaUpdated) {
        onMfaUpdated(false, user);
      }
      setTimeout(() => {
        loadStatus();
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to disable MFA");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop mfa-modal-backdrop" onClick={() => !submitting && onClose()}>
      <div className="modal-dialog modal-mfa" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header mfa-modal-header">
          <div className="mfa-header-title-box">
            <div className="mfa-header-icon-badge">
              <span>🔐</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                {isSelf
                  ? "Two-Factor Authentication (2FA)"
                  : `Two-Factor Authentication: ${targetName}`}
              </h3>
              <p className="muted small" style={{ margin: "2px 0 0" }}>
                {isSelf
                  ? "Protect your account with Google Authenticator, Microsoft Authenticator, or Bitwarden"
                  : `Configuring 2FA security credentials for ${targetEmail}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="close-btn"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body mfa-modal-body">
          {error && (
            <div className="alert error mfa-alert" style={{ marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.1rem" }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert success mfa-alert" style={{ marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.1rem" }}>✅</span>
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="mfa-loading-box">
              <div className="spinner" />
              <p style={{ marginTop: "0.8rem", color: "var(--text-muted)" }}>
                Connecting to security vault...
              </p>
            </div>
          ) : viewState === "status" && mfaStatus?.mfaEnabled ? (
            /* ========================================================
               VIEW: ALREADY CONFIGURED & ACTIVE
               ======================================================== */
            <div className="mfa-status-card">
              <div className="mfa-status-banner-active">
                <div className="mfa-status-icon-ring">
                  <span>🛡️</span>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "1.1rem", color: "#10b981" }}>
                    Two-Factor Authentication is Active
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-muted)" }}>
                    {isSelf
                      ? "Your account is securely protected using RFC-6238 Time-based One-Time Passwords (TOTP)."
                      : `Account ${targetEmail} is securely protected using RFC-6238 Time-based One-Time Passwords (TOTP).`}
                  </p>
                </div>
              </div>

              <div className="mfa-stats-grid">
                <div className="mfa-stat-box">
                  <span className="mfa-stat-label">Security Protocol</span>
                  <span className="mfa-stat-value">TOTP (6-digit)</span>
                </div>
                <div className="mfa-stat-box">
                  <span className="mfa-stat-label">Enrolled On</span>
                  <span className="mfa-stat-value">
                    {mfaStatus.enrolledAt ? new Date(mfaStatus.enrolledAt).toLocaleDateString() : "Active"}
                  </span>
                </div>
                <div className="mfa-stat-box">
                  <span className="mfa-stat-label">Backup Recovery Codes</span>
                  <span className="mfa-stat-value">
                    <span className="badge badge-success" style={{ fontWeight: 700 }}>
                      {mfaStatus.remainingRecoveryCodes} of {mfaStatus.totalRecoveryCodes || 10} remaining
                    </span>
                  </span>
                </div>
              </div>

              <div className="mfa-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={startEnrollmentWizard}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <span>🔄</span> Re-configure Authenticator
                </button>

                {mfaStatus.canDisable ? (
                  <button
                    type="button"
                    className="btn btn-ghost text-danger"
                    onClick={() => setViewState("disable_confirm")}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <span>🔓</span> {isSelf ? "Disable 2FA" : "Reset / Disable 2FA"}
                  </button>
                ) : (
                  <span
                    className="small muted"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                  >
                    <span>🛡️</span> Mandatory for SaaS Top Admin
                  </span>
                )}
              </div>
            </div>
          ) : viewState === "disable_confirm" ? (
            /* ========================================================
               VIEW: DISABLE 2FA CONFIRMATION
               ======================================================== */
            <form onSubmit={handleDisableMfa} className="mfa-disable-form">
              <div className="alert warning" style={{ marginBottom: "1rem" }}>
                <strong>⚠️ Warning: Disabling Two-Factor Authentication</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                  {isSelf
                    ? "Disabling 2FA reduces your account security. Your backup recovery codes will also be voided."
                    : `You are resetting 2FA for ${targetName} (${targetEmail}). This will clear their authenticator secret and invalidate any existing recovery codes.`}
                </p>
              </div>

              <label style={{ display: "block", marginBottom: "0.8rem" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                  {isSelf ? "Current Account Password *" : "Your Administrator Password *"}
                </span>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder={isSelf ? "Enter current password" : "Enter your admin password to authorize reset"}
                  required
                  autoFocus
                  style={{ width: "100%", marginTop: "4px" }}
                />
              </label>

              {isSelf && (
                <label style={{ display: "block", marginBottom: "1.2rem" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Current 6-Digit Authenticator Code *</span>
                  <input
                    type="text"
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 123456"
                    required
                    style={{
                      width: "100%",
                      marginTop: "4px",
                      fontFamily: "var(--font-mono, monospace)",
                      letterSpacing: "0.2em",
                      fontSize: "1.1rem"
                    }}
                  />
                </label>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => setViewState("status")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={submitting || !disablePassword || (isSelf && disableCode.length !== 6)}
                >
                  {submitting ? "Processing..." : isSelf ? "Confirm & Disable 2FA" : "Confirm & Reset 2FA"}
                </button>
              </div>
            </form>
          ) : viewState === "step1_qr" ? (
            /* ========================================================
               WIZARD STEP 1: SCAN QR CODE & SECRET KEY
               ======================================================== */
            <div className="mfa-wizard-step">
              <div className="mfa-step-indicator-bar">
                <span className="mfa-step-dot active">1. Scan QR</span>
                <span className="mfa-step-line" />
                <span className="mfa-step-dot">2. Backup Codes</span>
                <span className="mfa-step-line" />
                <span className="mfa-step-dot">3. Verify</span>
              </div>

              <div className="mfa-step-intro">
                <h4 style={{ margin: "0 0 4px" }}>Step 1: Scan QR Code with Authenticator App</h4>
                <p className="muted small" style={{ margin: 0 }}>
                  Open <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or{" "}
                  <strong>Bitwarden</strong> on your smartphone and scan the QR code below:
                </p>
              </div>

              <div className="mfa-qr-container">
                {qrDataUrl ? (
                  <div className="mfa-qr-frame">
                    <img src={qrDataUrl} alt="2FA QR Code" className="mfa-qr-img" />
                  </div>
                ) : (
                  <div className="mfa-qr-placeholder">
                    <div className="spinner" />
                  </div>
                )}

                <div className="mfa-secret-box">
                  <div className="mfa-secret-header">
                    <span className="muted small">Or enter secret key manually:</span>
                    <button
                      type="button"
                      className="mfa-copy-key-btn"
                      onClick={handleCopyKey}
                      title="Copy Secret Key to clipboard"
                    >
                      {copiedKey ? "✅ Copied!" : "📋 Copy Key"}
                    </button>
                  </div>
                  <div className="mfa-secret-key-display font-mono">
                    {setupData?.secret || "••••••••••••••••••••••••••••••••"}
                  </div>
                  <div className="mfa-secret-meta small muted">
                    <span>Account: <strong>{targetEmail || user?.email || "User"}</strong></span>
                    <span>Issuer: <strong>DigitalMarkaz360</strong></span>
                  </div>
                </div>
              </div>

              <div className="mfa-step-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setViewState("step2_codes")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  Next: Backup Recovery Codes <span>→</span>
                </button>
              </div>
            </div>
          ) : viewState === "step2_codes" ? (
            /* ========================================================
               WIZARD STEP 2: EMERGENCY BACKUP RECOVERY CODES
               ======================================================== */
            <div className="mfa-wizard-step">
              <div className="mfa-step-indicator-bar">
                <span className="mfa-step-dot completed">✓ Scan QR</span>
                <span className="mfa-step-line completed" />
                <span className="mfa-step-dot active">2. Backup Codes</span>
                <span className="mfa-step-line" />
                <span className="mfa-step-dot">3. Verify</span>
              </div>

              <div className="mfa-step-intro">
                <h4 style={{ margin: "0 0 4px" }}>Step 2: Save Your Emergency Recovery Codes</h4>
                <p className="muted small" style={{ margin: 0 }}>
                  If you lose access to your phone or authenticator app, these 10 one-time recovery codes
                  are the <strong>only way</strong> to regain access to your account.
                </p>
              </div>

              <div className="mfa-recovery-codes-card">
                <div className="mfa-recovery-codes-toolbar">
                  <span className="small font-mono muted">10 One-Time Backup Codes</span>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      className="btn-sm btn-secondary"
                      onClick={handleCopyAllCodes}
                    >
                      {copiedCodes ? "✅ Copied All!" : "📋 Copy All"}
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-secondary"
                      onClick={handleDownloadCodes}
                    >
                      💾 Download (.txt)
                    </button>
                  </div>
                </div>

                <div className="mfa-recovery-codes-grid">
                  {setupData?.recoveryCodes?.map((code, index) => (
                    <div key={index} className="mfa-code-item font-mono">
                      <span className="mfa-code-num">{index + 1}.</span>
                      <span className="mfa-code-val">{code}</span>
                    </div>
                  ))}
                </div>
              </div>

              <label className="checkbox-label mfa-confirm-checkbox">
                <input
                  type="checkbox"
                  checked={savedCodesConfirmed}
                  onChange={(e) => setSavedCodesConfirmed(e.target.checked)}
                />
                <span style={{ fontSize: "0.88rem" }}>
                  I have saved or downloaded these 10 recovery codes in a secure location.
                </span>
              </label>

              <div className="mfa-step-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewState("step1_qr")}
                >
                  ← Back to QR
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!savedCodesConfirmed}
                  onClick={() => setViewState("step3_verify")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  Next: Verify 6-digit Code <span>→</span>
                </button>
              </div>
            </div>
          ) : viewState === "step3_verify" ? (
            /* ========================================================
               WIZARD STEP 3: 6-DIGIT TOTP CONFIRMATION
               ======================================================== */
            <form onSubmit={handleConfirmMfa} className="mfa-wizard-step">
              <div className="mfa-step-indicator-bar">
                <span className="mfa-step-dot completed">✓ Scan QR</span>
                <span className="mfa-step-line completed" />
                <span className="mfa-step-dot completed">✓ Backup Codes</span>
                <span className="mfa-step-line completed" />
                <span className="mfa-step-dot active">3. Verify</span>
              </div>

              <div className="mfa-step-intro">
                <h4 style={{ margin: "0 0 4px" }}>Step 3: Enter 6-Digit Verification Code</h4>
                <p className="muted small" style={{ margin: 0 }}>
                  Enter the 6-digit code showing in your authenticator app for{" "}
                  <strong>DigitalMarkaz360 ({targetEmail || user?.email || "User"})</strong> to activate 2FA:
                </p>
              </div>

              <div className="mfa-verify-input-box">
                <input
                  type="text"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000 000"
                  autoFocus
                  required
                  className="mfa-big-otp-input font-mono"
                  disabled={submitting}
                />
                <p className="small muted" style={{ marginTop: "0.5rem" }}>
                  ⏱️ Authenticator codes refresh automatically every 30 seconds.
                </p>
              </div>

              <div className="mfa-step-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => setViewState("step2_codes")}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || verifyCode.trim().length !== 6}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  {submitting ? "Verifying..." : "🔐 Activate Two-Factor Authentication"}
                </button>
              </div>
            </form>
          ) : viewState === "completed" ? (
            /* ========================================================
               WIZARD COMPLETED: CELEBRATION
               ======================================================== */
            <div className="mfa-completed-screen">
              <div className="mfa-completed-icon-box">
                <span>🎉</span>
              </div>
              <h3 style={{ margin: "0.5rem 0", color: "#10b981", fontSize: "1.4rem" }}>
                Two-Factor Authentication is Enabled!
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
                Your account is now guarded by multi-factor security. From now on, you will be prompted
                for your 6-digit authenticator code each time you sign in.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
                style={{ minWidth: "160px", padding: "0.6rem 1.4rem", fontSize: "1rem" }}
              >
                Done
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
