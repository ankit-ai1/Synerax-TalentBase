import { apiAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = ["queued_at", "sent_at", "status", "template", "to_email", "subject", "attempts", "opened_at", "open_count", "clicked_at", "click_count", "bounced_at", "bounce_reason", "last_error", "provider_message_id"] as const;
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // keep spreadsheets from treating values as formulas
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Admin: CSV of the emails in a date range (IST days) — same filter as /admin/email/analytics */
export async function GET(req: Request) {
  const a = await apiAdmin();
  if ("error" in a) return a.error;
  const sp = new URL(req.url).searchParams;
  const ok = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const to = ok(sp.get("to")) ?? new Date().toISOString().slice(0, 10);
  const from = ok(sp.get("from")) ?? new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10);
  const supabase = await createClient();
  const lines = [COLS.join(",")];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await supabase
      .from("emails")
      .select(COLS.join(", "))
      .gte("queued_at", new Date(`${from}T00:00:00+05:30`).toISOString())
      .lte("queued_at", new Date(`${to}T23:59:59.999+05:30`).toISOString())
      .order("queued_at", { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) lines.push(COLS.map((c) => cell(r[c])).join(","));
    if (!data || data.length < 1000) break;
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="emails-${from}-to-${to}.csv"`, "cache-control": "no-store" },
  });
}
