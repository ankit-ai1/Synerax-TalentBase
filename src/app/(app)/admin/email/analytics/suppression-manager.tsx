"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDateTime, friendlyError } from "@/lib/utils";

const REASON: Record<string, string> = { hard_bounce: "Hard bounce", soft_bounce_repeat: "Repeated soft bounces", opt_out: "Unsubscribed", manual: "Added manually" };

/** suppression list: remove an address (it will be emailed again) or add one manually */
export function SuppressionManager({ rows }: { rows: { email: string; reason: string; details: string | null; created_at: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [q, setQ] = useState("");
  const list = rows.filter((r) => !q || r.email.includes(q.toLowerCase()));

  async function remove(e: string) {
    if (!confirm(`Remove ${e} from the suppression list? It will receive emails again.`)) return;
    const { error } = await createClient().from("email_suppressions").delete().eq("email", e);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(`${e} removed from the list`);
    router.refresh();
  }
  async function add() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return toast.error("Enter a valid email");
    const { data: { user } } = await createClient().auth.getUser();
    const { error } = await createClient().from("email_suppressions").insert({ email: e, reason: "manual", created_by: user?.id ?? null });
    if (error) return toast.error(/duplicate/i.test(error.message) ? "Already on the list" : friendlyError(error.message));
    setEmail("");
    toast.success(`${e} will not be emailed`);
    router.refresh();
  }

  return (
    <div data-testid="suppressions">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-[13.5px] font-semibold text-ink-900">
          Suppression list <span className="tabular text-ink-400">· {rows.length}</span>
        </p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="field-input h-8 w-40 text-[13px]" aria-label="Search the list" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" className="field-input h-8 w-52 text-[13px]" aria-label="Add an address" />
        <Button size="sm" variant="secondary" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="text-[13px] text-ink-500">{rows.length ? "No match." : "No suppressed addresses."}</p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-[13px]">
            <tbody className="divide-y divide-line">
              {list.map((r) => (
                <tr key={r.email}>
                  <td className="px-4 py-2 text-ink-800">{r.email}</td>
                  <td className="px-3 py-2 text-ink-600">{REASON[r.reason] ?? r.reason}</td>
                  <td className="max-w-[260px] truncate px-3 py-2 text-[12px] text-ink-400" title={r.details ?? undefined}>
                    {r.details}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[12px] text-ink-400">{formatDateTime(r.created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => remove(r.email)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-ink-600 hover:bg-surface-2" aria-label={`Remove ${r.email}`}>
                      <X className="h-3.5 w-3.5" /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
