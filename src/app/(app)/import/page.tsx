import { PageHeader } from "@/components/ui/misc";
import { Importer } from "@/components/import/importer";

export const metadata = { title: "Bulk import" };

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Bulk import" description="Add hundreds of candidates at once from Excel (.xlsx) or CSV. Duplicate emails/phones are skipped automatically." />
      <Importer />
    </>
  );
}
