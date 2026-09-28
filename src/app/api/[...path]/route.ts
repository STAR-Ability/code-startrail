import { z } from "zod";
import { currentUser, requireStudent, switchDemo } from "@/server/auth";
import { AppError, repository } from "@/server/repository";
import { GoJudgeClient } from "@/server/judge";
import { goals, stuckTypes } from "@/lib/v2/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const id = z.string().min(1).max(80);
const seconds = z
  .number()
  .int()
  .min(0)
  .max(7 * 86400);
const requestId = z.string().uuid();
const profile = z
  .object({
    goal: z.enum(goals),
    difficulty: z.number().int().min(1).max(4),
    dailyMinutes: z.number().int().min(10).max(120),
  })
  .strict();
const submit = z
  .object({
    trainingId: id,
    code: z.string().min(1).max(20000),
    mode: z.enum(["sample", "submit"]),
    requestId,
    seconds,
  })
  .strict();
const help = z
  .object({
    trainingId: id,
    stuckType: z.enum(stuckTypes),
    action: z.enum(["next", "review"]),
    requestId,
  })
  .strict();
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
async function body(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    origin !== process.env.APP_ORIGIN &&
    new URL(origin).host !== request.headers.get("host")
  )
    throw new AppError(403, "请求来源不匹配");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError(415, "需要 JSON 请求");
  if (Number(request.headers.get("content-length")) > 70000)
    throw new AppError(413, "提交内容过大");
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "缺少请求内容");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 70000) {
      await reader.cancel();
      throw new AppError(413, "提交内容过大");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new AppError(400, "无效 JSON");
  }
}
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  try {
    const path = (await context.params).path;
    const route = path.join("/");
    const repo = repository();
    if (request.method === "GET") {
      const user = await currentUser();
      if (route === "me") return json(user);
      if (route === "training")
        return json({
          user,
          recommendation: repo.recommend(user.id),
          history: repo.history(user.id).slice(0, 3),
        });
      if (route === "history")
        return json({
          records: repo.history(user.id),
          recommendations: repo.recommendationHistory(user.id),
        });
      if (path[0] === "problems" && path.length === 2)
        return json(repo.problem(path[1]));
      if (path[0] === "sessions" && path.length === 2)
        return json({
          training: repo.training(user.id, path[1]),
          hints: repo.hints(user.id, path[1]),
          submissions: repo.attempts(user.id, path[1]),
        });
      if (route === "coach") return json(repo.team(user.id));
      if (path[0] === "coach" && path[1] === "students" && path.length === 3)
        return json(repo.studentDetail(user.id, path[2]));
    } else {
      const input = await body(request);
      if (route === "demo/session")
        return json(
          await switchDemo(
            z
              .object({ role: z.enum(["student", "coach"]) })
              .strict()
              .parse(input).role,
          ),
        );
      const user = await requireStudent();
      if (route === "profile")
        return json(repo.updateProfile(user.id, profile.parse(input)));
      if (route === "recommendations")
        return json(repo.recommend(user.id, true));
      if (route === "sessions") {
        const { problemId } = z.object({ problemId: id }).strict().parse(input);
        const training = repo.start(user.id, problemId);
        return json({
          training,
          hints: repo.hints(user.id, training.id),
          submissions: repo.attempts(user.id, training.id),
        });
      }
      if (route === "sessions/time" || route === "sessions/finish") {
        const parsed = z
          .object({ trainingId: id, seconds })
          .strict()
          .parse(input);
        return json(
          route.endsWith("finish")
            ? repo.finish(user.id, parsed.trainingId, parsed.seconds)
            : repo.saveTime(user.id, parsed.trainingId, parsed.seconds),
        );
      }
      if (route === "agent/hint")
        return json(repo.hint(user.id, help.parse(input)));
      if (route === "submissions") {
        const parsed = submit.parse(input);
        const { submission, reused } = repo.reserve(user.id, parsed);
        if (reused)
          return json(submission, submission.verdict === "PENDING" ? 202 : 200);
        const problem = repo.problem(submission.problemId);
        const tests =
          parsed.mode === "sample"
            ? problem.samples
            : [...problem.samples, ...repo.tests(problem.id)];
        const result = await new GoJudgeClient().judge(
          parsed.code,
          problem,
          tests,
          parsed.mode,
        );
        return json(repo.complete(submission.id, result));
      }
    }
    throw new AppError(404, "接口不存在");
  } catch (error) {
    if (error instanceof z.ZodError)
      return json({ error: "请求参数不符合要求" }, 400);
    if (error instanceof AppError)
      return json({ error: error.message }, error.status);
    console.error(
      "Application request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json({ error: "服务暂时不可用，请稍后重试" }, 500);
  }
}
export const GET = handle;
export const POST = handle;
