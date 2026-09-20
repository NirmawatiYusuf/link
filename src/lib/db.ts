import "server-only";
import { MongoClient, type Db } from "mongodb";

const DB_NAME = process.env.MONGODB_DB ?? "linkforge";

declare global {
  // Reuse one client across hot reloads in dev.
  var __linkforgeMongo: { client: MongoClient; db: Db } | undefined;
  var __linkforgeIndexes: boolean | undefined;
}

/** Recommended indexes (SPEC.md §6.2), created once per process. */
export async function ensureIndexes(db: Db): Promise<void> {
  if (globalThis.__linkforgeIndexes) {
    return;
  }
  globalThis.__linkforgeIndexes = true;
  await Promise.all([
    db.collection("items").createIndex({ title: "text", description: "text", note: "text" }),
    db.collection("items").createIndex({ collectionId: 1, createdAt: -1 }),
    db.collection("items").createIndex({ type: 1, createdAt: -1 }),
    db.collection("items").createIndex({ createdAt: -1 }),
    db.collection("collections").createIndex({ parentId: 1 }),
    db.collection("collections").createIndex({ order: 1 }),
  ]);
}

export async function getDb(): Promise<Db> {
  const cached = globalThis.__linkforgeMongo;
  if (cached) {
    return cached.db;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set (see .env.example)");
  }

  const client = new MongoClient(uri);
  const db = client.db(DB_NAME);
  globalThis.__linkforgeMongo = { client, db };
  return db;
}

/** getDb + schema indexes for CRUD routes. */
export async function getDbReady(): Promise<Db> {
  const db = await getDb();
  await ensureIndexes(db);
  return db;
}
