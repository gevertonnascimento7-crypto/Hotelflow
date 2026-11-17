"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizeLocale } from "@/i18n/config";
import { isMissingSchemaError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";
import type { Hotel, Profile } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { useTheme } from "./theme-provider";

interface AuthValue {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  hotel: Hotel | null;
  profileReady: boolean;
  schemaMissing: boolean;
  isManager: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, "full_name" | "locale" | "theme">>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => active && setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") router.replace("/reset-password");
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase, router, queryClient]);

  const uid = session?.user.id;

  const profileQuery = useQuery({
    queryKey: ["profile", uid],
    enabled: Boolean(uid),
    staleTime: 60_000,
    retry: (count, err) => !isMissingSchemaError(err) && count < 2,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
  const profile = profileQuery.data ?? null;

  const hotelQuery = useQuery({
    queryKey: ["hotel", profile?.hotel_id],
    enabled: Boolean(profile?.hotel_id && profile.active),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("hotels").select("id, name, city, created_at").eq("id", profile!.hotel_id!).maybeSingle();
      if (error) throw error;
      return data as Hotel | null;
    },
  });

  // A preferência salva na conta vale em qualquer aparelho.
  useEffect(() => {
    if (!profile) return;
    const saved = normalizeLocale(profile.locale);
    if (saved !== locale) setLocale(saved);
    if (profile.theme && profile.theme !== theme) setTheme(profile.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.locale, profile?.theme]);

  const refreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile", uid] });
    await queryClient.invalidateQueries({ queryKey: ["hotel"] });
  }, [queryClient, uid]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, "full_name" | "locale" | "theme">>) => {
      if (!uid) return;
      queryClient.setQueryData<Profile | null>(["profile", uid], (old) => (old ? { ...old, ...patch } : old));
      const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
      if (error) {
        await refreshProfile();
        throw error;
      }
    },
    [queryClient, refreshProfile, supabase, uid],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    router.replace("/login");
  }, [supabase, queryClient, router]);

  const value = useMemo<AuthValue>(() => {
    const member = profile?.active && profile.hotel_id ? profile : null;
    return {
      ready: session !== undefined,
      session: session ?? null,
      user: session?.user ?? null,
      profile,
      hotel: member ? (hotelQuery.data ?? null) : null,
      profileReady: !uid || (profileQuery.isFetched && (!member || hotelQuery.isFetched)),
      schemaMissing: isMissingSchemaError(profileQuery.error),
      isManager: Boolean(member && (member.role === "admin" || member.role === "supervisor")),
      isAdmin: Boolean(member && member.role === "admin"),
      refreshProfile,
      updateProfile,
      signOut,
    };
  }, [session, profile, hotelQuery.data, hotelQuery.isFetched, profileQuery.isFetched, profileQuery.error, uid, refreshProfile, updateProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}

/** Atalho para páginas internas: garante perfil e hotel carregados. */
export function useMember() {
  const auth = useAuth();
  return {
    ...auth,
    profile: auth.profile as Profile,
    hotel: auth.hotel as Hotel,
    userId: auth.user?.id as string,
  };
}
