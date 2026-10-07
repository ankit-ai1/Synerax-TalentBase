import { createClient } from "@supabase/supabase-js";
import { leadSchema } from "@/lib/leads";

/** Basic in-memory rate limit: 5 submissions per IP per 10 minutes (per server instance) */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_HITS;
}

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  if (limited(ip)) {
    return Response.json({ error: "Too many submissions. Please try again in a few minutes." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot filled → pretend success so bots learn nothing
  if (body && typeof body === "object" && "website" in body && (body as { website?: unknown }).website) {
    return Response.json({ ok: true });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json({ error: first?.message ?? "Please check the form and try again." }, { status: 400 });
  }

  const { type, name, email, website: _hp, ...rest } = parsed.data;
  void _hp;
  const phone = "phone" in rest ? rest.phone : "";
  const company = "company" in rest ? rest.company : "";
  const data = Object.fromEntries(Object.entries(rest).filter(([k, v]) => k !== "phone" && k !== "company" && v !== ""));

  // Plain anon client (no user session): RLS allows anon INSERT only
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("website_leads").insert({
    type,
    name,
    email: email.toLowerCase(),
    phone: phone || null,
    company: company || null,
    data: { ...data, user_agent: request.headers.get("user-agent")?.slice(0, 200) ?? null },
  });

  if (error) {
    console.error("website_leads insert failed", error.message);
    return Response.json({ error: "We couldn't submit your details right now. Please try again or email us." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
