import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { LocalDiskFileStore } from "../files";

describe("local file store", () => {
  const root = process.env.TEST_TMPDIR ?? join(tmpdir(), "linkforge-blob-test");
  const store = new LocalDiskFileStore(root);

  afterAll(async () => {
    await rm(root, { recursive: true, force: true }).catch(() => undefined);
  });

  it("uploads, resolves, and deletes files with content types", async () => {
    const text = new TextEncoder().encode("hello");
    const uploaded = await store.upload(text, "text/plain", { path: "notes" });
    expect(uploaded.key).toMatch(/^notes-/);
    expect(uploaded.contentType).toBe("text/plain");
    expect(uploaded.size).toBe(5);
    expect(await store.getUrl(uploaded.key)).toBe(uploaded.url);

    const read = await store.read(uploaded.key);
    expect(read?.contentType).toBe("text/plain");
    expect(new TextDecoder().decode(read?.data)).toBe("hello");

    await store.delete(uploaded.key);
    expect(await store.getUrl(uploaded.key)).toBeNull();
    expect(await store.read(uploaded.key)).toBeNull();
  });

  it("neutralizes traversal in upload paths and rejects traversal on read/delete", async () => {
    // Upload sanitizes the path prefix so nothing escapes the store root.
    const uploaded = await store.upload(new Uint8Array(0), "text/plain", { path: "../../evil" });
    expect(uploaded.key).not.toContain("/");
    expect(uploaded.key).not.toContain("..");

    // read/delete go through the strict resolve() guard.
    await expect(store.read("../secret")).rejects.toThrow();
    await expect(store.delete("/etc/passwd")).rejects.toThrow();
  });
});
