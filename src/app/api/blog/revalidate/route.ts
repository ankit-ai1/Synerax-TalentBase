import { revalidatePath } from "next/cache";
import { apiStaff } from "@/lib/auth";

export const runtime = "nodejs";

/** Staff: refresh the cached public pages right after a post / landing page is saved (otherwise ISR picks it up within 5 min) */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  const body = (await req.json().catch(() => ({}))) as { slugs?: string[]; landing?: string };
  for (const s of (body.slugs ?? []).filter((x) => /^[a-z0-9-]+$/.test(x))) revalidatePath(`/blog/${s}`);
  if (body.landing && /^[a-z0-9-]+$/.test(body.landing)) revalidatePath(`/job-board/${body.landing}`);
  revalidatePath("/blog", "layout");
  revalidatePath("/sitemap.xml");
  return Response.json({ ok: true });
}
