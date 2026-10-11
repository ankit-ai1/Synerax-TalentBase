import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { BOT_FAQ } from "@/data/bot-faq";
import { ChatbotAdmin } from "./chatbot-admin";

export const metadata = { title: "Chatbot & chat" };

export default async function ChatbotAdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: settings }, { data: faqs }, { data: unanswered }] = await Promise.all([
    supabase.from("chat_settings").select("hr_can_chat_candidates").eq("id", 1).maybeSingle(),
    supabase.from("bot_faqs").select("id, question, answer, audience, keywords, is_active, updated_at").order("updated_at", { ascending: false }),
    supabase.from("bot_unanswered").select("id, question, audience, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(100),
  ]);
  return (
    <>
      <PageHeader title="Chatbot & chat" description="Who may chat with candidates, the chatbot's questions & answers, and what it couldn't answer." />
      <ChatbotAdmin
        hrCanChat={!!settings?.hr_can_chat_candidates}
        faqs={faqs ?? []}
        builtIn={BOT_FAQ.map((f) => ({ id: f.id, question: f.q, answer: f.a, audience: f.audience }))}
        unanswered={unanswered ?? []}
      />
    </>
  );
}
