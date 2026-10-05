"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SelectField, TextArea, TextField } from "@/components/ui/fields";
import { Segmented } from "@/components/ui/interactive";
import { UserSelect } from "@/components/pickers";
import { CLIENT_STATUSES, INDIAN_STATES, INDUSTRIES } from "@/lib/constants";
import { cn, friendlyError } from "@/lib/utils";
import type { ClientFormData } from "./client-defaults";

export function ClientForm({ initial }: { initial: ClientFormData }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ClientFormData>(k: K, v: ClientFormData[K]) => setF((p) => ({ ...p, [k]: v }));
  const setContact = (i: number, patch: Partial<ClientFormData["contacts"][number]>) =>
    setF((p) => ({ ...p, contacts: p.contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : patch.is_primary ? { ...c, is_primary: false } : c)) }));

  async function save() {
    if (!f.name.trim()) return toast.error("Client name is required");
    setSaving(true);
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    const row = {
      name: f.name.trim(),
      industry: f.industry || null,
      website: f.website.trim() || null,
      city: f.city.trim() || null,
      state: f.state || null,
      address: f.address.trim() || null,
      gstin: f.gstin.trim().toUpperCase() || null,
      status: f.status,
      fee_type: f.fee_type,
      fee_value: f.fee_value ? Number(f.fee_value) : null,
      payment_terms_days: f.payment_terms_days ? Number(f.payment_terms_days) : null,
      replacement_days: f.replacement_days ? Number(f.replacement_days) : null,
      agreement_start: f.agreement_start || null,
      agreement_end: f.agreement_end || null,
      account_manager: f.account_manager || null,
      notes: f.notes.trim() || null,
    };
    const res = f.id
      ? await supabase.from("clients").update(row).eq("id", f.id).select("id").single()
      : await supabase.from("clients").insert({ ...row, created_by: me.user?.id }).select("id").single();
    if (res.error || !res.data) {
      setSaving(false);
      return toast.error(res.error?.message.includes("duplicate") ? "A client with this name already exists" : friendlyError(res.error?.message));
    }
    const id = res.data.id;
    await supabase.from("client_contacts").delete().eq("client_id", id);
    const contacts = f.contacts.filter((c) => c.name.trim());
    if (contacts.length) {
      await supabase.from("client_contacts").insert(
        contacts.map((c) => ({
          client_id: id,
          name: c.name.trim(),
          designation: c.designation.trim() || null,
          email: c.email.trim() || null,
          phone: c.phone.trim() || null,
          is_primary: c.is_primary,
        }))
      );
    }
    toast.success(f.id ? "Client updated" : "Client added");
    router.push(`/clients/${id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <Section title="Company" description="Basic details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Company name" required value={f.name} onChange={(v) => set("name", v)} autoFocus />
          <SelectField label="Industry" value={f.industry} onChange={(v) => set("industry", v)} options={INDUSTRIES} />
          <TextField label="Website" value={f.website} onChange={(v) => set("website", v)} placeholder="acme.com" />
          <TextField label="City" value={f.city} onChange={(v) => set("city", v)} />
          <SelectField label="State" value={f.state} onChange={(v) => set("state", v)} options={INDIAN_STATES} />
          <TextArea className="sm:col-span-2" label="Address" rows={2} value={f.address} onChange={(v) => set("address", v)} />
          <TextField label="GSTIN" value={f.gstin} onChange={(v) => set("gstin", v.toUpperCase())} maxLength={15} />
          <UserSelect label="Account manager" value={f.account_manager} onChange={(v) => set("account_manager", v)} placeholder="Choose a team member" />
          <div className="sm:col-span-2">
            <span className="field-label">Status</span>
            <Segmented value={f.status} onChange={(v) => set("status", v)} options={CLIENT_STATUSES.map((s) => ({ value: s, label: s }))} />
          </div>
        </div>
      </Section>

      <Section title="Contacts" description="HR / hiring managers you work with">
        <div className="space-y-3">
          {f.contacts.map((c, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface-2 p-4">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setContact(i, { is_primary: true })}
                  className={cn("inline-flex items-center gap-1.5 text-xs font-medium", c.is_primary ? "text-saffron-600" : "text-ink-400 hover:text-ink-700")}
                >
                  <Star className={cn("h-3.5 w-3.5", c.is_primary && "fill-saffron")} />
                  {c.is_primary ? "Primary contact" : "Make primary"}
                </button>
                <button
                  type="button"
                  onClick={() => set("contacts", f.contacts.filter((_, idx) => idx !== i))}
                  className="rounded-md p-1 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  aria-label="Remove contact"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Name" value={c.name} onChange={(v) => setContact(i, { name: v })} />
                <TextField label="Designation" value={c.designation} onChange={(v) => setContact(i, { designation: v })} placeholder="HR Manager, Tech Lead…" />
                <TextField label="Email" type="email" value={c.email} onChange={(v) => setContact(i, { email: v })} />
                <TextField label="Phone" type="tel" value={c.phone} onChange={(v) => setContact(i, { phone: v })} />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("contacts", [...f.contacts, { name: "", designation: "", email: "", phone: "", is_primary: f.contacts.length === 0 }])}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-2.5 text-sm font-medium text-ink-600 hover:border-jade hover:bg-jade-50 hover:text-jade-700"
          >
            <Plus className="h-4 w-4" /> Add contact
          </button>
        </div>
      </Section>

      <Section title="Commercials" description="Used to calculate the revenue estimate">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <span className="field-label">Fee type</span>
            <Segmented
              value={f.fee_type}
              onChange={(v) => set("fee_type", v)}
              options={[
                { value: "Percentage", label: "% of CTC" },
                { value: "Fixed", label: "Fixed ₹" },
              ]}
            />
          </div>
          <TextField
            label={f.fee_type === "Fixed" ? "Fee per hire" : "Fee"}
            type="number"
            min={0}
            step={0.01}
            prefix={f.fee_type === "Fixed" ? "₹" : undefined}
            suffix={f.fee_type === "Fixed" ? undefined : "%"}
            value={f.fee_value}
            onChange={(v) => set("fee_value", v)}
          />
          <TextField label="Payment terms" type="number" min={0} suffix="days" value={f.payment_terms_days} onChange={(v) => set("payment_terms_days", v)} />
          <TextField label="Replacement guarantee" type="number" min={0} suffix="days" value={f.replacement_days} onChange={(v) => set("replacement_days", v)} />
          <TextField label="Agreement start" type="date" value={f.agreement_start} onChange={(v) => set("agreement_start", v)} />
          <TextField label="Agreement end" type="date" value={f.agreement_end} onChange={(v) => set("agreement_end", v)} />
        </div>
        <TextArea className="mt-4" label="Notes" rows={3} value={f.notes} onChange={(v) => set("notes", v)} placeholder="Hiring process, interview rounds, special instructions…" />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur lg:left-[var(--sidebar-w,248px)]">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2 px-4 py-3">
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {f.id ? "Save changes" : "Add client"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Section({ title, description, children, id }: { title: string; description?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border border-line bg-surface shadow-card">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-400">{description}</p>}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
