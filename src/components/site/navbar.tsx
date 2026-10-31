"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, ArrowUpRight, Download, Briefcase, Building2, ChevronDown, ChevronRight, Compass, Factory, House, Layers, Mail, Menu, UserRound, X } from "lucide-react";
import { site } from "@/content/site";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/utils";
import { SiteIcon } from "./ui";
import { BrandLogo } from "@/components/brand-logo";
import { OPEN_INSTALL_EVENT } from "@/lib/install";

export function Logo({ className, size }: { className?: string; size?: number }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center", className)} aria-label={`${site.name} home`}>
      <BrandLogo size={size} />
    </Link>
  );
}

const MEGA = {
  services: {
    title: "Services",
    href: "/services",
    items: site.services.map((s) => ({ href: `/services#${s.slug}`, icon: s.icon, title: s.title, text: s.summary })),
    footer: { label: "Compare engagement models", href: "/services#models" },
  },
  industries: {
    title: "Industries",
    href: "/industries",
    items: site.industries.map((i) => ({ href: "/industries", icon: i.icon, title: i.title, text: i.description })),
    footer: { label: "See all industries", href: "/industries" },
  },
} as const;
type MegaKey = keyof typeof MEGA;

const MOBILE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "/": House,
  "/services": Layers,
  "/industries": Factory,
  "/job-seekers": UserRound,
  "/about": Compass,
  "/contact": Mail,
};
// the two main journeys sit on top of the mobile menu as feature cards
const MOBILE_FEATURES = [
  { href: "/careers", title: "Find a job", text: "Browse live openings, free for candidates", icon: Briefcase },
  { href: "/employers", title: "Hire talent", text: "Pre-screened profiles for your team", icon: Building2 },
];
const rowItem = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };


/** Thin top bar shown while a route is loading */
function NavProgress() {
  const path = usePathname();
  const [loading, setLoading] = useState(false);
  useEffect(() => setLoading(false), [path]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      setLoading(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  if (!loading) return null;
  return <div aria-hidden className="nav-progress fixed inset-x-0 top-0 z-[70] h-0.5 bg-gradient-to-r from-jade via-jade to-saffron" />;
}

export function SiteNavbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState<MegaKey | null>(null);
  const [mobileMega, setMobileMega] = useState<MegaKey | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Signed in? The Supabase session lives in an "sb-<project>-auth-token" cookie (possibly split into .0/.1 parts).
    // Checking for it directly avoids loading the whole Supabase client on public pages.
    setLoggedIn(/(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=[^;]+/.test(document.cookie));
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMega(null);
    setMobileMega(null);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    document.documentElement.toggleAttribute("data-menu-open", open);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMega(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.documentElement.removeAttribute("data-menu-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  // /login sends signed-in users to their own area (staff app, client portal or candidate portal)
  const account = loggedIn ? { href: "/login", label: "My account" } : { href: "/login", label: "Sign in" };

  const openMega = (k: MegaKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMega(k);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMega(null), 140);
  };

  return (
    <>
      <NavProgress />
      <header
        className={cn(
          "sticky top-0 h-16",
          open ? "z-[60]" : "z-50",
        )}
        onMouseLeave={scheduleClose}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm">
          Skip to content
        </a>
        {/* full-width bar at the top of the page; floats as a rounded capsule once scrolling starts (globals.css) */}
        <div className="nav-shell" data-float={scrolled && !open ? "" : undefined}>
        <nav className="nav-bar" aria-label="Main">
          <Logo size={30} />

          <ul className="hidden items-center gap-0.5 rounded-full border border-line bg-surface/60 p-1 lg:flex">
            {site.nav.map((l) => {
              const isMega = "mega" in l;
              const k = isMega ? (l.mega as MegaKey) : null;
              return (
                <li key={l.href} onMouseEnter={() => (k ? openMega(k) : scheduleClose())}>
                  {k ? (
                    <button
                      onClick={() => setMega((cur) => (cur === k ? null : k))}
                      aria-expanded={mega === k}
                      aria-controls={`mega-${k}`}
                      className={cn(
                        "relative isolate flex items-center gap-1 rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors",
                        active(l.href) ? "text-[rgb(var(--accent-b))]" : mega === k ? "bg-surface-3/70 text-ink-900" : "text-ink-600 hover:bg-surface-3/70 hover:text-ink-900"
                      )}
                    >
                      {l.label}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", mega === k && "rotate-180")} aria-hidden />
                      {active(l.href) && <m.span layoutId="nav-underline" className="absolute inset-0 -z-10 rounded-full bg-jade-50 ring-1 ring-inset ring-jade/15" />}
                    </button>
                  ) : (
                    <Link
                      href={l.href}
                      aria-current={active(l.href) ? "page" : undefined}
                      className={cn(
                        "relative isolate block rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors",
                        active(l.href) ? "text-[rgb(var(--accent-b))]" : "text-ink-600 hover:bg-surface-3/70 hover:text-ink-900"
                      )}
                    >
                      {l.label}
                      {active(l.href) && <m.span layoutId="nav-underline" className="absolute inset-0 -z-10 rounded-full bg-jade-50 ring-1 ring-inset ring-jade/15" />}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {!loggedIn && (
              <Link href="/register" className="hidden h-10 items-center rounded-full px-3.5 text-[14px] font-semibold text-ink-900 hover:bg-surface-3 xl:inline-flex">
                Register
              </Link>
            )}
            <Link
              href={account.href}
              className="group hidden h-10 items-center gap-1.5 rounded-full bg-ink-900 px-5 text-[14px] font-semibold text-[rgb(var(--cream))] transition-colors hover:bg-ink-800 dark:text-surface sm:inline-flex"
            >
              {account.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            {open && (
              <a href={`mailto:${site.contact.email}`} aria-label="Email us" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-700 lg:hidden">
                <Mail className="h-[18px] w-[18px]" aria-hidden />
              </a>
            )}
            <button
              onClick={() => {
                setOpen((o) => !o);
                setMobileMega(null);
              }}
              className={cn("relative z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-surface-3 lg:hidden", open && "border border-line")}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        </div>

        {/* Desktop mega menu */}
        <AnimatePresence>
          {mega && (
            <m.div
              key={mega}
              id={`mega-${mega}`}
              initial={{ opacity: 0, y: -8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => openMega(mega)}
              className="site-container wide absolute inset-x-0 top-full hidden origin-top pt-3 lg:block"
            >
              <div className="grid grid-cols-[1fr_300px] gap-6 rounded-[28px] border border-line bg-canvas p-4 shadow-[0_32px_64px_-28px_rgb(20_12_4/0.4),0_2px_8px_-2px_rgb(20_12_4/0.08)]">
                <ul className="grid grid-cols-2 content-center gap-1 xl:grid-cols-3">
                  {MEGA[mega].items.map((it) => (
                    <li key={it.title}>
                      <Link href={it.href} className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-surface-3/70">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jade-50 text-jade-700 ring-1 ring-inset ring-jade/15 transition-transform group-hover:scale-105">
                          <SiteIcon name={it.icon} className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-ink-900">{it.title}</span>
                          <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink-500">{it.text}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="section-dark relative flex flex-col justify-between overflow-hidden rounded-[20px] p-5">
                  <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[rgb(var(--p-500)/0.4)] blur-3xl" />
                  <div className="relative">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-jade-700">{MEGA[mega].title}</p>
                    <p className="mt-2 text-[15px] font-semibold leading-snug text-ink-900">Not sure where to start? We&apos;ll recommend the right model in one call.</p>
                  </div>
                  <div className="relative mt-5 space-y-2">
                    <Link href={MEGA[mega].footer.href} className="flex items-center justify-between rounded-lg bg-fg/[0.06] px-3 py-2 text-[13px] font-medium text-ink-800 hover:bg-fg/10">
                      {MEGA[mega].footer.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <Link href="/contact" className="flex items-center justify-between rounded-lg bg-jade px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110">
                      Talk to us <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile full-screen menu: feature cards, icon rows, expanding cards; account buttons fixed at the bottom */}
      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            data-lenis-prevent
            className="fixed inset-0 z-[55] flex h-dvh flex-col bg-canvas lg:hidden"
          >
            <m.div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-[80px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } } }}
            >
              <div className="space-y-3">
                {MOBILE_FEATURES.map((c) => (
                  <m.div key={c.href} variants={rowItem}>
                    <Link href={c.href} className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 shadow-[0_10px_28px_-22px_rgb(20_12_4/0.4)] transition-colors active:bg-surface-2">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--deep))] text-[rgb(var(--cream))]">
                        <c.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold tracking-[-0.01em] text-ink-900">{c.title}</span>
                        <span className="mt-0.5 block truncate text-[13px] text-ink-500">{c.text}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                    </Link>
                  </m.div>
                ))}
              </div>

              <ul className="mt-5 space-y-1">
                {site.nav
                  .filter((l) => !MOBILE_FEATURES.some((c) => c.href === l.href))
                  .map((l) => {
                    const k = "mega" in l ? (l.mega as MegaKey) : null;
                    const expanded = !!k && mobileMega === k;
                    const on = active(l.href);
                    const Icon = MOBILE_ICON[l.href] ?? Compass;
                    const row = (
                      <>
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200", on || expanded ? "border-transparent bg-jade text-white" : "border-line bg-surface text-jade-700")}>
                          <Icon className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink-900">{l.label}</span>
                      </>
                    );
                    const rowClass = cn("flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors duration-200", expanded || on ? "bg-jade-50" : "active:bg-surface-2");
                    return (
                      <m.li key={l.href} variants={rowItem}>
                        {k ? (
                          <>
                            <button type="button" onClick={() => setMobileMega(expanded ? null : k)} aria-expanded={expanded} aria-controls={`mobile-mega-${k}`} data-testid={`mobile-mega-${k}`} className={rowClass}>
                              {row}
                              <ChevronRight className={cn("mr-1 h-4 w-4 shrink-0 text-jade-700 transition-transform duration-200", expanded && "rotate-90")} aria-hidden />
                            </button>
                            <AnimatePresence initial={false}>
                              {expanded && (
                                <m.div
                                  id={`mobile-mega-${k}`}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                  className="overflow-hidden"
                                >
                                  <ul className="space-y-2 pb-2 pl-6 pr-2 pt-2">
                                    {MEGA[k].items.map((it) => (
                                      <li key={it.title}>
                                        <Link href={it.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors active:bg-surface-2">
                                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jade-50 text-jade-700 ring-1 ring-inset ring-jade/15">
                                            <SiteIcon name={it.icon} className="h-[18px] w-[18px]" />
                                          </span>
                                          <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[14.5px] font-semibold text-ink-900">{it.title}</span>
                                            <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">{it.text}</span>
                                          </span>
                                        </Link>
                                      </li>
                                    ))}
                                    <li>
                                      <Link href={MEGA[k].footer.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-2xl px-3 py-2 text-[13px] font-semibold text-jade-700">
                                        {MEGA[k].footer.label}
                                        <ArrowRight className="h-4 w-4" aria-hidden />
                                      </Link>
                                    </li>
                                  </ul>
                                </m.div>
                              )}
                            </AnimatePresence>
                          </>
                        ) : (
                          <Link href={l.href} aria-current={on ? "page" : undefined} className={rowClass}>
                            {row}
                            <ChevronRight className="mr-1 h-4 w-4 shrink-0 text-jade-700" aria-hidden />
                          </Link>
                        )}
                      </m.li>
                    );
                  })}
              </ul>
            </m.div>

            <div className="shrink-0 border-t border-line bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              <div className={cn("grid gap-2", !loggedIn && "grid-cols-2")}>
                {!loggedIn && (
                  <Link href="/register" className="flex h-11 items-center justify-center rounded-xl border border-line text-[14px] font-semibold text-ink-900">
                    Register
                  </Link>
                )}
                <Link href={account.href} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-jade text-[14px] font-semibold text-white">
                  {account.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));
                }}
                className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 text-[13px] font-semibold text-jade-700 [@media(display-mode:standalone)]:hidden"
                data-testid="menu-install"
              >
                <Download className="h-4 w-4" aria-hidden /> Install app
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
