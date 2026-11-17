"use client";

import { CircleCheck, GraduationCap, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Avatar, Button, Card, IconButton, LabeledInput, LabeledTextarea, PageHeader, SectionTitle, Sheet } from "@/components/ui";
import { TRAINING_MODULES } from "@/content/training";
import { must, useAction, useMembers } from "@/lib/hooks";
import { getSupabase } from "@/lib/supabase";
import { routeKey, useCustomModules, useProgress } from "./data";

export default function TrainingPage() {
  const { t, locale } = useI18n();
  const { userId, isManager } = useMember();
  const { members } = useMembers();
  const custom = useCustomModules();
  const progress = useProgress();
  const [adding, setAdding] = useState(false);

  const mine = new Set((progress.data ?? []).filter((p) => p.user_id === userId).map((p) => p.module_key));
  const allKeys = [...TRAINING_MODULES.map((m) => m.key), ...(custom.data ?? []).map((m) => `custom:${m.id}`)];
  const done = allKeys.filter((k) => mine.has(k)).length;

  const row = (key: string, title: string, subtitle: string) => (
    <Link key={key} href={`/training/${routeKey(key)}`} className="block">
      <Card className="flex items-center gap-3 p-4 transition active:scale-[.99]">
        <span className={mine.has(key) ? "text-accent" : "text-border"}>
          <CircleCheck className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          <p className="truncate text-sm text-muted">{subtitle}</p>
        </div>
        <span className="text-sm font-medium text-accent">{mine.has(key) ? t("training.review") : t("training.start")}</span>
      </Card>
    </Link>
  );

  return (
    <>
      <PageHeader
        title={t("training.title")}
        back="/"
        actions={
          isManager ? (
            <IconButton label={t("training.newModule")} onClick={() => setAdding(true)}>
              <Plus className="size-5" />
            </IconButton>
          ) : null
        }
      />
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <GraduationCap className="size-6" />
          </span>
          <p className="text-lg font-semibold">{t("training.progress", { done, total: allKeys.length })}</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-subtle">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${allKeys.length ? (done / allKeys.length) * 100 : 0}%` }} />
        </div>
      </Card>

      <SectionTitle>{t("training.essentials")}</SectionTitle>
      <div className="space-y-2">
        {TRAINING_MODULES.map((m) => row(m.key, m.content[locale].title, `${t("training.minutes", { n: m.minutes })} · ${m.content[locale].summary}`))}
      </div>

      <SectionTitle>{t("training.custom")}</SectionTitle>
      {(custom.data ?? []).length === 0 ? (
        <p className="px-1 text-sm text-muted">{t("training.noCustom")}</p>
      ) : (
        <div className="space-y-2">{(custom.data ?? []).map((m) => row(`custom:${m.id}`, m.title, m.summary ?? ""))}</div>
      )}

      {isManager ? (
        <>
          <SectionTitle>{t("training.teamProgress")}</SectionTitle>
          <Card className="divide-y divide-border">
            {members.map((m) => {
              const count = allKeys.filter((k) => (progress.data ?? []).some((p) => p.user_id === m.id && p.module_key === k)).length;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={m.full_name} className="size-8 text-xs" />
                  <span className="flex-1 truncate text-sm font-medium">{m.full_name || "—"}</span>
                  <span className="text-sm tabular-nums text-muted">
                    {count}/{allKeys.length}
                  </span>
                </div>
              );
            })}
          </Card>
        </>
      ) : null}

      {adding ? <NewModuleSheet onClose={() => setAdding(false)} /> : null}
    </>
  );
}

function NewModuleSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const valid = title.trim().length >= 2 && content.trim().length > 0;

  async function save() {
    if (!valid) return;
    const res = await run(
      () => must(getSupabase().from("training_modules").insert({ title: title.trim(), summary: summary.trim() || null, content: content.trim() })),
      { success: "common.saved", invalidate: [["training"]], push: false },
    );
    if (res.ok) onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("training.newModule")}
      footer={
        <Button block size="lg" loading={pending} disabled={!valid} onClick={save}>
          {t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4">
        <LabeledInput label={t("training.moduleTitle")} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <LabeledInput label={`${t("training.summary")} (${t("common.optional")})`} maxLength={300} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <LabeledTextarea label={t("training.content")} hint={t("training.contentHint")} rows={10} maxLength={8000} value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
    </Sheet>
  );
}
