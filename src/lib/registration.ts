import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { createFolder, findOrCreateFolder, folderExists, moveFile, rootFolderId, trashFile, uploadFile } from "@/lib/drive";
import type { Registration } from "@/lib/registration-schema";
import { after } from "next/server";
import { onCandidateRegistered } from "@/lib/email/notify-events";

/**
 * Candidate self-registration.
 * 1. The browser signs the user up (Supabase sends the verification email).
 * 2. storePending() keeps the form data + CV (in a Drive "pending" folder) on the auth user's
 *    app_metadata — which the user cannot edit.
 * 3. finalizeRegistration() runs once the email is verified (auth callback, or immediately when
 *    email confirmation is off): it creates the candidate row — or LINKS the existing HR-created
 *    row with the same email — attaches the CV and skills, and records consent.
 */

const PENDING_FOLDER = "_Portal registrations (pending)";
const WINDOW_MS = 3 * 60 * 60 * 1000; // pending data may be stored within 3 h of sign-up

type PendingCv = { id: string; name: string; mime: string | null; size: number };
export type PendingRegistration = Omit<Registration, "consent"> & { consent_at: string; cv: PendingCv | null };

const splitName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return { first_name: parts[0], last_name: parts.length > 1 ? parts.slice(1).join(" ") : null };
};

const totalExperience = (y: number, m: number) => Math.round((y + m / 12) * 10) / 10;

/** Pre-sign-up check so people aren't left with an account they can't use */
export async function precheckRegistration(email: string, phone: string): Promise<string | null> {
  const admin = createAdminClient();
  const [{ data: byEmail }, { data: byPhone }, { data: profile }] = await Promise.all([
    admin.from("candidates").select("id, user_id").eq("email", email).limit(1).maybeSingle(),
    admin.from("candidates").select("id, email").eq("phone", phone).limit(1).maybeSingle(),
    admin.from("profiles").select("id").eq("email", email).limit(1).maybeSingle(),
  ]);
  if (profile || byEmail?.user_id) return "An account already exists for this email. Please sign in instead.";
  if (byPhone && (byPhone.email ?? "").toLowerCase() !== email) {
    return "This mobile number is already registered with Synerax. Sign up with the email you used before, or contact us.";
  }
  return null;
}

/** Validates the freshly created auth user and stores the pending registration (+ CV) */
export async function storePending(userId: string, data: Registration, cv: File): Promise<User> {
  const admin = createAdminClient();
  const { data: res, error } = await admin.auth.admin.getUserById(userId);
  const user = res?.user;
  if (error || !user) throw new Error("Account not found. Please try again.");
  if ((user.email ?? "").toLowerCase() !== data.email) throw new Error("Account mismatch. Please try again.");
  if (user.app_metadata?.registration_finalized_at) throw new Error("This account is already registered. Please sign in.");
  if (Date.now() - new Date(user.created_at).getTime() > WINDOW_MS) throw new Error("This sign-up has expired. Please sign in.");

  const previous = (user.app_metadata?.pending_registration as PendingRegistration | undefined)?.cv;
  const folder = await findOrCreateFolder(PENDING_FOLDER, rootFolderId());
  const uploaded = await uploadFile({
    name: `${data.email} - CV - ${cv.name}`,
    mimeType: cv.type,
    data: Buffer.from(await cv.arrayBuffer()),
    parentId: folder,
  });
  if (previous?.id) trashFile(previous.id).catch(() => {});

  const { consent: _consent, ...rest } = data;
  void _consent;
  const pending: PendingRegistration = {
    ...rest,
    consent_at: new Date().toISOString(),
    cv: { id: uploaded.id!, name: cv.name, mime: cv.type || null, size: cv.size },
  };
  const { error: upErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...user.app_metadata, pending_registration: pending },
  });
  if (upErr) throw new Error(upErr.message);
  await admin.from("profiles").update({ full_name: data.full_name }).eq("id", userId);
  return user;
}

export type FinalizeResult = { status: "created" | "linked" | "already" | "unverified" | "none" | "conflict"; candidateId?: string };

/** Idempotent — safe to call on every sign-in / callback */
export async function finalizeRegistration(userId: string): Promise<FinalizeResult> {
  const admin = createAdminClient();
  const { data: res } = await admin.auth.admin.getUserById(userId);
  const user = res?.user;
  if (!user) return { status: "none" };

  const { data: linked } = await admin.from("candidates").select("id").eq("user_id", userId).maybeSingle();
  if (linked) return { status: "already", candidateId: linked.id };
  if (!user.email_confirmed_at) return { status: "unverified" };

  const p = user.app_metadata?.pending_registration as PendingRegistration | undefined;
  if (!p) return { status: "none" };

  const email = (user.email ?? "").toLowerCase();
  const { first_name, last_name } = splitName(p.full_name);
  const fields = {
    current_city: p.current_city,
    current_designation: p.current_designation,
    total_experience: totalExperience(p.exp_years, p.exp_months),
    current_ctc: p.current_ctc,
    expected_ctc: p.expected_ctc,
    notice_period_days: p.notice_period_days,
    serving_notice: p.serving_notice,
    last_working_day: p.serving_notice && p.last_working_day ? p.last_working_day : null,
  };

  // Same email already added by Synerax staff → link instead of creating a duplicate
  const { data: existing } = await admin.from("candidates").select("*").eq("email", email).limit(1).maybeSingle();
  let candidateId: string;
  let status: FinalizeResult["status"];

  if (existing) {
    if (existing.user_id && existing.user_id !== userId) return { status: "conflict" };
    const fill: Record<string, unknown> = { user_id: userId, consent_at: p.consent_at, updated_at: new Date().toISOString() };
    if (!existing.phone) fill.phone = p.phone;
    if (!existing.last_name && last_name) fill.last_name = last_name;
    for (const [k, v] of Object.entries(fields)) {
      const cur = existing[k as keyof typeof existing];
      if (cur === null || cur === "" || (k === "total_experience" && Number(cur) === 0)) fill[k] = v;
    }
    const { error } = await admin.from("candidates").update(fill).eq("id", existing.id);
    if (error) throw new Error(error.message);
    candidateId = existing.id;
    status = "linked";
  } else {
    const row = {
      first_name,
      last_name,
      email,
      phone: p.phone,
      ...fields,
      currently_employed: true,
      source: "Portal",
      status: "New",
      consent_at: p.consent_at,
      user_id: userId,
    };
    let ins = await admin.from("candidates").insert(row).select("id").single();
    if (ins.error && /candidates_phone_uq/.test(ins.error.message)) {
      // mobile taken by another record since the pre-check — keep the account, drop the phone
      ins = await admin.from("candidates").insert({ ...row, phone: null }).select("id").single();
    }
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "Could not create your profile");
    candidateId = ins.data.id;
    status = "created";
  }

  // Skills (names → master list ids, created if new)
  const ids: string[] = [];
  for (const name of p.skills) {
    const { data: sid } = await admin.rpc("skill_id_for", { p_name: name });
    if (sid && !ids.includes(sid as string)) ids.push(sid as string);
  }
  if (ids.length) {
    await admin
      .from("candidate_skills")
      .upsert(ids.map((skill_id, i) => ({ candidate_id: candidateId, skill_id, is_primary: i < 3 })), { onConflict: "candidate_id,skill_id", ignoreDuplicates: true });
  }

  // CV → the candidate's Drive folder
  if (p.cv?.id) {
    try {
      const { data: cand } = await admin.from("candidates").select("candidate_code, first_name, last_name, drive_folder_id").eq("id", candidateId).single();
      let folderId = cand?.drive_folder_id as string | null;
      if (!folderId || !(await folderExists(folderId))) {
        folderId = await createFolder(`${cand?.candidate_code} - ${[cand?.first_name, cand?.last_name].filter(Boolean).join(" ")}`, rootFolderId());
        await admin.from("candidates").update({ drive_folder_id: folderId }).eq("id", candidateId);
      }
      await moveFile(p.cv.id, folderId);
    } catch (e) {
      console.error("Could not move registration CV", e);
    }
    await admin.from("candidate_documents").insert({
      candidate_id: candidateId,
      doc_type: "Resume",
      file_name: p.cv.name,
      mime_type: p.cv.mime,
      size_bytes: p.cv.size,
      drive_file_id: p.cv.id,
      uploaded_by: userId,
    });
  }

  await admin.rpc("refresh_candidate_search", { p_id: candidateId });
  await admin.from("profiles").update({ full_name: p.full_name }).eq("id", userId);
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...user.app_metadata, pending_registration: null, registration_finalized_at: new Date().toISOString() },
  });
  after(() => onCandidateRegistered(candidateId));
  return { status, candidateId };
}
