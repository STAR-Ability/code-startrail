import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import type {
  PublicProblem,
  JudgeResult,
  StuckType,
  Verdict,
} from "@/lib/v2/types";

export const users = sqliteTable("users", {
  id: text().primaryKey(),
  name: text().notNull(),
  role: text().$type<"student" | "coach">().notNull(),
  goal: text().notNull(),
  difficulty: integer().notNull().default(1),
  dailyMinutes: integer().notNull().default(30),
});
export const problems = sqliteTable("problems", {
  id: text().primaryKey(),
  slug: text().notNull().unique(),
  content: text({ mode: "json" }).$type<PublicProblem>().notNull(),
  hints: text({ mode: "json" }).$type<[string, string, string]>().notNull(),
  solutionOutline: text().notNull(),
});
export const testCases = sqliteTable(
  "problem_test_cases",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    problemId: text()
      .notNull()
      .references(() => problems.id),
    ordinal: integer().notNull(),
    input: text().notNull(),
    output: text().notNull(),
  },
  (t) => [uniqueIndex("test_problem_order").on(t.problemId, t.ordinal)],
);
export const trainingRecords = sqliteTable(
  "training_records",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id),
    problemId: text()
      .notNull()
      .references(() => problems.id),
    startedAt: integer().notNull(),
    endedAt: integer(),
    elapsedSeconds: integer().notNull().default(0),
    status: text()
      .$type<"active" | "ac" | "unfinished">()
      .notNull()
      .default("active"),
    hintLevel: integer().notNull().default(0),
    hintCount: integer().notNull().default(0),
    source: text().$type<"live" | "seed">().notNull().default("live"),
  },
  (t) => [
    uniqueIndex("one_active_session")
      .on(t.userId, t.problemId)
      .where(sql`${t.status} = 'active'`),
    check("hint_level_range", sql`${t.hintLevel} between 0 and 4`),
  ],
);
export const submissions = sqliteTable(
  "submissions",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id),
    problemId: text()
      .notNull()
      .references(() => problems.id),
    trainingId: text()
      .notNull()
      .references(() => trainingRecords.id),
    requestId: text().notNull(),
    codeHash: text().notNull(),
    mode: text().$type<"sample" | "submit">().notNull(),
    verdict: text().$type<Verdict>().notNull(),
    result: text({ mode: "json" }).$type<JudgeResult>(),
    createdAt: integer().notNull(),
    finishedAt: integer(),
    source: text().$type<"live" | "seed">().notNull().default("live"),
  },
  (t) => [
    uniqueIndex("submission_request").on(t.userId, t.requestId),
    index("submission_history").on(t.userId, t.createdAt),
    index("submission_pending").on(t.verdict),
  ],
);
export const recommendations = sqliteTable("recommendations", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id),
  problemId: text().references(() => problems.id),
  reason: text().notNull(),
  basis: text({ mode: "json" }).$type<string[]>().notNull(),
  createdAt: integer().notNull(),
});
export const agentSessions = sqliteTable(
  "agent_sessions",
  {
    id: text().primaryKey(),
    trainingId: text()
      .notNull()
      .references(() => trainingRecords.id),
    userId: text()
      .notNull()
      .references(() => users.id),
    problemId: text()
      .notNull()
      .references(() => problems.id),
    requestId: text().notNull(),
    level: integer().notNull(),
    stuckType: text().$type<StuckType>().notNull(),
    content: text().notNull(),
    lastVerdict: text().$type<Verdict>(),
    createdAt: integer().notNull(),
  },
  (t) => [uniqueIndex("agent_request").on(t.userId, t.requestId)],
);
export const teams = sqliteTable("teams", {
  id: text().primaryKey(),
  name: text().notNull(),
});
export const teamMembers = sqliteTable(
  "team_members",
  {
    teamId: text()
      .notNull()
      .references(() => teams.id),
    userId: text()
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userId] })],
);
export const demoSessions = sqliteTable("demo_sessions", {
  token: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id),
  expiresAt: integer().notNull(),
});
