import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/portal/portal-shell";
import { NotificationBell } from "@/components/portal/notification-bell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Candidate portal", template: "%s · Synerax Talent" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/portal", label: "Dashboard", short: "Home", exact: true },
  { href: "/portal/jobs", label: "Find jobs", short: "Jobs" },
  { href: "/portal/applications", label: "My applications", short: "Applications" },
  { href: "/portal/profile", label: "My profile", short: "Profile" },
];

export default async function CandidatePortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("candidate");
  return (
    <PortalShell area="Candidate portal" nav={NAV} user={{ name: profile.full_name, email: profile.email }} actions={<NotificationBell allHref="/portal/notifications" />}>
      {children}
    </PortalShell>
  );
}
