"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SignedImage } from "@/components/photo";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Avatar, Badge, Button, Card, IconButton, LoadingList, PageHeader, SectionTitle, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative } from "@/lib/format";
import { must, useAction, useMembers } from "@/lib/hooks";
import { removePhoto } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import type { Ticket, TicketComment, TicketStatus } from "@/lib/types";
import { priorityDot, statusTone } from "../shared";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { userId, profile, isManager } = useMember();
  const { members, nameOf } = useMembers();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { run, pending } = useAction();
  const [comment, setComment] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const ticket = useQuery({
    queryKey: ["tickets", id],
    queryFn: async () => (await must(getSupabase().from("maintenance_tickets").select("*").eq("id", id).single())) as Ticket,
  });
  const comments = useQuery({
    queryKey: ["tickets", id, "comments"],
    queryFn: async () => (await must(getSupabase().from("ticket_comments").select("*").eq("ticket_id", id).order("created_at"))) as TicketComment[],
  });

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`ticket:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_tickets", filter: `id=eq.${id}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["tickets", id] }),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_comments", filter: `ticket_id=eq.${id}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["tickets", id, "comments"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const data = ticket.data;
  if (!data)
    return (
      <>
        <PageHeader title={t("maintenance.title")} back="/maintenance" />
        <LoadingList rows={4} />
      </>
    );

  const canEdit = isManager || data.created_by === userId || data.assigned_to === userId || profile.department === "maintenance";
  const update = (patch: Partial<Ticket>) =>
    run(() => must(getSupabase().from("maintenance_tickets").update(patch).eq("id", id)), { invalidate: [["tickets"]] });

  function setStatus(status: TicketStatus) {
    const patch: Partial<Ticket> = { status };
    if (status === "in_progress" && !data!.assigned_to) patch.assigned_to = userId;
    return update(patch);
  }

  async function sendComment(e: FormEvent) {
    e.preventDefault();
    const body = comment.trim();
    if (!body) return;
    const res = await run(() => must(getSupabase().from("ticket_comments").insert({ ticket_id: id, body })), {
      invalidate: [["tickets", id, "comments"]],
    });
    if (res.ok) {
      setComment("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function remove() {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    const res = await run(
      async () => {
        await must(getSupabase().from("maintenance_tickets").delete().eq("id", id));
        await removePhoto(data!.photo_path);
      },
      { invalidate: [["tickets"]], push: false },
    );
    if (res.ok) router.replace("/maintenance");
  }

  return (
    <>
      <PageHeader
        title={`#${data.code}`}
        subtitle={t(`maintenance.categories.${data.category}`)}
        back="/maintenance"
        actions={
          isManager ? (
            <IconButton label={t("common.delete")} onClick={remove} className="text-muted">
              <Trash className="size-5" />
            </IconButton>
          ) : null
        }
      />

      <Card className="overflow-hidden">
        {data.photo_path ? <SignedImage path={data.photo_path} className="h-56 w-full" /> : null}
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[data.status]}>{t(`maintenance.statuses.${data.status}`)}</Badge>
            <Badge>
              <span className={cn("size-2 rounded-full", priorityDot[data.priority])} />
              {t(`maintenance.priorities.${data.priority}`)}
            </Badge>
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-snug">{data.title}</h2>
          <p className="text-sm text-muted">{data.location}</p>
          {data.description ? <p className="mt-3 whitespace-pre-line text-[15px]">{data.description}</p> : null}
          <p className="mt-3 text-xs text-muted">
            {t("maintenance.openedBy", { name: nameOf(data.created_by) })} · {formatDateTime(data.created_at, locale)}
          </p>
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <label htmlFor="assignee" className="text-sm font-medium">
          {t("maintenance.assignee")}
        </label>
        <div className="mt-1.5 flex gap-2">
          {isManager ? (
            <Select id="assignee" value={data.assigned_to ?? ""} onChange={(e) => update({ assigned_to: e.target.value || null })}>
              <option value="">{t("maintenance.unassigned")}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || "—"}
                </option>
              ))}
            </Select>
          ) : (
            <p id="assignee" className="flex h-11 flex-1 items-center text-[15px]">
              {data.assigned_to ? nameOf(data.assigned_to) : t("maintenance.unassigned")}
            </p>
          )}
          {canEdit && data.assigned_to !== userId && data.status !== "resolved" ? (
            <Button variant="outline" onClick={() => update({ assigned_to: userId })}>
              {t("maintenance.assignMe")}
            </Button>
          ) : null}
        </div>
      </Card>

      {canEdit ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {data.status === "open" ? (
            <Button size="lg" loading={pending} onClick={() => setStatus("in_progress")}>
              {t("maintenance.startWork")}
            </Button>
          ) : null}
          {data.status === "open" || data.status === "in_progress" ? (
            <Button size="lg" loading={pending} variant={data.status === "open" ? "outline" : "primary"} className={data.status === "in_progress" ? "col-span-2" : ""} onClick={() => setStatus("resolved")}>
              {t("maintenance.resolve")}
            </Button>
          ) : (
            <Button size="lg" variant="outline" className="col-span-2" loading={pending} onClick={() => setStatus("open")}>
              {t("maintenance.reopen")}
            </Button>
          )}
          {(data.status === "open" || data.status === "in_progress") && (isManager || data.created_by === userId) ? (
            <Button variant="ghost" className="col-span-2 text-muted" onClick={() => setStatus("cancelled")}>
              {t("maintenance.cancelTicket")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <SectionTitle>{t("maintenance.updates")}</SectionTitle>
      <div className="space-y-3">
        {(comments.data ?? []).length === 0 ? <p className="px-1 text-sm text-muted">{t("maintenance.noComments")}</p> : null}
        {(comments.data ?? []).map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar name={nameOf(c.author_id)} className="size-8 text-xs" />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 ring-1 ring-border">
              <p className="text-xs text-muted">
                <span className="font-medium text-fg">{c.author_id === userId ? t("common.you") : nameOf(c.author_id)}</span> · {formatRelative(c.created_at, locale)}
              </p>
              <p className="mt-0.5 whitespace-pre-line text-[15px]">{c.body}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendComment} className="mt-4 flex items-end gap-2">
        <textarea
          rows={1}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("maintenance.commentPlaceholder")}
          aria-label={t("maintenance.commentPlaceholder")}
          className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-[16px] outline-none focus:border-accent"
        />
        <Button type="submit" className="size-11 rounded-full px-0" aria-label={t("common.send")} disabled={!comment.trim()} loading={pending && Boolean(comment.trim())}>
          <Send className="size-4" />
        </Button>
      </form>
    </>
  );
}
