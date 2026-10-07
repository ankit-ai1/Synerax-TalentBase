"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, RotateCcw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/utils";

export function LeadActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function update(next: "New" | "Contacted" | "Closed") {
    setBusy(next);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getSession();
    const patch =
      next === "Contacted"
        ? { status: next, contacted_at: new Date().toISOString(), contacted_by: auth.session?.user.id ?? null }
        : next === "New"
          ? { status: next, contacted_at: null, contacted_by: null }
          : { status: next };
    const { error } = await supabase.from("website_leads").update(patch).eq("id", id);
    setBusy(null);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(next === "Contacted" ? "Marked as contacted" : next === "Closed" ? "Lead closed" : "Lead reopened");
    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-2">
      {status === "New" && (
        <Button size="sm" onClick={() => update("Contacted")} loading={busy === "Contacted"}>
          {busy !== "Contacted" && <Check className="h-3.5 w-3.5" />} Mark contacted
        </Button>
      )}
      {status !== "Closed" ? (
        <Button size="sm" variant="secondary" onClick={() => update("Closed")} loading={busy === "Closed"}>
          {busy !== "Closed" && <X className="h-3.5 w-3.5" />} Close
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => update("New")} loading={busy === "New"}>
          {busy !== "New" && <RotateCcw className="h-3.5 w-3.5" />} Reopen
        </Button>
      )}
    </div>
  );
}
