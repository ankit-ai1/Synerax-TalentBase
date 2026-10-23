"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleX, Files, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { rangePayload } from "@/components/ui/money-field";
import type { Skill } from "@/lib/types";
import { emptyJob } from "./job-defaults";
import { applyJd, parseJdFile } from "./jd-import";

type Row = { name: string; state: "reading" | "saving" | "done" | "error"; id?: string; title?: string; error?: string; filled?: number };

/** Upload several JDs → one DRAFT job per file (nothing goes public until someone reviews and opens it) */
export function JdBulk({ skills }: { skills: Skill[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const up = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function run(files: File[]) {
    const list = files.filter((f) => /\.(pdf|docx)$/i.test(f.name)).slice(0, 20);
    if (!list.length) return toast.error("Choose PDF or DOCX files");
    setBusy(true);
    setRows(list.map((f) => ({ name: f.name, state: "reading" })));
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const { fields, error } = await parseJdFile(file);
      if (error) {
        up(i, { state: "error", error });
        continue;
      }
      const { next, meta } = applyJd(emptyJob(), fields, skills);
      const title = next.title.trim() || file.name.replace(/\.(pdf|docx)$/i, "").replace(/[_-]+/g, " ").slice(0, 80);
      up(i, { state: "saving", title, filled: Object.keys(meta).length });
      const { client: _c, skills: sk, assignees, id: _id, job_code: _jc, jd_file_name: _jf, ...rest } = next;
      void _c; void _id; void _jc; void _jf;
      const { data, error: e } = await createClient().rpc("save_job", {
        p: {
          id: null,
          job: { ...rest, title, status: "Draft", ...rangePayload({ min: next.ctc_min, max: next.ctc_max, currency: next.ctc_currency, period: next.ctc_period }), client_id: "" },
          skills: sk.map(({ skill_id, is_mandatory, min_years }) => ({ skill_id, is_mandatory, min_years })),
          assignees,
        },
      });
      if (e || !data) {
        up(i, { state: "error", error: e?.message ?? "Could not create the draft" });
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/jobs/${data}/jd`, { method: "POST", body: fd }).catch(() => null);
      up(i, { state: "done", id: String(data) });
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto mb-6 max-w-4xl rounded-2xl border border-line bg-surface p-4" data-testid="jd-bulk">
      <div className="sm:flex sm:items-center sm:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-600">
          <Files className="h-5 w-5" />
        </span>
        <div className="mt-2 min-w-0 flex-1 sm:mt-0">
          <p className="text-sm font-semibold text-ink-900">Several JDs? Upload them together</p>
          <p className="text-xs text-ink-500">Up to 20 PDF / DOCX files. Each one becomes a Draft job (not public) with its JD attached — open each to review, then set it to Open.</p>
        </div>
        <Button className="mt-3 sm:mt-0" variant="secondary" onClick={() => input.current?.click()} loading={busy}>
          Upload JDs
        </Button>
        <input ref={input} type="file" multiple accept=".pdf,.docx" className="sr-only" onChange={(e) => { const fs = [...(e.target.files ?? [])]; e.target.value = ""; if (fs.length) run(fs); }} />
      </div>
      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line text-[13px]">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2">
              {r.state === "done" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : r.state === "error" ? <CircleX className="h-4 w-4 shrink-0 text-red-600" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-400" />}
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-ink-800">{r.title ?? r.name}</span>
                <span className="ml-2 text-ink-400">{r.state === "error" ? r.error : r.state === "done" ? `${r.filled ?? 0} fields filled · draft created` : r.state === "saving" ? "creating draft…" : "reading…"}</span>
              </span>
              {r.id && (
                <Link href={`/jobs/${r.id}/edit`} className="shrink-0 font-medium text-jade-700 hover:underline">
                  Review
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
