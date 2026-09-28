# 团队开发与贡献规范

本仓库使用 TypeScript、Next.js 16、React 19、npm、ESLint、Node Test Runner / tsx 和 Playwright；部署产物是 GHCR 多架构镜像。适用于当前 Demo 和 2–10 人团队。

日常流程：`feature/* → PR → dev → PR → main → Docker / GHCR`。默认分支保持 `main`，创建普通 PR 时务必手动选择 base 为 `dev`。

## 分支定义

| 分支 | 用途 | 从哪里创建 / 合并到哪里 |
| --- | --- | --- |
| `main` | 稳定、可部署版本；不进行日常开发，原则上禁止直接 push；更新触发镜像发布 | 主要接收 `dev` 的发布 PR |
| `dev` | 日常开发集成、Demo 联调与验收 | 接收功能和修复；发布时 PR 到 `main` |
| `feature/*` | 功能，如 `feature/problem-recommendation`、`feature/student-dashboard`、`feature/coach-dashboard`、`feature/recommend-agent` | 从 `dev` 创建，PR 到 `dev` |
| `fix/*` | 普通 Bug，如 `fix/login-redirect`、`fix/agent-response-parser` | 从 `dev` 创建，PR 到 `dev` |
| `experiment/*` | 尚不确定是否采用的实验方案 | 从 `dev` 创建，验证后 PR 到 `dev` |
| `chore/*` | CI、Docker、GitHub 配置、依赖与工程维护 | 从 `dev` 创建，PR 到 `dev` |
| `hotfix/*` | 已发布版本的紧急问题 | 从 `main` 创建，验证后 PR 到 `main`，随后回灌 `dev` |

普通 `feature/* → main` 禁止。CI 的 `validate` 会拒绝向 `main` 提交的其他来源，仅允许同仓库 `dev` 或 `hotfix/*`。服务端强制拦截还需要管理员启用下文的 main Ruleset；只有文档和 Workflow 不等于已禁止直接 push。

## 标准开发流程

先确认工作区干净；若存在未提交代码，先查明归属，由开发者整理提交，或使用独立 worktree。不要擅自 stash、reset、删除或把无关改动提交到本次分支。

```bash
git status
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c feature/problem-recommendation

npm ci
npm run dev
```

项目使用 Node.js 24 和 `package-lock.json`。新增依赖时同步提交 lockfile。不要提交 `.env*` 中的私密配置、API Key、数据库、构建产物或个人数据。

完成修改后检查差异并验证：

```bash
git status
git diff
npm run lint
npm test
npm run build
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

`typecheck` 放在 build 后，确保 Next.js 生成的路由类型存在。Playwright 在 3100 端口启动生产构建；先关闭自己占用该端口的服务，避免误测旧应用。macOS 上已有 Chrome 可以用 `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`；`--with-deps` 只用于 Linux CI。

如果正在开发的版本已包含 Demo V2 的 `judge:dev` / `test:judge` scripts，需要 Docker 和 Compose v2，先执行 `npm run judge:dev`，再执行 `npm run test:judge`；E2E 也使用真实 Judge。CI 会检测 `package.json` 中的 `test:judge` 并准备固定版本沙箱，缺少配套文件或测试失败会阻止通过。V1 没有这些 scripts，无需运行。

确认 `git status` 仅包含本次任务文件后提交；混合工作区请将 `git add .` 改为逐个列出文件：

```bash
git add .
git diff --cached
git commit -m "feat: add problem recommendation"
git push -u origin feature/problem-recommendation
```

在 GitHub 创建 PR，**base: `dev`，compare: `feature/problem-recommendation`**，填写模板，等待 `CI / validate` 通过并由项目成员人工检查后合并。小功能 PR 推荐 Squash merge；删除已合并的短期分支，保留 `dev`。

## 集成、发布与紧急修复

1. 多个功能进入 `dev` 后，完成 Demo 整体流程、账户/训练隔离、Hint 门控、教练数据和手机布局的人工验收。
2. 创建 **base: `main`，compare: `dev`** 的发布 PR；确认本次版本范围、测试、已知问题和回滚镜像。
3. 等待该 PR 的 CI 成功，由项目成员合并。`dev → main` 使用 **Create a merge commit**，保持长期分支祖先关系；不要启用只允许线性历史的规则。
4. `main` 更新触发 Docker Workflow。镜像构建成功后才算有可部署产物；部署学校服务器由项目成员单独执行。
5. 如需正式版本 tag，只给已经进入 `main` 的提交打 `v*` tag，例如：

```bash
git switch main
git pull --ff-only origin main
git tag v0.1.0
git push origin v0.1.0
```

打 tag 和手动发布是成员明确执行的发布操作，Agent 不自行操作。`main` 生成 `latest` 和 `sha-<完整 commit SHA>`；`v*` tag 生成对应 tag 与 SHA 镜像，**不更新 latest**，避免旧版本或预发布 tag 覆盖当前稳定镜像。tag 若不属于 `main` 历史，发布会失败。

紧急修复从干净的最新 `main` 创建 `hotfix/问题名`，执行同样测试，通过 PR 合入 `main`。随后创建 **`main → dev` PR** 回灌修复；有冲突则在从 `dev` 创建的 `fix/sync-main` 分支合并 `origin/main`、解决冲突并提交 PR，不能 force push 长期分支。

## Commit 规范

使用简单 Conventional Commits，`类型: 简短说明`，中英文均可，不强制 scope 或工具校验。

| 类型 | 示例 |
| --- | --- |
| `feat:` | `feat: add problem recommendation agent` |
| `fix:` | `fix: handle empty recommendation result` |
| `refactor:` | `refactor: split recommendation service` |
| `test:` | `test: add recommendation agent tests` |
| `docs:` | `docs: update deployment guide` |
| `style:` | `style: improve mobile training layout` |
| `chore:` | `chore: update github actions` |

## AI Agent Development

1. 修改前检查 `git status`、当前分支、仓库说明和相关代码；若仓库有 CodeGraph 索引，先使用 CodeGraph 理解代码。
2. 不得直接在 `main` 开发；默认在从 `dev` 创建的 `feature/*`、`fix/*`、`experiment/*` 或 `chore/*` 工作。
3. 发现已有未提交修改，报告涉及文件、能否安全继续和处理建议；使用独立 worktree 隔离时不得夹带业务改动。
4. 保持任务范围，不进行无关重构，不擅自修改页面、API、数据库或推荐逻辑。
5. 修改后运行已有的相关测试、lint、build 与 E2E；不能运行时明确记录原因，不得伪造成功。
6. 报告修改文件、做了什么、原因、实际测试结果和已知问题。
7. 不自行合并到 `main`、推送生产 tag、手动发布镜像或部署生产环境。最终 Merge 与发布决定由项目成员完成。
8. 不擅自 stash、reset、clean 或 force push；不覆盖、删除他人的未提交代码。

## CI 与 Docker 发布

| 事件 | CI / validate | Docker Publish |
| --- | --- | --- |
| push `feature/*` / `fix/*` / `chore/*` / `experiment/*` | 否；有打开的 PR 时会因 PR 更新运行 | 否 |
| PR → `dev` | 是 | 否 |
| push `dev`（包括合并 PR） | 是，验证实际集成提交 | 否 |
| PR → `main` | 是，额外检查来源分支 | 否 |
| push / merge `main` | 否，质量门禁在 PR 与 Ruleset | 是 |
| push `v*` tag | 否，只能发布已进入 `main` 的提交 | 是，不更新 latest |
| push 其他 tag | 否 | 否 |
| 手动运行 CI | 是 | 否 |
| 手动运行 Docker：`main` | 否 | 是 |
| 手动运行 Docker：`dev` / 普通功能分支 | 否 | 跳过 publish |

手动运行 Docker 若选择 `v*` tag，也必须满足 main 祖先校验，且不会更新 latest。PR 的 README 修改仍经过 CI；普通分支的文档修改不发布镜像，文档合入 `main` 仍按发布分支规则构建。

`.github/workflows/ci.yml` 只有 `contents: read`，执行 npm ci、lint、单元测试、适用时 Judge 测试、build、typecheck 和 Chromium E2E；失败时保存 Playwright 报告和 traces 7 天。同一个 PR 的新运行取消旧运行，dev 集成检查单独排队。

`.github/workflows/docker.yml` 仅执行发布，只有 `publish` job 拥有 `packages: write`。保留 QEMU、Buildx、GHCR 登录、metadata 和 GHA cache，构建 `linux/amd64` / `linux/arm64`；同 ref 的发布排队，不中途取消。镜像为 `ghcr.io/star-ability/acm-training-agent`，当 `judge/Dockerfile` 存在时同时发布 `ghcr.io/star-ability/acm-training-agent-judge`，使用独立 Judge 缓存。

## 管理员首次启用 main 保护

仓库文件无法启用 GitHub 服务端保护。**先完成下面的 CI 首跑和 Ruleset 配置，再把拆分后的发布工作流合入 main**；拆分后 Docker 不重复测试，依靠 main 的 PR 门禁保证质量。

1. 推送 `chore/repository-workflow`，创建 `chore/repository-workflow → dev` PR，确认新的 **CI** Workflow 的 `validate` 实际成功。不要把旧 Docker Workflow 的同名检查当作新 CI 已运行。
2. 成员合并到 `dev`，等待 push dev 的 CI 成功，再创建 `dev → main` PR，确认该 PR 的 CI 成功。
3. 打开 [仓库 Rulesets](https://github.com/STAR-Ability/code-startrail/settings/rules) → **New ruleset → New branch ruleset**：
   - Ruleset name：`Protect main`；Enforcement status：`Active`。
   - Target branches → Include by pattern：`main`（对应 `refs/heads/main`）。
   - Bypass list：留空，管理员也遵守规则；不要添加常规开发者豁免。
   - 勾选 **Restrict deletions** 和 **Block force pushes**。
   - 勾选 **Require a pull request before merging**；Required approvals：`0`；不强制 Code Owners 或最后一次 push 的单独批准。
   - 勾选 **Require status checks to pass**，从刚成功的 CI 选择 `validate`，来源 **GitHub Actions**；PR 界面常显示为 `CI / validate`。API 的 check context 通常是 `validate`，不要凭显示标题手写 `CI / validate`。如果有歧义或找不到，先查看该 PR 的 Checks，再配置。
   - 勾选 **Require branches to be up to date before merging**。若 main 因 hotfix 更新，先用 `main → dev` PR 同步并重新通过 CI。
   - 不启用 Restrict updates、Require linear history、merge queue 或部署环境门禁；当前流程使用 merge commit，避免小团队锁住发布。
4. 保存前检查仅覆盖 `main`。Required check 必须已成功运行，避免永远停留在 Expected。空 bypass list 会约束管理员的普通 push/merge；具有管理权限的成员仍可修改规则以处理误配置。
5. 在 [Pull Requests 设置](https://github.com/STAR-Ability/code-startrail/settings) 保留 **Allow merge commits**。确认保护生效且 PR 全绿后，由成员合并 `dev → main`。

新旧 Workflow 的 job context 都叫 `validate`；GitHub 的必需检查以实际 check context 和来源应用匹配，不能仅凭名称区分某个 Workflow 文件。拆分后只保留一个 `validate`，发布 Workflow 不再定义同名测试 job。没有仓库管理权限时，请组织 Owner 执行以上操作；本轮不自动创建 dev Ruleset。

## 日常速查

```bash
git status
git switch dev
git pull --ff-only origin dev
git switch -c feature/xxx
# 开发，并完成上述测试
git add .
git diff --cached
git commit -m "feat: ..."
git push -u origin feature/xxx
```

GitHub PR：`feature/xxx → dev`。版本完整验证后：`dev → main`。普通开发不推 main，不手动发布 Docker。
