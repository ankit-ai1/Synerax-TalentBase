#!/usr/bin/env node
/**
 * Restore test checks — compares a restored database with the manifest captured at backup time.
 *   node scripts/backup/verify.mjs <manifest.json> <restored-db-url>   → prints JSON, exit 1 on FAIL
 * compare() is pure (unit-tested in tests/backup-email.test.ts).
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const KEY_TABLES = ["public.candidates", "public.applications", "public.jobs", "public.clients", "public.profiles", "public.candidate_documents", "public.activity_logs", "auth.users"];
export const KEY_FUNCTIONS = ["candidate_apply", "candidate_completion", "save_candidate", "search_candidates", "add_to_job"];
export const TOLERANCE = 0.05;

export function compare(manifest, restored) {
  const checks = [];
  const add = (name, ok, detail = "") => checks.push({ name, ok, detail });
  const mc = manifest.counts ?? {};
  const rc = restored.counts ?? {};

  for (const t of KEY_TABLES) add(`table ${t} exists`, t in rc, t in rc ? "" : "missing after restore");
  for (const [t, n] of Object.entries(mc)) {
    if (!(t in rc)) {
      add(`rows ${t}`, false, `table missing (expected ${n})`);
      continue;
    }
    const m = Number(rc[t]);
    const allowed = Math.ceil(Number(n) * TOLERANCE);
    add(`rows ${t}`, Math.abs(m - Number(n)) <= allowed, `${m} restored vs ${n} at backup (±${allowed})`);
  }
  for (const [k, v] of Object.entries(manifest.latest ?? {})) {
    const got = restored.latest?.[k] ?? null;
    const same = v == null ? got == null : got != null && Math.abs(new Date(got).getTime() - new Date(v).getTime()) < 1000;
    add(`latest ${k} timestamp`, same, `${got ?? "none"} vs ${v ?? "none"}`);
  }
  const fns = new Set(restored.functions ?? []);
  const missingFns = (manifest.functions ?? []).filter((f) => !fns.has(f));
  add("all functions present", missingFns.length === 0, missingFns.length ? `missing: ${missingFns.slice(0, 20).join(", ")}` : `${fns.size} functions`);
  for (const f of KEY_FUNCTIONS) add(`function ${f}`, fns.has(f));

  const failed = checks.filter((c) => !c.ok);
  return { pass: failed.length === 0, checks: checks.length, failed_checks: failed.map((c) => `${c.name}: ${c.detail}`.trim()) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [manifestPath, dbUrl] = process.argv.slice(2);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const sql = readFileSync(new URL("./snapshot.sql", import.meta.url), "utf8");
  const out = execFileSync("psql", [dbUrl, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" });
  const restored = JSON.parse(out.trim());
  const result = compare(manifest, restored);
  console.log(JSON.stringify({ ...result, backup_taken_at: manifest.taken_at }, null, 2));
  process.exit(result.pass ? 0 : 1);
}
