import type { ObjectId } from "mongodb";

export type ItemType = "link" | "note" | "file";
export type EmbedStatus = "unknown" | "yes" | "no";

/** Mirror of the `collections` collection (SPEC.md §6.1). */
export interface Collection {
  _id: ObjectId;
  name: string;
  parentId: ObjectId | null;
  icon: string | null;
  order: number;
  createdAt: Date;
}

/** Mirror of the `items` collection (SPEC.md §6.1). */
export interface Item {
  _id: ObjectId;
  type: ItemType;
  title: string;
  url: string | null;
  description: string | null;
  thumbnail: string | null;
  favicon: string | null;
  domain: string | null;
  tags: string[];
  collectionId: ObjectId | null;
  note: string | null;
  canEmbed: EmbedStatus;
  fileRef: string | null;
  fileType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Mirror of the `settings` collection (SPEC.md §6.1). */
export interface Settings {
  _id: ObjectId;
  passwordHash: string;
  defaultLocale: string;
  theme: string;
  updatedAt: Date;
}
