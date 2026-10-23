import crypto from "node:crypto";

export const SESSION_COOKIE = "caixa_session";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function isProduction() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
}

export function authConfigured() {
  return Boolean(process.env.AUTH_EMAIL?.trim() && process.env.AUTH_PASSWORD);
}

export function missingProductionConfig() {
  if (!isProduction()) return [];
  const missing = [];
  if (!process.env.MONGODB_URI?.trim()) missing.push("MONGODB_URI");
  if (!process.env.AUTH_EMAIL?.trim()) missing.push("AUTH_EMAIL");
  if (!process.env.AUTH_PASSWORD) missing.push("AUTH_PASSWORD");
  if (!process.env.SESSION_SECRET?.trim()) missing.push("SESSION_SECRET");
  return missing;
}

export function assertProductionReady() {
  const missing = missingProductionConfig();
  if (missing.length) {
    throw new Error(`No Render, configure estas variáveis: ${missing.join(", ")}.`);
  }
}

function secret() {
  return process.env.SESSION_SECRET || "segredo-local-nao-usar-no-render";
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyLogin(email, password) {
  const expectedEmail = String(process.env.AUTH_EMAIL || "").trim().toLowerCase();
  const expectedPassword = String(process.env.AUTH_PASSWORD || "");
  const givenEmail = String(email || "").trim().toLowerCase();
  const givenPassword = String(password ?? "");
  if (!expectedEmail || !expectedPassword) return false;
  return safeEqual(givenEmail, expectedEmail) && safeEqual(givenPassword, expectedPassword);
}

export function createSession(email) {
  const payload = {
    email: String(email).trim().toLowerCase(),
    exp: Date.now() + MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readSession(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.email || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function cookieFlags() {
  const parts = ["HttpOnly", "Path=/", "SameSite=Lax"];
  if (isProduction()) parts.push("Secure");
  return parts;
}

export function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, ...cookieFlags(), `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`].join("; "),
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", [`${SESSION_COOKIE}=`, ...cookieFlags(), "Max-Age=0"].join("; "));
}

export function getRequestSession(req) {
  return readSession(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
}

export function requireAuth(req, res, next) {
  if (!authConfigured()) {
    if (isProduction()) {
      return res.status(503).json({ error: "Login ainda não foi configurado no Render." });
    }
    return next();
  }
  const session = getRequestSession(req);
  if (!session) return res.status(401).json({ error: "Faça login para continuar." });
  req.user = session;
  next();
}
