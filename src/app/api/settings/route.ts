import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getGatePasswordHash, getSettings, updateSettings } from "@/lib/settings";
import type { Settings } from "@/lib/types";
import { routing } from "@/i18n/routing";

const bodySchema = z
  .strictObject({
    locale: z.enum([...routing.locales] as [string, ...string[]]).optional(),
    theme: z.string().trim().min(1).max(32).optional(),
    currentPassword: z.string().min(1).max(256).optional(),
    newPassword: z.string().min(8).max(256).optional(),
  })
  .refine((value) => !(value.currentPassword && !value.newPassword), {
    message: "newPassword is required when changing the password",
  });

function publicSettings(settings: Settings | null) {
  return {
    settings: {
      defaultLocale: settings?.defaultLocale ?? "en",
      theme: settings?.theme ?? "dark",
    },
  };
}

export async function GET() {
  try {
    return jsonOk(publicSettings(await getSettings()));
  } catch (error) {
    console.error("get settings failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Invalid settings payload");
  }
  try {
    const patch: { defaultLocale?: string; theme?: string; passwordHash?: string } = {};
    if (parsed.data.locale) patch.defaultLocale = parsed.data.locale;
    if (parsed.data.theme) patch.theme = parsed.data.theme;
    if (parsed.data.newPassword) {
      const currentHash = await getGatePasswordHash();
      if (!currentHash) {
        return jsonError(503, "GATE_NOT_CONFIGURED", "No password is configured yet");
      }
      if (!(await verifyPassword(parsed.data.currentPassword ?? "", currentHash))) {
        return jsonError(401, "INVALID_PASSWORD", "Current password is incorrect");
      }
      patch.passwordHash = await hashPassword(parsed.data.newPassword);
    }
    const updated = await updateSettings(patch);
    return jsonOk(publicSettings(updated));
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("update settings failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}
