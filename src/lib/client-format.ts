import type { SharedProfile } from "./client-types";
import type { Tone } from "@/components/portal-ui/kit";

/** Status chip for a shared profile (plain helper — usable from server and client components) */
export function decisionChip(p: SharedProfile): { label: string; tone: Tone } {
  if (p.stage === "Joined") return { label: "Joined", tone: "emerald" };
  if (p.stage === "Offered") return { label: "Selected — offer stage", tone: "emerald" };
  if (p.decision === "Pending") return { label: "Awaiting your decision", tone: "saffron" };
  if (p.decision === "Approved") return { label: p.stage === "Interview" ? "Interviewing" : "Approved", tone: "jade" };
  if (p.decision === "Rejected" || p.stage === "Closed") return { label: "Not progressing", tone: "ink" };
  return { label: p.stage, tone: "ink" };
}
