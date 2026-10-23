export function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function percent(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export function dateBR(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR");
}

export function toInputDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftInputDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toInputDate(date);
}

export function parseAmount(text) {
  const cleaned = String(text ?? "").trim().replace(/\s/g, "").replace("R$", "");
  if (!cleaned) return NaN;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  if (cleaned.includes(",")) return Number(cleaned.replace(",", "."));
  return Number(cleaned);
}

export function formula(loan) {
  const base = `${money(loan.principal)} × ${percent(loan.interestPercent)}`;
  if (loan.interestMode === "mensal") {
    const months = loan.months || 1;
    return `${base} × ${months} ${months === 1 ? "mês" : "meses"}`;
  }
  return `${base} fixo`;
}

export function modeLabel(mode) {
  return mode === "fixo" ? "Fixo sobre o valor" : "Ao mês";
}
