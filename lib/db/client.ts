import path from "path";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import type { Database } from "./snippets-repo";

let dbPromise: Promise<Database> | null = null;

function createNeonDb(connectionString: string): Database {
  const pool = new Pool({ connectionString });
  return drizzleNodePg(pool, { schema }) as unknown as Database;
}

/**
 * Zero-setup local dev: an embedded (WASM) Postgres persisted under
 * ./.data/pglite, migrated on first use. Mirrors the local fallback in
 * lib/storage.ts for image uploads. Never used when DATABASE_URL is set,
 * which is required in real deployments (see README "Setting up Neon").
 */
async function createLocalDevDb(): Promise<Database> {
  const { mkdir } = await import("fs/promises");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  const dataDir = path.join(process.cwd(), ".data", "pglite");
  await mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Database;
}

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      dbPromise = Promise.resolve(createNeonDb(connectionString));
    } else if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not set. See README for Neon setup steps.");
    } else {
      dbPromise = createLocalDevDb();
    }
  }
  return dbPromise;
}
