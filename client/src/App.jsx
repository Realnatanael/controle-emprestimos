import { useCallback, useEffect, useState } from "react";
import { getBootstrap, getMe, logout } from "./api.js";
import Dashboard from "./components/Dashboard.jsx";
import Loans from "./components/Loans.jsx";
import Login from "./components/Login.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import LoanDialog from "./components/LoanDialog.jsx";

const NAV = [
  ["painel", "Painel"],
  ["emprestimos", "Empréstimos"],
  ["ajustes", "Ajustes"],
];

export default function App() {
  const [tab, setTab] = useState("painel");
  const [filter, setFilter] = useState("abertos");
  const [user, setUser] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadPanel = useCallback(async () => {
    const next = await getBootstrap();
    setData(next);
    setError("");
    return next;
  }, []);

  const boot = useCallback(async () => {
    const me = await getMe();
    setUser(me);
    setNeedsLogin(false);
    await loadPanel();
  }, [loadPanel]);

  useEffect(() => {
    boot()
      .catch((err) => {
        if (err.status === 401) {
          setNeedsLogin(true);
          setUser(null);
          setData(null);
          setError("");
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [boot]);

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  function openFilter(next) {
    setFilter(next);
    setTab("emprestimos");
  }

  async function handleLogout() {
    await logout().catch(() => {});
    setUser(null);
    setData(null);
    setNeedsLogin(true);
  }

  if (loading) {
    return <p className="loading screen">Carregando o caixa…</p>;
  }

  if (needsLogin) {
    return (
      <Login
        onLoggedIn={(nextUser) => {
          setUser(nextUser);
          setNeedsLogin(false);
          setLoading(true);
          loadPanel()
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
        }}
      />
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <strong>Caixa</strong>
            <span>Empréstimos</span>
          </div>
        </div>
        <nav>
          {NAV.map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? "nav-btn on" : "nav-btn"} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          {user?.email ? <p className="sidebar-user">{user.email}</p> : null}
          {user && !user.open ? (
            <button type="button" className="nav-btn" onClick={handleLogout}>Sair</button>
          ) : null}
          <p className="sidebar-date">{today}</p>
        </div>
      </aside>
      <main>
        {error ? <p className="banner">{error}</p> : null}
        {!data ? (
          <div className="empty">
            <h2>O caixa não respondeu</h2>
            <p>{error}</p>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setLoading(true);
                boot()
                  .catch((err) => {
                    if (err.status === 401) {
                      setNeedsLogin(true);
                      setError("");
                      return;
                    }
                    setError(err.message);
                  })
                  .finally(() => setLoading(false));
              }}
            >
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            {tab === "painel" && (
              <Dashboard data={data} onOpenFilter={openFilter} onCreate={() => setCreating(true)} />
            )}
            {tab === "emprestimos" && (
              <Loans data={data} filter={filter} setFilter={setFilter} onChange={setData} />
            )}
            {tab === "ajustes" && <SettingsPanel data={data} onChange={setData} />}
            {creating && data ? (
              <LoanDialog
                settings={data.settings}
                loan={null}
                onClose={() => setCreating(false)}
                onSaved={(next) => {
                  setData(next);
                  setCreating(false);
                  setTab("emprestimos");
                  setFilter("abertos");
                }}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
