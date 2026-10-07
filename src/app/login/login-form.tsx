"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { nextFor } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    params.get("error") === "inactive"
      ? "Your account is deactivated. Please contact Synerax."
      : params.get("error") === "link"
        ? "That link is invalid or has expired. Please try again."
        : ""
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "Incorrect email or password."
          : error.message.includes("Email not confirmed")
            ? "Please verify your email first — check your inbox for the confirmation link."
            : error.message
      );
      setLoading(false);
      return;
    }
    // Send each role to its own area (staff app, client portal or candidate portal)
    const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      setError("Your account is deactivated. Please contact Synerax.");
      setLoading(false);
      return;
    }
    router.replace(nextFor(profile.role, params.get("next")));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={setEmail} placeholder="name@company.com" />
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-[13px] font-medium text-ink-700">
            Password
          </label>
          <Link href="/forgot-password" className="text-[13px] font-medium text-jade-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input pr-10"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 hover:text-ink-800"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Sign in
      </Button>
      <p className="pt-2 text-center text-sm text-ink-500">
        Looking for a job?{" "}
        <Link href="/register" className="font-semibold text-jade-700 hover:underline">
          Create a candidate account
        </Link>
      </p>
    </form>
  );
}
