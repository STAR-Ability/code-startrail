# 码练星轨 Demo V2 架构评审

日期：2026-09-28。状态：实现前决策，实施验证及例外补充见 `DEMO_V2_DELIVERY.md`。

## 1. 产品目标与资料优先级

遵循 `CODEX_ARCHITECTURE_REVIEW_FIRST.md`，其后是两份码练星轨 V2 方案中的产品需求。旧 PRD、项目总览、实施方案、个人 Agent 规划及研究报告提供背景，不能覆盖本轮明确的“小题库、真实判题、规则推荐、Mock Agent”范围。

本轮闭环：一道推荐 → C++17 训练 → 样例执行 / 隐藏测试提交 → 真实 Verdict → 按需逐级提示 → 再次训练 → AC / 结束 → 保存记录 → 下一题；Coach 从同一数据库查看刚产生的记录。品牌为码练星轨 / codeStartrail；普通导航只有训练、记录、我的。团队属于升级入口。

阅读范围包括根目录三份 V2 输入、README、DELIVERY、V1 源码与测试/部署、`docs/ACM集训队智能训练管理平台_PRD_V2.md`、项目总览和实施方案、`docs/product/personal-acm-agent-plan.md`、两份研究报告与研究任务材料 `tem.txt`、分析脚本及依赖清单。原始问卷不导入产品、不上传外部服务、不放入镜像。

旧 PRD 以教练为第一对象；后续项目方案要求真正的 LLM 规划、长期记忆和工具调用。这是未来产品目标，本轮按最新指令只验证 Demo V2，不把预设提示称为已实现完整智能教练。

研究中 53/78 自报看懂题解仍写不出，52/78 选择提示或提问引导，57/78 选择适配题目；这些支持测试短训练闭环，不证明学习效果或市场成立。AC、没有使用站内提示、掌握知识必须分开；不生成虚构能力分。

## 2. V1 审计与复用

| 现状 | V2 处置 |
| --- | --- |
| Next.js App Router、React、TypeScript、CSS、Lucide；standalone、多阶段非 root Web 镜像、GHCR | 保留工程基础；不为技术新颖重写成 Vue/Vite |
| `training-session.tsx` 手动标记 AC，代码不执行 | 更换为服务端判题；客户端不能指定 Verdict |
| localStorage 存账户和 `studentId:problemId` 结果 | 数据库保存多次提交/场次；草稿继续本机保存，不导入 V1 模拟历史 |
| 所有 Hint 随 Problem 传入客户端 | 明确公开 DTO；提示仅在服务端按层返回；隐藏测试不返回 |
| 12 道静态题、Rating/DP 阈值、模拟能力加分 | 24 道真实题包；只推荐一道，按真实记录解释，考虑目标/难度/标签/Hint/耗时 |
| 六场景、重复 Dashboard、雷达图、大教练页面 | 替换为训练/记录/我的及最小团队页 |
| 现有 `src/data` 被宽泛 `data/` ignore 影响 | 新题库使用 `problem-packages/`，明确追踪；研究资料从构建排除 |
| 无服务端身份、数据库、Judge | 增加有限 Demo 会话与角色校验；不冒充正式认证 |

保留已有工程和训练交互原则；移除不再使用的 V1 页面组件、模型和旧契约测试，避免两套训练状态共存。历史产品研究文档保留，入口说明其版本。

## 3. 网络调研：官方来源与实测事实

本环境可联网，使用 HTTPS 请求官方文档、GitHub API 和源码，未依赖博客。以下为查询时快照，push 时间不能证明质量，issue 数量不能直接当维护评分。

| 来源（2026-09-28 访问） | 发现及对本项目的影响 |
| --- | --- |
| [Next.js 自托管](https://nextjs.org/docs/app/guides/self-hosting) | 支持 Node/Docker、standalone；已有项目无需另起后端。正式入口用反向代理处理 TLS 和请求限制 |
| [Judge0 仓库](https://github.com/judge0/judge0)、[v1.13.1](https://github.com/judge0/judge0/releases/tag/v1.13.1) | 仓库最近 push 2026-09-25；最新正式 release 2024-04-18，修复三项严重漏洞。官方该版安装使用 PostgreSQL、Redis、worker，且建议 cgroup v1 / 修改 GRUB；不能说项目已停止维护，也不能忽略稳定版部署负担 |
| [Piston 官方 README](https://github.com/engineer-man/piston) | 最近 push 2026-07-31。通用多语言执行，隔离基于 isolate；自托管需安装语言运行包及 cgroup v2，Docker 示例 privileged。公共 API 自 2026-02-15 起需要申请授权，不能作为零凭证 Demo 依赖；`pkgs` release 不是服务稳定版 |
| [isolate](https://github.com/ioi/isolate) | 最近 push 2026-08-23；竞赛系统使用的 Linux 沙箱，namespace/cgroup；仍需我们实现 HTTP 调度、编译缓存、清理和 API 错误映射。近期依赖包括 libcap/libseccomp/systemd |
| [nsjail](https://github.com/google/nsjail) | 最近 push 2026-08-27；namespace、cgroups、rlimit、seccomp，灵活但需要独立集成配置、生命周期与协议；Docker 示例同样 privileged |
| [go-judge](https://github.com/criyle/go-judge)、[v1.13.0](https://github.com/criyle/go-judge/releases/tag/v1.13.0)、[API](https://docs.goj.ac/api)、[配置](https://docs.goj.ac/configuration) | 本日发布 v1.13.0，默认启用 seccomp；提供 REST /run、缓存文件清理，支持 cgroup v1/v2；`-no-fallback` 可拒绝 cgroup 不可用环境。固定版本并做实际隔离验证，不因最新就假定稳定 |
| [go-judge v1.13.0 源码](https://github.com/criyle/go-judge/blob/v1.13.0/env/env_linux.go) | 容器目标 UID/GID 1000，但必须显式启用 credential generator；实测修正见第 7 节。网络 namespace 默认隔离，禁止开启 net-share。控制器与用户程序权限不同 |
| [SQLite 适用范围](https://sqlite.org/whentouse.html)、[PostgreSQL](https://www.postgresql.org/docs/current/tutorial-start.html) | SQLite 单写者、适合本机小应用；多机/多写者采用 PostgreSQL；不能把 SQLite 放 NFS 共享给多实例 |
| [Drizzle SQLite](https://orm.drizzle.team/docs/get-started-sqlite)、[Prisma SQLite](https://www.prisma.io/docs/orm/overview/databases/sqlite) | 两者支持 SQLite；Drizzle 接近 SQL、适合少量表；Prisma 不再能简单概括为“必带 Rust 引擎”，但生成客户端/适配器仍非当前必要 |
| [Node SQLite](https://nodejs.org/api/sqlite.html) | Node 原生 SQLite 可减少依赖，但本项目选择长期使用的 better-sqlite3 驱动；不以查询到的 Node 最新版文档代替 Node 24 支持验证 |
| [CodeMirror](https://codemirror.net/docs/guide/)、[Monaco](https://github.com/microsoft/monaco-editor) | CodeMirror 模块化/C++高亮即可；Monaco 的 worker、语言服务和体积对单语言 Demo 收益不大 |
| [Docker 安全](https://docs.docker.com/engine/security/) | 普通 Docker 不是完整的不可信代码安全保证，privileged 控制器扩大宿主机风险；不能把容器内非 root 当绝对安全 |

调研时 Docker Hub 访问超时，GitHub 官方文档/Release 可访问。准备固定版本的 C++ 单语言 Judge 镜像，构建下载校验 SHA-256；学校支持在联网构建机打包后离线 `save/load`。此网络事实不构成降低沙箱隔离的理由。

## 4. 比较与定性评分

强/中/弱是本项目适配判断，不是性能基准。开发速度、稳定性、安全、部署、学校兼容、一人维护权重高；演进中高，性能及第三方风险中。

### Web

| 候选 | 开发速度 | 稳定/复杂度 | API/DB/Judge/Agent 组织 | Docker/一人维护 | 演进 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| Next.js 全栈 | 强：现有栈 | 强：同一 TS 应用 | Route Handler → 应用服务 → Repository / JudgeClient；外部调用不占 DB 事务 | 强：一个 Web 镜像 | 强：接口可抽 worker | 选择 |
| Next.js + 独立后端 | 中 | 中：重复验证、部署/身份传递 | 清晰但当前业务没有独立扩缩需求 | 弱：至少增加一服务 | 强 | 暂不引入 |
| Vite React + Fastify/Hono | 中低：重迁路由构建 | 中：长期合理，当前是迁移负担 | TS 可共享，但无 SSR 需求也不意味着必须重写 | 中 | 强 | 无足够收益 |

### Judge / Sandbox

| 候选 | 速度 | 安全基础 | 稳定性/维护风险 | Docker/学校兼容 | 一人复杂度 | 扩展/性能 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FastAPI + subprocess + rlimit | 强 | 弱：网络/文件/子进程隔离需自研 | 弱：清理、输出/编译攻击需自己负责 | 强但隔离虚弱 | 中→弱 | 中 | 放弃自研执行内核 |
| Judge0 | 中 | 强基础，需及时修补 | 中：稳定版较旧，维护仍在继续 | 弱：DB/Redis/worker、该版 cgroup 要求 | 中低 | 强 | 超出单机 24 题需求 |
| Piston | 中 | 强基础 | 中：包管理额外依赖 | 中：cgroup v2、privileged、需预装运行时 | 中 | 多语言强，OJ 汇总仍自写 | 公共 API 不适合；自托管无当前优势 |
| isolate | 中低 | 强 | 强：竞赛使用历史 | 中：Linux+cgroup，CLI 集成 | 中低 | 强 | 未来可替换底层，无需本轮再包服务 |
| nsjail | 中低 | 强 | 强基础，配置责任仍归我们 | 中：Linux/权限要求 | 中低 | 强 | 通用性高于当前需要 |
| go-judge | 强：已有 HTTP 与文件生命周期 | 强基础：namespace+cgroup+seccomp | 中：更小维护团队、新 release 需回归 | 中：cgroup v1/v2，控制器需高权限 | 强：只写业务适配 | 强：批处理/并发有配置 | 选择，固定版本，强制 cgroup |

“强安全基础”不等于公网生产安全。我们实现编译调用、逐点执行、输出比较与结果聚合，复用成熟执行沙箱；不自写 Python 编译/执行服务，不运行宿主机 g++，不把 Docker socket 交给 Web。

### 数据与 ORM

| 候选 | 部署与一致性 | 并发与演进 | 维护/类型/迁移 | 结论 |
| --- | --- | --- | --- | --- |
| 当前 localStorage | 最简，但无服务端真实性和跨角色共享 | 无可靠多用户事务 | 只留草稿 | 不能当训练库 |
| SQLite WAL | 一卷、短事务、FK、busy timeout；嵌入 Web | 单实例少用户足够；不共享 NFS | 备份 SQLite 在线备份 API | 选择 |
| PostgreSQL | 独立服务、账户/升级/备份都要运维 | 多 Web 写入和队列更强 | 未来多实例时迁移 | 当前价值不足以抵消一个服务 |
| MySQL / 外部云库 | 增加同类运维或网络依赖 | 都可行 | 无已有资产优势 | 不选 |
| Prisma | TS 客户端、migration/seed成熟 | SQLite→PG 仍需新迁移与数据搬迁 | 生成/配置较多 | 合理候选，当前不选 |
| Drizzle + better-sqlite3 | 显式 schema、轻 ORM、TS 推导、SQL migration | Repository 隔离 DB 方言 | native 驱动在镜像构建阶段安装，锁包 | 选择 |
| 直接 SQL + node:sqlite | 最少包 | 更手工的行类型与迁移校验 | 9张业务表后类型映射成本上升 | 不选；不同时维护两个 ORM |

迁移不是改连接串：建立 PostgreSQL schema/migration → 停写/备份 → 按 FK 顺序导出导入 → 核对行数、来源、时间、AC/Hint 聚合 → 切 Repository → 回归 → 保留 SQLite 回退备份。领域类型不依赖数据库行对象。

### 内容、编辑器与部署

题目/测试全放 DB：读取简单但手写种子难审核；文件题面+DB元数据：两个来源容易漂移；JSON 包：能 Git review、校验、导入、保留版本；Polygon 包：互操作强但额外解析/转换当前用不到。选择 24 道原创 JSON 包为维护源，题面元数据和服务端私有提示导入 Problem，测试导入独立 TestCase。公开 API 使用白名单 DTO，绝不把完整 Problem spread 到客户端。参考解仅供维护验证，不进 public/客户端包。

CodeMirror 优于 textarea 的编辑体验，配置低于 Monaco；本地打包，不依赖 CDN。CSS 沿用普通 CSS，不为新页面强加 Tailwind。

| Docker 方案 | 学校部署/资源/重启/备份 | 结论 |
| --- | --- | --- |
| web + postgres + judge | 三服务、数据库额外内存与密码/备份 | 多实例之后考虑 |
| web(SQLite) + judge | 两服务；Web 数据卷，Judge 临时文件；分别限制并发与资源 | 选择 Compose v2，单机演示 |
| 一个容器放 Web 和编译器 | 起步简单，代码执行与数据库权限混合 | 拒绝 |
| 托管 Judge | 无沙箱运维，但外网/密钥/成本/隐私依赖 | 校园离线演示不可靠 |

## 5. 最终架构与行为约束

```text
Browser: 训练 / 记录 / 我的 / 条件 Coach
  → Next.js Route Handlers / 应用服务
     ├─ Drizzle → SQLite WAL（本地命名卷）
     ├─ DemoRecommendationEngine（纯函数/简单接口）
     ├─ MockTrainingAgent（TrainingAgent 接口、服务端逐级门控）
     └─ JudgeClient → 内网 go-judge → 隔离编译/逐测试执行
JSON Problem Packages → 校验、幂等 Seed → DB
```

不使用 Redis/队列/后台悬空 Promise：受限的请求内判题，持久保存 PENDING 与完成状态；DB 层限制活跃作业、重复请求幂等；异常记为系统错误，不伪报 CE/WA。超时/崩溃后的过期 PENDING 可恢复为系统错误。长时间/多 Worker 需求出现后引入持久队列和轮询，不先做 WebSocket。

推荐：过滤已 AC；冷启动难度 1；无高层提示且用时合理才允许最多 +1；高层 Hint 保持难度；连续 WA/TLE 不升级，优先相同标签较易题；目标/标签/每日时间参与排序；题库耗尽返回明确空状态。保存理由与依据，便于复查；不是 ML。

Agent：输入题目、卡点、最近实际 Verdict、已解锁层级；1–3逐级返回，4必须明确结束独立尝试。不读取隐藏测试生成泄题内容；不自动下发 solutionOutline；保留使用次数和最高层。接口足以未来换 LLM，无需策略工厂、插件注册或多 Agent。

## 6. 当前安全边界和未来路径

Demo 账户是明示的有限角色切换，不是正式用户认证；服务端会话限定 Student/Coach API 与成员范围，但任何能访问 Demo 的人都可主动切换演示角色。不能存真实学生隐私。数据库中真实执行记录与合成历史显式标源，默认学生从空记录开始。

Judge 控制器需要 Linux namespace/cgroup 管理权限，Compose 使用 privileged，仅部署在受控演示机器/VM；用户编译和运行非 root、独立工作目录、无网络、只读系统挂载、CPU/墙钟/内存/PID/输出/编译限额；清理缓存并设置 TTL。开启 `no-fallback`，不允许无法设置 cgroup 时静默运行。Judge 不发布宿主机端口、不挂 Web 数据卷/宿主机目录/容器 socket，不携带数据库密钥。Web 容器非 root、无额外 capabilities。

隐藏测试在服务端/仓库维护包内，不属于对仓库阅读者保密的比赛题；不得出现在 Web API、HTML、RSC 或浏览器 JS。提交只给汇总，不返回隐藏 stdin/stdout/stderr（用户程序可原样打印 stdin）。公开样例允许展示输出，编译错误有截断。

未来公网：真实身份/授权和配额、专用隔离 Judge 主机/VM、安全审计/补丁、持久队列/租约、多个 Worker、监控；必要时换执行服务但保留 JudgeClient 结果契约。DB 到实际多实例时换 PostgreSQL。LLM 仅替换 TrainingAgent，实现同一答案门控和数据边界；保持产品首页简单。

本轮明确放弃：自研沙箱、独立 Python API、PostgreSQL/Redis、Monaco、多语言、多首页专区、能力雷达、完整 LLM 平台。偏离是为减少维护与部署依赖，不降低真实判题和训练闭环验收要求。

## 7. 实施后的关键修正

真实执行发现两个不能仅凭官方配置推断的行为，已修复并加入验收：

1. Docker private cgroup v2 namespace 下，当前 cgroup 路径为 `/`，go-judge v1.13.0 会拒绝空前缀。`judge/entrypoint.sh` 确认私有命名空间与 cpu/memory/pids 控制器，将控制器进程移入当前容器自己的 `judge` 子层级，并启用父层级控制器。保留 `-no-fallback`，不挂载或操作宿主机层级。
2. 仅查看 `/config` 会得到 `uid: 1000`，但未配置 credential generator 时实测用户程序为 UID 0。两个 Judge 镜像均显式加入 `-container-cred-start=10000`；复测沙箱内 UID/GID 1000，映射为控制器外部非 root ID，`CapEff=0`、`NoNewPrivs=1`、`Seccomp=2`。保留实际程序检查，避免将配置声明当成隔离证明。

Docker internal 网络用于 Web→Judge；Web 还接 frontend 网络以发布页面。正式 Judge 只接 internal 网络、不发布端口；开发 override 单独增加 development 网络和回环端口。测试没有通过关闭 seccomp/cgroup 或将用户代码移到宿主机来绕过兼容问题。

当前实测平台为 Linux amd64、内核 6.8、cgroup v2。arm64 镜像构建路径与 cgroup v1 由上游支持，但本机没有完成这些平台的运行回归，不能视为已验收的学校环境。
