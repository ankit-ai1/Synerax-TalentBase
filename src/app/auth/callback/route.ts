import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { finalizeRegistration } from "@/lib/registration";
import { nextFor } from "@/lib/roles";

export const runtime = "nodejs";

/**
 * Landing point for Supabase email links: sign-up confirmation, password recovery and magic links.
 * Supports both the PKCE `?code=` flow and the `?token_hash=&type=` flow.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next");
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  const supabase = await createClient();
  let error: unknown = null;
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  else return to("/login?error=link");
  if (error) return to("/login?error=link");

  if (type === "recovery" || next === "/reset-password") return to("/reset-password");

  const { data } = await supabase.auth.getUser();
  if (!data.user) return to("/login");

  // Verified candidate → create or link their profile now
  try {
    await finalizeRegistration(data.user.id);
  } catch (e) {
    console.error("finalizeRegistration failed", e);
  }

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active) return to("/login?error=inactive");
  const dest = nextFor(profile.role, next);
  return to(profile.role === "candidate" && dest === "/portal" ? "/portal?welcome=1" : dest);
}
