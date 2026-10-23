import test from "node:test";
import assert from "node:assert/strict";
import { createSession, readSession, safeEqual, verifyLogin } from "./auth.js";

test("compara e-mail e senha sem aceitar valor errado", () => {
  process.env.AUTH_EMAIL = "colega@email.com";
  process.env.AUTH_PASSWORD = "senha-forte";
  process.env.SESSION_SECRET = "teste-secreto";
  assert.equal(verifyLogin("Colega@email.com", "senha-forte"), true);
  assert.equal(verifyLogin("outro@email.com", "senha-forte"), false);
  assert.equal(verifyLogin("colega@email.com", "outra"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
});

test("a sessão assina o e-mail e recusa token adulterado", () => {
  process.env.SESSION_SECRET = "teste-secreto";
  const token = createSession("colega@email.com");
  assert.equal(readSession(token).email, "colega@email.com");
  assert.equal(readSession(`${token}x`), null);
  assert.equal(readSession(""), null);
});
