import Link from "next/link";
import { currentUser } from "@/server/auth";
import { repository } from "@/server/repository";
import { CoachGate, CoachNav, MemberTable } from "@/components/v2/coach";
import { VerdictBadge } from "@/components/v2/shared";
import { dateTime } from "@/lib/v2/client";
export default async function CoachPage() {
  const user = await currentUser();
  if (user.role !== "coach") return <CoachGate />;
  const repo = repository();
  const members = repo.team(user.id);
  const now = repo.now();
  const day = (n: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(n);
  const isToday = (n: number) => day(n) === day(now);
  const attempts = members
    .flatMap((m) =>
      m.history.flatMap((r) =>
        r.submissions.map((a) => ({
          ...a,
          title: r.problem.title,
          tags: r.problem.tags,
          name: m.user.name,
        })),
      ),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  const live = attempts.filter((a) => a.source === "live");
  const todayAttempts = live.filter((a) => isToday(a.createdAt));
  const hints = members.flatMap((m) => m.hints);
  const rank = (values: string[]) =>
    Object.entries(
      values.reduce<Record<string, number>>(
        (acc, v) => ({ ...acc, [v]: (acc[v] || 0) + 1 }),
        {},
      ),
    ).sort((a, b) => b[1] - a[1]);
  const wa = rank(live.filter((a) => a.verdict === "WA").map((a) => a.title));
  const tags = rank(
    live
      .filter((a) => ["WA", "TLE", "RE"].includes(a.verdict))
      .flatMap((a) => a.tags),
  );
  const errors = rank(
    live
      .filter((a) => !["AC", "PENDING", "SYSTEM_ERROR"].includes(a.verdict))
      .map((a) => a.verdict),
  );
  const popular = rank(hints.map((h) => repo.problem(h.problemId).title));
  const trainedToday = members.filter((m) =>
    m.history.some(
      (r) =>
        r.source === "live" &&
        (isToday(r.startedAt) ||
          r.submissions.some((a) => isToday(a.createdAt))),
    ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TEAM / COACH DEMO</p>
          <h1>了解过程，再安排下一步。</h1>
          <p>星轨训练小组 · 真实训练即时汇总，模拟历史明确标记。</p>
        </div>
        <Link className="button secondary" href="/coach/students">
          查看全部成员
        </Link>
      </div>
      <CoachNav />
      <section className="team-metrics">
        {[
          ["团队成员", members.length],
          ["今日训练人数", trainedToday.length],
          [
            "今日通过题数",
            new Set(
              todayAttempts
                .filter((a) => a.verdict === "AC")
                .map((a) => `${a.userId}:${a.problemId}`),
            ).size,
          ],
          ["今日提交", todayAttempts.length],
          ["今日 Agent 求助", hints.filter((h) => isToday(h.createdAt)).length],
        ].map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <div className="coach-grid" id="issues">
        <section className="panel coach-issues">
          <h2>大家主要卡在哪里</h2>
          <dl>
            <div>
              <dt>高频 WA 题</dt>
              <dd>
                {wa[0] ? `${wa[0][0]} · ${wa[0][1]} 次` : "暂无真实 WA 记录"}
              </dd>
            </div>
            <div>
              <dt>常见错误</dt>
              <dd>
                {errors.map(([e, n]) => `${e} ${n} 次`).join("、") || "暂无"}
              </dd>
            </div>
            <div>
              <dt>需要巩固的标签</dt>
              <dd>
                {tags
                  .slice(0, 3)
                  .map(([t, n]) => `${t} ${n} 次`)
                  .join("、") || "需要更多训练证据"}
              </dd>
            </div>
            <div>
              <dt>求助最多的题</dt>
              <dd>
                {popular[0]
                  ? `${popular[0][0]} · ${popular[0][1]} 次`
                  : "暂无求助"}
              </dd>
            </div>
            <div>
              <dt>今天尚未训练</dt>
              <dd>
                {members
                  .filter((m) => !trainedToday.includes(m))
                  .map((m) => m.user.name)
                  .join("、") || "大家都已开始"}
              </dd>
            </div>
          </dl>
        </section>
        <section className="coach-suggestion">
          <span className="eyebrow">下一步建议 / DEMO RULES</span>
          <h2>
            {tags[0] ? `一起巩固「${tags[0][0]}」。` : "从一轮基础训练开始。"}
          </h2>
          <p>
            {tags[0]
              ? "先用一次短讲评讨论边界和验证方法，再安排同级变式。可到成员页查看具体训练过程。"
              : "先让成员完成一次输入输出与条件练习。积累真实结果后，再决定专题和难度。"}
          </p>
          <p className="muted">
            这是基于当前记录的教学建议，教练可自行调整安排；不会自动发布任务。
          </p>
        </section>
      </div>
      <section className="coach-section">
        <div className="section-line">
          <h2>最近提交</h2>
          <span className="muted">实时记录优先 · 不展示学生代码</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>成员</th>
                <th>题目</th>
                <th>结果</th>
                <th>时间</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              {attempts.slice(0, 12).map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/coach/student/${a.userId}`}>{a.name}</Link>
                  </td>
                  <td>{a.title}</td>
                  <td>
                    <VerdictBadge verdict={a.verdict} />
                  </td>
                  <td>{dateTime(a.createdAt)}</td>
                  <td>{a.source === "live" ? "真实判题" : "模拟历史"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="coach-section">
        <h2>成员训练情况</h2>
        <MemberTable members={members} />
      </section>
    </>
  );
}
