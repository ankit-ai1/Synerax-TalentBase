/**
 * Resume parser accuracy test — runs the real pipeline (unpdf / mammoth + rules) on the sample CVs in
 * tests/fixtures and prints per-field accuracy.   npm run test:resume
 */
import fs from "node:fs";
import path from "node:path";
import { parseResume } from "../src/lib/resume";
import type { ResumeFields } from "../src/lib/resume";

const dir = path.join(process.cwd(), "tests", "fixtures");
const expected: Record<string, Record<string, unknown>> = JSON.parse(fs.readFileSync(path.join(dir, "expected.json"), "utf8"));

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").replace(/[^a-z0-9.@+ ]/g, "").replace(/\s+/g, " ").trim();
const monthsSince = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const now = new Date();
  return Math.round(((now.getFullYear() * 12 + now.getMonth() - (y * 12 + m - 1) + 1) / 12) * 10) / 10;
};

type Score = { ok: number; total: number };
const perField: Record<string, Score> = {};
let skillRecall = 0;
let skillPrecision = 0;
let skillCount = 0;
const rows: string[] = [];

function check(field: string, ok: boolean) {
  perField[field] ??= { ok: 0, total: 0 };
  perField[field].total++;
  if (ok) perField[field].ok++;
  return ok;
}

async function main() {
  for (const [file, exp] of Object.entries(expected)) {
    const buf = fs.readFileSync(path.join(dir, file));
    const mime = file.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const t0 = Date.now();
    const res = await parseResume(buf, mime, { fileName: file });
    const ms = Date.now() - t0;
    const got = res.fields as ResumeFields & Record<string, { value: unknown } | undefined>;
    const misses: string[] = [];
    for (const [k, want] of Object.entries(exp)) {
      if (k === "skills") continue;
      const v = got[k]?.value;
      let ok: boolean;
      if (k === "total_experience") {
        const target = typeof want === "object" && want && "since" in (want as object) ? monthsSince((want as { since: string }).since) : Number(want);
        ok = typeof v === "number" && Math.abs(v - target) <= 0.6;
      } else if (typeof want === "number") ok = Number(v) === want;
      else if (typeof want === "boolean") ok = v === want;
      else if (k === "current_company" || k === "current_designation" || k.endsWith("_url")) ok = !!v && norm(v).includes(norm(want));
      else ok = norm(v) === norm(want);
      if (!check(k, ok)) misses.push(`${k}: got ${JSON.stringify(v ?? null)} want ${JSON.stringify(want)}`);
    }
    const wantSkills = (exp.skills as string[]).map((s) => s.toLowerCase());
    const gotSkills = (got.skills?.value ?? []).map((s) => s.toLowerCase());
    const hit = wantSkills.filter((s) => gotSkills.includes(s)).length;
    const recall = hit / wantSkills.length;
    const precision = gotSkills.length ? gotSkills.filter((s) => wantSkills.includes(s)).length / gotSkills.length : 0;
    skillRecall += recall;
    skillPrecision += precision;
    skillCount++;
    if (recall < 1) misses.push(`skills missed: ${wantSkills.filter((s) => !gotSkills.includes(s)).join(", ")}`);
    rows.push(`\n■ ${file}  (${ms} ms, overall confidence ${res.confidence}${res.warnings.length ? `, warnings: ${res.warnings.join(" / ")}` : ""})\n  skills: recall ${(recall * 100).toFixed(0)}%, precision ${(precision * 100).toFixed(0)}% → ${gotSkills.join(", ")}${misses.length ? "\n  ✗ " + misses.join("\n  ✗ ") : "\n  ✓ all checked fields correct"}`);
  }

  // unsupported + scanned inputs give friendly warnings instead of failing
  const doc = await parseResume(Buffer.from("D0CF11E0 old word file"), "application/msword", { fileName: "old.doc" });
  const scanned = await parseResume(Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"), "application/pdf", { fileName: "scan.pdf" });
  const warnOk = check("warning: .doc / image", doc.warnings.length > 0 && Object.keys(doc.fields).length === 0) && true;
  check("warning: scanned / empty PDF", scanned.warnings.length > 0);

  console.log("\nRESUME PARSER — per-resume results");
  console.log(rows.join("\n"));
  console.log("\nPER-FIELD ACCURACY");
  let ok = 0;
  let total = 0;
  for (const [k, s] of Object.entries(perField)) {
    ok += s.ok;
    total += s.total;
    console.log(`  ${k.padEnd(28)} ${String(s.ok).padStart(2)}/${String(s.total).padEnd(2)}  ${((s.ok / s.total) * 100).toFixed(0).padStart(3)}%`);
  }
  console.log(`  ${"skills (avg recall)".padEnd(28)}        ${((skillRecall / skillCount) * 100).toFixed(0).padStart(3)}%`);
  console.log(`  ${"skills (avg precision)".padEnd(28)}        ${((skillPrecision / skillCount) * 100).toFixed(0).padStart(3)}%`);
  const overall = ok / total;
  console.log(`\nOVERALL (scalar fields): ${ok}/${total} = ${(overall * 100).toFixed(1)}%${warnOk ? "" : ""}`);
  if (overall < 0.7) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
