import type { TicketPriority, TicketStatus } from "@/lib/types";

export const priorityDot: Record<TicketPriority, string> = {
  low: "bg-zinc-400",
  normal: "bg-sky-500",
  high: "bg-amber-500",
  urgent: "bg-red-600",
};

export const statusTone: Record<TicketStatus, "warning" | "info" | "success" | "neutral"> = {
  open: "warning",
  in_progress: "info",
  resolved: "success",
  cancelled: "neutral",
};
