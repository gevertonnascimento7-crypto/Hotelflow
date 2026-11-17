"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { useAuth } from "@/components/providers/auth-provider";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { Splash } from "@/components/providers/providers";
import { SetupScreen } from "@/components/setup-screen";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { ready, session, profileReady, hotel, schemaMissing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
    else if (profileReady && !hotel && !schemaMissing) router.replace("/onboarding");
  }, [ready, session, profileReady, hotel, schemaMissing, router]);

  if (schemaMissing) return <SetupScreen kind="db" />;
  if (!ready || !session || !profileReady || !hotel) return <Splash />;

  return (
    <NotificationsProvider>
      <OfflineBanner />
      <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-[calc(env(safe-area-inset-bottom)+10rem)]">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <BottomNav />
    </NotificationsProvider>
  );
}
