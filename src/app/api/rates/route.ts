import { NextResponse } from "next/server";
import { mergeRates, parseAwesome, parseFrankfurter, parseOpenEr } from "@/lib/rates";

const TIMEOUT = 6000;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { accept: "application/json", "user-agent": "HotelFlow/1.0" },
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/**
 * Cotações reais com BRL como base:
 * 1) AwesomeAPI — cotação comercial em tempo real frente ao real;
 * 2) ExchangeRate-API — cobertura ampla (atualização diária);
 * 3) Frankfurter (Banco Central Europeu) — reserva final.
 */
export async function GET() {
  const [live, broad] = await Promise.allSettled([
    getJson("https://economia.awesomeapi.com.br/json/all").then(parseAwesome),
    getJson("https://open.er-api.com/v6/latest/BRL").then(parseOpenEr),
  ]);
  const parts = [broad, live].flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (!parts.length) {
    try {
      parts.push(parseFrankfurter(await getJson("https://api.frankfurter.app/latest?from=BRL")));
    } catch {
      return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
  }
  return NextResponse.json(mergeRates(parts), {
    headers: { "cache-control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600" },
  });
}
