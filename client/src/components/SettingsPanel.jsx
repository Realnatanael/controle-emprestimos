import { useState } from "react";
import { moveCash, saveSettings } from "../api.js";
import { modeLabel, money, parseAmount } from "../format.js";

export default function SettingsPanel({ data, onChange }) {
  const { settings } = data;
  const [amount, setAmount] = useState("");
  const [rules, setRules] = useState({
    defaultInterestPercent: String(settings.defaultInterestPercent),
    defaultLateFeePerDay: String(settings.defaultLateFeePerDay ?? 0),
    interestMode: settings.interestMode,
    yellowDays: String(settings.yellowDays),
    redDays: String(settings.redDays),
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);

  async function run(work, okMessage) {
    setPending(true);
    setError("");
    setSaved("");
    try {
      onChange(await work());
      setSaved(okMessage);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  function submitCash(direction) {
    const value = parseAmount(amount);
    run(async () => {
      const next = await moveCash({ direction, amount: value });
      setAmount("");
      return next;
    }, direction === "set" ? "Caixa atualizado." : "Movimento lançado.");
  }

  function submitRules(event) {
    event.preventDefault();
    run(
      () => saveSettings({
        defaultInterestPercent: Number(String(rules.defaultInterestPercent).replace(",", ".")),
        defaultLateFeePerDay: Number(String(rules.defaultLateFeePerDay).replace(",", ".") || 0),
        interestMode: rules.interestMode,
        yellowDays: Number(rules.yellowDays),
        redDays: Number(rules.redDays),
      }),
      "Juros e alertas salvos. Empréstimos já lançados não mudam.",
    );
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Ajustes</h1>
          <p>Defina o dinheiro em mãos, os juros dos próximos empréstimos e quando o alerta muda de cor.</p>
        </div>
      </header>

      {error ? <p className="banner">{error}</p> : null}
      {saved ? <p className="banner ok">{saved}</p> : null}

      <div className="settings-grid">
        <article className="panel">
          <h2>Dinheiro em mãos</h2>
          <p className="cash-now">{money(settings.cashOnHand)}</p>
          <p className="hint">Entrada soma, saída tira. Substituir troca o número inteiro, sem passar pelos empréstimos.</p>
          <label className="field">
            Valor
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="500" />
          </label>
          <div className="actions">
            <button type="button" className="btn primary" disabled={pending} onClick={() => submitCash("in")}>Lançar entrada</button>
            <button type="button" className="btn ghost" disabled={pending} onClick={() => submitCash("out")}>Lançar saída</button>
            <button type="button" className="btn danger" disabled={pending} onClick={() => submitCash("set")}>Substituir o caixa</button>
          </div>
        </article>

        <form className="panel" onSubmit={submitRules}>
          <h2>Juros e alertas</h2>
          <p className="hint">Isto vale para o próximo empréstimo. O que já está lançado guarda a taxa daquele dia.</p>
          <div className="form-grid">
            <label className="field">
              Juros padrão (%)
              <input value={rules.defaultInterestPercent} onChange={(event) => setRules({ ...rules, defaultInterestPercent: event.target.value })} inputMode="decimal" required />
            </label>
            <label className="field">
              Tipo
              <select value={rules.interestMode} onChange={(event) => setRules({ ...rules, interestMode: event.target.value })}>
                <option value="mensal">Ao mês</option>
                <option value="fixo">Fixo sobre o valor</option>
              </select>
            </label>
            <label className="field span-2">
              Juros por dia de atraso (R$)
              <input value={rules.defaultLateFeePerDay} onChange={(event) => setRules({ ...rules, defaultLateFeePerDay: event.target.value })} inputMode="decimal" />
            </label>
            <label className="field">
              Amarelo a partir de (dias)
              <input type="number" min="1" max="365" value={rules.yellowDays} onChange={(event) => setRules({ ...rules, yellowDays: event.target.value })} required />
            </label>
            <label className="field">
              Vermelho a partir de (dias)
              <input type="number" min="0" max="364" value={rules.redDays} onChange={(event) => setRules({ ...rules, redDays: event.target.value })} required />
            </label>
          </div>
          <p className="hint">
            Agora o padrão é {modeLabel(settings.interestMode).toLowerCase()} a {settings.defaultInterestPercent}%. Depois do vencimento soma {money(settings.defaultLateFeePerDay || 0)} por dia. Verde passa de {settings.yellowDays} dias, amarelo vai até esse prazo e vermelho entra em {settings.redDays} dias ou menos.
          </p>
          <div className="actions">
            <button type="submit" className="btn primary" disabled={pending}>Salvar juros e alertas</button>
          </div>
        </form>
      </div>
    </section>
  );
}
