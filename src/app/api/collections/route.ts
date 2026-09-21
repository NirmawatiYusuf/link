import { type NextRequest } from "next/server";
import { getDbReady } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import type { Collection } from "@/lib/types";
import { createCollectionSchema } from "@/lib/validate";

type InsertCollection = Omit<Collection, "_id">;

export async function GET() {
  try {
    const db = await getDbReady();
    const collections = await db
      .collection<Collection>("collections")
      .find({})
      .sort({ order: 1, createdAt: 1 })
      .toArray();
    return jsonOk({ collections });
  } catch (error) {
    console.error("list collections failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}

export async function POST(request: NextRequest) {
  const parsed = createCollectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Invalid collection data");
  }
  try {
    const db = await getDbReady();
    if (parsed.data.parentId) {
      const parent = await db.collection<Collection>("collections").findOne({ _id: parsed.data.parentId });
      if (!parent) {
        return jsonError(400, "INVALID_PARENT", "Parent collection not found");
      }
    }
    const order =
      parsed.data.order ?? (await db.collection<Collection>("collections").countDocuments({})) + 1;
    const doc: InsertCollection = {
      name: parsed.data.name,
      parentId: parsed.data.parentId ?? null,
      icon: parsed.data.icon ?? null,
      order,
      createdAt: new Date(),
    };
    const { insertedId } = await db.collection<Omit<Collection, "_id">>("collections").insertOne(doc);
    return jsonOk({ collection: { _id: insertedId, ...doc } }, { status: 201 });
  } catch (error) {
    console.error("create collection failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}
