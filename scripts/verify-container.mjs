import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const baseURL = process.env.DEMO_URL || "http://127.0.0.1:3000";
const output = resolve(
  process.env.DEMO_SCREENSHOTS || "test-results/container",
);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [name, route] of [
    ["home", "/"],
    ["training", "/training"],
    ["problem", "/problem/p01"],
    ["history", "/history"],
    ["profile", "/profile"],
  ]) {
    const response = await page.goto(`${baseURL}${route}`, {
      waitUntil: "networkidle",
    });
    if (response.status() !== 200)
      throw new Error(`${route}: HTTP ${response.status()}`);
    await page.screenshot({
      path: resolve(output, `${name}-desktop.png`),
      fullPage: true,
    });
    console.log(`PASS ${route}: HTTP 200, ${await page.title()}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, route] of [
    ["home", "/"],
    ["problem", "/problem/p01"],
    ["profile", "/profile"],
  ]) {
    await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: resolve(output, `${name}-mobile.png`),
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    if (overflow) throw new Error(`${route} has horizontal overflow`);
  }
  await page.getByLabel("演示角色切换").selectOption("coach");
  await page.waitForURL("**/coach");
  await page.screenshot({
    path: resolve(output, "coach-mobile.png"),
    fullPage: true,
  });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`PASS browser errors: 0. Screenshots: ${output}`);
} finally {
  await browser.close();
}
