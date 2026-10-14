#!/usr/bin/env node
/**
 * Google Drive side of the nightly backup (no dependencies — plain fetch).
 *   node scripts/backup/drive.mjs upload <file>   → uploads into BACKUP_DRIVE_FOLDER_ID, prints the file id
 *   node scripts/backup/drive.mjs prune [days=30] → deletes talentdb-*.gpg files older than N days from that folder
 *   node scripts/backup/drive.mjs latest <out>    → downloads the newest backup (restore test fallback / manual restore)
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (same OAuth app as the CV storage), BACKUP_DRIVE_FOLDER_ID
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { basename } from "node:path";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, BACKUP_DRIVE_FOLDER_ID } = process.env;
const API = "https://www.googleapis.com/drive/v3";

async function token() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token" }),
  });
  if (!res.ok) throw new Error(`Google token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function list(t) {
  const q = encodeURIComponent(`'${BACKUP_DRIVE_FOLDER_ID}' in parents and name contains 'talentdb-' and trashed = false`);
  const res = await fetch(`${API}/files?q=${q}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`, { headers: { authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error(`Drive list: ${res.status} ${await res.text()}`);
  return (await res.json()).files ?? [];
}

async function upload(file) {
  const t = await token();
  const init = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true", {
    method: "POST",
    headers: { authorization: `Bearer ${t}`, "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "application/octet-stream", "x-upload-content-length": String(statSync(file).size) },
    body: JSON.stringify({ name: basename(file), parents: [BACKUP_DRIVE_FOLDER_ID] }),
  });
  if (!init.ok) throw new Error(`Drive upload init: ${init.status} ${await init.text()}`);
  const put = await fetch(init.headers.get("location"), { method: "PUT", headers: { "content-type": "application/octet-stream" }, body: readFileSync(file) });
  if (!put.ok) throw new Error(`Drive upload: ${put.status} ${await put.text()}`);
  console.log((await put.json()).id);
}

async function prune(days) {
  const t = await token();
  const cutoff = Date.now() - days * 86400000;
  let n = 0;
  for (const f of await list(t)) {
    if (new Date(f.createdTime).getTime() >= cutoff) continue;
    const res = await fetch(`${API}/files/${f.id}?supportsAllDrives=true`, { method: "DELETE", headers: { authorization: `Bearer ${t}` } });
    if (res.ok || res.status === 404) n++;
    else console.error(`could not delete ${f.name}: ${res.status}`);
  }
  console.log(`pruned ${n} backup(s) older than ${days} days`);
}

async function latest(out) {
  const t = await token();
  const [f] = await list(t);
  if (!f) throw new Error("No backups in the Drive folder");
  const res = await fetch(`${API}/files/${f.id}?alt=media&supportsAllDrives=true`, { headers: { authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error(`Drive download: ${res.status}`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(f.name);
}

const [cmd, arg] = process.argv.slice(2);
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !BACKUP_DRIVE_FOLDER_ID) {
  console.error("Drive backup skipped: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN / BACKUP_DRIVE_FOLDER_ID not set");
  process.exit(cmd === "latest" ? 1 : 3);
}
try {
  if (cmd === "upload") await upload(arg);
  else if (cmd === "prune") await prune(Number(arg) || 30);
  else if (cmd === "latest") await latest(arg);
  else throw new Error("usage: drive.mjs upload <file> | prune [days] | latest <out>");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
