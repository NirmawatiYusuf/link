import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { rateLimiter } from "@/lib/rateLimit";
import { getGatePasswordHash } from "@/lib/settings";
import { z } from "zod";

const bodySchema = z.object({ password: z.string().min(1).max(256) }).strict();

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = await rateLimiter(`login:${ip}`);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many attempts" } },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid request body" } },
      { status: 400 },
    );
  }

  const gateHash = await getGatePasswordHash();
  if (!gateHash) {
    return NextResponse.json(
      { error: { code: "GATE_NOT_CONFIGURED", message: "Gate password is not configured" } },
      { status: 503 },
    );
  }

  if (!(await verifyPassword(parsed.data.password, gateHash))) {
    return NextResponse.json(
      { error: { code: "INVALID_PASSWORD", message: "Incorrect password" } },
      { status: 401 },
    );
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  return response;
}
