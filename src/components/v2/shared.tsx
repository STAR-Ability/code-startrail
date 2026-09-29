import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Code2 } from "lucide-react";
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
        <span className="empty-icon">
          <CheckCircle2 size={28} aria-hidden="true" strokeWidth={1.5} />
        </span>
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
        <span className="recommendation-label">
          <Code2 aria-hidden="true" size={16} /> 为你推荐
        </span>
        <span className="problem-number">
          {p.id.slice(1)}
          <small> / NEXT UP</small>
        </span>
      </div>
      <div className="recommendation-content">
        <div>
          <h2>{p.title}</h2>
          <div className="problem-meta">
            <span>难度 {p.difficulty} / 5</span>
            <span>
              <Clock3 aria-hidden="true" size={14} />约 {p.estimatedMinutes}{" "}
              分钟
            </span>
          </div>
          <p className="objective">{p.objective}</p>
          <div className="tags">
            {p.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="recommendation-reason">
        <strong>为什么推荐</strong>
        <p>{value.reason}</p>
        <details>
          <summary>推荐依据</summary>
          <ul>
            {value.basis.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <small>{p.source} · 规则推荐</small>
        </details>
      </div>
      <div className="recommendation-bottom">
        <Link className="button primary" href={`/problem/${p.id}`}>
          开始训练 <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>
    </section>
  );
}
