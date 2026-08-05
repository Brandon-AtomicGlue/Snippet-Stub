import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface StoredImage {
  storageKey: string;
  url: string;
}

const LOCAL_UPLOAD_DIR =
  process.env.SNIPPET_STUB_LOCAL_UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

/**
 * Dev fallback so image upload works before a Vercel Blob store is
 * provisioned. Not available in Vercel's serverless production runtime
 * (read-only filesystem) — BLOB_READ_WRITE_TOKEN is required there.
 */
async function putImageLocal(buffer: Buffer, extension: string): Promise<StoredImage> {
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const storageKey = `${randomUUID()}.${extension}`;
  await writeFile(path.join(LOCAL_UPLOAD_DIR, storageKey), buffer);
  return { storageKey, url: `/uploads/${storageKey}` };
}

export async function putImage(buffer: Buffer, contentType: string): Promise<StoredImage> {
  const extension = contentType.split("/")[1] ?? "bin";

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`snippet-images/${randomUUID()}.${extension}`, buffer, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    // blob.url is a stable, publicly resolvable URL — store it directly so
    // retrieval never needs to know which backend created it.
    return { storageKey: blob.url, url: blob.url };
  }

  return putImageLocal(buffer, extension);
}
