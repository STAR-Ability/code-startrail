import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

// 本地健康检查不经过系统 HTTP 代理，兼容校园网及开发机代理环境。
process.env.NO_PROXY = [process.env.NO_PROXY, "localhost", "127.0.0.1", "::1"]
  .filter(Boolean)
  .join(",");
process.env.no_proxy = process.env.NO_PROXY;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 90000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    env: {
      DATABASE_PATH: resolve(`storage/e2e-${process.pid}.sqlite`),
      JUDGE_URL: process.env.JUDGE_URL || "http://127.0.0.1:5050",
    },
    timeout: 60000,
  },
});
