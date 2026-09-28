import type {
  Learner,
  PublicProblem,
  Recommendation,
  TrainingEvidence,
} from "./types";

export interface RecommendationEngine {
  recommend(
    user: Learner,
    problems: PublicProblem[],
    history: TrainingEvidence[],
  ): Recommendation;
}
export class DemoRecommendationEngine implements RecommendationEngine {
  recommend(
    user: Learner,
    problems: PublicProblem[],
    history: TrainingEvidence[],
  ): Recommendation {
    const done = new Set(
      history.filter((h) => h.verdict === "AC").map((h) => h.problemId),
    );
    const usable = history.filter(
      (h) => !["SYSTEM_ERROR", "PENDING"].includes(h.verdict),
    );
    const last = usable[0];
    const failures =
      usable.slice(0, 2).length === 2 &&
      usable.slice(0, 2).every((h) => ["WA", "TLE"].includes(h.verdict));
    let target = last ? Math.min(user.difficulty, last.difficulty) : 1;
    let reason = "先从一道基础题开始，了解你的输入输出与实现习惯。";
    if (last?.verdict === "AC") {
      const canAdvance =
        last.hintLevel === 0 &&
        last.elapsedSeconds <= last.estimatedMinutes * 90;
      target = canAdvance
        ? Math.min(4, last.difficulty + 1, user.difficulty + 1)
        : Math.max(user.difficulty, last.difficulty);
      reason = canAdvance
        ? "上一题通过且未使用站内提示，用时在估计范围内；下一题最多增加一级难度。"
        : "上一题已经通过；结合提示使用和训练用时，先保持难度巩固实现。";
    }
    if (failures) {
      target = Math.min(target, last.difficulty);
      reason =
        "最近两次提交出现 WA / TLE，优先用同标签、较低或相同难度的题巩固。";
    }
    const goalTags: Record<string, string[]> = {
      程序设计基础: ["输入输出", "条件", "循环", "数组", "字符串"],
      数据结构与算法: ["数组", "排序", "二分", "哈希", "栈", "队列"],
      竞赛训练: ["图", "搜索", "贪心", "动态规划"],
      算法面试: ["数组", "字符串", "哈希", "二分"],
      课程实践: ["循环", "数组", "排序"],
    };
    const weak = usable
      .slice(0, 8)
      .filter((h) => ["WA", "TLE", "RE"].includes(h.verdict))
      .flatMap((h) => h.tags);
    const pool = problems.filter(
      (p) => !done.has(p.id) && p.difficulty <= target,
    );
    const score = (p: PublicProblem) =>
      Math.abs(p.difficulty - target) * 100 +
      (p.estimatedMinutes > user.dailyMinutes ? 25 : 0) -
      p.tags.filter((t) =>
        (goalTags[user.goal] || goalTags["程序设计基础"]).includes(t),
      ).length *
        4 -
      p.tags.filter((t) => weak.includes(t)).length * 8 -
      (failures && p.tags.some((t) => last.tags.includes(t)) ? 30 : 0) +
      (failures && p.id === last.problemId ? 3 : 0);
    pool.sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id));
    const problem = pool[0] || null;
    return {
      problem,
      targetDifficulty: target,
      reason: problem
        ? reason
        : done.size === problems.length
          ? "当前 Demo 题库已全部通过。可以回看记录与复盘。"
          : "当前难度内的题已全部通过，可以在“我的”调整难度继续训练。",
      basis: [
        `目标：${user.goal}`,
        `已通过 ${done.size} 题；推荐排除这些题`,
        `当前建议难度 ≤ ${target} / 5；每日 ${user.dailyMinutes} 分钟`,
        ...(last
          ? [
              `最近结果 ${last.verdict}，最高 Hint ${last.hintLevel}，训练 ${Math.round(last.elapsedSeconds / 60)} 分钟`,
            ]
          : ["还没有有效提交记录"]),
      ],
    };
  }
}
