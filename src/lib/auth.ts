import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Cached per request, so the layout and the page share a single lookup */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .eq("id", userId)
    .single();
  return (data as Profile) ?? null;
});

/** For pages: requires login + an active account */
export async function requireStaff(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=inactive");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect("/");
  return profile;
}

/** For API routes: returns a Response or the profile */
export async function apiStaff(): Promise<{ profile: Profile } | { error: Response }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) {
    return { error: Response.json({ error: "Login required" }, { status: 401 }) };
  }
  return { profile };
}

export async function apiAdmin(): Promise<{ profile: Profile } | { error: Response }> {
  const res = await apiStaff();
  if ("error" in res) return res;
  if (res.profile.role !== "admin") {
    return { error: Response.json({ error: "Only an admin can do this" }, { status: 403 }) };
  }
  return res;
}
