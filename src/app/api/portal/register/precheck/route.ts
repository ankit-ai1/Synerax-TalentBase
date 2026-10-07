import { z } from "zod";
import { precheckRegistration } from "@/lib/registration";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
});

/** Checks email / mobile before the account is created (public) */
export async function POST(req: Request) {
  if (rateLimited(`precheck:${clientIp(req)}`, 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Please check your email and mobile number." }, { status: 400 });
  const problem = await precheckRegistration(parsed.data.email, parsed.data.phone);
  if (problem) return Response.json({ error: problem }, { status: 409 });
  return Response.json({ ok: true });
}
