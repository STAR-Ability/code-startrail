# 练序 CodePath · 程序设计训练 Demo

**面向个人学习者、学生、老师与培训机构的程序设计练习与教学辅助空间。**

不再盲目刷题，让每一道题都有训练目的。

这是一套覆盖日常算法、编程入门、求职面试、考研 408 算法设计、算法竞赛与课堂培训的 **DEMO / Prototype**。无需任何 API Key，运行时不依赖外部 API、CDN、图片服务或远程字体。

## 为什么做

个人学习与课堂训练的常见问题是统一题单无法兼顾水平差异、学习者不知道今天该练什么、卡题直接看解析、训练记录散落在多个 OJ，以及教练选题和统计成本高。刷题平台解决“有题可刷”，本项目探索“今天该刷什么、为什么刷、怎么刷，以及如何判断训练有效”。

核心是 **训练数据 + 能力画像 + 教练训练策略 + AI Agent 工作流**。大模型是未来可替换的能力组件。

## Demo 能展示什么

| 页面                                              | 内容与可操作项                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/`                                             | 以练习为中心的学习空间、六种目标方向、下一题、今日计划、个人进展；可展开的方法对比与优势                    |
| `/student`                                      | 切换学习方向与 12 名模拟学员，查看六维画像、30 天变化、8 周趋势、5 题计划；生成下一轮计划                   |
| `/student/session/1`                            | 题面、计时器、C++ / Python / Java 草稿、训练笔记、逐级 Hint、明确确认后解锁解析、标记 AC / 未完成、模拟复盘 |
| `/student/session/2` … `/student/session/12` | 每道题各自的题面、样例、提示与训练草稿                                                                      |
| `/account`                                      | 个人概览、头像与资料、角色与学习偏好、收藏与笔记、分享设置、个人数据导出与确认清除                          |
| `/coach`                                        | 6 项班级指标、12×6 能力热力图、层级筛选、共同薄弱点、关注名单、周计划、4 类教学决策、导出计划              |
| `/innovation`                                   | 产品定位、可调整阈值的 Training Policy、数据飞轮、试点与多 OJ 路线、AI 辅助出题概念                         |
| `/api/health`                                   | 容器及反向代理健康检查                                                                                      |

训练结果更新个人画像；开启分享后才进入教学热力图与班级聚合。个人加练会出现在对应学员练习页。未完成的训练可以继续补题。刷新页面后保留当前浏览器的资料、偏好、侧栏状态、收藏、学员选择、代码、笔记、Hint、结果和教学决策；顶部重置按钮可恢复演示初始状态。

计时器仅累计当前训练页可见时的时间，可暂停；离开页面自动保留记录。Hint 1–3 依次解锁，Hint 4 必须明确选择“结束独立思考”。不默认输出完整代码。

## 个人中心与界面

- 所有页面使用白色背景、白色卡片与编辑器；用阴影和少量图标、文字色区分层级。卡片与按钮有轻量悬停反馈，支持系统减少动态效果及账户中的动效开关。
- 桌面侧栏可收缩并记住状态；手机独立使用完整导航抽屉，支持键盘焦点与 Escape。
- 资料支持昵称、简介、四种图案头像及个人学习者 / 学生 / 老师身份；保存后立即同步至首页与导航。
- 学习方向、每日目标、默认语言自动保存。新练习采用语言模板，已有草稿保留原语言。
- 收藏与个人笔记只在自己的空间收纳。学习进度默认不分享；开启后教学空间显示能力与完成情况，不显示笔记和代码。
- 导出只包含个人资料、收藏、个人结果及草稿。清除操作需要确认，只清除自己的学习记录，不影响其他模拟学员或自己的资料偏好。

**账户范围**：这是当前浏览器内的体验账户与视图控制演示，没有真实登录、身份验证、服务端访问控制或加密存储。模拟学员可自由切换；分享开关不构成生产权限边界。应用没有上传代码、笔记或资料的接口，也不需要手机号、邮箱。真实上线需先接入身份与数据访问控制。

**性能取舍**：复用 `TrackPicker`、头像、卡片标题、图表、确认弹窗及原训练页；没有新增 npm 依赖、动画库或重型编辑器。账户与训练状态分开订阅，计时不会刷新导航；代码输入延迟 300ms 持久化，计时每 5 秒持久化，离页刷新时补存。

## 技术栈与代码结构

- TypeScript、Next.js **16.3.6** 稳定版、App Router、React 19。
- Server Components 承载静态页面、元数据与题目路由；Client Components 承载交互。
- CSS 响应式样式、Lucide 本地图标、轻量 SVG 雷达图和折线图、语义化表格热力图。无远程资源依赖。
- 浏览器 localStorage 保存 Demo 状态；纯函数封装训练策略，便于替换真实 API。
- ESLint、TypeScript、Node Test Runner / tsx、Playwright。
- Next.js standalone、多阶段 Docker、非 root 容器、GHCR 多架构镜像。

```text
src/
  app/                    # 路由、Server Components、健康检查和样式
  components/             # Dashboard、训练室、图表、导航、策略演示
  data/                   # 12 名学员、12 道题、6 条方向、周计划
  lib/
    account-store.ts      # 账户资料、偏好、收藏与侧栏状态
    learning.ts           # 方向题单与个人导出隔离
    demo-store.ts         # 本地持久化与输入恢复校验
    training/index.ts     # 能力画像、诊断、计划、复盘、团队分析
  types/                  # 训练与账户类型
tests/
  training.test.ts        # 策略边界、增量、队员隔离与数据回流
  browser/demo.spec.ts    # 页面、Hint 门控、完整训练、教练操作与响应式
.github/workflows/docker.yml
Dockerfile
docker-compose.yml
docker-compose.prod.yml
```

训练接口包括 `calculateSkillProfile`、`generateTrainingPlan`、`evaluateTrainingSession`、`recommendTeamFocus`。数据与判断逻辑不写死在页面中。

## 开发与贡献

第一次使用本仓库，请从[仓库使用与团队协作指南](./仓库使用与团队协作指南.md)开始，按步骤完成下载、运行、开发和提交 PR。

参与开发前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，其中包含团队分支、测试、PR、AI Agent 和发布规范。

核心流程：`feature/* → dev → main → Docker / GHCR`。普通开发通过 PR 进入 `dev`，版本完整验证后再 PR 到 `main`。

## 本地开发

推荐 **Node.js 24 LTS** 和 npm（Next.js 最低要求 Node.js 20.9）。

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。开发与生产启动都监听 `0.0.0.0`。仓库包含 `package-lock.json`，自动化和复现构建使用 `npm ci`。

## 生产构建与检查

```bash
npm run lint
npm test
npm run build
npm run typecheck
npm run start
```

浏览器验收（首次需安装 Chromium）：

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright 自动在 3100 端口启动已构建的生产应用，覆盖 1440×900、1366×768 和 390×844。Linux CI 首次使用 `npx playwright install --with-deps chromium` 安装系统依赖。测试可独立于 3000 端口的应用运行。

本机已安装 Chrome 时，也可使用 `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`，无需另外下载 Chromium。测试自动让回环地址绕过系统代理，避免 localhost 健康检查被代理返回 502。`npm run start` 使用 standalone 启动脚本，自动复制本地静态资源，支持 `-- --port 3100`。

## Docker 本地构建与部署

需要 Docker Engine / Docker Desktop 和 Docker Compose v2+。构建阶段需要下载基础镜像和 npm 包；镜像构建完成后的运行阶段无需安装包、API Key 或外网。

```bash
docker build -t acm-training-agent:latest .

docker run -d \
  --name acm-training-agent \
  -p 3000:3000 \
  --restart unless-stopped \
  acm-training-agent:latest
```

访问 `http://SERVER_IP:3000`。

也可以在仓库根目录运行：

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f web
```

若 3000 已占用，可改宿主机端口：

```bash
PORT=8080 docker compose up -d --build
```

容器内仍监听 `0.0.0.0:3000`。Dockerfile 内置健康检查，每 30 秒检查一次，启动宽限 20 秒，以非 root 用户运行。

```bash
curl http://localhost:3000/api/health
docker inspect --format '{{.State.Health.Status}}' acm-training-agent
```

期望响应：

```json
{"status":"ok","service":"acm-training-agent"}
```

停止并删除本项目 Compose 容器：`docker compose down`。训练状态在访问者浏览器中，无需数据库或容器卷。

### 构建时报默认学员错误

默认体验账户统一读取 `src/data/students.ts` 的首位学员，姓名可以修改，各学员的 `id` 必须唯一。原先固定查找 `yuan` 的写法已移除；旧 `yuan` 账户的本地记录会迁移至当前默认账户，旧默认昵称和教学记录中的称呼也会同步更新。只更改昵称时，也可以直接使用个人中心。

若日志出现 `buildx Docker CLI plugin not found: falling back to the classic builder`，当前 Compose 会继续使用传统构建器；此警告本身不会导致本项目启动失败。判断是否失败应看后面的具体构建错误与退出码。

## GHCR：学校服务器直接拉镜像

`.github/workflows/ci.yml` 在 PR 到 `dev` / `main`、push `dev` 或手动运行时执行 lint、业务测试、build、typecheck 和浏览器验收。`.github/workflows/docker.yml` 只在 push 到 `main`、推送 `v*` tag 或手动选择 `main` / `v*` tag 时发布；手动选择 `dev` 会跳过发布：

1. 通过 PR 的 CI 与 main 保护规则控制发布质量；版本 tag 必须指向已合入 `main` 的提交。
2. 用 GitHub 自带的 `GITHUB_TOKEN` 登录 GHCR，无需另建发布密钥。
3. 构建 `linux/amd64`、`linux/arm64` 镜像；`main` 发布 `latest`、`sha-<完整 commit SHA>`，`v*` tag 发布对应 tag 和 SHA，但不覆盖 `latest`。
4. 镜像拥有者统一转换为小写，地址为 `ghcr.io/<github-user>/acm-training-agent`。

首次发布后，进入 GitHub 用户/组织页面的 **Packages → acm-training-agent → Package settings → Change visibility → Public**。如果是组织仓库，需组织允许公开 Package，并允许 Actions 写入 Packages。镜像公开后学校服务器匿名拉取即可；首次发布尚未完成前占位地址不可用。若镜像已有同名包且未关联此仓库，需要先在 Package 设置中授予仓库 Actions 访问权限。

将以下命令中的 `<github-user>` 替换为实际 GitHub 用户名或组织名的小写形式：

```bash
docker pull ghcr.io/<github-user>/acm-training-agent:latest

docker run -d \
  --name acm-training-agent \
  -p 3000:3000 \
  --restart unless-stopped \
  ghcr.io/<github-user>/acm-training-agent:latest
```

使用生产 Compose 时仅需服务器上的 `docker-compose.prod.yml`：

```bash
ACM_AGENT_IMAGE=ghcr.io/<github-user>/acm-training-agent:latest \
docker compose -f docker-compose.prod.yml up -d
```

更新已有服务：

```bash
export ACM_AGENT_IMAGE=ghcr.io/<github-user>/acm-training-agent:latest
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

需要固定版本或回滚时，把 `latest` 换成已发布的 `sha-<完整 commit SHA>` 或 Git tag。

校园服务器无法访问 GHCR 时，可在能联网且架构兼容的机器先拉取，再离线传输：

```bash
docker save ghcr.io/<github-user>/acm-training-agent:latest -o acm-training-agent.tar
# 将 tar 文件复制到学校服务器后：
docker load -i acm-training-agent.tar
```

之后按同一条 `docker run` 命令启动即可。项目不会自动向仓库提交代码或发布镜像；发布由上述 GitHub 事件触发。

若开发机能访问 AWS Public ECR，但 Docker Hub 超时，可以先通过 Docker 官方镜像的 ECR 镜像源取得同一 Node 基础镜像，再进行本地构建：

```bash
docker pull public.ecr.aws/docker/library/node:24-alpine
docker tag public.ecr.aws/docker/library/node:24-alpine node:24-alpine
docker build -t acm-training-agent:latest .
```

容器启动后，可用本机 Chrome 执行 `node scripts/verify-container.mjs`，检查六个主页面及账户子页、浏览器错误和手机布局，并将截图写入 `test-results/container/`。可通过 `DEMO_URL` 指定不同服务器，`PLAYWRIGHT_CHANNEL` 指定浏览器通道。

## 校园网部署排查

按“容器 → 本机 → 局域网 → 反向代理”逐层检查：

```bash
docker ps
docker port acm-training-agent
docker logs --tail 100 acm-training-agent
curl -v http://localhost:3000/api/health
# Linux 查看宿主机监听端口与局域网 IP：
ss -lntp
hostname -I
```

- 本机不通：确认容器已运行、日志无启动错误、映射为 `0.0.0.0:3000->3000/tcp`，检查端口冲突和容器健康状态。
- 本机通、局域网不通：使用服务器的局域网 IP，检查学校网络 ACL、服务器防火墙、机房端口审批，以及访问设备是否同网段或已连接校园 VPN。请由管理员按学校规则开放所需端口；项目不会自动修改防火墙。
- `localhost` 仅指当前设备，从另一台电脑访问时必须使用 `http://服务器局域网IP:3000`。
- 如果使用单独的域名与学校反向代理，将该域名根路径代理到服务器的 3000 端口。默认部署在域名根路径；子路径部署需先配置 Next.js `basePath` 并重新构建。

Nginx 示例（替换域名和上游 IP；代理与应用同机时使用 `127.0.0.1`，容器化代理应使用实际网络服务名）：

```nginx
server {
    listen 80;
    server_name acm.example.edu.cn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}
```

TLS 证书由学校既有反向代理配置。镜像加载完成后，本应用所有页面、图表、图标、提示与数据均可离线使用。

## 建议演示路线（约 5 分钟）

1. **学习空间**：选择“求职面试”或“编程入门”，查看下一题与推荐计划。
2. **个人中心**：修改昵称、头像与学习目标；选择默认语言，返回首页观察同步。
3. **开始练习**：收藏一道题、填写草稿和笔记；逐级解锁 Hint，确认后查看完整解析。
4. **模拟复盘**：标记 AC 或未完成，查看耗时、Hint、画像变化和下一轮计划。
5. **收藏与笔记**：回个人中心查看刚才的记录；在“账户与数据”导出个人 JSON。
6. **教学工作台**：默认个人进度隐藏；回个人中心开启分享后观察热力图，演示筛选、接受计划、调整难度、追加专题与个人加练。
7. **学习方法**：拖动 DP 掌握度到 60，观察竞赛策略示例从命中到不命中；查看未来试点与辅助出题路线。

要重新开始，使用顶部“重置演示数据”并确认。浏览器之间的数据不共享；这里的角色切换是演示视角切换，不是登录或权限系统。

## 当前只是 Demo

- 12 名队员、Rating、周指标、提交数、趋势、诊断、训练计划均为**模拟数据**；没有虚构全国高校数、商业收入或真实提升比例。
- 12 道题是原创的简化演示题，平台统一标为“校内 OJ · 模拟”；难度为估计值，不冒用真实 OJ 题号。Hint 是每题预设文本，没有调用大模型。
- 有本地体验账户；没有连接 OJ、真实登录、OAuth、在线判题、代码执行沙箱或外部服务。AC 由演示者自行标记。
- 能力更新是演示规则：独立 AC +4，Hint 1/2 后 AC +2，Hint 3/4 后 AC +1，未完成 +0；仅作用于题目涉及维度。相同队员与题目的已完成结果不会重复累加。
- 历史 8 周趋势、本周完成率、首次 AC、训练时长为初始快照；本次结果单独展示，并更新当前画像、热力图、提交数和题目状态，避免将历史指标误当成现场实测。
- Training Policy 使用预设阈值，真实测量与因果效果尚需试点。选择“算法竞赛”方向后，默认学员下一轮若命中 DP 策略，会生成 2×1400、2×1500、1×1600 的 DP 补强题单；已完成题标记为复习参考。
- 考研 408 方向当前演示数据结构与算法设计部分，未实现操作系统、计算机网络、组成原理的完整课程；各方向题单仍使用同一组 12 道演示题。
- 持久化仅使用当前浏览器 localStorage。浏览器禁用存储时仍能在当前页面会话演示，但刷新会丢失记录。重置和清除站点数据会删除本地记录。

## 下一阶段与未来架构

**最值得优先接入的是真实账户与授权后的训练记录**：先建立可靠的账户与数据访问边界，再从 Codeforces 或校内 OJ 导入题目难度、知识点、提交次数、时间与结果，先验证画像和可解释题单，再接入 LLM Hint。

后续依次实现：真实身份与访问控制、班级 / 团队管理、真实训练记录、可控 LLM Hint、教练 Training Policy 配置与效果实验。真实试点重点比较独立完成率、变式迁移、Hint 依赖和教练耗时，不以刷题总数替代训练效果。

当前不实现以下基础设施，按需求逐步演进：

```text
Browser
   ↓
Next.js Web Platform
   ↓
Application API
   ├── User / Team
   ├── Training Plan
   ├── Analytics
   └── Coach Policy
   ↓
PostgreSQL
```

需要复杂 AI / 数据分析时再拆分：

```text
Next.js
   ↓
AI Service (Python / FastAPI)
   ├── LLM Gateway
   ├── Skill Diagnosis
   ├── Training Agent
   └── Problem Setter Assistant
```

出现缓存需求后再加 Redis。全国化后再按实际负载引入对象存储、CDN、消息队列、多实例、监控、日志及 Kubernetes，不在 Demo 中提前建设微服务。

## License

本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)**，详见 [LICENSE](LICENSE)。

You are free to use, study, modify, and redistribute this project under the terms of the AGPL-3.0. If you modify this software and provide it as a network service, you must make the corresponding source code of your modified version available to users of that service.

Copyright © 2026 袁鑫晨
