import Link from "next/link";
import {
  ArrowUpRight,
  LayoutDashboard,
  UsersRound,
  Activity,
} from "lucide-react";
import { dateTime } from "@/lib/v2/client";
import type { repository } from "@/server/repository";
type Members = ReturnType<ReturnType<typeof repository>["team"]>;
export function CoachNav({
  current = "overview",
}: {
  current?: "overview" | "members";
}) {
  return (
    <nav className="coach-nav" aria-label="团队导航">
      <Link
        href="/coach"
        aria-current={current === "overview" ? "page" : undefined}
      >
        <LayoutDashboard size={16} aria-hidden="true" />
        团队概览
      </Link>
      <Link
        href="/coach/students"
        aria-current={current === "members" ? "page" : undefined}
      >
        <UsersRound size={16} aria-hidden="true" />
        成员
      </Link>
      <Link href="/coach#issues">
        <Activity size={16} aria-hidden="true" />
        最近问题
      </Link>
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
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="成员训练情况，可横向滚动"
    >
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
                    <span className="member-avatar" aria-hidden="true">
                      {m.user.name.slice(0, 1)}
                    </span>
                    <span>{m.user.name}</span>
                    <ArrowUpRight size={14} aria-hidden="true" />
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
