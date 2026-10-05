import { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ink" | "soft";
type Size = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary:
    "bg-jade text-white shadow-sm shadow-jade/20 hover:brightness-110 active:brightness-95 ring-1 ring-inset ring-white/10",
  ink: "bg-ink-900 text-surface shadow-sm hover:bg-ink-800",
  secondary: "bg-surface text-ink-800 border border-line hover:border-line-strong hover:bg-surface-2 shadow-card",
  soft: "bg-jade-50 text-jade-700 hover:bg-jade-100",
  ghost: "text-ink-600 hover:bg-ink-800/[0.06] hover:text-ink-800",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs gap-1 rounded-md",
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-lg",
  icon: "h-9 w-9 rounded-lg",
  "icon-sm": "h-8 w-8 rounded-md",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background,color,box-shadow,filter,border-color] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button ref={ref} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: React.ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
