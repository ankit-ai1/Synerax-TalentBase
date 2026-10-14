"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { formatDateTime, timeAgo } from "@/lib/utils";

export type PortalStatus =
  | { kind: "none" }
  | { kind: "invited"; at: string | null; count: number }
  | { kind: "active"; lastLogin: string | null };

type Result = { id: string; name: string; status: "invited" | "signin_link" | "skipped"; reason?: string };
export type InviteResponse = { results: Result[]; invited: number; signin: number; skipped: number; error?: string };

/** POST /api/candidates/invite + a toast summary (used by the profile box and the bulk action) */
export async function sendPortalInvites(ids: string[]) {
  const res = await fetch("/api/candidates/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids }) });
  const out = (await res.json().catch(() => ({}))) as InviteResponse;
  if (!res.ok) {
    toast.error(out.error ?? "Could not send the invites");
    return null;
  }
  const sent = out.invited + out.signin;
  const parts = [out.invited && `${out.invited} invited`, out.signin && `${out.signin} sign-in link${out.signin > 1 ? "s" : ""}`, out.skipped && `${out.skipped} skipped`].filter(Boolean).join(" · ");
  const skipped = out.results.filter((r) => r.status === "skipped");
  const detail = skipped.slice(0, 6).map((r) => `${r.name}: ${r.reason}`).join("\n") + (skipped.length > 6 ? `\n+${skipped.length - 6} more` : "");
  if (sent) toast.success(parts || "Invite sent", { description: detail || undefined, duration: skipped.length ? 10000 : 4000 });
  else toast.error(parts || "Nothing sent", { description: detail || undefined, duration: 10000 });
  return out;
}

/** Candidate profile (staff): portal login status + "Send portal invite" / "Resend" */
export function PortalAccessCard({ candidateId, email, status }: { candidateId: string; email: string | null; status: PortalStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    const out = await sendPortalInvites([candidateId]);
    setBusy(false);
    if (out) router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Portal access" icon={<KeyRound className="h-4 w-4" />} />
      <div className="space-y-3 p-5 text-sm" data-testid="portal-access">
        {status.kind === "active" ? (
          <p className="text-ink-700">
            <span className="mr-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">Active</span>
            {status.lastLogin ? <span title={formatDateTime(status.lastLogin)}>last login {timeAgo(status.lastLogin)}</span> : "has not signed in yet"}
          </p>
        ) : status.kind === "invited" ? (
          <p className="text-ink-700">
            <span className="mr-2 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11.5px] font-semibold text-sky-800 dark:bg-sky-400/10 dark:text-sky-300">Invited</span>
            {status.at ? formatDateTime(status.at) : ""}
            {status.count > 1 ? ` · sent ${status.count}×` : ""}
          </p>
        ) : (
          <p className="text-ink-700">
            <span className="mr-2 inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[11.5px] font-semibold text-stone-600 dark:bg-stone-400/10 dark:text-stone-300">No account</span>
            The candidate can't sign in yet.
          </p>
        )}
        {status.kind !== "active" &&
          (email ? (
            <>
              <Button size="sm" variant="secondary" onClick={send} loading={busy} data-testid="send-portal-invite">
                <Send className="h-3.5 w-3.5" /> {status.kind === "invited" ? "Resend invite" : "Send portal invite"}
              </Button>
              <p className="text-[12px] text-ink-400">
                Emails {email} a link to set a password and see their profile. {status.kind === "invited" ? "Resending makes a fresh link." : ""}
              </p>
            </>
          ) : (
            <p className="text-[12.5px] text-ink-500">Add an email address to invite them.</p>
          ))}
      </div>
    </Card>
  );
}
