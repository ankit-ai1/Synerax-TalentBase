import { after } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  onCandidateApplied,
  onCandidateWithdrew,
  onClientComment,
  onClientDecision,
  onClientFinalResult,
  onClientInterviewFeedback,
  onClientJobChanged,
  onClientJobSaved,
} from "@/lib/email/notify-events";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Args = Record<string, any>;

/**
 * Portal actions that must trigger emails/notifications.
 * The RPC still runs with the user's own session (so all role checks stay in the database);
 * the follow-up email runs after the response is sent.
 */
const ACTIONS: Record<string, { role: "client" | "candidate"; after?: (args: Args, data: any) => Promise<void> }> = {
  client_save_job: { role: "client", after: (a, id) => onClientJobSaved(id, !a.p?.id) },
  client_close_job: { role: "client", after: (a) => onClientJobChanged(a.p_job, "closed", a.p_reason) },
  client_delete_job: { role: "client", after: (a) => onClientJobChanged(a.p_job, "deleted") },
  client_decide: { role: "client", after: (a) => onClientDecision(a.p_application) },
  client_final_result: { role: "client", after: (a) => onClientFinalResult(a.p_application, a.p_result, a.p_feedback) },
  client_interview_feedback: { role: "client", after: (a) => onClientInterviewFeedback(a.p_interview) },
  client_add_comment: { role: "client", after: (a) => onClientComment(a.p_application, String(a.p_body ?? "")) },
  candidate_apply: { role: "candidate", after: (_a, id) => onCandidateApplied(id) },
  candidate_withdraw: { role: "candidate", after: (a) => onCandidateWithdrew(a.p_application) },
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  const args: Args = body?.args && typeof body.args === "object" ? body.args : {};
  const def = ACTIONS[action];
  if (!def) return Response.json({ error: "Unknown action" }, { status: 400 });

  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return Response.json({ error: "Login required" }, { status: 401 });
  if (profile.role !== def.role) return Response.json({ error: "Not allowed" }, { status: 403 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(action, args);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (def.after && data !== false && data != null) after(() => def.after!(args, data));
  return Response.json({ data });
}
