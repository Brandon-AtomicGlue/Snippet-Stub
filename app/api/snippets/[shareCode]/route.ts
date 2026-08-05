import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getActiveSnippetByShareCode, revokeSnippet } from "@/lib/db/snippets-repo";
import { revokeSnippetSchema } from "@/lib/api/schemas";

// Never distinguish "expired" from "never existed" — both return this.
const NOT_FOUND = NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  const { shareCode } = await params;
  const db = await getDb();
  const snippet = await getActiveSnippetByShareCode(db, shareCode);

  if (!snippet) {
    return NOT_FOUND;
  }

  return NextResponse.json({
    shareCode: snippet.shareCode,
    language: snippet.language,
    code: snippet.code,
    notes: snippet.notes,
    createdAt: snippet.createdAt.toISOString(),
    expiresAt: snippet.expiresAt.toISOString(),
    images: snippet.images.map((image) => ({
      url: image.storageKey,
      width: image.width,
      height: image.height,
    })),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  const { shareCode } = await params;
  const json = await request.json().catch(() => null);
  const parsed = revokeSnippetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "ownerToken is required" }, { status: 400 });
  }

  const db = await getDb();
  const revoked = await revokeSnippet(db, shareCode, parsed.data.ownerToken);

  if (!revoked) {
    return NOT_FOUND;
  }

  return NextResponse.json({ revoked: true });
}
