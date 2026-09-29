import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>这里还没有轨迹。</h1>
      <p>没有找到这个页面或题目。</p>
      <Link href="/training" className="button primary">
        返回训练
      </Link>
    </div>
  );
}
