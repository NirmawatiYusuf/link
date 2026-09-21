import { type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDbReady } from "@/lib/db";
import { fileStore } from "@/lib/files";
import { jsonError, jsonOk } from "@/lib/http";
import type { Collection, Item } from "@/lib/types";
import { updateCollectionSchema } from "@/lib/validate";

function parseId(raw: string): ObjectId | null {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

async function wouldCycle(
  db: Awaited<ReturnType<typeof getDbReady>>,
  startId: ObjectId,
  targetId: ObjectId,
): Promise<boolean> {
  const visited = new Set<string>();
  let current = targetId;
  for (let i = 0; i < 100; i++) {
    if (current.equals(startId)) {
      return true;
    }
    if (visited.has(current.toString())) {
      break;
    }
    visited.add(current.toString());
    const parent = await db.collection<Collection>("collections").findOne({ _id: current });
    if (!parent?.parentId) {
      break;
    }
    current = parent.parentId;
  }
  return false;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const objectId = parseId((await ctx.params).id);
  if (!objectId) {
    return jsonError(400, "INVALID_ID", "Invalid collection id");
  }
  const parsed = updateCollectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Invalid collection data");
  }
  try {
    const db = await getDbReady();
    const existing = await db.collection<Collection>("collections").findOne({ _id: objectId });
    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Collection not found");
    }
    if (
      parsed.data.parentId &&
      !parsed.data.parentId.equals(objectId) &&
      (await wouldCycle(db, objectId, parsed.data.parentId))
    ) {
      return jsonError(400, "INVALID_PARENT", "Moving the collection here would create a cycle");
    }
    const $set: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) $set.name = parsed.data.name;
    if (parsed.data.icon !== undefined) $set.icon = parsed.data.icon;
    if (parsed.data.order !== undefined) $set.order = parsed.data.order;
    if (parsed.data.parentId !== undefined) $set.parentId = parsed.data.parentId;
    await db.collection<Collection>("collections").updateOne({ _id: objectId }, { $set });
    const updated = await db.collection<Collection>("collections").findOne({ _id: objectId });
    return jsonOk({ collection: updated });
  } catch (error) {
    console.error("update collection failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const objectId = parseId((await ctx.params).id);
  if (!objectId) {
    return jsonError(400, "INVALID_ID", "Invalid collection id");
  }
  try {
    const db = await getDbReady();
    const existing = await db.collection<Collection>("collections").findOne({ _id: objectId });
    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Collection not found");
    }
    // Cascade: promote child collections to root, delete items (and their files).
    await db.collection<Collection>("collections").updateMany(
      { parentId: objectId },
      { $set: { parentId: null } },
    );
    const doomed = await db
      .collection<Item>("items")
      .find({ collectionId: objectId }, { projection: { fileRef: 1 } })
      .toArray();
    for (const item of doomed) {
      if (item.fileRef) {
        try {
          await fileStore.delete(item.fileRef);
        } catch {
          // orphaned blob — item removal still proceeds
        }
      }
    }
    await db.collection<Item>("items").deleteMany({ collectionId: objectId });
    await db.collection<Collection>("collections").deleteOne({ _id: objectId });
    return jsonOk({ ok: true });
  } catch (error) {
    console.error("delete collection failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}
