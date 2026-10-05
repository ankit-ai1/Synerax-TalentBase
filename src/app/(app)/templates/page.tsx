import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { TemplatesManager } from "@/components/templates/templates-manager";

export const metadata = { title: "Message templates" };

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("message_templates").select("*").order("channel").order("name");
  return (
    <>
      <PageHeader title="Message templates" description="Ready-made WhatsApp and email messages. Placeholders like {{first_name}} are filled in automatically." />
      <TemplatesManager templates={data ?? []} />
    </>
  );
}
