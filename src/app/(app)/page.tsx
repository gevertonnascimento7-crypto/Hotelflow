"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useUnreadCount } from "@/components/providers/notifications-provider";
import { Card, SectionTitle } from "@/components/ui";
import { formatDate, formatTime, todayISO } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { getSupabase } from "@/lib/supabase";
import type { Shift } from "@/lib/types";

export default function HomePage() {
  const { t, locale } = useI18n();
  const { profile, hotel, userId, isManager } = useMember();
  const unread = useUnreadCount();
  const supabase = getSupabase();

  const today = todayISO();
  const shifts = useQuery({
    queryKey: ["schedule", "today", userId, today],
    queryFn: async () => {
      const { data, error } = await supabase.from("shifts").select("*").eq("user_id", userId).eq("shift_date", today).order("start_time");
      if (error) throw error;
      return data as Shift[];
    },
  });

  const openTickets = useQuery({
    queryKey: ["tickets", "open-count", hotel.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("maintenance_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const approvals = useQuery({
    queryKey: ["approvals-count", hotel.id],
    enabled: isManager,
    queryFn: async () => {
      const [swaps, leave, hours] = await Promise.all([
        supabase.from("shift_swaps").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return (swaps.count ?? 0) + (leave.count ?? 0) + (hours.count ?? 0);
    },
  });

  const mySwaps = useQuery({
    queryKey: ["swaps", "pending-count", userId],
    enabled: !isManager,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("shift_swaps")
        .select("id", { count: "exact", head: true })
        .eq("target_id", userId)
        .eq("status", "pending_peer");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const hour = new Date().getHours();
  const firstName = profile.full_name.split(" ")[0] || "";
  const greeting = t(hour < 12 ? "home.morning" : hour < 18 ? "home.afternoon" : "home.evening", { name: firstName });
  const myShift = shifts.data?.[0];

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <p className="text-sm text-muted">
        {hotel.name} · {formatDate(new Date(), locale, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{greeting}</h1>

      <Link href="/schedule" className="mt-5 block">
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-muted">{t("home.todayShift")}</p>
            <p className="mt-0.5 text-lg font-semibold">
              {!myShift
                ? t("home.noShiftToday")
                : myShift.kind === "work"
                  ? `${formatTime(myShift.start_time)} – ${formatTime(myShift.end_time)}`
                  : t(`schedule.kinds.${myShift.kind}`)}
            </p>
          </div>
          <span className="text-sm font-medium text-accent">{t("schedule.title")} →</span>
        </Card>
      </Link>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat href="/maintenance" label={t("home.openTickets")} value={openTickets.data} />
        <Stat href="/notifications" label={t("home.unread")} value={unread} />
        {isManager ? (
          <Stat href="/swaps?tab=approve" label={t("home.pendingApprovals")} value={approvals.data} />
        ) : (
          <Stat href="/swaps" label={t("home.pendingSwaps")} value={mySwaps.data} />
        )}
      </div>

      <SectionTitle>{t("home.tools")}</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {MODULES.map(({ key, href, icon: Icon }) => (
          <Link key={key} href={href} className="group">
            <Card className="flex h-full flex-col gap-3 p-4 transition group-active:scale-[.98]">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold leading-tight">{t(`modules.${key}.title`)}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{t(`modules.${key}.desc`)}</span>
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ href, label, value }: { href: string; label: string; value: number | undefined }) {
  return (
    <Link href={href}>
      <Card className="flex h-full flex-col justify-between p-3.5">
        <span className="text-2xl font-semibold tabular-nums">{value ?? "–"}</span>
        <span className="mt-1 text-xs leading-tight text-muted">{label}</span>
      </Card>
    </Link>
  );
}
