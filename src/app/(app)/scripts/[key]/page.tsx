"use client";

import { Check, Copy, Trash, Volume2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Card, IconButton, LoadingList, PageHeader, Segmented } from "@/components/ui";
import { SERVICE_SCRIPTS } from "@/content/scripts";
import { LOCALES, SHORT_LANGUAGE_LABELS, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { must, useAction } from "@/lib/hooks";
import { copyText, speak, stopSpeaking } from "@/lib/speech";
import { getSupabase } from "@/lib/supabase";
import { useCustomScripts } from "../data";

export default function ScriptPage() {
  const { key } = useParams<{ key: string }>();
  const { t, locale } = useI18n();
  const { isManager } = useMember();
  const router = useRouter();
  const { run } = useAction();
  const custom = useCustomScripts();
  const [guest, setGuest] = useState<Locale>(LOCALES.find((l) => l !== locale) ?? "en");

  const builtIn = SERVICE_SCRIPTS.find((s) => s.key === key);
  const row = key.startsWith("custom-") ? custom.data?.find((s) => s.id === key.slice(7)) : undefined;

  if (!builtIn && !row) {
    return (
      <>
        <PageHeader title={t("scripts.title")} back="/scripts" />
        {custom.isLoading ? <LoadingList rows={3} /> : <p className="text-muted">{t("errors.not_found")}</p>}
      </>
    );
  }

  const steps = builtIn
    ? builtIn.steps.map((s) => ({ instruction: s.instruction[locale], say: s.say?.[guest], sayLocale: guest }))
    : row!.steps.map((s) => ({ instruction: s.instruction, say: s.say, sayLocale: locale }));

  return (
    <>
      <PageHeader
        title={builtIn ? builtIn.title[locale] : row!.title}
        subtitle={builtIn?.situation[locale]}
        back="/scripts"
        actions={
          row && isManager ? (
            <IconButton
              label={t("common.delete")}
              className="text-muted"
              onClick={async () => {
                if (!window.confirm(t("common.deleteConfirm"))) return;
                const res = await run(() => must(getSupabase().from("service_scripts").delete().eq("id", row.id)), { invalidate: [["scripts"]], push: false });
                if (res.ok) router.replace("/scripts");
              }}
            >
              <Trash className="size-5" />
            </IconButton>
          ) : null
        }
      />
      {builtIn ? (
        <div className="mb-4">
          <p className="mb-1.5 px-1 text-xs font-medium text-muted">{t("scripts.guestLanguage")}</p>
          <Segmented value={guest} onChange={setGuest} options={LOCALES.map((l) => ({ value: l, label: `${SHORT_LANGUAGE_LABELS[l]} · ${t(`languages.${l}`)}` }))} size="sm" />
        </div>
      ) : null}
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i}>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("scripts.step", { n: i + 1 })}</p>
              <p className="mt-1 text-[15px] font-medium">{s.instruction}</p>
              {s.say ? <SayBox text={s.say} locale={s.sayLocale} /> : null}
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}

function SayBox({ text, locale }: { text: string; locale: Locale }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-xl bg-accent/5 p-3 ring-1 ring-accent/15">
      <p className="text-xs font-medium text-accent">{t("scripts.say")}</p>
      <p lang={locale} className="mt-0.5 text-[16px] leading-snug">
        “{text}”
      </p>
      <div className="mt-2 flex gap-1">
        <IconButton
          label={t("common.listen")}
          className="size-9"
          onClick={() => {
            if (speaking) {
              stopSpeaking();
              return setSpeaking(false);
            }
            if (!speak(text, locale, () => setSpeaking(false))) return toast(t("phrases.speechUnsupported"), "error");
            setSpeaking(true);
          }}
        >
          <Volume2 className={cn("size-4", speaking && "animate-pulse text-accent")} />
        </IconButton>
        <IconButton
          label={t("common.copy")}
          className="size-9"
          onClick={async () => {
            if (await copyText(text)) {
              setCopied(true);
              toast(t("common.copied"), "success");
              setTimeout(() => setCopied(false), 1500);
            }
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </IconButton>
      </div>
    </div>
  );
}
