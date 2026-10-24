import { useEffect, useMemo, useState } from "react";
import { createLoan, updateLoan } from "../api.js";
import { describeLoan } from "../../../server/src/finance.js";
import { formula, modeLabel, money, parseAmount, percent, shiftInputDate, toInputDate } from "../format.js";

function blank(settings, loan) {
  if (loan) {
    return {
      clientName: loan.clientName,
      principal: String(loan.principal),
      interestPercent: String(loan.interestPercent),
      lateFeePerDay: String(loan.lateFeePerDay ?? 0),
      interestMode: loan.interestMode,
      startDate: toInputDate(loan.startDate),
      dueDate: toInputDate(loan.dueDate),
      note: loan.note || "",
      deductedFromCash: loan.deductedFromCash,
    };
  }
  return {
    clientName: "",
    principal: "",
    interestPercent: String(settings.defaultInterestPercent),
    lateFeePerDay: String(settings.defaultLateFeePerDay ?? 0),
    interestMode: settings.interestMode,
    startDate: shiftInputDate(0),
    dueDate: shiftInputDate(30),
    note: "",
    deductedFromCash: true,
  };
}

export default function LoanDialog({ settings, loan, onClose, onSaved }) {
  const [form, setForm] = useState(() => blank(settings, loan));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const principal = parseAmount(form.principal);
  const interestPercent = parseAmount(form.interestPercent);
  const lateFeePerDay = form.lateFeePerDay === "" ? 0 : parseAmount(form.lateFeePerDay);
  const preview = useMemo(
    () => describeLoan({
      principal,
      interestPercent,
      lateFeePerDay,
      interestMode: form.interestMode,
      startDate: form.startDate,
      dueDate: form.dueDate,
    }),
    [principal, interestPercent, lateFeePerDay, form.interestMode, form.startDate, form.dueDate],
  );

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      principal,
      interestPercent,
      lateFeePerDay,
    };
    try {
      const next = loan ? await updateLoan(loan.id, payload) : await createLoan(payload);
      onSaved(next);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="dialog-back">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="loan-title">
        <div className="dialog-head">
          <h2 id="loan-title">{loan ? "Editar empréstimo" : "Novo empréstimo"}</h2>
          <button type="button" className="btn ghost" onClick={onClose}>Fechar</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field span-2">
              Cliente
              <input value={form.clientName} onChange={(event) => setField("clientName", event.target.value)} autoFocus required maxLength={80} />
            </label>
            <label className="field">
              Valor emprestado
              <input value={form.principal} onChange={(event) => setField("principal", event.target.value)} inputMode="decimal" required placeholder="1000" />
            </label>
            <label className="field">
              Juros (%)
              <input value={form.interestPercent} onChange={(event) => setField("interestPercent", event.target.value)} inputMode="decimal" required />
            </label>
            <label className="field">
              Tipo de juros
              <select value={form.interestMode} onChange={(event) => setField("interestMode", event.target.value)}>
                <option value="mensal">Ao mês</option>
                <option value="fixo">Fixo sobre o valor</option>
              </select>
            </label>
            <label className="field">
              Juros por dia de atraso (R$)
              <input value={form.lateFeePerDay} onChange={(event) => setField("lateFeePerDay", event.target.value)} inputMode="decimal" placeholder="50" />
            </label>
            <label className="field">
              Saída do dinheiro
              <input type="date" value={form.startDate} onChange={(event) => setField("startDate", event.target.value)} required />
            </label>
            <label className="field">
              Vencimento
              <input type="date" value={form.dueDate} onChange={(event) => setField("dueDate", event.target.value)} required />
            </label>
            <label className="field span-2">
              Observação
              <input value={form.note} onChange={(event) => setField("note", event.target.value)} maxLength={280} placeholder="Opcional" />
            </label>
          </div>

          {loan ? (
            <p className="hint">
              {loan.deductedFromCash
                ? "Este valor saiu do caixa. Se mudar o valor, o caixa acompanha."
                : "Este lançamento não mexeu no caixa."}
            </p>
          ) : (
            <label className="check">
              <input
                type="checkbox"
                checked={form.deductedFromCash}
                onChange={(event) => setField("deductedFromCash", event.target.checked)}
              />
              Descontar este valor do caixa agora
            </label>
          )}

          <div className="preview">
            <div>
              <span>Vai ganhar</span>
              <strong>{money(preview.gain)}</strong>
            </div>
            <div>
              <span>Vai receber</span>
              <strong>{money(preview.total)}</strong>
            </div>
            <p>
              {preview.valid
                ? `${formula({ ...form, principal, interestPercent, lateFeePerDay, months: preview.months, daysLate: preview.daysLate })} · ${modeLabel(form.interestMode)}`
                : "Preencha valor, juros e datas para ver o ganho."}
            </p>
            {form.interestMode === "mensal" && preview.months ? (
              <p className="hint">Cada mês tem 30 dias. Se passar disso, o mês seguinte entra inteiro. Agora são {preview.months} {preview.months === 1 ? "mês" : "meses"} a {percent(form.interestPercent)}.</p>
            ) : null}
            {lateFeePerDay > 0 ? (
              <p className="hint">
                {preview.daysLate > 0
                  ? `Já são ${preview.daysLate} ${preview.daysLate === 1 ? "dia" : "dias"} de atraso: + ${money(preview.lateGain)}.`
                  : `Depois do vencimento soma ${money(lateFeePerDay)} por dia. O dia do vencimento ainda não conta.`}
              </p>
            ) : null}
          </div>

          {error ? <p className="banner">{error}</p> : null}
          <div className="actions">
            <button type="submit" className="btn primary" disabled={saving || !preview.valid}>
              {saving ? "Salvando..." : loan ? "Salvar alterações" : "Lançar empréstimo"}
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
