import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "lf_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

function sessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set (see .env.example)");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ sub: "gate" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(sessionSecret());
}

/** Edge-runtime safe (no node-only APIs) so proxy.ts and route handlers share it. */
export async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return false;
  }
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return payload.sub === "gate";
  } catch {
    return false;
  }
}
