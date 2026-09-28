import Link from "next/link";
import { ArrowUpRight, Target, Sparkles, CornerDownRight } from "lucide-react";
import { currentUser } from "@/server/auth";
import { repository } from "@/server/repository";
import { RecommendationCard, VerdictBadge } from "@/components/v2/shared";
import { dateTime, duration } from "@/lib/v2/client";
export default async function TrainingPage() {
  const user = await currentUser();
  const repo = repository();
  const history = repo.history(user.id);
  const last = history[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TRAIN A LITTLE. GO A LITTLE FURTHER.</p>
          <h1>下一道题，练得更准确。</h1>
          <p>专注眼前的一个问题，卡住时，我们一起找到下一步。</p>
        </div>
        <Link href="/profile" className="quiet-link">
          每天 {user.dailyMinutes} 分钟 <ArrowUpRight size={16} />
        </Link>
      </div>
      {user.role === "coach" && (
        <p className="notice">
          当前是教练演示视角。<Link href="/coach">查看团队训练</Link>
          ，或从右上角切换 Student Demo 开始做题。
        </p>
      )}
      <div className="training-layout">
        <div>
          <div className="goal-line">
            <Target size={17} />
            <span>
              当前目标 <strong>{user.goal}</strong>
            </span>
            <Link href="/profile">调整</Link>
          </div>
          <RecommendationCard value={repo.recommend(user.id)} />
        </div>
        <aside className="training-aside">
          <section className="aside-section">
            <span className="agent-icon">
              <Sparkles size={21} />
            </span>
            <h2>
              把思考留给你，
              <br />
              把卡点交给 Agent。
            </h2>
            <p>
              题意、方向、实现、调试。主动告诉 Agent
              你卡在哪里，每次只向前一步。
            </p>
            <div className="steps">
              <span>
                01 <b>自己尝试</b>
              </span>
              <span>
                02 <b>按需求助</b>
              </span>
              <span>
                03 <b>继续训练</b>
              </span>
            </div>
            <small>Demo Agent 使用预设提示，不调用大模型。</small>
          </section>
          <section className="aside-section recent">
            <div className="section-line">
              <h3>最近一次训练</h3>
              <Link href="/history">
                <ArrowUpRight size={16} />
                <span className="sr-only">查看记录</span>
              </Link>
            </div>
            {last ? (
              <>
                <Link
                  href={`/problem/${last.problemId}`}
                  className="recent-title"
                >
                  {last.problem.title}
                </Link>
                <div className="inline-meta">
                  <VerdictBadge
                    verdict={
                      last.status === "ac"
                        ? "AC"
                        : last.submissions[0]?.verdict || last.status
                    }
                  />
                  <span>
                    {duration(last.elapsedSeconds)} · Hint {last.hintLevel}
                  </span>
                </div>
                <small>
                  {dateTime(last.startedAt)} ·{" "}
                  {last.source === "live" ? "本次真实训练" : "演示历史"}
                </small>
              </>
            ) : (
              <>
                <p>还没有训练记录。</p>
                <small>从第一道题开始，让下一次推荐有据可依。</small>
              </>
            )}
          </section>
        </aside>
      </div>
      <p className="training-note">
        <CornerDownRight size={16} />
        通过一道题是过程；能在下一道题独立应用，才是值得继续验证的进步。
      </p>
    </>
  );
}
