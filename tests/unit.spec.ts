import { expect, test } from "@playwright/test";
import { PHRASES } from "../src/content/phrases";
import { SERVICE_SCRIPTS } from "../src/content/scripts";
import { TRAINING_MODULES } from "../src/content/training";
import { LOCALES } from "../src/i18n/config";
import { en } from "../src/i18n/messages/en";
import { es } from "../src/i18n/messages/es";
import { ptBR } from "../src/i18n/messages/pt-BR";
import { translate } from "../src/i18n/translate";
import { formatMinutes } from "../src/lib/format";
import { renderNotification } from "../src/lib/notification-text";
import { convert, mergeRates, parseAwesome, parseFrankfurter, parseOpenEr } from "../src/lib/rates";

function flatten(obj: object, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flatten(v as object, key));
  }
  return out;
}

test.describe("idiomas", () => {
  test("somente pt-BR, en e es; pt-BR é o padrão", async () => {
    expect([...LOCALES]).toEqual(["pt-BR", "en", "es"]);
    expect(translate("pt-BR", "nav.home")).toBe("Início");
  });

  test("os três dicionários têm exatamente as mesmas chaves e nenhum texto vazio", async () => {
    const base = flatten(ptBR);
    for (const dict of [en, es]) {
      const flat = flatten(dict);
      expect(Object.keys(flat).sort()).toEqual(Object.keys(base).sort());
      for (const [k, v] of Object.entries(flat)) expect(v.trim(), k).not.toBe("");
    }
  });

  test("placeholders {var} preservados em todas as traduções", async () => {
    const base = flatten(ptBR);
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const dict of [flatten(en), flatten(es)]) {
      for (const [k, v] of Object.entries(base)) expect(vars(dict[k]), k).toBe(vars(v));
    }
  });

  test("menus, botões e mensagens realmente traduzidos", async () => {
    expect(translate("en", "nav.settings")).toBe("Settings");
    expect(translate("es", "nav.home")).toBe("Inicio");
    expect(translate("en", "common.save")).toBe("Save");
    expect(translate("es", "common.save")).toBe("Guardar");
    expect(translate("en", "errors.forbidden")).toContain("permission");
  });

  test("frases prontas existem apenas em português, inglês e espanhol", async () => {
    expect(PHRASES.length).toBeGreaterThan(40);
    for (const p of PHRASES) {
      expect(Object.keys(p.text).sort()).toEqual(["en", "es", "pt-BR"]);
      for (const v of Object.values(p.text)) expect(v.trim().length).toBeGreaterThan(0);
    }
    const all = JSON.stringify([PHRASES, TRAINING_MODULES, SERVICE_SCRIPTS]);
    for (const removed of ['"fr"', '"it"', '"de"', "fr-FR", "it-IT", "de-DE"]) expect(all).not.toContain(removed);
  });

  test("treinamentos e roteiros completos nos três idiomas", async () => {
    for (const m of TRAINING_MODULES) {
      for (const l of LOCALES) {
        expect(m.content[l].sections.length).toBeGreaterThan(0);
        for (const q of m.content[l].quiz) expect(q.answer).toBeLessThan(q.options.length);
      }
      expect(m.content.en.quiz.map((q) => q.answer)).toEqual(m.content["pt-BR"].quiz.map((q) => q.answer));
    }
    for (const s of SERVICE_SCRIPTS) for (const step of s.steps) for (const l of LOCALES) expect(step.instruction[l]).toBeTruthy();
  });

  test("notificações traduzidas no idioma do destinatário", async () => {
    const data = { actor: "Ana", date: "2026-11-20", code: 42, title: "Chuveiro", location: "204", status: "resolved" };
    expect(renderNotification("pt-BR", "swap_requested", data).title).toBe("Pedido de troca de turno");
    expect(renderNotification("en", "swap_requested", data).title).toBe("Shift swap request");
    expect(renderNotification("es", "swap_requested", data).title).toBe("Solicitud de cambio de turno");
    expect(renderNotification("en", "ticket_status", data).title).toBe("Ticket #42: Resolved");
    expect(renderNotification("es", "ticket_status", data).title).toBe("Ticket #42: Resuelto");
    expect(renderNotification("pt-BR", "hours_logged", { actor: "Ana", minutes: 90, date: "2026-11-20" }).body).toContain("+1h30");
    expect(renderNotification("en", "unknown_type", {}).title).toBe("New alert");
  });

  test("formatação do banco de horas", async () => {
    expect(formatMinutes(150)).toBe("+2h30");
    expect(formatMinutes(-60)).toBe("−1h");
    expect(formatMinutes(0)).toBe("0h");
  });
});

test.describe("câmbio", () => {
  // Amostras no formato oficial de cada API
  const awesome = {
    USD: { code: "USD", codein: "BRL", bid: "5.40", timestamp: "1794960000" },
    EUR: { code: "EUR", codein: "BRL", bid: "6.00", timestamp: "1794960000" },
    BTC: { code: "BTC", codein: "BRL", bid: "500000", timestamp: "1794960000" },
  };
  const openEr = { result: "success", time_last_update_unix: 1794900000, rates: { BRL: 1, USD: 0.19, EUR: 0.17, ARS: 190, CLP: 170, XYZ: 1 } };
  const frank = { date: "2026-11-17", rates: { USD: 0.185, EUR: 0.166 } };

  test("interpreta as três fontes", async () => {
    const a = parseAwesome(awesome);
    expect(a.rates.USD).toBeCloseTo(1 / 5.4, 6);
    expect(a.rates.BTC).toBeUndefined();
    const o = parseOpenEr(openEr);
    expect(o.rates.ARS).toBe(190);
    expect(o.rates.XYZ).toBeUndefined();
    expect(parseFrankfurter(frank).rates.USD).toBe(0.185);
    expect(() => parseAwesome({})).toThrow();
    expect(() => parseOpenEr({ result: "error" })).toThrow();
  });

  test("cotação em tempo real sobrescreve a diária e mantém a cobertura", async () => {
    const merged = mergeRates([parseOpenEr(openEr), parseAwesome(awesome)]);
    expect(merged.rates.USD).toBeCloseTo(1 / 5.4, 6);
    expect(merged.rates.ARS).toBe(190);
    expect(merged.source).toBe("AwesomeAPI + ExchangeRate-API");
  });

  test("conversão entre moedas com BRL como pivô", async () => {
    const rates = { USD: 0.2, EUR: 0.16 };
    expect(convert(100, "USD", "BRL", rates)).toBeCloseTo(500);
    expect(convert(500, "BRL", "USD", rates)).toBeCloseTo(100);
    expect(convert(100, "USD", "EUR", rates)).toBeCloseTo(80);
    expect(convert(1, "USD", "JPY", rates)).toBeNull();
  });
});
