import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { MemberMessages } from "@/components/chat/member-messages";

export const metadata: Metadata = { title: "Messages" };

export default async function ClientMessagesPage() {
  const profile = await requireRole("client");
  return <MemberMessages viewer="client" me={{ id: profile.id, name: profile.full_name || profile.email }} />;
}
