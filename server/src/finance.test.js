import test from "node:test";
import assert from "node:assert/strict";
import {
  alertLevel,
  applyCreateCash,
  applyDeleteCash,
  applyPayCash,
  applyReopenCash,
  buildView,
  calcGain,
  calcLateFee,
  daysLate,
  monthCount,
} from "./finance.js";

const today = new Date(2026, 9, 16, 12, 0, 0);
const settings = { yellowDays: 7, redDays: 2, cashOnHand: 1000, defaultInterestPercent: 10, interestMode: "mensal" };

function day(offset) {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return date;
}

test("juros fixos incidem uma vez sobre o valor", () => {
  assert.equal(calcGain(1000, 10, "fixo", day(0), day(90)), 100);
});

test("juros ao mês usam blocos de 30 dias, com mês cheio", () => {
  assert.equal(monthCount(day(0), day(0)), 1);
  assert.equal(monthCount(day(0), day(30)), 1);
  assert.equal(monthCount(day(0), day(31)), 2);
  assert.equal(calcGain(1000, 10, "mensal", day(0), day(31)), 200);
});

test("alerta fica vermelho no limite, amarelo antes e verde depois", () => {
  assert.equal(alertLevel(day(8), "aberto", settings, today), "verde");
  assert.equal(alertLevel(day(7), "aberto", settings, today), "amarelo");
  assert.equal(alertLevel(day(3), "aberto", settings, today), "amarelo");
  assert.equal(alertLevel(day(2), "aberto", settings, today), "vermelho");
  assert.equal(alertLevel(day(0), "aberto", settings, today), "vermelho");
  assert.equal(alertLevel(day(-4), "aberto", settings, today), "vermelho");
  assert.equal(alertLevel(day(-4), "pago", settings, today), "pago");
});

test("o caixa desconta na saída e volta com principal e juros no recebimento", () => {
  const afterCreate = applyCreateCash(1000, 200, true);
  assert.equal(afterCreate, 800);
  const afterPay = applyPayCash(afterCreate, 200, 40, true);
  assert.equal(afterPay, 1040);
  assert.equal(applyReopenCash(afterPay, 200, 40, true), 800);
  assert.equal(applyDeleteCash(afterPay, { status: "pago", principal: 200, gain: 40, deductedFromCash: true }), 1000);
  assert.equal(applyDeleteCash(afterCreate, { status: "aberto", principal: 200, gain: 40, deductedFromCash: true }), 1000);
});

test("lançamento sem descontar o caixa só soma o lucro quando recebe", () => {
  assert.equal(applyCreateCash(1000, 200, false), 1000);
  assert.equal(applyPayCash(1000, 200, 40, false), 1040);
  assert.equal(applyDeleteCash(1040, { status: "pago", principal: 200, gain: 40, deductedFromCash: false }), 1000);
});

test("juros de atraso só começam no dia seguinte ao vencimento", () => {
  assert.equal(daysLate(day(0), today), 0);
  assert.equal(daysLate(day(-1), today), 1);
  assert.equal(daysLate(day(-3), today), 3);
  assert.equal(calcLateFee(50, day(0), today), 0);
  assert.equal(calcLateFee(50, day(-3), today), 150);
  assert.equal(calcGain(1000, 10, "fixo", day(-10), day(-3), 50, today), 250);
});

test("empréstimo pago congela o atraso no dia do recebimento", () => {
  const view = buildView(
    [
      {
        _id: "b",
        clientName: "Bia",
        principal: 1000,
        interestPercent: 10,
        interestMode: "fixo",
        lateFeePerDay: 50,
        startDate: day(-10),
        dueDate: day(-4),
        deductedFromCash: true,
        status: "pago",
        paidAt: day(-2),
        note: "",
      },
    ],
    { ...settings, cashOnHand: 1100 },
    today,
  );

  assert.equal(view.loans[0].daysLate, 2);
  assert.equal(view.loans[0].lateGain, 100);
  assert.equal(view.loans[0].gain, 200);
  assert.equal(view.summary.realizedProfit, 200);
});

test("o valor total junta o caixa com o que ainda vai entrar", () => {
  const view = buildView(
    [
      {
        _id: "a",
        clientName: "Ana",
        principal: 200,
        interestPercent: 10,
        interestMode: "fixo",
        startDate: day(-10),
        dueDate: day(1),
        deductedFromCash: true,
        status: "aberto",
        note: "",
      },
    ],
    { ...settings, cashOnHand: 800 },
    today,
  );

  assert.equal(view.summary.cashOnHand, 800);
  assert.equal(view.summary.lent, 200);
  assert.equal(view.summary.expectedProfit, 20);
  assert.equal(view.summary.toReceive, 220);
  assert.equal(view.summary.netWorth, 1020);
  assert.equal(view.loans[0].level, "vermelho");
});
