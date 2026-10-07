import { Mail, MessageCircle, Phone } from "lucide-react";
import type { StaffContact } from "@/lib/client-types";
import { Avatar, waLink } from "./kit";
import { cn } from "@/lib/utils";

/** A Synerax team member with one-tap call / email / WhatsApp */
export function ContactRow({ person, message, className }: { person: StaffContact; message?: string; className?: string }) {
  const wa = waLink(person.phone, message);
  const action = "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-600 transition hover:border-jade/40 hover:text-jade-700";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar name={person.name} src={person.avatar_url} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink-900">{person.name}</p>
        <p className="truncate text-[12px] text-ink-500">
          {person.designation}
          {person.role === "Account manager" && person.designation !== "Account manager" ? " · Account manager" : ""}
        </p>
        {person.phone && <p className="truncate text-[12px] tabular text-ink-400">{person.phone}</p>}
      </div>
      <div className="flex shrink-0 gap-1.5">
        {person.phone && (
          <a href={`tel:${person.phone.replace(/\s/g, "")}`} className={action} aria-label={`Call ${person.name}`} title="Call">
            <Phone className="h-4 w-4" />
          </a>
        )}
        <a href={`mailto:${person.email}`} className={action} aria-label={`Email ${person.name}`} title={person.email}>
          <Mail className="h-4 w-4" />
        </a>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(action, "hover:border-emerald-500/40 hover:text-emerald-600")} aria-label={`WhatsApp ${person.name}`} title="WhatsApp">
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
