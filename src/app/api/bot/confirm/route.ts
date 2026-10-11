import { z } from "zod";
import { botContext } from "@/lib/bot/server/context";
import { confirmAction } from "@/lib/bot/server/engine";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const body = z.object({ token: z.string().min(20).max(100), cancel: z.boolean().optional() });

/** Confirm / cancel an assistant action. Only this click (with its one-time token) executes anything. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const ctx = await botContext();
  if (rateLimited(ctx.userId ? `bot-confirm:u:${ctx.userId}` : `bot-confirm:ip:${clientIp(req)}`, 30, 3600e3)) {
    return Response.json({ mode: ctx.mode, turns: [{ text: "Too many requests — please try again later.", tone: "error" }] });
  }
  return Response.json(await confirmAction(parsed.data.token, !!parsed.data.cancel, ctx));
}
