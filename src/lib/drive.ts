import "server-only";
import { Readable } from "node:stream";
import { auth, drive as driveApi, type drive_v3 } from "@googleapis/drive";

/**
 * Google Drive client.
 * Option 1 (free Gmail): OAuth refresh token — GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN
 * Option 2 (Google Workspace Shared Drive): GOOGLE_SERVICE_ACCOUNT_JSON
 */
let cached: drive_v3.Drive | null = null;

export function getDrive(): drive_v3.Drive {
  if (cached) return cached;
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_SERVICE_ACCOUNT_JSON } = process.env;

  if (GOOGLE_REFRESH_TOKEN && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    const client = new auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    cached = driveApi({ version: "v3", auth: client });
    return cached;
  }
  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    const creds = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
    const client = new auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    cached = driveApi({ version: "v3", auth: client });
    return cached;
  }
  throw new Error("Google Drive is not configured. Add the GOOGLE_* variables to .env (see README).");
}

export function rootFolderId() {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID is not set");
  return id;
}

const ALL = { supportsAllDrives: true } as const;

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function createFolder(name: string, parentId: string) {
  const res = await getDrive().files.create({
    ...ALL,
    requestBody: { name: safeName(name), mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  return res.data.id!;
}

export async function folderExists(id: string) {
  try {
    const res = await getDrive().files.get({ ...ALL, fileId: id, fields: "id, trashed" });
    return !res.data.trashed;
  } catch {
    return false;
  }
}

export async function renameFile(id: string, name: string) {
  await getDrive().files.update({ ...ALL, fileId: id, requestBody: { name: safeName(name) } });
}

export async function uploadFile(opts: { name: string; mimeType: string; data: Buffer; parentId: string }) {
  const res = await getDrive().files.create({
    ...ALL,
    requestBody: { name: safeName(opts.name), parents: [opts.parentId] },
    media: { mimeType: opts.mimeType || "application/octet-stream", body: Readable.from(opts.data) },
    fields: "id, name, mimeType, size",
  });
  return res.data;
}

export async function downloadFile(id: string) {
  const res = await getDrive().files.get({ ...ALL, fileId: id, alt: "media" }, { responseType: "stream" });
  return res.data as unknown as Readable;
}

/** Move to trash (recoverable for 30 days) */
export async function trashFile(id: string) {
  await getDrive().files.update({ ...ALL, fileId: id, requestBody: { trashed: true } });
}
