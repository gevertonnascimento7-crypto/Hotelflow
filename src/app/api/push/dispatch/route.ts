import { NextResponse } from "next/server";
import { sendNotification, setVapidDetails } from "web-push";
import { normalizeLocale } from "@/i18n/config";
import { renderNotification } from "@/lib/notification-text";
import { getAdmin, getCaller, getVapidKeys, isPushConfigured } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/**
 * Envia por push os avisos que a ação do próprio usuário gerou.
 * Só considera notificações reais do banco (actor_id = quem chamou),
 * então ninguém consegue disparar mensagens arbitrárias.
 */
export async function POST(request: Request) {
  if (!isPushConfigured) return new NextResponse(null, { status: 204 });
  const user = await getCaller(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getAdmin();
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: pending } = await db
    .from("notifications")
    .select("id")
    .eq("actor_id", user.id)
    .is("pushed_at", null)
    .gte("created_at", since)
    .limit(100);
  if (!pending?.length) return NextResponse.json({ sent: 0 });

  // Reivindica os avisos (evita envio duplicado em chamadas simultâneas)
  const { data: claimed } = await db
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .in(
      "id",
      pending.map((n) => n.id),
    )
    .is("pushed_at", null)
    .select("id, user_id, type, data, link");
  if (!claimed?.length) return NextResponse.json({ sent: 0 });

  const recipients = [...new Set(claimed.map((n) => n.user_id as string))];
  const [{ data: subs }, { data: profiles }] = await Promise.all([
    db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", recipients),
    db.from("profiles").select("id, locale").in("id", recipients),
  ]);
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const keys = await getVapidKeys();
  setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hotelflow@example.com", keys.publicKey, keys.privateKey);
  const localeOf = new Map((profiles ?? []).map((p) => [p.id as string, normalizeLocale(p.locale)]));

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    claimed.flatMap((n) =>
      subs
        .filter((s) => s.user_id === n.user_id)
        .map(async (s) => {
          const { title, body } = renderNotification(localeOf.get(n.user_id as string) ?? "pt-BR", n.type as string, (n.data ?? {}) as Record<string, unknown>);
          try {
            await sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title, body, url: n.link ?? "/notifications", tag: n.id }),
              { TTL: 60 * 60 * 12, urgency: "high" },
            );
            sent++;
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) dead.push(s.id as string);
          }
        }),
    ),
  );
  if (dead.length) await db.from("push_subscriptions").delete().in("id", dead);
  return NextResponse.json({ sent });
}
