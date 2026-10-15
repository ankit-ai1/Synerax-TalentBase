import Link from "next/link";
import { X } from "lucide-react";

/** A visible, removable filter (e.g. opened from a dashboard card). Removing it goes to clearHref. */
export function FilterChip({ label, count, clearHref }: { label: string; count?: number; clearHref: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-jade/30 bg-jade-50 py-1 pl-3 pr-1 text-[13px] font-medium text-jade-700" data-testid="filter-chip">
      {label}
      {count !== undefined && <span className="tabular text-jade-700/70">· {count}</span>}
      <Link href={clearHref} aria-label={`Remove filter: ${label}`} className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-jade/10">
        <X className="h-3.5 w-3.5" />
      </Link>
    </span>
  );
}
