import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const source = process.env.DATABASE_PATH || resolve("storage/codestartrail.sqlite");
const target = process.argv[2];
if (!target) throw new Error("Usage: npm run db:backup -- /absolute/path/backup.sqlite");
mkdirSync(dirname(resolve(target)), { recursive: true });
const db = new Database(source, { readonly: true, fileMustExist: true });
try { await db.backup(resolve(target)); console.log(`Backup complete: ${resolve(target)}`); } finally { db.close(); }
