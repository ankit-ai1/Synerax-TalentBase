# Synerax TalentBase — Staffing Profiles Database

An app to store complete candidate profiles (personal, contact, CTC, notice, LWD, skills, experience, education, documents…) and search them by **skills / role / experience / CTC / notice**.

**Stack (all free):** Next.js 15 · Supabase (Postgres + Login) · Google Drive (files) · Vercel (hosting)

Candidates, clients, job openings, a Kanban hiring pipeline, interviews, follow-ups, shortlists and reports — everything a staffing team does, in one app.

---

## Features

### Candidates
- **80+ field profile:** personal, contact, address, current job, CTC (fixed/variable), expected CTC, notice period, serving notice, last working day, joining date, offers, work history, education, certifications, projects, preferences, PAN/UAN/passport, BGV, references, tags, rating
- **Smart search:** text search by name/skill/company/phone/email/city + 20 filters (skills any/all + min years, roles, experience, location, CTC range, notice, join-by date, status, source, added by…). Skill aliases match too (golang → Go, reactjs → React)
- **Card and table views**, saved searches (personal or shared with the team), quick presets (Immediate joiners, Serving notice…)
- **Bulk actions:** select multiple candidates to add them to a job pipeline, shortlist, change status, tag, WhatsApp/email, export, archive
- **Profile page:** availability timeline, profile completeness, jobs/interviews/follow-ups/documents/notes/history tabs, one-click Call / WhatsApp / Interview / Follow-up
- **Client-ready profile:** print / PDF with the option to hide name, contact and CTC
- **Excel / CSV bulk import:** columns are detected automatically, CTC rupees→lakhs, "2 months"→60 days, duplicates skipped

### Clients & jobs
- Clients: contacts, fee terms (% or fixed), payment terms, replacement period, agreement dates, est. revenue
- Jobs: requirement (must-have/nice-to-have skills + min years, experience, budget, notice, location), priority, target date, recruiters
- **Kanban pipeline:** Sourced → Screening → Submitted → Interview → Offered → Joined (+ Rejected/Dropped). Drag and drop to change stage; details are requested on Offer/Join/Reject
- **Auto matching:** the best candidates in the database for each job, with a score (skills 50%, experience 20%, budget/notice/location 10% each)
- When a candidate joins, their status becomes "Placed", and once all openings are filled the job becomes "Filled" — automatically

### Interviews & follow-ups
- Interview scheduling (round, mode, link, interviewers) + WhatsApp confirmation
- Week view, upcoming / feedback pending / past, result + rating + feedback
- Tasks: overdue / today / upcoming, quick add, linked to a candidate/job, shown in notifications

### Reports
- Hiring funnel with conversion %, 12-month trends, source performance, interview results, rejection reasons, team performance, top clients, estimated revenue

### Premium UI
- Dark + light mode (follows the system automatically), collapsible sidebar, **Ctrl+K / "/" command palette**, notifications, quick "New" menu, mobile friendly

### Admin vs HR

| | Admin | HR |
|---|---|---|
| Add / edit / search candidates, jobs, clients | ✅ | ✅ |
| Pipeline, interviews, tasks, shortlists, import, templates | ✅ | ✅ |
| Archive | ✅ | ✅ |
| **Permanently delete** a candidate / job / client / document | ✅ | ❌ |
| Manage team, edit skills/roles, activity log, CSV export | ✅ | ❌ |

---

## Setup (one time, ~30 minutes)

### Step 1 — Supabase (database + login)

1. Create a free account at https://supabase.com → **New project**.
   - Choose **Region: Mumbai (ap-south-1)** (keeps data in India and the app fast).
   - Note the database password somewhere safe.
2. Left menu → **SQL Editor** → New query → paste the entire contents of `supabase/schema.sql` → **Run**.
   (Re-running it is safe — nothing is deleted. **If you're already running an older version, just run this file again** — new tables/features are added and existing data stays safe.)
3. **Authentication → Sign In / Providers → Email**:
   - Turn **"Allow new users to sign up" OFF** (only admins create users).
   - You can turn "Confirm email" OFF too.
4. **Create the first admin:** Authentication → Users → **Add user → Create new user** → your email + password, tick "Auto confirm".
   Then run this in the SQL Editor (with your email):
   ```sql
   update profiles set role = 'admin', full_name = 'Ankit Kumar' where email = 'you@email.com';
   ```
   All other HR/Admin users are created inside the app from the **Team & access** page.
5. Copy these 3 values from **Project Settings → API Keys**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (**this is secret — never share it**)

### Step 2 — Google Drive (for files)

Do the following with the Google account whose Drive you want to use (a dedicated company Gmail works best, e.g. `hr.files.company@gmail.com`):

1. Create a folder in Drive: **Staffing Profiles**. Open the folder — the last part of the URL is the folder ID:
   `https://drive.google.com/drive/folders/`**`1AbCdEf...`** → `GOOGLE_DRIVE_ROOT_FOLDER_ID`
2. Go to https://console.cloud.google.com → create a new project (name: Synerax TalentBase).
3. **APIs & Services → Library** → "Google Drive API" → **Enable**.
4. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type: **External**, app name: Synerax TalentBase, enter your email.
   - **Audience / Publishing status → click "Publish app" (In production).**
     ⚠️ If you leave it in "Testing", the refresh token **expires in 7 days** and uploads stop working.
     No verification is needed — only you sign in, once.
5. **Credentials → Create credentials → OAuth client ID** → Application type: **Desktop app** → Create.
   Copy the Client ID and Client secret → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
6. On your computer, in the project folder (requires Node.js 20+):
   ```bash
   npm install
   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy npm run google-token
   ```
   (Windows PowerShell: `$env:GOOGLE_CLIENT_ID="xxx"; $env:GOOGLE_CLIENT_SECRET="yyy"; npm run google-token`)
   A link appears in the terminal → open it → sign in with the Drive account → Allow.
   (If you see "Google hasn't verified this app", click **Advanced → Go to Synerax TalentBase** — it's your own app.)
   The terminal prints `GOOGLE_REFRESH_TOKEN=...` → copy it.

> **Using Google Workspace?** Instead of a refresh token you can use a Service Account + Shared Drive:
> put the service account's JSON key on one line in `GOOGLE_SERVICE_ACCOUNT_JSON`, make the service account a "Content manager" of the Shared Drive, and use the Shared Drive folder's ID as the root folder ID.

### Step 3 — Run it locally

```bash
cp .env.example .env.local     # then fill in all the values in .env.local
npm install
npm run dev
```
Open http://localhost:3000 → sign in with the admin email/password from Step 1.

### Step 4 — Deploy to Vercel

1. Push the code to a **private** GitHub repo.
2. Go to https://vercel.com → sign in with GitHub → **Add New → Project** → import the repo.
3. Under **Environment Variables**, add every variable from `.env.example` (with the values from `.env.local`).
4. **Deploy**. Share the resulting link (e.g. `talentbase.vercel.app`) with your team.
5. If you have a company domain, you can add a subdomain like `talent.company.com` under Vercel → Settings → Domains (free).

> Note: Vercel's free **Hobby** plan is officially for non-commercial use. Small internal teams do use it, but if you want to stay strictly compliant, **Netlify**'s free plan (commercial use allowed) runs the same code — no changes needed.

### Step 5 — Free daily backup (important)

The Supabase free plan has no automatic backups, and a project is paused after 7 days without activity. `.github/workflows/backup.yml` solves both problems:

1. Supabase → **Connect** (top bar) → copy the **Session pooler** connection string (with your password filled in).
2. GitHub repo → **Settings → Secrets and variables → Actions → New secret**: name `SUPABASE_DB_URL`, value = that string.
3. A backup now runs every night at 2 AM (download it from the repo → Actions tab for up to 90 days).

To restore: `pg_restore --no-owner -d "<DB_URL>" backup.dump`

### Updating an existing database to English text

Re-running `supabase/schema.sql` safely updates every function (including the English error messages). The seeded message templates are only inserted into an empty table, so also run `supabase/migrate-to-english.sql` once to update the 4 existing default templates. Templates you've already customised are left untouched.

---

## Client & candidate portals

| Who | Signs in at | Lands on | How they get a login |
| --- | --- | --- | --- |
| Admin / HR | `/login` | `/dashboard` | Admin → Team & access |
| Client | `/login` | `/client` | Staff create it: Clients → a client → **Portal access** (the login email is sent automatically) |
| Candidate | `/login` | `/portal` | Self sign-up at `/register` (email verification required) |

Existing databases: run `supabase/migrations/003_portals.sql` in the SQL Editor (safe to re-run any time).

### Supabase settings (one time)

1. **Authentication → Hooks → Customize Access Token (JWT) Claims** → enable → `public.custom_access_token_hook`.
2. **Authentication → Sign In / Providers → Email**: *Allow new users to sign up* **on**, *Confirm email* **on**.
3. **Authentication → URL Configuration**: Site URL = your live URL (e.g. `https://synerax-talent-base.vercel.app`); Redirect URLs = `https://<your-domain>/**` and `http://localhost:3000/**`.
4. **Authentication → Emails → SMTP Settings** (recommended): enable custom SMTP with the **same** SMTP details as below. Supabase's built-in mailer only sends a few emails per hour — not enough for sign-up verification and password resets.

### Automated emails

All emails go out over plain SMTP (Gmail with an app password, Zoho, Brevo, Resend SMTP…). Set these in Vercel → Settings → Environment Variables, then redeploy:

| Variable | Example | Notes |
| --- | --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `587` | `465` for SSL |
| `SMTP_USER` | `hr@yourdomain.com` | |
| `SMTP_PASS` | app password | Gmail: Google Account → Security → App passwords |
| `MAIL_FROM` | `hr@yourdomain.com` | Must be allowed by the SMTP account |
| `SYNERAX_NOTIFY_EMAILS` | `hr@yourdomain.com,ops@yourdomain.com` | Team inboxes (can also be set in the app) |
| `NEXT_PUBLIC_SITE_URL` | `https://synerax-talent-base.vercel.app` | Used for links inside emails |
| `CRON_SECRET` | long random string | Protects the daily job |

Then open **Admin → Email settings** to send a test email, change the sender name and team inboxes, switch individual emails on/off, and see the full email log (sent / failed / skipped).

- Emails never block the action that triggered them; failures are logged, not shown to users.
- Each event is sent once (deduplicated), and every email also creates an in-app notification (bell icon).
- Candidate emails go only to candidates who registered on the portal — never to profiles your team imported.
- Interview emails carry a calendar invite (`.ics`).

**Daily job** (`vercel.json` → `/api/cron/daily`, 09:00 IST): team digest of new registrations, incomplete-profile reminders (after 3 days, max 2), client reminders for profiles pending over 48 h, and job alerts for opted-in candidates (max once a day). Vercel calls it automatically once `CRON_SECRET` is set. To trigger it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/daily
```

### Demo data & security tests

```bash
npm run seed:portals          # 1 demo client + login, 3 demo candidates, 2 published jobs (password: Demo@Portal2026)
npm run test:roles            # signs in as anon / candidate / client with the PUBLIC key and checks nothing leaks
npm run seed:portals:cleanup  # removes all demo data again
```

Demo logins use `@example.com` addresses, so no real emails are sent. Their CVs are placeholders (opening one shows "File unavailable"). `test:roles` checks that portal users can't read staff tables, call staff functions, see contact details of shared candidates, see other clients' jobs, or promote themselves to admin. Run it after every database change.

---

## Website: brand colours & partner logos

**Colours.** Every brand colour lives in `src/app/globals.css` as CSS variables (the PALETTE block at the top). The website, staff app and both portals all read the same tokens, so changing the palette there restyles everything. The palette is "Graphite & Ember" (graphite neutrals, ember accent). Tailwind colour families that would bring in purple, blue, teal or gold (violet, indigo, sky, amber …) are remapped to graphite, copper and tangerine in `tailwind.config.ts`, so status colours stay on-brand. Emails and the social preview image can't read CSS variables, so they use the same colours as hex in `src/lib/email/layout.ts` and `src/app/opengraph-image.tsx`.

**Partner logos.** The "Trusted by" section on the home page reads `src/data/partners.ts`. To show a logo, put the file in `/public/partners/` named after the partner (lowercase, spaces → dashes), e.g. `absyz.svg` or `tek-star-global.png` — it is picked up on the next build. You can also set `logo: "/partners/file.svg"` on a partner. Partners without a logo get a text wordmark with a small monogram. `industry`, `since` and `url` are optional; the hover tooltip only appears when one is filled in.

---

## Free limits (when you'll need to pay)

| Service | Free tier | When to upgrade |
|---|---|---|
| Supabase | 500 MB database (~50,000+ full profiles) | A very large number of profiles |
| Google Drive | 15 GB (Gmail) | Resumes beyond 15 GB (~50,000 resumes) |
| Vercel | Generous bandwidth | Very heavy traffic |

The file upload limit is **4 MB per file** (because of Vercel's request limit) — plenty for resumes.

---

## Project structure

```
supabase/schema.sql          ← entire database: tables, search function, security rules, seed skills/roles
supabase/migrate-to-english.sql ← one-time update of the default message templates to English
src/app/(app)/               ← pages: dashboard, candidates, jobs, clients, interviews, tasks, shortlists, reports, import, templates, admin
src/app/api/                 ← Drive upload/download, user management, CSV export
src/components/candidate/    ← candidate form, profile parts
src/components/search/       ← candidate search, filters, bulk actions
src/components/jobs/         ← job form, Kanban pipeline, matching
src/components/shell/        ← sidebar, topbar, Ctrl+K palette
src/components/dialogs/      ← interview, task, shortlist, message, stage dialogs
src/lib/drive.ts             ← Google Drive helper
scripts/get-google-refresh-token.mjs
.github/workflows/backup.yml ← daily DB backup
```

## Common problems

| Problem | Solution |
|---|---|
| Sent back to the login page after signing in | Check `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`; is the user "confirmed" in Supabase? |
| "You don't have permission to do this" | Is `is_active = true` for that user in the `profiles` table? |
| "invalid_grant" on upload | The refresh token expired — is the OAuth app "In production"? Run `npm run google-token` again, put the new token in Vercel, then redeploy |
| "File not found" (folder) on upload | Is `GOOGLE_DRIVE_ROOT_FOLDER_ID` correct, and does the folder belong to the same account? |
| Errors after a new column/feature | Run `schema.sql` again |
#   S y n e r a x - T a l e n t B a s e  
 