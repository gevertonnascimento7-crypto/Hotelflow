"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PhotoPicker } from "@/components/photo";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  Badge,
  Button,
  Card,
  Chips,
  EmptyState,
  Fab,
  LabeledInput,
  LabeledSelect,
  LabeledTextarea,
  LoadingList,
  PageHeader,
  Segmented,
  Sheet,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { must, useAction, useMembers } from "@/lib/hooks";
import { uploadPhoto } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, type Ticket, type TicketCategory, type TicketPriority } from "@/lib/types";
import { priorityDot, statusTone } from "./shared";

export default function MaintenancePage() {
  const { t, locale } = useI18n();
  const { userId, hotel } = useMember();
  const { nameOf } = useMembers();
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<"active" | "mine" | "resolved">("active");
  const [creating, setCreating] = useState(params.get("new") === "1");
  const [live, setLive] = useState(false);

  const tickets = useQuery({
    queryKey: ["tickets", "list"],
    queryFn: async () => (await must(getSupabase().from("maintenance_tickets").select("*").order("created_at", { ascending: false }).limit(200))) as Ticket[],
  });

  // Tempo real: qualquer mudança nos chamados do hotel atualiza a lista
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`tickets:${hotel.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_tickets", filter: `hotel_id=eq.${hotel.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotel.id, queryClient]);

  const order: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const list = useMemo(() => {
    const all = tickets.data ?? [];
    if (filter === "resolved") return all.filter((x) => x.status === "resolved" || x.status === "cancelled");
    const active = all.filter((x) => x.status === "open" || x.status === "in_progress");
    const base = filter === "mine" ? active.filter((x) => x.assigned_to === userId || x.created_by === userId) : active;
    return [...base].sort((a, b) => order[a.priority] - order[b.priority] || b.created_at.localeCompare(a.created_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets.data, filter, userId]);

  return (
    <>
      <PageHeader
        title={t("maintenance.title")}
        actions={
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", live ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : "bg-subtle text-muted")}>
            <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-emerald-500" : "bg-zinc-400")} />
            {t("maintenance.live")}
          </span>
        }
      />
      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: "active", label: t("maintenance.filterActive") },
          { value: "mine", label: t("maintenance.filterMine") },
          { value: "resolved", label: t("maintenance.filterResolved") },
        ]}
        className="mb-4"
      />
      {tickets.isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState icon={<Wrench />} title={t("maintenance.noTickets")} />
      ) : (
        <div className="space-y-2">
          {list.map((x) => (
            <Link key={x.id} href={`/maintenance/${x.id}`} className="block">
              <Card className="flex items-start gap-3 p-4 transition active:scale-[.99]">
                <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", priorityDot[x.priority])} title={t(`maintenance.priorities.${x.priority}`)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    <span className="text-muted">#{x.code}</span> {x.title}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {x.location} · {formatRelative(x.created_at, locale)}
                  </p>
                  {x.assigned_to ? <p className="mt-1 truncate text-xs text-muted">{t("maintenance.assignee")}: {nameOf(x.assigned_to)}</p> : null}
                </div>
                <Badge tone={statusTone[x.status]}>{t(`maintenance.statuses.${x.status}`)}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Fab label={t("maintenance.newTicket")} icon={<Plus />} onClick={() => setCreating(true)} />
      {creating ? (
        <NewTicketSheet
          onClose={() => {
            setCreating(false);
            if (params.get("new")) router.replace("/maintenance");
          }}
        />
      ) : null}
    </>
  );
}

function NewTicketSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { hotel } = useMember();
  const { run, pending } = useAction();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<TicketCategory>("other");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);

  const valid = title.trim().length >= 3 && location.trim().length >= 1;

  async function submit() {
    if (!valid) return;
    const res = await run(
      async () => {
        const photo_path = photo ? await uploadPhoto(hotel.id, "tickets", photo) : null;
        return must(
          getSupabase().from("maintenance_tickets").insert({
            title: title.trim(),
            location: location.trim(),
            category,
            priority,
            description: description.trim() || null,
            photo_path,
          }),
        );
      },
      { success: "maintenance.created", invalidate: [["tickets"]] },
    );
    if (res.ok) onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("maintenance.newTicket")}
      footer={
        <Button block size="lg" loading={pending} disabled={!valid} onClick={submit}>
          {t("common.send")}
        </Button>
      }
    >
      <div className="space-y-4">
        <LabeledInput label={t("maintenance.ticketTitle")} placeholder={t("maintenance.ticketTitlePlaceholder")} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <LabeledInput label={t("maintenance.location")} placeholder={t("maintenance.locationPlaceholder")} maxLength={80} value={location} onChange={(e) => setLocation(e.target.value)} />
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t("maintenance.priority")}</p>
          <Segmented size="sm" value={priority} onChange={setPriority} options={TICKET_PRIORITIES.map((p) => ({ value: p, label: t(`maintenance.priorities.${p}`) }))} />
        </div>
        <LabeledSelect label={t("maintenance.category")} value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`maintenance.categories.${c}`)}
            </option>
          ))}
        </LabeledSelect>
        <LabeledTextarea label={`${t("maintenance.description")} (${t("common.optional")})`} rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        <PhotoPicker value={photo} onChange={setPhoto} />
      </div>
    </Sheet>
  );
}
