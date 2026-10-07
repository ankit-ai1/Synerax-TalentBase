"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { roleHome } from "@/lib/roles";
import { TextField } from "@/components/ui/fields";
import { PasswordInput } from "./auth-shell";

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-jade px-6 text-[15px] font-semibold text-white shadow-glow hover:brightness-110 disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

function NewPasswordFields({
  pw,
  setPw,
  confirm,
  setConfirm,
}: {
  pw: string;
  setPw: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
}) {
  const uid = useId();
  const [show, setShow] = useState(false);
  return (
    <>
      <div>
        <label htmlFor={`${uid}-new`} className="field-label">
          New password
        </label>
        <PasswordInput id={`${uid}-new`} value={pw} onChange={setPw} show={show} onToggle={() => setShow((s) => !s)} />
        <p className="mt-1 text-xs text-ink-400">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor={`${uid}-confirm`} className="field-label">
          Confirm new password
        </label>
        <PasswordInput id={`${uid}-confirm`} value={confirm} onChange={setConfirm} show={show} onToggle={() => setShow((s) => !s)} />
      </div>
    </>
  );
}

const checkNew = (pw: string, confirm: string) =>
  pw.length < 8 ? "Use at least 8 characters" : pw !== confirm ? "The passwords don't match" : null;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    // Same message either way, so the form doesn't reveal which emails have accounts
    if (error && /rate|limit/i.test(error.message)) return toast.error("Please wait a minute before trying again.");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="py-4 text-center" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-jade-50 text-jade-700">
          <MailCheck className="h-7 w-7" aria-hidden />
        </span>
        <p className="mt-4 text-[15px] text-ink-700">
          If an account exists for <b className="font-semibold">{email}</b>, a reset link is on its way.
        </p>
        <p className="mt-1 text-sm text-ink-400">The link expires after a short while — check your spam folder too.</p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField label="Email" type="email" required autoComplete="email" value={email} onChange={setEmail} />
      <SubmitButton busy={busy}>Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setReady(!!data.session));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = checkNew(pw, confirm);
    if (problem) return toast.error(problem);
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    toast.success("Password updated");
    router.replace(roleHome(profile?.role));
    router.refresh();
  }

  if (ready === null) return <div className="h-40 animate-pulse rounded-xl bg-surface-3" aria-busy="true" />;
  if (!ready) {
    return (
      <div className="text-center">
        <p className="text-[15px] text-ink-700">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="mt-4 inline-flex text-sm font-semibold text-jade-700 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <NewPasswordFields pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} />
      <SubmitButton busy={busy}>Update password</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm({ email, home }: { email: string; home: string }) {
  const uid = useId();
  const [current, setCurrent] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = checkNew(pw, confirm) ?? (pw === current ? "The new password must be different" : null);
    if (problem) return toast.error(problem);
    setBusy(true);
    const supabase = createClient();
    // confirm the current password first
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: current });
    if (authErr) {
      setBusy(false);
      return toast.error("Your current password is incorrect");
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Password changed");
  }

  if (done) {
    return (
      <div className="py-4 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-jade" aria-hidden />
        <p className="mt-3 text-[15px] font-medium text-ink-800">Your password has been changed.</p>
        <Link href={home} className="mt-5 inline-flex text-sm font-semibold text-jade-700 hover:underline">
          Back to your account
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${uid}-current`} className="field-label">
          Current password
        </label>
        <PasswordInput
          id={`${uid}-current`}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          show={showCurrent}
          onToggle={() => setShowCurrent((s) => !s)}
        />
      </div>
      <NewPasswordFields pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} />
      <SubmitButton busy={busy}>Change password</SubmitButton>
    </form>
  );
}
