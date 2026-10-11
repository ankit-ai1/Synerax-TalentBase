import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell";
import { NotificationBell } from "@/components/portal/notification-bell";
import { MessagesIcon } from "@/components/chat/messages-icon";
import { ChatLauncher } from "@/components/chat/launcher";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Client portal", template: "%s · Synerax TalentBase" },
  robots: { index: false, follow: false },
};

const NAV: PortalNavItem[] = [
  { href: "/client", label: "Dashboard", short: "Home", exact: true, icon: "dashboard" },
  { href: "/client/jobs", label: "My jobs", short: "Jobs", icon: "jobs", exclude: ["/client/jobs/new"] },
  { href: "/client/jobs/new", label: "Post a job", short: "Post", exact: true, icon: "post" },
  { href: "/client/messages", label: "Messages", short: "Messages", icon: "messages", badge: "messages" },
  { href: "/client/notifications", label: "Notifications", short: "Alerts", icon: "bell" },
];

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("client");
  return (
    <PortalShell area="Client portal" nav={NAV} user={{ name: profile.full_name, email: profile.email }} actions={<><MessagesIcon href="/client/messages" /><NotificationBell allHref="/client/notifications" /></>}>
      {children}
      <ChatLauncher />
    </PortalShell>
  );
}
