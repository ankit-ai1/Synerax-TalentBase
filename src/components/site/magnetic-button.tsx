"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "light" | "ghost-light";

const styles: Record<Variant, string> = {
  primary:
    "bg-jade text-white shadow-[0_10px_30px_-10px_rgb(var(--jade)/0.7),inset_0_1px_0_rgb(255_255_255/0.2)] hover:bg-[rgb(var(--jade-hover))]",
  secondary: "border border-jade-700 bg-transparent text-jade-700 hover:bg-jade-700 hover:text-canvas",
  light: "bg-white text-[rgb(var(--deep))] shadow-[0_10px_30px_-12px_rgb(255_255_255/0.35)] hover:bg-white/90",
  "ghost-light": "border border-white/20 bg-white/[0.04] text-white hover:bg-white/10",
};

/** CTA that gently follows the cursor; the arrow slides on hover. Static on touch / reduced motion. */
export function MagneticButton({
  href,
  children,
  variant = "primary",
  className,
  arrow = true,
  size = "lg",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  arrow?: boolean;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.18;
    const y = (e.clientY - r.top - r.height / 2) * 0.28;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <Link
      ref={ref}
      href={href}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[transform,filter,background-color] duration-300 ease-out",
        size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4 text-[14px]",
        styles[variant],
        className
      )}
    >
      {children}
      {arrow && (
        <span className="relative inline-flex h-4 w-4 overflow-hidden" aria-hidden>
          <ArrowRight className="absolute h-4 w-4 transition-transform duration-300 group-hover:translate-x-4" />
          <ArrowRight className="absolute h-4 w-4 -translate-x-4 transition-transform duration-300 group-hover:translate-x-0" />
        </span>
      )}
    </Link>
  );
}
