import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { openDatabase } from "../src/server/db";
import { readPackages, seed } from "../src/server/db/seed";
import { repository } from "../src/server/repository";
import { DemoRecommendationEngine } from "../src/lib/v2/recommendation";
import { MockTrainingAgent } from "../src/lib/v2/agent";
import { sameOutput, GoJudgeClient } from "../src/server/judge";
import { submissions, trainingRecords } from "../src/server/db/schema";
import type { TrainingEvidence } from "../src/lib/v2/types";

test("24 packages have private hidden tests and seed is non-destructive/idempotent", () => {
  const db = openDatabase(":memory:");
  const repo = repository(db);
  const packages = readPackages();
  assert.equal(packages.length, 24);
  assert.ok(
    packages.every((p) => p.hiddenTests.length >= 6 && p.samples.length >= 1),
  );
  const p = repo.problem("p01");
  assert.ok(!("hints" in p));
  assert.ok(!("hiddenTests" in p));
  assert.ok(!("solutionOutline" in p));
  repo.updateProfile("student", {
    goal: "算法面试",
    difficulty: 3,
    dailyMinutes: 45,
  });
  seed(db);
  assert.equal(repo.user("student").goal, "算法面试");
  assert.equal(repo.history("student").length, 0);
  assert.equal(repo.tests("p01").length, 6);
  assert.equal(repo.team("coach").length, 6);
  assert.throws(() => repo.team("student"));
  db.$client.close();
});

test("recommendations exclude AC, start at level 1 and never escalate repeated failures", () => {
  const db = openDatabase(":memory:");
  const repo = repository(db);
  const engine = new DemoRecommendationEngine();
  const user = repo.user("student");
  const problems = readPackages();
  const r = engine.recommend(user, problems, []);
  assert.equal(r.problem?.id, "p01");
  const evidence: TrainingEvidence = {
    problemId: "p01",
    verdict: "AC",
    difficulty: 1,
    tags: ["输入输出"],
    hintLevel: 0,
    elapsedSeconds: 100,
    estimatedMinutes: 10,
  };
  const next = engine.recommend(user, problems, [evidence]);
  assert.notEqual(next.problem?.id, "p01");
  assert.ok(next.problem!.difficulty <= 2);
  const helped = engine.recommend(user, problems, [
    { ...evidence, hintLevel: 3 },
  ]);
  assert.equal(helped.targetDifficulty, 1);
  const slow = engine.recommend(user, problems, [
    { ...evidence, elapsedSeconds: 2000 },
  ]);
  assert.equal(slow.targetDifficulty, 1);
  const failures = engine.recommend({ ...user, difficulty: 4 }, problems, [
    { ...evidence, verdict: "WA" },
    { ...evidence, verdict: "TLE" },
  ]);
  assert.ok(failures.problem!.difficulty <= 1);
  const all = problems.map((p) => ({ ...evidence, problemId: p.id }));
  assert.equal(engine.recommend(user, problems, all).problem, null);
  db.$client.close();
});

test("hint levels are server-owned, scoped, persisted across retries and new sessions", () => {
  const db = openDatabase(":memory:");
  const repo = repository(db);
  const r = repo.start("student", "p01");
  assert.equal(repo.start("student", "p01").id, r.id);
  assert.throws(() => repo.training("student-1", r.id));
  const input = {
    trainingId: r.id,
    stuckType: "WA" as const,
    action: "next" as const,
    requestId: randomUUID(),
  };
  const hint = repo.hint("student", input);
  assert.equal(hint.level, 1);
  assert.equal(repo.hint("student", input).id, hint.id);
  assert.equal(repo.training("student", r.id).hintCount, 1);
  assert.ok(!hint.content.includes(readPackages()[0].solutionOutline));
  assert.equal(
    repo.hint("student", { ...input, requestId: randomUUID() }).level,
    2,
  );
  assert.equal(
    repo.hint("student", { ...input, requestId: randomUUID() }).level,
    3,
  );
  assert.throws(() =>
    repo.hint("student", { ...input, requestId: randomUUID() }),
  );
  const review = repo.hint("student", {
    ...input,
    action: "review",
    requestId: randomUUID(),
  });
  assert.equal(review.level, 4);
  assert.ok(review.content.includes(readPackages()[0].solutionOutline));
  repo.finish("student", r.id, 0);
  const next = repo.start("student", "p01");
  assert.notEqual(next.id, r.id);
  assert.equal(next.hintLevel, 4);
  assert.throws(() =>
    repo.hint("student", {
      ...input,
      trainingId: next.id,
      requestId: randomUUID(),
    }),
  );
  db.$client.close();
});

test("submission retries, concurrency, system failure and sample AC cannot forge completion", () => {
  const db = openDatabase(":memory:");
  const repo = repository(db);
  const r = repo.start("student", "p01");
  const input = {
    trainingId: r.id,
    mode: "sample" as const,
    requestId: randomUUID(),
    code: "int main(){}",
    seconds: 999999,
  };
  const a = repo.reserve("student", input);
  assert.equal(repo.reserve("student", input).reused, true);
  assert.throws(() =>
    repo.reserve("student", { ...input, requestId: randomUUID() }),
  );
  assert.throws(() => repo.reserve("student", { ...input, code: "different" }));
  assert.throws(() => repo.finish("student", r.id, 0));
  repo.complete(a.submission.id, {
    verdict: "AC",
    passed: 2,
    total: 2,
    timeMs: 1,
    memoryKb: 1,
  });
  assert.equal(repo.training("student", r.id).status, "active");
  assert.equal(repo.history("student")[0].submissions.length, 0);
  assert.ok(repo.training("student", r.id).elapsedSeconds < 2);
  const failure = repo.reserve("student", {
    ...input,
    mode: "submit",
    requestId: randomUUID(),
  });
  repo.complete(failure.submission.id, {
    verdict: "SYSTEM_ERROR",
    passed: 0,
    total: 8,
    timeMs: 0,
    memoryKb: 0,
  });
  assert.equal(repo.recommend("student").problem?.id, "p01");
  const submit = repo.reserve("student", {
    ...input,
    mode: "submit",
    requestId: randomUUID(),
  });
  repo.complete(submit.submission.id, {
    verdict: "AC",
    passed: 8,
    total: 8,
    timeMs: 2,
    memoryKb: 10,
  });
  assert.equal(repo.training("student", r.id).status, "ac");
  assert.notEqual(repo.recommend("student").problem?.id, "p01");
  assert.equal(
    repo.studentDetail("coach", "student").history[0].submissions.length,
    2,
  );
  assert.throws(() => repo.studentDetail("student", "student-1"));
  db.$client.close();
});

test("abandoned pending jobs become system errors and permit retry", () => {
  const db = openDatabase(":memory:");
  const repo = repository(db);
  const r = repo.start("student", "p01");
  const a = repo.reserve("student", {
    trainingId: r.id,
    code: "a",
    mode: "submit",
    seconds: 0,
    requestId: randomUUID(),
  });
  db.update(submissions)
    .set({ createdAt: Date.now() - 130000 })
    .where(eq(submissions.id, a.submission.id))
    .run();
  assert.equal(
    repo.history("student")[0].submissions[0].verdict,
    "SYSTEM_ERROR",
  );
  assert.equal(
    repo.reserve("student", {
      trainingId: r.id,
      code: "a",
      mode: "submit",
      seconds: 0,
      requestId: randomUUID(),
    }).reused,
    false,
  );
  assert.throws(() =>
    db
      .update(trainingRecords)
      .set({ hintLevel: 5 })
      .where(eq(trainingRecords.id, r.id))
      .run(),
  );
  db.$client.close();
});

test("each preset Agent is problem-specific and stdout comparison is token exact", () => {
  for (const problem of readPackages())
    for (let level = 1; level <= 3; level++) {
      const text = new MockTrainingAgent().hint({
        problem,
        level,
        stuckType: "TLE",
        lastVerdict: "TLE",
      });
      assert.ok(text.includes(problem.hints[level - 1]));
      assert.ok(!text.includes(problem.solutionOutline));
    }
  assert.ok(sameOutput(" 1\r\n2  ", "1 2"));
  assert.ok(!sameOutput("1 23", "12 3"));
  assert.ok(sameOutput(" \n", ""));
  assert.ok(!sameOutput("answer: 3", "3"));
});

test("unavailable execution service is a system error, never fake AC/CE", async () => {
  const p = readPackages()[0];
  const result = await new GoJudgeClient("http://127.0.0.1:1").judge(
    "int main(){}",
    p,
    p.samples,
    "sample",
  );
  assert.equal(result.verdict, "SYSTEM_ERROR");
});

test("training survives database reopen and an online backup restores a consistent snapshot", async () => {
  const directory = mkdtempSync(join(tmpdir(), "startrail-backup-"));
  try {
    const file = join(directory, "live.sqlite");
    const db = openDatabase(file);
    const repo = repository(db);
    const training = repo.start("student", "p03");
    repo.hint("student", {
      trainingId: training.id,
      stuckType: "题意没看懂",
      action: "next",
      requestId: randomUUID(),
    });
    await db.$client.backup(join(directory, "backup.sqlite"));
    db.$client.close();
    const reopened = openDatabase(file);
    assert.equal(
      repository(reopened).training("student", training.id).hintLevel,
      1,
    );
    reopened.$client.close();
    const restored = openDatabase(join(directory, "backup.sqlite"));
    assert.equal(
      restored.$client.pragma("integrity_check", { simple: true }),
      "ok",
    );
    assert.equal(repository(restored).hints("student", training.id).length, 1);
    restored.$client.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
