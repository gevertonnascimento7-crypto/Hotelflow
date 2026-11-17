"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, IconButton, Input, PageHeader, SectionTitle, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { convert, CURRENCIES, type RatesPayload } from "@/lib/rates";

const CACHE_KEY = "hf-rates";
const POPULAR = ["USD", "EUR", "ARS", "GBP", "CLP", "UYU", "PYG", "CAD"];

function readCache(): RatesPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as RatesPayload) : null;
  } catch {
    return null;
  }
}

export default function ExchangePage() {
  const { t, locale } = useI18n();
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("BRL");

  const query = useQuery({
    queryKey: ["rates"],
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 1,
    queryFn: async () => {
      const res = await fetch("/api/rates");
      if (!res.ok) throw new Error("unavailable");
      const data = (await res.json()) as RatesPayload;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {
        /* sem cache local */
      }
      return data;
    },
  });

  const cached = useMemo(() => (query.data ? null : readCache()), [query.data]);
  const data = query.data ?? cached;

  const names = useMemo(() => {
    const dn = new Intl.DisplayNames([locale], { type: "currency" });
    return Object.fromEntries(CURRENCIES.map((c) => [c, dn.of(c) ?? c]));
  }, [locale]);

  const value = Number(amount.replace(/\s/g, "").replace(",", ".")) || 0;
  const result = data ? convert(value, from, to, data.rates) : null;
  const unit = data ? convert(1, from, to, data.rates) : null;
  const money = (n: number, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: n < 1 ? 4 : 2 }).format(n);
  const available = CURRENCIES.filter((c) => c === "BRL" || data?.rates[c]);

  return (
    <>
      <PageHeader
        title={t("exchange.title")}
        back="/"
        actions={
          <IconButton label={t("common.retry")} onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={cn("size-5", query.isFetching && "animate-spin")} />
          </IconButton>
        }
      />

      <Card className="p-4">
        <label htmlFor="amount" className="text-sm font-medium text-muted">
          {t("exchange.amount")}
        </label>
        <div className="mt-1.5 flex gap-2">
          <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))} className="h-12 flex-1 text-xl font-semibold tabular-nums" />
          <Select aria-label={t("exchange.from")} value={from} onChange={(e) => setFrom(e.target.value)} className="h-12 w-28 font-semibold">
            {available.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="my-2 flex justify-center">
          <IconButton
            label={t("exchange.swap")}
            className="bg-subtle"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            <ArrowUpDown className="size-5" />
          </IconButton>
        </div>
        <div className="flex items-center gap-2">
          <output aria-live="polite" className="flex h-12 flex-1 items-center truncate rounded-xl bg-subtle px-3.5 text-xl font-semibold tabular-nums">
            {result !== null ? money(result, to) : "—"}
          </output>
          <Select aria-label={t("exchange.to")} value={to} onChange={(e) => setTo(e.target.value)} className="h-12 w-28 font-semibold">
            {available.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <p className="mt-3 text-sm text-muted">
          {names[from]} → {names[to]}
        </p>
        {unit !== null ? (
          <p className="mt-0.5 text-sm font-medium">
            {t("exchange.rateLine", { from, to, value: new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(unit) })}
          </p>
        ) : null}
      </Card>

      {!data && query.isError ? <p className="mt-4 px-1 text-sm text-red-600">{t("exchange.unavailable")}</p> : null}
      {cached && !query.data && query.isError ? <p className="mt-3 px-1 text-sm text-amber-600">{t("exchange.cached")}</p> : null}

      {data ? (
        <>
          <SectionTitle>{t("exchange.popular")}</SectionTitle>
          <Card className="divide-y divide-border">
            {POPULAR.filter((c) => c !== to && data.rates[c]).map((c) => {
              const v = convert(1, c, to, data.rates);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFrom(c)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="w-12 font-semibold">{c}</span>
                  <span className="flex-1 truncate text-sm text-muted">{names[c]}</span>
                  <span className="font-medium tabular-nums">{v !== null ? money(v, to) : "—"}</span>
                </button>
              );
            })}
          </Card>
          <p className="mt-3 px-1 text-xs text-muted">
            {t("exchange.updated", { time: formatRelative(data.updatedAt, locale) })} · {t("exchange.source", { source: data.source })}
          </p>
          <p className="mt-1 px-1 text-xs text-muted">{t("exchange.disclaimer")}</p>
        </>
      ) : null}
    </>
  );
}
