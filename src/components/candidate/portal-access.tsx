"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { KeyRound, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { formatDateTime, timeAgo } from "@/lib/utils";

export type PortalStatus =
  | { kind: "none" }
  | { kind: "opted_out" }
  | { kind: "invited"; at: string | null; count: number }
  | { kind: "active"; lastLogin: string | null };

type Result = { id: string; name: string; status: "invited" | "signin_link" | "skipped"; reason?: string; code?: string };
export type InviteResponse = { results: Result[]; invited: number; signin: number; queued: number; skipped: Record<string, number>; note: string | null; error?: string };

const SKIP_LABEL: Record<string, (n: number) => string> = {
  active: (n) => `${n} already active`,
  no_email: (n) => `${n} no email`,
  opted_out: (n) => `${n} opted out`,
  staff_login: (n) => `${n} staff/client email`,
  has_profile: (n) => `${n} already have a portal profile`,
  error: (n) => `${n} failed`,
};

/** "20 invited, 3 already active, 2 no email" */
export function inviteSummary(out: Pick<InviteResponse, "invited" | "signin" | "skipped">) {
  return [
    out.invited && `${out.invited} invited`,
    out.signin && `${out.signin} sign-in link${out.signin > 1 ? "s" : ""}`,
    ...Object.entries(out.skipped ?? {}).map(([k, n]) => (SKIP_LABEL[k] ?? ((x: number) => `${x} skipped`))(n)),
  ]
    .filter(Boolean)
    .join(", ");
}

/** POST /api/candidates/invite + a toast summary (used by the profile box and the bulk action) */
export async function sendPortalInvites(ids: string[], mode: "manual" | "import" | "add" = "manual", opts: { silent?: boolean } = {}) {
  const res = await fetch("/api/candidates/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids, mode }) });
  const out = (await res.json().catch(() => ({}))) as InviteResponse;
  if (!res.ok) {
    toast.error(out.error ?? "Could not send the invites");
    return null;
  }
  if (opts.silent) return out;
  const sent = out.invited + out.signin;
  const parts = inviteSummary(out);
  const skipped = out.results.filter((r) => r.status === "skipped" && r.code !== "active" && r.code !== "no_email");
  const detail =
    [out.queued ? `${out.queued} queued — they go out at a steady rate within the email limit.` : "", out.note ?? "", ...skipped.slice(0, 5).map((r) => `${r.name}: ${r.reason}`)].filter(Boolean).join("\n") +
    (skipped.length > 5 ? `\n+${skipped.length - 5} more` : "");
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
        ) : status.kind === "opted_out" ? (
          <p className="text-ink-700">
            <span className="mr-2 inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[11.5px] font-semibold text-stone-600 dark:bg-stone-400/10 dark:text-stone-300">Opted out</span>
            The candidate asked not to get a portal account.
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
        {(status.kind === "none" || status.kind === "invited") &&
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
            <>
              <Button size="sm" variant="secondary" disabled data-testid="send-portal-invite">
                <Send className="h-3.5 w-3.5" /> Send portal invite
              </Button>
              <p className="text-[12px] text-ink-500">Add an email first.</p>
            </>
          ))}
      </div>
    </Card>
  );
}

/** "Send portal invite to newly added candidates" — default ON, last choice remembered per staff user (this browser) */
export function useInvitePref(scope: "import" | "add") {
  const [key, setKey] = useState<string | null>(null);
  const [on, setOn] = useState(true);
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const k = `synerax:invite-on-${scope}:${data.user?.id ?? "anon"}`;
        setKey(k);
        try {
          const v = localStorage.getItem(k);
          if (v !== null) setOn(v === "1");
        } catch {}
      });
  }, [scope]);
  const set = (v: boolean) => {
    setOn(v);
    try {
      if (key) localStorage.setItem(key, v ? "1" : "0");
    } catch {}
  };
  return [on, set] as const;
}

export function InviteCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--jade))]" data-testid="invite-checkbox" />
      {label}
    </label>
  );
}
