"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme";
import { Menu, MenuDivider } from "@/components/ui/interactive";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export type PortalNavItem = { href: string; label: string; /** shorter label for the phone tab bar */ short?: string; exact?: boolean };

/** Simple, branded layout for the candidate and client portals */
export function PortalShell({
  area,
  nav,
  user,
  children,
  actions,
}: {
  area: "Candidate portal" | "Client portal";
  nav: PortalNavItem[];
  user: { name: string; email: string; subtitle?: string };
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const path = usePathname();
  const active = (n: PortalNavItem) => (n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/"));
  const home = nav[0]?.href ?? "/";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href={home} className="flex shrink-0 items-center gap-2.5" aria-label={`${area} home`}>
            <Image src="/logo.png" alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
            <span className="hidden leading-tight sm:block">
              <span className="block text-[15px] font-semibold tracking-[-0.02em] text-ink-900">
                Synerax <span className="text-jade-700">Talent</span>
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">{area}</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label={area}>
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                  active(n) ? "bg-surface-3 text-ink-900" : "text-ink-500 hover:text-ink-900"
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {actions}
            <ThemeToggle />
            <Menu
              align="end"
              width="w-64"
              trigger={({ toggle }) => (
                <button onClick={toggle} className="flex items-center gap-2 rounded-xl p-1 hover:bg-surface-3" aria-label="Account menu">
                  <Avatar name={user.name || user.email} size="sm" />
                </button>
              )}
            >
              {() => (
                <div>
                  <div className="px-2.5 py-2">
                    <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
                    <p className="truncate text-xs text-ink-400">{user.subtitle ?? user.email}</p>
                  </div>
                  <MenuDivider />
                  <Link href="/account/password" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-700 hover:bg-surface-3">
                    <KeyRound className="h-4 w-4 text-ink-400" /> Change password
                  </Link>
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

        {/* mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 [scrollbar-width:none] md:hidden" aria-label={`${area} (mobile)`}>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n) ? "page" : undefined}
              className={cn(
                "flex-1 shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-center text-[13.5px] font-medium",
                active(n) ? "bg-surface-3 text-ink-900" : "text-ink-500"
              )}
            >
              {n.short ?? n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}
