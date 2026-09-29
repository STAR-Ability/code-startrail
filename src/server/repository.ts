import { and, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { getDb, type DB } from "./db";
import * as s from "./db/schema";
import { DemoRecommendationEngine } from "@/lib/v2/recommendation";
import { MockTrainingAgent } from "@/lib/v2/agent";
import type { JudgeResult, Learner, StuckType } from "@/lib/v2/types";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function repository(db: DB = getDb()) {
  const user = (id: string) => {
    const u = db.select().from(s.users).where(eq(s.users.id, id)).get();
    if (!u) throw new AppError(404, "用户不存在");
    return u;
  };
  const privateProblem = (id: string) => {
    const p = db.select().from(s.problems).where(eq(s.problems.id, id)).get();
    if (!p) throw new AppError(404, "题目不存在");
    return p;
  };
  const problem = (id: string) => privateProblem(id).content;
  function recover() {
    db.update(s.submissions)
      .set({
        verdict: "SYSTEM_ERROR",
        finishedAt: Date.now(),
        result: {
          verdict: "SYSTEM_ERROR",
          passed: 0,
          total: 0,
          timeMs: 0,
          memoryKb: 0,
          message: "上次判题中断，请重新提交。",
        },
      })
      .where(
        and(
          eq(s.submissions.verdict, "PENDING"),
          lt(s.submissions.createdAt, Date.now() - 120_000),
        ),
      )
      .run();
  }
  function history(userId: string) {
    recover();
    const records = db
      .select({ record: s.trainingRecords, content: s.problems.content })
      .from(s.trainingRecords)
      .innerJoin(s.problems, eq(s.trainingRecords.problemId, s.problems.id))
      .where(eq(s.trainingRecords.userId, userId))
      .orderBy(desc(s.trainingRecords.startedAt))
      .all();
    const attempts = db
      .select()
      .from(s.submissions)
      .where(
        and(eq(s.submissions.userId, userId), eq(s.submissions.mode, "submit")),
      )
      .orderBy(desc(s.submissions.createdAt))
      .all();
    return records.map(({ record, content }) => ({
      ...record,
      problem: content,
      submissions: attempts.filter((a) => a.trainingId === record.id),
    }));
  }
  function recommend(userId: string, persist = false) {
    const learner = user(userId);
    const all = db
      .select({ content: s.problems.content })
      .from(s.problems)
      .all()
      .map((p) => p.content);
    const evidence = history(userId)
      .flatMap((r) =>
        r.submissions.map((a) => ({
          problemId: r.problemId,
          verdict: a.verdict,
          difficulty: r.problem.difficulty,
          tags: r.problem.tags,
          hintLevel: r.hintLevel,
          elapsedSeconds: r.elapsedSeconds,
          estimatedMinutes: r.problem.estimatedMinutes,
          createdAt: a.createdAt,
        })),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
    const value = new DemoRecommendationEngine().recommend(
      learner,
      all,
      evidence,
    );
    if (persist) {
      db.update(s.users)
        .set({ difficulty: value.targetDifficulty })
        .where(eq(s.users.id, userId))
        .run();
      const last = db
        .select()
        .from(s.recommendations)
        .where(eq(s.recommendations.userId, userId))
        .orderBy(desc(s.recommendations.createdAt))
        .get();
      if (
        last?.problemId !== (value.problem?.id || null) ||
        last.reason !== value.reason ||
        JSON.stringify(last.basis) !== JSON.stringify(value.basis)
      )
        db.insert(s.recommendations)
          .values({
            id: randomUUID(),
            userId,
            problemId: value.problem?.id || null,
            reason: value.reason,
            basis: value.basis,
            createdAt: Date.now(),
          })
          .run();
    }
    return value;
  }
  function start(userId: string, problemId: string) {
    problem(problemId);
    return db.transaction((tx) => {
      const active = tx
        .select()
        .from(s.trainingRecords)
        .where(
          and(
            eq(s.trainingRecords.userId, userId),
            eq(s.trainingRecords.problemId, problemId),
            eq(s.trainingRecords.status, "active"),
          ),
        )
        .get();
      if (active) return active;
      const id = randomUUID();
      // 保留同题最高帮助暴露；刷新、结束重开不能清除已看过的提示。
      const exposure = tx
        .select({ max: sql<number>`coalesce(max(${s.agentSessions.level}),0)` })
        .from(s.agentSessions)
        .where(
          and(
            eq(s.agentSessions.userId, userId),
            eq(s.agentSessions.problemId, problemId),
          ),
        )
        .get()!.max;
      return tx
        .insert(s.trainingRecords)
        .values({
          id,
          userId,
          problemId,
          startedAt: Date.now(),
          hintLevel: exposure,
        })
        .returning()
        .get();
    });
  }
  function training(userId: string, id: string) {
    const r = db
      .select()
      .from(s.trainingRecords)
      .where(
        and(eq(s.trainingRecords.id, id), eq(s.trainingRecords.userId, userId)),
      )
      .get();
    if (!r) throw new AppError(404, "训练记录不存在");
    return r;
  }
  function saveTime(userId: string, id: string, seconds: number) {
    const r = training(userId, id);
    if (r.status !== "active") return r;
    const elapsedSeconds = Math.min(
      Math.max(seconds, r.elapsedSeconds),
      Math.floor((Date.now() - r.startedAt) / 1000),
    );
    return db
      .update(s.trainingRecords)
      .set({ elapsedSeconds })
      .where(eq(s.trainingRecords.id, id))
      .returning()
      .get();
  }
  function reserve(
    userId: string,
    input: {
      trainingId: string;
      code: string;
      mode: "sample" | "submit";
      requestId: string;
      seconds: number;
    },
  ) {
    recover();
    return db.transaction((tx) => {
      const codeHash = createHash("sha256").update(input.code).digest("hex");
      const previous = tx
        .select()
        .from(s.submissions)
        .where(
          and(
            eq(s.submissions.userId, userId),
            eq(s.submissions.requestId, input.requestId),
          ),
        )
        .get();
      if (previous) {
        if (
          previous.codeHash !== codeHash ||
          previous.mode !== input.mode ||
          previous.trainingId !== input.trainingId
        )
          throw new AppError(409, "请求编号已被其他提交使用");
        return { submission: previous, reused: true };
      }
      const r = training(userId, input.trainingId);
      if (r.status !== "active")
        throw new AppError(409, "本次训练已结束，请开始新的训练");
      const pending = tx
        .select({ userId: s.submissions.userId })
        .from(s.submissions)
        .where(eq(s.submissions.verdict, "PENDING"))
        .all();
      if (pending.some((a) => a.userId === userId) || pending.length >= 2)
        throw new AppError(429, "判题正在进行，请稍后重试");
      const recent = tx
        .select({ count: count() })
        .from(s.submissions)
        .where(
          and(
            eq(s.submissions.userId, userId),
            sql`${s.submissions.createdAt} > ${Date.now() - 60_000}`,
          ),
        )
        .get()!.count;
      if (recent >= 15) throw new AppError(429, "提交过于频繁，请稍后重试");
      saveTime(userId, r.id, input.seconds);
      const submission = tx
        .insert(s.submissions)
        .values({
          id: randomUUID(),
          userId,
          trainingId: r.id,
          problemId: r.problemId,
          mode: input.mode,
          requestId: input.requestId,
          codeHash,
          verdict: "PENDING",
          createdAt: Date.now(),
        })
        .returning()
        .get();
      return { submission, reused: false };
    });
  }
  function complete(id: string, result: JudgeResult) {
    const a = db
      .select()
      .from(s.submissions)
      .where(eq(s.submissions.id, id))
      .get();
    if (!a) throw new AppError(404, "提交不存在");
    db.transaction((tx) => {
      if (a.verdict !== "PENDING") return;
      tx.update(s.submissions)
        .set({ result, verdict: result.verdict, finishedAt: Date.now() })
        .where(
          and(eq(s.submissions.id, id), eq(s.submissions.verdict, "PENDING")),
        )
        .run();
      if (a.mode === "submit" && result.verdict === "AC") {
        tx.update(s.trainingRecords)
          .set({ status: "ac", endedAt: Date.now() })
          .where(eq(s.trainingRecords.id, a.trainingId))
          .run();
      }
    });
    if (a.mode === "submit" && result.verdict !== "SYSTEM_ERROR")
      recommend(a.userId, true);
    return db
      .select()
      .from(s.submissions)
      .where(eq(s.submissions.id, id))
      .get()!;
  }
  function hint(
    userId: string,
    input: {
      trainingId: string;
      stuckType: StuckType;
      action: "next" | "review";
      requestId: string;
    },
  ) {
    return db.transaction((tx) => {
      const prev = tx
        .select()
        .from(s.agentSessions)
        .where(
          and(
            eq(s.agentSessions.userId, userId),
            eq(s.agentSessions.requestId, input.requestId),
          ),
        )
        .get();
      if (prev) {
        if (
          prev.trainingId !== input.trainingId ||
          prev.stuckType !== input.stuckType ||
          (prev.level === 4) !== (input.action === "review")
        )
          throw new AppError(409, "提示请求编号冲突");
        return prev;
      }
      const r = training(userId, input.trainingId);
      if (r.status !== "active") throw new AppError(409, "本次训练已结束");
      const level =
        input.action === "review" ? 4 : Math.min(3, r.hintLevel + 1);
      if (input.action === "next" && r.hintLevel >= 3)
        throw new AppError(409, "已获得三级提示；可继续尝试或明确选择复盘");
      const p = privateProblem(r.problemId);
      const latest = tx
        .select()
        .from(s.submissions)
        .where(eq(s.submissions.trainingId, r.id))
        .orderBy(desc(s.submissions.createdAt))
        .get();
      const content = new MockTrainingAgent().hint({
        problem: {
          ...p.content,
          hints: p.hints,
          solutionOutline: p.solutionOutline,
        },
        stuckType: input.stuckType,
        level,
        lastVerdict: latest?.verdict,
      });
      const result = tx
        .insert(s.agentSessions)
        .values({
          id: randomUUID(),
          trainingId: r.id,
          userId,
          problemId: r.problemId,
          requestId: input.requestId,
          level,
          stuckType: input.stuckType,
          content,
          lastVerdict: latest?.verdict,
          createdAt: Date.now(),
        })
        .returning()
        .get();
      tx.update(s.trainingRecords)
        .set({
          hintLevel: Math.max(level, r.hintLevel),
          hintCount: r.hintCount + 1,
        })
        .where(eq(s.trainingRecords.id, r.id))
        .run();
      return result;
    });
  }
  function finish(userId: string, id: string, seconds: number) {
    saveTime(userId, id, seconds);
    const r = training(userId, id);
    if (r.status !== "active") return r;
    if (
      db
        .select()
        .from(s.submissions)
        .where(
          and(
            eq(s.submissions.trainingId, id),
            eq(s.submissions.verdict, "PENDING"),
          ),
        )
        .get()
    )
      throw new AppError(409, "请等待当前判题结束");
    db.update(s.trainingRecords)
      .set({ status: "unfinished", endedAt: Date.now() })
      .where(eq(s.trainingRecords.id, id))
      .run();
    recommend(userId, true);
    return training(userId, id);
  }
  function studentDetail(coachId: string, studentId: string) {
    if (user(coachId).role !== "coach")
      throw new AppError(403, "请切换 Coach Demo");
    const own = db
      .select()
      .from(s.teamMembers)
      .where(eq(s.teamMembers.userId, coachId))
      .all();
    if (
      !own.length ||
      !db
        .select()
        .from(s.teamMembers)
        .where(
          and(
            eq(s.teamMembers.userId, studentId),
            inArray(
              s.teamMembers.teamId,
              own.map((t) => t.teamId),
            ),
          ),
        )
        .get() ||
      user(studentId).role !== "student"
    )
      throw new AppError(404, "成员不存在");
    return {
      user: user(studentId),
      history: history(studentId),
      recommendation: recommend(studentId),
      hints: db
        .select({
          id: s.agentSessions.id,
          level: s.agentSessions.level,
          stuckType: s.agentSessions.stuckType,
          problemId: s.agentSessions.problemId,
          createdAt: s.agentSessions.createdAt,
        })
        .from(s.agentSessions)
        .where(eq(s.agentSessions.userId, studentId))
        .orderBy(desc(s.agentSessions.createdAt))
        .all(),
    };
  }
  function team(coachId: string) {
    if (user(coachId).role !== "coach")
      throw new AppError(403, "请切换 Coach Demo");
    const groups = db
      .select()
      .from(s.teamMembers)
      .where(eq(s.teamMembers.userId, coachId))
      .all();
    const ids = groups.length
      ? db
          .select({ id: s.teamMembers.userId })
          .from(s.teamMembers)
          .innerJoin(s.users, eq(s.users.id, s.teamMembers.userId))
          .where(
            and(
              inArray(
                s.teamMembers.teamId,
                groups.map((g) => g.teamId),
              ),
              eq(s.users.role, "student"),
            ),
          )
          .all()
      : [];
    return ids.map(({ id }) => studentDetail(coachId, id));
  }
  return {
    now: () => Date.now(),
    user,
    problem,
    history,
    recommend,
    start,
    training,
    saveTime,
    reserve,
    complete,
    hint,
    finish,
    team,
    studentDetail,
    tests: (id: string) =>
      db
        .select({ input: s.testCases.input, output: s.testCases.output })
        .from(s.testCases)
        .where(eq(s.testCases.problemId, id))
        .orderBy(s.testCases.ordinal)
        .all(),
    hints: (userId: string, id: string) => {
      training(userId, id);
      return db
        .select()
        .from(s.agentSessions)
        .where(eq(s.agentSessions.trainingId, id))
        .orderBy(s.agentSessions.createdAt)
        .all();
    },
    attempts: (userId: string, id: string) => {
      training(userId, id);
      recover();
      return db
        .select()
        .from(s.submissions)
        .where(eq(s.submissions.trainingId, id))
        .orderBy(desc(s.submissions.createdAt))
        .all();
    },
    recommendationHistory: (userId: string) =>
      db
        .select()
        .from(s.recommendations)
        .where(eq(s.recommendations.userId, userId))
        .orderBy(desc(s.recommendations.createdAt))
        .limit(10)
        .all(),
    updateProfile: (
      id: string,
      patch: Pick<Learner, "goal" | "difficulty" | "dailyMinutes">,
    ) =>
      db
        .update(s.users)
        .set(patch)
        .where(eq(s.users.id, id))
        .returning()
        .get()!,
  };
}
export type TrainingRow = ReturnType<ReturnType<typeof repository>["start"]>;
export type HistoryRow = ReturnType<
  ReturnType<typeof repository>["history"]
>[number];
export type SubmissionRow = ReturnType<
  ReturnType<typeof repository>["attempts"]
>[number];
export type HintRow = ReturnType<
  ReturnType<typeof repository>["hints"]
>[number];
