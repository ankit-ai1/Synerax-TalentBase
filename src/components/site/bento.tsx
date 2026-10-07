import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { IconTile } from "./ui";

/** Asymmetric grid: tiles choose their size with `size` (wide = 2×1, tall = 1×2, normal = 1×1) */
export function BentoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(250px,auto)]", className)}>{children}</div>;
}

const SIZE = {
  normal: "",
  wide: "sm:col-span-2",
  tall: "sm:row-span-2",
  big: "sm:col-span-2 sm:row-span-2",
};

export function BentoTile({
  title,
  text,
  icon,
  href,
  visual,
  size = "normal",
  delay = 0,
  className,
}: {
  title: string;
  text: string;
  icon?: string;
  href?: string;
  visual?: React.ReactNode;
  size?: keyof typeof SIZE;
  delay?: number;
  className?: string;
}) {
  const inner = (
    <>
      {visual && <div className={cn("relative mb-5", size === "tall" || size === "big" ? "h-56 sm:flex-1" : "h-36")}>{visual}</div>}
      <div className="flex items-start gap-3">
        {icon && <IconTile name={icon} className="h-10 w-10 shrink-0" />}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center justify-between gap-2 text-[17px] font-semibold text-ink-900">
            {title}
            {href && <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-jade" aria-hidden />}
          </h3>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">{text}</p>
        </div>
      </div>
    </>
  );
  return (
    <Reveal delay={delay} className={cn(SIZE[size], className)}>
      {href ? (
        <Link href={href} className="card-premium spotlight lift group flex h-full flex-col p-5 sm:p-6">
          {inner}
        </Link>
      ) : (
        <div className="card-premium lift flex h-full flex-col p-5 sm:p-6">{inner}</div>
      )}
    </Reveal>
  );
}
