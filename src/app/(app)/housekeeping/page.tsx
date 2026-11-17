"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, ListChecks, Pencil, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  Badge,
  Button,
  Card,
  Chips,
  EmptyState,
  Fab,
  IconButton,
  LabeledInput,
  LabeledSelect,
  LabeledTextarea,
  LoadingList,
  PageHeader,
  Sheet,
} from "@/components/ui";
import { formatRelative, todayISO } from "@/lib/format";
import { must, useAction, useMembers } from "@/lib/hooks";
import { getSupabase } from "@/lib/supabase";
import type { ChecklistRun, ChecklistTemplate, RunStatus } from "@/lib/types";

const runTone: Record<RunStatus, "warning" | "info" | "success"> = {
  in_progress: "warning",
  completed: "info",
  inspected: "success",
};

function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await must(getSupabase().from("checklist_templates").select("*").order("created_at"))) as ChecklistTemplate[],
  });
}

export default function HousekeepingPage() {
  const { t, locale } = useI18n();
  const { isManager } = useMember();
  const { nameOf } = useMembers();
  const router = useRouter();
  const { run, pending } = useAction();
  const [filter, setFilter] = useState<"today" | "open" | "all">("today");
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const [room, setRoom] = useState("");
  const [templateId, setTemplateId] = useState("");
  const templates = useTemplates();

  const runs = useQuery({
    queryKey: ["runs"],
    queryFn: async () => (await must(getSupabase().from("checklist_runs").select("*").order("created_at", { ascending: false }).limit(200))) as ChecklistRun[],
  });

  const list = useMemo(() => {
    const all = runs.data ?? [];
    const today = todayISO();
    if (filter === "today") return all.filter((r) => r.created_at.slice(0, 10) === today || new Date(r.created_at).toDateString() === new Date().toDateString());
    if (filter === "open") return all.filter((r) => r.status !== "inspected");
    return all;
  }, [runs.data, filter]);

  const activeTemplates = (templates.data ?? []).filter((tpl) => tpl.active);

  async function start() {
    const tpl = activeTemplates.find((x) => x.id === (templateId || activeTemplates[0]?.id));
    if (!tpl || !room.trim()) return;
    const res = await run(
      () =>
        must(
          getSupabase()
            .from("checklist_runs")
            .insert({ room: room.trim(), template_id: tpl.id, template_name: tpl.name, items: tpl.items.map((label) => ({ label, done: false })) })
            .select("id")
            .single(),
        ),
      { invalidate: [["runs"]], push: false },
    );
    if (res.ok) {
      setCreating(false);
      setRoom("");
      router.push(`/housekeeping/${(res.data as { id: string }).id}`);
    }
  }

  return (
    <>
      <PageHeader
        title={t("housekeeping.title")}
        back="/"
        actions={
          isManager ? (
            <IconButton label={t("housekeeping.templates")} onClick={() => setManaging(true)}>
              <ListChecks className="size-5" />
            </IconButton>
          ) : null
        }
      />
      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: "today", label: t("housekeeping.filterToday") },
          { value: "open", label: t("housekeeping.filterOpen") },
          { value: "all", label: t("housekeeping.filterAll") },
        ]}
        className="mb-4"
      />

      {runs.isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState icon={<ClipboardCheck />} title={t("housekeeping.noRuns")} />
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const done = r.items.filter((i) => i.done).length;
            return (
              <Link key={r.id} href={`/housekeeping/${r.id}`} className="block">
                <Card className="flex items-center gap-4 p-4 transition active:scale-[.99]">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-subtle text-lg font-semibold tabular-nums">{r.room}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.template_name}</p>
                    <p className="truncate text-sm text-muted">
                      {nameOf(r.created_by)} · {formatRelative(r.updated_at, locale)}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${r.items.length ? (done / r.items.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <Badge tone={runTone[r.status]}>{t(`housekeeping.statuses.${r.status}`)}</Badge>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Fab label={t("housekeeping.newRun")} icon={<Plus />} onClick={() => setCreating(true)} />

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title={t("housekeeping.newRun")}
        footer={
          <Button block size="lg" loading={pending} disabled={!room.trim() || activeTemplates.length === 0} onClick={start}>
            {t("housekeeping.start")}
          </Button>
        }
      >
        {activeTemplates.length === 0 ? (
          <p className="rounded-xl bg-subtle p-3 text-sm text-muted">{t("housekeeping.noTemplates")}</p>
        ) : (
          <div className="space-y-4">
            <LabeledInput
              label={t("housekeeping.room")}
              placeholder={t("housekeeping.roomPlaceholder")}
              inputMode="text"
              maxLength={20}
              autoFocus
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            <LabeledSelect label={t("housekeeping.template")} value={templateId || activeTemplates[0]?.id} onChange={(e) => setTemplateId(e.target.value)}>
              {activeTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.items.length})
                </option>
              ))}
            </LabeledSelect>
          </div>
        )}
      </Sheet>

      {isManager && managing ? <TemplatesSheet onClose={() => setManaging(false)} /> : null}
    </>
  );
}

function TemplatesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const templates = useTemplates();
  const { run, pending } = useAction();
  const [editing, setEditing] = useState<ChecklistTemplate | "new" | null>(null);
  const [name, setName] = useState("");
  const [items, setItems] = useState("");

  function edit(tpl: ChecklistTemplate | "new") {
    setEditing(tpl);
    setName(tpl === "new" ? "" : tpl.name);
    setItems(tpl === "new" ? "" : tpl.items.join("\n"));
  }

  async function save() {
    const list = items.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 60);
    if (name.trim().length < 2 || list.length === 0) return;
    const payload = { name: name.trim(), items: list };
    const sb = getSupabase().from("checklist_templates");
    const res = await run(() => must(editing === "new" ? sb.insert(payload) : sb.update(payload).eq("id", (editing as ChecklistTemplate).id)), {
      success: "common.saved",
      invalidate: [["templates"]],
      push: false,
    });
    if (res.ok) setEditing(null);
  }

  async function remove(tpl: ChecklistTemplate) {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    await run(() => must(getSupabase().from("checklist_templates").delete().eq("id", tpl.id)), { invalidate: [["templates"]], push: false });
  }

  return (
    <Sheet
      open
      onClose={editing ? () => setEditing(null) : onClose}
      title={editing ? (editing === "new" ? t("housekeeping.newTemplate") : name) : t("housekeeping.templates")}
      footer={
        editing ? (
          <Button block size="lg" loading={pending} onClick={save}>
            {t("common.save")}
          </Button>
        ) : (
          <Button block variant="outline" icon={<Plus className="size-4" />} onClick={() => edit("new")}>
            {t("housekeeping.newTemplate")}
          </Button>
        )
      }
    >
      {editing ? (
        <div className="space-y-4">
          <LabeledInput label={t("housekeeping.templateName")} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <LabeledTextarea label={t("housekeeping.templateItems")} rows={10} value={items} onChange={(e) => setItems(e.target.value)} />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {(templates.data ?? []).map((tpl) => (
            <div key={tpl.id} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{tpl.name}</p>
                <p className="text-sm text-muted">{t("housekeeping.itemsCount", { n: tpl.items.length })}</p>
              </div>
              <IconButton label={t("common.edit")} onClick={() => edit(tpl)}>
                <Pencil className="size-4" />
              </IconButton>
              <IconButton label={t("common.delete")} onClick={() => remove(tpl)} className="text-muted">
                <Trash className="size-4" />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
