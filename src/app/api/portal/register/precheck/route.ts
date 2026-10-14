import { z } from "zod";
import { normalizePhone, phoneError } from "@/lib/phone";
import { precheckRegistration } from "@/lib/registration";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim(),
});

/** Checks email / mobile before the account is created (public) */
export async function POST(req: Request) {
  if (rateLimited(`precheck:${clientIp(req)}`, 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ field: "email", error: "Enter a valid email" }, { status: 400 });
  const phoneMsg = parsed.data.phone ? phoneError(parsed.data.phone) : "Please enter your mobile number";
  if (phoneMsg) return Response.json({ field: "phone", error: phoneMsg }, { status: 400 });
  const problem = await precheckRegistration(parsed.data.email, normalizePhone(parsed.data.phone));
  if (problem) return Response.json(problem, { status: 409 });
  return Response.json({ ok: true });
}
