import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { ClientForm } from "@/components/clients/client-form";
import { emptyClient, type ClientFormData } from "@/components/clients/client-defaults";

export const metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("clients").select("*, client_contacts(*)").eq("id", id).maybeSingle();
  if (!c) notFound();
  const base = emptyClient();
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const initial: ClientFormData = {
    ...base,
    id: c.id,
    name: c.name,
    industry: s(c.industry),
    website: s(c.website),
    city: s(c.city),
    state: s(c.state),
    address: s(c.address),
    gstin: s(c.gstin),
    status: c.status,
    fee_type: c.fee_type ?? "Percentage",
    fee_value: s(c.fee_value),
    payment_terms_days: s(c.payment_terms_days),
    replacement_days: s(c.replacement_days),
    agreement_start: s(c.agreement_start),
    agreement_end: s(c.agreement_end),
    account_manager: s(c.account_manager),
    notes: s(c.notes),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contacts: (c.client_contacts ?? []).map((x: any) => ({
      name: x.name,
      designation: s(x.designation),
      email: s(x.email),
      phone: s(x.phone),
      is_primary: x.is_primary,
    })),
  };
  return (
    <>
      <div className="mx-auto max-w-4xl">
        <PageHeader title={`Edit ${c.name}`} description={c.client_code} />
      </div>
      <ClientForm initial={initial} />
    </>
  );
}
