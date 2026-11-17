"use client";

import { ChevronLeft, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useI18n } from "./providers/i18n-provider";

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "bg-subtle text-fg hover:bg-border",
  outline: "border border-border bg-surface text-fg hover:bg-subtle",
  ghost: "text-fg hover:bg-subtle",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-2xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, block, icon, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-fg transition hover:bg-subtle active:scale-95 disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Formulários                                                         */
/* ------------------------------------------------------------------ */
const fieldBase =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-[16px] text-fg placeholder:text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60";

export function Field({
  label,
  hint,
  children,
  htmlFor,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 3, ...props },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(fieldBase, "resize-none py-2.5 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(fieldBase, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 select-chevron", className)} {...props}>
      {children}
    </select>
  );
});

/** Campo com rótulo associado automaticamente. */
export function LabeledInput({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Input id={id} {...props} />
    </Field>
  );
}

export function LabeledTextarea({ label, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Textarea id={id} {...props} />
    </Field>
  );
}

export function LabeledSelect({
  label,
  hint,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <Select id={id} {...props}>
        {children}
      </Select>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* Seletores                                                           */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("flex rounded-xl bg-subtle p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 whitespace-nowrap rounded-lg px-2 font-medium transition",
            size === "sm" ? "h-8 text-[13px]" : "h-9 text-sm",
            value === o.value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition",
            value === o.value ? "border-fg bg-fg text-bg" : "border-border bg-surface text-muted hover:text-fg",
          )}
        >
          {o.label}
          {o.count ? <span className="ml-1.5 opacity-70">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Superfícies                                                         */
/* ------------------------------------------------------------------ */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface", className)} {...props}>
      {children}
    </div>
  );
}

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-subtle text-muted",
  accent: "bg-accent/10 text-accent",
  success: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  danger: "bg-red-500/12 text-red-700 dark:text-red-400",
  info: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle text-[13px] font-semibold text-fg", className)}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-muted [&_svg]:size-8">{icon}</div> : null}
      <p className="font-medium text-fg">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-5 animate-spin text-muted", className)} aria-hidden />;
}

export function LoadingList({ rows = 4 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2" aria-busy="true" aria-label={t("common.loading")}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-subtle" />
      ))}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho de página                                                 */
/* ------------------------------------------------------------------ */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: boolean | string;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-3 bg-bg/85 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
      <div className="flex min-h-11 items-center gap-1">
        {back ? (
          typeof back === "string" ? (
            <Link href={back} aria-label={t("common.back")} className="-ml-2 inline-flex size-10 items-center justify-center rounded-full hover:bg-subtle">
              <ChevronLeft className="size-6" />
            </Link>
          ) : (
            <IconButton label={t("common.back")} className="-ml-2" onClick={() => router.back()}>
              <ChevronLeft className="size-6" />
            </IconButton>
          )
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
          {subtitle ? <div className="truncate text-sm text-muted">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom sheet (formulários)                                          */
/* ------------------------------------------------------------------ */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label={t("common.close")} className="absolute inset-0 animate-[fade-in_.15s_ease-out] bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg animate-[sheet-in_.22s_cubic-bezier(.2,.8,.2,1)] flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl">
        <div className="flex items-center gap-2 px-5 pb-2 pt-4">
          <h2 id={titleId} className="flex-1 text-lg font-semibold text-fg">
            {title}
          </h2>
          <IconButton label={t("common.close")} onClick={onClose} className="-mr-2">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? <div className="border-t border-border px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">{footer}</div> : <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </div>
  );
}

/** Botão flutuante de "novo" acima da barra inferior. */
export function Fab({ label, onClick, icon }: { label: string; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-accent pl-4 pr-5 font-medium text-accent-fg shadow-lg shadow-black/10 transition active:scale-95 [&_svg]:size-5"
    >
      {icon}
      <span className="text-[15px]">{label}</span>
    </button>
  );
}
