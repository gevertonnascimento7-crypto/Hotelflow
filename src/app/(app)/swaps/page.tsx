"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ArrowRight, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Avatar, Badge, Button, Card, EmptyState, Fab, LabeledSelect, LabeledTextarea, LoadingList, PageHeader, Segmented, Sheet } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import { formatTime, formatWeekday, todayISO } from "@/lib/format";
import { must, useAction, useMembers } from "@/lib/hooks";
import { getSupabase } from "@/lib/supabase";
import type { Shift, ShiftSwap, SwapStatus } from "@/lib/types";

type Tab = "received" | "sent" | "approve";

function shiftLabel(s: Shift | null | undefined, locale: Locale) {
  if (!s) return "—";
  return `${formatWeekday(s.shift_date, locale)} · ${formatTime(s.start_time)}–${formatTime(s.end_time)}`;
}

const statusTone: Record<SwapStatus, "warning" | "info" | "success" | "danger" | "neutral"> = {
  pending_peer: "warning",
  pending_approval: "info",
  approved: "success",
  rejected: "danger",
  declined: "danger",
  cancelled: "neutral",
};

export default function SwapsPage() {
  const { t, locale } = useI18n();
  const { userId, isManager } = useMember();
  const { members, nameOf } = useMembers();
  const { run } = useAction();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "approve" && isManager ? "approve" : "received");
  const [creating, setCreating] = useState(false);

  const swaps = useQuery({
    queryKey: ["swaps", userId],
    queryFn: async () =>
      (await must(
        getSupabase()
          .from("shift_swaps")
          .select("*, requester_shift:shifts!shift_swaps_requester_shift_id_fkey(*), target_shift:shifts!shift_swaps_target_shift_id_fkey(*)")
          .order("created_at", { ascending: false })
          .limit(100),
      )) as ShiftSwap[],
  });

  const list = useMemo(() => {
    const all = swaps.data ?? [];
    if (tab === "received") return all.filter((s) => s.target_id === userId);
    if (tab === "sent") return all.filter((s) => s.requester_id === userId);
    return all.filter((s) => s.status === "pending_approval");
  }, [swaps.data, tab, userId]);

  const counts = useMemo(() => {
    const all = swaps.data ?? [];
    return {
      received: all.filter((s) => s.target_id === userId && s.status === "pending_peer").length,
      approve: all.filter((s) => s.status === "pending_approval").length,
    };
  }, [swaps.data, userId]);

  const act = (fn: string, args: Record<string, unknown>, success?: "swaps.requestSent" | "common.approved") =>
    run(() => must(getSupabase().rpc(fn, args)), { success, invalidate: [["swaps"], ["schedule"], ["approvals-count"]] });

  const tabs: { value: Tab; label: string }[] = [
    { value: "received", label: `${t("swaps.tabReceived")}${counts.received ? ` · ${counts.received}` : ""}` },
    { value: "sent", label: t("swaps.tabSent") },
  ];
  if (isManager) tabs.push({ value: "approve", label: `${t("swaps.tabApprove")}${counts.approve ? ` · ${counts.approve}` : ""}` });

  return (
    <>
      <PageHeader title={t("swaps.title")} subtitle={t("swaps.flow")} back="/" />
      <Segmented value={tab} onChange={setTab} options={tabs} className="mb-4" />

      {swaps.isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight />} title={t("swaps.empty")} />
      ) : (
        <div className="space-y-2">
          {list.map((s) => {
            const cover = !s.target_shift_id;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{cover ? t("swaps.coverLabel") : t("swaps.swapLabel")}</Badge>
                  <Badge tone={statusTone[s.status]}>{t(`swaps.statuses.${s.status}`)}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Avatar name={nameOf(s.requester_id)} className="size-8 text-xs" />
                  <span className="truncate text-sm font-medium">{s.requester_id === userId ? t("common.you") : nameOf(s.requester_id)}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted" />
                  <Avatar name={nameOf(s.target_id)} className="size-8 text-xs" />
                  <span className="truncate text-sm font-medium">{s.target_id === userId ? t("common.you") : nameOf(s.target_id)}</span>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-12 shrink-0 text-muted">{t("swaps.from")}</dt>
                    <dd>{shiftLabel(s.requester_shift, locale)}</dd>
                  </div>
                  {!cover ? (
                    <div className="flex gap-2">
                      <dt className="w-12 shrink-0 text-muted">{t("swaps.to")}</dt>
                      <dd>{shiftLabel(s.target_shift, locale)}</dd>
                    </div>
                  ) : null}
                </dl>
                {s.reason ? <p className="mt-2 rounded-xl bg-subtle px-3 py-2 text-sm">{s.reason}</p> : null}

                {tab === "received" && s.status === "pending_peer" ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => act("respond_swap", { p_swap: s.id, p_accept: false })}>
                      {t("common.decline")}
                    </Button>
                    <Button onClick={() => act("respond_swap", { p_swap: s.id, p_accept: true })}>{t("common.accept")}</Button>
                  </div>
                ) : null}
                {tab === "sent" && (s.status === "pending_peer" || s.status === "pending_approval") ? (
                  <Button className="mt-3" variant="ghost" size="sm" onClick={() => act("cancel_swap", { p_swap: s.id })}>
                    {t("common.cancel")}
                  </Button>
                ) : null}
                {tab === "approve" ? (
                  <>
                    <p className="mt-3 text-xs text-muted">{t("swaps.approveHint")}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => act("decide_swap", { p_swap: s.id, p_approve: false, p_note: null })}>
                        {t("common.reject")}
                      </Button>
                      <Button onClick={() => act("decide_swap", { p_swap: s.id, p_approve: true, p_note: null }, "common.approved")}>{t("common.approve")}</Button>
                    </div>
                  </>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Fab label={t("swaps.newSwap")} icon={<Plus />} onClick={() => setCreating(true)} />
      {creating ? (
        <NewSwapSheet
          onClose={() => setCreating(false)}
          colleagues={members.filter((m) => m.id !== userId)}
          onCreated={() => {
            setCreating(false);
            setTab("sent");
          }}
        />
      ) : null}
    </>
  );
}

function NewSwapSheet({
  onClose,
  colleagues,
  onCreated,
}: {
  onClose: () => void;
  colleagues: { id: string; full_name: string }[];
  onCreated: () => void;
}) {
  const { t, locale } = useI18n();
  const { userId } = useMember();
  const { run, pending } = useAction();
  const [myShift, setMyShift] = useState("");
  const [colleague, setColleague] = useState("");
  const [mode, setMode] = useState<"swap" | "cover">("swap");
  const [theirShift, setTheirShift] = useState("");
  const [reason, setReason] = useState("");
  const today = todayISO();

  const upcoming = useQuery({
    queryKey: ["schedule", "upcoming", today],
    queryFn: async () =>
      (await must(getSupabase().from("shifts").select("*").eq("kind", "work").gte("shift_date", today).order("shift_date").order("start_time").limit(300))) as Shift[],
  });
  const mine = (upcoming.data ?? []).filter((s) => s.user_id === userId);
  const theirs = (upcoming.data ?? []).filter((s) => s.user_id === colleague);

  useEffect(() => setTheirShift(""), [colleague]);

  const canSend = myShift && colleague && (mode === "cover" || theirShift);

  async function submit() {
    if (!canSend) return;
    const res = await run(
      () =>
        must(
          getSupabase().rpc("request_swap", {
            p_my_shift: myShift,
            p_target: colleague,
            p_target_shift: mode === "swap" ? theirShift : null,
            p_reason: reason,
          }),
        ),
      { success: "swaps.requestSent", invalidate: [["swaps"]] },
    );
    if (res.ok) onCreated();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("swaps.newSwap")}
      footer={
        <Button block size="lg" loading={pending} disabled={!canSend} onClick={submit}>
          {t("swaps.sendRequest")}
        </Button>
      }
    >
      <div className="space-y-4">
        {upcoming.isFetched && mine.length === 0 ? <p className="rounded-xl bg-subtle p-3 text-sm text-muted">{t("swaps.noUpcomingShifts")}</p> : null}
        <LabeledSelect label={t("swaps.myShift")} value={myShift} onChange={(e) => setMyShift(e.target.value)}>
          <option value="">{t("swaps.chooseShift")}</option>
          {mine.map((s) => (
            <option key={s.id} value={s.id}>
              {shiftLabel(s, locale)}
            </option>
          ))}
        </LabeledSelect>
        <LabeledSelect label={t("swaps.colleague")} value={colleague} onChange={(e) => setColleague(e.target.value)}>
          <option value="">{t("swaps.chooseColleague")}</option>
          {colleagues.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name || "—"}
            </option>
          ))}
        </LabeledSelect>
        <div>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "swap", label: t("swaps.modeSwap") },
              { value: "cover", label: t("swaps.modeCover") },
            ]}
          />
          <p className="mt-1.5 text-xs text-muted">{mode === "swap" ? t("swaps.modeSwapHint") : t("swaps.modeCoverHint")}</p>
        </div>
        {mode === "swap" && colleague ? (
          theirs.length === 0 ? (
            <p className="rounded-xl bg-subtle p-3 text-sm text-muted">{t("swaps.noColleagueShifts")}</p>
          ) : (
            <LabeledSelect label={t("swaps.theirShift")} value={theirShift} onChange={(e) => setTheirShift(e.target.value)}>
              <option value="">{t("swaps.chooseShift")}</option>
              {theirs.map((s) => (
                <option key={s.id} value={s.id}>
                  {shiftLabel(s, locale)}
                </option>
              ))}
            </LabeledSelect>
          )
        ) : null}
        <LabeledTextarea label={`${t("common.reason")} (${t("common.optional")})`} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Sheet>
  );
}
