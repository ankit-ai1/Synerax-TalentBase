import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { TiltCard } from "./cards";
import { IconTile } from "./ui";

/** Full-width bento: 4 columns on desktop, dense packing so varied tile sizes leave no gaps */
export function BentoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-flow-row-dense grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(270px,auto)] lg:gap-5", className)}>{children}</div>;
}

const SIZE = {
  normal: "",
  wide: "sm:col-span-2",
  tall: "lg:row-span-2",
  big: "sm:col-span-2 lg:row-span-2",
};

/** Tile with 3D tilt, pointer spotlight, shine sweep on hover and a looping illustration */
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
  const tallish = size === "tall" || size === "big";
  const inner = (
    <TiltCard max={5} className="group flex h-full flex-col p-5 sm:p-6">
      <span aria-hidden className="shine-sweep" />
      {visual && <div className={cn("relative mb-5", tallish ? "h-60 lg:min-h-[300px] lg:flex-1" : "h-40")}>{visual}</div>}
      <div className={cn("flex items-start gap-3", !visual && "mt-auto")}>
        {icon && <IconTile name={icon} className="h-10 w-10 shrink-0" />}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center justify-between gap-2 text-[18px] font-semibold tracking-[-0.01em] text-ink-900">
            {title}
            {href && <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-jade" aria-hidden />}
          </h3>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">{text}</p>
        </div>
      </div>
    </TiltCard>
  );
  return (
    <Reveal delay={delay} variant="scale" className={cn(SIZE[size], className)}>
      {href ? (
        <Link href={href} className="block h-full rounded-[1.25rem]">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </Reveal>
  );
}
