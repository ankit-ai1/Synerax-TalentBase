/** Shared chat types (staff app + portals) */
export type ChatViewer = "staff" | "candidate" | "client";
export type SenderRole = "admin" | "hr" | "client" | "candidate" | "bot" | "system";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_role: SenderRole;
  sender_name: string;
  body: string;
  kind: "text" | "system" | "bot";
  attachment: { name: string; size: number; mime: string | null } | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  /** client-only: optimistic message waiting for the server */
  pending?: boolean;
  failed?: boolean;
};

export type ChatConversation = {
  id: string;
  type: "candidate" | "client";
  status: "open" | "closed";
  title: string;
  subtitle: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_sender_role: SenderRole | null;
  created_at: string;
  unread: number;
  can_send: boolean;
  // staff only
  candidate_id?: string | null;
  client_id?: string | null;
  assigned_to?: string | null;
  assigned_name?: string | null;
};

export type ChatParticipant = { conversation_id: string; user_id: string; role: string; last_read_at: string | null };

export const isStaffRole = (r: string | null | undefined) => r === "admin" || r === "hr";
