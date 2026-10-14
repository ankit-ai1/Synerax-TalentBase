"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { TextField } from "@/components/ui/fields";
import { formatDateTime, friendlyError } from "@/lib/utils";

/** app_settings.min_profile_completion_to_apply — enforced by candidate_apply in the database */
export function ApplyRulesForm({ initial, updatedAt }: { initial: number; updatedAt: string | null }) {
  const router = useRouter();
  const [v, setV] = useState(String(initial));
  const [saving, setSaving] = useState(false);
  const n = Number(v);
  const valid = v.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 100;

  async function save() {
    if (!valid) return toast.error("Enter a whole number from 0 to 100");
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("app_settings")
      .update({ min_profile_completion_to_apply: n, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Saved");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="One-click apply"
        description="Candidates below this profile completion can't apply themselves (portal, job cards and the assistant). Staff can still add anyone to a job — those additions are flagged and logged."
      />
      <div className="flex flex-wrap items-end gap-3 p-5">
        <TextField
          label="Minimum profile completion to apply"
          value={v}
          onChange={(x) => setV(x.replace(/[^\d]/g, "").slice(0, 3))}
          suffix="%"
          inputMode="numeric"
          className="w-64"
        />
        <Button onClick={save} disabled={saving || !valid || n === initial}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {updatedAt && <p className="w-full text-xs text-ink-400">Last changed {formatDateTime(updatedAt)}</p>}
      </div>
    </Card>
  );
}
