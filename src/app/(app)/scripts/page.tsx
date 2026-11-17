"use client";

import { ChevronRight, MessageSquareText, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button, Card, IconButton, LabeledInput, LabeledTextarea, PageHeader, SectionTitle, Sheet } from "@/components/ui";
import { parseCustomSteps, SERVICE_SCRIPTS } from "@/content/scripts";
import { must, useAction } from "@/lib/hooks";
import { getSupabase } from "@/lib/supabase";
import { useCustomScripts } from "./data";

export default function ScriptsPage() {
  const { t, locale } = useI18n();
  const { isManager } = useMember();
  const custom = useCustomScripts();
  const [adding, setAdding] = useState(false);

  const row = (href: string, title: string, subtitle: string) => (
    <Link key={href} href={href} className="block">
      <Card className="flex items-center gap-3 p-4 transition active:scale-[.99]">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <MessageSquareText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          <p className="truncate text-sm text-muted">{subtitle}</p>
        </div>
        <ChevronRight className="size-5 text-muted" />
      </Card>
    </Link>
  );

  return (
    <>
      <PageHeader
        title={t("scripts.title")}
        back="/"
        actions={
          isManager ? (
            <IconButton label={t("scripts.newScript")} onClick={() => setAdding(true)}>
              <Plus className="size-5" />
            </IconButton>
          ) : null
        }
      />
      <SectionTitle>{t("scripts.essentials")}</SectionTitle>
      <div className="space-y-2">{SERVICE_SCRIPTS.map((s) => row(`/scripts/${s.key}`, s.title[locale], s.situation[locale]))}</div>
      <SectionTitle>{t("scripts.custom")}</SectionTitle>
      {(custom.data ?? []).length === 0 ? (
        <p className="px-1 text-sm text-muted">{t("scripts.noCustom")}</p>
      ) : (
        <div className="space-y-2">
          {(custom.data ?? []).map((s) => row(`/scripts/custom-${s.id}`, s.title, `${t("scripts.steps")}: ${s.steps.length}`))}
        </div>
      )}
      {adding ? <NewScriptSheet onClose={() => setAdding(false)} /> : null}
    </>
  );
}

function NewScriptSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const steps = parseCustomSteps(text);
  const valid = title.trim().length >= 2 && steps.length > 0;

  async function save() {
    if (!valid) return;
    const res = await run(() => must(getSupabase().from("service_scripts").insert({ title: title.trim(), steps: steps.slice(0, 30) })), {
      success: "common.saved",
      invalidate: [["scripts"]],
      push: false,
    });
    if (res.ok) onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("scripts.newScript")}
      footer={
        <Button block size="lg" loading={pending} disabled={!valid} onClick={save}>
          {t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4">
        <LabeledInput label={t("scripts.scriptTitle")} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <LabeledTextarea label={t("scripts.steps")} hint={t("scripts.stepsHint")} rows={8} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
    </Sheet>
  );
}
