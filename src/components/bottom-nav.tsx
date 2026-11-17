"use client";

import { Bell, CalendarDays, House, Settings, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useI18n } from "./providers/i18n-provider";
import { useUnreadCount } from "./providers/notifications-provider";

const items = [
  { href: "/", key: "nav.home", icon: House },
  { href: "/schedule", key: "nav.schedule", icon: CalendarDays },
  { href: "/maintenance", key: "nav.maintenance", icon: Wrench },
  { href: "/notifications", key: "nav.notifications", icon: Bell },
  { href: "/settings", key: "nav.settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const unread = useUnreadCount();

  return (
    <nav
      aria-label="HotelFlow"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-2xl">
        {items.map(({ href, key, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition", active ? "text-fg" : "text-muted")}
              >
                <span className="relative">
                  <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                  {href === "/notifications" && unread > 0 ? (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </span>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
