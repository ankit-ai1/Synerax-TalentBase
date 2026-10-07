import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccess, isPublicPath, normalizePath, roleHome } from "@/lib/roles";

/**
 * Auth + role routing.
 * - Signed-out users can open public pages only.
 * - The user's role comes from the `user_role` JWT claim (Supabase custom access token hook,
 *   see README). Candidates are kept in /portal, clients in /client, staff in the staff app.
 * - If the hook isn't enabled yet, role routing falls back to the server layouts / API guards,
 *   which always check the role in the database — security never depends on this file alone.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims verifies the JWT locally (cached JWKS) instead of calling Supabase Auth on every navigation
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims?.sub ? data.claims : null;
  const path = normalizePath(request.nextUrl.pathname);
  const isApi = path.startsWith("/api/");

  const redirectTo = (to: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!claims) {
    if (isPublicPath(path)) return response;
    if (isApi) return NextResponse.json({ error: "Login required" }, { status: 401 });
    return redirectTo("/login", { next: path });
  }

  let role = typeof claims.user_role === "string" ? (claims.user_role as string) : null;

  // Signed-in users don't need the login/register pages
  if (path === "/login" || path === "/register") {
    if (!role) {
      const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", claims.sub).maybeSingle();
      role = profile?.is_active ? profile.role : "none";
    }
    if (role && role !== "none") return redirectTo(roleHome(role));
    return response;
  }

  if (role === "none" && !isPublicPath(path)) {
    if (isApi) return NextResponse.json({ error: "Account inactive" }, { status: 403 });
    return redirectTo("/login", { error: "inactive" });
  }

  if (role && !canAccess(role, path)) {
    if (isApi) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    return redirectTo(roleHome(role));
  }

  // Keep internal areas out of search engines
  if (!isPublicPath(path)) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
