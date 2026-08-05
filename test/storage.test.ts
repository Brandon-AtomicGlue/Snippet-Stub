import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

describe("putImage local fallback", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "snippet-stub-storage-test-"));
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.SNIPPET_STUB_LOCAL_UPLOAD_DIR = tempDir;
  });

  afterAll(async () => {
    delete process.env.SNIPPET_STUB_LOCAL_UPLOAD_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns a storageKey that resolves as a servable URL, not a bare filename", async () => {
    const { putImage } = await import("@/lib/storage");
    const { storageKey, url } = await putImage(Buffer.from("fake-image-bytes"), "image/png");

    expect(storageKey).toBe(url);
    expect(storageKey).toMatch(/^\/uploads\/.+\.png$/);
  });
});
