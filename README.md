# Snippet Stub

Phase one build per [snippet-stub-spec.md](./snippet-stub-spec.md): an internal, developer-to-developer
tool for handing off a code snippet, a note, and screenshots via a short share code. No client access
model or admin view yet — that's phase two.

Stack: Next.js (App Router) + Drizzle ORM + Neon Postgres + Vercel Blob, per the spec's architecture
section.

## Prerequisites

- Node 20+
- A Neon account and a Vercel account for real storage — see below. Neither is required just to run
  the app locally (see "Running locally without any setup").

## Running locally without any setup

```bash
npm install
npm run dev
```

With no `DATABASE_URL` set, the app transparently falls back to an embedded Postgres
([PGlite](https://github.com/electric-sql/pglite)) persisted under `./.data/pglite`, migrated
automatically on first request. Screenshots fall back the same way, to `./public/uploads` (see
"Setting up Vercel Blob" below). This is only for local development — set `DATABASE_URL` (below) to use
a real, shared, persistent database, which is required before deploying.

## Setting up Neon

The app needs a `DATABASE_URL` pointing at a Postgres database. Here's how to get one from Neon:

1. Go to your Neon dashboard at [console.neon.tech](https://console.neon.tech) and click **New Project**.
2. Give it a name (e.g. `snippet-stub`) and pick a region close to you. Leave the Postgres version at
   its default.
3. Once the project is created, Neon drops you on the project page with a **Connection string** panel.
   Select the **Pooled connection** option (this matters — Vercel's serverless functions open lots of
   short-lived connections, and the pooled string handles that; the direct one will exhaust Postgres's
   connection limit under load).
4. Copy that connection string. It looks like
   `postgres://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.
5. In this project, copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

6. Paste the connection string in as `DATABASE_URL`.
7. Apply the schema:

   ```bash
   npm run db:migrate
   ```

   This creates the `snippets` and `snippet_images` tables. You only need to re-run it when the schema
   changes (after pulling changes that touch `lib/db/schema.ts` and `drizzle/`).

That's it — `npm run dev` will now read and write against your Neon database.

Later, when you're ready for a staging/production split, repeat the same steps to create a second Neon
project (or a branch of this one — Neon branches are cheap and are the more idiomatic way to get a
staging database) and point Vercel's environment variables at that instead.

## Setting up Vercel Blob (optional for local dev)

Screenshots need somewhere to live outside the database. Without any configuration, the app falls back
to writing uploaded images straight to `./public/uploads` so you can develop and test the Share flow
without setting anything up. That fallback only works for `next dev`/`next start` on a machine with a
writable filesystem — it will not work once deployed to Vercel, whose serverless functions have a
read-only filesystem, so a real Blob store is required before shipping.

To use real Blob storage:

1. In the Vercel dashboard, open the project (or create one by importing this repo) and go to
   **Storage** -> **Create Database** -> **Blob**.
2. Once created, open the store's **Quickstart**/`.env.local` tab and copy the
   `BLOB_READ_WRITE_TOKEN` value.
3. Add it to `.env.local`.

With that token set, uploads go to Vercel Blob instead of the local filesystem, and images retrieved
through the Retrieve tab load straight from Blob's public URL.

Either way, once `npm run dev` is running, open [http://localhost:3000](http://localhost:3000), share a
snippet, copy the six-character code, and paste it into the Retrieve tab to confirm the round trip.

## Testing

```bash
npm test
```

Runs against [PGlite](https://github.com/electric-sql/pglite), an embedded, WASM-compiled Postgres —
this gives real Postgres semantics (constraints, SQL, migrations) in every test run without Docker or a
network connection. Nothing here touches your real Neon database.

- `test/share-code.test.ts`, `test/secret-scan.test.ts` — unit tests for the share-code generator and
  the pre-save secret-pattern scanner.
- `test/snippets-repo.test.ts` — integration tests for the data layer: create/retrieve round trip,
  access-count increments, expiration, and revocation (correct and incorrect owner token).
- `test/api-snippets.test.ts` — integration tests for the API route handlers, including the full
  create -> retrieve -> revoke cycle and the "expired and never-existed look identical" requirement
  from the spec.

Not yet covered: a true browser end-to-end test (the spec's §12 "share, copy, retrieve, confirm
round trip" as an actual browser session) and highlighter coverage for all ten supported languages —
worth adding with Playwright once the phase-one flow has settled.

## Project structure

```text
app/
  page.tsx                     Share/Retrieve tabs
  api/snippets/route.ts        POST create
  api/snippets/[shareCode]/    GET retrieve, DELETE revoke
components/
  ShareForm.tsx, RetrieveForm.tsx, CodeEditor.tsx, CodeView.tsx, TicketStub.tsx
lib/
  db/schema.ts                 Drizzle schema (snippets, snippet_images)
  db/snippets-repo.ts          Data access: create, retrieve, revoke, share-code generation
  db/client.ts                 Neon connection, or embedded PGlite dev fallback
  storage.ts                   Vercel Blob / local-dev-fallback image storage
  highlight.ts                 Shiki wrapper (shared by editor + viewer)
  secret-scan.ts               Pre-save credential/secret pattern check
  languages.ts                 Supported languages list
drizzle/                       Generated SQL migrations (commit these)
test/                          Vitest unit + integration tests
```

## What's deliberately not here yet

Per the spec's rollout plan, this is phase one only:

- No client-facing shared-secret access model.
- No admin view or internal-IdP login.
- No rate limiting or per-team storage caps (spec §11) — fine for a small internal team, worth adding
  before this is exposed more broadly.
