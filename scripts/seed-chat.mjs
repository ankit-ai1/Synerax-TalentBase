#!/usr/bin/env node
/**
 * Demo data for chat tests (run `npm run seed:portals` first — it creates the 2 client companies
 * and the demo candidates).
 *
 *   node scripts/seed-chat.mjs            → ensure the demo admin exists (random password, never printed)
 *   node scripts/seed-chat.mjs --cleanup  → delete demo conversations + the demo admin
 *
 * Tests sign in as staff by setting a fresh random password with the service role (see signInAs).
 * Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { DEMO } from "./seed-portals.mjs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const db = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
export const fresh = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

export const CHAT_DEMO = {
  admin: { email: "demo.admin@example.com", name: "Demo Admin" },
  hr: DEMO.staff[0], // demo.recruiter — HR
  candidate: DEMO.candidates[0], // has a portal login
  candidate2: DEMO.candidates[1], // nobody starts a chat with them in the tests
  client: DEMO.client, // Nimbus Fintech
  client2: DEMO.client2, // also Nimbus Fintech (same company → same thread)
  otherClient: DEMO.emptyClient, // Orbit Retail
  clientName: DEMO.clientName,
  otherClientName: DEMO.emptyClientName,
};

const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
};
const strong = () => randomBytes(24).toString("base64url") + "aA1!";

export async function findUser(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** sign in as any demo user; staff accounts get a fresh random password each time (never printed) */
export async function signInAs(email) {
  const u = await findUser(email);
  if (!u) throw new Error(`${email} not found — run npm run seed:portals and node scripts/seed-chat.mjs`);
  const isStaff = email === CHAT_DEMO.admin.email || DEMO.staff.some((s) => s.email === email);
  const password = isStaff ? strong() : DEMO.password;
  if (isStaff) must(await db.auth.admin.updateUserById(u.id, { password }), `password ${email}`);
  const c = fresh();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return { c, session: data.session, user: data.user, password };
}

/** lock staff demo accounts again (random password nobody knows) */
export async function relockStaff() {
  for (const email of [CHAT_DEMO.admin.email, ...DEMO.staff.map((s) => s.email)]) {
    const u = await findUser(email);
    if (u) await db.auth.admin.updateUserById(u.id, { password: strong() });
  }
}

export async function ids() {
  const cand = must(await db.from("candidates").select("id").ilike("email", CHAT_DEMO.candidate.email).maybeSingle(), "candidate");
  const cand2 = must(await db.from("candidates").select("id").ilike("email", CHAT_DEMO.candidate2.email).maybeSingle(), "candidate2");
  const client = must(await db.from("clients").select("id").ilike("name", CHAT_DEMO.clientName).maybeSingle(), "client");
  const other = must(await db.from("clients").select("id").ilike("name", CHAT_DEMO.otherClientName).maybeSingle(), "other client");
  if (!cand || !cand2 || !client || !other) throw new Error("Demo data missing — run: npm run seed:portals");
  return { candidateId: cand.id, candidate2Id: cand2.id, clientId: client.id, otherClientId: other.id };
}

/** remove demo conversations (messages cascade) */
export async function clearDemoChats() {
  const { candidateId, candidate2Id, clientId, otherClientId } = await ids();
  must(await db.from("conversations").delete().in("candidate_id", [candidateId, candidate2Id]), "delete candidate chats");
  must(await db.from("conversations").delete().in("client_id", [clientId, otherClientId]), "delete client chats");
  must(await db.from("tasks").delete().in("candidate_id", [candidateId, candidate2Id]).like("title", "Call back request%"), "delete call-back tasks");
}

async function seed() {
  let u = await findUser(CHAT_DEMO.admin.email);
  if (!u) u = must(await db.auth.admin.createUser({ email: CHAT_DEMO.admin.email, password: strong(), email_confirm: true, user_metadata: { full_name: CHAT_DEMO.admin.name } }), "create admin").user;
  must(await db.from("profiles").upsert({ id: u.id, email: CHAT_DEMO.admin.email, full_name: CHAT_DEMO.admin.name, role: "admin", is_active: true }), "admin profile");
  await ids();
  console.log("✓ Chat demo ready");
  console.log(`  Admin: ${CHAT_DEMO.admin.email} (random password — tests set their own)`);
  console.log(`  Candidates: ${CHAT_DEMO.candidate.email}, ${CHAT_DEMO.candidate2.email}`);
  console.log(`  Clients: ${CHAT_DEMO.clientName} (${CHAT_DEMO.client.email}, ${CHAT_DEMO.client2.email}), ${CHAT_DEMO.otherClientName} (${CHAT_DEMO.otherClient.email})`);
}

async function cleanup() {
  await clearDemoChats().catch((e) => console.warn("  !", e.message));
  const u = await findUser(CHAT_DEMO.admin.email);
  if (u) must(await db.auth.admin.deleteUser(u.id), "delete admin");
  console.log("✓ Chat demo data removed");
}

if (/seed-chat\.mjs$/.test(process.argv[1] ?? "")) {
  (process.argv.includes("--cleanup") ? cleanup() : seed()).catch((e) => {
    console.error("✗", e.message);
    process.exit(1);
  });
}
