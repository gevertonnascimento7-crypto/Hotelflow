/** Resposta normalizada: quantas unidades de cada moeda valem 1 BRL. */
export interface RatesPayload {
  base: "BRL";
  rates: Record<string, number>;
  updatedAt: string;
  source: string;
}

export const CURRENCIES = ["BRL", "USD", "EUR", "GBP", "ARS", "CLP", "UYU", "PYG", "COP", "PEN", "MXN", "CAD", "AUD", "CHF", "JPY", "CNY"] as const;

/** Converte usando BRL como pivô. */
export function convert(amount: number, from: string, to: string, rates: Record<string, number>): number | null {
  const rf = from === "BRL" ? 1 : rates[from];
  const rt = to === "BRL" ? 1 : rates[to];
  if (!rf || !rt) return null;
  return (amount / rf) * rt;
}

const WANTED = new Set<string>(CURRENCIES);

type SourceRates = { rates: Record<string, number>; updatedAt: string; source: string };

/** AwesomeAPI /json/all → { USD: { code: "USD", codein: "BRL", bid: "5.40", timestamp: "..." }, ... } */
export function parseAwesome(data: unknown): SourceRates {
  const rates: Record<string, number> = {};
  let latest = 0;
  for (const q of Object.values((data ?? {}) as Record<string, { code?: string; codein?: string; bid?: string; timestamp?: string; create_date?: string }>)) {
    if (!q || q.codein !== "BRL" || !q.code || !WANTED.has(q.code)) continue;
    const bid = Number(q.bid);
    if (bid > 0) rates[q.code] = 1 / bid;
    const ts = Number(q.timestamp) * 1000 || Date.parse(q.create_date ?? "");
    if (ts > latest) latest = ts;
  }
  if (!rates.USD) throw new Error("awesomeapi: resposta sem USD");
  return { rates, updatedAt: new Date(latest || Date.now()).toISOString(), source: "AwesomeAPI" };
}

/** open.er-api.com/v6/latest/BRL → { result: "success", rates: { USD: 0.18, ... }, time_last_update_unix } */
export function parseOpenEr(data: unknown): SourceRates {
  const d = (data ?? {}) as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
  if (d.result !== "success" || !d.rates) throw new Error("open.er-api: resposta inválida");
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(d.rates)) if (WANTED.has(code) && code !== "BRL" && value > 0) rates[code] = value;
  return { rates, updatedAt: new Date((d.time_last_update_unix ?? Date.now() / 1000) * 1000).toISOString(), source: "ExchangeRate-API" };
}

/** api.frankfurter.app/latest?from=BRL → { date: "2026-11-17", rates: { USD: 0.18, ... } } */
export function parseFrankfurter(data: unknown): SourceRates {
  const d = (data ?? {}) as { date?: string; rates?: Record<string, number> };
  if (!d.rates) throw new Error("frankfurter: resposta inválida");
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(d.rates)) if (WANTED.has(code) && value > 0) rates[code] = value;
  return { rates, updatedAt: new Date(`${d.date ?? new Date().toISOString().slice(0, 10)}T16:00:00Z`).toISOString(), source: "Frankfurter (BCE)" };
}

/** Junta as fontes: a primeira dá cobertura, as seguintes sobrescrevem com dados mais recentes. */
export function mergeRates(parts: SourceRates[]): RatesPayload {
  return {
    base: "BRL",
    rates: Object.assign({}, ...parts.map((p) => p.rates)),
    updatedAt: parts[parts.length - 1].updatedAt,
    source: parts.map((p) => p.source).reverse().join(" + "),
  };
}
