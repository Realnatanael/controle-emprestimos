import { useState } from "react";
import { login } from "../api.js";

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      onLoggedIn(await login({ email, password }));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <strong>Caixa</strong>
            <span>Empréstimos</span>
          </div>
        </div>
        <h1>Entrar</h1>
        <p>Use o e-mail e a senha combinados. Só essa conta abre o painel.</p>
        <label className="field">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </label>
        <label className="field">
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="banner">{error}</p> : null}
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
