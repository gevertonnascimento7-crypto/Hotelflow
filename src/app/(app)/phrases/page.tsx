"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Check, Copy, Languages, Plus, Search, Trash, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, Card, Chips, EmptyState, IconButton, Input, LabeledTextarea, PageHeader, Select, Sheet } from "@/components/ui";
import { PHRASES, PHRASE_CATEGORIES, type Phrase, type PhraseCategory } from "@/content/phrases";
import { LOCALES, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { must, useAction } from "@/lib/hooks";
import { copyText, speak, stopSpeaking } from "@/lib/speech";
import { getSupabase } from "@/lib/supabase";
import type { CustomPhrase } from "@/lib/types";

type Cat = PhraseCategory | "custom" | "all";

function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export default function PhrasesPage() {
  const { t, locale } = useI18n();
  const { isManager } = useMember();
  const [from, setFrom] = useState<Locale>(locale);
  const [to, setTo] = useState<Locale>(LOCALES.find((l) => l !== locale && l !== "pt-BR") ?? "en");
  const [category, setCategory] = useState<Cat>("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const custom = useQuery({
    queryKey: ["phrases"],
    queryFn: async () => (await must(getSupabase().from("phrases").select("*").order("created_at", { ascending: false }))) as CustomPhrase[],
  });

  const all: (Phrase & { dbId?: string })[] = useMemo(
    () => [
      ...(custom.data ?? []).map((c) => ({ id: `db-${c.id}`, dbId: c.id, category: "custom" as const, text: { "pt-BR": c.text_pt, en: c.text_en, es: c.text_es } })),
      ...PHRASES,
    ],
    [custom.data],
  );

  const list = useMemo(() => {
    const q = normalize(search.trim());
    return all.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || normalize(p.text[from]).includes(q) || normalize(p.text[to]).includes(q)),
    );
  }, [all, category, search, from, to]);

  const categories: { value: Cat; label: string }[] = [
    { value: "all", label: t("common.all") },
    ...((custom.data ?? []).length ? [{ value: "custom" as Cat, label: t("phrases.categories.custom") }] : []),
    ...PHRASE_CATEGORIES.map((c) => ({ value: c as Cat, label: t(`phrases.categories.${c}`) })),
  ];

  return (
    <>
      <PageHeader
        title={t("phrases.title")}
        back="/"
        actions={
          isManager ? (
            <IconButton label={t("phrases.addPhrase")} onClick={() => setAdding(true)}>
              <Plus className="size-5" />
            </IconButton>
          ) : null
        }
      />

      <Card className="mb-3 flex items-end gap-2 p-3">
        <LangSelect label={t("phrases.from")} value={from} onChange={(v) => (v === to ? (setTo(from), setFrom(v)) : setFrom(v))} />
        <IconButton
          label={t("phrases.swapLanguages")}
          className="mb-0.5"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          <ArrowLeftRight className="size-5" />
        </IconButton>
        <LangSelect label={t("phrases.to")} value={to} onChange={(v) => (v === from ? (setFrom(to), setTo(v)) : setTo(v))} />
      </Card>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input type="search" placeholder={t("phrases.searchPlaceholder")} aria-label={t("common.search")} className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Chips value={category} onChange={setCategory} options={categories} className="mb-4" />

      {list.length === 0 ? (
        <EmptyState icon={<Languages />} title={t("phrases.noPhrases")} />
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <PhraseCard key={p.id} phrase={p} from={from} to={to} canDelete={isManager && Boolean(p.dbId)} />
          ))}
        </div>
      )}

      {adding ? <AddPhraseSheet onClose={() => setAdding(false)} /> : null}
    </>
  );
}

function LangSelect({ label, value, onChange }: { label: string; value: Locale; onChange: (l: Locale) => void }) {
  const { t } = useI18n();
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value as Locale)} className="h-10">
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(`languages.${l}`)}
          </option>
        ))}
      </Select>
    </label>
  );
}

function PhraseCard({ phrase, from, to, canDelete }: { phrase: Phrase & { dbId?: string }; from: Locale; to: Locale; canDelete: boolean }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { run } = useAction();
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const target = phrase.text[to];

  async function onCopy() {
    if (await copyText(target)) {
      setCopied(true);
      toast(t("common.copied"), "success");
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function onSpeak() {
    if (speaking) {
      stopSpeaking();
      return setSpeaking(false);
    }
    const ok = speak(target, to, () => setSpeaking(false));
    if (!ok) return toast(t("phrases.speechUnsupported"), "error");
    setSpeaking(true);
  }

  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{phrase.text[from]}</p>
      <p lang={to} className="mt-1 text-[17px] font-medium leading-snug">
        {target}
      </p>
      <div className="mt-3 flex items-center gap-1">
        <Button size="sm" variant="secondary" icon={<Volume2 className={cn("size-4", speaking && "animate-pulse text-accent")} />} onClick={onSpeak}>
          {speaking ? t("common.stop") : t("common.listen")}
        </Button>
        <Button size="sm" variant="ghost" icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={onCopy}>
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
        {canDelete ? (
          <IconButton
            label={t("common.delete")}
            className="ml-auto size-9 text-muted"
            onClick={() => window.confirm(t("common.deleteConfirm")) && run(() => must(getSupabase().from("phrases").delete().eq("id", phrase.dbId!)), { invalidate: [["phrases"]], push: false })}
          >
            <Trash className="size-4" />
          </IconButton>
        ) : null}
      </div>
    </Card>
  );
}

function AddPhraseSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [pt, setPt] = useState("");
  const [en, setEn] = useState("");
  const [es, setEs] = useState("");
  const valid = pt.trim() && en.trim() && es.trim();

  async function save() {
    if (!valid) return;
    const res = await run(() => must(getSupabase().from("phrases").insert({ text_pt: pt.trim(), text_en: en.trim(), text_es: es.trim() })), {
      success: "common.saved",
      invalidate: [["phrases"]],
      push: false,
    });
    if (res.ok) onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("phrases.addPhrase")}
      footer={
        <Button block size="lg" loading={pending} disabled={!valid} onClick={save}>
          {t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4">
        <LabeledTextarea label={t("phrases.textPt")} lang="pt-BR" rows={2} maxLength={400} value={pt} onChange={(e) => setPt(e.target.value)} />
        <LabeledTextarea label={t("phrases.textEn")} lang="en" rows={2} maxLength={400} value={en} onChange={(e) => setEn(e.target.value)} />
        <LabeledTextarea label={t("phrases.textEs")} lang="es" rows={2} maxLength={400} value={es} onChange={(e) => setEs(e.target.value)} />
      </div>
    </Sheet>
  );
}
