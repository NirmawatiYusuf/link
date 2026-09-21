import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createSessionToken, hasValidSession } from "../auth";

function requestWithCookie(token: string | undefined): NextRequest {
  return {
    cookies: {
      get: () => (token ? { value: token } : undefined),
    },
  } as unknown as NextRequest;
}

describe("sessions", () => {
  it("accepts a freshly issued token", async () => {
    process.env.SESSION_SECRET = "test-secret-that-is-long-enough-for-hs256";
    const token = await createSessionToken();
    expect(await hasValidSession(requestWithCookie(token))).toBe(true);
  });

  it("rejects tampered tokens", async () => {
    const token = await createSessionToken();
    const tampered = `${token.slice(0, -2)}xx`;
    expect(await hasValidSession(requestWithCookie(tampered))).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken();
    process.env.SESSION_SECRET = "another-different-secret-value-here";
    expect(await hasValidSession(requestWithCookie(token))).toBe(false);
  });

  it("rejects missing tokens", async () => {
    expect(await hasValidSession(requestWithCookie(undefined))).toBe(false);
  });
});
