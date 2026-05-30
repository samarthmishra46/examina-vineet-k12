# Examina

AI-powered CAT exam tutor. A student picks a chapter section; an AI tutor explains it on a live whiteboard with synchronized voiceover.

## Local setup

Requires Node 20+ and npm.

```bash
npm install
cp .env.example .env.local
# fill in the values in .env.local — see "Environment" below
npm run dev
```

Open <http://localhost:3000>.

## Environment

`.env.local` (not committed) needs these values:

| Var                  | Where to get it                                                  |
| -------------------- | ---------------------------------------------------------------- |
| `AUTH_SECRET`        | Generate with `openssl rand -base64 32`                          |
| `AUTH_GOOGLE_ID`     | Google Cloud Console → APIs & Services → Credentials → OAuth ID  |
| `AUTH_GOOGLE_SECRET` | Same OAuth credential as above                                   |
| `MONGODB_URI`        | MongoDB Atlas → Connect → Drivers → Node.js connection string    |

### Google OAuth setup

1. Google Cloud Console → create project (or use an existing one)
2. APIs & Services → OAuth consent screen → External → fill required fields
3. APIs & Services → Credentials → Create credentials → OAuth client ID → Web application
4. Add Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy the Client ID and Client Secret into `.env.local`

### MongoDB Atlas setup

1. Create a free M0 cluster
2. Database Access → add a database user with read/write
3. Network Access → add `0.0.0.0/0` (dev only; tighten in production)
4. Connect → Drivers → copy the connection string, replace `<password>` with the real password
5. Append a database name (e.g. `/examina`) before the `?` in the URI

## Scripts

| Script              | What it does              |
| ------------------- | ------------------------- |
| `npm run dev`       | Start the dev server      |
| `npm run build`     | Production build          |
| `npm run start`     | Run the production build  |
| `npm run typecheck` | TypeScript check (strict) |
| `npm run lint`      | ESLint                    |
| `npm run format`    | Prettier write            |
| `npm run db:smoke`  | Round-trip test the Mongoose schemas against Atlas |

## Stack

- Next.js 14 (App Router), TypeScript strict
- Tailwind CSS with custom design tokens (`lib/design/tokens.ts`)
- Auth.js v5 (`next-auth@beta`) with Google + `@auth/mongodb-adapter`
- MongoDB native driver for the auth adapter; Mongoose added in Step 3 for domain models
- Claude Sonnet 4.5 for lesson + roadmap generation (Step 4+)
- OpenAI `tts-1` for voice (Step 7)
- Excalidraw for the whiteboard (Step 6)
- Vercel Blob for PDF storage (Step 4)

## Data model

| Collection         | Owner                       | Purpose                                                              |
| ------------------ | --------------------------- | -------------------------------------------------------------------- |
| `users`            | `@auth/mongodb-adapter`     | Identity + `role` (`student` / `admin`)                              |
| `accounts`         | adapter                     | OAuth account links                                                  |
| `sessions`         | adapter                     | Server-side sessions                                                 |
| `verificationTokens` | adapter                   | Magic-link tokens (unused in v1, kept for the adapter)               |
| `chapters`         | Mongoose                    | Title, source content (PDF text or pasted), status, createdBy        |
| `sections`         | Mongoose                    | Roadmap entries; references chapter via `chapterId`                  |
| `progress`         | Mongoose                    | Per-user, per-section status with a unique compound index            |
| `lessonsessions`   | Mongoose                    | (optional) Session log with doubts; populated from Step 7+           |

Sections live as a separate collection — not embedded inside chapters — because our hot path is `/api/teach?sectionId=X`, which becomes a clean `Section.findById(id)` instead of an awkward `Chapter.findOne({"sections._id": id})`.

User `_id`s are referenced from `chapters.createdBy` and `progress.userId` but **not** modeled in Mongoose, so we don't have two competing schemas on the same collection. Look up users via the native MongoClient when needed.

## Auth design notes

- Session strategy is `database` (sessions live in Mongo, logout works server-side).
- Because of that, **route gating happens in server-component layouts** (`requireAuth()` / `requireAdmin()`), not in Edge middleware — middleware can't reach the DB.
- The Mongo adapter owns the `users`, `accounts`, `sessions`, `verificationTokens` collections. Domain models (chapters, sections, progress) will use Mongoose on separate collections and reference user `_id` strings.
- New users get `role: 'student'` automatically (see `events.createUser` in `lib/auth/config.ts`).

## Student flow (Step 5)

1. Sign in. Students land on `/dashboard`.
2. The dashboard lists published chapters with per-chapter completion (`X of Y sections done` + thin progress bar) and a status pill (Not started / In progress / Completed).
3. Click a chapter → `/chapter/[id]` shows the section roadmap with per-section status pills.
4. Click a section → `/learn/[sectionId]` (placeholder until Step 6 ships the whiteboard + voice).

Unpublished chapters don't appear on the dashboard, and direct URL access to an unpublished `/chapter/[id]` or its section's `/learn/[sectionId]` redirects to `/dashboard`. Progress is preserved across un/re-publish cycles.

## Admin flow (Step 4)

1. Sign in with Google, then flip your user to `admin` (see below).
2. Visit `/admin/chapters` → click **New chapter**.
3. Provide a title and short description.
4. Choose source:
   - **Paste text** — at least 500 characters of chapter content.
   - **Upload PDF** — text-based PDF, up to 10 MB. Scanned PDFs without OCR won't extract.
5. Click **Generate roadmap**. The action calls Claude (Sonnet 4.6) with forced tool use to return a 5–10 section roadmap, validates it with Zod, and persists chapter + sections. Takes up to ~30 seconds.
6. On the editor page, edit chapter meta and section fields inline. Drag the dotted handle to reorder. Add or delete sections. Click **Publish** when ready — students see only published chapters.

PDF originals are stored in Vercel Blob; the extracted text lives in `chapter.sourceContent`. Deleting a chapter also removes its Blob asset and sections.

### Flipping a user to admin (manual, dev only)

```bash
mongosh "$MONGODB_URI" --eval 'db.users.updateOne({email:"you@gmail.com"},{$set:{role:"admin"}})'
```

Then log out and back in so the session picks up the new role.

## Project status

v1 in progress. Currently on **Step 5 — Student dashboard + roadmap**.

Build order:

1. ✓ Foundation — Next.js, design system, marketing page
2. ✓ Auth — Google sign-in, role on user, gated route groups
3. ✓ Database — Mongoose schemas, smoke-tested
4. ✓ Admin chapter upload + roadmap generation
5. ✓ Student dashboard + per-chapter roadmap view
5. Student dashboard + roadmap view
6. Lesson generation (whiteboard, no audio)
7. TTS integration with command scheduler
8. Doubts UI and API
9. Progress tracking
10. Polish
# examina-vineet-k12
