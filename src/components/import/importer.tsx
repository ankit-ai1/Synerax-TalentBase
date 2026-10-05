"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, RotateCcw, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Field = { key: string; label: string; synonyms: string[]; required?: boolean; kind?: "number" | "date" | "text" };

const FIELDS: Field[] = [
  { key: "full_name", label: "Full name (will be split)", synonyms: ["name", "full name", "candidate name", "candidate"] },
  { key: "first_name", label: "First name", synonyms: ["first name", "firstname", "first"] },
  { key: "last_name", label: "Last name", synonyms: ["last name", "lastname", "surname"] },
  { key: "email", label: "Email", synonyms: ["email", "email id", "mail", "e-mail", "email address"] },
  { key: "phone", label: "Phone", synonyms: ["phone", "mobile", "contact", "contact no", "phone number", "mobile no", "mobile number"] },
  { key: "alt_phone", label: "Alternate phone", synonyms: ["alternate phone", "alt phone", "alternate mobile"] },
  { key: "gender", label: "Gender", synonyms: ["gender", "sex"] },
  { key: "dob", label: "Date of birth", synonyms: ["dob", "date of birth", "birth date"], kind: "date" },
  { key: "current_city", label: "Current city", synonyms: ["city", "current city", "current location", "location"] },
  { key: "current_state", label: "State", synonyms: ["state"] },
  { key: "preferred_locations", label: "Preferred locations (comma)", synonyms: ["preferred location", "preferred locations", "preferred city"] },
  { key: "headline", label: "Headline", synonyms: ["headline", "profile title", "title"] },
  { key: "current_company", label: "Current company", synonyms: ["company", "current company", "current employer", "employer", "organization"] },
  { key: "current_designation", label: "Designation", synonyms: ["designation", "current designation", "role", "position", "job title"] },
  { key: "total_experience", label: "Total experience (yrs)", synonyms: ["experience", "total experience", "exp", "total exp", "years of experience", "yoe"], kind: "number" },
  { key: "relevant_experience", label: "Relevant experience (yrs)", synonyms: ["relevant experience", "relevant exp"], kind: "number" },
  { key: "current_ctc", label: "Current CTC (LPA)", synonyms: ["ctc", "current ctc", "cctc", "current salary", "current package"], kind: "number" },
  { key: "expected_ctc", label: "Expected CTC (LPA)", synonyms: ["expected ctc", "ectc", "expected salary", "expected package"], kind: "number" },
  { key: "notice_period_days", label: "Notice period (days)", synonyms: ["notice", "notice period", "np", "notice period days"], kind: "number" },
  { key: "serving_notice", label: "Serving notice (Yes/No)", synonyms: ["serving notice", "serving"] },
  { key: "last_working_day", label: "Last working day", synonyms: ["lwd", "last working day", "last working date"], kind: "date" },
  { key: "skills", label: "Skills (comma, 'React:3')", synonyms: ["skills", "key skills", "skill set", "skillset", "primary skills", "technologies"] },
  { key: "roles", label: "Job roles (comma)", synonyms: ["job role", "roles", "functional role"] },
  { key: "highest_qualification", label: "Qualification", synonyms: ["qualification", "education", "highest qualification", "degree"] },
  { key: "languages", label: "Languages (comma)", synonyms: ["languages", "language"] },
  { key: "linkedin_url", label: "LinkedIn", synonyms: ["linkedin", "linkedin url", "linkedin profile"] },
  { key: "source", label: "Source", synonyms: ["source", "sourced from", "portal"] },
  { key: "status", label: "Status", synonyms: ["status", "candidate status"] },
  { key: "tags", label: "Tags (comma)", synonyms: ["tags", "tag", "labels"] },
  { key: "summary", label: "Summary / remarks", synonyms: ["summary", "remarks", "comments", "notes", "profile summary"] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function autoMap(headers: string[]) {
  const m: Record<number, string> = {};
  const used = new Set<string>();
  headers.forEach((h, i) => {
    const n = norm(h);
    const f = FIELDS.find((f) => !used.has(f.key) && (f.synonyms.includes(n) || norm(f.label) === n || f.key === n.replace(/ /g, "_")));
    if (f) {
      m[i] = f.key;
      used.add(f.key);
    }
  });
  return m;
}

function cellToString(v: any): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function toDate(v: string) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); // dd/mm/yyyy (India)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function toNumber(v: string, key: string) {
  if (!v) return "";
  const s = v.toLowerCase();
  if (key === "notice_period_days" && /immediate|^0$/.test(s)) return "0";
  let n = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return "";
  if (key.includes("ctc")) {
    if (n > 1000) n = n / 100000; // rupees -> lakhs
  }
  if (key === "notice_period_days") {
    if (/immediate/.test(s)) return "0";
    if (/month/.test(s)) n = n * 30;
  }
  if (key.includes("experience") && /month/.test(s) && !/year/.test(s)) n = n / 12;
  return String(Math.round(n * 100) / 100);
}

function buildRow(raw: string[], map: Record<number, string>) {
  const r: Record<string, string> = {};
  Object.entries(map).forEach(([idx, key]) => {
    if (!key) return;
    let v = raw[Number(idx)] ?? "";
    const f = FIELDS.find((x) => x.key === key);
    if (f?.kind === "date") v = toDate(v);
    if (f?.kind === "number") v = toNumber(v, key);
    r[key] = v;
  });
  if (r.full_name && !r.first_name) {
    const parts = r.full_name.split(/\s+/);
    r.first_name = parts[0];
    r.last_name = parts.length > 1 ? parts.slice(1).join(" ") : r.last_name ?? "";
  }
  delete r.full_name;
  if (r.phone) r.phone = r.phone.replace(/[^0-9+]/g, "").replace(/^\+?91(?=\d{10}$)/, "");
  if (r.email) r.email = r.email.toLowerCase();
  if (r.gender) r.gender = /^f/i.test(r.gender) ? "Female" : /^m/i.test(r.gender) ? "Male" : r.gender;
  return r;
}

export function Importer() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<number, string>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; failed: number; errors: any[] } | null>(null);
  const [drag, setDrag] = useState(false);

  async function load(f: File) {
    setFile(f);
    setResult(null);
    let data: string[][] = [];
    try {
      if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        const sheet = await readSheet(f);
        data = (sheet as any[][]).map((r) => r.map(cellToString));
      } else if (/\.(csv|txt)$/i.test(f.name)) {
        const Papa = (await import("papaparse")).default;
        const text = await f.text();
        data = (Papa.parse<string[]>(text, { skipEmptyLines: true }).data as string[][]).map((r) => r.map((c) => (c ?? "").trim()));
      } else {
        toast.error("Only .xlsx or .csv files are supported");
        return;
      }
    } catch (e) {
      toast.error("Couldn't read the file: " + (e as Error).message);
      return;
    }
    data = data.filter((r) => r.some((c) => c));
    if (data.length < 2) return toast.error("The file needs a header row and at least one data row");
    setHeaders(data[0]);
    setRows(data.slice(1));
    setMap(autoMap(data[0]));
  }

  const built = useMemo(() => rows.map((r) => buildRow(r, map)), [rows, map]);
  const valid = built.filter((r) => r.first_name && (r.email || r.phone));
  const invalid = built.length - valid.length;
  const mappedKeys = new Set(Object.values(map).filter(Boolean));
  const hasName = mappedKeys.has("first_name") || mappedKeys.has("full_name");

  async function run() {
    setRunning(true);
    setProgress(0);
    const supabase = createClient();
    const total = { imported: 0, failed: 0, errors: [] as any[] };
    const chunk = 50;
    for (let i = 0; i < valid.length; i += chunk) {
      const part = valid.slice(i, i + chunk);
      const { data, error } = await supabase.rpc("import_candidates", { p_rows: part });
      if (error) {
        total.failed += part.length;
        total.errors.push({ row: i + 1, name: "", error: error.message });
      } else {
        const d = data as any;
        total.imported += d.imported;
        total.failed += d.failed;
        total.errors.push(...(d.errors ?? []).map((e: any) => ({ ...e, row: e.row + i })));
      }
      setProgress(Math.min(100, Math.round(((i + part.length) / valid.length) * 100)));
    }
    setRunning(false);
    setResult(total);
    if (total.imported) toast.success(`${total.imported} candidates imported`);
  }

  function downloadTemplate() {
    const head = ["Full name", "Email", "Phone", "Gender", "DOB", "City", "Preferred locations", "Current company", "Designation", "Total experience", "Current CTC", "Expected CTC", "Notice period", "Serving notice", "LWD", "Skills", "Job role", "Qualification", "Source", "Remarks"];
    const ex = ["Rohan Gupta", "rohan@gmail.com", "9876543210", "Male", "15/08/1994", "Pune", "Pune, Bangalore", "Infosys", "Senior Developer", "6", "14", "20", "60", "No", "", "Java:6, Spring Boot:4, AWS:2", "Backend Developer", "Graduation", "Naukri", "Strong communication"];
    const csv = "﻿" + [head, ex].map((r) => r.map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "candidates-import-template.csv";
    a.click();
  }

  function downloadErrors() {
    if (!result) return;
    const csv = "﻿" + ["Row,Name,Error", ...result.errors.map((e) => `${e.row},"${(e.name ?? "").trim()}","${String(e.error).replace(/"/g, '""')}"`)].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "import-errors.csv";
    a.click();
  }

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMap({});
    setResult(null);
  };

  // ---------- step 1: upload
  if (!file || headers.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) load(f);
          }}
          onClick={() => input.current?.click()}
          className={cn(
            "flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
            drag ? "border-jade bg-jade-50" : "border-line-strong bg-surface hover:border-jade/60"
          )}
        >
          <div className="mb-4 rounded-2xl bg-jade-50 p-4 text-jade-700">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-ink-900">Drop an Excel or CSV file here</p>
          <p className="mt-1 text-sm text-ink-400">or click to choose · .xlsx, .csv</p>
          <input
            ref={input}
            type="file"
            accept=".xlsx,.csv,.txt"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) load(f);
              e.target.value = "";
            }}
          />
        </div>
        <Card className="p-6">
          <h3 className="font-semibold text-ink-900">How it works</h3>
          <ol className="mt-4 space-y-3 text-sm text-ink-600">
            {[
              "Upload your existing Excel sheet — the columns can be named anything.",
              "We detect columns automatically (Name, Mobile, CTC, Notice…). If one is wrong, change it from the dropdown.",
              "CTC in rupees is converted to lakhs. '2 months' notice = 60 days. Dates in dd/mm/yyyy work.",
              "Separate skills with commas: 'Java:5, SQL:3' (years after the colon are optional).",
              "Rows whose email/phone already exists are skipped — you can download the error list.",
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-600">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <Button variant="secondary" className="mt-6 w-full" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download sample template
          </Button>
        </Card>
      </div>
    );
  }

  // ---------- step 3: result
  if (result) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-jade" />
        <p className="mt-4 text-2xl font-semibold text-ink-900">{result.imported} candidates imported</p>
        <p className="mt-1 text-sm text-ink-500">
          {result.failed + invalid > 0 ? `${result.failed + invalid} rows skipped (duplicate or missing name/contact)` : "All rows imported successfully."}
        </p>
        {result.errors.length > 0 && (
          <div className="mt-6 max-h-56 overflow-y-auto rounded-xl border border-line text-left">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-line">
                {result.errors.slice(0, 50).map((e, i) => (
                  <tr key={i}>
                    <td className="w-14 px-3 py-2 tabular text-ink-400">#{e.row}</td>
                    <td className="px-3 py-2 text-ink-700">{e.name}</td>
                    <td className="px-3 py-2 text-red-600 dark:text-red-400">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {result.errors.length > 0 && (
            <Button variant="secondary" onClick={downloadErrors}>
              <Download className="h-4 w-4" /> Download errors
            </Button>
          )}
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Import more
          </Button>
          <Link href="/candidates?sort=recent" className="inline-flex h-9 items-center rounded-lg bg-jade px-4 text-sm font-medium text-white">
            View candidates
          </Link>
        </div>
      </Card>
    );
  }

  // ---------- step 2: map + preview
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <FileSpreadsheet className="h-8 w-8 text-jade" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink-900">{file.name}</p>
          <p className="text-xs text-ink-400">
            {rows.length} rows · {headers.length} columns · {mappedKeys.size} mapped
          </p>
        </div>
        <Button variant="ghost" onClick={reset}>
          Choose another file
        </Button>
        <Button onClick={run} loading={running} disabled={!hasName || valid.length === 0}>
          {!running && <Upload className="h-4 w-4" />}
          Import {valid.length} candidates
        </Button>
      </Card>

      {running && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink-700">
              <Loader2 className="h-4 w-4 animate-spin" /> Importing…
            </span>
            <span className="tabular text-ink-500">{progress}%</span>
          </div>
          <Progress value={progress} />
        </Card>
      )}

      {(!hasName || invalid > 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-saffron/40 bg-saffron-50 px-4 py-3 text-sm text-saffron-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {!hasName ? "Map a name column (Full name or First name)." : `${invalid} rows are missing a name or both email and phone — they will be skipped.`}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-3.5">
          <p className="text-sm font-semibold text-ink-900">Map columns</p>
          <p className="text-xs text-ink-400">The first 3 values are shown under each column</p>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {headers.map((h, i) => (
            <div key={i} className="bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-ink-800">{h || `Column ${i + 1}`}</p>
                {map[i] ? <CheckCircle2 className="h-4 w-4 shrink-0 text-jade" /> : <span className="text-[11px] text-ink-300">skip</span>}
              </div>
              <p className="mt-1 truncate text-xs text-ink-400">{rows.slice(0, 3).map((r) => r[i]).filter(Boolean).join(" · ") || "—"}</p>
              <select
                value={map[i] ?? ""}
                onChange={(e) => setMap((m) => ({ ...m, [i]: e.target.value }))}
                className={cn("field-input mt-2 h-8 text-[13px]", map[i] && "border-jade/50")}
                aria-label={`Map ${h}`}
              >
                <option value="">— Skip —</option>
                {FIELDS.map((f) => (
                  <option key={f.key} value={f.key} disabled={mappedKeys.has(f.key) && map[i] !== f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-3.5">
          <p className="text-sm font-semibold text-ink-900">Preview (first 5 rows, cleaned)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-xs">
            <thead className="bg-surface-2">
              <tr className="text-left text-ink-400">
                {["first_name", "last_name", "email", "phone", "current_city", "total_experience", "current_ctc", "expected_ctc", "notice_period_days", "skills"].map((k) => (
                  <th key={k} className="px-3 py-2 font-medium">
                    {FIELDS.find((f) => f.key === k)?.label.replace(/ \(.*\)/, "") ?? k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {built.slice(0, 5).map((r, i) => (
                <tr key={i} className={cn(!(r.first_name && (r.email || r.phone)) && "bg-red-50/60 dark:bg-red-500/5")}>
                  {["first_name", "last_name", "email", "phone", "current_city", "total_experience", "current_ctc", "expected_ctc", "notice_period_days", "skills"].map((k) => (
                    <td key={k} className="max-w-[180px] truncate px-3 py-2 text-ink-700">
                      {r[k] || <span className="text-ink-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
