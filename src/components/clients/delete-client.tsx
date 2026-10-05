"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { friendlyError } from "@/lib/utils";

export function DeleteClientButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="secondary" size="icon" onClick={() => setOpen(true)} aria-label="Delete client">
        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        danger
        loading={busy}
        title={`Delete ${name}?`}
        description="The client and its contacts will be removed. Its jobs will remain but show without a client."
        confirmLabel="Delete"
        onConfirm={async () => {
          setBusy(true);
          const { error } = await createClient().from("clients").delete().eq("id", id);
          setBusy(false);
          if (error) return toast.error(friendlyError(error.message));
          toast.success("Client deleted");
          router.push("/clients");
          router.refresh();
        }}
      />
    </>
  );
}
