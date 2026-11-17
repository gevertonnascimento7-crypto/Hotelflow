"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Badge, Button, Card, IconButton, LoadingList, PageHeader, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { errorKey } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { must, useAction, useMembers } from "@/lib/hooks";
import { getSupabase } from "@/lib/supabase";
import { useToast } from "@/components/providers/toast-provider";
import type { ChecklistItem, ChecklistRun, RunStatus } from "@/lib/types";

const runTone: Record<RunStatus, "warning" | "info" | "success"> = { in_progress: "warning", completed: "info", inspected: "success" };

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { userId, isManager } = useMember();
  const { nameOf } = useMembers();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { run, pending } = useAction();
  const [notes, setNotes] = useState("");

  const key = ["runs", id];
  const query = useQuery({
    queryKey: key,
    queryFn: async () => (await must(getSupabase().from("checklist_runs").select("*").eq("id", id).single())) as ChecklistRun,
  });
  const data = query.data;
  useEffect(() => setNotes(data?.notes ?? ""), [data?.notes]);

  if (!data) return <><PageHeader title={t("housekeeping.title")} back="/housekeeping" /><LoadingList rows={6} /></>;

  const canEdit = data.created_by === userId || isManager;
  const locked = data.status !== "in_progress" || !canEdit;
  const done = data.items.filter((i) => i.done).length;

  async function toggle(index: number) {
    if (locked || !data) return;
    const items: ChecklistItem[] = data.items.map((it, i) => (i === index ? { ...it, done: !it.done } : it));
    queryClient.setQueryData(key, { ...data, items });
    const { error } = await getSupabase().from("checklist_runs").update({ items }).eq("id", id);
    if (error) {
      toast(t(errorKey(error)), "error");
      queryClient.invalidateQueries({ queryKey: key });
    }
  }

  const setStatus = (status: RunStatus, success?: "common.saved") =>
    run(() => must(getSupabase().from("checklist_runs").update({ status, notes: notes.trim() || null }).eq("id", id)), {
      success,
      invalidate: [["runs"]],
    });

  async function complete() {
    if (done < data!.items.length && !window.confirm(t("housekeeping.incompleteConfirm"))) return;
    const res = await setStatus("completed", "common.saved");
    if (res.ok) router.push("/housekeeping");
  }

  async function remove() {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    const res = await run(() => must(getSupabase().from("checklist_runs").delete().eq("id", id)), { invalidate: [["runs"]], push: false });
    if (res.ok) router.replace("/housekeeping");
  }

  return (
    <>
      <PageHeader
        title={`${t("housekeeping.room")} ${data.room}`}
        subtitle={data.template_name}
        back="/housekeeping"
        actions={
          isManager || (data.created_by === userId && data.status === "in_progress") ? (
            <IconButton label={t("common.delete")} onClick={remove} className="text-muted">
              <Trash className="size-5" />
            </IconButton>
          ) : null
        }
      />
      <Card className="mb-3 p-4">
        <div className="flex items-center justify-between">
          <Badge tone={runTone[data.status]}>{t(`housekeeping.statuses.${data.status}`)}</Badge>
          <span className="text-sm font-medium tabular-nums">{t("housekeeping.progress", { done, total: data.items.length })}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-subtle">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${data.items.length ? (done / data.items.length) * 100 : 0}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted">
          {nameOf(data.created_by)} · {formatDateTime(data.created_at, locale)}
          {data.inspected_by ? ` · ${t("housekeeping.statuses.inspected")}: ${nameOf(data.inspected_by)}` : ""}
        </p>
      </Card>

      <Card className="divide-y divide-border">
        {data.items.map((item, i) => (
          <button
            key={i}
            type="button"
            role="checkbox"
            aria-checked={Boolean(item.done)}
            disabled={locked}
            onClick={() => toggle(i)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-default"
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition",
                item.done ? "border-accent bg-accent text-accent-fg" : "border-border",
              )}
            >
              {item.done ? <Check className="size-4" strokeWidth={3} /> : null}
            </span>
            <span className={cn("text-[15px]", item.done && "text-muted line-through")}>{item.label}</span>
          </button>
        ))}
      </Card>

      <div className="mt-4 space-y-1.5">
        <label htmlFor="notes" className="px-1 text-sm font-medium">
          {t("common.notes")}
        </label>
        <Textarea
          id="notes"
          rows={3}
          maxLength={1000}
          disabled={!canEdit}
          placeholder={t("housekeeping.notesPlaceholder")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (canEdit && (notes.trim() || null) !== (data.notes || null))
              getSupabase().from("checklist_runs").update({ notes: notes.trim() || null }).eq("id", id).then(() => queryClient.invalidateQueries({ queryKey: key }));
          }}
        />
      </div>

      <div className="mt-5 space-y-2">
        {data.status === "in_progress" && canEdit ? (
          <Button block size="lg" loading={pending} onClick={complete}>
            {t("housekeeping.complete")}
          </Button>
        ) : null}
        {data.status === "completed" && isManager ? (
          <Button block size="lg" loading={pending} onClick={() => setStatus("inspected", "common.saved")}>
            {t("housekeeping.inspect")}
          </Button>
        ) : null}
        {data.status !== "in_progress" && canEdit ? (
          <Button block variant="outline" loading={pending} onClick={() => setStatus("in_progress")}>
            {t("housekeeping.reopen")}
          </Button>
        ) : null}
      </div>
    </>
  );
}
