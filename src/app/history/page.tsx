import { currentUser } from "@/server/auth";
import { repository } from "@/server/repository";
import { HistoryList } from "@/components/v2/history-list";
import { dateTime } from "@/lib/v2/client";
export default async function HistoryPage() {
  const user = await currentUser();
  const repo = repository();
  const changes = repo.recommendationHistory(user.id);
  return (
    <div className="narrow-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR TRAINING TRAIL</p>
          <h1>每一次尝试，都留下轨迹。</h1>
          <p>记录结果，也记得你走过的过程。</p>
        </div>
      </div>
      <HistoryList records={repo.history(user.id)} />
      {!!changes.length && (
        <section className="recommendation-history">
          <h2>推荐如何变化</h2>
          {changes.map((c) => (
            <div key={c.id}>
              <small>{dateTime(c.createdAt)}</small>
              <p>{c.reason}</p>
              <span className="muted">
                {c.problemId
                  ? repo.problem(c.problemId).title
                  : "当前题库已完成"}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
