import { useState } from "react";
import { deleteLoan, payLoan, reopenLoan } from "../api.js";
import { dateBR, formula, money } from "../format.js";
import LoanDialog from "./LoanDialog.jsx";

const FILTERS = [
  ["abertos", "Abertos"],
  ["vermelho", "Vermelho"],
  ["amarelo", "Amarelo"],
  ["verde", "Verde"],
  ["pagos", "Pagos"],
  ["todos", "Todos"],
];

export default function Loans({ data, filter, setFilter, onChange }) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(null);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");

  const loans = data.loans.filter((loan) => {
    const text = `${loan.clientName} ${loan.note}`.toLowerCase();
    if (query && !text.includes(query.trim().toLowerCase())) return false;
    if (filter === "todos") return true;
    if (filter === "abertos") return loan.status === "aberto";
    if (filter === "pagos") return loan.status === "pago";
    return loan.level === filter;
  });

  async function run(id, action) {
    setPendingId(id);
    setError("");
    try {
      onChange(await action());
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId("");
    }
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Empréstimos</h1>
          <p>Lance o que saiu, acompanhe o ganho e marque quando o cliente pagar.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setDialog("new")}>Novo empréstimo</button>
      </header>

      <div className="toolbar">
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cliente"
          aria-label="Buscar cliente"
        />
        <div className="chips">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={filter === id ? "chip on" : "chip"} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="banner">{error}</p> : null}

      {loans.length === 0 ? (
        <div className="empty">
          <h2>Nada por aqui</h2>
          <p>Nenhum empréstimo nesta lista. Lance um novo ou troque o filtro.</p>
        </div>
      ) : (
        <div className="loan-list">
          {loans.map((loan) => (
            <article key={loan.id} className={`loan-card ${loan.level}`}>
              <div className="loan-top">
                <div>
                  <h2>{loan.clientName}</h2>
                  <p>{loan.dueLabel} · {dateBR(loan.dueDate)}</p>
                </div>
                <span className={`badge ${loan.level}`}>{loan.level === "pago" ? "Pago" : loan.level}</span>
              </div>
              <div className="figures">
                <div>
                  <span>Emprestado</span>
                  <strong>{money(loan.principal)}</strong>
                </div>
                <div>
                  <span>{loan.status === "pago" ? "Ganhou" : "Vai ganhar"}</span>
                  <strong className="gain">{money(loan.gain)}</strong>
                </div>
                <div>
                  <span>{loan.status === "pago" ? "Recebeu" : "Vai receber"}</span>
                  <strong>{money(loan.total)}</strong>
                </div>
              </div>
              <p className="formula">{formula(loan)}</p>
              {loan.note ? <p className="note">{loan.note}</p> : null}
              <div className="actions">
                {loan.status === "aberto" ? (
                  <button type="button" className="btn primary" disabled={pendingId === loan.id} onClick={() => run(loan.id, () => payLoan(loan.id))}>
                    Receber {money(loan.total)}
                  </button>
                ) : (
                  <button type="button" className="btn ghost" disabled={pendingId === loan.id} onClick={() => run(loan.id, () => reopenLoan(loan.id))}>
                    Desfazer recebimento
                  </button>
                )}
                {loan.status === "aberto" ? (
                  <button type="button" className="btn ghost" onClick={() => setDialog(loan)}>Editar</button>
                ) : null}
                <button
                  type="button"
                  className="btn danger"
                  disabled={pendingId === loan.id}
                  onClick={() => {
                    if (window.confirm(`Excluir o empréstimo de ${loan.clientName}?`)) {
                      run(loan.id, () => deleteLoan(loan.id));
                    }
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {dialog ? (
        <LoanDialog
          settings={data.settings}
          loan={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
          onSaved={(next) => {
            setDialog(null);
            onChange(next);
          }}
        />
      ) : null}
    </section>
  );
}
