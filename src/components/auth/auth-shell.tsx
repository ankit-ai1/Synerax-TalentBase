import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/utils";

/** Branded, centred layout for register / password / account pages */
export function AuthShell({
  title,
  subtitle,
  children,
  width = "sm",
  back = { href: "/", label: "Back to website" },
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg";
  back?: { href: string; label: string } | null;
}) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-canvas">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="hairline-grid absolute inset-0 [mask-image:radial-gradient(70%_55%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-40 left-1/2 h-80 w-[640px] -translate-x-1/2 rounded-full bg-jade/20 blur-3xl" />
      </div>
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center" aria-label="Synerax TalentBase home">
          <BrandLogo size={32} textClassName="text-[17px]" />
        </Link>
        <div className="flex items-center gap-2">
          {back && (
            <Link href={back.href} className="hidden items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900 sm:inline-flex">
              <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
            </Link>
          )}
          <ThemeToggle />
        </div>
      </header>
      <main className={cn("mx-auto px-4 pb-16 pt-6 sm:pt-10", width === "sm" ? "max-w-md" : width === "md" ? "max-w-xl" : "max-w-2xl")}>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900 sm:text-[32px]">{title}</h1>
        {subtitle && <div className="mt-2 text-[15px] text-ink-500">{subtitle}</div>}
        <div className="mt-7 rounded-3xl border border-line bg-surface p-6 shadow-pop sm:p-8">{children}</div>
      </main>
    </div>
  );
}

/** Password input with a show/hide toggle */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "new-password",
  show,
  onToggle,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input pr-16"
      />
      <button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 px-3 text-[12px] font-semibold text-ink-500 hover:text-ink-900" aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
