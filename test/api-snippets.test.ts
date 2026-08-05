import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "./test-db";

const dbHolder = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@/lib/db/client", () => ({
  getDb: () => dbHolder.db,
}));

let POST: typeof import("@/app/api/snippets/route").POST;
let GET: typeof import("@/app/api/snippets/[shareCode]/route").GET;
let DELETE: typeof import("@/app/api/snippets/[shareCode]/route").DELETE;

beforeAll(async () => {
  dbHolder.db = await createTestDb();
  ({ POST } = await import("@/app/api/snippets/route"));
  ({ GET, DELETE } = await import("@/app/api/snippets/[shareCode]/route"));
});

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/snippets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function paramsFor(shareCode: string) {
  return { params: Promise.resolve({ shareCode }) };
}

describe("POST /api/snippets", () => {
  it("creates a snippet and returns a share code + owner token", async () => {
    const response = await POST(
      postRequest({ language: "typescript", code: "const x = 1;", expiration: "7d" })
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.shareCode).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(body.ownerToken).toHaveLength(48);
  });

  it("rejects an empty snippet", async () => {
    const response = await POST(postRequest({ language: "typescript", code: "", expiration: "7d" }));
    expect(response.status).toBe(400);
  });

  it("rejects an unsupported language", async () => {
    const response = await POST(
      postRequest({ language: "cobol", code: "x", expiration: "7d" })
    );
    expect(response.status).toBe(400);
  });
});

describe("full create -> retrieve -> revoke cycle", () => {
  it("round-trips through the API", async () => {
    const createResponse = await POST(
      postRequest({
        language: "python",
        code: "print('hello')",
        notes: "context for the reviewer",
        expiration: "7d",
      })
    );
    const { shareCode, ownerToken } = await createResponse.json();

    const getResponse = await GET(new NextRequest("http://localhost"), paramsFor(shareCode));
    expect(getResponse.status).toBe(200);
    const snippet = await getResponse.json();
    expect(snippet.code).toBe("print('hello')");
    expect(snippet.notes).toBe("context for the reviewer");

    const deleteResponse = await DELETE(
      new NextRequest("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ ownerToken }),
      }),
      paramsFor(shareCode)
    );
    expect(deleteResponse.status).toBe(200);

    const afterDelete = await GET(new NextRequest("http://localhost"), paramsFor(shareCode));
    expect(afterDelete.status).toBe(404);
  });

  it("returns the same 404 for an unknown code as for a revoked one", async () => {
    const unknown = await GET(new NextRequest("http://localhost"), paramsFor("ZZZZZZ"));
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: "Not found" });
  });

  it("refuses revocation with the wrong owner token", async () => {
    const createResponse = await POST(
      postRequest({ language: "json", code: "{}", expiration: "7d" })
    );
    const { shareCode } = await createResponse.json();

    const deleteResponse = await DELETE(
      new NextRequest("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ ownerToken: "wrong" }),
      }),
      paramsFor(shareCode)
    );
    expect(deleteResponse.status).toBe(404);

    const getResponse = await GET(new NextRequest("http://localhost"), paramsFor(shareCode));
    expect(getResponse.status).toBe(200);
  });
});
