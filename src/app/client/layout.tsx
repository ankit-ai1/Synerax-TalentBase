import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell";
import { NotificationBell } from "@/components/portal/notification-bell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Client portal", template: "%s · Synerax Talent" },
  robots: { index: false, follow: false },
};

const NAV: PortalNavItem[] = [
  { href: "/client", label: "Dashboard", short: "Home", exact: true, icon: "dashboard" },
  { href: "/client/jobs", label: "My jobs", short: "Jobs", icon: "jobs", exclude: ["/client/jobs/new"] },
  { href: "/client/jobs/new", label: "Post a job", short: "Post", exact: true, icon: "post" },
  { href: "/client/notifications", label: "Notifications", short: "Alerts", icon: "bell" },
];

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("client");
  return (
    <PortalShell area="Client portal" nav={NAV} user={{ name: profile.full_name, email: profile.email }} actions={<NotificationBell allHref="/client/notifications" />}>
      {children}
    </PortalShell>
  );
}
