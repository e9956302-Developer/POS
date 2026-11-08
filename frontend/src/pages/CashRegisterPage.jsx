import { useState } from "react";
import { api } from "../api.js";
import { SectionCard } from "../components/SectionCard.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export function CashRegisterPage({ context }) {
  const { t, isRtl, language } = useLanguage();
  const defaultBranchId = context.session.branch_id || context.session.branchId || "";
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [openingCash, setOpeningCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSession() {
    setError("");
    setMessage("");
    try {
      setData(await api.cashRegisterSession(branchId, date));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function openSession(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.openCashRegister({
        branchId: Number(branchId),
        businessDate: date,
        openingCash: Number(openingCash || 0),
        notes
      });
      setOpeningCash("");
      setMessage(t("cash_register.register_opened", "Cash register opened successfully"));
      await loadSession();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function closeSession(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.closeCashRegister({
        branchId: Number(branchId),
        businessDate: date,
        actualCash: Number(actualCash || 0),
        notes
      });
      setActualCash("");
      setMessage(t("cash_register.register_closed", "Cash register submitted for verification"));
      await loadSession();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function verifySession() {
    setError("");
    setMessage("");
    try {
      await api.verifyCashRegister(data.session.id);
      setMessage(t("cash_register.register_verified", "Cash register verified and closed"));
      await loadSession();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  const session = data?.session;
  const summary = data?.summary;

  return (
    <div className="page-grid">
      <SectionCard
        title={t("cash_register.closing_title", "Cash Register Closing")}
        subtitle={t("cash_register.reconcile_subtitle", "Open, reconcile, close, and verify daily branch cash.")}
        action={
          <button className="primary-btn" type="button" onClick={loadSession}>
            🔄 {t("cash_register.refresh", "Refresh")}
          </button>
        }
      >
        <div className="form-grid">
          <label>
            {t("common.branch", "Branch")}
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              <option value="">{t("common.select_branch", "Select branch")}</option>
              {context.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("common.date", "Date")}
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}
      </SectionCard>

      {summary ? (
        <SectionCard
          title={t("cash_register.expected_cash_card", "Expected Cash")}
          subtitle={t("cash_register.session_status", "Session status: {status}", { status: session?.status || (language === "ur" ? "شروع نہیں ہوا" : "not opened") })}
        >
          <div className="stats-grid">
            <StatCard label={t("cash_register.opening_cash", "Opening Cash")} value={`PKR ${Number(summary.openingCash).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
            <StatCard label={t("cash_register.cash_in", "Cash In")} value={`PKR ${Number(summary.cashIn).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="positive" />
            <StatCard label={t("cash_register.cash_out", "Cash Out")} value={`PKR ${Number(summary.cashOut).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
            <StatCard label={t("cash_register.daily_expenses", "Expenses")} value={`PKR ${Number(summary.expenses).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="warning" />
            <StatCard label={t("cash_register.expected_cash_card", "Expected Cash")} value={`PKR ${Number(summary.expectedCash).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone="positive" />
            {session?.actual_cash !== null && session?.actual_cash !== undefined ? (
              <StatCard label={t("cash_register.discrepancy", "Discrepancy")} value={`PKR ${Number(session.discrepancy).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} tone={Number(session.discrepancy) === 0 ? "positive" : "danger"} />
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <div className="page-grid two-column">
        <SectionCard
          title={t("cash_register.open_card_title", "Open Register")}
          subtitle={t("cash_register.open_card_subtitle", "Set the starting cash for the selected branch and date.")}
        >
          <form className="form-grid" onSubmit={openSession}>
            <label>
              {t("cash_register.opening_cash", "Opening Cash")}
              <input
                type="number"
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
              />
            </label>
            <label className="full-span">
              {t("cash_register.drawer_notes", "Notes")}
              <textarea rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <div className="full-span row-actions">
              <button className="primary-btn" disabled={!context.can("cash_register", "create") || session}>
                {t("cash_register.open_btn", "Open")}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title={t("cash_register.close_card_title", "Close Register")}
          subtitle={t("cash_register.close_card_subtitle", "Submit actual counted cash for manager verification.")}
        >
          <form className="form-grid" onSubmit={closeSession}>
            <label>
              {t("cash_register.actual_cash", "Actual Cash")}
              <input
                type="number"
                value={actualCash}
                onChange={(event) => setActualCash(event.target.value)}
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
              />
            </label>
            <div className="full-span row-actions">
              <button className="primary-btn" disabled={!context.can("cash_register", "close") || !session || session.status !== "open"}>
                {t("cash_register.submit_closing_btn", "Submit Closing")}
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={verifySession}
                disabled={!context.can("cash_register", "verify") || !session || session.status !== "pending_verification"}
              >
                {t("cash_register.verify_btn", "Verify")}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
