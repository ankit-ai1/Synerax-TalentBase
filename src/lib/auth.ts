import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

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
