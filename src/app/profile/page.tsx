import Link from "next/link";
import { currentUser } from "@/server/auth";
import { ProfileForm } from "@/components/v2/profile-form";
import { ArrowUpRight, Clock3, SlidersHorizontal, Target } from "lucide-react";
export default async function ProfilePage() {
  const user = await currentUser();
  return (
    <div className="profile-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PACE, YOUR PATH</p>
          <h1>按你的节奏来。</h1>
          <p>一点合适的难度，一段留给思考的时间。</p>
        </div>
      </div>
      <div className="profile-layout">
        <section className="panel profile-panel" aria-label="个人训练设置">
          <div className="profile-identity">
            <span className="avatar">{user.role === "coach" ? "C" : "S"}</span>
            <div>
              <h2>{user.name}</h2>
              <p>共享演示账户 · 无需注册</p>
            </div>
          </div>
          <ProfileForm key={user.id} user={user} />
          {user.role === "coach" && (
            <Link className="button secondary" href="/coach">
              管理团队
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          )}
        </section>
        <aside className="profile-guide">
          <span className="guide-icon">
            <SlidersHorizontal size={21} aria-hidden="true" />
          </span>
          <h2>找到适合自己的节奏</h2>
          <p>训练偏好会帮助系统选择下一道题。随时调整，从当下的状态出发。</p>
          <div>
            <Target size={17} aria-hidden="true" />
            <h3>一个清晰的目标</h3>
            <p>先选择想练习的方向，再用真实的提交结果检验思路。</p>
          </div>
          <div>
            <Clock3 size={17} aria-hidden="true" />
            <h3>一段专注的时间</h3>
            <p>
              时间不必很长。卡住时可以逐级获取提示，也可以保存尝试，稍后继续。
            </p>
          </div>
        </aside>
      </div>
      <p className="source-note">
        此 Demo
        使用共享演示身份，训练结果对演示教练可见。请勿提交个人隐私或机密代码。代码草稿仅保存在本机，服务端执行后保留判题结果与代码摘要。
      </p>
    </div>
  );
}
