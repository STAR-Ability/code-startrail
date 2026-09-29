"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/v2/client";
import { goals, type Learner } from "@/lib/v2/types";
import { Check, LoaderCircle, Save } from "lucide-react";
export function ProfileForm({ user }: { user: Learner }) {
  const [goal, setGoal] = useState(user.goal);
  const [difficulty, setDifficulty] = useState(user.difficulty);
  const [dailyMinutes, setDailyMinutes] = useState(user.dailyMinutes);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  return (
    <form
      className="profile-form"
      onChange={() => setMessage("")}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        setFailed(false);
        try {
          await api("profile", { goal, difficulty, dailyMinutes });
          setMessage("偏好已保存，下一次推荐将使用这些设置。");
          router.refresh();
        } catch (e) {
          setFailed(true);
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-section-heading">
        <h3>训练偏好</h3>
        <span>为下一次练习做准备</span>
      </div>
      <fieldset disabled={busy || user.role !== "student"}>
        <legend className="sr-only">训练偏好</legend>
        <label>
          当前训练目标
          <select
            name="goal"
            aria-describedby="goal-note"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            {goals.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <p className="field-note" id="goal-note">
          目标改变推荐偏好，训练方式始终保持简单。
        </p>
        <div className="form-columns">
          <label>
            当前推荐难度
            <select
              name="difficulty"
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
              name="dailyMinutes"
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
      </fieldset>
      <div className="form-section-heading environment-heading">
        <h3>训练环境</h3>
        <span>当前演示空间</span>
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
        type="submit"
        className="button primary"
        disabled={busy || user.role !== "student"}
      >
        {busy ? (
          <LoaderCircle className="spinning" size={16} aria-hidden="true" />
        ) : (
          <Save size={16} aria-hidden="true" />
        )}
        {busy ? "保存中…" : "保存训练偏好"}
      </button>
      {user.role !== "student" && (
        <p className="field-note">切换为 Student Demo 后可调整个人训练偏好。</p>
      )}
      <p
        role="status"
        className={`form-message ${failed ? "error" : "success"}`}
      >
        {message && !failed && <Check size={16} aria-hidden="true" />}
        {message}
      </p>
    </form>
  );
}
