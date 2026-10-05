"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { Avatar, Badge, Card } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types";

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export function UsersManager({ users, meId, added }: { users: Profile[]; meId: string; added: Record<string, number> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", role: "hr", password: genPassword() });
  const [saving, setSaving] = useState(false);
  const [reset, setReset] = useState<{ user: Profile; password: string } | null>(null);

  async function patch(id: string, body: Record<string, unknown>, ok: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error ?? "Failed");
      return false;
    }
    toast.success(ok);
    router.refresh();
    return true;
  }

  async function create() {
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(j.error ?? "Couldn't create user");
    toast.success(`Account created for ${form.full_name}`);
    navigator.clipboard?.writeText(`Login: ${location.origin}\nEmail: ${form.email}\nPassword: ${form.password}`).catch(() => {});
    toast.message("Login details copied to clipboard — send them to the user.");
    setOpen(false);
    setForm({ full_name: "", email: "", role: "hr", password: genPassword() });
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add team member
        </Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-400">
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Candidates added</th>
                <th className="px-3 py-3 font-medium">Joined</th>
                <th className="px-3 py-3 font-medium">Access</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className={u.is_active ? "" : "opacity-55"}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.full_name || u.email} size="sm" />
                      <div>
                        <p className="font-medium text-ink-800">
                          {u.full_name} {u.id === meId && <span className="text-xs font-normal text-ink-400">(you)</span>}
                        </p>
                        <p className="text-xs text-ink-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={u.role}
                      disabled={u.id === meId}
                      onChange={(e) => patch(u.id, { role: e.target.value }, "Role updated")}
                      className="field-input h-8 w-24 text-[13px]"
                      aria-label="Role"
                    >
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-3 tabular text-ink-700">{added[u.id] ?? 0}</td>
                  <td className="px-3 py-3 text-ink-500">{formatDate(u.created_at)}</td>
                  <td className="px-3 py-3">{u.is_active ? <Badge tone="jade">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setReset({ user: u, password: genPassword() })}>
                        <KeyRound className="h-3.5 w-3.5" /> Password
                      </Button>
                      {u.id !== meId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={u.is_active ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700" : ""}
                          onClick={() => patch(u.id, { is_active: !u.is_active }, u.is_active ? "Access revoked" : "Access restored")}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add team member"
        description="The account is created instantly. You'll need to copy and send the login details."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} loading={saving} disabled={!form.full_name || !form.email}>
              Create account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField label="Full name" required value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <TextField label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <SelectField
            label="Role"
            value={form.role}
            onChange={(v) => setForm({ ...form, role: v || "hr" })}
            options={[
              { value: "hr", label: "HR — candidates add/edit/search" },
              { value: "admin", label: "Admin — everything + team management" },
            ]}
            placeholder="Choose a role"
          />
          <div>
            <TextField label="Temporary password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} className="font-mono" />
            <button type="button" className="mt-1 text-xs font-medium text-jade-700 hover:underline" onClick={() => setForm({ ...form, password: genPassword() })}>
              Generate new password
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!reset}
        onClose={() => setReset(null)}
        title={`Reset password for ${reset?.user.full_name ?? ""}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReset(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!reset) return;
                const ok = await patch(reset.user.id, { password: reset.password }, "Password reset");
                if (ok) {
                  navigator.clipboard?.writeText(reset.password).catch(() => {});
                  toast.message("New password copied to clipboard");
                  setReset(null);
                }
              }}
            >
              Reset password
            </Button>
          </>
        }
      >
        {reset && <TextField label="New password" value={reset.password} onChange={(v) => setReset({ ...reset, password: v })} />}
      </Dialog>
    </>
  );
}
