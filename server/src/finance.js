export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100)) / 100;
}

export function asDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  return new Date(value);
}

export function startOfDay(value) {
  const date = asDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function daysUntil(dueDate, today = new Date()) {
  const ms = startOfDay(dueDate) - startOfDay(today);
  return Math.round(ms / 86400000);
}

export function monthCount(startDate, dueDate) {
  const days = Math.max(0, daysUntil(dueDate, startDate));
  if (days === 0) return 1;
  return Math.max(1, Math.ceil(days / 30));
}

export function daysLate(dueDate, asOf = new Date()) {
  return Math.max(0, -daysUntil(dueDate, asOf));
}

export function calcAgreedGain(principal, interestPercent, interestMode, startDate, dueDate) {
  const base = roundMoney(principal) * (Number(interestPercent) / 100);
  if (interestMode === "fixo") return roundMoney(base);
  return roundMoney(base * monthCount(startDate, dueDate));
}

export function calcLateFee(lateFeePerDay, dueDate, asOf = new Date()) {
  const daily = roundMoney(lateFeePerDay);
  if (daily <= 0) return 0;
  return roundMoney(daily * daysLate(dueDate, asOf));
}

export function calcGain(principal, interestPercent, interestMode, startDate, dueDate, lateFeePerDay = 0, asOf = new Date()) {
  return roundMoney(
    calcAgreedGain(principal, interestPercent, interestMode, startDate, dueDate) +
      calcLateFee(lateFeePerDay, dueDate, asOf),
  );
}

export function alertLevel(dueDate, status, settings, today = new Date()) {
  if (status === "pago") return "pago";
  const days = daysUntil(dueDate, today);
  if (days <= settings.redDays) return "vermelho";
  if (days <= settings.yellowDays) return "amarelo";
  return "verde";
}

export function dueLabel(days, status) {
  if (status === "pago") return "Pago";
  if (days > 1) return `Vence em ${days} dias`;
  if (days === 1) return "Vence amanhã";
  if (days === 0) return "Vence hoje";
  if (days === -1) return "1 dia de atraso";
  return `${Math.abs(days)} dias de atraso`;
}

export function describeLoan(input, today = new Date()) {
  const principal = Number(input.principal);
  const interestPercent = Number(input.interestPercent);
  const lateFeePerDay = Number(input.lateFeePerDay);
  const start = asDate(input.startDate);
  const due = asDate(input.dueDate);
  const datesOk = !Number.isNaN(start.getTime()) && !Number.isNaN(due.getTime()) && startOfDay(due) >= startOfDay(start);
  const numbersOk = Number.isFinite(principal) && principal > 0 && Number.isFinite(interestPercent) && interestPercent >= 0;
  const lateOk = !Number.isFinite(lateFeePerDay) || lateFeePerDay >= 0;
  if (!datesOk || !numbersOk || !lateOk) {
    return { months: 0, agreedGain: 0, lateGain: 0, daysLate: 0, gain: 0, total: 0, valid: false };
  }
  const late = Number.isFinite(lateFeePerDay) ? lateFeePerDay : 0;
  const months = input.interestMode === "mensal" ? monthCount(start, due) : null;
  const agreedGain = calcAgreedGain(principal, interestPercent, input.interestMode, start, due);
  const lateDays = daysLate(due, today);
  const lateGain = calcLateFee(late, due, today);
  const gain = roundMoney(agreedGain + lateGain);
  return { months, agreedGain, lateGain, daysLate: lateDays, lateFeePerDay: late, gain, total: roundMoney(principal + gain), valid: true };
}

export function applyCreateCash(cash, principal, deducted) {
  return deducted ? roundMoney(cash - principal) : roundMoney(cash);
}

export function applyPayCash(cash, principal, gain, deducted) {
  const back = deducted ? roundMoney(principal + gain) : gain;
  return roundMoney(cash + back);
}

export function applyReopenCash(cash, principal, gain, deducted) {
  const back = deducted ? roundMoney(principal + gain) : gain;
  return roundMoney(cash - back);
}

export function applyDeleteCash(cash, loan) {
  if (loan.status === "aberto") {
    return loan.deductedFromCash ? roundMoney(cash + loan.principal) : roundMoney(cash);
  }
  return roundMoney(cash - loan.gain);
}

export function applyPrincipalChange(cash, oldPrincipal, newPrincipal, deducted) {
  if (!deducted) return roundMoney(cash);
  return roundMoney(cash - (newPrincipal - oldPrincipal));
}

export function presentLoan(loan, settings, today = new Date()) {
  const principal = roundMoney(loan.principal);
  const lateFeePerDay = roundMoney(loan.lateFeePerDay || 0);
  const asOf = loan.status === "pago" && loan.paidAt ? loan.paidAt : today;
  const agreedGain = calcAgreedGain(principal, loan.interestPercent, loan.interestMode, loan.startDate, loan.dueDate);
  const lateDays = daysLate(loan.dueDate, asOf);
  const lateGain = calcLateFee(lateFeePerDay, loan.dueDate, asOf);
  const gain = roundMoney(agreedGain + lateGain);
  const days = daysUntil(loan.dueDate, today);
  const level = alertLevel(loan.dueDate, loan.status, settings, today);
  return {
    id: loan._id?.toString?.() || loan.id,
    clientName: loan.clientName,
    principal,
    interestPercent: loan.interestPercent,
    interestMode: loan.interestMode,
    lateFeePerDay,
    startDate: loan.startDate,
    dueDate: loan.dueDate,
    note: loan.note || "",
    deductedFromCash: Boolean(loan.deductedFromCash),
    status: loan.status,
    paidAt: loan.paidAt || null,
    months: loan.interestMode === "mensal" ? monthCount(loan.startDate, loan.dueDate) : null,
    agreedGain,
    daysLate: lateDays,
    lateGain,
    gain,
    total: roundMoney(principal + gain),
    daysUntil: days,
    level,
    dueLabel: dueLabel(days, loan.status),
  };
}

function sum(list, key) {
  return roundMoney(list.reduce((acc, item) => acc + item[key], 0));
}

const LEVEL_RANK = { vermelho: 0, amarelo: 1, verde: 2, pago: 3 };

export function buildView(loans, settings, today = new Date()) {
  const presented = loans.map((loan) => presentLoan(loan, settings, today));
  const open = presented.filter((loan) => loan.status === "aberto");
  const paid = presented.filter((loan) => loan.status === "pago");
  const cashOnHand = roundMoney(settings.cashOnHand);
  const toReceive = sum(open, "total");

  open.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.daysUntil - b.daysUntil);
  paid.sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));

  return {
    settings: {
      cashOnHand,
      defaultInterestPercent: settings.defaultInterestPercent,
      defaultLateFeePerDay: roundMoney(settings.defaultLateFeePerDay || 0),
      interestMode: settings.interestMode,
      yellowDays: settings.yellowDays,
      redDays: settings.redDays,
    },
    summary: {
      cashOnHand,
      lent: sum(open, "principal"),
      expectedProfit: sum(open, "gain"),
      realizedProfit: sum(paid, "gain"),
      toReceive,
      netWorth: roundMoney(cashOnHand + toReceive),
      counts: {
        aberto: open.length,
        pago: paid.length,
        verde: open.filter((loan) => loan.level === "verde").length,
        amarelo: open.filter((loan) => loan.level === "amarelo").length,
        vermelho: open.filter((loan) => loan.level === "vermelho").length,
      },
    },
    loans: [...open, ...paid],
  };
}
