"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/fields";
import { Segmented } from "@/components/ui/interactive";
import { AsyncPicker, searchJobs, type Option } from "@/components/pickers";
import { INTERVIEW_MODES, ROUND_NAMES } from "@/lib/constants";
import { fillTemplate, formatDate, formatTime, friendlyError, fromLocalInput, toLocalInput, waLink } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export type InterviewPrefill = {
  id?: string;
  applicationId?: string;
  job?: Option | null;
  candidate?: Option | null;
  onDone?: () => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function InterviewDialog({ prefill, me, onClose }: { prefill: InterviewPrefill; me: Profile; onClose: () => void }) {
  const router = useRouter();
  const [job, setJob] = useState<Option | null>(prefill.job ?? null);
  const [appId, setAppId] = useState(prefill.applicationId ?? "");
  const [apps, setApps] = useState<{ id: string; name: string; phone: string | null; first_name: string }[]>([]);
  const [round, setRound] = useState("Technical");
  const [roundNo, setRoundNo] = useState("1");
  const [mode, setMode] = useState("Video");
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState("60");
  const [link, setLink] = useState("");
  const [location, setLocation] = useState("");
  const [interviewers, setInterviewers] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendWa, setSendWa] = useState(true);

  // edit mode: load interview
  useEffect(() => {
    if (!prefill.id) return;
    createClient()
      .from("interviews")
      .select("*, application:applications(id, job:jobs(id, title, job_code), candidate:candidates(id, first_name, last_name, phone))")
      .eq("id", prefill.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setJob({ id: d.application.job.id, label: d.application.job.title, sub: d.application.job.job_code });
        setAppId(d.application.id);
        setRound(d.round_name);
        setRoundNo(String(d.round_no));
        setMode(d.mode);
        setWhen(toLocalInput(d.scheduled_at));
        setDuration(String(d.duration_min));
        setLink(d.meeting_link ?? "");
        setLocation(d.location ?? "");
        setInterviewers(d.interviewers ?? "");
        setSendWa(false);
      });
  }, [prefill.id]);

  // candidates in this job's pipeline
  useEffect(() => {
    if (!job) {
      setApps([]);
      return;
    }
    createClient()
      .from("applications")
      .select("id, stage, candidate:candidates(first_name, last_name, phone)")
      .eq("job_id", job.id)
      .not("stage", "in", "(Rejected,Dropped,Joined)")
      .order("stage_changed_at", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []).map((a: any) => ({
          id: a.id,
          name: `${a.candidate.first_name} ${a.candidate.last_name ?? ""}`.trim() + ` (${a.stage})`,
          phone: a.candidate.phone,
          first_name: a.candidate.first_name,
        }));
        setApps(list);
        if (prefill.candidate && !prefill.id) {
          const match = (data ?? []).find((a: any) => `${a.candidate.first_name} ${a.candidate.last_name ?? ""}`.trim() === prefill.candidate!.label);
          if (match) setAppId((match as any).id);
        }
      });
  }, [job, prefill.candidate, prefill.id]);

  // round number auto
  useEffect(() => {
    if (!appId || prefill.id) return;
    createClient()
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .eq("application_id", appId)
      .then(({ count }) => setRoundNo(String((count ?? 0) + 1)));
  }, [appId, prefill.id]);

  async function save() {
    if (!appId) return toast.error("Choose a job and candidate");
    if (!when) return toast.error("Enter the interview date and time");
    setSaving(true);
    const row = {
      application_id: appId,
      round_name: round,
      round_no: Number(roundNo) || 1,
      mode,
      scheduled_at: fromLocalInput(when),
      duration_min: Number(duration) || 60,
      meeting_link: link.trim() || null,
      location: location.trim() || null,
      interviewers: interviewers.trim() || null,
    };
    const supabase = createClient();
    const { error } = prefill.id
      ? await supabase.from("interviews").update({ ...row, status: "Scheduled" }).eq("id", prefill.id)
      : await supabase.from("interviews").insert({ ...row, created_by: me.id });
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(prefill.id ? "Interview rescheduled" : "Interview scheduled");

    if (sendWa) {
      const a = apps.find((x) => x.id === appId);
      const iso = fromLocalInput(when)!;
      const msg = fillTemplate(
        "Hi {{first_name}}, your {{round}} interview ({{job_title}}) is confirmed for {{date}} at {{time}}. {{where}}\n\nAll the best!\n— {{my_name}}",
        {
          first_name: a?.first_name,
          round,
          job_title: job?.label,
          date: formatDate(iso, { weekday: "short", day: "numeric", month: "short" }),
          time: formatTime(iso),
          where: link ? `Link: ${link}` : location ? `Venue: ${location}` : mode === "Phone" ? "You will receive a call." : "",
          my_name: me.full_name,
        }
      );
      const url = waLink(a?.phone, msg);
      if (url) window.open(url, "_blank", "noopener");
    }
    prefill.onDone?.();
    router.refresh();
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={prefill.id ? "Reschedule interview" : "Schedule interview"}
      description="The candidate will automatically move to the 'Interview' stage in the pipeline."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {prefill.id ? "Save" : "Schedule"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AsyncPicker
            label="Job"
            required
            value={job}
            onChange={(v) => {
              setJob(v);
              setAppId("");
            }}
            search={(t) => searchJobs(t)}
            placeholder="Choose a job"
            disabled={!!prefill.id}
          />
          <SelectField
            label="Candidate (from this job's pipeline)"
            required
            value={appId}
            onChange={setAppId}
            options={apps.map((a) => ({ value: a.id, label: a.name }))}
            placeholder={job ? (apps.length ? "Choose a candidate" : "Pipeline is empty") : "Choose a job first"}
            disabled={!job || !!prefill.id}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
          <SelectField label="Round" value={round} onChange={(v) => setRound(v || "Technical")} options={ROUND_NAMES} />
          <TextField label="Round no." type="number" min={1} value={roundNo} onChange={setRoundNo} />
        </div>
        <div>
          <span className="field-label">Mode</span>
          <Segmented value={mode} onChange={setMode} options={INTERVIEW_MODES.map((m) => ({ value: m, label: m }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <TextField label="Date & time (IST)" required type="datetime-local" value={when} onChange={setWhen} />
          <SelectField
            label="Duration"
            value={duration}
            onChange={(v) => setDuration(v || "60")}
            options={[
              { value: "15", label: "15 min" },
              { value: "30", label: "30 min" },
              { value: "45", label: "45 min" },
              { value: "60", label: "1 hour" },
              { value: "90", label: "1.5 hours" },
              { value: "120", label: "2 hours" },
            ]}
          />
        </div>
        {mode === "Video" && <TextField label="Meeting link" value={link} onChange={setLink} placeholder="Google Meet / Teams / Zoom link" />}
        {mode === "In-person" && <TextField label="Venue / address" value={location} onChange={setLocation} />}
        <TextField label="Interviewer(s)" value={interviewers} onChange={setInterviewers} placeholder="e.g. Rakesh (Tech Lead), Client panel" />
        {!prefill.id && (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[13px] text-ink-700">
            <input type="checkbox" checked={sendWa} onChange={(e) => setSendWa(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--jade))]" />
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            Send the candidate a WhatsApp confirmation after saving
          </label>
        )}
      </div>
    </Dialog>
  );
}
