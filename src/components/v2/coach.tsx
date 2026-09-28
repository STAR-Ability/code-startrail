import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { dateTime } from "@/lib/v2/client";
import type { repository } from "@/server/repository";
type Members = ReturnType<ReturnType<typeof repository>["team"]>;
export function CoachNav() {
  return (
    <nav className="coach-nav" aria-label="团队导航">
      <Link href="/coach">团队概览</Link>
      <Link href="/coach/students">成员</Link>
      <Link href="/coach#issues">最近问题</Link>
    </nav>
  );
}
export function CoachGate() {
  return (
    <section className="empty">
      <h1>团队训练工作台</h1>
      <p>从右上角“演示角色切换”选择 Coach Demo，即可查看团队数据。</p>
      <Link className="button secondary" href="/training">
        返回训练
      </Link>
    </section>
  );
}
export function MemberTable({ members }: { members: Members }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>成员</th>
            <th>最近训练</th>
            <th>通过题数</th>
            <th>提交</th>
            <th>求助</th>
            <th>当前推荐</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const attempts = m.history.flatMap((h) => h.submissions);
            return (
              <tr key={m.user.id}>
                <td>
                  <Link
                    className="member-name"
                    href={`/coach/student/${m.user.id}`}
                  >
                    {m.user.name}
                    <ArrowUpRight size={13} />
                  </Link>
                </td>
                <td>
                  {m.history[0] ? dateTime(m.history[0].startedAt) : "尚未训练"}
                </td>
                <td>
                  {
                    new Set(
                      attempts
                        .filter((a) => a.verdict === "AC")
                        .map((a) => a.problemId),
                    ).size
                  }
                </td>
                <td>{attempts.length}</td>
                <td>{m.hints.length}</td>
                <td>{m.recommendation.problem?.title || "当前阶段完成"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
