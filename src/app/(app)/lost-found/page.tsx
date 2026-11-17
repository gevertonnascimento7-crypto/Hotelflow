"use client";

import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Plus, Search, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { PhotoPicker, SignedImage } from "@/components/photo";
import { useMember } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  Badge,
  Button,
  Card,
  Chips,
  EmptyState,
  Fab,
  Input,
  LabeledInput,
  LabeledSelect,
  LabeledTextarea,
  LoadingList,
  PageHeader,
  Sheet,
} from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { must, useAction, useMembers } from "@/lib/hooks";
import { removePhoto, uploadPhoto } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import { LOST_CATEGORIES, type LostCategory, type LostItem, type LostStatus } from "@/lib/types";

const tone: Record<LostStatus, "warning" | "success" | "neutral"> = { stored: "warning", returned: "success", discarded: "neutral" };

function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export default function LostFoundPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<LostStatus | "all">("stored");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useQuery({
    queryKey: ["lost"],
    queryFn: async () => (await must(getSupabase().from("lost_items").select("*").order("found_at", { ascending: false }).limit(300))) as LostItem[],
  });

  const list = useMemo(() => {
    const q = normalize(search.trim());
    return (items.data ?? []).filter(
      (i) =>
        (status === "all" || i.status === status) &&
        (!q || normalize(`${i.title} ${i.description ?? ""} ${i.location ?? ""} ${i.owner_name ?? ""}`).includes(q)),
    );
  }, [items.data, status, search]);

  const selected = (items.data ?? []).find((i) => i.id === openId) ?? null;

  return (
    <>
      <PageHeader title={t("lostFound.title")} back="/" />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input type="search" placeholder={t("lostFound.searchPlaceholder")} aria-label={t("common.search")} className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Chips
        value={status}
        onChange={setStatus}
        options={[
          { value: "stored" as const, label: t("lostFound.statuses.stored") },
          { value: "returned" as const, label: t("lostFound.statuses.returned") },
          { value: "discarded" as const, label: t("lostFound.statuses.discarded") },
          { value: "all" as const, label: t("common.all") },
        ]}
        className="mb-4"
      />

      {items.isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState icon={<PackageSearch />} title={t("lostFound.noItems")} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((i) => (
            <button key={i.id} type="button" onClick={() => setOpenId(i.id)} className="text-left">
              <Card className="h-full overflow-hidden transition active:scale-[.98]">
                {i.photo_path ? (
                  <SignedImage path={i.photo_path} className="aspect-square w-full" alt={i.title} />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-subtle text-muted">
                    <PackageSearch className="size-8" />
                  </div>
                )}
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="truncate text-xs text-muted">{i.location || t(`lostFound.categories.${i.category}`)}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(i.found_at, locale)}</p>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Fab label={t("lostFound.newItem")} icon={<Plus />} onClick={() => setCreating(true)} />
      {creating ? <NewItemSheet onClose={() => setCreating(false)} /> : null}
      {selected ? <ItemSheet item={selected} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

function NewItemSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { hotel } = useMember();
  const { run, pending } = useAction();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LostCategory>("other");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const valid = title.trim().length >= 2;

  async function save() {
    if (!valid) return;
    const res = await run(
      async () => {
        const photo_path = photo ? await uploadPhoto(hotel.id, "lost-found", photo) : null;
        return must(
          getSupabase().from("lost_items").insert({
            title: title.trim(),
            category,
            location: location.trim() || null,
            description: description.trim() || null,
            photo_path,
          }),
        );
      },
      { success: "common.saved", invalidate: [["lost"]], push: false },
    );
    if (res.ok) onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("lostFound.newItem")}
      footer={
        <Button block size="lg" loading={pending} disabled={!valid} onClick={save}>
          {t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4">
        <PhotoPicker value={photo} onChange={setPhoto} hint={t("lostFound.photoHint")} />
        <LabeledInput label={t("lostFound.itemTitle")} placeholder={t("lostFound.itemTitlePlaceholder")} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <LabeledSelect label={t("lostFound.category")} value={category} onChange={(e) => setCategory(e.target.value as LostCategory)}>
          {LOST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`lostFound.categories.${c}`)}
            </option>
          ))}
        </LabeledSelect>
        <LabeledInput label={t("lostFound.whereFound")} placeholder={t("lostFound.whereFoundPlaceholder")} maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} />
        <LabeledTextarea label={`${t("lostFound.description")} (${t("common.optional")})`} rows={2} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </Sheet>
  );
}

function ItemSheet({ item, onClose }: { item: LostItem; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { isManager } = useMember();
  const { nameOf } = useMembers();
  const { run, pending } = useAction();
  const [returning, setReturning] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");

  const update = async (patch: Partial<LostItem>) => {
    const res = await run(() => must(getSupabase().from("lost_items").update(patch).eq("id", item.id)), {
      success: "common.saved",
      invalidate: [["lost"]],
      push: false,
    });
    if (res.ok) onClose();
  };

  async function remove() {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    const res = await run(
      async () => {
        await must(getSupabase().from("lost_items").delete().eq("id", item.id));
        await removePhoto(item.photo_path);
      },
      { invalidate: [["lost"]], push: false },
    );
    if (res.ok) onClose();
  }

  return (
    <Sheet open onClose={onClose} title={item.title}>
      <div className="space-y-4">
        {item.photo_path ? <SignedImage path={item.photo_path} className="max-h-80 w-full rounded-2xl" alt={item.title} /> : null}
        <div className="flex flex-wrap gap-2">
          <Badge tone={tone[item.status]}>{t(`lostFound.statuses.${item.status}`)}</Badge>
          <Badge>{t(`lostFound.categories.${item.category}`)}</Badge>
        </div>
        <dl className="space-y-1 text-sm">
          <p className="text-muted">{t("lostFound.foundOn", { date: formatDateTime(item.found_at, locale) })}</p>
          {item.location ? <p>{item.location}</p> : null}
          {item.description ? <p className="whitespace-pre-line">{item.description}</p> : null}
          <p className="text-xs text-muted">{t("common.byName", { name: nameOf(item.created_by) })}</p>
          {item.status === "returned" && item.owner_name ? (
            <p className="pt-1 font-medium">
              {t("lostFound.returnedTo", { name: item.owner_name })}
              {item.owner_contact ? ` · ${item.owner_contact}` : ""}
            </p>
          ) : null}
        </dl>

        {item.status === "stored" ? (
          returning ? (
            <div className="space-y-3 rounded-2xl bg-subtle p-4">
              <LabeledInput label={t("lostFound.ownerName")} maxLength={120} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              <LabeledInput label={t("lostFound.ownerContact")} maxLength={120} value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)} />
              <Button
                block
                loading={pending}
                disabled={!ownerName.trim()}
                onClick={() => update({ status: "returned", owner_name: ownerName.trim(), owner_contact: ownerContact.trim() || null })}
              >
                {t("common.confirm")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" loading={pending} onClick={() => update({ status: "discarded" })}>
                {t("lostFound.discard")}
              </Button>
              <Button onClick={() => setReturning(true)}>{t("lostFound.registerReturn")}</Button>
            </div>
          )
        ) : (
          <Button block variant="outline" loading={pending} onClick={() => update({ status: "stored", owner_name: null, owner_contact: null })}>
            {t("lostFound.restore")}
          </Button>
        )}
        {isManager ? (
          <Button block variant="ghost" className="text-red-600" icon={<Trash className="size-4" />} onClick={remove}>
            {t("common.delete")}
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
