"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button, LabeledInput } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { authErrorKey } from "../auth-errors";

export default function SignupPage() {
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(t("auth.weakPassword"));
    setLoading(true);
    setError(null);
    const { data, error: err } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), locale },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);
    if (err) return setError(t(authErrorKey(err)));
    if (data.user && data.user.identities && data.user.identities.length === 0) return setError(t("auth.userExists"));
    if (!data.session) setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{t("auth.checkEmailTitle")}</h1>
        <p className="text-muted">{t("auth.checkEmailDesc", { email: sentTo })}</p>
        <Link href="/login" className="inline-block pt-2 font-medium text-accent">
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">{t("auth.signupTitle")}</h1>
      <LabeledInput label={t("auth.fullName")} autoComplete="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
      <LabeledInput label={t("auth.email")} type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <LabeledInput
        label={t("auth.password")}
        hint={t("auth.passwordHint")}
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" block size="lg" loading={loading}>
        {t("auth.signUp")}
      </Button>
      <p className="pt-2 text-center text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-accent">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}
