import { requireRole } from "@/lib/auth";
import { NotificationsList } from "@/components/portal/notifications-list";
import { PageTitle } from "@/components/portal-ui/kit";

export const metadata = { title: "Notifications" };

export default async function ClientNotificationsPage() {
  await requireRole("client");
  return (
    <div className="portal-in mx-auto max-w-3xl">
      <PageTitle eyebrow="Inbox" title="Notifications" subtitle="Everything that happened, newest first." />
      <NotificationsList />
    </div>
  );
}
