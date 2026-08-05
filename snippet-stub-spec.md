# Snippet Stub

Product and engineering specification, written from the working prototype toward a real internal tool.

## 1. What this is

Snippet Stub is a small tool for handing a piece of code, a screenshot, and a note to someone else without opening a ticket, without creating an account, and without digging through a Slack thread later to find what was actually shared. Someone pastes a snippet, picks a language, adds context, attaches screenshots if needed, and gets back a short code. Whoever needs the snippet types that code into the Retrieve tab and gets the whole package back exactly as it was sent.

The current version lives as a Claude artifact using the platform's built in key value storage. This document describes what a development team would need to turn that prototype into a real, owned piece of Atomic Glue infrastructure, covering product behavior, data model, API, security model, and rollout plan.

## 2. Goals

- Cut the time between "I have a snippet to hand off" and the other person actually having it, notes and screenshots included.
- Give internal developers a lightweight, no login way to pass context to each other.
- Give a controlled, audited way to extend the same flow to clients when that's useful, without exposing more than intended.
- Replace the prototype's storage and access model with something Atomic Glue actually owns and can reason about.

## 3. Non-goals

- This is not a replacement for Linear, GitHub, or proper code review. It is a handoff tool, not a project management or version control system.
- This is not meant to store anything long term. A snippet that needs to live forever belongs in a repository or a doc, not here.
- This is not meant to become a general file sharing tool. Screenshots exist to give visual context to a snippet, not to become a document store.

## 4. What exists today

The working prototype is a single React component running as a Claude artifact, using the artifact platform's built in key value storage rather than a real database. It already covers the core loop well. Two tabs, Share and Retrieve. A code editor with a hand rolled syntax highlighter covering ten languages, built without an external library since artifacts only have access to a fixed set of packages. Client side image resizing before anything gets stored. A six character share code generated from a character set that avoids visually similar letters and numbers. A ticket stub visual for the generated code, which is worth carrying forward as a piece of the product's identity rather than treating as throwaway styling.

What it does not have, and what this document exists to specify, is anything around expiration, ownership, revocation, real authentication, or abuse prevention. That gap was already flagged in an earlier review and is folded into this document as concrete requirements rather than left as a list of concerns.

## 5. Primary user stories

A developer pastes a broken function into the Share tab, writes a line of context, attaches a screenshot of the error, and sends the six character code to a teammate over Slack.

A teammate on the receiving end opens Retrieve, types the code, and sees the exact snippet, the note, and the screenshot, with the code colored and readable rather than a wall of plain text.

A project manager wants to send a client a snippet of a config change for the client to review, without giving the client any other access to internal systems.

Someone realizes a code went to the wrong person and needs to kill it immediately rather than waiting for it to expire on its own.

An admin at Atomic Glue wants to see what has been shared in the last week for accountability, without being able to read the raw contents of every snippet by default.

## 6. Functional requirements

### 6.1 Share flow

- Language selection happens first, since it drives syntax highlighting for everything typed afterward.
- A code editor field with live syntax highlighting for JavaScript, TypeScript, Python, SQL, Go, Rust, HTML/CSS, Bash, JSON, and a plain fallback for anything else.
- A free text notes field for context, with a reasonable length limit, 4000 characters is a sensible starting point.
- Up to four screenshot attachments, resized client side before upload, capped in dimension and file size.
- A generated six character code, using a character set that excludes visually similar characters such as 0, O, 1, I, and L, displayed as a ticket style stub the user can copy.
- Clear inline errors for empty submissions, oversized payloads, and failed image reads.

### 6.2 Retrieve flow

- A single input for the share code, accepting pasted codes with or without the formatting dash, case insensitive.
- A "nothing found" state that does not distinguish between an expired code and one that never existed, to avoid leaking which codes are or were valid.
- The retrieved snippet rendered with the same syntax highlighting as the share flow, plus notes and screenshots if present.

### 6.3 Lifecycle and management, not present in the current prototype

- Every snippet needs an expiration. A default of seven days with an option to choose one day, seven days, or thirty days at creation time covers most real use.
- The creator needs a way to revoke a snippet early. The simplest version is a private management token issued at creation time, separate from the six character share code, held only by the creator.
- An internal admin view, gated by real login, that lists snippets by creation date, language, and expiration status, without exposing full snippet contents unless someone explicitly opens one.

## 7. Data model

A single primary table is enough for version one.

```
snippets
  id                uuid, primary key
  share_code        text, unique, indexed
  owner_token       text, indexed, not shown to the recipient
  language          text
  code              text
  notes             text, nullable
  created_by        text, nullable, populated when the creator is logged in
  created_at        timestamptz, default now
  expires_at        timestamptz, not null
  access_count      integer, default 0
  last_accessed_at  timestamptz, nullable
  deleted_at        timestamptz, nullable, soft delete
```

```
snippet_images
  id            uuid, primary key
  snippet_id    uuid, references snippets(id) on delete cascade
  storage_key   text, pointer to blob storage, not a base64 blob in the row
  width         integer
  height        integer
  created_at    timestamptz, default now
```

Two changes from the prototype are worth calling out directly. Images move out of the database entirely and into blob storage, referenced by key, since storing base64 images in a database row does not scale and runs straight into the size ceiling the prototype already has to work around. And every snippet gets an expiration and an owner token from the start, rather than living forever with nothing attached to it.

## 8. API design

A small set of endpoints covers the whole flow.

```
POST   /api/snippets              create a snippet, returns share_code and owner_token
GET    /api/snippets/{shareCode}  fetch a snippet by its public code, increments access_count
DELETE /api/snippets/{shareCode}  revoke a snippet early, requires owner_token
GET    /api/admin/snippets        list snippets for internal review, requires an authenticated session
```

Retrieval should never reveal whether a code was valid but expired versus never issued at all. Both cases return the same generic not found response, so the system can't be used to fingerprint which codes have ever existed.

## 9. Architecture and stack

Given the tools already in use at Atomic Glue, the natural fit is a small Next.js app hosted on Vercel, with Neon as the Postgres database, and a blob storage provider such as Vercel Blob or an S3 compatible bucket for screenshots. This keeps the whole thing inside infrastructure the team already knows how to operate and monitor, rather than introducing a new platform for one small tool.

Syntax highlighting in the current prototype is a hand rolled tokenizer, built specifically because artifacts only have access to a fixed, narrow set of libraries. A real build is not under that constraint and should use an established highlighter such as Shiki or Prism instead. Both handle far more languages and edge cases than a hand written tokenizer ever will, and neither is meaningfully harder to wire up than what already exists.

## 10. Security and access model

This is the part of the prototype that most needs to change before anyone outside the immediate team touches it.

Internal use, developer to developer, is reasonably safe with almost no authentication at all, since the six character code plus a short expiration window already limits exposure. Even here, the fixes below still matter, because a tool with no expiration and no revocation is a standing liability regardless of who's using it.

Client facing use needs a real access model. The recommended approach is a per client or per project shared secret, issued by whoever sets up the client relationship, required before that client can create or retrieve anything. This doesn't need to be as heavy as full account creation, but it needs to be more than "knows the URL."

Internal team members creating or managing snippets should authenticate through the identity provider already used for other internal tools, so access ties back to a real person rather than an anonymous session.

Every snippet needs the expiration and revocation behavior described in the data model above, and expiration is enforced at read time on the server, not just hidden in the UI.

Before a snippet is saved, its code and notes should be checked against a small set of patterns for things that look like credentials, private keys, or tokens, with the user warned before the save completes. This won't catch everything, but it catches the common accidental paste.

## 11. Abuse prevention

- Rate limit creation per IP address and per authenticated session, since nothing in the current prototype stops someone from generating an unbounded number of entries.
- Cap total storage per client or per team if this becomes client facing, so one account can't quietly consume the whole system's budget.
- Log creation and retrieval events with enough detail to reconstruct who did what, without logging the actual snippet contents inside that log.

## 12. Testing strategy

- Unit tests for the tokenizer or highlighting integration, covering each supported language with a handful of representative snippets.
- Integration tests for the API layer, covering the full create and retrieve cycle, expired code handling, and revocation.
- A basic end to end test for the real user flow. Share a snippet, copy the code, retrieve it, confirm the code, notes, and images all round trip correctly.

## 13. Rollout plan

Phase one ships as an internal only tool, developer to developer, with expiration and revocation in place from day one and no client access yet.

Phase two adds the per client access model and the admin view, and opens the tool to specific client relationships as a deliberate decision rather than a default.

Each phase should get its own short retrospective before moving to the next, since the risk profile changes meaningfully once client data starts flowing through it.

## 14. Open questions for the team

- Who inside Atomic Glue should have access to the admin view. Everyone with a login, or a smaller group.
- What's the right default expiration window for internal snippets versus client facing ones.
- Should screenshots be scanned for anything beyond size and type, given they can carry the same kind of accidental sensitive content as pasted code.
- Does legal or a specific client contract ever require a harder guarantee about where this data lives, beyond "on infrastructure we control."
