import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui/misc";
import { NotificationsList } from "@/components/portal/notifications-list";

export const metadata = { title: "Notifications" };

export default async function StaffNotificationsPage() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" description="Client and candidate activity on jobs you own (admins also see unassigned jobs)." />
      <NotificationsList />
    </div>
  );
}
