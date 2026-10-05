import { apiAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseFilters, toRpc } from "@/components/search/filters";
import type { SearchItem, SearchResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const esc = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV download with the current search filters (opens in Excel) — admin only */
export async function GET(req: Request) {
  const a = await apiAdmin();
  if ("error" in a) return a.error;

  const supabase = await createClient();
  const filters = parseFilters(new URL(req.url).searchParams);
  const items: SearchItem[] = [];
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabase.rpc("search_candidates", { f: { ...toRpc(filters, 100), page } });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    const r = data as SearchResult;
    items.push(...r.items);
    if (items.length >= r.total || r.items.length === 0) break;
  }

  // extra columns
  const extra = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < items.length; i += 200) {
    const ids = items.slice(i, i + 200).map((x) => x.id);
    const { data } = await supabase
      .from("candidates")
      .select("id, email, phone, gender, dob, highest_qualification, current_state, work_mode_preference, source, tags, available_from")
      .in("id", ids);
    (data ?? []).forEach((d) => extra.set(d.id, d));
  }

  const header = [
    "Code", "Name", "Email", "Phone", "Gender", "DOB", "Status", "Headline", "Designation", "Company",
    "Total Exp (yrs)", "Current CTC (LPA)", "Expected CTC (LPA)", "Notice (days)", "Serving notice",
    "Last working day", "Available from", "City", "State", "Preferred locations", "Work mode",
    "Qualification", "Skills", "Roles", "Source", "Tags", "Rating", "Updated",
  ];
  const rows = items.map((c) => {
    const e = extra.get(c.id) ?? {};
    return [
      c.candidate_code, [c.first_name, c.last_name].filter(Boolean).join(" "), e.email, e.phone, e.gender, e.dob,
      c.status, c.headline, c.current_designation, c.current_company, c.total_experience, c.current_ctc,
      c.expected_ctc, c.notice_period_days, c.serving_notice ? "Yes" : "No", c.last_working_day, e.available_from,
      c.current_city, e.current_state, c.preferred_locations, e.work_mode_preference, e.highest_qualification,
      c.skills.map((s) => (s.years ? `${s.name} (${Number(s.years)}y)` : s.name)), c.roles, e.source, e.tags,
      c.rating, c.updated_at?.slice(0, 10),
    ].map(esc).join(",");
  });

  const csv = "﻿" + [header.join(","), ...rows].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="candidates-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
