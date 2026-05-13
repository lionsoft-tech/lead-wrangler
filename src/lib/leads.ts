export type Urgency = "emergency" | "today" | "this_week" | "flexible";
export type LeadStatus = "new" | "called_back" | "converted" | "lost";

export interface Shop {
  id: string;
  name: string;
  user_id: string | null;
}

export interface Lead {
  id: number;
  shop_id: string | null;
  call_id: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  vehicle: string | null;
  problem: string | null;
  urgency: Urgency | null;
  callback_window: string | null;
  status: LeadStatus;
  created_at: string;
}

export interface CallRow {
  id: string;
  shop_id: string | null;
  started_at: string | null;
  duration_sec: number | null;
  caller_phone: string | null;
  recording_url: string | null;
  transcript: string | null;
  flagged_for_review: boolean;
  reviewed_by_operator: boolean;
}

export const URGENCY_RANK: Record<Urgency, number> = {
  emergency: 0,
  today: 1,
  this_week: 2,
  flexible: 3,
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  emergency: "EMERGENCY",
  today: "TODAY",
  this_week: "THIS WEEK",
  flexible: "FLEXIBLE",
};

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  called_back: "Called back",
  converted: "Converted",
  lost: "Lost",
};

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export function telHref(raw: string | null | undefined): string {
  if (!raw) return "#";
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}

export function formatDuration(sec: number | null | undefined): string {
  if (!sec && sec !== 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
