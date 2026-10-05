"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Download, ExternalLink, FileImage, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DOC_TYPES } from "@/lib/constants";
import { cn, fileSize, formatDateTime } from "@/lib/utils";
import type { CandidateDocument } from "@/lib/types";

export function DocumentsPanel({
  candidateId,
  documents,
  isAdmin,
}: {
  candidateId: string;
  documents: CandidateDocument[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("Resume");
  const [uploading, setUploading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirm, setConfirm] = useState<{ doc: CandidateDocument; action: "archive" | "delete" } | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = documents.filter((d) => (showArchived ? d.is_archived : !d.is_archived));
  const archivedCount = documents.filter((d) => d.is_archived).length;

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    let ok = 0;
    for (const f of Array.from(list)) {
      if (f.size > 4 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 4 MB`);
        continue;
      }
      const fd = new FormData();
      fd.append("file", f);
      fd.append("candidate_id", candidateId);
      fd.append("doc_type", docType);
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      if (res.ok) ok++;
      else {
        const j = await res.json().catch(() => ({}));
        toast.error(`${f.name}: ${j.error ?? "upload fail"}`);
      }
    }
    setUploading(false);
    if (ok) {
      toast.success(`${ok} file(s) uploaded to Google Drive`);
      router.refresh();
    }
  }

  async function act() {
    if (!confirm) return;
    setBusy(true);
    const res = await fetch(`/api/documents/${confirm.doc.id}`, {
      method: confirm.action === "delete" ? "DELETE" : "PATCH",
      headers: { "content-type": "application/json" },
      body: confirm.action === "archive" ? JSON.stringify({ is_archived: !confirm.doc.is_archived }) : undefined,
    });
    setBusy(false);
    setConfirm(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return toast.error(j.error ?? "Failed");
    }
    toast.success(confirm.action === "delete" ? "File deleted" : confirm.doc.is_archived ? "File restored" : "File archived");
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-ink-800">Documents</h3>
          <p className="text-[13px] text-ink-400">Saved in the candidate's folder in Google Drive.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="field-input h-9 w-44 text-[13px]" aria-label="Document type">
            {DOC_TYPES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <Button size="md" className="h-9" loading={uploading} onClick={() => input.current?.click()}>
            {!uploading && <Upload className="h-4 w-4" />} Upload
          </Button>
          <input
            ref={input}
            type="file"
            multiple
            hidden
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt,.rtf"
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title={showArchived ? "No archived files" : "No documents yet"}
          description={showArchived ? undefined : "Upload a resume — it's the first thing the HR team needs."}
        />
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((d) => {
            const isImg = d.mime_type?.startsWith("image/");
            const canPreview = isImg || d.mime_type === "application/pdf";
            return (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", d.doc_type === "Resume" ? "bg-saffron-50 text-saffron-800" : "bg-canvas text-ink-600")}>
                  {isImg ? <FileImage className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">{d.file_name}</p>
                  <p className="text-xs text-ink-400">
                    {d.doc_type} · {fileSize(d.size_bytes)} · {formatDateTime(d.created_at)}
                    {d.uploader?.full_name ? ` · ${d.uploader.full_name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {canPreview && (
                    <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="rounded-md p-2 text-ink-400 hover:bg-canvas hover:text-ink-800" title="Open">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <a href={`/api/documents/${d.id}?download=1`} className="rounded-md p-2 text-ink-400 hover:bg-canvas hover:text-ink-800" title="Download">
                    <Download className="h-4 w-4" />
                  </a>
                  <button onClick={() => setConfirm({ doc: d, action: "archive" })} className="rounded-md p-2 text-ink-400 hover:bg-canvas hover:text-ink-800" title={d.is_archived ? "Restore" : "Archive"}>
                    <Archive className="h-4 w-4" />
                  </button>
                  {isAdmin && (
                    <button onClick={() => setConfirm({ doc: d, action: "delete" })} className="rounded-md p-2 text-ink-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {archivedCount > 0 && (
        <div className="border-t border-line px-5 py-2.5">
          <button onClick={() => setShowArchived(!showArchived)} className="text-xs font-medium text-ink-400 hover:text-ink-800">
            {showArchived ? "Show active files" : `Show ${archivedCount} archived file${archivedCount > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={act}
        loading={busy}
        danger={confirm?.action === "delete"}
        title={confirm?.action === "delete" ? "Delete file?" : confirm?.doc.is_archived ? "Restore file?" : "Archive file?"}
        description={
          confirm?.action === "delete"
            ? `"${confirm.doc.file_name}" will be moved to the Google Drive trash and removed from here.`
            : "Archived files are hidden from the list but stay safe in Drive."
        }
        confirmLabel={confirm?.action === "delete" ? "Delete" : confirm?.doc.is_archived ? "Restore" : "Archive"}
      />
    </Card>
  );
}
