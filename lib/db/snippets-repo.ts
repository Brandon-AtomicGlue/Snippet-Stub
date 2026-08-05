import { randomBytes, randomInt } from "crypto";
import { and, eq, isNull, gt, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { snippets, snippetImages } from "./schema";

// Excludes visually similar characters: 0/O, 1/I/L.
const SHARE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHARE_CODE_LENGTH = 6;
const MAX_SHARE_CODE_ATTEMPTS = 5;

// Generic over the query-result shape so both the node-postgres (prod/Neon)
// and PGlite (tests) drivers satisfy this type.
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export function generateShareCode(): string {
  let code = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += SHARE_CODE_ALPHABET[randomInt(SHARE_CODE_ALPHABET.length)];
  }
  return code;
}

export function generateOwnerToken(): string {
  return randomBytes(24).toString("hex");
}

export function normalizeShareCode(input: string): string {
  return input.replace(/-/g, "").trim().toUpperCase();
}

export const EXPIRATION_OPTIONS = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
} as const;
export type ExpirationOption = keyof typeof EXPIRATION_OPTIONS;

export function expirationToDate(option: ExpirationOption, from: Date): Date {
  const days = EXPIRATION_OPTIONS[option];
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export interface CreateSnippetInput {
  language: string;
  code: string;
  notes?: string | null;
  createdBy?: string | null;
  expiration: ExpirationOption;
  images?: Array<{ storageKey: string; width: number; height: number }>;
}

export interface CreateSnippetResult {
  shareCode: string;
  ownerToken: string;
  expiresAt: Date;
}

export async function createSnippet(
  db: Database,
  input: CreateSnippetInput,
  now: Date = new Date()
): Promise<CreateSnippetResult> {
  const ownerToken = generateOwnerToken();
  const expiresAt = expirationToDate(input.expiration, now);

  for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt++) {
    const shareCode = generateShareCode();
    try {
      const [row] = await db
        .insert(snippets)
        .values({
          shareCode,
          ownerToken,
          language: input.language,
          code: input.code,
          notes: input.notes ?? null,
          createdBy: input.createdBy ?? null,
          expiresAt,
        })
        .returning({ id: snippets.id });

      if (input.images?.length) {
        await db.insert(snippetImages).values(
          input.images.map((image) => ({
            snippetId: row.id,
            storageKey: image.storageKey,
            width: image.width,
            height: image.height,
          }))
        );
      }

      return { shareCode, ownerToken, expiresAt };
    } catch (err: unknown) {
      const isUniqueViolation =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "23505";
      if (isUniqueViolation && attempt < MAX_SHARE_CODE_ATTEMPTS - 1) {
        continue;
      }
      throw err;
    }
  }

  throw new Error("Could not generate a unique share code, please try again.");
}

export interface RetrievedSnippet {
  shareCode: string;
  language: string;
  code: string;
  notes: string | null;
  createdAt: Date;
  expiresAt: Date;
  images: Array<{ storageKey: string; width: number; height: number }>;
}

export async function getActiveSnippetByShareCode(
  db: Database,
  shareCodeRaw: string,
  now: Date = new Date()
): Promise<RetrievedSnippet | null> {
  const shareCode = normalizeShareCode(shareCodeRaw);

  const [row] = await db
    .select()
    .from(snippets)
    .where(
      and(
        eq(snippets.shareCode, shareCode),
        isNull(snippets.deletedAt),
        gt(snippets.expiresAt, now)
      )
    )
    .limit(1);

  if (!row) return null;

  await db
    .update(snippets)
    .set({ accessCount: sql`${snippets.accessCount} + 1`, lastAccessedAt: now })
    .where(eq(snippets.id, row.id));

  const images = await db
    .select({
      storageKey: snippetImages.storageKey,
      width: snippetImages.width,
      height: snippetImages.height,
    })
    .from(snippetImages)
    .where(eq(snippetImages.snippetId, row.id));

  return {
    shareCode: row.shareCode,
    language: row.language,
    code: row.code,
    notes: row.notes,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    images,
  };
}

export async function revokeSnippet(
  db: Database,
  shareCodeRaw: string,
  ownerToken: string,
  now: Date = new Date()
): Promise<boolean> {
  const shareCode = normalizeShareCode(shareCodeRaw);

  const result = await db
    .update(snippets)
    .set({ deletedAt: now })
    .where(
      and(
        eq(snippets.shareCode, shareCode),
        eq(snippets.ownerToken, ownerToken),
        isNull(snippets.deletedAt)
      )
    )
    .returning({ id: snippets.id });

  return result.length > 0;
}
