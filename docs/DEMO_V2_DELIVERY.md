# 码练星轨 Demo V2 交付与验证

日期：2026-09-28。架构决策先于实现，详见 [架构评审](DEMO_V2_ARCHITECTURE_REVIEW.md)；运行、备份、学校部署与演示步骤见 [README](../README.md)。

## 1. 从 V1 到 V2

V1 已有 Next.js/React 工程、standalone Docker/GHCR 和本机草稿，但 12 道静态题不执行代码，AC 由用户手动标记，localStorage 不能为跨角色汇总提供可靠来源；完整提示随题目传给浏览器，多场景入口和复杂看板削弱了训练主线。

V2 保留工程基础，替换训练领域模型、页面与数据流。前台只有“训练 / 记录 / 我的”，默认首页推荐一道题。真实 C++17 执行、分级提示、提交与训练场次、下一题、Coach 共用数据库构成完整闭环。旧账户、本机模拟结果不伪装成真实历史导入；V1 入口重定向，历史 PRD/研究资料保留。

## 2. 最终技术选择与偏离

| 领域 | 最终选择 | 偏离候选方案的原因 |
| --- | --- | --- |
| Web | Next.js 全栈、React、TypeScript | 复用现有路由、SSR 与镜像；少维护独立后端和身份传递 |
| 数据库 | SQLite WAL、本地命名卷 | 单实例、少用户、短事务足够；减少 PostgreSQL 服务、密码与运维；多实例时再迁移 |
| ORM | Drizzle + better-sqlite3 | 显式 SQL migration 与 TS 类型，当前不需要 Prisma 的生成配置；没有同时引入两套 ORM |
| Judge | go-judge v1.13.0，固定校验值 | 复用 namespace/cgroup/seccomp、文件生命周期和 HTTP；只写业务适配，不自研 FastAPI/subprocess 沙箱 |
| 编辑器与样式 | CodeMirror、普通 CSS | C++ 高亮与编辑足够；省去 Monaco worker 与额外样式框架迁移 |
| 题库 | 24 个版本化 JSON 题包 → DB | Git 可审核、seed 可校验；公开元数据与隐藏测试/提示隔离 |
| 部署 | Compose `web + judge` | SQLite 无独立 DB 容器；当前受限同步判题不引入 Redis/队列 |

官方调研涵盖 Next 自托管、Judge0、Piston、isolate、nsjail、go-judge、SQLite/PostgreSQL、Prisma/Drizzle、编辑器与 Docker；访问日期、链接、定性比较、第三方维护风险和未来演进路径均在架构评审中。

## 3. 交付文件

| 文件/目录 | 内容 |
| --- | --- |
| `src/app/training/`、`problem/[id]/`、`history/`、`profile/` | 学生训练主线 |
| `src/app/coach/`、`coach/students/`、`coach/student/[id]/` | 最小团队工作台、成员与详情 |
| `src/components/v2/`、`src/app/globals.css` | 编辑器、训练室、记录、偏好、导航与响应式视觉 |
| `src/app/api/[...path]/route.ts`、`api/health/route.ts` | 参数/来源/权限校验、训练 API、健康状态 |
| `src/server/repository.ts`、`auth.ts`、`judge.ts` | 持久化业务、有限 Demo 会话、真实 Judge 适配 |
| `src/server/db/`、`migrations/`、`drizzle.config.ts` | schema、版本化 migration、幂等 seed |
| `src/lib/v2/` | 领域契约、规则推荐、MockTrainingAgent、客户端 API |
| `problem-packages/`、`tests/fixtures/solutions/` | 24 题、48 样例、144 隐藏测试、24 份 C++ 参考解 |
| `scripts/build-problem-packages.py`、`seed.ts`、`backup.mjs` | Python oracle/题包维护、初始化、在线备份 |
| `judge/Dockerfile*`、`judge/entrypoint.sh`、`scripts/download-judge.py` | 固定版本、校验下载、离线构建、私有 cgroup 启动 |
| `Dockerfile`、`docker-compose*.yml`、`.env.example` | Web/Judge 两服务，本地与 GHCR 部署 |
| `.github/workflows/docker.yml` | 自动验证及两个多架构镜像的发布流程 |
| `tests/domain.test.ts`、`tests/judge/real.test.ts`、`tests/browser/v2.spec.ts` | 领域、真实执行/隔离、浏览器闭环验收 |
| `scripts/verify-container.mjs` | 容器页面与手机布局截图验收 |

移除了不再使用的 V1 组件、localStorage 账户/训练模型、静态题目和旧契约测试；`DELIVERY.md` 已标记为历史文档。原始问卷、研究生成物、测试代码、本机 DB 和缓存二进制不进入产品镜像。

## 4. 数据库结构

10 张表（另有 Drizzle migration 元数据）：

| 表 | 关系与职责 |
| --- | --- |
| `users` | 演示用户及目标、难度、每日训练时间 |
| `problems` | 公开题面 JSON、服务端私有提示和复盘 |
| `problem_test_cases` | FK→problems，隐藏输入/答案，题目+序号唯一 |
| `training_records` | FK→users/problems；独立场次、时间、状态、提示暴露、live/seed；同用户同题仅一个 active |
| `submissions` | FK→training_records/users/problems；样例/正式、代码 hash、幂等请求、结果和来源 |
| `recommendations` | 用户下一题、解释、依据与时间 |
| `agent_sessions` | 训练关联的卡点、层级、内容、最近 Verdict；用户+请求唯一 |
| `teams` / `team_members` | 团队及成员，组合主键和 FK |
| `demo_sessions` | 随机会话 token、用户与有效期 |

WAL、外键、busy timeout、短事务；网络判题不占用数据库事务。只存代码 hash，草稿在浏览器，Coach 不读取代码全文。seed 不覆盖用户偏好和真实记录；已有题包被修改时要求使用新 ID，避免历史记录与题面错位。备份使用 SQLite 在线备份 API；已测试关闭重开和备份恢复。

## 5. Judge、推荐与 Agent

Judge 编译一次再执行每个测试点，C++17 / g++ 12.2，按空白分隔 token 精确比较。支持 AC、WA、CE、TLE、RE、MLE、OLE，基础设施故障记 SYSTEM_ERROR。样例运行不完成训练、不进入正式推荐证据；正式结果只给汇总，禁止回传隐藏输入、输出、stderr。

每用户一个、全局两个活动提交；每用户每分钟最多 15 次。请求 UUID 与代码 hash 保证重试幂等；120 秒以上遗留 PENDING 在读取/重试时恢复为系统错误。判题中刷新会恢复场次并自动查询结果，结果不会停留在过时的等待状态。

推荐排除已 AC；冷启动从难度 1 开始；无提示且用时合理的 AC 最多提升一级；使用提示/耗时较长则巩固；连续 WA/TLE 不升难度，优先同标签；结合目标与每日时间排序。每次建议带依据，正式提交后保存推荐变化。题库耗尽显示明确状态。

MockTrainingAgent 按当前题目、卡点、实际 Verdict 和服务端层级返回 Hint 1–3。完整复盘需要明确点击确认；刷新、重新训练仍保留同题最高帮助暴露。它不调用 LLM、不分析代码，也不把“没用提示”当作已经掌握知识。

## 6. 页面、账号与演示

页面：`/training`、`/problem/[id]`、`/history`、`/profile`、`/coach`、`/coach/students`、`/coach/student/[id]`。根路径进入训练；旧 `/student`、`/account`、`/innovation`、旧训练页转向新入口。

右上角切换 **Student Demo / Coach Demo**，不需要密码；团队共 6 名学生，默认学生从空历史开始，其他成员的合成历史明确标识。服务端校验角色/归属，但任何演示访问者都能主动切换角色，因此不属于正式认证。

3–5 分钟演示：训练首页推荐 → 开始两数之和 → 输入 README 的代码并将 `a+b` 改成 `a-b` → 运行样例/正式提交得到 WA → “我卡住了”选择 WA、获取 Hint 1 → 改回 `a+b` 得到 AC → 看摘要/记录/下一题 → 切 Coach Demo 查看刚产生的记录。

```bash
docker compose up -d --build
# 默认仅本机：http://localhost:3000
```

首次构建需要网络，运行不需要外部模型 Key。受限网络可预下载已校验 Judge 二进制、使用 ECR/Debian 镜像源，或在联网构建机 `docker save` 两镜像后转移；具体命令见 README。学校部署通过 GHCR 拉取两个镜像；本轮没有推送或发布。

## 7. 实测与验收

环境：Node 24.18.0；Docker 29.5.2，Colima Linux amd64、内核 6.8、cgroup v2，2 CPU / 约 2 GB VM。建议正式演示机至少 4 GB。该低内存 VM 的镜像层复制较慢，不代表推荐资源配置。

| 检查 | 结果 |
| --- | --- |
| `npm run lint`、`npm run build`、`npm run typecheck` | 通过 |
| `npm test` | 8 项通过：seed、推荐、提示、提交幂等/限流、过期任务、系统故障、备份恢复等 |
| `npm run test:judge` | 最终身份配置下 3 项通过；24×8=192 测试点全部 AC；6 类错误 Verdict 正确；隐藏回显不返回 |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` | 最终 3 项通过：真实训练闭环、判题中刷新恢复、角色/接口/提示门控、偏好持久化、390px 页面；禁用浏览器 randomUUID 后闭环仍通过 |
| 隔离程序实测 | UID 1000、CapEff=0、NoNewPrivs=1、Seccomp=2；系统目录不可写、Web DB 不可见、外网连接失败、子进程上限、缓存清理 |
| 浏览器 JS 检查 | 未出现题包私有 Hint/完整解题轮廓；API/HTML 的私有载荷另由浏览器测试检查 |
| Compose 配置 | 本地/部署 YAML 校验通过，正式 Judge 无宿主机端口 |
| 两个 Linux amd64 镜像 | 实际构建成功；Web 约 83 MiB，Judge 约 130 MiB；Web UID 1001，SQLite 3.53.4 原生驱动运行正常 |
| 完整 Compose 实际运行 | 两服务 healthy；内网真实 sample AC → submit WA → Hint 1 → AC → 下一题 → Coach 记录通过 |
| 更新镜像、重建 Web 容器 | 命名卷内训练状态、3 次样例/正式操作、提示和偏好全部保留 |
| 容器在线备份 | 备份副本 integrity_check=ok，包含实际训练记录 |
| 镜像内容检查 | 仅运行文件、依赖、题包、migration 与数据库卷；无问卷、研究/申报材料、测试/参考解或维护脚本 |
| `DEMO_URL=http://127.0.0.1:3300 node scripts/verify-container.mjs` | 容器页面 HTTP 200、脚本错误 0；桌面与 390px 布局通过，截图位于 `test-results/container/` |

本次 Web 镜像 ID 前缀 `ecfb182667a8`，Judge `d7f3ca7e7528`。验证使用独立 Compose project `codestartrail-v2-check` 与测试卷，保留验收数据；不清空或导入用户的 V1 数据。

交付时验收项目已停止，默认 `codestartrail` 两容器均 healthy，Web 镜像标记为 `acm-training-agent:latest`。访问 <http://localhost:3000> 可开始演示；默认学生历史为 0，首题“两数之和”，Judge 无宿主机端口。该状态仅指本机运行，未部署学校服务器或发布 GHCR。

## 8. 安全边界与未实现项

Judge 控制器使用 privileged，只适合专用受控 Demo 主机/VM；用户编译与运行使用成熟沙箱、非 root 映射、namespace、cgroup、seccomp、CPU/墙钟/内存/输出/进程限制。没有给 Web Docker socket，也没有挂载宿主目录或数据库到 Judge。不能把本项目直接作为公网匿名代码执行服务。

实测修复：private cgroup v2 空前缀；默认配置报告 UID 1000 但实际未降权；Docker internal 网络与端口发布。修复细节和防回归检查见架构评审第 7 节。

尚未实现/验收：真实账号、多租户、LLM、异步持久队列、多 Judge worker、多语言、正式教学质量/难度校准、学习效果验证；学校实机与 arm64/cgroup v1 运行；GHCR 实际发布；公网安全审计与压力测试。SQLite 演进到 PostgreSQL 需要 schema 和数据迁移，不能只换连接串。
