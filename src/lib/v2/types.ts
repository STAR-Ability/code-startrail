export const goals = [
  "程序设计基础",
  "数据结构与算法",
  "竞赛训练",
  "算法面试",
  "课程实践",
] as const;
export const stuckTypes = [
  "题意没看懂",
  "不知道怎么开始",
  "有思路但不会写",
  "编译错误",
  "运行错误",
  "WA",
  "TLE",
  "想确认思路",
  "其他",
] as const;
export type StuckType = (typeof stuckTypes)[number];
export type Verdict =
  | "PENDING"
  | "AC"
  | "WA"
  | "CE"
  | "TLE"
  | "RE"
  | "MLE"
  | "OLE"
  | "SYSTEM_ERROR";
export type TestCase = { input: string; output: string };
export interface PublicProblem {
  id: string;
  slug: string;
  title: string;
  description: string;
  inputDescription: string;
  outputDescription: string;
  samples: TestCase[];
  difficulty: number;
  tags: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  estimatedMinutes: number;
  objective: string;
  source: string;
  version: number;
}
export interface ProblemPackage extends PublicProblem {
  hints: [string, string, string];
  solutionOutline: string;
  hiddenTests: TestCase[];
}
export interface Learner {
  id: string;
  name: string;
  role: "student" | "coach";
  goal: string;
  difficulty: number;
  dailyMinutes: number;
}
export interface TrainingEvidence {
  problemId: string;
  verdict: Verdict;
  difficulty: number;
  tags: string[];
  hintLevel: number;
  elapsedSeconds: number;
  estimatedMinutes: number;
}
export interface Recommendation {
  problem: PublicProblem | null;
  reason: string;
  basis: string[];
  targetDifficulty: number;
}
export interface SampleResult {
  index: number;
  verdict: Verdict;
  expected: string;
  actual: string;
  stderr: string;
}
export interface JudgeResult {
  verdict: Verdict;
  passed: number;
  total: number;
  timeMs: number;
  memoryKb: number;
  compileOutput?: string;
  samples?: SampleResult[];
  message?: string;
}
export interface JudgeClient {
  judge(
    code: string,
    problem: PublicProblem,
    tests: TestCase[],
    mode: "sample" | "submit",
  ): Promise<JudgeResult>;
}
export const template =
  "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n";
