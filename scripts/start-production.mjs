import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const standalone = resolve(root, ".next/standalone");
if (!existsSync(resolve(standalone, "server.js"))) {
  console.error("缺少生产构建，请先运行 npm run build。");
  process.exit(1);
}

// standalone 默认不复制静态资源。Dockerfile 执行同样的 COPY。
cpSync(resolve(root, ".next/static"), resolve(standalone, ".next/static"), {
  recursive: true,
});
cpSync(resolve(root, "public"), resolve(standalone, "public"), {
  recursive: true,
});
const args = process.argv.slice(2);
const portIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
const port = portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || "3000";
if (!port || !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error("端口必须是 1 到 65535 之间的整数。");
  process.exit(1);
}
const server = spawn(process.execPath, [resolve(standalone, "server.js")], {
  cwd: standalone,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOSTNAME: "0.0.0.0",
    PORT: port,
    APP_ROOT: root,
    DATABASE_PATH: process.env.DATABASE_PATH || resolve(root, "storage/codestartrail.sqlite"),
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
