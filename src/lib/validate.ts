import { ObjectId } from "mongodb";
import { z } from "zod";

export const objectIdSchema = z
  .string()
  .refine((value) => ObjectId.isValid(value))
  .transform((value) => new ObjectId(value));

export const itemTypeSchema = z.enum(["link", "note", "file"]);

const httpUrlSchema = z
  .url()
  .max(2048)
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Only http(s) URLs are allowed",
  });

const tagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .optional();

const baseItemFields = {
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  collectionId: objectIdSchema.nullable().optional(),
  tags: tagsSchema,
  note: z.string().max(100_000).nullable().optional(),
};

export const createItemSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("link"),
    url: httpUrlSchema,
    ...baseItemFields,
  }),
  z.strictObject({
    type: z.literal("note"),
    body: z.string().min(1).max(100_000),
    ...baseItemFields,
  }),
]);

export const updateItemSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    url: httpUrlSchema.optional(),
    body: z.string().min(1).max(100_000).optional(),
    collectionId: objectIdSchema.nullable().optional(),
    tags: tagsSchema,
    note: z.string().max(100_000).nullable().optional(),
    canEmbed: z.enum(["unknown", "yes", "no"]).optional(),
  })
  .refine((value) => !(value.url && value.body), {
    message: "Provide either url (link) or body (note), not both",
  });

export const createCollectionSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  parentId: objectIdSchema.nullable().optional(),
  icon: z.string().trim().max(64).nullable().optional(),
  order: z.number().int().min(0).max(1_000_000).optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const listItemsQuerySchema = z
  .strictObject({
    collectionId: objectIdSchema.optional(),
    type: itemTypeSchema.optional(),
    tag: z.string().trim().min(1).max(40).optional(),
    domain: z.string().trim().min(1).max(255).optional(),
    q: z.string().trim().min(1).max(200).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    skip: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export function normalizedTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim()))];
}

export const ALLOWED_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // SPEC.md §5.3, configurable later

export function isAllowedFileType(mime: string): boolean {
  if (mime.startsWith("text/")) {
    return true;
  }
  return ALLOWED_FILE_MIME_TYPES.has(mime);
}
