# Restoring the Synerax TalentBase database

Backups are made every night at 02:00 IST by `.github/workflows/backup.yml`. Each one is a GPG-encrypted archive called `talentdb-YYYYMMDD-HHMM.tar.gpg`, and it contains two files:

- `db.dump`: a `pg_dump` in custom format of the schemas `public` (all app data), `auth` (logins, password hashes, identities) and `storage` (storage metadata).
- `manifest.json`: the row counts, latest timestamps and function list, captured just before the dump.

Copies are kept for **30 days** in two places:

1. **GitHub**: repo → Actions → *Daily DB backup* → a run → Artifacts → `talentdb-backup-…`.
2. **Google Drive**: the folder *Synerax DB Backups* (`BACKUP_DRIVE_FOLDER_ID`).

CVs and documents are **not** in the database. They live in Google Drive (`GOOGLE_DRIVE_ROOT_FOLDER_ID`), so a database restore never touches them. The `drive_file_id` columns point at the same files again after a restore.

Every Sunday, `.github/workflows/restore-test.yml` restores the latest backup into a temporary Postgres and checks it. The results appear on **/admin/backups**.

---

## Who does what

| Step | Who | Time |
|---|---|---|
| Decide to restore, pick the backup (usually the latest) | Admin (Ankit) | 5 min |
| Download + decrypt | Admin, or whoever holds `BACKUP_PASSPHRASE` | 5 min |
| Restore into Supabase | Admin / developer | 10–20 min (≈1 min per 100 MB) |
| Re-point the app (new project only) | Developer (Vercel env vars) | 10 min |
| Smoke test: login, candidates, jobs, pipeline, chat | Admin | 10 min |

**Total: about 30–45 minutes into the same project, or about 1 hour into a new one.**

Keep `BACKUP_PASSPHRASE` in a password manager in at least two people's hands. **Without it, the backups cannot be opened.**

---

## 1. Get the backup

**From GitHub:** Actions → *Daily DB backup* → the run you want → download the artifact. It downloads as a zip, so unzip it to get `talentdb-….tar.gpg`.

**From Google Drive:** open *Synerax DB Backups* and download the file. Or download the newest one from a terminal:

```bash
GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=… GOOGLE_REFRESH_TOKEN=… BACKUP_DRIVE_FOLDER_ID=… \
  node scripts/backup/drive.mjs latest talentdb.tar.gpg
```

## 2. Decrypt

You need `gpg` and the Postgres 17 client tools (`pg_restore`, `psql`):

- **macOS:** `brew install gnupg libpq`
- **Ubuntu:** `apt install gnupg postgresql-client-17`
- **Windows:** use WSL or Git Bash with a Postgres 17 install.

```bash
gpg --batch --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" -d talentdb-….tar.gpg | tar -x
# → db.dump + manifest.json
pg_restore --list db.dump | head   # sanity check
```

## 3a. Restore into a NEW Supabase project (the old one is gone or unusable)

1. Create a project at supabase.com. Use the **same region (Mumbai)** if possible. Note the database password.
2. Project Settings → Database → Connection string → **URI, Session pooler (port 5432)**. Call this `$NEW_DB`.
3. Restore. Supabase already has the `auth` and `storage` schemas with its own internal tables, so restore the app schema first, then the data of those two schemas:

   ```bash
   # app schema + data (tables, functions, policies, triggers)
   pg_restore --no-owner --no-privileges --schema=public -d "$NEW_DB" db.dump

   # logins (users keep their passwords — the hashes are restored) + storage metadata, data only
   pg_restore --no-owner --no-privileges --data-only --schema=auth -d "$NEW_DB" db.dump
   pg_restore --no-owner --no-privileges --data-only --schema=storage -d "$NEW_DB" db.dump
   ```

   - **"already exists" errors** for extensions or Supabase-owned objects are normal.
   - **If the auth data step fails on one table** (for example a newer Supabase auth version renamed a column): restore `auth.users` and `auth.identities` first with `--table=users --table=identities`, then the rest.

4. Re-run the bits that live outside the dumped schemas:
   - `supabase/migrations/005b_chat_cron.sql` (pg_cron jobs). It is kept out of git; get it from the admin's machine.
   - Recreate the Storage buckets if you used any (Storage → New bucket), with the same names.
5. In the new project:
   - Authentication → URL configuration: set the site URL and redirect URLs as before.
   - Authentication → SMTP settings: as before.
6. Vercel → Project → Settings → Environment Variables: replace `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` with the new project's values, then redeploy.
7. GitHub → Settings → Secrets: update `SUPABASE_DB_URL` so the nightly backups continue.

## 3b. Restore into the SAME project (data was deleted or corrupted)

**Take a fresh backup of the current state first:** Actions → *Daily DB backup* → Run workflow. Then:

```bash
# Option 1 — restore a single table's data (e.g. candidates deleted by mistake)
psql "$DB" -c "truncate public.candidate_skills, public.candidates cascade"   # careful: cascades
pg_restore --no-owner --no-privileges --data-only --schema=public --table=candidates --table=candidate_skills -d "$DB" db.dump

# Option 2 — put the whole public schema back
psql "$DB" -c "drop schema public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role;"
pg_restore --no-owner --no-privileges --schema=public -d "$DB" db.dump
psql "$DB" -c "grant all on all tables in schema public to anon, authenticated, service_role; grant all on all sequences in schema public to anon, authenticated, service_role; grant execute on all functions in schema public to anon, authenticated, service_role;"
```

Row-level security policies come back with the schema, so access rules are unchanged. Logins (`auth`) are untouched in this case. Only restore `auth` data if users themselves were lost; use the `--data-only --schema=auth` step above after truncating `auth.users cascade`.

## 4. Check the result

```bash
node scripts/backup/verify.mjs manifest.json "$NEW_DB"   # same checks as the weekly restore test
```

Row counts should be within ±5% of the backup's manifest. Then log in as admin and open Candidates, a job's pipeline, Messages and the candidate portal.

## Practising

The weekly restore test already does steps 1, 2 and 4 against a temporary Postgres. To run it on demand: Actions → *Weekly restore test* → Run workflow. Its result shows up on /admin/backups.
