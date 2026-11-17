"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, RefreshCw, Share2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Avatar, Badge, Button, Card, IconButton, LabeledInput, PageHeader, SectionTitle, Select } from "@/components/ui";
import { must, useAction, useMembers } from "@/lib/hooks";
import { copyText, shareText } from "@/lib/speech";
import { getSupabase } from "@/lib/supabase";
import { DEPARTMENTS, ROLES, type Department, type Profile, type Role } from "@/lib/types";

export default function AdminPage() {
  const { t } = useI18n();
  const { hotel, isAdmin, userId, refreshProfile } = useMember();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { run, pending } = useAction();
  const { members, nameOf } = useMembers(true);
  const [name, setName] = useState(hotel.name);
  const [city, setCity] = useState(hotel.city ?? "");

  useEffect(() => {
    if (!isAdmin) router.replace("/settings");
  }, [isAdmin, router]);

  const code = useQuery({
    queryKey: ["invite-code", hotel.id],
    enabled: isAdmin,
    queryFn: async () => (await must(getSupabase().rpc("get_invite_code"))) as string,
  });

  if (!isAdmin) return null;

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/signup` : "";
  const shareMessage = t("admin.shareText", { hotel: hotel.name, url: inviteUrl, code: code.data ?? "" });

  async function saveHotel() {
    const res = await run(() => must(getSupabase().from("hotels").update({ name: name.trim(), city: city.trim() || null }).eq("id", hotel.id)), {
      success: "common.saved",
      push: false,
    });
    if (res.ok) await refreshProfile();
  }

  async function regenerate() {
    if (!window.confirm(t("admin.regenerateConfirm"))) return;
    const res = await run(() => must(getSupabase().rpc("regenerate_invite_code")), { push: false });
    if (res.ok) queryClient.setQueryData(["invite-code", hotel.id], res.data);
  }

  const updateMember = (m: Profile, patch: Partial<Pick<Profile, "role" | "department" | "active">>) =>
    run(
      () =>
        must(
          getSupabase().rpc("update_member", {
            p_user: m.id,
            p_role: patch.role ?? m.role,
            p_department: patch.department ?? m.department,
            p_active: patch.active ?? m.active,
          }),
        ),
      { success: "admin.memberSaved", invalidate: [["members"]], push: false },
    );

  async function remove(m: Profile) {
    if (!window.confirm(t("admin.removeConfirm", { name: nameOf(m.id) }))) return;
    await run(() => must(getSupabase().rpc("remove_member", { p_user: m.id })), { invalidate: [["members"]], push: false });
  }

  return (
    <>
      <PageHeader title={t("admin.title")} back="/settings" />

      <SectionTitle>{t("admin.inviteCode")}</SectionTitle>
      <Card className="p-4">
        <p className="select-all text-center font-mono text-3xl font-semibold tracking-[0.25em]" data-testid="invite-code">
          {code.data ?? "··········"}
        </p>
        <p className="mt-2 text-center text-sm text-muted">{t("admin.inviteHint")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            icon={<Copy className="size-4" />}
            disabled={!code.data}
            onClick={async () => (await copyText(code.data ?? "")) && toast(t("common.copied"), "success")}
          >
            {t("common.copy")}
          </Button>
          <Button
            icon={<Share2 className="size-4" />}
            disabled={!code.data}
            onClick={async () => (await shareText(shareMessage, "HotelFlow")) === "copied" && toast(t("common.copied"), "success")}
          >
            {t("common.share")}
          </Button>
        </div>
        <Button block variant="ghost" size="sm" className="mt-2 text-muted" icon={<RefreshCw className="size-4" />} onClick={regenerate}>
          {t("admin.regenerate")}
        </Button>
      </Card>

      <SectionTitle>{t("admin.hotelInfo")}</SectionTitle>
      <Card className="space-y-4 p-4">
        <LabeledInput label={t("onboarding.hotelName")} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        <LabeledInput label={t("onboarding.city")} maxLength={120} value={city} onChange={(e) => setCity(e.target.value)} />
        <Button block variant="outline" loading={pending} disabled={name.trim().length < 2} onClick={saveHotel}>
          {t("common.save")}
        </Button>
      </Card>

      <SectionTitle>
        {t("admin.members")} ({members.filter((m) => m.active).length})
      </SectionTitle>
      <div className="space-y-2">
        {members.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={m.full_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.full_name || "—"} {m.id === userId ? <span className="text-muted">({t("admin.you")})</span> : null}
                </p>
                {!m.active ? <Badge tone="danger">{t("admin.inactive")}</Badge> : null}
              </div>
              {m.id !== userId ? (
                <IconButton label={t("admin.removeMember")} className="text-muted" onClick={() => remove(m)}>
                  <UserMinus className="size-5" />
                </IconButton>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Select aria-label={t("settings.role")} value={m.role} onChange={(e) => updateMember(m, { role: e.target.value as Role })} className="h-10 text-sm">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={t("settings.department")}
                value={m.department}
                onChange={(e) => updateMember(m, { department: e.target.value as Department })}
                className="h-10 text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {t(`departments.${d}`)}
                  </option>
                ))}
              </Select>
            </div>
            {m.id !== userId ? (
              <Button block size="sm" variant="ghost" className="mt-2 text-muted" onClick={() => updateMember(m, { active: !m.active })}>
                {m.active ? t("admin.deactivate") : t("admin.reactivate")}
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </>
  );
}
