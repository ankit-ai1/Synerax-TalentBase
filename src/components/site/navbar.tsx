"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { site } from "@/content/site";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/utils";
import { SiteIcon } from "./ui";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2.5", className)} aria-label={`${site.name} home`}>
      <Image src="/logo.png" alt="" width={34} height={34} className="h-[34px] w-[34px] object-contain" priority />
      <span className="text-[19px] font-semibold tracking-[-0.02em] text-ink-900">{site.name}</span>
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
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reads the session from cookies locally (no network call). Loaded lazily so public pages stay light.
    import("@/lib/supabase/client")
      .then(({ createClient }) => createClient().auth.getSession())
      .then(({ data }) => setLoggedIn(!!data.session))
      .catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMega(null);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMega(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
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
          "sticky top-0 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
          open ? "z-[60]" : "z-50",
          scrolled || mega ? "border-line bg-canvas/75 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.25)] backdrop-blur-xl" : "border-transparent bg-transparent"
        )}
        onMouseLeave={scheduleClose}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm">
          Skip to content
        </a>
        <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Main">
          <Logo />

          <ul className="hidden items-center gap-0.5 lg:flex">
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
                        "relative flex items-center gap-1 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                        active(l.href) || mega === k ? "text-ink-900" : "text-ink-500 hover:text-ink-900"
                      )}
                    >
                      {l.label}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", mega === k && "rotate-180")} aria-hidden />
                      {active(l.href) && <m.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-saffron" />}
                    </button>
                  ) : (
                    <Link
                      href={l.href}
                      aria-current={active(l.href) ? "page" : undefined}
                      className={cn(
                        "relative block rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                        active(l.href) ? "text-ink-900" : "text-ink-500 hover:text-ink-900"
                      )}
                    >
                      {l.label}
                      {active(l.href) && <m.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-saffron" />}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {!loggedIn && (
              <Link href="/register" className="hidden h-10 items-center rounded-xl px-3 text-[14px] font-semibold text-ink-700 hover:bg-surface-3 hover:text-ink-900 xl:inline-flex">
                Register
              </Link>
            )}
            <Link
              href={account.href}
              className="group hidden h-10 items-center gap-1.5 rounded-xl bg-ink-900 px-4 text-[14px] font-semibold text-surface transition-colors hover:bg-ink-800 sm:inline-flex"
            >
              {account.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <button
              onClick={() => setOpen((o) => !o)}
              className="relative z-[60] inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-surface-3 lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Desktop mega menu */}
        <AnimatePresence>
          {mega && (
            <m.div
              key={mega}
              id={`mega-${mega}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => openMega(mega)}
              className="absolute inset-x-0 top-full hidden border-b border-line bg-canvas shadow-[0_24px_48px_-24px_rgb(0_0_0/0.35)] backdrop-blur-xl lg:block"
            >
              <div className="mx-auto grid max-w-[1200px] grid-cols-[1fr_260px] gap-8 px-8 py-7">
                <ul className="grid grid-cols-2 gap-1 xl:grid-cols-3">
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
                <div className="section-dark relative flex flex-col justify-between overflow-hidden rounded-2xl p-5">
                  <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#159487]/40 blur-3xl" />
                  <div className="relative">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-jade-700">{MEGA[mega].title}</p>
                    <p className="mt-2 text-[15px] font-semibold leading-snug text-ink-900">Not sure where to start? We&apos;ll recommend the right model in one call.</p>
                  </div>
                  <div className="relative mt-5 space-y-2">
                    <Link href={MEGA[mega].footer.href} className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-ink-800 hover:bg-white/10">
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

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[55] overflow-y-auto bg-canvas lg:hidden"
          >
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-jade/25 blur-3xl" />
            <m.ul
              className="relative mx-auto max-w-[1200px] space-y-1 px-5 pb-10 pt-24"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }}
            >
              {site.nav.map((l) => (
                <m.li key={l.href} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                  <Link
                    href={l.href}
                    aria-current={active(l.href) ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-4 py-3.5 text-[22px] font-semibold tracking-[-0.02em]",
                      active(l.href) ? "bg-surface-3 text-ink-900" : "text-ink-700 hover:bg-surface-3"
                    )}
                  >
                    {l.label}
                    <ArrowRight className={cn("h-5 w-5", active(l.href) ? "text-saffron" : "text-ink-300")} aria-hidden />
                  </Link>
                </m.li>
              ))}
              {!loggedIn && (
                <m.li variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} className="pt-4">
                  <Link href="/register" className="flex items-center justify-center rounded-2xl border border-line-strong py-3.5 text-[16px] font-semibold text-ink-800">
                    Register as candidate
                  </Link>
                </m.li>
              )}
              <m.li variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} className="pt-2">
                <Link href={account.href} className="flex items-center justify-center gap-2 rounded-2xl bg-jade py-3.5 text-[16px] font-semibold text-white">
                  {account.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </m.li>
              <m.li variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="pt-6 text-center text-[13px] text-ink-400">
                {site.contact.email} · {site.contact.phone}
              </m.li>
            </m.ul>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
