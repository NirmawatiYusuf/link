import "server-only";
import { MongoClient, type Db } from "mongodb";

const DB_NAME = process.env.MONGODB_DB ?? "linkforge";

declare global {
  // Reuse one client across hot reloads in dev.
  var __linkforgeMongo: { client: MongoClient; db: Db } | undefined;
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
