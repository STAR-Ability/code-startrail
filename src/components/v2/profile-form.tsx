"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/v2/client";
import { goals, type Learner } from "@/lib/v2/types";
export function ProfileForm({ user }: { user: Learner }) {
  const [goal, setGoal] = useState(user.goal);
  const [difficulty, setDifficulty] = useState(user.difficulty);
  const [dailyMinutes, setDailyMinutes] = useState(user.dailyMinutes);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="profile-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("profile", { goal, difficulty, dailyMinutes });
          setMessage("偏好已保存，下一次推荐将使用这些设置。");
          router.refresh();
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        当前训练目标
        <select value={goal} onChange={(e) => setGoal(e.target.value)}>
          {goals.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <p className="field-note">目标改变推荐偏好，训练方式始终保持简单。</p>
      <div className="form-columns">
        <label>
          当前推荐难度
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(+e.target.value)}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
        <label>
          每日训练时间
          <select
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(+e.target.value)}
          >
            {[10, 15, 30, 45, 60, 90, 120].map((n) => (
              <option key={n} value={n}>
                {n} 分钟
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="profile-static">
        <span>训练语言</span>
        <strong>C++17</strong>
      </div>
      <div className="profile-static">
        <span>团队归属</span>
        <strong>星轨训练小组 · Demo</strong>
      </div>
      <button
        className="button primary"
        disabled={busy || user.role !== "student"}
      >
        {busy ? "保存中…" : "保存训练偏好"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
