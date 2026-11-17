"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Pencil, Phone, Plus, Send, Tag, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import {
  Badge,
  Button,
  Card,
  Chips,
  EmptyState,
  Fab,
  IconButton,
  LabeledInput,
  LabeledSelect,
  LabeledTextarea,
  LoadingList,
  PageHeader,
  Sheet,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { must, useAction } from "@/lib/hooks";
import { shareText } from "@/lib/speech";
import { getSupabase } from "@/lib/supabase";
import { GUIDE_KINDS, type GuideItem, type GuideKind } from "@/lib/types";

function mapUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function GuidePage() {
  const { t, locale } = useI18n();
  const { isManager, hotel } = useMember();
  const { toast } = useToast();
  const { run } = useAction();
  const [kind, setKind] = useState<GuideKind | "all">("all");
  const [editing, setEditing] = useState<GuideItem | "new" | null>(null);

  const items = useQuery({
    queryKey: ["guide"],
    queryFn: async () => (await must(getSupabase().from("guide_items").select("*").order("created_at", { ascending: false }))) as GuideItem[],
  });

  const list = useMemo(() => {
    const now = Date.now();
    const filtered = (items.data ?? []).filter((i) => kind === "all" || i.kind === kind);
    // Eventos futuros primeiro (por data), depois o restante; eventos passados ao final
    const score = (i: GuideItem) => (i.starts_at ? (new Date(i.starts_at).getTime() >= now ? 0 : 2) : 1);
    return [...filtered].sort((a, b) => score(a) - score(b) || (a.starts_at && b.starts_at ? a.starts_at.localeCompare(b.starts_at) : 0));
  }, [items.data, kind]);

  async function sendToGuest(i: GuideItem) {
    const lines = [i.title, i.description, i.starts_at ? formatDateTime(i.starts_at, locale) : null, i.price, i.address, i.contact, i.address ? mapUrl(i.address) : null, `— ${hotel.name}`];
    const result = await shareText(lines.filter(Boolean).join("\n"), i.title);
    if (result === "copied") toast(t("common.copied"), "success");
  }

  return (
    <>
      <PageHeader title={t("guide.title")} back="/" />
      <Chips
        value={kind}
        onChange={setKind}
        options={[{ value: "all" as const, label: t("common.all") }, ...GUIDE_KINDS.map((k) => ({ value: k, label: t(`guide.kinds.${k}`) }))]}
        className="mb-4"
      />

      {items.isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState icon={<MapPin />} title={t("guide.noItems")} description={isManager ? t("guide.noItemsManager") : undefined} />
      ) : (
        <div className="space-y-3">
          {list.map((i) => {
            const past = i.starts_at && new Date(i.starts_at).getTime() < Date.now();
            return (
              <Card key={i.id} className={cn("p-4", past && "opacity-60")}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <Badge tone="accent">{t(`guide.kinds.${i.kind}`)}</Badge>
                      {past ? <Badge>{t("guide.past")}</Badge> : null}
                    </div>
                    <h2 className="text-[17px] font-semibold leading-snug">{i.title}</h2>
                  </div>
                  {isManager ? (
                    <div className="-mr-2 -mt-1 flex">
                      <IconButton label={t("common.edit")} onClick={() => setEditing(i)}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label={t("common.delete")}
                        className="text-muted"
                        onClick={() => window.confirm(t("common.deleteConfirm")) && run(() => must(getSupabase().from("guide_items").delete().eq("id", i.id)), { invalidate: [["guide"]], push: false })}
                      >
                        <Trash className="size-4" />
                      </IconButton>
                    </div>
                  ) : null}
                </div>
                {i.description ? <p className="mt-1.5 whitespace-pre-line text-[15px] text-muted">{i.description}</p> : null}
                <ul className="mt-3 space-y-1.5 text-sm">
                  {i.starts_at ? (
                    <li className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-muted" /> {formatDateTime(i.starts_at, locale)}
                    </li>
                  ) : null}
                  {i.price ? (
                    <li className="flex items-center gap-2">
                      <Tag className="size-4 text-muted" /> {i.price}
                    </li>
                  ) : null}
                  {i.address ? (
                    <li className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-muted" /> <span className="truncate">{i.address}</span>
                    </li>
                  ) : null}
                  {i.contact ? (
                    <li className="flex items-center gap-2">
                      <Phone className="size-4 text-muted" /> {i.contact}
                    </li>
                  ) : null}
                </ul>
                <div className="mt-4 flex gap-2">
                  {i.address ? (
                    <a href={mapUrl(i.address)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-subtle px-3 text-sm font-medium">
                      <MapPin className="size-4" /> {t("guide.openMap")}
                    </a>
                  ) : null}
                  <Button size="sm" variant="ghost" icon={<Send className="size-4" />} onClick={() => sendToGuest(i)}>
                    {t("guide.sendToGuest")}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isManager ? (
        <>
          <Fab label={t("guide.newItem")} icon={<Plus />} onClick={() => setEditing("new")} />
          {editing ? <GuideSheet item={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
        </>
      ) : null}
    </>
  );
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function GuideSheet({ item, onClose }: { item: GuideItem | null; onClose: () => void }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [form, setForm] = useState({
    kind: item?.kind ?? ("tour" as GuideKind),
    title: item?.title ?? "",
    description: item?.description ?? "",
    address: item?.address ?? "",
    starts_at: toLocalInput(item?.starts_at ?? null),
    price: item?.price ?? "",
    contact: item?.contact ?? "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const opt = `(${t("common.optional")})`;

  async function save() {
    if (form.title.trim().length < 2) return;
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      price: form.price.trim() || null,
      contact: form.contact.trim() || null,
    };
    const table = getSupabase().from("guide_items");
    const res = await run(() => must(item ? table.update(payload).eq("id", item.id) : table.insert(payload)), {
      success: "common.saved",
      invalidate: [["guide"]],
      push: false,
    });
    if (res.ok) onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={item ? t("common.edit") : t("guide.newItem")}
      footer={
        <Button block size="lg" loading={pending} disabled={form.title.trim().length < 2} onClick={save}>
          {t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4">
        <LabeledSelect label={t("guide.kind")} value={form.kind} onChange={set("kind")}>
          {GUIDE_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`guide.kinds.${k}`)}
            </option>
          ))}
        </LabeledSelect>
        <LabeledInput label={t("guide.itemTitle")} maxLength={120} value={form.title} onChange={set("title")} />
        <LabeledTextarea label={`${t("guide.description")} ${opt}`} rows={3} maxLength={2000} value={form.description} onChange={set("description")} />
        <LabeledInput label={`${t("guide.when")} ${opt}`} type="datetime-local" value={form.starts_at} onChange={set("starts_at")} />
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label={`${t("guide.price")} ${opt}`} maxLength={60} value={form.price} onChange={set("price")} />
          <LabeledInput label={`${t("guide.contact")} ${opt}`} maxLength={120} value={form.contact} onChange={set("contact")} />
        </div>
        <LabeledInput label={`${t("guide.address")} ${opt}`} maxLength={200} value={form.address} onChange={set("address")} />
      </div>
    </Sheet>
  );
}
