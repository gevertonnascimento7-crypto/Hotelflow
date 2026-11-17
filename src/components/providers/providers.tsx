"use client";

import { useEffect, useState, type ReactNode } from "react";
import { captureInstallPrompt } from "@/lib/install";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SetupScreen } from "../setup-screen";
import { AuthProvider } from "./auth-provider";
import { I18nProvider } from "./i18n-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={56} height={56} className="size-14 animate-pulse rounded-2xl" />
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    captureInstallPrompt();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  // Todo o app roda no aparelho: evitamos diferenças entre servidor e cliente.
  if (!mounted) return <Splash />;

  return (
    <QueryProvider>
      <I18nProvider>
        <ThemeProvider>
          <ToastProvider>{isSupabaseConfigured ? <AuthProvider>{children}</AuthProvider> : <SetupScreen kind="env" />}</ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
