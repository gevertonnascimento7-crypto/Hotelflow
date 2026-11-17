"use client";

import { Camera, ImageOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { compressImage } from "@/lib/image";
import { useSignedUrl } from "@/lib/storage";
import { useI18n } from "./providers/i18n-provider";
import { useToast } from "./providers/toast-provider";

/** Seletor de foto: abre a câmera no celular e comprime antes do envio. */
export function PhotoPicker({ value, onChange, hint }: { value: Blob | null; onChange: (blob: Blob | null) => void; hint?: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!value) return setPreview(null);
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } catch {
      toast(t("errors.photoTooLarge"), "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="photo-input" />
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-64 w-full object-cover" />
          <button
            type="button"
            aria-label={t("common.removePhoto")}
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm text-muted transition hover:border-accent hover:text-accent"
        >
          <Camera className={cn("size-6", busy && "animate-pulse")} />
          {hint ?? t("common.addPhoto")}
        </button>
      )}
    </div>
  );
}

/** Imagem privada do Storage (URL assinada temporária). */
export function SignedImage({ path, className, alt = "" }: { path: string | null | undefined; className?: string; alt?: string }) {
  const { data, isError } = useSignedUrl(path);
  if (!path) return null;
  if (isError)
    return (
      <div className={cn("flex items-center justify-center bg-subtle text-muted", className)}>
        <ImageOff className="size-6" />
      </div>
    );
  if (!data) return <div className={cn("animate-pulse bg-subtle", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={data} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
