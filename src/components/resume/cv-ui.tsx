"use client";

import { useRef, useState } from "react";
import { AlertTriangle, FileText, Sparkles, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/resume/client";

/** Small "From your CV" badge; low-confidence values get an amber "Please check" */
export function FromCvBadge({ confidence, label = "From your CV" }: { confidence?: Confidence; label?: string }) {
  if (!confidence) return null;
  const low = confidence === "low";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
        low ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-400/15 dark:text-amber-300" : "bg-jade-50 text-jade-700"
      )}
      title={low ? "Read from your CV with low confidence — please check" : "Filled in from your CV"}
    >
      {low ? <AlertTriangle className="h-3 w-3" aria-hidden /> : <Sparkles className="h-3 w-3" aria-hidden />}
      {low ? "Please check" : label}
    </span>
  );
}

/** Wraps a form field: shows the badge above it and a soft amber highlight when confidence is low */
export function CvField({ confidence, children, className }: { confidence?: Confidence; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative", confidence === "low" && "[&_input]:border-amber-400 [&_input]:bg-amber-50/60 [&_input]:ring-2 [&_input]:ring-amber-300/40 dark:[&_input]:bg-amber-400/5", className)}>
      {confidence && (
        <span className="absolute right-0 top-0 z-10">
          <FromCvBadge confidence={confidence} />
        </span>
      )}
      {children}
    </div>
  );
}

/** Drag & drop CV area with a "Reading your CV…" state */
export function CvDropzone({ onFile, busy, file, compact, hint = "PDF or DOCX · max 4 MB" }: { onFile: (f: File) => void; busy?: boolean; file?: File | null; compact?: boolean; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        aria-label="Upload your CV"
        data-testid="cv-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={cn(
          "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-5" : "px-6 py-12",
          over ? "border-jade bg-jade-50" : "border-line-strong bg-surface-2/60 hover:border-jade/60",
          busy && "cursor-wait"
        )}
      >
        {busy ? (
          <div className="flex flex-col items-center" role="status" aria-live="polite">
            <span className="relative flex h-14 w-12 items-center justify-center rounded-lg border border-line bg-surface shadow-card">
              <FileText className="h-6 w-6 text-jade" aria-hidden />
              <span className="cv-scan absolute inset-x-1 h-0.5 rounded-full bg-jade shadow-[0_0_10px_rgb(var(--p-500)/0.8)]" aria-hidden />
            </span>
            <span className="mt-3 text-sm font-semibold text-ink-900">Reading your CV…</span>
            <span className="text-xs text-ink-500">Pulling out your details — this takes a few seconds</span>
          </div>
        ) : (
          <>
            <UploadCloud className={cn("text-jade", compact ? "h-6 w-6" : "h-9 w-9")} aria-hidden />
            <span className={cn("mt-2 font-semibold text-ink-900", compact ? "text-sm" : "text-[16px]")}>{file ? file.name : "Drop your CV here or click to upload"}</span>
            <span className="text-xs text-ink-500">{hint}</span>
          </>
        )}
      </button>
    </div>
  );
}
