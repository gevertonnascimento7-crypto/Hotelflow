"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemePref } from "@/lib/types";

const KEY = "hf-theme";
interface ThemeValue {
  theme: ThemePref;
  resolved: "light" | "dark";
  setTheme: (t: ThemePref) => void;
}
const ThemeContext = createContext<ThemeValue | null>(null);

function readTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(readTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0a0a0a" : "#fafafa");
  }, [resolved]);

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme fora do ThemeProvider");
  return ctx;
}
