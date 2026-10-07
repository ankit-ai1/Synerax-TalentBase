import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fullName(c: { first_name?: string | null; middle_name?: string | null; last_name?: string | null }) {
  return [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ");
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** 12.5 -> "₹12.5 LPA" */
export function lpa(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `₹${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/0$/, "")} LPA`;
}

export function years(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (n === 0) return "Fresher";
  const y = Math.floor(n);
  const m = Math.round((n - y) * 12);
  if (m === 0) return `${y} yr${y === 1 ? "" : "s"}`;
  if (y === 0) return `${m} mo`;
  return `${y} yr${y === 1 ? "" : "s"} ${m} mo`;
}

export function noticeLabel(days: number | string | null | undefined) {
  if (days === null || days === undefined || days === "") return "—";
  const d = Number(days);
  if (d === 0) return "Immediate";
  if (d > 90) return "90+ days";
  return `${d} days`;
}

export function formatDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  const date = new Date(d.length === 10 ? d + "T00:00:00" : d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", opts ?? { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} days ago`;
  return formatDate(d);
}

export function age(dob: string | null | undefined) {
  if (!dob) return null;
  const b = new Date(dob + "T00:00:00");
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

/** Today's date in India time (the server runs on UTC) — "YYYY-MM-DD" */
export function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  const t = Date.parse(d.slice(0, 10) + "T00:00:00Z");
  const today = Date.parse(todayIST() + "T00:00:00Z");
  return Math.round((t - today) / 86400000);
}

export function fileSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function mask(v: string | null | undefined, visible = 4) {
  if (!v) return "—";
  if (v.length <= visible) return v;
  return "•".repeat(Math.max(v.length - visible, 2)) + v.slice(-visible);
}

/** Turns a Supabase/Postgres error into a readable message */
export function friendlyError(msg: string | undefined | null) {
  if (!msg) return "Something went wrong. Please try again.";
  if (msg.includes("DUPLICATE:")) return msg.split("DUPLICATE:")[1].trim();
  if (msg.includes("VALIDATION:")) return msg.split("VALIDATION:")[1].trim();
  if (msg.includes("invalid input syntax for type date")) return "One of the dates is in an invalid format.";
  if (msg.includes("invalid input syntax for type numeric") || msg.includes("invalid input syntax for type integer"))
    return "One of the number fields has an invalid value.";
  if (msg.includes("row-level security") || msg.includes("Not allowed")) return "You don't have permission to do this.";
  return msg;
}

/** Start/end of today (IST) as UTC ISO strings, for DB queries */
export function istDayRange(addDaysCount = 0) {
  const offset = 5.5 * 3600 * 1000;
  const ist = new Date(Date.now() + offset);
  const start = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + addDaysCount) - offset;
  return { from: new Date(start).toISOString(), to: new Date(start + 86400000).toISOString() };
}

export function formatTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

/** "Today", "Tomorrow", "Mon, 12 Oct" */
export function dayLabel(d: string | Date) {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
  const diff = daysUntil(iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export function istDateKey(d: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

/** datetime-local input value (IST) <-> ISO */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}
export function fromLocalInput(v: string) {
  if (!v) return null;
  return new Date(v + ":00+05:30").toISOString();
}

export function fillTemplate(body: string, vars: Record<string, string | null | undefined>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? "").toString()).replace(/[ \t]+\n/g, "\n").trim();
}

export function waLink(phone: string | null | undefined, text?: string) {
  const n = (phone || "").replace(/[^0-9]/g, "");
  if (!n) return null;
  const num = n.length === 10 ? "91" + n : n;
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function inr(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return "₹" + Math.round(v).toLocaleString("en-IN");
}
