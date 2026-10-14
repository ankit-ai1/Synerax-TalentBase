import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { alertAdmins, cronAuthorized } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["backup", "restore_test"]),
  status: z.enum(["success", "failed"]),
  started_at: z.string().datetime().nullish(),
  size_bytes: z.coerce.number().int().min(0).nullish(),
  location: z.string().max(1000).nullish(),
  run_url: z.string().url().max(500).nullish(),
  details: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Called by the GitHub Actions workflows (.github/workflows/backup.yml, restore-test.yml) with Bearer CRON_SECRET.
 * Writes backup_runs; a failed backup or restore test alerts every admin (in-app + email).
 */
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const r = parsed.data;

  const { data, error } = await createAdminClient().from("backup_runs").insert(r).select("id").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (r.status === "failed") {
    const what = r.kind === "backup" ? "Database backup failed" : "Backup restore test FAILED";
    const reason = typeof r.details.error === "string" ? r.details.error : Array.isArray(r.details.failed_checks) ? (r.details.failed_checks as string[]).join("; ") : "See the workflow run for details.";
    await alertAdmins({
      type: "backup_failed",
      title: what,
      body: `${reason}`.slice(0, 600),
      link: "/admin/backups",
      facts: r.run_url ? [{ label: "Workflow run", value: r.run_url }] : undefined,
    });
  }
  return Response.json({ id: data.id });
}
