import type { ProblemPackage, StuckType, Verdict } from "./types";
export interface TrainingAgent {
  hint(input: {
    problem: Pick<ProblemPackage, "description" | "hints" | "solutionOutline">;
    stuckType: StuckType;
    level: number;
    lastVerdict?: Verdict | null;
  }): string;
}
export class MockTrainingAgent implements TrainingAgent {
  hint({
    problem,
    stuckType,
    level,
    lastVerdict,
  }: Parameters<TrainingAgent["hint"]>[0]) {
    if (level === 4)
      return `复盘讲解（已结束独立尝试）\n${problem.solutionOutline}\n下一题请尝试独立推导；本题 AC 不等于已经掌握。`;
    const directions: Record<StuckType, string> = {
      题意没看懂:
        "先用自己的话说一遍：输入提供什么，最后要输出什么？手算公开样例。",
      不知道怎么开始: "先处理最小的一组输入，再找每一步需要保存什么。",
      有思路但不会写: "把想法拆成读入、维护状态和输出三步，每次只实现一步。",
      编译错误: "先看编译信息的第一条错误，检查括号、分号、类型和变量声明。",
      运行错误: "检查数组下标、空容器、除零和递归终止条件。",
      WA: "先检查最小值、重复值和边界；通过样例还不足以说明所有情况都正确。",
      TLE: "估算输入上限下循环总次数，寻找重复计算的部分。",
      想确认思路: "说明每一步为什么成立，再用一个边界样例尝试推翻它。",
      其他: "写下预期结果与实际结果，先明确它们从哪一步开始不同。",
    };
    return `${lastVerdict ? `最近判题：${lastVerdict}。` : "尚无判题结果。"}${directions[stuckType]}\n\n${problem.hints[level - 1]}`;
  }
}
