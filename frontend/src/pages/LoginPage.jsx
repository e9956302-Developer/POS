import { useState } from "react";
import { api } from "../api.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { LanguageSwitcher } from "../components/LanguageSwitcher.jsx";

export function LoginPage({ onLogin, onCompleteLogin, error, onBackToLanding }) {
  const { t, isRtl } = useLanguage();
  const [email, setEmail] = useState("admin@mobilepos.local");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  // MFA Challenge State
  const [step, setStep] = useState("credentials"); // 'credentials' | 'mfa_verify'
  const [mfaTicket, setMfaTicket] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  async function handleSubmit(event) {
    event?.preventDefault();
    setBusy(true);
    setLocalError("");
    try {
      const result = await onLogin({ email, password });
      if (result?.mfaRequired) {
        setMfaTicket(result.mfaTicket);
        setStep("mfa_verify");
        setMfaCode("");
        setRecoveryCode("");
      }
    } catch (loginError) {
      setLocalError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMfaVerifySubmit(event) {
    event?.preventDefault();
    setBusy(true);
    setLocalError("");
    try {
      const payload = useRecoveryCode
        ? { mfaTicket, recoveryCode: recoveryCode.trim() }
        : { mfaTicket, code: mfaCode.trim().replace(/\s+/g, "") };

      if (!useRecoveryCode && payload.code.length !== 6) {
        throw new Error("Please enter your full 6-digit authenticator code.");
      }
      if (useRecoveryCode && !payload.recoveryCode) {
        throw new Error("Please enter an emergency recovery code.");
      }

      const verifyRes = await api.mfaVerify(payload);
      if (onCompleteLogin) {
        onCompleteLogin(verifyRes);
      }
    } catch (verifyError) {
      setLocalError(verifyError.message || "Invalid verification code or recovery code");
    } finally {
      setBusy(false);
    }
  }

  function handleDemoSelect(demoEmail, demoPass) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setStep("credentials");
    setLocalError("");
  }

  const activeError = error || localError;
  const isDeactivatedAlert =
    activeError &&
    (activeError.toLowerCase().includes("deactivated") ||
      activeError.toLowerCase().includes("disabled") ||
      activeError.toLowerCase().includes("inactive") ||
      activeError.toLowerCase().includes("suspended"));

  return (
    <div className="login-shell" style={{ position: "relative" }}>
      {onBackToLanding && (
        <button
          type="button"
          onClick={onBackToLanding}
          className="login-back-to-landing-btn"
          style={{
            position: "absolute",
            top: "1.5rem",
            left: "1.5rem",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#94a3b8",
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backdropFilter: "blur(8px)",
            transition: "all 0.2s ease",
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#38bdf8";
            e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
          }}
        >
          <span>{isRtl ? "→" : "←"}</span> {t("auth.backToLanding", "Back to Product Overview")}
        </button>
      )}

      {step === "credentials" ? (
        <form className="login-card" onSubmit={handleSubmit}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.25rem" }}>
            <LanguageSwitcher compact />
          </div>

          <div className="brand-lockup large" style={{ flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0.6rem" }}>
            <img src="/logo.png" alt="DigitalMarkaz360" className="login-logo-img" />
            <div>
              <h1 style={{ fontSize: "1.6rem", margin: 0, fontWeight: 800, letterSpacing: "-0.02em" }}>DigitalMarkaz360</h1>
              <p className="muted login-tagline" style={{ margin: "4px 0 2px", fontWeight: 600, color: "var(--primary, #0ea5e9)" }}>
                Poora Karobar, Ek Markaz
              </p>
              <p className="urdu-tagline" style={{ margin: 0, fontSize: "0.88rem", opacity: 0.8, direction: "rtl" }}>
                پورا کاروبار، ایک مرکز
              </p>
            </div>
          </div>

          {activeError ? (
            <div
              className={`alert ${isDeactivatedAlert ? "alert-inactive" : "error"}`}
              style={
                isDeactivatedAlert
                  ? {
                      borderLeft: "4px solid #ef4444",
                      background: "rgba(239, 68, 68, 0.12)",
                      padding: "0.85rem 1rem",
                      borderRadius: "8px",
                      margin: "0.8rem 0"
                    }
                  : undefined
              }
            >
              {isDeactivatedAlert ? (
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>⛔</span>
                  <div>
                    <strong style={{ display: "block", color: "#f87171", marginBottom: "0.2rem" }}>
                      Account Notice
                    </strong>
                    <span style={{ fontSize: "0.88rem", lineHeight: 1.4 }}>{activeError}</span>
                  </div>
                </div>
              ) : (
                activeError
              )}
            </div>
          ) : null}

          <label>
            {t("auth.email", "Email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            {t("auth.password", "Password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="primary-btn" disabled={busy}>
            {busy ? t("auth.loggingIn", "Signing in...") : t("auth.loginBtn", "Login")}
          </button>

          <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border, #223048)", paddingTop: "1rem" }}>
            <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.78rem", color: "var(--text-muted, #94a3b8)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
              ⚡ {t("auth.demoProfiles", "1-Click Demo Profiles")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.78rem", padding: "0.45rem 0.5rem", textAlign: "left", justifyContent: "flex-start" }}
                onClick={() => handleDemoSelect("admin@mobilepos.local", "admin123")}
                title="Full company administration access"
              >
                👑 Company Admin
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.78rem", padding: "0.45rem 0.5rem", textAlign: "left", justifyContent: "flex-start" }}
                onClick={() => handleDemoSelect("manager@mobilepos.local", "admin123")}
                title="Branch operations, stock, and repairs"
              >
                🏢 Branch Manager
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.78rem", padding: "0.45rem 0.5rem", textAlign: "left", justifyContent: "flex-start" }}
                onClick={() => handleDemoSelect("cashier@mobilepos.local", "admin123")}
                title="Fast billing & cash drawer"
              >
                🛒 Cashier Desk
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.78rem", padding: "0.45rem 0.5rem", textAlign: "left", justifyContent: "flex-start" }}
                onClick={() => handleDemoSelect("topadmin@mobilepos.local", "admin123")}
                title="Multi-tenant SaaS administrative console (MFA Protected)"
              >
                🛡️ SaaS Top Admin
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* ========================================================
           STEP 2: TWO-FACTOR AUTHENTICATION (MFA) CHALLENGE
           ======================================================== */
        <form className="login-card login-mfa-step" onSubmit={handleMfaVerifySubmit}>
          <div className="login-mfa-icon-badge">
            <span>🔐</span>
          </div>

          <h2 style={{ fontSize: "1.4rem", margin: "0 0 4px", fontWeight: 800 }}>
            Two-Factor Authentication
          </h2>
          <p className="muted small" style={{ margin: "0 0 1rem" }}>
            Account: <strong>{email}</strong>
          </p>

          {activeError ? (
            <div className="alert error" style={{ width: "100%", marginBottom: "1rem" }}>
              {activeError}
            </div>
          ) : null}

          {!useRecoveryCode ? (
            <>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: 0 }}>
                Enter the 6-digit code generated by your authenticator app (Google Authenticator, Microsoft Authenticator, or Bitwarden):
              </p>

              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000 000"
                autoFocus
                required
                className="login-mfa-otp-input font-mono"
                disabled={busy}
              />

              {email.toLowerCase().includes("topadmin") && (
                <div style={{ margin: "0.3rem 0 0.8rem", fontSize: "0.76rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "4px 8px", borderRadius: "6px" }}>
                  💡 Demo Passcode: <strong>123456</strong> or use your authenticator app
                </div>
              )}

              <button
                type="submit"
                className="primary-btn"
                disabled={busy || mfaCode.trim().length !== 6}
                style={{ width: "100%", marginTop: "0.5rem" }}
              >
                {busy ? "Verifying code..." : "Verify & Sign In 🔐"}
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setUseRecoveryCode(true);
                  setLocalError("");
                }}
                style={{ marginTop: "0.8rem", fontSize: "0.82rem", color: "#94a3b8" }}
              >
                Lost phone? Use an emergency recovery code
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: 0 }}>
                Enter one of your 10 emergency backup recovery codes (e.g. <code>ABCD-1234-EFGH</code>):
              </p>

              <input
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                autoFocus
                required
                className="login-mfa-recovery-input font-mono"
                disabled={busy}
              />

              <button
                type="submit"
                className="primary-btn"
                disabled={busy || !recoveryCode.trim()}
                style={{ width: "100%", marginTop: "0.5rem" }}
              >
                {busy ? "Verifying code..." : "Sign In with Recovery Code"}
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setUseRecoveryCode(false);
                  setLocalError("");
                }}
                style={{ marginTop: "0.8rem", fontSize: "0.82rem", color: "#38bdf8" }}
              >
                ← Back to 6-digit Authenticator Code
              </button>
            </>
          )}

          <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border, #223048)", width: "100%", paddingTop: "0.8rem" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setStep("credentials");
                setLocalError("");
              }}
              style={{ fontSize: "0.82rem", color: "#94a3b8" }}
            >
              ← Back to Email / Password
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
