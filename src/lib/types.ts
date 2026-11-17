import type { Locale } from "@/i18n/config";

export type Role = "admin" | "supervisor" | "staff";
export type Department = "reception" | "housekeeping" | "maintenance" | "food_beverage" | "management" | "general";
export type ThemePref = "system" | "light" | "dark";

export const DEPARTMENTS: Department[] = ["reception", "housekeeping", "maintenance", "food_beverage", "management", "general"];
export const ROLES: Role[] = ["staff", "supervisor", "admin"];

export interface Profile {
  id: string;
  hotel_id: string | null;
  full_name: string;
  role: Role;
  department: Department;
  locale: Locale;
  theme: ThemePref;
  active: boolean;
  created_at: string;
}

export interface Hotel {
  id: string;
  name: string;
  city: string | null;
  created_at: string;
}

export interface Shift {
  id: string;
  hotel_id: string;
  user_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  kind: "work" | "off" | "vacation";
  notes: string | null;
}

export type SwapStatus = "pending_peer" | "pending_approval" | "approved" | "rejected" | "declined" | "cancelled";
export interface ShiftSwap {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  target_id: string;
  target_shift_id: string | null;
  reason: string | null;
  status: SwapStatus;
  decision_note: string | null;
  created_at: string;
  requester_shift?: Shift | null;
  target_shift?: Shift | null;
}

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  kind: "day_off" | "vacation" | "hour_bank";
  reason: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  entry_date: string;
  minutes: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface ChecklistItem {
  label: string;
  done?: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: string[];
  active: boolean;
}

export type RunStatus = "in_progress" | "completed" | "inspected";
export interface ChecklistRun {
  id: string;
  template_id: string | null;
  template_name: string;
  room: string;
  items: ChecklistItem[];
  notes: string | null;
  status: RunStatus;
  created_by: string;
  completed_at: string | null;
  inspected_by: string | null;
  inspected_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TicketStatus = "open" | "in_progress" | "resolved" | "cancelled";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketCategory = "electrical" | "plumbing" | "hvac" | "furniture" | "electronics" | "cleaning" | "other";
export const TICKET_CATEGORIES: TicketCategory[] = ["electrical", "plumbing", "hvac", "furniture", "electronics", "cleaning", "other"];
export const TICKET_PRIORITIES: TicketPriority[] = ["low", "normal", "high", "urgent"];

export interface Ticket {
  id: string;
  code: number;
  title: string;
  description: string | null;
  location: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  photo_path: string | null;
  created_by: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export type LostStatus = "stored" | "returned" | "discarded";
export type LostCategory = "documents" | "electronics" | "clothing" | "accessories" | "money" | "other";
export const LOST_CATEGORIES: LostCategory[] = ["documents", "electronics", "clothing", "accessories", "money", "other"];
export interface LostItem {
  id: string;
  title: string;
  description: string | null;
  category: LostCategory;
  location: string | null;
  found_at: string;
  photo_path: string | null;
  status: LostStatus;
  owner_name: string | null;
  owner_contact: string | null;
  created_by: string;
  closed_at: string | null;
  created_at: string;
}

export type GuideKind = "tour" | "event" | "food" | "service";
export const GUIDE_KINDS: GuideKind[] = ["tour", "event", "food", "service"];
export interface GuideItem {
  id: string;
  kind: GuideKind;
  title: string;
  description: string | null;
  address: string | null;
  starts_at: string | null;
  price: string | null;
  contact: string | null;
  created_at: string;
}

export interface CustomPhrase {
  id: string;
  category: string;
  text_pt: string;
  text_en: string;
  text_es: string;
}

export interface TrainingModuleRow {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  created_at: string;
}

export interface TrainingProgress {
  user_id: string;
  module_key: string;
  score: number | null;
  completed_at: string;
}

export interface ServiceScriptRow {
  id: string;
  title: string;
  steps: { instruction: string; say?: string }[];
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  link: string | null;
  read_at: string | null;
  created_at: string;
}
