import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { MemberMessages } from "@/components/chat/member-messages";

export const metadata: Metadata = { title: "Messages" };

export default async function CandidateMessagesPage() {
  const profile = await requireRole("candidate");
  return <MemberMessages viewer="candidate" me={{ id: profile.id, name: profile.full_name || profile.email }} />;
}
