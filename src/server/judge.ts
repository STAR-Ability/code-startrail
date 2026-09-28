import type {
  JudgeClient,
  JudgeResult,
  PublicProblem,
  TestCase,
  Verdict,
} from "@/lib/v2/types";

interface Execution {
  status: string;
  exitStatus: number;
  time: number;
  memory: number;
  files?: Record<string, string>;
  fileIds?: Record<string, string>;
}
const executionStatus: Record<string, Verdict> = {
  "Time Limit Exceeded": "TLE",
  "Memory Limit Exceeded": "MLE",
  "Output Limit Exceeded": "OLE",
  "Nonzero Exit Status": "RE",
  "Non Zero Exit Status": "RE",
  Signalled: "RE",
  "Dangerous Syscall": "RE",
};
export const sameOutput = (actual: string, expected: string) =>
  actual.trim().split(/\s+/).join(" ") ===
  expected.trim().split(/\s+/).join(" ");

export class GoJudgeClient implements JudgeClient {
  constructor(private url = process.env.JUDGE_URL || "http://127.0.0.1:5050") {}
  async request(
    path: string,
    body?: unknown,
    method = body ? "POST" : "GET",
    timeout = 20_000,
  ) {
    const response = await fetch(`${this.url}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Judge HTTP ${response.status}`);
    return response;
  }
  async health() {
    const response = await this.request("/version", undefined, "GET", 2000);
    return response.json();
  }
  private async run(command: object): Promise<Execution> {
    const items: unknown = await (
      await this.request("/run", { cmd: [command] })
    ).json();
    if (
      !Array.isArray(items) ||
      items.length !== 1 ||
      !items[0] ||
      typeof items[0].status !== "string"
    )
      throw new Error("Judge response invalid");
    return items[0] as Execution;
  }
  async judge(
    code: string,
    problem: PublicProblem,
    tests: TestCase[],
    mode: "sample" | "submit",
  ): Promise<JudgeResult> {
    const result: JudgeResult = {
      verdict: "AC",
      passed: 0,
      total: tests.length,
      timeMs: 0,
      memoryKb: 0,
      ...(mode === "sample" ? { samples: [] } : {}),
    };
    if (!tests.length)
      return { ...result, verdict: "SYSTEM_ERROR", message: "测试数据缺失" };
    let binary: string | undefined;
    const collectors = [
      { content: "" },
      { name: "stdout", max: 65536 },
      { name: "stderr", max: 16384 },
    ];
    const deadline = Date.now() + 75_000;
    try {
      const compiled = await this.run({
        args: [
          "/usr/bin/g++",
          "main.cpp",
          "-o",
          "main",
          "-std=c++17",
          "-O2",
          "-pipe",
          "-DONLINE_JUDGE",
        ],
        env: ["PATH=/usr/bin:/bin", "LANG=C.UTF-8"],
        files: collectors,
        cpuLimit: 10e9,
        clockLimit: 15e9,
        memoryLimit: 512 * 1024 ** 2,
        procLimit: 32,
        copyIn: { "main.cpp": { content: code } },
        copyOutCached: ["main"],
        copyOutMax: 8 * 1024 ** 2,
      });
      binary = compiled.fileIds?.main;
      if (compiled.status !== "Accepted") {
        if (["Internal Error"].includes(compiled.status))
          throw new Error("Sandbox failed");
        // missing binary is expected for compilation errors; missing compiler is a system fault.
        if (compiled.status === "File Error" && !compiled.files?.stderr)
          throw new Error("Compiler unavailable");
        return {
          ...result,
          verdict: "CE",
          compileOutput: (
            compiled.files?.stderr || `编译未完成：${compiled.status}`
          ).slice(0, 12000),
        };
      }
      if (!binary) throw new Error("Compiled binary missing");
      for (let i = 0; i < tests.length; i++) {
        if (Date.now() > deadline) throw new Error("Judge deadline exceeded");
        const test = tests[i];
        const run = await this.run({
          args: ["main"],
          env: ["PATH=/usr/bin:/bin", "LANG=C.UTF-8"],
          files: [{ content: test.input }, collectors[1], collectors[2]],
          cpuLimit: problem.timeLimitMs * 1e6,
          clockLimit: (problem.timeLimitMs * 3 + 500) * 1e6,
          memoryLimit: problem.memoryLimitMb * 1024 ** 2,
          stackLimit: 32 * 1024 ** 2,
          procLimit: 8,
          copyIn: { main: { fileId: binary } },
        });
        const verdict =
          run.status === "Accepted"
            ? sameOutput(run.files?.stdout || "", test.output)
              ? "AC"
              : "WA"
            : executionStatus[run.status] || "SYSTEM_ERROR";
        if (verdict === "SYSTEM_ERROR")
          throw new Error(`Sandbox failure: ${run.status}`);
        if (verdict === "AC") result.passed++;
        else if (result.verdict === "AC") result.verdict = verdict;
        result.timeMs = Math.max(result.timeMs, Math.ceil(run.time / 1e6));
        result.memoryKb = Math.max(
          result.memoryKb,
          Math.ceil(run.memory / 1024),
        );
        // Hidden input can be echoed by arbitrary code; never return hidden output or stderr.
        if (mode === "sample")
          result.samples!.push({
            index: i + 1,
            verdict,
            expected: test.output,
            actual: (run.files?.stdout || "").slice(0, 8000),
            stderr: (run.files?.stderr || "").slice(0, 2000),
          });
      }
      return result;
    } catch {
      return {
        ...result,
        verdict: "SYSTEM_ERROR",
        message: "判题服务暂不可用或执行中断，请稍后重试。本次不计入训练表现。",
      };
    } finally {
      if (binary) {
        try {
          await this.request(
            `/file/${encodeURIComponent(binary)}`,
            undefined,
            "DELETE",
            2000,
          );
        } catch {
          /* Judge file TTL is a bounded second cleanup path. */
        }
      }
    }
  }
}
