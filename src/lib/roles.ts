/**
 * Role → area rules, shared by middleware (edge), server guards and the login form.
 * Pure functions only (no server imports) so this runs everywhere.
 */
import type { Role } from "./types";

export const STAFF_ROLES: Role[] = ["admin", "hr"];
export const isStaffRole = (role: Role | string | null | undefined) => STAFF_ROLES.includes(role as Role);

/** Where each role lands after sign-in */
export function roleHome(role: Role | string | null | undefined) {
  if (role === "client") return "/client";
  if (role === "candidate") return "/portal";
  return "/dashboard";
}

/** Public website + auth pages — no login needed */
export const PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/services",
  "/industries",
  "/employers",
  "/careers",
  "/job-seekers",
  "/contact",
  "/privacy",
  "/terms",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/set-password",
  "/invite/opt-out",
  "/api/invite/opt-out",
  "/api/contact",
  "/api/portal/register",
  "/api/portal/register/precheck",
  "/api/resume/parse",
  "/api/cron/daily",
  "/api/cron/chat-emails",
  "/api/cron/email",
  "/api/backups/log",
  "/api/bot",
  "/api/bot/confirm",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
]);

export function normalizePath(path: string) {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function isPublicPath(path: string) {
  const p = normalizePath(path);
  // /api/e/… = email open/click tracking (anyone who got the email, signed in or not)
  // /.well-known/… must answer for itself (a real 404 when absent), never redirect to the login page —
  // Lighthouse's agent-discovery audit treated that redirect as an invalid ai-catalog.json
  return PUBLIC_PATHS.has(p) || p.startsWith("/.well-known/") || p.startsWith("/api/e/") || p.startsWith("/opengraph-image") || p.startsWith("/apple-icon") || p.startsWith("/icon");
}

type Area = "public" | "portal" | "client" | "account" | "staff";

/** Which area a (non-public) path belongs to */
export function areaOf(path: string): Area {
  const p = normalizePath(path);
  if (isPublicPath(p)) return "public";
  if (p === "/portal" || p.startsWith("/portal/") || p.startsWith("/api/portal/")) return "portal";
  if (p === "/client" || p.startsWith("/client/") || p.startsWith("/api/client/")) return "client";
  if (p === "/account" || p.startsWith("/account/") || p.startsWith("/api/account/") || p === "/auth/signout") return "account";
  // chat attachments: every signed-in role (the route + RLS check the conversation)
  if (p.startsWith("/api/chat/")) return "account";
  return "staff";
}

/** Can this role open this path? (public + account pages are open to every signed-in role) */
export function canAccess(role: Role | string | null | undefined, path: string) {
  const area = areaOf(path);
  if (area === "public" || area === "account") return true;
  if (area === "portal") return role === "candidate";
  if (area === "client") return role === "client";
  return isStaffRole(role);
}

/** Safe post-login destination: honour ?next= only when the role may open it */
export function nextFor(role: Role | string | null | undefined, next: string | null | undefined) {
  if (next && next.startsWith("/") && !next.startsWith("//") && !isPublicPath(next) && canAccess(role, next)) return next;
  return roleHome(role);
}
