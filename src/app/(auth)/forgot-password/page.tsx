"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button, LabeledInput } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { authErrorKey } from "../auth-errors";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) return setError(t(authErrorKey(err)));
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">{t("auth.forgotTitle")}</h1>
      <p className="text-sm text-muted">{sent ? t("auth.linkSent") : t("auth.forgotDesc")}</p>
      {!sent ? (
        <>
          <LabeledInput label={t("auth.email")} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" block size="lg" loading={loading}>
            {t("auth.sendLink")}
          </Button>
        </>
      ) : null}
      <Link href="/login" className="block pt-2 text-center text-sm font-medium text-accent">
        {t("auth.backToLogin")}
      </Link>
    </form>
  );
}
