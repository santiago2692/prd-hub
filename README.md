# PRD Hub

A shared place for the team to create, review and track PRDs. Every project gets a PRD built on Marty Cagan's
opportunity assessment and product spec structure, and is reviewed against two views side by side:
**Today** (current site map, journeys and screens) and the **2028 vision** (clickable prototype).

## What's in it

- **Projects board** with each project's computed status (Needs more info, Needs data, Needs validation, Ready for review),
  stage, progress and what's still missing. Updates live while the page is open.
- **PRD editor** with 16 checklist items: Cagan's ten opportunity questions, the solution spec, and the four big risks
  (value, usability, feasibility, viability). Each item has guidance, a status, a "still needed" note, its own files and comments.
- **Docs & files**: upload images, PDFs and Office docs (up to 25 MB), or link Google Docs, FigJam and dashboards.
  Each can be tagged Evidence, Today or 2028.
- **Today vs 2028** tab per project: today's screenshots, pages and journeys next to the embedded 2028 prototype,
  plus a "what changes" table. When nothing exists today, only the new version is shown.
- **Site map**: build the current and 2028 site maps as trees. 2028 pages are New, Improved or Unchanged and can point at
  the current page they replace; current pages can be marked Removed. Side-by-side and change-list views.
- **Journeys**: step-by-step journeys linked to site map pages, with a 2028 journey shown next to the one it replaces.
- **Comments** on projects, PRD sections, site map pages and journeys. Anyone signed in can comment.
- **Roles**: Admin, Editor (builders), Viewer (read + comment). Admins manage roles on the People page.

## Stack

Next.js 15 (App Router, server actions), PostgreSQL with Prisma, NextAuth with Google sign-in, Tailwind CSS.
Uploads are stored on local disk by default (`src/lib/storage.ts`); swap in Google Cloud Storage or S3 for production.

## Run locally

```bash
cp .env.example .env          # set DATABASE_URL; DEV_LOGIN="true" lets you sign in with any email locally
npm install
npx prisma db push            # create tables
npm run db:seed               # optional sample project
npm run dev                   # http://localhost:3000
```

## Google sign-in

1. Google Cloud console > APIs & Services > Credentials > Create OAuth client (Web application).
2. Authorized redirect URI: `https://<your-domain>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for local).
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAIL_DOMAIN` (your company domain) and `ADMIN_EMAILS`.

Everyone from the allowed domain can sign in as a viewer and comment. Admins promote builders to editor.

## Deploying

Any Node host with Postgres works (Vercel + Neon/Supabase, Cloud Run + Cloud SQL, Render). Before going to production:

- Replace the local-disk upload driver with object storage (serverless hosts don't keep local files).
- Set `NEXTAUTH_SECRET` to a random value and keep `DEV_LOGIN` off.
- Run `npx prisma db push` (or migrations) against the production database.
