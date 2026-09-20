import { type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDbReady } from "@/lib/db";
import { fileStore } from "@/lib/files";
import { jsonError, jsonOk } from "@/lib/http";
import { fetchLinkMetadata } from "@/lib/metadata";
import type { Item } from "@/lib/types";
import { normalizedTags, updateItemSchema } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): ObjectId | null {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const objectId = parseId((await ctx.params).id);
  if (!objectId) {
    return jsonError(400, "INVALID_ID", "Invalid item id");
  }
  try {
    const db = await getDbReady();
    const item = await db.collection<Item>("items").findOne({ _id: objectId });
    if (!item) {
      return jsonError(404, "NOT_FOUND", "Item not found");
    }
    return jsonOk({ item });
  } catch (error) {
    console.error("get item failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const objectId = parseId((await ctx.params).id);
  if (!objectId) {
    return jsonError(400, "INVALID_ID", "Invalid item id");
  }
  const parsed = updateItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "INVALID_INPUT", "Invalid item data");
  }
  try {
    const db = await getDbReady();
    const existing = await db.collection<Item>("items").findOne({ _id: objectId });
    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Item not found");
    }

    const input = parsed.data;
    const $set: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) $set.title = input.title;
    if (input.description !== undefined) $set.description = input.description;
    if (input.collectionId !== undefined) $set.collectionId = input.collectionId;
    if (input.tags !== undefined) $set.tags = normalizedTags(input.tags);
    if (input.note !== undefined) $set.note = input.note;
    if (input.canEmbed !== undefined) $set.canEmbed = input.canEmbed;

    if (existing.type === "link" && input.url !== undefined && input.url !== existing.url) {
      const meta = await fetchLinkMetadata(input.url);
      $set.url = input.url;
      $set.thumbnail = meta.thumbnail;
      $set.favicon = meta.favicon;
      $set.domain = meta.domain;
      $set.canEmbed = meta.canEmbed;
      if (input.description === undefined) {
        $set.description = meta.description;
      }
    }
    if (existing.type === "note" && input.body !== undefined) {
      $set.note = input.body;
    }
    if (existing.type === "file" && (input.url !== undefined || input.body !== undefined)) {
      return jsonError(400, "INVALID_FIELD", "File items cannot change their content");
    }

    await db.collection<Item>("items").updateOne({ _id: objectId }, { $set });
    const updated = await db.collection<Item>("items").findOne({ _id: objectId });
    return jsonOk({ item: updated });
  } catch (error) {
    console.error("update item failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const objectId = parseId((await ctx.params).id);
  if (!objectId) {
    return jsonError(400, "INVALID_ID", "Invalid item id");
  }
  try {
    const db = await getDbReady();
    const existing = await db.collection<Item>("items").findOne({ _id: objectId });
    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Item not found");
    }
    if (existing.fileRef) {
      try {
        await fileStore.delete(existing.fileRef);
      } catch {
        // orphaned blob — item removal still proceeds
      }
    }
    await db.collection<Item>("items").deleteOne({ _id: objectId });
    return jsonOk({ ok: true });
  } catch (error) {
    console.error("delete item failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}
