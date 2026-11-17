"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button, Card, EmptyState, IconButton, LoadingList, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { must } from "@/lib/hooks";
import { renderNotification } from "@/lib/notification-text";
import { getSupabase } from "@/lib/supabase";
import type { AppNotification } from "@/lib/types";

const PAGE = 30;

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const { userId } = useMember();
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["notifications", "list", userId],
    initialPageParam: 0,
    getNextPageParam: (last: AppNotification[], pages) => (last.length === PAGE ? pages.length * PAGE : undefined),
    queryFn: async ({ pageParam }) =>
      (await must(
        getSupabase()
          .from("notifications")
          .select("id, type, data, link, read_at, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + PAGE - 1),
      )) as AppNotification[],
  });

  const items = query.data?.pages.flat() ?? [];
  const hasUnread = items.some((n) => !n.read_at);

  async function markRead(ids?: string[]) {
    await getSupabase().rpc("mark_notifications_read", { p_ids: ids ?? null });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <>
      <PageHeader
        title={t("notifications.title")}
        actions={
          hasUnread ? (
            <IconButton label={t("notifications.markAllRead")} onClick={() => markRead()}>
              <CheckCheck className="size-5" />
            </IconButton>
          ) : null
        }
      />
      {query.isLoading ? (
        <LoadingList />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell />} title={t("notifications.empty")} />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {items.map((n) => {
            const { title, body } = renderNotification(locale, n.type, n.data);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read_at) markRead([n.id]);
                  if (n.link) router.push(n.link);
                }}
                className={cn("flex w-full gap-3 px-4 py-3.5 text-left transition hover:bg-subtle", !n.read_at && "bg-accent/[.04]")}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-accent")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[15px]", !n.read_at && "font-semibold")}>{title}</span>
                  <span className="block text-sm text-muted">{body}</span>
                  <span className="mt-0.5 block text-xs text-muted">{formatRelative(n.created_at, locale)}</span>
                </span>
              </button>
            );
          })}
        </Card>
      )}
      {query.hasNextPage ? (
        <Button block variant="ghost" className="mt-3" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
          {t("common.loadMore")}
        </Button>
      ) : null}
    </>
  );
}
