"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ChipInput, TextField } from "@/components/ui/fields";
import { friendlyError } from "@/lib/utils";

type Q = { provider_name: string; daily_limit: number; window_hours: number; thresholds: number[]; alert_emails: string[]; failure_alert_after: number };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** email_quota settings. Admins always get the alerts; extra addresses go here (e.g. a personal address on another provider). */
export function QuotaSettingsForm({ initial }: { initial: Q }) {
  const router = useRouter();
  const [f, setF] = useState({
    provider_name: initial.provider_name,
    daily_limit: String(initial.daily_limit),
    window_hours: String(initial.window_hours),
    thresholds: initial.thresholds.join(", "),
    alert_emails: initial.alert_emails,
    failure_alert_after: String(initial.failure_alert_after),
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    const limit = Number(f.daily_limit);
    const hours = Number(f.window_hours);
    const after = Number(f.failure_alert_after);
    const thresholds = [...new Set(f.thresholds.split(/[,\s]+/).filter(Boolean).map(Number))].sort((a, b) => a - b);
    if (!f.provider_name.trim()) return toast.error("Provider name is required");
    if (!Number.isInteger(limit) || limit < 1) return toast.error("Daily limit must be a whole number above 0");
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) return toast.error("Window must be 1–168 hours");
    if (thresholds.some((t) => !Number.isInteger(t) || t < 1 || t > 99)) return toast.error("Thresholds are percentages from 1 to 99, e.g. 80, 90");
    if (!Number.isInteger(after) || after < 1) return toast.error("Failure alert must be at least 1");
    const bad = f.alert_emails.find((e) => !EMAIL_RE.test(e));
    if (bad) return toast.error(`“${bad}” is not a valid email`);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("email_quota")
      .update({ provider_name: f.provider_name.trim(), daily_limit: limit, window_hours: hours, thresholds, alert_emails: f.alert_emails, failure_alert_after: after, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Quota settings saved");
    router.refresh();
  }

  return (
    <details className="border-t border-line">
      <summary className="cursor-pointer px-5 py-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">Quota & alert settings</summary>
      <div className="grid gap-4 p-5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="Provider" value={f.provider_name} onChange={(v) => set("provider_name", v)} hint="e.g. Gmail SMTP, Brevo, Resend" />
        <TextField label="Daily limit" value={f.daily_limit} onChange={(v) => set("daily_limit", v.replace(/\D/g, ""))} inputMode="numeric" hint="Gmail Workspace ≈ 2,000/day · free Gmail ≈ 500/day" />
        <TextField label="Rolling window" value={f.window_hours} onChange={(v) => set("window_hours", v.replace(/\D/g, ""))} suffix="hours" inputMode="numeric" />
        <TextField label="Alert at (% used)" value={f.thresholds} onChange={(v) => set("thresholds", v.replace(/[^\d,\s]/g, ""))} hint="Comma separated. 100% (limit reached) always alerts." />
        <TextField label="Alert after failures in a row" value={f.failure_alert_after} onChange={(v) => set("failure_alert_after", v.replace(/\D/g, ""))} inputMode="numeric" />
        <ChipInput label="Extra alert recipients" value={f.alert_emails} onChange={(v) => set("alert_emails", v)} hint="Admins always get alerts. Add a secondary address (ideally on another provider)." />
        <div className="sm:col-span-2 lg:col-span-3">
          <Button onClick={save} loading={saving}>
            Save quota settings
          </Button>
        </div>
      </div>
    </details>
  );
}
