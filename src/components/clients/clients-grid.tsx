"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Avatar, ClientStatusBadge } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/interactive";
import { CLIENT_STATUSES } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ClientsGrid({ clients }: { clients: any[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const list = useMemo(() => {
    const s = q.toLowerCase();
    return clients.filter(
      (c) =>
        (status === "All" || c.status === status) &&
        (!s || c.name.toLowerCase().includes(s) || (c.industry ?? "").toLowerCase().includes(s) || (c.city ?? "").toLowerCase().includes(s))
    );
  }, [clients, q, status]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, industry or city" className="field-input pl-9" aria-label="Clients search" />
        </div>
        <Segmented value={status} onChange={setStatus} options={["All", ...CLIENT_STATUSES].map((s) => ({ value: s, label: s }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop"
          >
            <div className="flex items-start gap-3">
              <Avatar name={c.name} size="lg" square />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink-900 group-hover:text-jade-700">{c.name}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-400">
                  {c.industry ?? "—"}
                  {c.city && (
                    <>
                      <span className="text-ink-300">·</span>
                      <MapPin className="h-3 w-3" />
                      {c.city}
                    </>
                  )}
                </p>
              </div>
              <ClientStatusBadge status={c.status} />
            </div>
            <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-surface-2 text-center">
              <Stat label="Open jobs" value={c.stats.open} />
              <Stat label="In pipeline" value={c.stats.pipeline} />
              <Stat label="Placed" value={c.stats.joined} accent />
            </dl>
            <div className="mt-4 flex items-center justify-between text-xs text-ink-400">
              <span className="truncate">{c.primary ? `Contact: ${c.primary}` : "No contact"}</span>
              <span className="shrink-0 font-mono">{c.client_code}</span>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="py-12 text-center text-sm text-ink-400">No clients match this filter.</p>}
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="px-2 py-2.5">
      <dd className={`text-lg font-semibold tabular leading-tight ${accent && value ? "text-jade-700" : "text-ink-900"}`}>{value}</dd>
      <dt className="text-[11px] text-ink-400">{label}</dt>
    </div>
  );
}
