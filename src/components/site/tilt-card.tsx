"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** 3D tilt toward the cursor with an ember edge light that follows it (fine pointers only; static otherwise) */
export function TiltCard({ children, className, style, max = 10, edge = true, ...rest }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; max?: number; edge?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.classList.add("tilting");
    el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("tilting");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={cn("tilt relative", className)} style={style} {...rest}>
      {children}
      {edge && <span aria-hidden className="edge-light" />}
    </div>
  );
}
