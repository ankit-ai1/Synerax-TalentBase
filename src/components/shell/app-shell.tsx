"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { DialogsProvider } from "@/components/dialogs/provider";
import { cn } from "@/lib/utils";

export interface ShellCounts {
  tasks: number;
  interviews: number;
  jobs: number;
  review: number;
}

const ShellCtx = createContext<{ profile: Profile; openPalette: () => void }>({
  profile: null as unknown as Profile,
  openPalette: () => {},
});
export const useShell = () => useContext(ShellCtx);

export function AppShell({ profile, counts, children }: { profile: Profile; counts: ShellCounts; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar") === "collapsed");
    } catch {}
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", collapsed ? "72px" : "248px");
  }, [collapsed]);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidebar", c ? "open" : "collapsed");
      } catch {}
      return !c;
    });
  };

  return (
    <ShellCtx.Provider value={{ profile, openPalette: () => setPalette(true) }}>
      <DialogsProvider profile={profile}>
        <div className="min-h-screen">
          <Sidebar
            profile={profile}
            counts={counts}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            onSearch={() => setPalette(true)}
          />
          <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[72px]" : "lg:pl-[248px]")}>
            <Topbar onMenu={() => setMobileOpen(true)} onSearch={() => setPalette(true)} counts={counts} profile={profile} />
            <main className="mx-auto max-w-[1360px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-7">{children}</main>
          </div>
          <CommandPalette open={palette} onClose={() => setPalette(false)} isAdmin={profile.role === "admin"} />
        </div>
      </DialogsProvider>
    </ShellCtx.Provider>
  );
}
