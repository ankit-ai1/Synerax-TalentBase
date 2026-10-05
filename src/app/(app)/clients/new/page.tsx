import { PageHeader } from "@/components/ui/misc";
import { ClientForm } from "@/components/clients/client-form";
import { emptyClient } from "@/components/clients/client-defaults";

export const metadata = { title: "Add client" };

export default function NewClientPage() {
  return (
    <>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Add client" description="Company, contacts and commercial terms." />
      </div>
      <ClientForm initial={emptyClient()} />
    </>
  );
}
