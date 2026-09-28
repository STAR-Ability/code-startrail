import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import type { Recommendation, Verdict } from "@/lib/v2/types";
export function VerdictBadge({
  verdict,
}: {
  verdict: Verdict | "unfinished" | "active";
}) {
  const label =
    verdict === "unfinished"
      ? "未完成"
      : verdict === "active"
        ? "训练中"
        : verdict === "SYSTEM_ERROR"
          ? "服务异常"
          : verdict === "PENDING"
            ? "判题中"
            : verdict;
  return (
    <span className={`verdict verdict-${verdict.toLowerCase()}`}>{label}</span>
  );
}
export function RecommendationCard({
  value,
  compact = false,
}: {
  value: Recommendation;
  compact?: boolean;
}) {
  if (!value.problem)
    return (
      <section className="empty">
        <h2>这一阶段，先到这里。</h2>
        <p>{value.reason}</p>
        <Link className="button secondary" href="/profile">
          调整训练偏好
        </Link>
      </section>
    );
  const p = value.problem;
  return (
    <section className={`recommendation ${compact ? "compact" : ""}`}>
      <div className="recommendation-top">
        <span className="eyebrow">你的下一道题</span>
        <span className="small-label">Demo Recommendation</span>
      </div>
      <div className="recommendation-content">
        <div>
          <div className="problem-meta">
            <span>难度 {p.difficulty} / 5</span>
            <span>
              <Clock3 size={14} />约 {p.estimatedMinutes} 分钟
            </span>
          </div>
          <h2>{p.title}</h2>
          <p className="objective">{p.objective}</p>
          <div className="tags">
            {p.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
        <div className="orbit-art" aria-hidden="true">
          <div />
          <div />
          <span>{p.id.slice(1)}</span>
          <i />
        </div>
      </div>
      <div className="recommendation-reason">
        <strong>为什么是这道题</strong>
        <p>{value.reason}</p>
        <details>
          <summary>查看推荐依据</summary>
          <ul>
            {value.basis.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </details>
      </div>
      <div className="recommendation-bottom">
        <Link className="button primary" href={`/problem/${p.id}`}>
          开始训练 <ArrowRight size={17} />
        </Link>
        <span className="muted">{p.source}</span>
      </div>
    </section>
  );
}
