"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/fields";
import { friendlyError } from "@/lib/utils";

async function save(field: "open_to_work" | "job_alerts", value: boolean) {
  const { error } = await createClient().rpc("candidate_update_profile", { p: { candidate: { [field]: value } } });
  if (error) throw new Error(friendlyError(error.message));
}

export function OpenToWorkToggle({ initial, plain }: { initial: boolean; plain?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div className={plain ? "" : "rounded-2xl border border-line bg-surface px-4 py-3 shadow-card"}>
      <Switch
        checked={on}
        onChange={async (v) => {
          setOn(v);
          try {
            await save("open_to_work", v);
            toast.success(v ? "You're marked as open to work" : "Open to work turned off");
          } catch (e) {
            setOn(!v);
            toast.error(e instanceof Error ? e.message : "Couldn't update");
          }
        }}
        label="Open to work"
        description={on ? "Recruiters can see you're looking" : "You won't be suggested for new roles"}
      />
    </div>
  );
}

export function JobAlertsToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <Switch
      checked={on}
      onChange={async (v) => {
        setOn(v);
        try {
          await save("job_alerts", v);
          toast.success(v ? "Job alerts on" : "Job alerts off");
        } catch (e) {
          setOn(!v);
          toast.error(e instanceof Error ? e.message : "Couldn't update");
        }
      }}
      label="Email me new matching jobs"
      description="At most one email a day"
    />
  );
}
