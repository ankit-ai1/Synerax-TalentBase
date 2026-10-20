"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Send, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { PhoneField } from "@/components/ui/phone-field";
import { Menu, MenuItem } from "@/components/ui/interactive";
import { CLIENT_ROLE_OPTIONS, roleLabel, type ClientMember } from "@/lib/client-labels";
import { cn, formatDateTime, friendlyError, timeAgo } from "@/lib/utils";

/**
 * Team members of one client company — used by the company's admin (client portal) and by Synerax staff.
 * The database enforces the same rules either way (client_member_* RPCs).
 */
export function TeamManager({ members, mode, clientId }: { members: ClientMember[]; mode: "client" | "staff"; clientId?: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [leaving, setLeaving] = useState<ClientMember | null>(null);
  const active = members.filter((m) => m.status !== "deactivated");

  async function act(m: ClientMember, body: Record<string, unknown>, ok: string) {
    const res = mode === "client"
      ? await fetch(`/api/client/team/${m.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      : await fetch(`/api/client-users/${m.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(friendlyError(out.error ?? "Something went wrong")), false;
    toast.success(ok);
    router.refresh();
    return out;
  }

  return (
    <div data-testid="team-manager">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-500">
          {active.length} active member{active.length === 1 ? "" : "s"} · unlimited seats
        </p>
        <Button onClick={() => setAdding(true)} size="sm" data-testid="add-member">
          <Plus className="h-4 w-4" /> Add member
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
            <tr className="border-b border-line">
              <th className="px-5 py-2.5 font-medium">Member</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Last login</th>
              <th className="px-3 py-2.5 text-right font-medium">Open tasks</th>
              <th className="px-3 py-2.5 text-right font-medium">Jobs owned</th>
              <th className="px-5 py-2.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => (
              <tr key={m.id} className={cn(m.status === "deactivated" && "opacity-60")} data-member={m.name}>
                <td className="px-5 py-2.5">
                  <p className="font-medium text-ink-900">
                    {m.name} {m.me && <span className="text-[11.5px] font-normal text-ink-400">(you)</span>}
                  </p>
                  <p className="text-[12px] text-ink-400">{[m.email, m.designation].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="px-3 py-2.5">
                  {m.status !== "deactivated" && !m.me ? (
                    <select
                      value={m.role}
                      onChange={(e) => act(m, { action: "role", role: e.target.value }, `${m.name} is now ${roleLabel(e.target.value)}`)}
                      className="field-input h-8 w-auto pr-8 text-[13px]"
                      aria-label={`Role of ${m.name}`}
                    >
                      {CLIENT_ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-ink-700">{roleLabel(m.role)}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
                      m.status === "active" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300" : m.status === "invited" ? "bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300" : "bg-stone-100 text-stone-600 dark:bg-stone-400/10 dark:text-stone-300"
                    )}
                  >
                    {m.status === "active" ? "Active" : m.status === "invited" ? "Invited" : "Deactivated"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-ink-500" title={m.last_login_at ? formatDateTime(m.last_login_at) : undefined}>
                  {m.last_login_at ? timeAgo(m.last_login_at) : "Never"}
                </td>
                <td className="px-3 py-2.5 text-right tabular">{m.open_tasks ?? 0}</td>
                <td className="px-3 py-2.5 text-right tabular">{m.jobs_owned ?? 0}</td>
                <td className="px-5 py-2.5 text-right">
                  {!m.me && (
                    <Menu
                      width="w-52"
                      trigger={({ toggle }) => (
                        <button onClick={toggle} className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-2 hover:text-ink-800" aria-label={`Actions for ${m.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    >
                      {(close) => (
                        <>
                          {m.status !== "deactivated" && (
                            <MenuItem icon={<Send className="h-4 w-4" />} onClick={() => (close(), act(m, { action: "resend" }, `New link sent to ${m.name}`))}>
                              {m.status === "invited" ? "Resend invite" : "Send password reset"}
                            </MenuItem>
                          )}
                          {m.status !== "deactivated" ? (
                            <MenuItem icon={<UserX className="h-4 w-4" />} onClick={() => (close(), setLeaving(m))}>
                              Deactivate…
                            </MenuItem>
                          ) : (
                            <MenuItem icon={<UserCheck className="h-4 w-4" />} onClick={() => (close(), act(m, { action: "reactivate" }, `${m.name} can sign in again`))}>
                              Reactivate
                            </MenuItem>
                          )}
                        </>
                      )}
                    </Menu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && <AddMemberDialog mode={mode} clientId={clientId} onClose={() => setAdding(false)} onDone={() => (setAdding(false), router.refresh())} />}
      {leaving && <DeactivateDialog member={leaving} members={active} onClose={() => setLeaving(null)} onConfirm={async (to) => { const ok = await act(leaving, { action: "deactivate", transfer_to: to }, `${leaving.name} was deactivated`); if (ok) setLeaving(null); }} />}
    </div>
  );
}

function AddMemberDialog({ mode, clientId, onClose, onDone }: { mode: "client" | "staff"; clientId?: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", designation: "", role: "recruiter" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  async function save() {
    setBusy(true);
    const res = await fetch(mode === "client" ? "/api/client/team" : "/api/client-users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mode === "client" ? f : { ...f, client_id: clientId }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(out.error ?? "Could not add the member");
    toast.success(`Invite sent to ${f.email}`);
    onDone();
  }
  const hint = CLIENT_ROLE_OPTIONS.find((o) => o.value === f.role)?.hint;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Add a team member"
      description="They get an email with a link to set their password."
      footer={
        <Button onClick={save} loading={busy} disabled={f.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)} data-testid="add-member-save">
          Send invite
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" required value={f.name} onChange={(v) => set("name", v)} />
        <TextField label="Email" type="email" required value={f.email} onChange={(v) => set("email", v)} />
        <PhoneField label="Phone" value={f.phone} onChange={(v) => set("phone", v)} />
        <TextField label="Designation" value={f.designation} onChange={(v) => set("designation", v)} />
        <SelectField className="sm:col-span-2" label="Role" required value={f.role} onChange={(v) => set("role", v)} options={CLIENT_ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} hint={hint} />
      </div>
    </Dialog>
  );
}

/** offboarding: a member who owns jobs / open tasks can only be deactivated by choosing who receives them */
function DeactivateDialog({ member, members, onClose, onConfirm }: { member: ClientMember; members: ClientMember[]; onClose: () => void; onConfirm: (to: string | null) => Promise<void> }) {
  const [hold, setHold] = useState<{ jobs: number; tasks: number } | null>(null);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    createClient()
      .rpc("client_member_holdings", { p_member: member.id })
      .then(({ data }) => setHold((data as { jobs: number; tasks: number }) ?? { jobs: 0, tasks: 0 }));
  }, [member.id]);
  const receivers = members.filter((m) => m.id !== member.id && m.role !== "ta_coordinator");
  const needs = !!hold && (hold.jobs > 0 || hold.tasks > 0);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Deactivate ${member.name}?`}
      description="They won't be able to sign in. Their history stays in the activity log."
      footer={
        <Button variant="danger" onClick={async () => (setBusy(true), await onConfirm(to || null), setBusy(false))} loading={busy} disabled={!hold || (needs && !to)} data-testid="deactivate-confirm">
          {needs ? `Transfer & deactivate` : "Deactivate"}
        </Button>
      }
    >
      {!hold ? (
        <p className="text-sm text-ink-500">Checking what {member.name} owns…</p>
      ) : needs ? (
        <div className="space-y-3">
          <p className="text-[14px] text-ink-700" data-testid="holdings">
            Transfer <b>{hold.jobs} job{hold.jobs === 1 ? "" : "s"}</b> and <b>{hold.tasks} open task{hold.tasks === 1 ? "" : "s"}</b> to…
          </p>
          <SelectField label="New owner" required value={to} onChange={setTo} options={receivers.map((m) => ({ value: m.id, label: `${m.name} · ${roleLabel(m.role)}` }))} placeholder="Choose a member" />
          <p className="text-[12px] text-ink-400">They get a notification. A TA coordinator can't own jobs.</p>
        </div>
      ) : (
        <p className="text-[14px] text-ink-700">{member.name} doesn't own any open jobs or tasks.</p>
      )}
    </Dialog>
  );
}
