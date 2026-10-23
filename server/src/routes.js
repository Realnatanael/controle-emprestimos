import express from "express";
import mongoose from "mongoose";
import {
  authConfigured,
  clearSessionCookie,
  createSession,
  getRequestSession,
  requireAuth,
  setSessionCookie,
  verifyLogin,
} from "./auth.js";
import { Loan, getSettings } from "./models.js";
import {
  applyCreateCash,
  applyDeleteCash,
  applyPayCash,
  applyPrincipalChange,
  applyReopenCash,
  asDate,
  buildView,
  presentLoan,
  roundMoney,
  startOfDay,
} from "./finance.js";

export const api = express.Router();

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function snapshot() {
  const settings = await getSettings();
  const loans = await Loan.find().lean();
  return buildView(loans, settings);
}

function readNumber(value, label) {
  const number = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(number)) throw new HttpError(400, `${label} inválido.`);
  return number;
}

function readDate(value, label) {
  const date = asDate(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${label} inválida.`);
  return date;
}

function readLoanInput(body, settings, { partial } = {}) {
  const clientName = String(body.clientName ?? "").trim().slice(0, 80);
  if (!clientName) throw new HttpError(400, "Informe o nome do cliente.");

  const principal = roundMoney(readNumber(body.principal, "O valor"));
  if (principal <= 0 || principal > 1000000000) {
    throw new HttpError(400, "Informe um valor maior que zero.");
  }

  const interestPercent = roundMoney(
    body.interestPercent === undefined || body.interestPercent === ""
      ? settings.defaultInterestPercent
      : readNumber(body.interestPercent, "Os juros"),
  );
  if (interestPercent < 0 || interestPercent > 1000) {
    throw new HttpError(400, "Os juros precisam ficar entre 0% e 1000%.");
  }

  const interestMode = body.interestMode || settings.interestMode;
  if (!["mensal", "fixo"].includes(interestMode)) {
    throw new HttpError(400, "Escolha juros ao mês ou juros fixos.");
  }

  const startDate = readDate(body.startDate, "A data de saída");
  const dueDate = readDate(body.dueDate, "A data de vencimento");
  if (startOfDay(dueDate) < startOfDay(startDate)) {
    throw new HttpError(400, "O vencimento não pode ser antes da saída do dinheiro.");
  }

  const note = String(body.note ?? "").trim().slice(0, 280);
  const deductedFromCash = partial ? undefined : body.deductedFromCash !== false;

  return { clientName, principal, interestPercent, interestMode, startDate, dueDate, note, deductedFromCash };
}

async function loadLoan(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, "Empréstimo não encontrado.");
  const loan = await Loan.findById(id);
  if (!loan) throw new HttpError(404, "Empréstimo não encontrado.");
  return loan;
}

api.get("/health", wrap(async (_req, res) => {
  res.json({ ok: true });
}));

api.post("/login", wrap(async (req, res) => {
  if (!authConfigured()) {
    throw new HttpError(400, "O login ainda não foi configurado neste servidor.");
  }
  if (!verifyLogin(req.body?.email, req.body?.password)) {
    throw new HttpError(401, "E-mail ou senha incorretos.");
  }
  const email = String(req.body.email).trim().toLowerCase();
  setSessionCookie(res, createSession(email));
  res.json({ email, open: false });
}));

api.post("/logout", wrap(async (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
}));

api.get("/me", wrap(async (req, res) => {
  if (!authConfigured()) {
    return res.json({ email: null, open: true });
  }
  const session = getRequestSession(req);
  if (!session) throw new HttpError(401, "Faça login para continuar.");
  res.json({ email: session.email, open: false });
}));

api.use(requireAuth);

api.get("/bootstrap", wrap(async (_req, res) => {
  res.json(await snapshot());
}));

api.put("/settings", wrap(async (req, res) => {
  const settings = await getSettings();
  const interestPercent = roundMoney(readNumber(req.body.defaultInterestPercent, "Os juros"));
  if (interestPercent < 0 || interestPercent > 1000) {
    throw new HttpError(400, "Os juros precisam ficar entre 0% e 1000%.");
  }
  if (!["mensal", "fixo"].includes(req.body.interestMode)) {
    throw new HttpError(400, "Escolha juros ao mês ou juros fixos.");
  }

  const yellowDays = readNumber(req.body.yellowDays, "O prazo amarelo");
  const redDays = readNumber(req.body.redDays, "O prazo vermelho");
  if (!Number.isInteger(yellowDays) || yellowDays < 1 || yellowDays > 365) {
    throw new HttpError(400, "O alerta amarelo precisa ser de 1 a 365 dias.");
  }
  if (!Number.isInteger(redDays) || redDays < 0 || redDays > 364) {
    throw new HttpError(400, "O alerta vermelho precisa ser de 0 a 364 dias.");
  }
  if (redDays >= yellowDays) {
    throw new HttpError(400, "O vermelho precisa ficar mais perto do vencimento do que o amarelo.");
  }

  settings.defaultInterestPercent = interestPercent;
  settings.interestMode = req.body.interestMode;
  settings.yellowDays = yellowDays;
  settings.redDays = redDays;
  await settings.save();
  res.json(await snapshot());
}));

api.post("/cash", wrap(async (req, res) => {
  const settings = await getSettings();
  const amount = roundMoney(readNumber(req.body.amount, "O valor"));
  if (amount < 0 || (req.body.direction !== "set" && amount === 0)) {
    throw new HttpError(400, "Informe um valor maior que zero.");
  }
  if (req.body.direction === "in") settings.cashOnHand = roundMoney(settings.cashOnHand + amount);
  else if (req.body.direction === "out") settings.cashOnHand = roundMoney(settings.cashOnHand - amount);
  else if (req.body.direction === "set") settings.cashOnHand = amount;
  else throw new HttpError(400, "Movimento inválido.");
  await settings.save();
  res.json(await snapshot());
}));

api.post("/loans", wrap(async (req, res) => {
  const settings = await getSettings();
  const input = readLoanInput(req.body, settings);
  settings.cashOnHand = applyCreateCash(settings.cashOnHand, input.principal, input.deductedFromCash);
  await Loan.create(input);
  await settings.save();
  res.status(201).json(await snapshot());
}));

api.put("/loans/:id", wrap(async (req, res) => {
  const loan = await loadLoan(req.params.id);
  if (loan.status === "pago") {
    throw new HttpError(400, "Desfaça o recebimento antes de editar.");
  }
  const settings = await getSettings();
  const input = readLoanInput(req.body, settings, { partial: true });
  const previous = loan.principal;
  loan.clientName = input.clientName;
  loan.principal = input.principal;
  loan.interestPercent = input.interestPercent;
  loan.interestMode = input.interestMode;
  loan.startDate = input.startDate;
  loan.dueDate = input.dueDate;
  loan.note = input.note;
  settings.cashOnHand = applyPrincipalChange(settings.cashOnHand, previous, input.principal, loan.deductedFromCash);
  await loan.save();
  await settings.save();
  res.json(await snapshot());
}));

api.post("/loans/:id/pay", wrap(async (req, res) => {
  const loan = await loadLoan(req.params.id);
  if (loan.status === "pago") throw new HttpError(400, "Este empréstimo já foi recebido.");
  const settings = await getSettings();
  const view = presentLoan(loan, settings);
  settings.cashOnHand = applyPayCash(settings.cashOnHand, view.principal, view.gain, loan.deductedFromCash);
  loan.status = "pago";
  loan.paidAt = new Date();
  await loan.save();
  await settings.save();
  res.json(await snapshot());
}));

api.post("/loans/:id/reopen", wrap(async (req, res) => {
  const loan = await loadLoan(req.params.id);
  if (loan.status !== "pago") throw new HttpError(400, "Este empréstimo ainda está aberto.");
  const settings = await getSettings();
  const view = presentLoan(loan, settings);
  settings.cashOnHand = applyReopenCash(settings.cashOnHand, view.principal, view.gain, loan.deductedFromCash);
  loan.status = "aberto";
  loan.paidAt = null;
  await loan.save();
  await settings.save();
  res.json(await snapshot());
}));

api.delete("/loans/:id", wrap(async (req, res) => {
  const loan = await loadLoan(req.params.id);
  const settings = await getSettings();
  const view = presentLoan(loan, settings);
  settings.cashOnHand = applyDeleteCash(settings.cashOnHand, {
    status: loan.status,
    principal: view.principal,
    gain: view.gain,
    deductedFromCash: loan.deductedFromCash,
  });
  await loan.deleteOne();
  await settings.save();
  res.json(await snapshot());
}));

api.use((req, res) => {
  res.status(404).json({ error: "Não encontrado." });
});

api.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Erro interno. Tente de novo." : err.message });
});
