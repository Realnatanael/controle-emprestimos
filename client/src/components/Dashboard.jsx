import { dateBR, formula, money } from "../format.js";

export default function Dashboard({ data, onOpenFilter, onCreate }) {
  const { summary, settings, loans } = data;
  const upcoming = loans.filter((loan) => loan.status === "aberto").slice(0, 6);
  const fresh = summary.counts.aberto === 0 && summary.counts.pago === 0 && settings.cashOnHand === 0;

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Painel</h1>
          <p>O valor em mãos, o que está na rua e quanto cada empréstimo ainda rende.</p>
        </div>
        <button type="button" className="btn primary" onClick={onCreate}>Novo empréstimo</button>
      </header>

      {fresh ? (
        <div className="prompt">
          <h2>Comece pelo dinheiro em mãos</h2>
          <p>Em Ajustes, informe quanto você tem agora. Quando lançar um empréstimo, esse valor sai do caixa e volta com os juros no dia do pagamento.</p>
        </div>
      ) : null}

      <div className="hero">
        <span>Valor total</span>
        <strong className={summary.netWorth < 0 ? "negative" : ""}>{money(summary.netWorth)}</strong>
        <p>Caixa mais tudo o que ainda vai entrar dos empréstimos em aberto.</p>
      </div>

      <div className="stats">
        <article className="stat">
          <span>Em mãos</span>
          <strong className={summary.cashOnHand < 0 ? "negative" : ""}>{money(summary.cashOnHand)}</strong>
        </article>
        <article className="stat">
          <span>Na rua</span>
          <strong>{money(summary.lent)}</strong>
        </article>
        <article className="stat">
          <span>A receber</span>
          <strong>{money(summary.toReceive)}</strong>
        </article>
        <article className="stat">
          <span>Lucro previsto</span>
          <strong className="gain">{money(summary.expectedProfit)}</strong>
        </article>
        <article className="stat">
          <span>Lucro já recebido</span>
          <strong>{money(summary.realizedProfit)}</strong>
        </article>
      </div>

      <div className="alerts">
        <button type="button" className="alert-btn verde" onClick={() => onOpenFilter("verde")}>
          <i /> {summary.counts.verde} no verde
        </button>
        <button type="button" className="alert-btn amarelo" onClick={() => onOpenFilter("amarelo")}>
          <i /> {summary.counts.amarelo} no amarelo
        </button>
        <button type="button" className="alert-btn vermelho" onClick={() => onOpenFilter("vermelho")}>
          <i /> {summary.counts.vermelho} no vermelho
        </button>
      </div>
      <p className="hint">
        Verde: falta mais de {settings.yellowDays} dias. Amarelo: de {settings.redDays + 1} a {settings.yellowDays} dias. Vermelho: vence em até {settings.redDays} {settings.redDays === 1 ? "dia" : "dias"} ou já atrasou.
      </p>

      <h2 className="section-title">Perto de vencer</h2>
      {upcoming.length === 0 ? (
        <div className="empty">
          <h2>Nenhum empréstimo aberto</h2>
          <p>Quando lançar, o mais urgente aparece aqui.</p>
        </div>
      ) : (
        <div className="loan-list">
          {upcoming.map((loan) => (
            <article key={loan.id} className={`loan-card compact ${loan.level}`}>
              <div className="loan-top">
                <div>
                  <h2>{loan.clientName}</h2>
                  <p>{loan.dueLabel} · {dateBR(loan.dueDate)}</p>
                </div>
                <div className="compact-money">
                  <span>Vai ganhar</span>
                  <strong className="gain">{money(loan.gain)}</strong>
                </div>
              </div>
              <p className="formula">{formula(loan)} · recebe {money(loan.total)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
