import { describe, expect, it } from "vitest";
import {
  createCollectionSchema,
  createItemSchema,
  isAllowedFileType,
  MAX_FILE_SIZE_BYTES,
  normalizedTags,
  updateItemSchema,
} from "../validate";

describe("validation", () => {
  it("accepts a valid link payload", () => {
    const result = createItemSchema.safeParse({
      type: "link",
      url: "https://example.com/article",
      tags: ["dev", "web"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-http url and unknown keys", () => {
    expect(createItemSchema.safeParse({ type: "link", url: "javascript:alert(1)" }).success).toBe(false);
    expect(
      createItemSchema.safeParse({ type: "link", url: "https://example.com", injected: true }).success,
    ).toBe(false);
  });

  it("accepts a note and rejects an empty body", () => {
    expect(createItemSchema.safeParse({ type: "note", body: "hello" }).success).toBe(true);
    expect(createItemSchema.safeParse({ type: "note", body: "" }).success).toBe(false);
  });

  it("rejects url+body in the same patch", () => {
    const result = updateItemSchema.safeParse({ url: "https://ex.com", body: "x" });
    expect(result.success).toBe(false);
  });

  it("accepts a collection and sanitizes names", () => {
    const result = createCollectionSchema.safeParse({ name: "  Reads  " });
    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe("Reads");
  });

  it("normalizes and dedupes tags", () => {
    expect(normalizedTags(["Dev", " dev ", "dev"])).toEqual(["Dev", "dev"]);
  });

  it("allows only the documented file types", () => {
    expect(isAllowedFileType("application/pdf")).toBe(true);
    expect(isAllowedFileType("image/png")).toBe(true);
    expect(isAllowedFileType("text/markdown")).toBe(true);
    expect(isAllowedFileType("application/x-executable")).toBe(false);
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});
