import { NextResponse } from "next/server";
import { z } from "zod";
import { routing } from "@/i18n/routing";

const bodySchema = z
  .object({ locale: z.enum([...routing.locales] as [string, ...string[]]) })
  .strict();

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid locale" } },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("NEXT_LOCALE", parsed.data.locale, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
