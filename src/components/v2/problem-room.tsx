"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Send,
  Sparkles,
  Pause,
  Clock3,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { CodeEditor } from "./editor";
import { VerdictBadge } from "./shared";
import { api, dateTime, duration, newRequestId } from "@/lib/v2/client";
import {
  stuckTypes,
  template,
  type PublicProblem,
  type StuckType,
} from "@/lib/v2/types";
import type { TrainingRow, SubmissionRow, HintRow } from "@/server/repository";

type SessionState = {
  training: TrainingRow;
  hints: HintRow[];
  submissions: SubmissionRow[];
};
export function ProblemRoom({
  problem,
  userId,
  canTrain,
}: {
  problem: PublicProblem;
  userId: string;
  canTrain: boolean;
}) {
  const key = `startrail:v2:${userId}:${problem.id}`;
  const [state, setState] = useState<SessionState | null>(null);
  const [code, setCode] = useState(template);
  const [seconds, setSeconds] = useState(0);
  const secondsRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [agentOpen, setAgentOpen] = useState(false);
  const [stuck, setStuck] = useState<StuckType>("不知道怎么开始");
  const [review, setReview] = useState(false);
  const [storage, setStorage] = useState("草稿保存在本机");
  const [restart, setRestart] = useState(0);
  const trainingId = state?.training.id;
  const active = state?.training.status === "active";
  const pending = state?.submissions.some((item) => item.verdict === "PENDING");
  const updateSession = useCallback(async (id: string) => {
    const next = await api<SessionState>(`sessions/${id}`);
    setState(next);
    return next;
  }, []);
  useEffect(() => {
    let alive = true;
    if (!canTrain) return;
    async function initialize() {
      let saved: { code?: string; trainingId?: string } = {};
      try {
        saved = JSON.parse(localStorage.getItem(key) || "{}");
      } catch {
        /* local draft is optional */
      }
      try {
        let initial: SessionState;
        if (saved.trainingId && restart === 0) {
          try {
            initial = await api<SessionState>(`sessions/${saved.trainingId}`);
          } catch {
            initial = await api<SessionState>("sessions", {
              problemId: problem.id,
            });
          }
        } else
          initial = await api<SessionState>("sessions", {
            problemId: problem.id,
          });
        if (!alive) return;
        setCode(typeof saved.code === "string" ? saved.code : template);
        setState(initial);
        setSeconds(initial.training.elapsedSeconds);
        secondsRef.current = initial.training.elapsedSeconds;
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    }
    void initialize();
    return () => {
      alive = false;
    };
  }, [key, problem.id, canTrain, restart]);
  useEffect(() => {
    if (!state) return;
    const save = () => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ code, trainingId: state.training.id }),
        );
      } catch {
        setStorage("本机存储不可用，请保留自己的代码");
      }
    };
    const timeout = setTimeout(save, 300);
    window.addEventListener("pagehide", save);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [key, code, state]);
  useEffect(() => {
    if (!trainingId || !active) return;
    let previous = Date.now();
    const tick = setInterval(() => {
      const now = Date.now();
      const delta = Math.min(2, Math.floor((now - previous) / 1000));
      previous = now;
      if (document.hidden || paused || delta <= 0) return;
      secondsRef.current += delta;
      setSeconds(secondsRef.current);
    }, 1000);
    const save = () => {
      void fetch("/api/sessions/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingId, seconds: secondsRef.current }),
        keepalive: true,
      }).catch(() => {});
    };
    const sync = setInterval(save, 10_000);
    const visibility = () => {
      previous = Date.now();
      if (document.hidden) save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(tick);
      clearInterval(sync);
      save();
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [trainingId, active, paused]);
  useEffect(() => {
    if (!trainingId || !pending) return;
    let alive = true;
    let loading = false;
    const poll = setInterval(async () => {
      if (loading) return;
      loading = true;
      try {
        const next = await api<SessionState>(`sessions/${trainingId}`);
        if (alive) setState(next);
      } catch {
        // Retry after a transient disconnect; the server recovers stale jobs.
      } finally {
        loading = false;
      }
    }, 1500);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [trainingId, pending]);
  async function judge(mode: "sample" | "submit") {
    if (!trainingId || busy) return;
    setBusy(mode);
    setError("");
    try {
      await api<SubmissionRow>("submissions", {
        trainingId,
        code,
        mode,
        requestId: newRequestId(),
        seconds: secondsRef.current,
      });
      await updateSession(trainingId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function hint(action: "next" | "review") {
    if (!trainingId || busy) return;
    setBusy("hint");
    setError("");
    try {
      await api("agent/hint", {
        trainingId,
        stuckType: stuck,
        action,
        requestId: newRequestId(),
      });
      await updateSession(trainingId);
      setReview(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function finish() {
    if (!trainingId) return;
    setBusy("finish");
    setError("");
    try {
      await api("sessions/finish", { trainingId, seconds: secondsRef.current });
      await updateSession(trainingId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const result = state?.submissions[0];
  const submissions =
    state?.submissions.filter((a) => a.mode === "submit") || [];
  return (
    <>
      <div className="breadcrumb">
        <Link href="/training">
          <ArrowLeft size={15} />
          返回训练
        </Link>
        <span>/</span>
        <span>专注训练室</span>
        <span className="room-timer">
          <Clock3 size={15} />
          {duration(seconds)}
          <button
            className="icon-button"
            disabled={!active}
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "继续计时" : "暂停计时"}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <small>{paused ? "已暂停" : "仅累计本页可见时间"}</small>
        </span>
      </div>
      {!canTrain && (
        <p className="notice">切换右上角 Student Demo 后即可编写和提交代码。</p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() =>
              trainingId
                ? updateSession(trainingId).catch(() => {})
                : setRestart((v) => v + 1)
            }
          >
            重新加载训练状态
          </button>
        </p>
      )}
      <div className="room-grid">
        <article className="statement panel">
          <div className="panel-header">
            <span>题目</span>
            <span className="muted">{problem.id.toUpperCase()}</span>
          </div>
          <div className="statement-body">
            <div className="problem-meta">
              <span>难度 {problem.difficulty} / 5</span>
              <span>
                {problem.timeLimitMs} ms · {problem.memoryLimitMb} MB
              </span>
            </div>
            <h1>{problem.title}</h1>
            <div className="tags">
              {problem.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <p>{problem.description}</p>
            <h2>输入格式</h2>
            <p>{problem.inputDescription}</p>
            <h2>输出格式</h2>
            <p>{problem.outputDescription}</p>
            <h2>公开样例</h2>
            {problem.samples.map((sample, i) => (
              <div className="sample" key={i}>
                <div className="sample-heading">样例 {i + 1}</div>
                <div className="sample-columns">
                  <div>
                    <small>输入</small>
                    <pre>{sample.input}</pre>
                  </div>
                  <div>
                    <small>输出</small>
                    <pre>{sample.output.trim() || "（空输出）"}</pre>
                  </div>
                </div>
              </div>
            ))}
            <p className="source-note">
              {problem.source} · v{problem.version}
              <br />
              按空白分隔比较输出；额外文本会导致 WA。
            </p>
          </div>
        </article>
        <div className="coding-column">
          <section className="panel editor-panel">
            <div className="panel-header">
              <span>
                <span className="language-dot" />
                main.cpp
              </span>
              <span className="mono muted">C++17</span>
            </div>
            <CodeEditor value={code} onChange={setCode} />
            <div className="editor-footer">
              <small>{storage} · Tab 可移出编辑器</small>
              <span>UTF-8</span>
            </div>
            <div className="editor-actions">
              <button
                className="button secondary"
                disabled={!!busy || !!pending || !active}
                onClick={() => judge("sample")}
              >
                <Play size={15} />
                {busy === "sample" ? "运行中…" : "运行样例"}
              </button>
              <button
                className="button primary"
                disabled={!!busy || !!pending || !active}
                onClick={() => judge("submit")}
              >
                <Send size={15} />
                {busy === "submit" ? "判题中…" : "提交"}
              </button>
              <button
                className="button help-button"
                disabled={!state}
                onClick={() => setAgentOpen(!agentOpen)}
                aria-expanded={agentOpen}
              >
                <Sparkles size={16} />
                我卡住了
              </button>
            </div>
          </section>
          <section className="panel result-panel" aria-live="polite">
            <div className="panel-header">
              <span>运行与判题</span>
              <span className="small-label">
                {busy === "submit" || busy === "sample" || pending
                  ? "正在隔离环境中执行"
                  : "C++17"}
              </span>
            </div>
            {result ? (
              <div className="result-body">
                <div className="result-summary">
                  <VerdictBadge verdict={result.verdict} />
                  <strong>
                    {result.mode === "sample" ? "公开样例" : "正式提交"}
                  </strong>
                  <span>
                    {result.result
                      ? `${result.result.passed} / ${result.result.total} 测试通过`
                      : "等待结果"}
                  </span>
                </div>
                {result.result?.message && <p>{result.result.message}</p>}
                {result.result?.compileOutput && (
                  <pre className="compiler-output">
                    {result.result.compileOutput}
                  </pre>
                )}
                {result.result?.samples?.map((sample) => (
                  <details
                    key={sample.index}
                    className="sample-result"
                    open={sample.verdict !== "AC"}
                  >
                    <summary>
                      Sample {sample.index}{" "}
                      <VerdictBadge verdict={sample.verdict} />
                    </summary>
                    <div className="sample-columns">
                      <div>
                        <small>Expected</small>
                        <pre>{sample.expected || "（空）"}</pre>
                      </div>
                      <div>
                        <small>Actual</small>
                        <pre>{sample.actual || "（空）"}</pre>
                      </div>
                    </div>
                    {sample.stderr && <pre>{sample.stderr}</pre>}
                  </details>
                ))}
                {result.mode === "submit" && (
                  <p className="muted">
                    最大单点耗时 {result.result?.timeMs || 0} ms · 峰值内存{" "}
                    {result.result?.memoryKb || 0} KiB
                    <br />
                    隐藏测试仅显示汇总结果。
                  </p>
                )}
              </div>
            ) : (
              <div className="result-empty">
                <span className="terminal-glyph">›_</span>
                <p>先运行样例，验证你的第一步。</p>
                <small>正式提交会执行公开样例和隐藏测试。</small>
              </div>
            )}
          </section>
          {agentOpen && (
            <section className="panel agent-panel">
              <div className="panel-header">
                <span>
                  <Sparkles size={16} />
                  训练中的助手
                </span>
                <span className="small-label">Demo Agent · 预设内容</span>
              </div>
              <div className="agent-body">
                <label htmlFor="stuck">你现在卡在哪里？</label>
                <select
                  id="stuck"
                  value={stuck}
                  onChange={(e) => setStuck(e.target.value as StuckType)}
                >
                  {stuckTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                {state?.hints.map((h) => (
                  <div className="hint-message" key={h.id}>
                    <strong>
                      {h.level === 4 ? "复盘讲解" : `Hint ${h.level}`}
                      <span>{h.stuckType}</span>
                    </strong>
                    <p>{h.content}</p>
                  </div>
                ))}
                {state &&
                  state.training.hintLevel > 0 &&
                  !state.hints.length && (
                    <p className="muted">
                      此前已经看过 Hint {state.training.hintLevel}
                      。历史帮助使用会保留，不计作全新独立训练。
                    </p>
                  )}
                <div className="button-row">
                  <button
                    className="button secondary"
                    disabled={
                      !!busy || !active || (state?.training.hintLevel || 0) >= 3
                    }
                    onClick={() => hint("next")}
                  >
                    {busy === "hint" ? "正在整理…" : "给我下一步提示"}
                    <ChevronRight size={15} />
                  </button>
                  <button
                    className="text-button"
                    disabled={
                      !!busy || !active || state?.training.hintLevel === 4
                    }
                    onClick={() => setReview(true)}
                  >
                    结束独立尝试，查看复盘
                  </button>
                </div>
                {review && (
                  <div
                    className="review-confirm"
                    role="group"
                    aria-label="确认查看完整讲解"
                  >
                    <p>
                      复盘会展示完整解题轮廓，并记录已使用讲解。之后仍可提交验证代码。
                    </p>
                    <button
                      className="button primary"
                      onClick={() => hint("review")}
                      disabled={!!busy}
                    >
                      确认查看复盘
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setReview(false)}
                    >
                      继续自己思考
                    </button>
                  </div>
                )}
                <small>
                  提示根据当前题目、卡点和最近判题组织；不会自动读取或分析你的代码。
                </small>
              </div>
            </section>
          )}
        </div>
      </div>
      {state && !active ? (
        <section className="completion">
          <CheckCircle2 size={26} />
          <div>
            <h2>
              {state.training.status === "ac" ? "训练完成" : "本次训练已记录"}
            </h2>
            <p>
              总耗时 {duration(state.training.elapsedSeconds)} · 提交{" "}
              {submissions.length} 次 · 提示 {state.training.hintCount} 次 ·
              最高 Hint {state.training.hintLevel}
            </p>
            <p>
              {submissions.some(
                (a) => !["AC", "PENDING", "SYSTEM_ERROR"].includes(a.verdict),
              )
                ? `遇到的错误：${[...new Set(submissions.filter((a) => !["AC", "PENDING", "SYSTEM_ERROR"].includes(a.verdict)).map((a) => a.verdict))].join("、")}。`
                : ""}
              {state.training.hintLevel >= 3
                ? "本题使用了结构提示或讲解，下一题先尝试独立推导。"
                : "用下一道题检验这次思路能否复用。"}
            </p>
          </div>
          <Link href="/training" className="button primary">
            推荐下一道题
            <ArrowRight size={16} />
          </Link>
          <button
            className="text-button"
            onClick={() => {
              setState(null);
              setRestart((v) => v + 1);
            }}
          >
            重新训练此题
          </button>
        </section>
      ) : (
        state && (
          <div className="finish-row">
            <span>需要休息时，也可以保存这次尝试。</span>
            <button
              className="text-button"
              disabled={!!busy || !!pending}
              onClick={finish}
            >
              结束本次训练，记录为未完成
            </button>
          </div>
        )
      )}
      {!!state?.submissions.length && (
        <section className="submission-log">
          <h2>本次提交记录</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作</th>
                  <th>结果</th>
                  <th>测试通过</th>
                </tr>
              </thead>
              <tbody>
                {state.submissions.map((a) => (
                  <tr key={a.id}>
                    <td>{dateTime(a.createdAt)}</td>
                    <td>{a.mode === "sample" ? "运行样例" : "正式提交"}</td>
                    <td>
                      <VerdictBadge verdict={a.verdict} />
                    </td>
                    <td>
                      {a.result
                        ? `${a.result.passed} / ${a.result.total}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
