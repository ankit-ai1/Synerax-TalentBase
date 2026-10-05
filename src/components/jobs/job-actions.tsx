"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Copy, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui/dialog";
import { JobStatusBadge } from "@/components/ui/misc";
import { Menu, MenuDivider, MenuItem } from "@/components/ui/interactive";
import { JOB_STATUSES } from "@/lib/constants";
import { friendlyError } from "@/lib/utils";
import { range } from "./job-row";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function JobStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  return (
    <Menu
      align="start"
      width="w-40"
      trigger={({ toggle }) => (
        <button onClick={toggle} className="inline-flex items-center gap-0.5" aria-label="Change job status">
          <JobStatusBadge status={value} />
          <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
        </button>
      )}
    >
      {(close) =>
        JOB_STATUSES.map((s) => (
          <MenuItem
            key={s}
            onClick={async () => {
              close();
              const prev = value;
              setValue(s);
              const { error } = await createClient()
                .from("jobs")
                .update({ status: s, closed_at: ["Filled", "Closed"].includes(s) ? new Date().toISOString().slice(0, 10) : null })
                .eq("id", id);
              if (error) {
                setValue(prev);
                return toast.error(friendlyError(error.message));
              }
              toast.success(`Job status: ${s}`);
              router.refresh();
            }}
          >
            {s}
          </MenuItem>
        ))
      }
    </Menu>
  );
}

export function jdText(j: any) {
  const skills = (j.job_skills ?? []).filter((s: any) => s.skill).map((s: any) => s.skill.name);
  return [
    `*${j.title}*${j.client?.name ? ` — ${j.client.name}` : ""}`,
    [(j.locations ?? []).join(", "), j.work_mode].filter(Boolean).join(" · "),
    range(j.exp_min, j.exp_max, "yrs exp"),
    range(j.ctc_min, j.ctc_max, "LPA") ? `Budget: ₹${range(j.ctc_min, j.ctc_max, "LPA")}` : null,
    j.notice_max != null ? `Notice: max ${j.notice_max} days` : null,
    skills.length ? `Skills: ${skills.join(", ")}` : null,
    j.description ? `\n${j.description}` : null,
    `\nRef: ${j.job_code}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function JobActions({ job, isAdmin }: { job: any; isAdmin: boolean }) {
  const router = useRouter();
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Menu
        width="w-56"
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-600 shadow-card hover:bg-surface-2"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuItem
              icon={<Copy className="h-4 w-4" />}
              onClick={() => {
                close();
                navigator.clipboard.writeText(jdText(job));
                toast.success("JD copied — paste it on WhatsApp/LinkedIn");
              }}
            >
              Copy JD
            </MenuItem>
            <MenuItem
              icon={<MessageCircle className="h-4 w-4" />}
              onClick={() => {
                close();
                window.open(`https://wa.me/?text=${encodeURIComponent(jdText(job))}`, "_blank", "noopener");
              }}
            >
              Share on WhatsApp
            </MenuItem>
            {isAdmin && (
              <>
                <MenuDivider />
                <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => (close(), setDel(true))}>
                  Delete job
                </MenuItem>
              </>
            )}
          </>
        )}
      </Menu>
      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        danger
        loading={busy}
        title={`Delete ${job.title}?`}
        description="The job's entire pipeline, interviews and history will be removed. Candidate profiles stay safe. To close a job, setting its status to 'Closed' is better."
        confirmLabel="Delete permanently"
        onConfirm={async () => {
          setBusy(true);
          const { error } = await createClient().from("jobs").delete().eq("id", job.id);
          setBusy(false);
          if (error) return toast.error(friendlyError(error.message));
          toast.success("Job deleted");
          router.push("/jobs");
          router.refresh();
        }}
      />
    </>
  );
}
