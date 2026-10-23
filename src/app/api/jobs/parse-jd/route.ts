import { apiStaff } from "@/lib/auth";
import { rateLimited } from "@/lib/rate-limit";
import { extractText } from "@/lib/resume/extract";
import { getSkillDefs } from "@/lib/resume/server";
import { parseJd } from "@/lib/jd/rules";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 5 * 1024 * 1024;

/**
 * Staff: read a JD (PDF / DOCX) and suggest job fields — { fields, warnings }. Nothing is saved here;
 * the job form shows the values with a "From JD" badge until staff review and save.
 */
export async function POST(req: Request) {
  const a = await apiStaff();
  if ("error" in a) return a.error;
  if (rateLimited(`jd:${a.profile.id}`, 120, 60 * 60 * 1000)) return Response.json({ error: "Too many JDs read in the last hour — try again later" }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "JD must be 5 MB or smaller" }, { status: 413 });
  if (!/\.(pdf|docx)$/i.test(file.name)) return Response.json({ fields: {}, warnings: ["Please upload a PDF or DOCX file — old .doc files and images can't be read."] });
  const { text, warnings } = await extractText(Buffer.from(await file.arrayBuffer()), file.type, file.name);
  if (!text.trim()) return Response.json({ fields: {}, warnings: warnings.length ? warnings.map((w) => w.replace("CV", "JD")) : ["We couldn't read text from this JD — please fill the job manually."] });
  const fields = parseJd(text, await getSkillDefs());
  return Response.json({ fields, warnings: warnings.map((w) => w.replace("CV", "JD")) });
}
