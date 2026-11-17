"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "./supabase";

export const BUCKET = "hotel-files";

/** Envia a foto para a pasta do hotel (as políticas só permitem a pasta do próprio hotel). */
export async function uploadPhoto(hotelId: string, folder: "lost-found" | "tickets", blob: Blob): Promise<string> {
  const path = `${hotelId}/${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removePhoto(path: string | null | undefined) {
  if (!path) return;
  await getSupabase().storage.from(BUCKET).remove([path]);
}

/** URL temporária e assinada (o bucket é privado). */
export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: Boolean(path),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
