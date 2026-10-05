"use client";

import { CalendarPlus, CheckSquare, Search } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { useDialogs } from "@/components/dialogs/provider";
import { useShell } from "@/components/shell/app-shell";

export function DashboardQuick({ meId }: { meId: string }) {
  const d = useDialogs();
  const { openPalette } = useShell();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={openPalette}>
        <Search className="h-4 w-4" /> Search
      </Button>
      <Button variant="secondary" onClick={() => d.openTask({ assigned_to: meId })}>
        <CheckSquare className="h-4 w-4" /> Task
      </Button>
      <Button variant="secondary" onClick={() => d.openInterview({})}>
        <CalendarPlus className="h-4 w-4" /> Interview
      </Button>
      <LinkButton href="/candidates/new">Add candidate</LinkButton>
    </div>
  );
}
