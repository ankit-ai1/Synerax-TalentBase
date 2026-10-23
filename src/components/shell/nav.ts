import {
  BarChart3,
  Bookmark,
  Briefcase,
  Building2,
  CalendarClock,
  CheckSquare,
  ClipboardCheck,
  FileUp,
  History,
  Inbox,
  LayoutGrid,
  Mail,
  MessageSquareText,
  MessagesSquare,
  Bot,
  Tags,
  Users,
  UsersRound, SlidersHorizontal, DatabaseBackup, Newspaper, Globe } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "tasks" | "interviews" | "jobs" | "review" | "messages";
  /** sub-paths that belong to another nav item */
  exclude?: string[];
  exact?: boolean;
};

export const NAV: { label: string; admin?: boolean; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, exact: true },
      { href: "/messages", label: "Messages", icon: MessagesSquare, badge: "messages" },
    ],
  },
  {
    label: "Recruiting",
    items: [
      { href: "/candidates", label: "Candidates", icon: UsersRound },
      { href: "/jobs", label: "Jobs", icon: Briefcase, badge: "jobs", exclude: ["/jobs/review"] },
      { href: "/jobs/review", label: "Pending review", icon: ClipboardCheck, badge: "review" },
      { href: "/clients", label: "Clients", icon: Building2 },
      { href: "/interviews", label: "Interviews", icon: CalendarClock, badge: "interviews" },
      { href: "/tasks", label: "Tasks", icon: CheckSquare, badge: "tasks" },
      { href: "/shortlists", label: "Shortlists", icon: Bookmark },
    ],
  },
  {
    label: "Insights & tools",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/import", label: "Bulk import", icon: FileUp },
      { href: "/templates", label: "Message templates", icon: MessageSquareText },
      { href: "/admin/leads", label: "Website leads", icon: Inbox },
      { href: "/admin/blog", label: "Blog", icon: Newspaper },
    ],
  },
  {
    label: "Admin",
    admin: true,
    items: [
      { href: "/admin/users", label: "Team & access", icon: Users },
      { href: "/admin/masters", label: "Skills & roles", icon: Tags },
      { href: "/admin/settings", label: "App settings", icon: SlidersHorizontal },
      { href: "/admin/email", label: "Email settings", icon: Mail, exclude: ["/admin/email/analytics"] },
      { href: "/admin/email/analytics", label: "Email analytics", icon: BarChart3 },
      { href: "/admin/chatbot", label: "Chatbot & chat", icon: Bot },
      { href: "/admin/activity", label: "Activity log", icon: History },
      { href: "/admin/backups", label: "Backups", icon: DatabaseBackup },
      { href: "/admin/seo-pages", label: "SEO landing pages", icon: Globe },
    ],
  },
];

export function isActive(path: string, item: NavItem) {
  if (item.exact) return path === item.href;
  if (item.exclude?.some((x) => path === x || path.startsWith(x + "/"))) return false;
  return path === item.href || path.startsWith(item.href + "/");
}
