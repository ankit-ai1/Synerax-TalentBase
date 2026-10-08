"use client";

import { BrandMark } from "@/components/brand-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import {
  Bell,
  Briefcase,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ThemeSegmented } from "@/components/theme";
import { MotionProvider } from "@/components/site/motion";
import { Menu, MenuDivider } from "@/components/ui/interactive";
import { Avatar } from "@/components/portal-ui/kit";
import { cn } from "@/lib/utils";

const ICONS = { dashboard: LayoutDashboard, jobs: Briefcase, search: Search, applications: ClipboardList, profile: UserRound, post: PlusCircle, bell: Bell } satisfies Record<string, LucideIcon>;
export type PortalIcon = keyof typeof ICONS;
export type PortalNavItem = { href: string; label: string; /** shorter label for the phone tab bar */ short?: string; exact?: boolean; icon?: PortalIcon; /** sub-paths owned by another item */ exclude?: string[] };

/** Branded layout for the candidate and client portals */
export function PortalShell({
  area,
  nav,
  user,
  children,
  actions,
  profileHref,
}: {
  area: "Candidate portal" | "Client portal";
  nav: PortalNavItem[];
  user: { name: string; email: string; subtitle?: string };
  children: React.ReactNode;
  actions?: React.ReactNode;
  profileHref?: string;
}) {
  const path = usePathname();
  const active = (n: PortalNavItem) => (n.exact ? path === n.href : (path === n.href || path.startsWith(n.href + "/")) && !n.exclude?.some((x) => path === x || path.startsWith(x + "/")));
  const home = nav[0]?.href ?? "/";

  return (
    <MotionProvider>
      <div className="min-h-screen bg-canvas">
        <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/75 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/60">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href={home} className="brand flex shrink-0 items-center gap-2.5" aria-label={`${area} home`}>
              <BrandMark size={32} />
              <span className="hidden leading-tight sm:block">
                <span className="block whitespace-nowrap text-[15px] tracking-[-0.03em]">
                  <span className="font-semibold text-ink-900">Synerax</span> <span className="font-medium text-ink-500">Talent</span>
                  <span className="ember-text font-semibold">Base</span>
                </span>
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">{area}</span>
              </span>
            </Link>

            <nav className="ml-6 hidden items-center gap-1 rounded-2xl border border-line/70 bg-surface/60 p-1 md:flex" aria-label={area}>
              {nav.map((n) => {
                const on = active(n);
                const Icon = n.icon ? ICONS[n.icon] : null;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={on ? "page" : undefined}
                    className={cn("relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors", on ? "text-ink-900" : "text-ink-500 hover:text-ink-900")}
                  >
                    {on && (
                      <m.span
                        layoutId={`nav-pill-${area}`}
                        className="absolute inset-0 rounded-xl bg-surface shadow-card ring-1 ring-line"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        aria-hidden
                      />
                    )}
                    {Icon && <Icon className={cn("relative h-4 w-4", on ? "text-jade-700" : "")} aria-hidden />}
                    <span className="relative">{n.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-1">
              {actions}
              <Menu
                align="end"
                width="w-72"
                trigger={({ toggle }) => (
                  <button onClick={toggle} className="ml-1 flex items-center gap-2 rounded-full p-0.5 pr-0.5 ring-1 ring-line transition hover:ring-jade/40 sm:pr-3" aria-label="Account menu">
                    <Avatar name={user.name || user.email} size={34} />
                    <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-ink-800 sm:block">{(user.name || user.email).split(" ")[0]}</span>
                  </button>
                )}
              >
                {(close) => (
                  <div>
                    <div className="flex items-center gap-3 px-2.5 py-2.5">
                      <Avatar name={user.name || user.email} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                        <p className="truncate text-xs text-ink-400">{user.subtitle ?? user.email}</p>
                      </div>
                    </div>
                    <MenuDivider />
                    {profileHref && (
                      <Link href={profileHref} onClick={close} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-700 hover:bg-surface-3">
                        <UserRound className="h-4 w-4 text-ink-400" /> My profile
                      </Link>
                    )}
                    <Link href="/account/password" onClick={close} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-700 hover:bg-surface-3">
                      <KeyRound className="h-4 w-4 text-ink-400" /> Change password
                    </Link>
                    <div className="px-2.5 pb-1 pt-2">
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-400">Theme</p>
                      <ThemeSegmented />
                    </div>
                    <MenuDivider />
                    <form action="/auth/signout" method="post">
                      <button type="submit" className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-700 hover:bg-surface-3">
                        <LogOut className="h-4 w-4 text-ink-400" /> Sign out
                      </button>
                    </form>
                  </div>
                )}
              </Menu>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-16 lg:px-8">{children}</main>

        {/* phone tab bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
          aria-label={`${area} (mobile)`}
        >
          <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
            {nav.map((n) => {
              const on = active(n);
              const Icon = ICONS[n.icon ?? "dashboard"];
              return (
                <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium">
                  {on && <m.span layoutId={`tab-${area}`} className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-jade" aria-hidden />}
                  <Icon className={cn("h-5 w-5", on ? "text-jade-700" : "text-ink-400")} aria-hidden />
                  <span className={on ? "text-ink-900" : "text-ink-500"}>{n.short ?? n.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </MotionProvider>
  );
}
