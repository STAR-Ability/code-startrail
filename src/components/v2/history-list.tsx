import Link from "next/link";
import { VerdictBadge } from "./shared";
import { dateTime, duration } from "@/lib/v2/client";
import type { HistoryRow } from "@/server/repository";
export function HistoryList({ records }: { records: HistoryRow[] }) {
  if (!records.length)
    return (
      <div className="empty">
        <h2>你的训练轨迹，从这里开始。</h2>
        <p>运行、提交和提示会随每次训练记录下来。</p>
        <Link href="/training" className="button primary">
          开始第一道题
        </Link>
      </div>
    );
  return (
    <div className="history-list">
      {records.map((r) => (
        <article key={r.id} className="history-item">
          <div className="history-main">
            <div>
              <small>
                {dateTime(r.startedAt)} ·{" "}
                {r.source === "seed" ? "模拟历史" : "真实训练"}
              </small>
              <h2>
                <Link href={`/problem/${r.problemId}`}>{r.problem.title}</Link>
              </h2>
              <div className="inline-meta">
                <span>难度 {r.problem.difficulty} / 5</span>
                <span>{duration(r.elapsedSeconds)}</span>
                <span>{r.submissions.length} 次提交</span>
                <span>
                  Hint {r.hintLevel} · {r.hintCount} 次求助
                </span>
              </div>
            </div>
            <VerdictBadge
              verdict={
                r.status === "ac" ? "AC" : r.submissions[0]?.verdict || r.status
              }
            />
          </div>
          {!!r.submissions.length && (
            <details>
              <summary>查看提交过程</summary>
              <div className="attempt-timeline">
                {r.submissions.map((a) => (
                  <span key={a.id}>
                    {dateTime(a.createdAt)} <VerdictBadge verdict={a.verdict} />
                  </span>
                ))}
              </div>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}
