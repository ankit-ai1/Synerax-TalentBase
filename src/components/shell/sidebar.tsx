"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsLeft, ChevronsRight, LogOut, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Menu, MenuDivider } from "@/components/ui/interactive";
import { ThemeSegmented } from "@/components/theme";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { NAV, isActive, type NavItem } from "./nav";
import type { ShellCounts } from "./app-shell";

export function Sidebar({
  profile,
  counts,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  onSearch,
}: {
  profile: Profile;
  counts: ShellCounts;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onSearch: () => void;
}) {
  const path = usePathname();
  const router = useRouter();
  // highlight the clicked item instantly, before the new page has loaded
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    setPending(null);
    onMobileClose();
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = pending ?? path;

  const body = (mini: boolean) => (
    <div className="relative flex h-full flex-col">
      {/* soft light from top — gives the dark rail depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(120%_70%_at_0%_0%,rgb(var(--jade)/0.22),transparent_70%)]" />
      </div>

      <div className={cn("relative flex h-16 shrink-0 items-center", mini ? "justify-center px-0" : "justify-between px-4")}>
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          {!mini && <span className="text-[16px] font-semibold tracking-tight text-sidebar-text">{APP_NAME}</span>}
        </Link>
        {!mini && (
          <button className="rounded-md p-1 text-sidebar-muted hover:text-sidebar-text lg:hidden" onClick={onMobileClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className={cn("relative mb-2", mini ? "px-3" : "px-3")}>
        <button
          onClick={onSearch}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg border border-sidebar-line/[0.08] bg-sidebar-line/[0.04] text-[13px] text-sidebar-muted transition-colors hover:bg-sidebar-line/[0.08] hover:text-sidebar-text",
            mini ? "justify-center" : "px-2.5"
          )}
          title="Search (Ctrl+K)"
        >
          <Search className="h-4 w-4 shrink-0" />
          {!mini && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <span className="rounded border border-sidebar-line/[0.12] px-1.5 text-[10.5px] font-medium">Ctrl K</span>
            </>
          )}
        </button>
      </div>

      <nav className="relative flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-3" aria-label="Main">
        {NAV.filter((g) => !g.admin || profile.role === "admin").map((g) => (
          <div key={g.label}>
            {!mini && <p className="mb-1 px-2.5 text-[11.5px] font-medium text-sidebar-muted/80">{g.label}</p>}
            {mini && <div className="mx-auto mb-2 h-px w-6 bg-sidebar-line/10" />}
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(current, item)}
                  mini={mini}
                  count={item.badge ? counts[item.badge] : 0}
                  onNavigate={() => item.href !== path && setPending(item.href)}
                  onPrefetch={() => router.prefetch(item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative border-t border-sidebar-line/[0.08] p-2.5">
        <Menu
          align="start"
          side="top"
          width="w-64"
          className="w-full"
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className={cn("flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-line/[0.06]", mini && "justify-center")}
            >
              <Avatar name={profile.full_name || profile.email} size="sm" />
              {!mini && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-sidebar-text">{profile.full_name || profile.email}</p>
                  <p className="text-[11.5px] text-sidebar-muted">{profile.role === "admin" ? "Admin" : "HR"}</p>
                </div>
              )}
            </button>
          )}
        >
          {() => (
            <div>
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium text-ink-900">{profile.full_name}</p>
                <p className="truncate text-xs text-ink-400">{profile.email}</p>
              </div>
              <MenuDivider />
              <div className="px-1.5 py-1.5">
                <p className="mb-1.5 px-1 text-[11.5px] font-medium text-ink-400">Theme</p>
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
        <button
          onClick={onToggleCollapse}
          className="mt-1 hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-[12px] text-sidebar-muted transition-colors hover:bg-sidebar-line/[0.06] hover:text-sidebar-text lg:flex"
          aria-label={mini ? "Expand sidebar" : "Collapse sidebar"}
        >
          {mini ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {pending && <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-0.5 animate-pulse bg-saffron" />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-black/20 bg-sidebar transition-[width] duration-200 lg:block",
          collapsed ? "w-[72px]" : "w-[248px]"
        )}
      >
        {body(collapsed)}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onMobileClose} />
          <aside className="absolute inset-y-0 left-0 w-[264px] bg-sidebar animate-pop-in">{body(false)}</aside>
        </div>
      )}
    </>
  );
}

function NavLink({
  item,
  active,
  mini,
  count,
  onNavigate,
  onPrefetch,
}: {
  item: NavItem;
  active: boolean;
  mini: boolean;
  count: number;
  onNavigate: () => void;
  onPrefetch: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) onNavigate();
      }}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      title={mini ? item.label : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-lg text-[13.5px] transition-colors",
        mini ? "justify-center" : "px-2.5",
        active ? "bg-sidebar-line/[0.09] font-medium text-sidebar-text" : "text-sidebar-muted hover:bg-sidebar-line/[0.05] hover:text-sidebar-text"
      )}
    >
      {active && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-saffron" />}
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-saffron" : "")} />
      {!mini && <span className="flex-1 truncate">{item.label}</span>}
      {count > 0 &&
        (mini ? (
          <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-saffron ring-2 ring-sidebar" />
        ) : (
          <span
            className={cn(
              "min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular leading-5",
              item.badge === "jobs" ? "bg-sidebar-line/10 text-sidebar-text/80" : "bg-saffron text-[#3A2503]"
            )}
          >
            {count}
          </span>
        ))}
    </Link>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <Image src="/logo.png" alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} priority aria-hidden />
  );
}
