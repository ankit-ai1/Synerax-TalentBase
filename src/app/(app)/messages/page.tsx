import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffInbox } from "@/components/chat/inbox";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const profile = await requireStaff();
  const supabase = await createClient();
  const [{ data: staff }, { data: templates }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("role", ["admin", "hr"]).eq("is_active", true).order("full_name"),
    supabase.from("message_templates").select("id, name, body").order("name"),
  ]);
  return (
    <Suspense>
      <StaffInbox
        me={{ id: profile.id, name: profile.full_name || profile.email, role: profile.role as "admin" | "hr" }}
        staff={(staff ?? []).map((s) => ({ id: s.id, name: s.full_name || "Team member" }))}
        templates={templates ?? []}
      />
    </Suspense>
  );
}
