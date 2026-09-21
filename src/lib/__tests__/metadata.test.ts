import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLinkMetadata, parseEmbeddability } from "../metadata";

const HTML = `<!doctype html>
<html>
  <head>
    <title>Fallback Title</title>
    <meta property="og:title" content="OG Title"/>
    <meta property="og:description" content="An og description"/>
    <meta property="og:image" content="/thumb.png"/>
    <link rel="icon" href="/favicon.ico"/>
  </head>
  <body></body>
</html>`;

describe("metadata", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses embeddability from headers", () => {
    expect(parseEmbeddability(new Headers({ "x-frame-options": "DENY" }))).toBe("no");
    expect(parseEmbeddability(new Headers({ "x-frame-options": "SAMEORIGIN" }))).toBe("yes");
    expect(
      parseEmbeddability(new Headers({ "content-security-policy": "frame-ancestors 'none'" })),
    ).toBe("no");
    expect(parseEmbeddability(new Headers({}))).toBe("yes");
  });

  it("extracts og fields, resolves relative assets, and falls back to <title>", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          text: async () => HTML,
          headers: new Headers({ "x-frame-options": "SAMEORIGIN" }),
        };
      }),
    );
    const meta = await fetchLinkMetadata("https://example.com/page");
    expect(meta.title).toBe("OG Title");
    expect(meta.description).toBe("An og description");
    expect(meta.thumbnail).toBe("https://example.com/thumb.png");
    expect(meta.favicon).toBe("https://example.com/favicon.ico");
    expect(meta.domain).toBe("example.com");
    expect(meta.canEmbed).toBe("yes");
  });

  it("falls back to <title> when og tags are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => "<html><head><title>Plain</title></head></html>",
        headers: new Headers({}),
      })),
    );
    const meta = await fetchLinkMetadata("https://example.com/x");
    expect(meta.title).toBe("Plain");
  });

  it("marks unreachable sites as unknown", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, headers: new Headers({}) })));
    const meta = await fetchLinkMetadata("https://example.com/404");
    expect(meta.canEmbed).toBe("unknown");
  });
});
