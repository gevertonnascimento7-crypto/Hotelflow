"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Badge, Button, Card, IconButton, LoadingList, PageHeader, SectionTitle } from "@/components/ui";
import { parseCustomContent, TRAINING_MODULES, type QuizQuestion } from "@/content/training";
import { cn } from "@/lib/cn";
import { must, useAction } from "@/lib/hooks";
import { getSupabase } from "@/lib/supabase";
import { moduleKeyFromRoute, useCustomModules, useProgress } from "../data";

export default function TrainingModulePage() {
  const { key } = useParams<{ key: string }>();
  const { t, locale } = useI18n();
  const { userId, isManager } = useMember();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { run, pending } = useAction();
  const custom = useCustomModules();
  const progress = useProgress();

  const moduleKey = moduleKeyFromRoute(decodeURIComponent(key));
  const builtIn = TRAINING_MODULES.find((m) => m.key === moduleKey);
  const row = moduleKey.startsWith("custom:") ? custom.data?.find((m) => `custom:${m.id}` === moduleKey) : undefined;
  const completed = (progress.data ?? []).some((p) => p.user_id === userId && p.module_key === moduleKey);

  if (!builtIn && !row) {
    return (
      <>
        <PageHeader title={t("training.title")} back="/training" />
        {custom.isLoading ? <LoadingList rows={3} /> : <p className="text-muted">{t("errors.not_found")}</p>}
      </>
    );
  }

  const content = builtIn ? builtIn.content[locale] : null;
  const title = content?.title ?? row!.title;
  const sections = content?.sections ?? parseCustomContent(row!.content);

  async function markDone(score: number) {
    await run(() => must(getSupabase().from("training_progress").upsert({ module_key: moduleKey, score }, { onConflict: "user_id,module_key" })), {
      invalidate: [["training"]],
      push: false,
    });
    queryClient.invalidateQueries({ queryKey: ["training"] });
  }

  return (
    <>
      <PageHeader
        title={title}
        subtitle={builtIn ? t("training.minutes", { n: builtIn.minutes }) : row?.summary ?? undefined}
        back="/training"
        actions={
          row && isManager ? (
            <IconButton
              label={t("common.delete")}
              className="text-muted"
              onClick={async () => {
                if (!window.confirm(t("common.deleteConfirm"))) return;
                const res = await run(() => must(getSupabase().from("training_modules").delete().eq("id", row.id)), { invalidate: [["training"]], push: false });
                if (res.ok) router.replace("/training");
              }}
            >
              <Trash className="size-5" />
            </IconButton>
          ) : null
        }
      />
      {completed ? (
        <Badge tone="success" className="mb-3">
          <CircleCheck className="size-3.5" /> {t("training.completed")}
        </Badge>
      ) : null}
      {content?.summary ? <p className="mb-4 text-[15px] text-muted">{content.summary}</p> : null}

      <div className="space-y-3">
        {sections.map((s, i) => (
          <Card key={i} className="p-4">
            <div className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">{i + 1}</span>
              <div className="min-w-0">
                {s.title ? <h2 className="font-semibold">{s.title}</h2> : null}
                <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{s.body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {content ? (
        <Quiz key={locale} questions={content.quiz} onPass={markDone} />
      ) : (
        <Button block size="lg" className="mt-6" loading={pending} disabled={completed} onClick={() => markDone(100)}>
          {completed ? t("training.completed") : t("training.finish")}
        </Button>
      )}
    </>
  );
}

function Quiz({ questions, onPass }: { questions: QuizQuestion[]; onPass: (score: number) => Promise<void> }) {
  const { t } = useI18n();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [checked, setChecked] = useState(false);
  const correct = answers.filter((a, i) => a === questions[i].answer).length;
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= 66;

  return (
    <>
      <SectionTitle>{t("training.quiz")}</SectionTitle>
      <p className="mb-3 px-1 text-sm text-muted">{t("training.quizIntro")}</p>
      <div className="space-y-3">
        {questions.map((q, qi) => (
          <Card key={qi} className="p-4">
            <p className="font-medium">{q.q}</p>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label={q.q}>
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi;
                const isRight = checked && oi === q.answer;
                const isWrong = checked && selected && oi !== q.answer;
                return (
                  <button
                    key={oi}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={checked}
                    onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                    className={cn(
                      "w-full rounded-xl border px-3.5 py-2.5 text-left text-[15px] transition",
                      selected ? "border-accent bg-accent/5" : "border-border",
                      isRight && "border-emerald-500 bg-emerald-500/10",
                      isWrong && "border-red-500 bg-red-500/10",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      {!checked ? (
        <Button
          block
          size="lg"
          className="mt-4"
          disabled={answers.some((a) => a === null)}
          onClick={async () => {
            setChecked(true);
            if (score >= 66) await onPass(score);
          }}
        >
          {t("training.check")}
        </Button>
      ) : (
        <Card className={cn("mt-4 p-4 text-center", passed ? "border-emerald-500/40" : "border-amber-500/40")}>
          <p className="text-lg font-semibold">{t("training.score", { score })}</p>
          <p className="mt-1 text-sm text-muted">{passed ? t("training.passed") : t("training.failed")}</p>
          {!passed ? (
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => {
                setChecked(false);
                setAnswers(questions.map(() => null));
              }}
            >
              {t("training.tryAgain")}
            </Button>
          ) : null}
        </Card>
      )}
    </>
  );
}
