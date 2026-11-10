import { createClient } from "@supabase/supabase-js";
import { leadSchema } from "@/lib/leads";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // 5 submissions per IP per 10 minutes
  if (await rateLimited(`contact:${clientIp(request)}`, 5, 10 * 60 * 1000)) {
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
