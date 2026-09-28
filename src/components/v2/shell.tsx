"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Orbit, ArrowUpRight } from "lucide-react";
import type { Learner } from "@/lib/v2/types";
import { api } from "@/lib/v2/client";

export function Shell({
  user,
  children,
}: {
  user: Learner;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function switchRole(role: string) {
    setBusy(true);
    setError("");
    try {
      await api("demo/session", { role });
      router.push(role === "coach" ? "/coach" : "/training");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/training" className="brand" aria-label="码练星轨首页">
            <span className="brand-icon">
              <Orbit size={24} />
            </span>
            <span>
              码练星轨<small>codeStartrail</small>
            </span>
          </Link>
          <nav aria-label="主导航">
            {[
              ["/training", "训练"],
              ["/history", "记录"],
              ["/profile", "我的"],
            ].map(([url, title]) => (
              <Link
                key={url}
                href={url}
                aria-current={
                  path === url ||
                  (url === "/training" && path.startsWith("/problem/"))
                    ? "page"
                    : undefined
                }
              >
                {title}
              </Link>
            ))}
          </nav>
          <div className="role-picker">
            <span className="demo-label">DEMO V2</span>
            <label>
              <span className="sr-only">演示角色切换</span>
              <select
                aria-label="演示角色切换"
                value={user.role}
                disabled={busy}
                onChange={(e) => switchRole(e.target.value)}
              >
                <option value="student">Student Demo</option>
                <option value="coach">Coach Demo</option>
              </select>
            </label>
          </div>
        </div>
      </header>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <main id="main" className="page">
        {children}
      </main>
      <footer className="site-footer">
        <span>
          码练星轨 <span className="muted">/</span> 每一次思考，都有下一步。
        </span>
        <span>
          规则推荐 · 预设 Agent · 真实判题{" "}
          {user.role === "coach" && (
            <Link href="/coach">
              团队工作台 <ArrowUpRight size={13} />
            </Link>
          )}
        </span>
      </footer>
    </>
  );
}
