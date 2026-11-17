"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, Plus, Trash } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Fab,
  IconButton,
  LabeledInput,
  LabeledSelect,
  LabeledTextarea,
  LoadingList,
  PageHeader,
  SectionTitle,
  Segmented,
  Sheet,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { addDays, formatDate, formatMinutes, formatTime, formatWeekday, startOfWeek, toISODate, todayISO } from "@/lib/format";
import { must, useAction, useMembers } from "@/lib/hooks";
import { getSupabase } from "@/lib/supabase";
import type { LeaveRequest, Shift, TimeEntry } from "@/lib/types";

type Tab = "shifts" | "leave" | "hours";

export default function SchedulePage() {
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("tab");
  const [tab, setTab] = useState<Tab>(initial === "leave" || initial === "hours" ? initial : "shifts");

  return (
    <>
      <PageHeader title={t("schedule.title")} />
      <Segmented
        value={tab}
        onChange={(v) => {
          setTab(v);
          router.replace(v === "shifts" ? "/schedule" : `/schedule?tab=${v}`, { scroll: false });
        }}
        options={[
          { value: "shifts", label: t("schedule.tabShifts") },
          { value: "leave", label: t("schedule.tabLeave") },
          { value: "hours", label: t("schedule.tabHours") },
        ]}
        className="mb-4"
      />
      {tab === "shifts" ? <ShiftsTab /> : tab === "leave" ? <LeaveTab /> : <HoursTab />}
    </>
  );
}

/* ============================== ESCALA ============================== */
function ShiftsTab() {
  const { t, locale } = useI18n();
  const { userId, isManager } = useMember();
  const { members, nameOf } = useMembers();
  const { run } = useAction();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState<"mine" | "team">("mine");
  const [adding, setAdding] = useState(false);

  const from = toISODate(weekStart);
  const to = toISODate(addDays(weekStart, 6));
  const shifts = useQuery({
    queryKey: ["schedule", "week", from, view, userId],
    queryFn: async () => {
      let q = getSupabase().from("shifts").select("*").gte("shift_date", from).lte("shift_date", to).order("shift_date").order("start_time");
      if (view === "mine") q = q.eq("user_id", userId);
      return (await must(q)) as Shift[];
    },
  });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i))), [weekStart]);
  const today = todayISO();
  const isThisWeek = from === toISODate(startOfWeek(new Date()));

  async function removeShift(s: Shift) {
    if (!isManager || !window.confirm(t("schedule.deleteShiftConfirm"))) return;
    await run(() => must(getSupabase().from("shifts").delete().eq("id", s.id)), { invalidate: [["schedule"]], push: false });
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <IconButton label={t("schedule.prevWeek")} onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))} className="flex-1 text-center text-sm font-medium">
          {formatDate(from, locale)} – {formatDate(to, locale)}
          {!isThisWeek ? <span className="ml-2 text-accent">· {t("schedule.thisWeek")}</span> : null}
        </button>
        <IconButton label={t("schedule.nextWeek")} onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>
      <Segmented
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: "mine", label: t("schedule.mine") },
          { value: "team", label: t("schedule.team") },
        ]}
        className="mb-4"
      />

      {shifts.isLoading ? (
        <LoadingList />
      ) : (
        <div className="space-y-3">
          {days.map((day) => {
            const list = (shifts.data ?? []).filter((s) => s.shift_date === day);
            return (
              <Card key={day} className={cn("p-3.5", day === today && "border-accent/50")}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className={cn("text-sm font-semibold", day === today && "text-accent")}>{formatWeekday(day, locale)}</p>
                  {day === today ? <Badge tone="accent">{t("common.today")}</Badge> : null}
                </div>
                {list.length === 0 ? (
                  <p className="text-sm text-muted">{t("schedule.noShiftsDay")}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {list.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 py-2">
                        {view === "team" ? <Avatar name={nameOf(s.user_id)} className="size-8 text-xs" /> : <Clock className="size-4 text-muted" />}
                        <div className="min-w-0 flex-1">
                          {view === "team" ? <p className="truncate text-sm font-medium">{nameOf(s.user_id)}</p> : null}
                          <p className={cn("text-sm", view === "team" ? "text-muted" : "font-medium")}>
                            {s.kind === "work" ? `${formatTime(s.start_time)} – ${formatTime(s.end_time)}` : t(`schedule.kinds.${s.kind}`)}
                            {s.notes ? <span className="text-muted"> · {s.notes}</span> : null}
                          </p>
                        </div>
                        {s.kind !== "work" ? <Badge tone={s.kind === "vacation" ? "info" : "success"}>{t(`schedule.kinds.${s.kind}`)}</Badge> : null}
                        {isManager ? (
                          <IconButton label={t("common.delete")} onClick={() => removeShift(s)} className="size-8 text-muted">
                            <Trash className="size-4" />
                          </IconButton>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {isManager ? (
        <>
          <Fab label={t("schedule.addShift")} icon={<Plus />} onClick={() => setAdding(true)} />
          <AddShiftSheet open={adding} onClose={() => setAdding(false)} members={members} defaultDate={days.includes(today) ? today : from} />
        </>
      ) : null}
    </>
  );
}

function AddShiftSheet({
  open,
  onClose,
  members,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  members: { id: string; full_name: string }[];
  defaultDate: string;
}) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [kind, setKind] = useState<Shift["kind"]>("work");
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("15:00");
  const [repeat, setRepeat] = useState(1);
  const [notes, setNotes] = useState("");

  async function save() {
    const target = userId || members[0]?.id;
    if (!target || !date) return;
    const base = new Date(`${date}T12:00:00`);
    const rows = Array.from({ length: repeat }, (_, i) => ({
      user_id: target,
      shift_date: toISODate(addDays(base, i)),
      kind,
      start_time: kind === "work" ? start : null,
      end_time: kind === "work" ? end : null,
      notes: notes.trim() || null,
    }));
    const res = await run(() => must(getSupabase().from("shifts").insert(rows)), { success: "common.saved", invalidate: [["schedule"]], push: false });
    if (res.ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("schedule.addShift")}
      footer={
        <Button block size="lg" loading={pending} onClick={save} icon={<CalendarPlus className="size-4" />}>
          {t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4">
        <LabeledSelect label={t("schedule.employee")} value={userId || members[0]?.id || ""} onChange={(e) => setUserId(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name || "—"}
            </option>
          ))}
        </LabeledSelect>
        <Segmented
          value={kind}
          onChange={setKind}
          options={(["work", "off", "vacation"] as const).map((k) => ({ value: k, label: t(`schedule.kinds.${k}`) }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label={t("common.date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <LabeledSelect label={t("schedule.repeatDays")} value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {t("schedule.repeatOption", { n })}
              </option>
            ))}
          </LabeledSelect>
        </div>
        {kind === "work" ? (
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label={t("common.start")} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            <LabeledInput label={t("common.end")} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        ) : null}
        <LabeledTextarea label={`${t("common.notes")} (${t("common.optional")})`} rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Sheet>
  );
}

/* ============================== FOLGAS ============================== */
function statusTone(status: string) {
  return status === "approved" ? "success" : status === "rejected" ? "danger" : status === "pending" ? "warning" : "neutral";
}

function LeaveTab() {
  const { t, locale } = useI18n();
  const { userId, isManager } = useMember();
  const { nameOf } = useMembers();
  const { run, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<LeaveRequest["kind"]>("day_off");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [reason, setReason] = useState("");

  const requests = useQuery({
    queryKey: ["schedule", "leave", userId],
    queryFn: async () => (await must(getSupabase().from("leave_requests").select("*").order("created_at", { ascending: false }).limit(100))) as LeaveRequest[],
  });
  const mine = (requests.data ?? []).filter((r) => r.user_id === userId);
  const toReview = (requests.data ?? []).filter((r) => r.user_id !== userId && r.status === "pending");

  async function submit() {
    const res = await run(
      () => must(getSupabase().rpc("request_leave", { p_start: start, p_end: end < start ? start : end, p_kind: kind, p_reason: reason })),
      { success: "schedule.leaveSent", invalidate: [["schedule"]] },
    );
    if (res.ok) {
      setOpen(false);
      setReason("");
    }
  }

  const period = (r: LeaveRequest) =>
    r.start_date === r.end_date ? formatDate(r.start_date, locale) : t("schedule.period", { start: formatDate(r.start_date, locale), end: formatDate(r.end_date, locale) });

  return (
    <>
      <Button block size="lg" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
        {t("schedule.requestLeave")}
      </Button>

      {isManager ? (
        <>
          <SectionTitle>{t("schedule.toReview")}</SectionTitle>
          {toReview.length === 0 ? (
            <p className="px-1 text-sm text-muted">{t("schedule.noRequests")}</p>
          ) : (
            <div className="space-y-2">
              {toReview.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={nameOf(r.user_id)} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{nameOf(r.user_id)}</p>
                      <p className="text-sm text-muted">
                        {t(`schedule.leaveKinds.${r.kind}`)} · {period(r)}
                      </p>
                      {r.reason ? <p className="mt-1 text-sm">{r.reason}</p> : null}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted">{t("schedule.leaveApproveHint")}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => run(() => must(getSupabase().rpc("decide_leave", { p_leave: r.id, p_approve: false })), { invalidate: [["schedule"]] })}>
                      {t("common.reject")}
                    </Button>
                    <Button onClick={() => run(() => must(getSupabase().rpc("decide_leave", { p_leave: r.id, p_approve: true })), { success: "common.approved", invalidate: [["schedule"]] })}>
                      {t("common.approve")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : null}

      <SectionTitle>{t("schedule.myRequests")}</SectionTitle>
      {requests.isLoading ? (
        <LoadingList rows={2} />
      ) : mine.length === 0 ? (
        <EmptyState title={t("schedule.noRequests")} />
      ) : (
        <div className="space-y-2">
          {mine.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t(`schedule.leaveKinds.${r.kind}`)}</p>
                <p className="text-sm text-muted">{period(r)}</p>
              </div>
              <Badge tone={statusTone(r.status)}>{t(`common.${r.status}`)}</Badge>
              {r.status === "pending" ? (
                <Button size="sm" variant="ghost" onClick={() => run(() => must(getSupabase().rpc("cancel_leave", { p_leave: r.id })), { invalidate: [["schedule"]], push: false })}>
                  {t("common.cancel")}
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("schedule.requestLeave")}
        footer={
          <Button block size="lg" loading={pending} onClick={submit}>
            {t("common.send")}
          </Button>
        }
      >
        <div className="space-y-4">
          <LabeledSelect label={t("schedule.leaveKind")} value={kind} onChange={(e) => setKind(e.target.value as LeaveRequest["kind"])}>
            {(["day_off", "vacation", "hour_bank"] as const).map((k) => (
              <option key={k} value={k}>
                {t(`schedule.leaveKinds.${k}`)}
              </option>
            ))}
          </LabeledSelect>
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label={t("schedule.from")} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <LabeledInput label={t("schedule.to")} type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <LabeledTextarea label={`${t("common.reason")} (${t("common.optional")})`} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </Sheet>
    </>
  );
}

/* ========================== BANCO DE HORAS ========================== */
function HoursTab() {
  const { t, locale } = useI18n();
  const { userId, isManager } = useMember();
  const { members, nameOf } = useMembers();
  const { run, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(userId);
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<"extra" | "compensation">("extra");
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [reason, setReason] = useState("");

  const entries = useQuery({
    queryKey: ["schedule", "hours", userId],
    queryFn: async () =>
      (await must(getSupabase().from("time_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(500))) as TimeEntry[],
  });

  const all = entries.data ?? [];
  const mine = all.filter((e) => e.user_id === userId);
  const balance = mine.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.minutes, 0);
  const pendingReview = all.filter((e) => e.user_id !== userId && e.status === "pending");
  const teamBalances = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of all) if (e.status === "approved") map.set(e.user_id, (map.get(e.user_id) ?? 0) + e.minutes);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);

  async function submit() {
    const total = hours * 60 + minutes;
    if (total <= 0) return;
    const signed = type === "extra" ? total : -total;
    const res = await run(
      () => must(getSupabase().rpc("log_hours", { p_user: target || userId, p_date: date, p_minutes: signed, p_reason: reason })),
      { success: "schedule.hoursSent", invalidate: [["schedule"]] },
    );
    if (res.ok) {
      setOpen(false);
      setReason("");
    }
  }

  return (
    <>
      <Card className="p-5">
        <p className="text-sm text-muted">{t("schedule.balance")}</p>
        <p className={cn("mt-1 text-4xl font-semibold tabular-nums tracking-tight", balance < 0 && "text-red-600")}>{formatMinutes(balance)}</p>
        <Button className="mt-4" block icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
          {t("schedule.logHours")}
        </Button>
      </Card>

      {isManager ? (
        <>
          <SectionTitle>{t("schedule.pendingEntries")}</SectionTitle>
          {pendingReview.length === 0 ? (
            <p className="px-1 text-sm text-muted">{t("schedule.noEntries")}</p>
          ) : (
            <div className="space-y-2">
              {pendingReview.map((e) => (
                <Card key={e.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={nameOf(e.user_id)} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{nameOf(e.user_id)}</p>
                      <p className="text-sm text-muted">
                        {formatDate(e.entry_date, locale)}
                        {e.reason ? ` · ${e.reason}` : ""}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{formatMinutes(e.minutes)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => run(() => must(getSupabase().rpc("decide_hours", { p_entry: e.id, p_approve: false })), { invalidate: [["schedule"]] })}>
                      {t("common.reject")}
                    </Button>
                    <Button onClick={() => run(() => must(getSupabase().rpc("decide_hours", { p_entry: e.id, p_approve: true })), { success: "common.approved", invalidate: [["schedule"]] })}>
                      {t("common.approve")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <SectionTitle>{t("schedule.teamBalances")}</SectionTitle>
          <Card className="divide-y divide-border">
            {teamBalances.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("schedule.noEntries")}</p>
            ) : (
              teamBalances.map(([id, total]) => (
                <div key={id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={nameOf(id)} className="size-8 text-xs" />
                  <span className="flex-1 truncate text-sm font-medium">{nameOf(id)}</span>
                  <span className={cn("text-sm font-semibold tabular-nums", total < 0 && "text-red-600")}>{formatMinutes(total)}</span>
                </div>
              ))
            )}
          </Card>
        </>
      ) : null}

      <SectionTitle>{t("schedule.entries")}</SectionTitle>
      {entries.isLoading ? (
        <LoadingList rows={2} />
      ) : mine.length === 0 ? (
        <EmptyState title={t("schedule.noEntries")} />
      ) : (
        <Card className="divide-y divide-border">
          {mine.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{formatDate(e.entry_date, locale, { weekday: "short", day: "2-digit", month: "short" })}</p>
                {e.reason ? <p className="truncate text-xs text-muted">{e.reason}</p> : null}
              </div>
              {e.status !== "approved" ? <Badge tone={statusTone(e.status)}>{t(`common.${e.status}`)}</Badge> : null}
              <span className={cn("w-16 text-right text-sm font-semibold tabular-nums", e.minutes < 0 && "text-red-600")}>{formatMinutes(e.minutes)}</span>
              {e.status === "pending" ? (
                <IconButton label={t("common.delete")} className="size-8 text-muted" onClick={() => run(() => must(getSupabase().rpc("delete_hours", { p_entry: e.id })), { invalidate: [["schedule"]], push: false })}>
                  <Trash className="size-4" />
                </IconButton>
              ) : null}
            </div>
          ))}
        </Card>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("schedule.logHours")}
        footer={
          <>
            {!isManager ? <p className="mb-3 text-xs text-muted">{t("schedule.hoursPendingHint")}</p> : null}
            <Button block size="lg" loading={pending} onClick={submit}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {isManager ? (
            <LabeledSelect label={t("schedule.employee")} value={target} onChange={(e) => setTarget(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || "—"}
                </option>
              ))}
            </LabeledSelect>
          ) : null}
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: "extra", label: t("schedule.entryTypes.extra") },
              { value: "compensation", label: t("schedule.entryTypes.compensation") },
            ]}
          />
          <LabeledInput label={t("common.date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <LabeledSelect label={t("schedule.hours")} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>
                  {i}h
                </option>
              ))}
            </LabeledSelect>
            <LabeledSelect label={t("schedule.minutes")} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </LabeledSelect>
          </div>
          <LabeledTextarea label={`${t("common.reason")} (${t("common.optional")})`} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </Sheet>
    </>
  );
}
