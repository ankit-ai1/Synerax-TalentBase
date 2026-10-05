import { Suspense } from "react";
import { LogoMark } from "@/components/shell/sidebar";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata = { title: "Login" };

const PIPE = [
  { stage: "Sourced", n: 48, w: 100 },
  { stage: "Submitted", n: 21, w: 64 },
  { stage: "Interview", n: 11, w: 40 },
  { stage: "Offered", n: 5, w: 22 },
  { stage: "Joined", n: 3, w: 14 },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.15fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_60%_at_0%_0%,rgba(21,148,135,0.35),transparent_60%),radial-gradient(60%_50%_at_100%_100%,rgba(240,178,82,0.16),transparent_60%)]" />
        <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />

        <div className="relative flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>

        <div className="relative max-w-lg">
          <p className="text-[40px] font-semibold leading-[1.08] tracking-[-0.03em]">
            From sourcing to joining,
            <br />
            every candidate in one place.
          </p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
            Profiles, client jobs, interview rounds and follow-ups — your whole recruiting team in one pipeline.
          </p>

          {/* pipeline motif */}
          <div className="mt-10 max-w-md space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-sm font-medium">Senior React Developer</p>
              <p className="text-xs text-white/50">Acme Fintech</p>
            </div>
            {PIPE.map((p, i) => (
              <div key={p.stage} className="flex items-center gap-3 text-xs">
                <span className="w-20 text-white/55">{p.stage}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.w}%`,
                      background: i === PIPE.length - 1 ? "#F0B252" : `rgba(45,190,172,${0.95 - i * 0.12})`,
                    }}
                  />
                </div>
                <span className="w-6 text-right font-medium tabular text-white/80">{p.n}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">For authorised Admin and HR team members only.</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <LogoMark size={32} />
            <span className="text-lg font-semibold tracking-tight text-ink-900">{APP_NAME}</span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-ink-500">Sign in with your company email and password.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
