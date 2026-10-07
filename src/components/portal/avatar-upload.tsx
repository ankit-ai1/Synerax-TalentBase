"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/portal-ui/kit";

/** Candidate photo with a one-tap upload (stored as the "Photo" document) */
export function AvatarUpload({ name, photoId, size = 88 }: { name: string; photoId: string | null; size?: number }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) return toast.error("Photo must be a JPG, PNG or WEBP image");
    if (file.size > 4 * 1024 * 1024) return toast.error("Photo must be 4 MB or smaller");
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("doc_type", "Photo");
    const res = await fetch("/api/portal/documents", { method: "POST", body: fd });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setPreview(null);
      return toast.error(out.error ?? "Upload failed");
    }
    toast.success("Photo updated");
    router.refresh();
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Avatar name={name} src={preview ?? (photoId ? `/api/portal/documents/${photoId}` : null)} size={size} className="shadow-card ring-4 ring-surface" />
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} aria-label="Upload profile photo" />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-jade text-white shadow-card transition hover:brightness-110 disabled:opacity-70"
        aria-label={photoId ? "Change photo" : "Add a photo"}
        title={photoId ? "Change photo" : "Add a photo"}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
