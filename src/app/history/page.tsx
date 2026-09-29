import { currentUser } from "@/server/auth";
import { repository } from "@/server/repository";
import { HistoryList } from "@/components/v2/history-list";
import { dateTime } from "@/lib/v2/client";
import { ArrowUpRight, Route } from "lucide-react";
import Link from "next/link";
export default async function HistoryPage() {
  const user = await currentUser();
  const repo = repository();
  const changes = repo.recommendationHistory(user.id);
  const records = repo.history(user.id);
  return (
    <div className="narrow-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR TRAINING TRAIL</p>
          <h1>每一次尝试，都留下轨迹。</h1>
          <p>记录结果，也记得你走过的过程。</p>
        </div>
        <Link href="/training" className="button secondary">
          继续训练
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div
        className={`history-layout ${changes.length ? "has-recommendations" : ""}`}
      >
        <section aria-label="训练记录">
          <div className="section-line">
            <h2>
              训练记录 <span className="count-badge">{records.length}</span>
            </h2>
            <span className="muted">最近的尝试在前</span>
          </div>
          <HistoryList records={records} />
        </section>
        {!!changes.length && (
          <aside className="recommendation-history panel">
            <h2>
              <Route size={18} aria-hidden="true" />
              推荐如何变化
            </h2>
            <p className="section-description">每一次调整，都有迹可循。</p>
            <ol className="recommendation-timeline">
              {changes.map((c) => (
                <li key={c.id}>
                  <small>{dateTime(c.createdAt)}</small>
                  <strong>
                    {c.problemId
                      ? repo.problem(c.problemId).title
                      : "当前题库已完成"}
                  </strong>
                  <p>{c.reason}</p>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}
