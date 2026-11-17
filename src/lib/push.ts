"use client";

import { getSupabase } from "./supabase";

export type PushState = "unsupported" | "ios-needs-install" | "denied" | "enabled" | "disabled" | "unavailable";

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return isIos() && !isStandalone() ? "ios-needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "enabled" : "disabled";
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await getSupabase().auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export async function enablePush(): Promise<PushState> {
  if (!supported()) return isIos() && !isStandalone() ? "ios-needs-install" : "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "disabled";

  const res = await fetch("/api/push/key", { headers: await authHeader() });
  if (!res.ok) return "unavailable";
  const { publicKey } = (await res.json()) as { publicKey: string };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(publicKey) });
  }
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await getSupabase().rpc("save_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_user_agent: navigator.userAgent.slice(0, 300),
  });
  if (error) throw error;
  return "enabled";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await getSupabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
  return "disabled";
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Pede ao servidor para enviar push dos avisos gerados pela ação do usuário. */
export function dispatchPush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      await fetch("/api/push/dispatch", { method: "POST", headers: await authHeader(), keepalive: true });
    } catch {
      /* push é complementar: os avisos já estão no app */
    }
  }, 400);
}
