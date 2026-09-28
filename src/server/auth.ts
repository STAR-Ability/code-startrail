import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "./db";
import { demoSessions } from "./db/schema";
import { AppError, repository } from "./repository";
export async function currentUser() {
  const token = (await cookies()).get("startrail-demo")?.value;
  const session = token
    ? getDb()
        .select()
        .from(demoSessions)
        .where(
          and(
            eq(demoSessions.token, token),
            gt(demoSessions.expiresAt, Date.now()),
          ),
        )
        .get()
    : undefined;
  return repository().user(session?.userId || "student");
}
export async function requireStudent() {
  const user = await currentUser();
  if (user.role !== "student")
    throw new AppError(403, "请切换 Student Demo 后开始训练");
  return user;
}
export async function switchDemo(role: "student" | "coach") {
  const jar = await cookies();
  const previous = jar.get("startrail-demo")?.value;
  const db = getDb();
  if (previous)
    db.delete(demoSessions).where(eq(demoSessions.token, previous)).run();
  db.delete(demoSessions).where(lt(demoSessions.expiresAt, Date.now())).run();
  const token = randomBytes(32).toString("hex");
  db.insert(demoSessions)
    .values({ token, userId: role, expiresAt: Date.now() + 86400_000 })
    .run();
  jar.set("startrail-demo", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 86400,
  });
  return repository().user(role);
}
