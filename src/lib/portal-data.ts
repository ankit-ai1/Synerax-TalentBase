import "server-only";
import { createClient } from "@/lib/supabase/server";
import { finalizeRegistration } from "@/lib/registration";
import type { MyProfile } from "@/lib/portal-types";

/**
 * The signed-in candidate's own profile (via the whitelisted RPC).
 * If the account is verified but the profile wasn't created yet (callback failed), finish it now.
 */
export async function loadMyProfile(userId: string): Promise<MyProfile | null> {
  const supabase = await createClient();
  let { data, error } = await supabase.rpc("candidate_my_profile");
  if (error) {
    await finalizeRegistration(userId).catch((e) => console.error("finalizeRegistration", e));
    ({ data, error } = await supabase.rpc("candidate_my_profile"));
  }
  return error || !data ? null : (data as MyProfile);
}
