import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";
import { seed } from "./seed";

export function openDatabase(filename: string) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: resolve(
      process.env.APP_ROOT || process.cwd(),
      "migrations",
    ),
  });
  seed(db);
  return db;
}
export type DB = ReturnType<typeof drizzle<typeof schema>>;
const globalDB = globalThis as typeof globalThis & {
  startrailDB?: ReturnType<typeof openDatabase>;
};
export function getDb() {
  return (globalDB.startrailDB ??= openDatabase(
    process.env.DATABASE_PATH ||
      resolve(process.cwd(), "storage/codestartrail.sqlite"),
  ));
}
