import Link from "next/link";
import { VerdictBadge } from "./shared";
import { dateTime, duration } from "@/lib/v2/client";
import type { HistoryRow } from "@/server/repository";
import { ArrowRight, Clock3, Code2, History, Sparkles } from "lucide-react";
export function HistoryList({ records }: { records: HistoryRow[] }) {
  if (!records.length)
    return (
      <div className="empty">
        <span className="empty-icon">
          <History size={28} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h2>你的训练轨迹，从这里开始。</h2>
        <p>运行、提交和提示会随每次训练记录下来。</p>
        <Link href="/training" className="button primary">
          开始第一道题
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    );
  return (
    <div className="history-list">
      {records.map((r) => (
        <article key={r.id} className="history-item">
          <div className="history-main">
            <div>
              <div className="history-date">
                <small>{dateTime(r.startedAt)}</small>
                <span
                  className={`source-badge ${r.source === "live" ? "live" : ""}`}
                >
                  {r.source === "seed" ? "模拟历史" : "真实训练"}
                </span>
              </div>
              <h2>
                <Link href={`/problem/${r.problemId}`}>
                  {r.problem.title}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </h2>
              <div className="inline-meta">
                <span>难度 {r.problem.difficulty} / 5</span>
                <span>
                  <Clock3 size={14} aria-hidden="true" />
                  {duration(r.elapsedSeconds)}
                </span>
                <span>
                  <Code2 size={14} aria-hidden="true" />
                  {r.submissions.length} 次提交
                </span>
                <span>
                  <Sparkles size={14} aria-hidden="true" />
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
