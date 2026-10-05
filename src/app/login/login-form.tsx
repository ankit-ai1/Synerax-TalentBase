"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
    params.get("error") === "inactive" ? "Your account is deactivated. Please contact your admin." : ""
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(
        error.message.includes("Invalid login") ? "Incorrect email or password." : error.message
      );
      setLoading(false);
      return;
    }
    const next = params.get("next");
    router.replace(next && next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={setEmail} placeholder="name@company.com" />
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
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
      <p className="pt-2 text-center text-xs text-ink-400">Forgot your password? Ask your admin to reset it.</p>
    </form>
  );
}
