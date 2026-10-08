"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Mail, Phone, Plus, ShieldCheck, ShieldOff, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/ui/misc";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/fields";
import { cn, formatDate } from "@/lib/utils";

export type ClientLogin = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string | null;
};

function CredentialsDialog({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const text = `Synerax TalentBase client portal\nSign in: ${window.location.origin}/login\nEmail: ${email}\nTemporary password: ${password}\n\nPlease change your password after signing in (account menu → Change password).`;
  return (
    <Dialog
      open
      onClose={onClose}
      title="Login ready"
      description="Share these details with the client. The password is shown only once."
      footer={
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => {});
            toast.success("Copied to clipboard");
          }}
        >
          <Copy className="h-4 w-4" /> Copy login details
        </Button>
      }
    >
      <dl className="space-y-3 rounded-xl border border-line bg-surface-2 p-4 text-sm">
        <div>
          <dt className="text-xs text-ink-400">Email</dt>
          <dd className="font-medium text-ink-900">{email}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-400">Temporary password</dt>
          <dd className="font-mono text-[15px] font-semibold tracking-wide text-ink-900">{password}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ink-400">Email delivery of these details is added with email automation (Phase 6).</p>
    </Dialog>
  );
}

/** Staff: manage client-portal logins for one client */
export function PortalAccess({ clientId, clientName, logins }: { clientId: string; clientName: string; logins: ClientLogin[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", designation: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [confirm, setConfirm] = useState<{ login: ClientLogin; action: "reset" | "toggle" } | null>(null);

  async function create() {
    setBusy("create");
    const res = await fetch("/api/client-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, ...form }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast.error(json.error ?? "Could not create the login");
    setAdding(false);
    setForm({ name: "", email: "", phone: "", designation: "" });
    setCreds({ email: json.email, password: json.password });
    router.refresh();
  }

  async function act() {
    if (!confirm) return;
    const { login, action } = confirm;
    setBusy(login.id);
    const res = await fetch(`/api/client-users/${login.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "reset" ? { reset_password: true } : { is_active: !login.is_active }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    setConfirm(null);
    if (!res.ok) return toast.error(json.error ?? "Something went wrong");
    if (action === "reset") setCreds({ email: login.email, password: json.password });
    else toast.success(login.is_active ? "Access deactivated" : "Access restored");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Client portal access"
        description={`People at ${clientName} who can sign in to post jobs and review shared profiles.`}
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add login
          </Button>
        }
      />
      {logins.length === 0 ? (
        <EmptyState
          icon={<UserRound className="h-5 w-5" />}
          title="No portal logins yet"
          description="Add a login so the client can post jobs, review profiles Synerax shares and give interview feedback."
        />
      ) : (
        <ul className="divide-y divide-line">
          {logins.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-900">
                  {l.name}
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", l.is_active ? "bg-jade-50 text-jade-700" : "bg-surface-3 text-ink-500")}>
                    {l.is_active ? "Active" : "Deactivated"}
                  </span>
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-ink-500">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" aria-hidden /> {l.email}
                  </span>
                  {l.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" aria-hidden /> {l.phone}
                    </span>
                  )}
                  {l.designation && <span>{l.designation}</span>}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-400">
                  Added {formatDate(l.created_at)} · {l.last_sign_in_at ? `Last sign-in ${formatDate(l.last_sign_in_at)}` : "Never signed in"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setConfirm({ login: l, action: "reset" })} loading={busy === l.id && confirm?.action === "reset"}>
                  <KeyRound className="h-3.5 w-3.5" /> Reset password
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirm({ login: l, action: "toggle" })}>
                  {l.is_active ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  {l.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add client login"
        description="A temporary password is generated. The client can change it after signing in."
        footer={
          <Button onClick={create} loading={busy === "create"} disabled={!form.name.trim() || !form.email.trim()}>
            Create login
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Full name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <TextField className="sm:col-span-2" label="Work email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <TextField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <TextField label="Designation" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} placeholder="e.g. HR Manager" />
        </div>
      </Dialog>

      {creds && <CredentialsDialog email={creds.email} password={creds.password} onClose={() => setCreds(null)} />}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={act}
        loading={!!busy && busy === confirm?.login.id}
        danger={confirm?.action === "toggle" && confirm.login.is_active}
        title={confirm?.action === "reset" ? `Reset password for ${confirm.login.name}?` : confirm?.login.is_active ? `Deactivate ${confirm?.login.name}?` : `Restore access for ${confirm?.login.name}?`}
        description={
          confirm?.action === "reset"
            ? "A new temporary password will be generated. Their current password stops working."
            : confirm?.login.is_active
              ? "They won't be able to sign in to the client portal until you activate them again."
              : "They'll be able to sign in again with their existing password."
        }
        confirmLabel={confirm?.action === "reset" ? "Reset password" : confirm?.login.is_active ? "Deactivate" : "Activate"}
      />
    </Card>
  );
}
