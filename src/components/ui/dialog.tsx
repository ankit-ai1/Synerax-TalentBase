"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-pop animate-pop-in sm:rounded-2xl",
          widths[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink-800">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-ink-400">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-canvas hover:text-ink-800" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="h-9 rounded-lg px-4 text-sm font-medium text-ink-600 hover:bg-surface">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "h-9 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-50",
              danger ? "bg-red-600 hover:bg-red-700" : "bg-jade hover:bg-jade-700"
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-600">{description}</p>
    </Dialog>
  );
}
