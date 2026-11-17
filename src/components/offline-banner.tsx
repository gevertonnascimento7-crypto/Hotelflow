"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "./providers/i18n-provider";

export function OfflineBanner() {
  const { t } = useI18n();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-[70] flex items-center justify-center gap-2 bg-amber-500 px-4 pb-1.5 pt-[calc(env(safe-area-inset-top)+0.375rem)] text-xs font-medium text-black">
      <WifiOff className="size-3.5" /> {t("common.offline")}
    </div>
  );
}
