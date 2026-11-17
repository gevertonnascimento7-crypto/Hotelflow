"use client";

import { DatabaseZap, Settings2 } from "lucide-react";
import { useI18n } from "./providers/i18n-provider";
import { LanguageSwitcher } from "./language-switcher";

export function SetupScreen({ kind }: { kind: "env" | "db" }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 py-10">
      <div className="text-accent [&_svg]:size-10">{kind === "env" ? <Settings2 /> : <DatabaseZap />}</div>
      <h1 className="text-2xl font-semibold tracking-tight">{kind === "env" ? t("setup.title") : t("setup.dbTitle")}</h1>
      <p className="text-muted">{kind === "env" ? t("setup.envDesc") : t("setup.dbDesc")}</p>
      <LanguageSwitcher className="mt-4" />
    </main>
  );
}
