"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Splash } from "@/components/providers/providers";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (ready && session) router.replace("/");
  }, [ready, session, router]);

  if (!ready || session) return <Splash />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <div className="mt-10 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={48} height={48} className="mb-5 size-12 rounded-2xl" />
        <p className="text-3xl font-semibold tracking-tight">HotelFlow</p>
        <p className="mt-1 text-muted">{t("auth.tagline")}</p>
      </div>
      {children}
    </main>
  );
}
