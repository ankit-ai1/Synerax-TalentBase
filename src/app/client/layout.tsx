import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell";
import { NotificationBell } from "@/components/portal/notification-bell";
import { MessagesIcon } from "@/components/chat/messages-icon";
import { ChatLauncher } from "@/components/chat/launcher";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Client portal", template: "%s · Synerax TalentBase" },
  robots: { index: false, follow: false },
};

/** navigation by the member's role inside their company (the database enforces the same rules) */
function navFor(role: string): PortalNavItem[] {
  const admin = role === "client_admin";
  return [
    { href: "/client", label: "Dashboard", short: "Home", exact: true, icon: "dashboard" },
    { href: "/client/jobs", label: admin ? "Jobs" : "My jobs", short: "Jobs", icon: "jobs", exclude: ["/client/jobs/new"] },
    ...(role !== "ta_coordinator" ? [{ href: "/client/jobs/new", label: "Post a job", short: "Post", exact: true, icon: "post" } as PortalNavItem] : []),
    { href: "/client/tasks", label: "Tasks", short: "Tasks", icon: "tasks" },
    ...(admin
      ? ([
          { href: "/client/team", label: "Team", short: "Team", icon: "team" },
          { href: "/client/activity", label: "Activity", short: "Activity", icon: "activity", mobile: false },
        ] as PortalNavItem[])
      : []),
    { href: "/client/messages", label: "Messages", short: "Messages", icon: "messages", badge: "messages" },
    { href: "/client/notifications", label: "Notifications", short: "Alerts", icon: "bell", mobile: !admin },
  ];
}

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("client");
  const supabase = await createClient();
  const [{ data: me }] = await Promise.all([supabase.rpc("client_me"), supabase.rpc("client_touch_login")]);
  const role = (me as { user?: { role?: string } } | null)?.user?.role ?? "client_admin";
  return (
    <PortalShell area="Client portal" nav={navFor(role)} user={{ name: profile.full_name, email: profile.email }} actions={<><MessagesIcon href="/client/messages" /><NotificationBell allHref="/client/notifications" /></>}>
      {children}
      <ChatLauncher />
    </PortalShell>
  );
}
