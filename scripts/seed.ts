import { getDb } from "../src/server/db";
import { problems, users, testCases } from "../src/server/db/schema";
const db = getDb();
console.log({
  users: db.select().from(users).all().length,
  problems: db.select().from(problems).all().length,
  hiddenTests: db.select().from(testCases).all().length,
});
