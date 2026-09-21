import { type NextRequest } from "next/server";
import { ObjectId, type Sort } from "mongodb";
import { getDbReady } from "@/lib/db";
import { fileStore } from "@/lib/files";
import { jsonError, jsonOk } from "@/lib/http";
import { fetchLinkMetadata } from "@/lib/metadata";
import type { Item } from "@/lib/types";
import {
  createItemSchema,
  isAllowedFileType,
  listItemsQuerySchema,
  MAX_FILE_SIZE_BYTES,
  normalizedTags,
} from "@/lib/validate";

type InsertItem = Omit<Item, "_id">;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const parsed = listItemsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return jsonError(400, "INVALID_QUERY", "Invalid query parameters");
  }
  const query = parsed.data;
  try {
    const db = await getDbReady();
    const filter: Record<string, unknown> = {};
    if (query.collectionId) filter.collectionId = query.collectionId;
    if (query.type) filter.type = query.type;
    if (query.tag) filter.tags = query.tag;
    if (query.domain) filter.domain = new RegExp(`^${escapeRegExp(query.domain)}$`, "i");
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = query.from;
      if (query.to) range.$lte = query.to;
      filter.createdAt = range;
    }
    if (query.q) {
      filter.$text = { $search: query.q };
    }

    const collection = db.collection<Item>("items");
    const sort: Sort = query.q
      ? { score: { $meta: "textScore" as const }, createdAt: -1 }
      : { createdAt: -1 };
    const items = await collection
      .find(filter)
      .sort(sort)
      .skip(query.skip)
      .limit(query.limit)
      .toArray();
    const total = await collection.countDocuments(filter);
    return jsonOk({
      items,
      hasMore: query.skip + items.length < total,
      total,
    });
  } catch (error) {
    console.error("list items failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}

function parseTags(value: string | null): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsedJson = JSON.parse(value);
    if (Array.isArray(parsedJson) && parsedJson.every((tag) => typeof tag === "string")) {
      return normalizedTags(parsedJson as string[]);
    }
  } catch {
    // fall through to comma-splitting below
  }
  return normalizedTags(value.split(","));
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    const db = await getDbReady();
    const now = new Date();

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonError(400, "INVALID_FILE", "A file upload is required");
      }
      if (!isAllowedFileType(file.type)) {
        return jsonError(400, "UNSUPPORTED_FILE_TYPE", "File type is not allowed");
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return jsonError(413, "FILE_TOO_LARGE", "File exceeds the 10 MB limit");
      }
      const rawTitle = (form.get("title") as string | null)?.trim() || file.name || "Untitled";
      const title = rawTitle.slice(0, 200);
      const note = (form.get("note") as string | null)?.slice(0, 100_000);
      const rawCollection = form.get("collectionId") as string | null;
      const collectionId = rawCollection && ObjectId.isValid(rawCollection) ? new ObjectId(rawCollection) : null;
      const tags = parseTags(form.get("tags") as string | null);

      const stored = await fileStore.upload(new Uint8Array(await file.arrayBuffer()), file.type);
      const doc: InsertItem = {
        type: "file",
        title,
        url: null,
        description: null,
        thumbnail: null,
        favicon: null,
        domain: null,
        tags,
        collectionId,
        note: note || null,
        canEmbed: "unknown",
        fileRef: stored.url,
        fileType: file.type,
        createdAt: now,
        updatedAt: now,
      };
      const { insertedId } = await db.collection<Omit<Item, "_id">>("items").insertOne(doc);
      return jsonOk({ item: { _id: insertedId, ...doc } }, { status: 201 });
    }

    const parsed = createItemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, "INVALID_INPUT", "Invalid item data");
    }
    const input = parsed.data;
    if (input.type === "link") {
      const meta = await fetchLinkMetadata(input.url);
      const fallbackTitle = new URL(input.url).hostname || input.url;
      const doc: InsertItem = {
        type: "link",
        title: input.title ?? meta.title ?? fallbackTitle,
        url: input.url,
        description: input.description ?? meta.description,
        thumbnail: meta.thumbnail,
        favicon: meta.favicon,
        domain: meta.domain || fallbackTitle,
        tags: normalizedTags(input.tags),
        collectionId: input.collectionId ?? null,
        note: input.note ?? null,
        canEmbed: meta.canEmbed,
        fileRef: null,
        fileType: null,
        createdAt: now,
        updatedAt: now,
      };
      const { insertedId } = await db.collection<Omit<Item, "_id">>("items").insertOne(doc);
      return jsonOk({ item: { _id: insertedId, ...doc } }, { status: 201 });
    }

    const doc: InsertItem = {
      type: "note",
      title: input.title ?? "Untitled note",
      url: null,
      description: null,
      thumbnail: null,
      favicon: null,
      domain: null,
      tags: normalizedTags(input.tags),
      collectionId: input.collectionId ?? null,
      note: input.body,
      canEmbed: "unknown",
      fileRef: null,
      fileType: null,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await db.collection<Omit<Item, "_id">>("items").insertOne(doc);
    return jsonOk({ item: { _id: insertedId, ...doc } }, { status: 201 });
  } catch (error) {
    console.error("create item failed:", (error as Error).message);
    return jsonError(500, "DATABASE_ERROR", "Database unavailable");
  }
}
