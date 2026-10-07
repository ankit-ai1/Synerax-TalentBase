"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, EyeOff, FileText, Globe, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Switch, TextArea } from "@/components/ui/fields";
import { useUsers } from "@/components/pickers";
import { cn, formatDateTime, friendlyError } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function PublishPanel({ job, assignees }: { job: any; assignees: string[] }) {
  const router = useRouter();
  const users = useUsers();
  const [desc, setDesc] = useState<string>(job.public_description ?? job.description ?? "");
  const [process, setProcess] = useState<string>(job.interview_process ?? "");
  const [showClient, setShowClient] = useState<boolean>(!!job.show_client_name);
  const [team, setTeam] = useState<string[]>(assignees);
  const [busy, setBusy] = useState<"" | "save" | "publish" | "unpublish">("");
  const pending = job.status === "Pending review";

  async function submit(publish: boolean, kind: "save" | "publish" | "unpublish") {
    if (publish && desc.trim().length < 40) return toast.error("Write a public description (at least 40 characters) before publishing.");
    setBusy(kind);
    const res = await fetch(`/api/jobs/${job.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publish, public_description: desc, interview_process: process, show_client_name: showClient, assignees: team }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) return toast.error(friendlyError(out.error ?? "Could not save"));
    toast.success(kind === "publish" ? (job.published ? "Saved — the job is live" : "Published — the job is now in the candidate portal") : kind === "unpublish" ? "Unpublished — hidden from the candidate portal" : "Saved");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader
          title="Job board listing"
          description="What candidates see on the candidate portal job board. Never include confidential client details here."
        />
        <div className="space-y-5 p-5">
          {pending && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[13px] text-violet-900 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200">
              Posted by the client from their portal. Check the requirement (use <b>Edit</b> for budget, skills etc.), write the public description, then publish. Publishing sets the job to <b>Open</b>.
            </div>
          )}
          <TextArea label="Public description" value={desc} onChange={setDesc} rows={12} hint="Plain text. Role summary, responsibilities, must-have skills, perks." />
          <TextArea label="Interview process (optional)" value={process} onChange={setProcess} rows={3} placeholder="e.g. HR screen → Technical round → Manager round" />
          <Switch
            checked={showClient}
            onChange={setShowClient}
            label="Show the client's name publicly"
            description="Off = the listing shows “A Synerax client” instead of the company name."
          />
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Status" />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", job.published ? "bg-jade-50 text-jade-700" : "bg-surface-3 text-ink-500")}>
                {job.published ? <Globe className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </span>
              <div className="text-sm">
                <p className="font-semibold text-ink-900">{job.published ? "Live for candidates" : "Not published"}</p>
                <p className="text-[13px] text-ink-500">
                  {job.published && job.published_at ? `Since ${formatDateTime(job.published_at)}` : job.published ? "" : "Candidates can’t see or apply to this job yet."}
                </p>
              </div>
            </div>
            {job.published && job.status !== "Open" && (
              <p className="rounded-lg bg-saffron-50 px-3 py-2 text-[13px] text-saffron-800">The job status is “{job.status}”, so it is hidden from candidates until it is Open again.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => submit(true, "publish")} loading={busy === "publish"} disabled={!!busy}>
                {job.published ? <Check className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                {job.published ? "Save changes" : "Publish"}
              </Button>
              {job.published ? (
                <Button variant="secondary" onClick={() => submit(false, "unpublish")} loading={busy === "unpublish"} disabled={!!busy}>
                  <EyeOff className="h-4 w-4" /> Unpublish
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => submit(false, "save")} loading={busy === "save"} disabled={!!busy}>
                  Save draft
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Assign recruiters" description="They’ll own this job’s pipeline" />
          <div className="flex flex-wrap gap-1.5 p-5">
            {users.length === 0 && <p className="text-sm text-ink-400">Loading team…</p>}
            {users.map((u) => {
              const on = team.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setTeam(on ? team.filter((x) => x !== u.id) : [...team, u.id])}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[13px] transition-colors",
                    on ? "border-jade bg-jade-50 font-medium text-jade-700" : "border-line text-ink-600 hover:border-line-strong"
                  )}
                  aria-pressed={on}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {u.full_name}
                </button>
              );
            })}
          </div>
        </Card>

        {(job.posted_by_client || job.jd_file_id) && (
          <Card>
            <CardHeader title="From the client" />
            <div className="space-y-2 p-5 text-sm text-ink-700">
              {job.posted_by_client && <p>Posted from the client portal.</p>}
              {job.jd_file_id && (
                <a href={`/api/jobs/${job.id}/jd`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-medium text-jade-700 hover:underline">
                  <FileText className="h-4 w-4" /> {job.jd_file_name ?? "JD file"}
                </a>
              )}
              {job.client_deleted_at == null && job.closed_by_client_at && (
                <p className="text-[13px] text-saffron-700">
                  Closed by the client {formatDateTime(job.closed_by_client_at)}
                  {job.client_close_reason ? ` — ${job.client_close_reason}` : ""}
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
