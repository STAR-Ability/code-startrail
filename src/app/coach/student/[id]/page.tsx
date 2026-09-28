import { notFound } from "next/navigation";
import { currentUser } from "@/server/auth";
import { AppError, repository } from "@/server/repository";
import { CoachGate, CoachNav } from "@/components/v2/coach";
import { HistoryList } from "@/components/v2/history-list";
import { dateTime } from "@/lib/v2/client";
export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (user.role !== "coach") return <CoachGate />;
  const { id } = await params;
  const repo = repository();
  let student;
  try {
    student = repo.studentDetail(user.id, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TEAM / TRAINING TRAIL</p>
          <h1>{student.user.name}</h1>
          <p>
            {student.user.goal} · 每天 {student.user.dailyMinutes} 分钟
          </p>
        </div>
      </div>
      <CoachNav />
      <div className="coach-detail">
        <div>
          <h2>最近训练与提交</h2>
          <HistoryList records={student.history} />
        </div>
        <aside>
          <section className="aside-section">
            <h2>当前系统推荐</h2>
            <h3>{student.recommendation.problem?.title || "当前阶段完成"}</h3>
            <p>{student.recommendation.reason}</p>
          </section>
          <section className="aside-section">
            <h2>最近 Agent 使用</h2>
            {student.hints.length ? (
              student.hints.slice(0, 10).map((h) => (
                <p key={h.id}>
                  {repo.problem(h.problemId).title} · Hint {h.level}
                  <br />
                  <small>
                    {h.stuckType} · {dateTime(h.createdAt)}
                  </small>
                </p>
              ))
            ) : (
              <p>还没有求助记录。</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
