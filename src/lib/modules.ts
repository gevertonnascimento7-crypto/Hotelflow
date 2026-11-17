import {
  ArrowLeftRight,
  CalendarClock,
  ClipboardCheck,
  Coins,
  GraduationCap,
  Languages,
  MapPin,
  MessageSquareText,
  PackageSearch,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "swaps"
  | "housekeeping"
  | "maintenance"
  | "phrases"
  | "guide"
  | "lostFound"
  | "training"
  | "schedule"
  | "scripts"
  | "exchange";

export const MODULES: { key: ModuleKey; href: string; icon: LucideIcon }[] = [
  { key: "swaps", href: "/swaps", icon: ArrowLeftRight },
  { key: "housekeeping", href: "/housekeeping", icon: ClipboardCheck },
  { key: "maintenance", href: "/maintenance", icon: Wrench },
  { key: "phrases", href: "/phrases", icon: Languages },
  { key: "guide", href: "/guide", icon: MapPin },
  { key: "lostFound", href: "/lost-found", icon: PackageSearch },
  { key: "training", href: "/training", icon: GraduationCap },
  { key: "schedule", href: "/schedule?tab=leave", icon: CalendarClock },
  { key: "scripts", href: "/scripts", icon: MessageSquareText },
  { key: "exchange", href: "/exchange", icon: Coins },
];
