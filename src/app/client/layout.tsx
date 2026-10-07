import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/portal/portal-shell";
import { NotificationBell } from "@/components/portal/notification-bell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Client portal", template: "%s · Synerax Talent" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/client", label: "Dashboard", exact: true },
  { href: "/client/jobs", label: "My jobs" },
  { href: "/client/jobs/new", label: "Post a job", exact: true },
];

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("client");
  return (
    <PortalShell area="Client portal" nav={NAV} user={{ name: profile.full_name, email: profile.email }} actions={<NotificationBell allHref="/client/notifications" />}>
      {children}
    </PortalShell>
  );
}
