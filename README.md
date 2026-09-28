# 码练星轨 · codeStartrail

**程序训练 + Agent 辅助。** 一次推荐一道题，真实编写 C++17、运行与提交，卡住时获取逐级提示，再根据训练结果推荐下一题。

Demo V2 面向受控演示环境。推荐与 Agent 使用规则和预设内容；判题由真实编译和执行产生。默认演示账户共享，不用于真实学生数据或公网匿名代码执行。

## 先读架构判断

[架构评审与官方调研来源](docs/DEMO_V2_ARCHITECTURE_REVIEW.md)记录了 V1 审计、候选比较、取舍与未来迁移；[交付与验证记录](docs/DEMO_V2_DELIVERY.md)记录实际验收。

最终选择 **Next.js 全栈 + SQLite WAL / Drizzle + go-judge + CodeMirror**，Compose 两个服务：

```text
Browser → Next.js Web → SQLite（独立持久卷）
                     → DemoRecommendationEngine / MockTrainingAgent
                     → 内网 go-judge → 隔离编译与执行 C++17
JSON 题包 → 校验 / 幂等 Seed → 数据库
```

保留 V1 的 TypeScript、React、CSS、standalone 和 GHCR 工程基础。相比候选方案，取消独立 FastAPI、自研执行沙箱、PostgreSQL、Redis 和第三个数据库容器；单实例 Demo 可少维护一套后端和数据库服务。未来通过 Repository / JudgeClient / TrainingAgent 边界替换，SQLite→PostgreSQL 需要新迁移与数据搬迁，不能只改连接串。

## Demo V2 可以做什么

- 推荐一道未 AC 的题，解释目标、难度、标签、提示与用时依据。
- 24 道原创 Demo 题，难度 1–4，每题 2 组样例、6 组隐藏测试，共 192 组测试。
- CodeMirror C++17 编辑器，本机草稿、可暂停计时；计时仅代表本页可见时长，不等同真实学习时间。
- 编译一次，逐点执行；AC / WA / CE / TLE / RE / MLE / OLE；异常基础设施单列 SYSTEM_ERROR。
- 样例显示 Expected / Actual；正式提交只返回汇总，不泄露隐藏输入、输出或 stderr。
- 当前题内“我卡住了”，卡点选择、Hint 1–3、明确选择后才展示复盘轮廓。服务端门控，刷新或重开不会消除帮助暴露。
- 每次提交和训练场次单独保存，AC 后立即生成下一次规则推荐。重复请求幂等；服务中断的 PENDING 超过 120 秒后标记系统错误，可重新提交。
- 记录、训练偏好、最小教练概览、6 名演示成员及成员详情。教练直接读取同一批真实训练记录；合成历史另标“模拟历史”，不混入今日真实指标。

当前不做真实 LLM、完整训练教练 Agent 的长期规划/工具调用、多语言、RAG、能力评分、支付、排行榜、社区或分布式判题。旧 PRD 与长期 Agent 方案仍保存在 `docs/`，不代表本轮已实现。

## 开发与贡献

参与开发前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，其中包含团队分支、测试、PR、AI Agent 和发布规范。

核心流程：`feature/* → dev → main → Docker / GHCR`。普通开发通过 PR 进入 `dev`，版本完整验证后再 PR 到 `main`。

## 本地开发

需要 Node.js 24、npm、Docker Engine/Desktop/Colima（Linux VM）及 Compose v2。第一次安装/构建需要网络，镜像准备好后的演示不依赖外网或 API Key。

```bash
npm ci
npm run db:seed
npm run judge:dev
npm run dev
```

访问 <http://localhost:3000>。`judge:dev` 仅在回环地址 `127.0.0.1:5050` 发布 Judge，供本机 Web 访问。部署服务器不要加载 `docker-compose.dev.yml`。

默认数据库为 `storage/codestartrail.sqlite`，被 Git 忽略。`npm run db:seed` 和首次服务器访问都执行版本化 migration 与幂等 seed，已有用户偏好和训练记录不会被覆盖。修改已有题包内容会拒绝启动，应使用新题目 ID 发布修订。

`.env.example` 列出选项。Next 开发可用 `.env.local`；CLI 脚本读取进程环境，例如：

```bash
DATABASE_PATH=/absolute/path/demo.sqlite npm run db:seed
JUDGE_URL=http://127.0.0.1:5050 npm run dev
```

生产构建：

```bash
npm run lint
npm test
npm run build
npm run typecheck
npm run start
```

## Docker 部署

推荐一台专门用于演示的 Linux 主机/VM，至少 2 核、4 GB 内存，支持 namespace 和 cgroup memory/pids 控制器。go-judge 支持 cgroup v1/v2；本项目开启 `-no-fallback`，不允许 cgroup 不可用时降低隔离。

Compose 使用 private cgroup namespace。镜像启动脚本仅在当前容器的 cgroup v2 子层级启用 cpu/memory/pids；显式设置 `-container-cred-start=10000`，确保用户程序以沙箱 UID 1000 执行。不能仅凭 `/config` 中的 UID 判断实际身份，专项测试会运行程序核验。

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:3000/api/health
docker compose logs --tail 100 web judge
```

默认只绑定 `127.0.0.1:3000`。学校局域网演示可明确设置：

```bash
BIND_ADDRESS=0.0.0.0 docker compose up -d
```

公开访问应先配置学校反向代理、TLS、真实认证和专用 Judge 隔离环境。HTTPS 代理设置 `COOKIE_SECURE=true`、`APP_ORIGIN=https://你的域名`，保留原 Host；同步判题代理超时建议 120 秒、请求体限制 70 KB。Judge 不发布公网或宿主机端口。

健康响应：

```json
{"status":"ok","service":"codestartrail","database":"ready","judge":"ready"}
```

`/api/health` 校验数据库并报告 Judge 状态；Judge 故障时 Web 仍能访问题目、记录和提示，返回 `judge: "unavailable"`，不会伪造执行结果。直接 Judge 健康使用官方 `/version`（在容器内 `curl http://127.0.0.1:5050/version`），不额外创建只包装健康检查的服务。

Compose 给 Web 设置非 root、cap_drop、no-new-privileges、1 GB 内存与 PID 限制；Judge 控制器设 1.5 GB、2 CPU、并行度 2 和 PID 限制。日志每份 10 MB、保留 3 份。停止与重启保留 `training-data` 卷；`docker compose down -v` 会删除训练数据，不应用于普通升级。

### 网络不稳定 / 离线 Judge 构建

Judge 固定为官方 **go-judge v1.13.0**，amd64/arm64 二进制的 SHA-256 写入 Dockerfile，下载后必须校验。普通 Dockerfile 在构建时下载；受限网络也可以预取同一二进制：

```bash
python3 scripts/download-judge.py amd64
# ARM 机器把 amd64 改为 arm64；二进制必须与目标镜像架构一致。
docker build -f judge/Dockerfile.offline -t codestartrail-judge:1.13.0 judge
docker compose up -d --no-build judge
```

若 Docker Hub 不可达，可使用 Docker 官方镜像在 AWS Public ECR 的镜像地址；Debian 包下载可选择学校允许的 Debian 镜像站，APT 签名校验保持开启：

```bash
docker build -f judge/Dockerfile.offline \
  --build-arg DEBIAN_IMAGE=public.ecr.aws/docker/library/debian:bookworm-slim \
  --build-arg DEBIAN_MIRROR=mirrors.ustc.edu.cn \
  -t codestartrail-judge:1.13.0 judge
```

准备 Web 镜像后使用 `docker compose up -d --no-build`。离线传输需要同时打包两个镜像：

```bash
docker save acm-training-agent:latest codestartrail-judge:1.13.0 -o codestartrail-images.tar
# 目标服务器：
docker load -i codestartrail-images.tar
docker compose up -d --no-build
```

不要通过关闭 cgroup / seccomp / 断网限制来解决部署失败；应修复 VM/宿主机权限或选择可运行的独立 Judge 主机。

## Judge 的安全边界

集成成熟执行沙箱，应用只负责编译请求、测试调度、输出比较和持久化，不在 Web 进程或宿主机直接执行用户代码。

- 编译与运行都在沙箱中，以 UID 1000 执行并映射到外部非 root ID，清空有效 capabilities。控制器本身需要高权限，与用户程序权限不同。
- namespace 隔离网络/进程/文件系统；只读系统目录，每次请求有独立可写临时目录；默认启用 go-judge v1.13.0 内置 seccomp。
- 编译 CPU 10 秒、墙钟 15 秒、512 MB、32 进程；运行每点 1 秒 CPU、3.5 秒墙钟、128 MB、8 进程。stdout 64 KiB、stderr 16 KiB；文件输出也有限额。
- 编译产物在 finally 删除；服务端额外设置 2 分钟文件 TTL。退出后由 go-judge 回收进程与环境。
- Web 不持有 Docker socket。Judge 不挂数据库/源码/宿主机目录，不接收数据库凭据，不暴露内部文件 API。
- 题包在维护仓库可见，不作为保密比赛题；浏览器只收到公开字段和明确解锁的提示。正式提交不返回隐藏输出，因为用户代码能原样打印输入。

**当前 Judge 是 Demo / 内部测试级，不能直接作为公网不可信代码执行平台。** Compose 的 `privileged` 控制器会扩大宿主机攻击面，即使提交在成熟沙箱内执行，也不能宣称绝对安全。未来公网需要专用 Judge 主机/VM、真实身份与配额、补丁和安全评估、持久队列与监控；不把服务器的其他业务与 Judge 混放。

## 数据库与文件

| 数据表 | 用途 |
| --- | --- |
| users | 目标、推荐难度、每日时间、演示角色 |
| problems | 公开题面元数据、仅服务端读取的 Hint / 复盘 |
| problem_test_cases | 独立隐藏测试 |
| training_records | 每次训练的时间、状态、帮助程度、来源 |
| submissions | 样例/正式提交、幂等编号、代码 SHA-256、Verdict 与结果；不持久存代码全文 |
| recommendations | 推荐题、理由与依据 |
| agent_sessions | 实际请求的卡点、层级、提示内容和关联 Verdict |
| teams / team_members | 演示团队及成员范围 |
| demo_sessions | HttpOnly、SameSite Cookie 对应的有限演示会话 |

`problem-packages/` 为版本管理的维护源；`tests/fixtures/solutions/` 为 C++ 参考解；`scripts/build-problem-packages.py` 为维护题包的离线脚本和 Python oracle，不是产品内的自动出题功能。新 schema 使用 `npm run db:generate` 生成 migration；已有 migration 不改写。正式教学前仍应由教练审核题面/提示与难度。

### 备份与恢复

单实例 SQLite 使用 WAL、外键和 busy timeout。备份必须使用在线备份 API，不能只复制正在写入的 `.sqlite` 而漏掉 WAL：

```bash
npm run db:backup -- /absolute/path/backup.sqlite
```

容器备份：

```bash
docker compose exec web node -e 'const D=require("better-sqlite3");const db=new D(process.env.DATABASE_PATH);db.backup("/app/storage/backup.sqlite").then(()=>db.close())'
docker compose cp web:/app/storage/backup.sqlite ./backup.sqlite
```

将备份另存异机。恢复前停止 Web，备份当前卷；用备份替换数据库，并清理与旧数据库对应的 `-wal/-shm` 文件，再启动 Web，检查 integrity_check 与训练记录。不要对运行中的库进行覆盖，不在 NFS 上共享数据库给多个 Web 实例。未来多实例写入时迁移到 PostgreSQL。

## 页面与 Demo 账号

默认进入 `/training`；普通导航仅训练、记录、我的。

| 页面 | 职责 |
| --- | --- |
| `/training` | 一道推荐、原因、最近训练 |
| `/problem/p01` … `/problem/p24` | 题面、编辑器、运行、提交、Agent、复盘 |
| `/history` | 训练与提交过程、推荐变化 |
| `/profile` | 目标、难度、时间、语言与团队 |
| `/coach` | 团队概览、共性问题和下一步建议 |
| `/coach/students` | 6 名成员 |
| `/coach/student/student` | 当前演示学生的真实训练与提示使用 |

右上角“演示角色切换”选择 **Student Demo** 或 **Coach Demo**，无密码。教练入口不在学生主导航，Coach 的“我的”可管理团队。服务端校验角色与团队范围，但任意访问者都可主动切换 Demo 角色，所以这不是正式账户认证。V1 的 `/student`、`/account`、`/innovation` 和旧训练路由跳转到新入口；旧题号不强行对应新题。

## 3–5 分钟演示

1. 使用干净的 Demo 数据库，打开训练，看到“两数之和”和推荐依据。
2. 开始训练，先输入下面的代码，将 `a+b` 故意写成 `a-b`。
3. 运行样例，查看 Expected / Actual；正式提交得到 WA。
4. 点击“我卡住了”，选择 WA，获取 Hint 1；需要时继续逐级，不默认展示完整解释。
5. 改回 `a+b`，运行样例再提交，得到真实 AC。
6. 查看训练完成摘要：提交次数、提示、耗时、错误；点击“推荐下一道题”，已 AC 题不再出现。
7. 打开记录，再切换 Coach Demo，查看刚产生的真实提交和成员详情。

```cpp
#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    long long a, b;
    cin >> a >> b;
    cout << a + b << '\n';
}
```

如果已完成过第一题，可从 `/problem/p01` 重新训练；已 AC 排除与已使用提示会保留。需要全新演示时用新数据库/新 Compose project 卷，不自动清空现有数据。

## 验证与 CI / GHCR

```bash
npm run lint
npm test
npm run test:judge       # 先启动本地 Judge；真实执行 24 题与错误/隔离用例
npm run build
npm run typecheck
npx playwright install chromium
npm run test:e2e         # 3100 端口，自动创建独立测试数据库
```

本机已有 Chrome 可用 `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`。浏览器测试使用真实 Judge，不 mock 判题；覆盖 WA→Hint→AC→下一题→Coach、提示门控、隐藏载荷、Profile 和 390px 布局。`node scripts/verify-container.mjs` 可检查 3000 端口的容器并截图。

`.github/workflows/ci.yml` 在 PR 到 `dev` / `main`、push `dev` 或手动运行时执行 lint、单元测试、真实 Judge 测试、build、typecheck 和浏览器验收；失败时保存 Playwright 报告。普通功能通过 PR 进入 `dev`，版本通过 CI 和人工验收后再 PR 到 `main`。

`.github/workflows/docker.yml` 专门构建并发布 Web 与 Judge 两个 `linux/amd64` / `linux/arm64` 镜像，使用 GitHub 自带的 `GITHUB_TOKEN` 登录 GHCR，并保留分开的构建缓存：

- push / merge `main`，或手动选择 `main`：发布 `latest` 和 `sha-<完整 commit SHA>`。
- 推送或手动选择 `v*` tag：仅允许发布已合入 `main` 的提交，生成对应版本 tag 和 SHA 镜像，不覆盖 `latest`。
- push `dev` / 普通功能分支、PR 或手动选择 `dev`：不发布 Docker 镜像。

镜像拥有者统一转换为小写，本仓库地址为 `ghcr.io/star-ability/acm-training-agent` 和 `ghcr.io/star-ability/acm-training-agent-judge`。下面的 `<owner>` 替换为 `star-ability`，`<commit>` 替换为已成功发布的完整提交号；部署由项目成员另行执行：

```bash
export ACM_AGENT_IMAGE=ghcr.io/<owner>/acm-training-agent:sha-<commit>
export JUDGE_IMAGE=ghcr.io/<owner>/acm-training-agent-judge:sha-<commit>
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

首次公开 Web 和 Judge 包需分别在 GitHub 组织的 **Packages → 对应包 → Package settings → Change visibility → Public** 设置可见性，并确保组织允许 Actions 写入 Packages。同名旧包若未关联本仓库，需先授予仓库 Actions 访问权限；私有包使用学校的只读拉取凭据。回滚先保留数据库备份，使用已验证的旧镜像；应用回滚不等同于数据库回滚。

项目许可以仓库 [LICENSE](LICENSE) 正文为准。
