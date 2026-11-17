"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { renderNotification } from "@/lib/notification-text";
import { getSupabase } from "@/lib/supabase";
import type { AppNotification } from "@/lib/types";
import { useAuth } from "./auth-provider";
import { useI18n } from "./i18n-provider";
import { useToast } from "./toast-provider";

const UnreadContext = createContext(0);

/** Avisos em tempo real: contador, toast e atualização das telas abertas. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, hotel } = useAuth();
  const { locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = user?.id;

  const unread = useQuery({
    queryKey: ["notifications", "unread", uid],
    enabled: Boolean(uid && hotel),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await getSupabase()
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid!)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!uid || !hotel) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          const n = payload.new as AppNotification;
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          // Atualiza as telas relacionadas ao aviso recebido
          if (n.type.startsWith("swap")) queryClient.invalidateQueries({ queryKey: ["swaps"] });
          if (n.type.startsWith("leave") || n.type.startsWith("hours") || n.type.startsWith("swap_approved"))
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
          if (n.type.startsWith("checklist")) queryClient.invalidateQueries({ queryKey: ["runs"] });
          if (n.type === "member_joined") queryClient.invalidateQueries({ queryKey: ["members"] });
          const { title } = renderNotification(locale, n.type, n.data);
          toast(title, "default", n.link ? () => router.push(n.link!) : undefined);
        },
      )
      .subscribe();

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "hotelflow:push") queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      supabase.removeChannel(channel);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [uid, hotel, locale, queryClient, router, toast]);

  // Badge no ícone do app (Android/desktop)
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    const count = unread.data ?? 0;
    if (count > 0) nav.setAppBadge?.(count).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [unread.data]);

  return <UnreadContext.Provider value={unread.data ?? 0}>{children}</UnreadContext.Provider>;
}

export function useUnreadCount() {
  return useContext(UnreadContext);
}
