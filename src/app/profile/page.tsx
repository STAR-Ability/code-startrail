import Link from "next/link";
import { currentUser } from "@/server/auth";
import { ProfileForm } from "@/components/v2/profile-form";
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
      <section className="panel profile-panel">
        <div className="profile-identity">
          <span className="avatar">{user.role === "coach" ? "C" : "S"}</span>
          <div>
            <h2>{user.name}</h2>
            <p>共享演示账户 · 无需注册</p>
          </div>
        </div>
        <ProfileForm user={user} />
        {user.role === "coach" && (
          <Link className="button secondary" href="/coach">
            管理团队
          </Link>
        )}
      </section>
      <p className="source-note">
        此 Demo
        使用共享演示身份，训练结果对演示教练可见。请勿提交个人隐私或机密代码。代码草稿仅保存在本机，服务端执行后保留判题结果与代码摘要。
      </p>
    </div>
  );
}
