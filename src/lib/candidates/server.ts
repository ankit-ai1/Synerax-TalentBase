import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { phoneVariants } from "@/lib/phone";

export type Duplicate = { field: "email" | "phone"; id: string; candidate_code: string | null; email: string | null; user_id: string | null };

/**
 * The one duplicate check for candidates (registration pre-check, staff create/edit).
 * Phones compare as E.164, plus the bare 10-digit form older Indian rows used.
 */
export async function findDuplicateCandidate(opts: { email?: string | null; phone?: string | null; excludeId?: string | null }): Promise<Duplicate | null> {
  const admin = createAdminClient();
  const email = (opts.email ?? "").trim().toLowerCase();
  const phones = phoneVariants(opts.phone);
  const sel = "id, candidate_code, email, user_id";
  const [byEmail, byPhone] = await Promise.all([
    email ? admin.from("candidates").select(sel).eq("email", email).limit(5) : Promise.resolve({ data: [] }),
    phones.length ? admin.from("candidates").select(sel).in("phone", phones).limit(5) : Promise.resolve({ data: [] }),
  ]);
  const pick = (rows: unknown) => ((rows ?? []) as Omit<Duplicate, "field">[]).find((r) => r.id !== opts.excludeId);
  const e = pick(byEmail.data);
  if (e) return { field: "email", ...e };
  const p = pick(byPhone.data);
  if (p) return { field: "phone", ...p };
  return null;
}
