"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Splash } from "@/components/providers/providers";
import { SetupScreen } from "@/components/setup-screen";
import { Button, IconButton, LabeledInput, LabeledSelect, Segmented } from "@/components/ui";
import { errorKey } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";
import { DEPARTMENTS, type Department } from "@/lib/types";

export default function OnboardingPage() {
  const { t } = useI18n();
  const { ready, session, profile, hotel, profileReady, schemaMissing, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("join");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState<Department>("reception");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !session) router.replace("/login");
    if (profileReady && hotel) router.replace("/");
  }, [ready, session, profileReady, hotel, router]);

  if (schemaMissing) return <SetupScreen kind="db" />;
  if (!ready || !session || !profileReady || hotel) return <Splash />;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await getSupabase().rpc("create_hotel", { p_name: name.trim(), p_city: city.trim() || null });
    if (err) {
      setLoading(false);
      return setError(t(errorKey(err)));
    }
    await refreshProfile();
    router.replace("/");
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: err } = await getSupabase().rpc("join_hotel", { p_code: code, p_department: department });
    if (err || data !== "ok") {
      setLoading(false);
      return setError(t(errorKey(err ?? String(data))));
    }
    await refreshProfile();
    router.replace("/");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="flex items-center justify-between">
        <IconButton label={t("auth.signOut")} onClick={signOut} className="-ml-2">
          <LogOut className="size-5" />
        </IconButton>
        <LanguageSwitcher />
      </div>
      <div className="mb-6 mt-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("onboarding.title")}</h1>
        <p className="mt-1 text-muted">{t("onboarding.desc")}</p>
        {profile && !profile.active ? <p className="mt-3 text-sm text-amber-600">{t("onboarding.removedNotice")}</p> : null}
      </div>
      <Segmented
        value={tab}
        onChange={(v) => {
          setTab(v);
          setError(null);
        }}
        options={[
          { value: "join", label: t("onboarding.joinTab") },
          { value: "create", label: t("onboarding.createTab") },
        ]}
        className="mb-6"
      />
      {tab === "create" ? (
        <form onSubmit={onCreate} className="space-y-4">
          <LabeledInput label={t("onboarding.hotelName")} required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          <LabeledInput label={`${t("onboarding.city")} (${t("common.optional")})`} maxLength={120} value={city} onChange={(e) => setCity(e.target.value)} />
          <p className="text-sm text-muted">{t("onboarding.createHint")}</p>
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" block size="lg" loading={loading}>
            {t("onboarding.createButton")}
          </Button>
        </form>
      ) : (
        <form onSubmit={onJoin} className="space-y-4">
          <LabeledInput
            label={t("onboarding.inviteCode")}
            hint={t("onboarding.inviteHint")}
            required
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={14}
            className="font-mono tracking-[0.2em] uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <LabeledSelect label={t("onboarding.department")} value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {t(`departments.${d}`)}
              </option>
            ))}
          </LabeledSelect>
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" block size="lg" loading={loading}>
            {t("onboarding.joinButton")}
          </Button>
        </form>
      )}
    </main>
  );
}
