"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "success" | "error";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
  onClick?: () => void;
}
interface ToastValue {
  toast: (message: string, tone?: Tone, onClick?: () => void) => void;
}

const ToastContext = createContext<ToastValue | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Tone = "default", onClick?: () => void) => {
    const id = ++seq;
    setToasts((list) => [...list.slice(-2), { id, message, tone, onClick }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === "error" ? 5000 : 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
      >
        {toasts.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => {
              t.onClick?.();
              setToasts((list) => list.filter((x) => x.id !== t.id));
            }}
            className={cn(
              "pointer-events-auto w-full max-w-sm animate-[toast-in_.2s_ease-out] rounded-2xl px-4 py-3 text-left text-sm font-medium shadow-lg",
              t.tone === "error" && "bg-red-600 text-white",
              t.tone === "success" && "bg-fg text-bg",
              t.tone === "default" && "bg-fg text-bg",
            )}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast fora do ToastProvider");
  return ctx;
}
