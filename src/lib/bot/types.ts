/** Assistant types shared by the server (/api/bot) and the launcher UI */
export type BotMode = "visitor" | "candidate" | "client" | "hr" | "admin";
/** FAQ audiences (staff see everything) */
export type BotAudience = "visitor" | "candidate" | "client";

export type BotFaq = {
  id: string;
  q: string;
  a: string;
  audience: BotAudience[];
  keywords?: string[];
  link?: { label: string; href: string };
};

/** a quick-reply: sends text, calls a tool directly (still allow-listed on the server) or opens a link */
export type BotChip = { label: string; send?: string; tool?: string; params?: Record<string, unknown>; href?: string; tone?: "primary" | "danger" };

export type BotCard = {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  href?: string;
  lines?: string[];
  /** progress tracker, e.g. application stages */
  steps?: { labels: string[]; current: number; closed?: boolean };
  chips?: BotChip[];
};

export type BotField = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "textarea" | "select";
  options?: string[];
  required?: boolean;
  placeholder?: string;
};
export type BotForm = { id: string; tool: string; fields: BotField[]; submitLabel: string; initial?: Record<string, string> };

/** confirmation card for an action — only the click with this one-time token executes it */
export type BotConfirm = { token: string; title: string; details: string[]; confirmLabel: string; expiresAt: string };

export type BotTurn = {
  text: string;
  chips?: BotChip[];
  cards?: BotCard[];
  form?: BotForm;
  link?: { label: string; href: string };
  upload?: { docType: "Resume" };
  confirm?: BotConfirm;
  tone?: "normal" | "success" | "error";
};

export type BotReply = {
  mode: BotMode;
  turns: BotTurn[];
  /** which brain understood the message */
  provider?: "gemini" | "fallback" | "none";
  navigate?: string;
};

/** what the launcher sends to POST /api/bot */
export type BotRequest =
  | { kind: "start" }
  | { kind: "text"; text: string; recent?: string[] }
  | { kind: "tool"; tool: string; params?: Record<string, unknown> };
