"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Splash } from "@/components/providers/providers";
import { useToast } from "@/components/providers/toast-provider";
import { Button, LabeledInput } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { authErrorKey } from "../(auth)/auth-errors";

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const { ready, session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  if (!ready || !session) return <Splash />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(t("auth.weakPassword"));
    setLoading(true);
    const { error: err } = await getSupabase().auth.updateUser({ password });
    setLoading(false);
    if (err) return setError(t(authErrorKey(err)));
    toast(t("auth.passwordUpdated"), "success");
    router.replace("/");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="text-xl font-semibold">{t("auth.resetTitle")}</h1>
        <LabeledInput
          label={t("auth.newPassword")}
          hint={t("auth.passwordHint")}
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" block size="lg" loading={loading}>
          {t("auth.updatePassword")}
        </Button>
      </form>
    </main>
  );
}
