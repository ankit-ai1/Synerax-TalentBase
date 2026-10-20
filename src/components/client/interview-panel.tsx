"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, MessageSquarePlus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextArea, TextField } from "@/components/ui/fields";
import { istDate } from "@/components/portal-ui/kit";
import { cn } from "@/lib/utils";

export type FeedbackItem = { id: string; round: string; interviewer_name: string | null; rating: number | null; recommendation: string | null; comments: string | null; created_at: string; by: string };
const REC = [
  { value: "strong_yes", label: "Strong yes" },
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];
const recLabel = (v: string | null) => REC.find((r) => r.value === v)?.label;

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error ?? "Something went wrong");
  return out;
}

/** add an interview round (date, time, mode, link, panel) — anyone who can see the job, incl. a TA coordinator on assigned items */
export function AddRoundButton({ applicationId, name }: { applicationId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ round: "Technical", date: "", time: "11:00", duration: "60", mode: "Video", link: "", location: "", panel: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  async function save() {
    setBusy(true);
    try {
      await post(`/api/client/applications/${applicationId}/interviews`, {
        round: f.round,
        scheduled_at: new Date(`${f.date}T${f.time}:00+05:30`).toISOString(),
        duration_min: Number(f.duration) || 60,
        mode: f.mode,
        meeting_link: f.link,
        location: f.location,
        panel: f.panel,
      });
      toast.success("Interview round added — the people on this job were notified");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the round");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} data-testid="add-round">
        <CalendarPlus className="h-4 w-4" /> Add round
      </Button>
      {open && (
        <Dialog
          open
          onClose={() => setOpen(false)}
          title={`Interview round for ${name}`}
          description="Times are in IST. Everyone on this job — and Synerax — sees it."
          footer={
            <Button onClick={save} loading={busy} disabled={!f.date || !f.time} data-testid="add-round-save">
              Add round
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Round" value={f.round} onChange={(v) => set("round", v)} placeholder="Technical / Managerial / HR" />
            <SelectField label="Mode" value={f.mode} onChange={(v) => set("mode", v)} options={["Video", "Phone", "In-person"]} />
            <TextField label="Date" type="date" required value={f.date} onChange={(v) => set("date", v)} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Time" type="time" required value={f.time} onChange={(v) => set("time", v)} />
              <TextField label="Minutes" value={f.duration} onChange={(v) => set("duration", v.replace(/\D/g, ""))} inputMode="numeric" />
            </div>
            {f.mode === "In-person" ? (
              <TextField className="sm:col-span-2" label="Location" value={f.location} onChange={(v) => set("location", v)} />
            ) : (
              <TextField className="sm:col-span-2" label="Meeting link" value={f.link} onChange={(v) => set("link", v)} placeholder="https://meet.google.com/…" />
            )}
            <TextField className="sm:col-span-2" label="Panel" value={f.panel} onChange={(v) => set("panel", v)} placeholder="Names of the interviewers" />
          </div>
        </Dialog>
      )}
    </>
  );
}

/** feedback entries for a profile + "Add feedback" (rating 1–5, recommendation, comments) */
export function FeedbackPanel({ applicationId, items, rounds }: { applicationId: string; items: FeedbackItem[]; rounds: { id: string; round: string; scheduled_at: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ interview_id: rounds.at(-1)?.id ?? "", interviewer_name: "", rating: 0, recommendation: "", comments: "" });
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await post(`/api/client/applications/${applicationId}/feedback`, { ...f, rating: f.rating || null, round: rounds.find((r) => r.id === f.interview_id)?.round });
      toast.success("Feedback saved");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div data-testid="feedback-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink-900">Interview feedback</p>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)} data-testid="add-feedback">
          <MessageSquarePlus className="h-4 w-4" /> Add feedback
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-ink-400">No feedback yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((x) => (
            <li key={x.id} className="rounded-2xl border border-line p-3 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <b className="font-semibold text-ink-900">{x.round}</b>
                {x.rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-saffron-600" aria-label={`${x.rating} of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={cn("h-3.5 w-3.5", i < (x.rating ?? 0) ? "fill-current" : "opacity-30")} aria-hidden />
                    ))}
                  </span>
                )}
                {x.recommendation && <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold text-ink-600">{recLabel(x.recommendation)}</span>}
                <span className="ml-auto text-[11.5px] text-ink-400">
                  {x.by}
                  {x.interviewer_name ? ` · panel: ${x.interviewer_name}` : ""} · {istDate(x.created_at, { day: "numeric", month: "short" })}
                </span>
              </div>
              {x.comments && <p className="mt-1 whitespace-pre-line text-ink-700">{x.comments}</p>}
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Dialog
          open
          onClose={() => setOpen(false)}
          title="Interview feedback"
          footer={
            <Button onClick={save} loading={busy} disabled={!f.rating && !f.comments.trim()} data-testid="add-feedback-save">
              Save feedback
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {rounds.length > 0 && (
              <SelectField label="Round" value={f.interview_id} onChange={(v) => setF((p) => ({ ...p, interview_id: v }))} options={rounds.map((r) => ({ value: r.id, label: `${r.round} · ${istDate(r.scheduled_at, { day: "numeric", month: "short" })}` }))} placeholder="General" />
            )}
            <TextField label="Interviewer" value={f.interviewer_name} onChange={(v) => setF((p) => ({ ...p, interviewer_name: v }))} />
            <div>
              <span className="field-label">Rating</span>
              <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={f.rating === n} aria-label={`${n} of 5`} onClick={() => setF((p) => ({ ...p, rating: n }))} className="p-1 text-saffron-600">
                    <Star className={cn("h-6 w-6", n <= f.rating ? "fill-current" : "opacity-30")} />
                  </button>
                ))}
              </div>
            </div>
            <SelectField label="Recommendation" value={f.recommendation} onChange={(v) => setF((p) => ({ ...p, recommendation: v }))} options={REC} placeholder="Choose" />
            <TextArea className="sm:col-span-2" label="Comments" value={f.comments} onChange={(v) => setF((p) => ({ ...p, comments: v }))} rows={4} />
          </div>
        </Dialog>
      )}
    </div>
  );
}
