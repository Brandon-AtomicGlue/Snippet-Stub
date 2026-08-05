import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { createSnippet } from "@/lib/db/snippets-repo";
import { createSnippetSchema } from "@/lib/api/schemas";
import { putImage } from "@/lib/storage";
import { MAX_IMAGE_BYTES } from "@/lib/image-limits";

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  if (json === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSnippetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { language, code, notes, expiration, images = [] } = parsed.data;

  const decodedImages: Array<{ buffer: Buffer; contentType: string; width: number; height: number }> = [];
  for (const image of images) {
    const [, contentType, base64] = image.dataUrl.match(/^data:(image\/\w+);base64,(.+)$/) ?? [];
    if (!contentType || !base64) {
      return NextResponse.json({ error: "Malformed image data" }, { status: 400 });
    }
    const buffer = Buffer.from(base64, "base64");
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image is too large" }, { status: 400 });
    }
    decodedImages.push({ buffer, contentType, width: image.width, height: image.height });
  }

  const storedImages = await Promise.all(
    decodedImages.map(async (image) => {
      const { storageKey } = await putImage(image.buffer, image.contentType);
      return { storageKey, width: image.width, height: image.height };
    })
  );

  const db = await getDb();
  const result = await createSnippet(db, {
    language,
    code,
    notes: notes ?? null,
    expiration,
    images: storedImages,
  });

  return NextResponse.json(
    {
      shareCode: result.shareCode,
      ownerToken: result.ownerToken,
      expiresAt: result.expiresAt.toISOString(),
    },
    { status: 201 }
  );
}
