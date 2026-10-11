#!/usr/bin/env node
/**
 * Chat security tests — every call uses the PUBLIC key + a real user JWT, exactly like a browser.
 * Prereqs: supabase/migrations/005_chat.sql applied, `npm run seed:portals`, `node scripts/seed-chat.mjs`.
 * Run: npm run test:chat   (exits 1 if any check fails; cleans up the demo conversations afterwards)
 */
import { CHAT_DEMO, clearDemoChats, db, fresh, ids, relockStaff, signInAs } from "./seed-chat.mjs";

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && extra ? `  → ${extra}` : ""}`);
};
const refused = async (q) => {
  const { data, error } = await q;
  return { ok: !!error, info: error ? error.message : JSON.stringify(data)?.slice(0, 140) };
};
const none = async (q) => {
  const { data, error } = await q;
  return { ok: !!error || data == null || (Array.isArray(data) && data.length === 0), info: error ? error.message : JSON.stringify(data)?.slice(0, 140) };
};
/** join a private Realtime channel; resolves "SUBSCRIBED" or an error status */
const joinChannel = (c, topic) =>
  new Promise((resolve) => {
    const ch = c.channel(topic, { config: { private: true } });
    const t = setTimeout(() => resolve("TIMED_OUT"), 8000);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(t);
        c.removeChannel(ch);
        resolve(status);
      }
    });
  });

async function main() {
  const { candidateId, candidate2Id, clientId, otherClientId } = await ids();
  await clearDemoChats();
  const setting = async (v) => db.from("chat_settings").update({ hr_can_chat_candidates: v }).eq("id", 1);
  await setting(false);

  // ------------------------------------------------------------------ admin
  console.log("\nAdmin");
  const admin = await signInAs(CHAT_DEMO.admin.email);
  const startC = await admin.c.rpc("chat_start_candidate", { p_candidate: candidateId });
  check("admin: can start a chat with a candidate", !startC.error && !!startC.data, startC.error?.message);
  const candConv = startC.data;
  const again = await admin.c.rpc("chat_start_candidate", { p_candidate: candidateId });
  check("admin: starting again returns the same thread (one per candidate)", again.data === candConv, JSON.stringify(again));
  const s1 = await admin.c.rpc("chat_send", { p_conversation: candConv, p_body: "Hello from Synerax (test)" });
  check("admin: can send to the candidate", !s1.error, s1.error?.message);
  const startCl = await admin.c.rpc("chat_start_client", { p_client: clientId });
  check("admin: can start the client thread", !startCl.error && !!startCl.data, startCl.error?.message);
  const clientConv = startCl.data;
  const s2 = await admin.c.rpc("chat_send", { p_conversation: clientConv, p_body: "Hello Nimbus team (test)" });
  check("admin: can send to the client", !s2.error, s2.error?.message);
  const noPortal = await db.from("candidates").select("id").is("user_id", null).eq("is_archived", false).limit(1).maybeSingle();
  if (noPortal.data) {
    const r = await refused(admin.c.rpc("chat_start_candidate", { p_candidate: noPortal.data.id }));
    check("admin: can't chat with a candidate who has no portal login", r.ok && /registered/i.test(r.info), r.info);
  }

  // ------------------------------------------------------------------ candidate
  console.log("\nCandidate (thread started by Synerax)");
  const cand = await signInAs(CHAT_DEMO.candidate.email);
  const myList = await cand.c.from("conversations").select("id, type");
  check("candidate: sees exactly their own conversation", !myList.error && myList.data.length === 1 && myList.data[0].id === candConv, JSON.stringify(myList.data ?? myList.error));
  const unreadBefore = await cand.c.rpc("chat_unread_total");
  check("candidate: unread badge counts the new message", unreadBefore.data >= 1, JSON.stringify(unreadBefore));
  const notif = await cand.c.from("notifications").select("id, type, link").eq("type", "message");
  check("candidate: got an in-app notification", (notif.data ?? []).some((n) => n.link?.includes(candConv)), JSON.stringify(notif.data));
  const msgs = await cand.c.rpc("chat_messages", { p_conversation: candConv });
  check("candidate: can read the thread", !msgs.error && msgs.data.some((m) => m.body.includes("Hello from Synerax")), msgs.error?.message);
  const reply = await cand.c.rpc("chat_send", { p_conversation: candConv, p_body: "Thanks! (test reply)" });
  check("candidate: can reply in their thread", !reply.error, reply.error?.message);
  await cand.c.rpc("chat_mark_read", { p_conversation: candConv });
  const unreadAfter = await cand.c.rpc("chat_unread_total");
  check("candidate: badge clears after reading", unreadAfter.data === 0, JSON.stringify(unreadAfter));
  let r;
  r = await refused(cand.c.from("conversations").insert({ type: "candidate", candidate_id: candidateId }));
  check("candidate: cannot insert a conversation directly", r.ok, r.info);
  r = await refused(cand.c.rpc("chat_start_candidate", { p_candidate: candidateId }));
  check("candidate: cannot start a candidate chat (RPC)", r.ok, r.info);
  r = await refused(cand.c.rpc("chat_start_client", { p_client: clientId }));
  check("candidate: cannot start a client chat (RPC)", r.ok, r.info);
  const mine = await cand.c.rpc("chat_my_thread", { p_create: true });
  check("candidate: chat_my_thread never creates a new thread", mine.data === candConv, JSON.stringify(mine));
  r = await refused(cand.c.from("messages").insert({ conversation_id: candConv, sender_id: cand.user.id, sender_role: "candidate", body: "x" }));
  check("candidate: cannot insert messages directly (no forged attachments)", r.ok, r.info);
  r = await none(cand.c.from("messages").select("id").eq("conversation_id", clientConv));
  check("candidate: cannot read the client thread", r.ok, r.info);
  r = await refused(cand.c.rpc("chat_messages", { p_conversation: clientConv }));
  check("candidate: chat_messages on the client thread refused", r.ok, r.info);
  r = await refused(cand.c.rpc("chat_send", { p_conversation: clientConv, p_body: "hi client" }));
  check("candidate: cannot message the client thread", r.ok, r.info);
  r = await refused(cand.c.rpc("chat_log_bot", { p_conversation: clientConv, p_items: [{ role: "user", body: "x" }] }));
  check("candidate: cannot write bot logs into another thread", r.ok, r.info);
  r = await refused(cand.c.rpc("chat_update_conversation", { p_conversation: candConv, p: { status: "closed" } }));
  check("candidate: cannot close/assign conversations", r.ok, r.info);
  r = await refused(cand.c.rpc("chat_context", { p_conversation: candConv }));
  check("candidate: staff context panel refused", r.ok, r.info);
  r = await none(cand.c.from("chat_attachments").select("*"));
  check("candidate: no access to attachment file ids", r.ok, r.info);
  r = await refused(cand.c.rpc("chat_email_targets"));
  check("candidate: e-mail targets refused", r.ok, r.info);
  check("candidate: Realtime — own private channel allowed", (await joinChannel(cand.c, `chat:${candConv}`)) === "SUBSCRIBED");
  check("candidate: Realtime — client thread channel refused", (await joinChannel(cand.c, `chat:${clientConv}`)) !== "SUBSCRIBED");

  console.log("\nCandidate 2 (no chat yet)");
  const cand2 = await signInAs(CHAT_DEMO.candidate2.email);
  const l2 = await cand2.c.rpc("chat_list", { p: {} });
  check("candidate 2: has no conversations", !l2.error && l2.data.length === 0, JSON.stringify(l2));
  const t2 = await cand2.c.rpc("chat_my_thread", { p_create: true });
  check("candidate 2: cannot create a thread", !t2.error && t2.data === null, JSON.stringify(t2));
  r = await refused(cand2.c.rpc("chat_handoff", { p_transcript: "test" }));
  check("candidate 2: 'message my recruiter' refused without a thread", r.ok, r.info);
  r = await none(cand2.c.from("conversations").select("id"));
  check("candidate 2: cannot see candidate 1's conversation", r.ok, r.info);
  const cb = await cand2.c.rpc("chat_request_callback", { p_note: "test call-back" });
  check("candidate 2: can request a call back", !cb.error && cb.data === true, cb.error?.message);
  const cb2 = await cand2.c.rpc("chat_request_callback", { p_note: "again" });
  check("candidate 2: second call-back within 24 h is ignored", cb2.data === false, JSON.stringify(cb2));

  // ------------------------------------------------------------------ client
  console.log("\nClient (Nimbus, user 1)");
  const cli = await signInAs(CHAT_DEMO.client.email);
  const cl = await cli.c.from("conversations").select("id, type");
  check("client: sees only their company thread", !cl.error && cl.data.length === 1 && cl.data[0].id === clientConv, JSON.stringify(cl.data ?? cl.error));
  r = await none(cli.c.from("conversations").select("id").eq("type", "candidate"));
  check("client: sees NO candidate conversations", r.ok, r.info);
  r = await none(cli.c.from("messages").select("id, body").eq("conversation_id", candConv));
  check("client: cannot read candidate messages (direct query)", r.ok, r.info);
  r = await none(cli.c.from("conversation_participants").select("*").eq("conversation_id", candConv));
  check("client: cannot see candidate thread participants", r.ok, r.info);
  r = await refused(cli.c.rpc("chat_messages", { p_conversation: candConv }));
  check("client: chat_messages on a candidate thread refused", r.ok, r.info);
  r = await refused(cli.c.rpc("chat_send", { p_conversation: candConv, p_body: "hello candidate" }));
  check("client: cannot message a candidate", r.ok, r.info);
  r = await refused(cli.c.rpc("chat_start_candidate", { p_candidate: candidateId }));
  check("client: cannot start a candidate chat", r.ok, r.info);
  r = await refused(cli.c.rpc("chat_mark_read", { p_conversation: candConv }));
  check("client: cannot touch a candidate thread at all", r.ok, r.info);
  r = await none(cli.c.from("candidates").select("id"));
  check("client: no direct candidate table access", r.ok, r.info);
  const ct = await cli.c.rpc("chat_my_thread", { p_create: true });
  check("client: chat_my_thread returns the existing company thread", ct.data === clientConv, JSON.stringify(ct));
  const cs = await cli.c.rpc("chat_send", { p_conversation: clientConv, p_body: "Hi Synerax, any update? (test)" });
  check("client: can message Synerax", !cs.error, cs.error?.message);
  check("client: Realtime — candidate thread channel refused", (await joinChannel(cli.c, `chat:${candConv}`)) !== "SUBSCRIBED");
  check("client: Realtime — own thread channel allowed", (await joinChannel(cli.c, `chat:${clientConv}`)) === "SUBSCRIBED");

  console.log("\nClient (Nimbus, user 2 — same company)");
  const cli2 = await signInAs(CHAT_DEMO.client2.email);
  const m2 = await cli2.c.rpc("chat_messages", { p_conversation: clientConv });
  check("client 2: sees the same thread incl. colleague's message", !m2.error && m2.data.some((m) => m.body.includes("any update")), m2.error?.message);

  console.log("\nClient (Orbit — another company)");
  const other = await signInAs(CHAT_DEMO.otherClient.email);
  r = await none(other.c.from("conversations").select("id").eq("id", clientConv));
  check("other client: cannot see Nimbus's thread", r.ok, r.info);
  r = await refused(other.c.rpc("chat_send", { p_conversation: clientConv, p_body: "x" }));
  check("other client: cannot post in Nimbus's thread", r.ok, r.info);
  const ot = await other.c.rpc("chat_my_thread", { p_create: true });
  check("other client: can start their own company thread", !ot.error && !!ot.data && ot.data !== clientConv, JSON.stringify(ot));
  const ot2 = await other.c.rpc("chat_my_thread", { p_create: true });
  check("other client: only ONE thread per company", ot2.data === ot.data, JSON.stringify(ot2));
  const otherRow = await db.from("conversations").select("client_id").eq("id", ot.data).single();
  check("other client: thread belongs to their own company", otherRow.data?.client_id === otherClientId, JSON.stringify(otherRow.data));

  // ------------------------------------------------------------------ HR
  console.log("\nHR (setting 'HR can chat with candidates' = off)");
  const hr = await signInAs(CHAT_DEMO.hr.email);
  r = await refused(hr.c.rpc("chat_start_candidate", { p_candidate: candidate2Id }));
  check("HR: cannot start a candidate chat while the setting is off", r.ok, r.info);
  r = await refused(hr.c.rpc("chat_send", { p_conversation: candConv, p_body: "hr test" }));
  check("HR: cannot send in a candidate chat while off", r.ok, r.info);
  const hrRead = await hr.c.rpc("chat_messages", { p_conversation: candConv });
  check("HR: can still read candidate chats", !hrRead.error, hrRead.error?.message);
  const hrClient = await hr.c.rpc("chat_send", { p_conversation: clientConv, p_body: "HR reply to client (test)" });
  check("HR: can message clients", !hrClient.error, hrClient.error?.message);
  await setting(true);
  const hrOn = await hr.c.rpc("chat_send", { p_conversation: candConv, p_body: "HR can chat now (test)" });
  check("HR: can send to candidates once the admin turns it on", !hrOn.error, hrOn.error?.message);
  await setting(false);
  r = await refused(hr.c.from("chat_settings").update({ hr_can_chat_candidates: true }).eq("id", 1).select());
  const st = await db.from("chat_settings").select("hr_can_chat_candidates").eq("id", 1).single();
  check("HR: cannot change the setting themself", st.data?.hr_can_chat_candidates === false, r.info);

  // ------------------------------------------------------------------ anonymous
  console.log("\nAnonymous");
  const anon = fresh();
  for (const t of ["conversations", "messages", "conversation_participants", "chat_attachments", "bot_unanswered", "chat_settings"]) {
    r = await none(anon.from(t).select("*").limit(3));
    check(`anon: no read of ${t}`, r.ok, r.info);
  }
  for (const [fn, args] of [["chat_list", { p: {} }], ["chat_send", { p_conversation: candConv, p_body: "x" }], ["chat_start_client", { p_client: clientId }], ["chat_my_thread", { p_create: true }]]) {
    r = await refused(anon.rpc(fn, args));
    check(`anon: rpc ${fn} refused`, r.ok, r.info);
  }
  const faqs = await anon.from("bot_faqs").select("id").limit(1);
  check("anon: can read active chatbot FAQs", !faqs.error, faqs.error?.message);
  r = await refused(anon.from("bot_faqs").insert({ question: "spam?", answer: "spam" }));
  check("anon: cannot add FAQs", r.ok, r.info);
  r = await refused(cli.c.from("bot_faqs").insert({ question: "client spam?", answer: "spam" }).select());
  check("client: cannot add FAQs", r.ok, r.info);

  // ------------------------------------------------------------------ cleanup
  await clearDemoChats();
  await relockStaff();
  console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error("✗", e.message);
  await clearDemoChats().catch(() => {});
  await relockStaff().catch(() => {});
  process.exit(1);
});
