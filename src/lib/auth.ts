import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { isStaffRole, roleHome } from "@/lib/roles";

export { isStaffRole, roleHome };

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

/** For staff pages: requires login + an active admin/HR account (clients and candidates are sent to their portal) */
export async function requireStaff(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=inactive");
  if (!isStaffRole(profile.role)) redirect(roleHome(profile.role));
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}

/** For staff API routes: returns a Response or the profile (admin/HR only) */
export async function apiStaff(): Promise<{ profile: Profile } | { error: Response }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) {
    return { error: Response.json({ error: "Login required" }, { status: 401 }) };
  }
  if (!isStaffRole(profile.role)) {
    return { error: Response.json({ error: "Not allowed" }, { status: 403 }) };
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

/** For portal pages: requires an active user with exactly this role (others go to their own home) */
export async function requireRole(role: "client" | "candidate"): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${role === "client" ? "/client" : "/portal"}`);
  if (!profile.is_active) redirect("/login?error=inactive");
  if (profile.role !== role) redirect(roleHome(profile.role));
  return profile;
}

/** For portal API routes */
export async function apiRole(role: "client" | "candidate"): Promise<{ profile: Profile } | { error: Response }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return { error: Response.json({ error: "Login required" }, { status: 401 }) };
  if (profile.role !== role) return { error: Response.json({ error: "Not allowed" }, { status: 403 }) };
  return { profile };
}

/** Any signed-in, active user (account pages) */
export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=inactive");
  return profile;
}
