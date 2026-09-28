import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test.describe.configure({ mode: "serial" });
const correct = readFileSync("tests/fixtures/solutions/p01.cpp", "utf8");

test("recommend → real sample → WA → Hint → AC → next → Coach sees live result", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, "randomUUID", { value: undefined });
  });
  await page.goto("/training");
  await expect(
    page.getByRole("heading", { name: "下一道题，练得更准确。" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "主导航" }).getByRole("link"),
  ).toHaveCount(3);
  await page.screenshot({
    path: "test-results/training-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "开始训练", exact: true }).click();
  await expect(page).toHaveURL(/\/problem\/p01/);
  const editor = page.getByTestId("code-editor");
  await expect(
    page.getByRole("button", { name: "运行样例", exact: true }),
  ).toBeEnabled();
  await editor.fill(correct);
  const sampleRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/submissions") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "运行样例", exact: true }).click();
  const trainingId = (await sampleRequest).postDataJSON().trainingId;
  await expect
    .poll(async () => {
      const session = await (
        await page.request.get(`/api/sessions/${trainingId}`)
      ).json();
      return session.submissions.some(
        (s: { verdict: string }) => s.verdict === "PENDING",
      );
    })
    .toBe(true);
  await page.reload();
  await expect(page.locator(".result-summary .verdict")).toHaveText("AC", {
    timeout: 30000,
  });
  await expect(
    page.getByRole("heading", { name: "训练完成", exact: true }),
  ).toHaveCount(0);
  await editor.fill(correct.replace("a+b", "a+b+1"));
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await expect(page.locator(".result-summary .verdict")).toHaveText("WA", {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "我卡住了", exact: true }).click();
  await page.getByLabel("你现在卡在哪里？").selectOption("WA");
  await page.getByRole("button", { name: "给我下一步提示" }).click();
  await expect(page.locator(".hint-message")).toHaveCount(1);
  await expect(page.locator(".hint-message")).toContainText("最近判题：WA");
  await expect(page.locator(".hint-message")).not.toContainText(
    "时间和额外空间均为 O(1)",
  );
  await page.screenshot({
    path: "test-results/problem-hint-desktop.png",
    fullPage: true,
  });
  await editor.fill(correct);
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "训练完成", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".completion")).toContainText("提交 2 次");
  await expect(page.locator(".completion")).toContainText("最高 Hint 1");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "训练完成", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "推荐下一道题" }).click();
  await expect(page.locator(".recommendation h2")).not.toHaveText("两数之和");
  await page.getByRole("link", { name: "记录", exact: true }).click();
  await expect(page.locator(".history-item").first()).toContainText("两数之和");
  await page.getByLabel("演示角色切换").selectOption("coach");
  await expect(page).toHaveURL(/\/coach$/);
  await expect(
    page.getByRole("heading", { name: "了解过程，再安排下一步。" }),
  ).toBeVisible();
  await expect(
    page
      .locator("tr")
      .filter({ hasText: "Student Demo" })
      .filter({ hasText: "两数之和" })
      .first(),
  ).toContainText("真实判题");
  await page.screenshot({
    path: "test-results/coach-desktop.png",
    fullPage: true,
  });
  await page.goto("/coach/student/student");
  await expect(page.locator(".history-item")).toContainText("2 次提交");
  await expect(
    page.getByText("最近 Agent 使用", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("profile persistence, protected APIs, server hint gating and private payload", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/coach")).status()).toBe(403);
  const p = await (await request.get("/api/problems/p02")).json();
  expect(p).not.toHaveProperty("hints");
  expect(p).not.toHaveProperty("hiddenTests");
  expect(p).not.toHaveProperty("solutionOutline");
  const html = await (await request.get("/problem/p02")).text();
  expect(html).not.toContain("不要用 n%2==1");
  const session = await (
    await request.post("/api/sessions", { data: { problemId: "p02" } })
  ).json();
  const forged = await request.post("/api/agent/hint", {
    data: {
      trainingId: session.training.id,
      stuckType: "WA",
      action: "next",
      level: 4,
      requestId: crypto.randomUUID(),
    },
  });
  expect(forged.status()).toBe(400);
  const hint = await request.post("/api/agent/hint", {
    data: {
      trainingId: session.training.id,
      stuckType: "WA",
      action: "next",
      requestId: crypto.randomUUID(),
    },
  });
  expect((await hint.json()).level).toBe(1);
  expect(
    (
      await request.post("/api/sessions", {
        headers: { origin: "https://unrelated.example" },
        data: { problemId: "p02" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/submissions", {
        data: {
          trainingId: session.training.id,
          code: "x".repeat(80000),
          mode: "submit",
          seconds: 0,
          requestId: crypto.randomUUID(),
        },
      })
    ).status(),
  ).toBe(413);
  await page.goto("/profile");
  await page.getByLabel("当前训练目标").selectOption("数据结构与算法");
  await page.getByLabel("每日训练时间").selectOption("45");
  await page.getByRole("button", { name: "保存训练偏好" }).click();
  await expect(page.getByRole("status")).toContainText("偏好已保存");
  await page.reload();
  await expect(page.getByLabel("每日训练时间")).toHaveValue("45");
  await page.goto("/problem/p02");
  await expect(
    page.getByRole("button", { name: "运行样例", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "我卡住了", exact: true }).click();
  await page.getByRole("button", { name: "结束独立尝试，查看复盘" }).click();
  await expect(
    page.getByRole("group", { name: "确认查看完整讲解" }),
  ).toBeVisible();
  await expect(page.locator(".hint-message")).not.toContainText(
    "不要用 n%2==1",
  );
  await page.getByRole("button", { name: "确认查看复盘" }).click();
  await expect(page.locator(".hint-message").last()).toContainText(
    "不要用 n%2==1",
  );
});

test("all pages render and mobile layout has no page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/training",
    "/problem/p03",
    "/history",
    "/profile",
    "/coach",
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      route,
    ).toBe(true);
    await page.screenshot({
      path: `test-results/mobile-${route.replaceAll("/", "-")}.png`,
      fullPage: true,
    });
  }
  await page.getByLabel("演示角色切换").selectOption("coach");
  await expect(
    page.getByRole("heading", { name: "了解过程，再安排下一步。" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-coach.png",
    fullPage: true,
  });
  await page.goto("/coach/students");
  await expect(
    page.getByRole("heading", { name: "一起训练的人。" }),
  ).toBeVisible();
  expect((await page.goto("/problem/not-a-problem"))?.status()).toBe(404);
});
