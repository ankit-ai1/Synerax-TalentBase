import { apiStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, staffCandidateSchema } from "@/lib/candidate-schema";
import { findDuplicateCandidate } from "@/lib/candidates/server";
import { friendlyError } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Staff: create or update a candidate (the "Add/Edit candidate" form).
 * Same rules as self-registration (src/lib/candidate-schema.ts) and the same duplicate check, then save_candidate.
 * Errors come back per field: { fieldErrors: { phone: "…" } }.
 */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const body = (await req.json().catch(() => null)) as { id?: string | null; candidate?: Record<string, unknown> } | null;
  if (!body?.candidate || typeof body.candidate !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });

  const parsed = staffCandidateSchema.safeParse(body.candidate);
  if (!parsed.success) return Response.json({ fieldErrors: fieldErrors(parsed.error) }, { status: 400 });
  const candidate = { ...body.candidate, ...parsed.data };

  const dup = await findDuplicateCandidate({ email: parsed.data.email, phone: parsed.data.phone, excludeId: body.id ?? null });
  if (dup) {
    const what = dup.field === "email" ? "email" : "phone number";
    return Response.json({ fieldErrors: { [dup.field]: `This ${what} already belongs to ${dup.candidate_code ?? "another candidate"}` }, duplicate: dup.id }, { status: 409 });
  }

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("save_candidate", { p: { ...body, candidate } });
  if (error || !id) {
    const msg = friendlyError(error?.message);
    const field = /phone/i.test(error?.message ?? "") ? "phone" : /email/i.test(error?.message ?? "") && /DUPLICATE/.test(error?.message ?? "") ? "email" : null;
    return Response.json(field ? { fieldErrors: { [field]: msg } } : { error: msg }, { status: 400 });
  }
  return Response.json({ id });
}
