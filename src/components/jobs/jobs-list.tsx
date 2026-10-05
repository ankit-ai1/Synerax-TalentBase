"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Segmented } from "@/components/ui/interactive";
import { JobRow } from "./job-row";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function JobsList({ jobs, mine }: { jobs: any[]; mine: string[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Open");
  const [who, setWho] = useState("all");
  const [client, setClient] = useState("");
  const [sort, setSort] = useState("priority");

  const clients = useMemo(
    () => Array.from(new Map(jobs.filter((j) => j.client).map((j) => [j.client.id, j.client.name])).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [jobs]
  );

  const list = useMemo(() => {
    const s = q.toLowerCase();
    const pr: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    return jobs
      .filter((j) => status === "All" || (status === "Closed" ? ["Filled", "Closed"].includes(j.status) : j.status === status))
      .filter((j) => who === "all" || mine.includes(j.id))
      .filter((j) => !client || j.client?.id === client)
      .filter((j) => !s || j.title.toLowerCase().includes(s) || j.job_code.toLowerCase().includes(s) || (j.client?.name ?? "").toLowerCase().includes(s) || (j.locations ?? []).join(" ").toLowerCase().includes(s))
      .sort((a, b) => {
        if (sort === "priority") return (pr[a.priority] ?? 9) - (pr[b.priority] ?? 9) || (a.target_date ?? "9").localeCompare(b.target_date ?? "9");
        if (sort === "target") return (a.target_date ?? "9999").localeCompare(b.target_date ?? "9999");
        if (sort === "pipeline") return (b.applications?.length ?? 0) - (a.applications?.length ?? 0);
        return b.created_at.localeCompare(a.created_at);
      });
  }, [jobs, q, status, who, client, sort, mine]);

  const count = (st: string) => jobs.filter((j) => (st === "All" ? true : st === "Closed" ? ["Filled", "Closed"].includes(j.status) : j.status === st)).length;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Segmented
          value={status}
          onChange={setStatus}
          options={["Open", "On Hold", "Draft", "Closed", "All"].map((s) => ({
            value: s,
            label: (
              <>
                {s} <span className="text-[11px] tabular text-ink-400">{count(s)}</span>
              </>
            ),
          }))}
        />
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, code, client, city" className="field-input h-9 pl-9" aria-label="Jobs search" />
          </div>
          <select value={client} onChange={(e) => setClient(e.target.value)} className="field-input h-9 w-auto pr-8 text-[13px]" aria-label="Client filter">
            <option value="">All clients</option>
            {clients.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="field-input h-9 w-auto pr-8 text-[13px]" aria-label="Sort">
            <option value="priority">Priority</option>
            <option value="target">Target date</option>
            <option value="pipeline">Pipeline size</option>
            <option value="recent">Newest</option>
          </select>
          <Segmented
            size="sm"
            value={who}
            onChange={setWho}
            options={[
              { value: "all", label: "All" },
              { value: "mine", label: "My jobs" },
            ]}
          />
        </div>
      </div>
      <div className="space-y-3">
        {list.map((j) => (
          <JobRow key={j.id} job={j} />
        ))}
        {list.length === 0 && <p className="rounded-xl border border-dashed border-line-strong py-12 text-center text-sm text-ink-400">No jobs match this filter.</p>}
      </div>
    </>
  );
}
