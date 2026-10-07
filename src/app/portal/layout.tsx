import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell";
import { NotificationBell } from "@/components/portal/notification-bell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Candidate portal", template: "%s · Synerax Talent" },
  robots: { index: false, follow: false },
};

const NAV: PortalNavItem[] = [
  { href: "/portal", label: "Dashboard", short: "Home", exact: true, icon: "dashboard" },
  { href: "/portal/jobs", label: "Find jobs", short: "Jobs", icon: "search" },
  { href: "/portal/applications", label: "My applications", short: "Applications", icon: "applications" },
  { href: "/portal/profile", label: "My profile", short: "Profile", icon: "profile" },
];

export default async function CandidatePortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("candidate");
  return (
    <PortalShell area="Candidate portal" nav={NAV} user={{ name: profile.full_name, email: profile.email }} profileHref="/portal/profile" actions={<NotificationBell allHref="/portal/notifications" />}>
      {children}
    </PortalShell>
  );
}
