"use client";

import { CalendarPlus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialogs } from "@/components/dialogs/provider";

export function ScheduleButton() {
  const d = useDialogs();
  return (
    <Button onClick={() => d.openInterview({})}>
      <CalendarPlus className="h-4 w-4" /> Schedule interview
    </Button>
  );
}

export function NewTaskButton({ me }: { me: string }) {
  const d = useDialogs();
  return (
    <Button onClick={() => d.openTask({ assigned_to: me })}>
      <CheckSquare className="h-4 w-4" /> New task
    </Button>
  );
}
