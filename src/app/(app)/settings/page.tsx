"use client";

import { Bell, Check, ChevronRight, Download, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button, Card, Input, PageHeader, SectionTitle, Segmented } from "@/components/ui";
import { LOCALES, NATIVE_LANGUAGE_NAMES, type Locale } from "@/i18n/config";
import { translate } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { errorKey } from "@/lib/errors";
import { canPromptInstall, onInstallAvailabilityChange, promptInstall } from "@/lib/install";
import { disablePush, enablePush, getPushState, isIos, isStandalone, type PushState } from "@/lib/push";
import type { ThemePref } from "@/lib/types";

const VERSION = "1.0.0";

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { profile, hotel, isAdmin, updateProfile, signOut } = useMember();
  const { toast } = useToast();
  const [name, setName] = useState(profile.full_name);
  const [savingName, setSavingName] = useState(false);

  async function changeLanguage(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    try {
      await updateProfile({ locale: next });
      toast(translate(next, "settings.languageChanged"), "success");
    } catch (err) {
      toast(translate(next, errorKey(err)), "error");
    }
  }

  async function changeTheme(next: ThemePref) {
    setTheme(next);
    updateProfile({ theme: next }).catch(() => {});
  }

  async function saveName() {
    setSavingName(true);
    try {
      await updateProfile({ full_name: name.trim() });
      toast(t("common.saved"), "success");
    } catch (err) {
      toast(t(errorKey(err)), "error");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <>
      <PageHeader title={t("settings.title")} />

      <SectionTitle>{t("settings.language")}</SectionTitle>
      <Card className="divide-y divide-border" role="radiogroup" aria-label={t("settings.language")}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={locale === l}
            lang={l}
            onClick={() => changeLanguage(l)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
          >
            <span className="flex-1 text-[15px] font-medium">{NATIVE_LANGUAGE_NAMES[l]}</span>
            {locale === l ? <Check className="size-5 text-accent" /> : null}
          </button>
        ))}
      </Card>
      <p className="mt-1.5 px-1 text-xs text-muted">{t("settings.languageHint")}</p>

      <SectionTitle>{t("settings.theme")}</SectionTitle>
      <Segmented
        value={theme}
        onChange={changeTheme}
        options={(["system", "light", "dark"] as const).map((v) => ({ value: v, label: t(`settings.themes.${v}`) }))}
      />

      <SectionTitle>{t("settings.profile")}</SectionTitle>
      <Card className="p-4">
        <label htmlFor="name" className="text-sm font-medium">
          {t("settings.yourName")}
        </label>
        <div className="mt-1.5 flex gap-2">
          <Input id="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="outline" loading={savingName} disabled={!name.trim() || name.trim() === profile.full_name} onClick={saveName}>
            {t("common.save")}
          </Button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">{t("settings.role")}</dt>
            <dd className="font-medium">{t(`roles.${profile.role}`)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("settings.department")}</dt>
            <dd className="font-medium">{t(`departments.${profile.department}`)}</dd>
          </div>
        </dl>
      </Card>

      <SectionTitle>{t("settings.notifications")}</SectionTitle>
      <PushCard />

      <SectionTitle>{t("settings.install")}</SectionTitle>
      <InstallCard />

      <SectionTitle>{t("settings.hotel")}</SectionTitle>
      <Card className="divide-y divide-border">
        <div className="px-4 py-3.5">
          <p className="font-medium">{hotel.name}</p>
          {hotel.city ? <p className="text-sm text-muted">{hotel.city}</p> : null}
        </div>
        {isAdmin ? (
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5">
            <Users className="size-5 text-muted" />
            <span className="flex-1 font-medium">{t("settings.manageTeam")}</span>
            <ChevronRight className="size-5 text-muted" />
          </Link>
        ) : null}
      </Card>

      <Button block variant="outline" size="lg" className="mt-6 text-red-600" icon={<LogOut className="size-4" />} onClick={signOut}>
        {t("settings.signOut")}
      </Button>
      <p className="mt-4 text-center text-xs text-muted">HotelFlow · {t("settings.version", { version: VERSION })}</p>
    </>
  );
}

function PushCard() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      setState(state === "enabled" ? await disablePush() : await enablePush());
    } catch (err) {
      toast(t(errorKey(err)), "error");
    } finally {
      setBusy(false);
    }
  }

  const message: Partial<Record<PushState, string>> = {
    enabled: t("settings.pushEnabled"),
    denied: t("settings.pushDenied"),
    unsupported: t("settings.pushUnsupported"),
    "ios-needs-install": t("settings.pushIos"),
    unavailable: t("settings.pushUnavailable"),
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Bell className={cn("size-5", state === "enabled" ? "text-accent" : "text-muted")} />
        <p className="flex-1 text-sm">{state ? (message[state] ?? t("settings.pushEnable")) : t("common.loading")}</p>
      </div>
      {state === "enabled" || state === "disabled" || state === "unavailable" ? (
        <Button block className="mt-3" variant={state === "enabled" ? "outline" : "primary"} loading={busy} onClick={toggle}>
          {state === "enabled" ? t("settings.pushDisable") : t("settings.pushEnable")}
        </Button>
      ) : null}
    </Card>
  );
}

function InstallCard() {
  const { t } = useI18n();
  const canPrompt = useSyncExternalStore(onInstallAvailabilityChange, canPromptInstall, () => false);
  const installed = isStandalone();

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 size-5 text-muted" />
        <div className="flex-1 text-sm">
          {installed ? (
            <p>{t("settings.installed")}</p>
          ) : (
            <>
              <p>{t("settings.installDesc")}</p>
              {!canPrompt ? <p className="mt-2 text-muted">{isIos() ? t("settings.installIos") : t("settings.installAndroid")}</p> : null}
            </>
          )}
        </div>
      </div>
      {!installed && canPrompt ? (
        <Button block className="mt-3" onClick={() => promptInstall()}>
          {t("settings.installButton")}
        </Button>
      ) : null}
    </Card>
  );
}
