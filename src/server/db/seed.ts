import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { DB } from "./index";
import * as s from "./schema";
import type { ProblemPackage, PublicProblem } from "@/lib/v2/types";

const testcase = z.object({
  input: z.string().max(250_000),
  output: z.string().max(250_000),
});
const packageSchema = z.object({
  id: z.string().regex(/^p\d{2}$/),
  slug: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  inputDescription: z.string().min(1),
  outputDescription: z.string().min(1),
  samples: z.array(testcase).min(1).max(2),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string()).min(1),
  timeLimitMs: z.number().int().min(100).max(2000),
  memoryLimitMb: z.number().int().min(16).max(256),
  estimatedMinutes: z.number().int().positive(),
  objective: z.string(),
  source: z.string(),
  version: z.number().int().positive(),
  hints: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  solutionOutline: z.string().min(1),
  hiddenTests: z.array(testcase).min(6).max(12),
});
export function readPackages(): ProblemPackage[] {
  const directory = resolve(
    process.env.APP_ROOT || process.cwd(),
    "problem-packages",
  );
  const items = readdirSync(directory)
    .filter((n) => n.endsWith(".json"))
    .sort()
    .map((n) =>
      packageSchema.parse(
        JSON.parse(readFileSync(resolve(directory, n), "utf8")),
      ),
    );
  if (
    items.length < 24 ||
    new Set(items.map((p) => p.id)).size !== items.length ||
    new Set(items.map((p) => p.slug)).size !== items.length
  )
    throw new Error("题包数量不足或 ID 重复");
  return items;
}
export function publicContent(p: ProblemPackage): PublicProblem {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    inputDescription: p.inputDescription,
    outputDescription: p.outputDescription,
    samples: p.samples,
    difficulty: p.difficulty,
    tags: p.tags,
    timeLimitMs: p.timeLimitMs,
    memoryLimitMb: p.memoryLimitMb,
    estimatedMinutes: p.estimatedMinutes,
    objective: p.objective,
    source: p.source,
    version: p.version,
  };
}
export function seed(db: DB) {
  const packages = readPackages();
  db.transaction((tx) => {
    tx.insert(s.teams)
      .values({ id: "demo-team", name: "星轨训练小组" })
      .onConflictDoNothing()
      .run();
    const names = [
      "Student Demo",
      "林同学",
      "陈同学",
      "周同学",
      "许同学",
      "吴同学",
      "Coach Demo",
    ];
    names.forEach((name, i) => {
      const id = i === 6 ? "coach" : i === 0 ? "student" : `student-${i}`;
      tx.insert(s.users)
        .values({
          id,
          name,
          role: i === 6 ? "coach" : "student",
          goal: "程序设计基础",
          difficulty: 1,
          dailyMinutes: 30,
        })
        .onConflictDoNothing()
        .run();
      tx.insert(s.teamMembers)
        .values({ teamId: "demo-team", userId: id })
        .onConflictDoNothing()
        .run();
    });
    for (const p of packages) {
      const existing = tx
        .select()
        .from(s.problems)
        .where(eq(s.problems.id, p.id))
        .get();
      if (existing) {
        // 内容修订不能静默改变已有场次的判题标准；新版本使用新题 ID。
        if (
          JSON.stringify(existing.content) !==
            JSON.stringify(publicContent(p)) ||
          JSON.stringify(existing.hints) !== JSON.stringify(p.hints) ||
          existing.solutionOutline !== p.solutionOutline
        )
          throw new Error(
            `题包 ${p.id} 已存在不同内容，请使用新的题目 ID 发布修订`,
          );
        const tests = tx
          .select()
          .from(s.testCases)
          .where(eq(s.testCases.problemId, p.id))
          .orderBy(s.testCases.ordinal)
          .all();
        if (
          JSON.stringify(
            tests.map((t) => ({ input: t.input, output: t.output })),
          ) !== JSON.stringify(p.hiddenTests)
        )
          throw new Error(`题包 ${p.id} 测试发生变化，请使用新 ID`);
        continue;
      }
      tx.insert(s.problems)
        .values({
          id: p.id,
          slug: p.slug,
          content: publicContent(p),
          hints: p.hints,
          solutionOutline: p.solutionOutline,
        })
        .run();
      tx.insert(s.testCases)
        .values(
          p.hiddenTests.map((t, ordinal) => ({
            ...t,
            problemId: p.id,
            ordinal,
          })),
        )
        .run();
    }
    // 合成记录仅给另外五位演示成员；默认 Student Demo 始终从空历史开始。
    for (let i = 1; i <= 4; i++) {
      const id = `seed-training-${i}`;
      if (
        tx
          .select()
          .from(s.trainingRecords)
          .where(eq(s.trainingRecords.id, id))
          .get()
      )
        continue;
      const now = Date.now() - i * 86400_000;
      const problemId = `p0${i}`;
      tx.insert(s.trainingRecords)
        .values({
          id,
          userId: `student-${i}`,
          problemId,
          startedAt: now - 600_000,
          endedAt: now,
          elapsedSeconds: 600,
          status: i % 2 ? "ac" : "unfinished",
          source: "seed",
        })
        .run();
      tx.insert(s.submissions)
        .values({
          id: `seed-submission-${i}`,
          userId: `student-${i}`,
          problemId,
          trainingId: id,
          requestId: `seed-${i}`,
          codeHash: "seed",
          mode: "submit",
          verdict: i % 2 ? "AC" : "WA",
          createdAt: now,
          finishedAt: now,
          source: "seed",
        })
        .run();
    }
  });
}
