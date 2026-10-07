import { requireRole } from "@/lib/auth";
import { NotificationsList } from "@/components/portal/notifications-list";

export const metadata = { title: "Notifications" };

export default async function ClientNotificationsPage() {
  await requireRole("client");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-[28px] font-semibold tracking-[-0.02em] text-ink-900">Notifications</h1>
      <NotificationsList />
    </div>
  );
}
