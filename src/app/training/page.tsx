import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Clock3,
  History,
  Sparkles,
  Target,
} from "lucide-react";
import { currentUser } from "@/server/auth";
import { repository } from "@/server/repository";
import { RecommendationCard, VerdictBadge } from "@/components/v2/shared";
import { dateTime, duration } from "@/lib/v2/client";

export default async function TrainingPage() {
  const user = await currentUser();
  const repo = repository();
  const last = repo.history(user.id)[0];
  const recommendation = repo.recommend(user.id);
  return (
    <div className="training-home">
      <div className="page-heading home-heading">
        <div>
          <p className="eyebrow">A LITTLE PRACTICE, EVERY DAY</p>
          <h1>今天，也向前一步。</h1>
          <p>留一点时间，给自己的进步。</p>
        </div>
        <Link
          href="/profile"
          className="daily-goal"
          aria-label={`调整每日训练时间，当前 ${user.dailyMinutes} 分钟`}
        >
          <Clock3 aria-hidden="true" size={17} />
          <span>
            每天 <strong>{user.dailyMinutes}</strong> 分钟
          </span>
          <ArrowUpRight aria-hidden="true" size={15} />
        </Link>
      </div>
      {user.role === "coach" && (
        <p className="notice">
          当前是教练演示视角。<Link href="/coach">查看团队训练</Link>，或切换
          Student Demo 开始做题。
        </p>
      )}
      <section className="training-hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="live-dot" />
            {recommendation.problem
              ? "你的下一步，已经准备好了"
              : "这一阶段的练习，已经完成"}
          </span>
          <h2>
            把想学会的，
            <br />
            变成<span>真正会的。</span>
          </h2>
          <p>
            从一道合适的题开始。
            <br />
            独立思考，卡住时再借一点灵感。
          </p>
          <div className="hero-goal">
            <span className="goal-icon">
              <Target aria-hidden="true" size={18} />
            </span>
            <div>
              <small>当前训练目标</small>
              <strong>{user.goal}</strong>
            </div>
            <Link href="/profile" aria-label="调整训练目标">
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </div>
        <RecommendationCard value={recommendation} />
      </section>
      <div className="home-secondary">
        <section className="home-card recent">
          <div className="section-line">
            <h2>
              <History aria-hidden="true" size={17} />
              最近一次训练
            </h2>
            <Link href="/history" className="quiet-link">
              查看记录
              <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          </div>
          {last ? (
            <>
              <Link
                href={`/problem/${last.problemId}`}
                className="recent-title"
              >
                {last.problem.title}
                <ArrowRight aria-hidden="true" size={17} />
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
                <span>{dateTime(last.startedAt)}</span>
              </div>
            </>
          ) : (
            <div className="recent-empty">
              <span className="empty-mark" aria-hidden="true">
                <ArrowUpRight aria-hidden="true" size={23} strokeWidth={1.2} />
              </span>
              <div>
                <strong>第一段轨迹，等你开始。</strong>
                <p>完成一次练习，这里会留下你的记录。</p>
              </div>
            </div>
          )}
        </section>
        <section className="home-card help-intro">
          <span className="helper-mark">
            <Sparkles aria-hidden="true" size={20} strokeWidth={1.6} />
          </span>
          <div>
            <h2>卡住了，就向前一小步。</h2>
            <p>
              写题页里的助手，按需给你提示。
              <br />
              把思考的空间，留给你自己。
            </p>
            <small>逐级提示 · Demo 预设内容</small>
          </div>
        </section>
      </div>
    </div>
  );
}
