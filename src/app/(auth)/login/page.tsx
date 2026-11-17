"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button, LabeledInput } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { authErrorKey } from "../auth-errors";

export default function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) setError(t(authErrorKey(err)));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">{t("auth.loginTitle")}</h1>
      <LabeledInput label={t("auth.email")} type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <LabeledInput label={t("auth.password")} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" block size="lg" loading={loading}>
        {t("auth.signIn")}
      </Button>
      <div className="flex flex-col items-center gap-3 pt-2 text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-fg">
          {t("auth.forgot")}
        </Link>
        <p className="text-muted">
          {t("auth.noAccount")}{" "}
          <Link href="/signup" className="font-medium text-accent">
            {t("auth.signUp")}
          </Link>
        </p>
      </div>
    </form>
  );
}
