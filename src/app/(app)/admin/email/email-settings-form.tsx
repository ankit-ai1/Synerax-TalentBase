"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { ChipInput, Switch, TextField } from "@/components/ui/fields";
import { AUDIENCE_LABEL, EMAIL_EVENTS, type EmailAudience } from "@/lib/email/events";
import { friendlyError } from "@/lib/utils";

type Settings = { sender_name: string; notify_emails: string[]; events: Record<string, boolean> };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSettingsForm({
  initial,
  smtp,
  myEmail,
}: {
  initial: Settings;
  smtp: { configured: boolean; host: string | null; from: string | null; envInbox: string | null };
  myEmail: string;
}) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState(myEmail);
  const [testing, setTesting] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  const groups = (["synerax", "client", "candidate"] as EmailAudience[]).map((aud) => ({ aud, items: EMAIL_EVENTS.filter((e) => e.audience === aud) }));

  async function save() {
    const bad = s.notify_emails.find((e) => !EMAIL_RE.test(e));
    if (bad) return toast.error(`“${bad}” is not a valid email`);
    if (!s.sender_name.trim()) return toast.error("Sender name is required");
    setSaving(true);
    const {
      data: { user },
    } = await createClient().auth.getUser();
    const { error } = await createClient()
      .from("email_settings")
      .update({ sender_name: s.sender_name.trim(), notify_emails: s.notify_emails, events: s.events, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Email settings saved");
    router.refresh();
  }

  async function test() {
    setTesting(true);
    const res = await fetch("/api/admin/email/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: testTo }) });
    const out = await res.json().catch(() => ({}));
    setTesting(false);
    if (!res.ok) return toast.error(out.error ?? "Could not send the test email");
    toast.success(`Test email sent to ${testTo}`);
    router.refresh();
  }

  const setEvent = (key: string, on: boolean) =>
    setS((x) => {
      const events = { ...x.events };
      if (on) delete events[key];
      else events[key] = false;
      return { ...x, events };
    });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="SMTP connection" description="Configured with environment variables on the server" />
          <div className="space-y-4 p-5">
            {smtp.configured ? (
              <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Connected to <b>{smtp.host}</b>
                  {smtp.from ? (
                    <>
                      {" "}
                      · sending as <b>{smtp.from}</b>
                    </>
                  ) : null}
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2 rounded-lg bg-saffron-50 px-3 py-2 text-[13px] text-saffron-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  SMTP is not configured — emails are logged as <b>skipped</b>. Add <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> and{" "}
                  <code>MAIL_FROM</code> in Vercel and redeploy.
                </span>
              </p>
            )}
            <div className="flex items-end gap-2">
              <TextField label="Send a test email to" type="email" value={testTo} onChange={setTestTo} className="flex-1" />
              <Button variant="secondary" onClick={test} loading={testing} disabled={!EMAIL_RE.test(testTo)}>
                <Send className="h-4 w-4" /> Test
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sender & team inboxes" />
          <div className="space-y-5 p-5">
            <TextField label="Sender name" value={s.sender_name} onChange={(v) => setS({ ...s, sender_name: v })} hint="Shown as the “From” name in every email" maxLength={60} />
            <ChipInput
              label="Notify these inboxes"
              value={s.notify_emails}
              onChange={(v) => setS({ ...s, notify_emails: v.map((x) => x.trim().toLowerCase()).filter(Boolean) })}
              placeholder="hr@synerax.in — press Enter"
              hint={
                s.notify_emails.length
                  ? "Team emails (new client jobs, approvals, applications, daily digest) go here."
                  : smtp.envInbox
                    ? `Empty — falling back to SYNERAX_NOTIFY_EMAILS (${smtp.envInbox}).`
                    : "Empty — team emails will be skipped until you add an inbox."
              }
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Automated emails"
          description="Every email also creates an in-app notification, even when the email is off."
          action={
            <Button onClick={save} loading={saving} disabled={!dirty} size="sm">
              Save changes
            </Button>
          }
        />
        <div className="divide-y divide-line">
          {groups.map((g) => (
            <div key={g.aud} className="px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">{AUDIENCE_LABEL[g.aud]}</p>
              <div className="space-y-3">
                {g.items.map((e) => (
                  <Switch key={e.key} checked={s.events[e.key] !== false} onChange={(on) => setEvent(e.key, on)} label={e.label} />
                ))}
              </div>
            </div>
          ))}
        </div>
        {dirty && (
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur">
            <span className="mr-auto text-[13px] text-ink-500">Unsaved changes</span>
            <Button variant="ghost" size="sm" onClick={() => setS(initial)}>
              Discard
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
