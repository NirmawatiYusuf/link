import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("passwords", () => {
  it("hashes and verifies a password", async () => {
    const digest = await hashPassword("correct horse");
    expect(digest).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", digest)).toBe(true);
    expect(await verifyPassword("wrong", digest)).toBe(false);
  });

  it("never stores plaintext", async () => {
    const digest = await hashPassword("secret");
    expect(digest).toMatch(/^\$2[aby]\$/);
  });
});
