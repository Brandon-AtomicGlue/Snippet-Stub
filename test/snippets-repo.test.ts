import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./test-db";
import {
  createSnippet,
  getActiveSnippetByShareCode,
  revokeSnippet,
  type Database,
} from "@/lib/db/snippets-repo";

let db: Database;

beforeEach(async () => {
  db = (await createTestDb()) as unknown as Database;
});

describe("create + retrieve cycle", () => {
  it("round-trips code, notes, and images", async () => {
    const { shareCode } = await createSnippet(db, {
      language: "typescript",
      code: "console.log('hi')",
      notes: "watch out for the trailing comma",
      expiration: "7d",
      images: [{ storageKey: "/uploads/a.png", width: 100, height: 50 }],
    });

    const snippet = await getActiveSnippetByShareCode(db, shareCode);
    expect(snippet).not.toBeNull();
    expect(snippet?.code).toBe("console.log('hi')");
    expect(snippet?.notes).toBe("watch out for the trailing comma");
    expect(snippet?.images).toEqual([{ storageKey: "/uploads/a.png", width: 100, height: 50 }]);
  });

  it("accepts codes with dashes and mixed case", async () => {
    const { shareCode } = await createSnippet(db, {
      language: "python",
      code: "print('hi')",
      expiration: "7d",
    });

    const dashed = `${shareCode.slice(0, 3)}-${shareCode.slice(3)}`.toLowerCase();
    const snippet = await getActiveSnippetByShareCode(db, dashed);
    expect(snippet).not.toBeNull();
  });

  it("increments access_count on each retrieval", async () => {
    const { shareCode } = await createSnippet(db, {
      language: "go",
      code: "package main",
      expiration: "7d",
    });

    await getActiveSnippetByShareCode(db, shareCode);
    await getActiveSnippetByShareCode(db, shareCode);

    const [row] = await db.query.snippets.findMany({
      where: (snippets, { eq }) => eq(snippets.shareCode, shareCode),
    });
    expect(row.accessCount).toBe(2);
  });
});

describe("expiration", () => {
  it("returns null for a code past its expiry, same as a code that never existed", async () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const { shareCode } = await createSnippet(
      db,
      { language: "bash", code: "echo hi", expiration: "1d" },
      now
    );

    const afterExpiry = new Date("2026-01-03T00:00:00Z");
    const expired = await getActiveSnippetByShareCode(db, shareCode, afterExpiry);
    const neverExisted = await getActiveSnippetByShareCode(db, "ZZZZZZ", afterExpiry);

    expect(expired).toBeNull();
    expect(neverExisted).toBeNull();
  });
});

describe("revocation", () => {
  it("revokes with the correct owner token and hides the snippet afterward", async () => {
    const { shareCode, ownerToken } = await createSnippet(db, {
      language: "json",
      code: "{}",
      expiration: "7d",
    });

    const revoked = await revokeSnippet(db, shareCode, ownerToken);
    expect(revoked).toBe(true);

    const snippet = await getActiveSnippetByShareCode(db, shareCode);
    expect(snippet).toBeNull();
  });

  it("refuses to revoke with the wrong owner token", async () => {
    const { shareCode } = await createSnippet(db, {
      language: "json",
      code: "{}",
      expiration: "7d",
    });

    const revoked = await revokeSnippet(db, shareCode, "wrong-token");
    expect(revoked).toBe(false);

    const snippet = await getActiveSnippetByShareCode(db, shareCode);
    expect(snippet).not.toBeNull();
  });
});
