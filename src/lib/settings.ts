import { getDb } from "./db";
import type { Settings } from "./types";

export async function getSettings(): Promise<Settings | null> {
  const db = await getDb();
  return db.collection<Settings>("settings").findOne({});
}

/**
 * Resolve the gate password hash: settings doc first, env var fallback
 * (SPEC.md §3.1 allows either).
 */
export async function getGatePasswordHash(): Promise<string | null> {
  try {
    const settings = await getSettings();
    if (settings?.passwordHash) {
      return settings.passwordHash;
    }
  } catch {
    // DB not reachable/configured — env fallback below keeps the gate usable.
  }
  return process.env.GATE_PASSWORD_HASH ?? null;
}

export async function updateSettings(
  patch: Partial<Pick<Settings, "defaultLocale" | "theme" | "passwordHash">>,
): Promise<Settings> {
  const db = await getDb();
  const collection = db.collection<Settings>("settings");
  await collection.updateOne(
    {},
    { $set: { ...patch, updatedAt: new Date() } },
    { upsert: true },
  );
  const updated = await collection.findOne({});
  if (!updated) {
    throw new Error("Failed to persist settings");
  }
  return updated;
}
