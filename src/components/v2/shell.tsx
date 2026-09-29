"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  Code2,
  Compass,
  History,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { Learner } from "@/lib/v2/types";
import { api } from "@/lib/v2/client";

const navigation = [
  { href: "/training", label: "训练", icon: Compass },
  { href: "/history", label: "记录", icon: History },
  { href: "/profile", label: "我的", icon: UserRound },
];

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const isProblem = path.startsWith("/problem/");
  const active = navigation.find(
    (item) => path === item.href || (item.href === "/training" && isProblem),
  );
  const title = isProblem
    ? "专注训练室"
    : path.startsWith("/coach")
      ? "团队工作台"
      : active?.label || "学习空间";

  useEffect(() => {
    if (!mobileOpen) return;
    const returnFocusTo = menuButton.current;
    const focusFrame = requestAnimationFrame(() => {
      sidebar.current
        ?.querySelector<HTMLButtonElement>(".mobile-close")
        ?.focus({ preventScroll: true });
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const items = Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ) || [],
      ).filter((item) => item.getClientRects().length);
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 821px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(focusFrame);
      desktop.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      returnFocusTo?.focus();
    };
  }, [mobileOpen]);

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
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${isProblem ? "is-problem" : ""}`}
    >
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="关闭导航菜单"
          tabIndex={-1}
        />
      )}
      <aside
        ref={sidebar}
        id="workspace-sidebar"
        className={`sidebar ${mobileOpen ? "open" : ""}`}
        aria-label="工作区导航"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen || undefined}
      >
        <div className="sidebar-brand-row">
          <Link
            href="/training"
            className="brand"
            aria-label="码练星轨首页"
            onClick={() => setMobileOpen(false)}
          >
            <span className="brand-icon">
              <Code2 aria-hidden="true" size={23} strokeWidth={1.8} />
            </span>
            <span className="brand-name">
              码练星轨<small>codeStartrail</small>
            </span>
          </Link>
          <button
            className="icon-button mobile-close"
            aria-label="收起导航菜单"
            onClick={() => setMobileOpen(false)}
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>
        <div className="nav-caption">我的学习空间</div>
        <nav aria-label="主导航" className="sidebar-nav">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={collapsed ? label : undefined}
              aria-current={active?.href === href ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={1.7} />
              <span className="nav-label">{label}</span>
              {active?.href === href && <span className="nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {user.role === "coach" && (
            <Link
              href="/coach"
              className="sidebar-team"
              title="团队工作台"
              aria-label="团队工作台"
              aria-current={path.startsWith("/coach") ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <UsersRound aria-hidden="true" size={19} />
              <span className="nav-label">团队工作台</span>
              <ArrowUpRight
                aria-hidden="true"
                size={15}
                className="nav-label"
              />
            </Link>
          )}
          <div className="sidebar-note">
            <span className="note-line" />
            <p>
              每一次思考，
              <br />
              都有下一步。
            </p>
            <small>A LITTLE, EVERY DAY.</small>
          </div>
          <Link
            href="/profile"
            className="sidebar-account"
            aria-label="个人资料"
            onClick={() => setMobileOpen(false)}
          >
            <span className="account-avatar">
              {user.role === "coach" ? "C" : "S"}
            </span>
            <span className="account-copy">
              <strong>{user.name}</strong>
              <small>
                {user.role === "coach" ? "教练演示空间" : "个人训练空间"}
              </small>
            </span>
            <ChevronRight
              aria-hidden="true"
              size={15}
              className="account-arrow"
            />
          </Link>
        </div>
      </aside>
      <div className="workspace-main" inert={mobileOpen || undefined}>
        <header className="workspace-header">
          <div className="header-location">
            <button
              className="icon-button desktop-toggle"
              aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
              aria-expanded={!collapsed}
              aria-controls="workspace-sidebar"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden="true" size={18} />
              ) : (
                <PanelLeftClose aria-hidden="true" size={18} />
              )}
            </button>
            <button
              ref={menuButton}
              className="icon-button mobile-menu"
              aria-label="打开导航菜单"
              aria-expanded={mobileOpen}
              aria-controls="workspace-sidebar"
              onClick={() => setMobileOpen(true)}
            >
              <Menu aria-hidden="true" size={20} />
            </button>
            <span className="header-parent">学习空间</span>
            <ChevronRight
              aria-hidden="true"
              size={13}
              className="header-separator"
            />
            <span>{title}</span>
          </div>
          <div className="role-picker">
            <span className="demo-label">DEMO</span>
            <select
              name="demo-role"
              aria-label="演示角色切换"
              value={user.role}
              disabled={busy}
              onChange={(e) => switchRole(e.target.value)}
            >
              <option value="student">Student Demo</option>
              <option value="coach">Coach Demo</option>
            </select>
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className={`page ${isProblem ? "problem-page" : ""}`}
        >
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {children}
        </main>
        <footer className="site-footer">
          <span>
            码练星轨 <span className="footer-slash">/</span>{" "}
            按自己的节奏，慢慢变好。
          </span>
          <span>规则推荐 · 预设提示 · 真实判题</span>
        </footer>
      </div>
    </div>
  );
}
