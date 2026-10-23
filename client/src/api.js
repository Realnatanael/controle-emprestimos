export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error("Não consegui falar com o servidor.");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || "Não foi possível concluir.");
    error.status = response.status;
    throw error;
  }
  return body;
}

export const getMe = () => request("/api/me");

export const login = (payload) => request("/api/login", { method: "POST", body: JSON.stringify(payload) });

export const logout = () => request("/api/logout", { method: "POST" });

export const getBootstrap = () => request("/api/bootstrap");

export const saveSettings = (payload) => request("/api/settings", { method: "PUT", body: JSON.stringify(payload) });

export const moveCash = (payload) => request("/api/cash", { method: "POST", body: JSON.stringify(payload) });

export const createLoan = (payload) => request("/api/loans", { method: "POST", body: JSON.stringify(payload) });

export const updateLoan = (id, payload) => request(`/api/loans/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const payLoan = (id) => request(`/api/loans/${id}/pay`, { method: "POST" });

export const reopenLoan = (id) => request(`/api/loans/${id}/reopen`, { method: "POST" });

export const deleteLoan = (id) => request(`/api/loans/${id}`, { method: "DELETE" });
