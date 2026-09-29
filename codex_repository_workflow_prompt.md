# 任务：规范当前 GitHub 仓库的团队开发、分支、CI 和 Docker 发布流程

你现在位于本项目的本地 Git 仓库中。

我希望你作为本项目的工程负责人，对当前仓库进行一次“小团队开发流程工程化”。

本项目目前处于创业早期 / Demo 快速开发阶段，团队规模较小，可能有 2～3 名成员，同时大量使用 Codex 等 AI Agent 辅助开发。

目标不是建立复杂的大公司 Git Flow，而是建立：

- 简单
- 安全
- 易理解
- 适合 2～10 人团队
- 防止误操作 main
- 不让每次普通开发都构建 Docker
- 能通过 PR 和 CI 控制代码质量

的 GitHub 开发流程。

---

# 一、最重要的执行原则

首先不要立即修改文件。

你必须先完整检查当前仓库，然后制定方案。

检查至少包括：

```bash
git status
git branch -a
git remote -v
git log --oneline -10
```

并检查：

```text
.github/
.github/workflows/
README.md
package.json
Dockerfile
docker-compose.yml
```

如果存在的话。

重点检查：

1. 当前所在分支
2. 默认分支是否为 main
3. 是否已经存在 dev
4. 是否已经存在 feature / fix 等分支
5. 当前工作区是否干净
6. 当前所有 GitHub Actions
7. 是否存在重复 CI / Docker Workflow
8. package.json 中实际存在的 npm scripts
9. 当前 Docker 镜像名称
10. 当前 GHCR 发布配置
11. 当前 Workflow 的 trigger
12. 当前测试、lint、build 和 Playwright 配置

不要假设我的仓库结构一定与你预期一致。

以实际仓库内容为准。

---

# 二、安全要求

非常重要。

禁止执行：

```bash
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
```

除非我之后明确授权。

不得删除我现有的未提交代码。

如果发现工作区存在未提交修改：

立即停止可能破坏这些修改的 Git 操作，并告诉我：

- 修改了哪些文件
- 是否可以安全继续
- 推荐如何处理

不要擅自 stash、reset 或删除。

---

# 三、禁止直接修改 main

本次任务不要直接在 main 上进行工程文件修改。

目标分支结构为：

```text
main
│
└── 稳定 / 可发布版本

dev
│
└── 日常开发集成版本

feature/*
│
└── 功能开发

fix/*
│
└── 普通 Bug 修复

hotfix/*
│
└── 已发布版本紧急修复

experiment/*
│
└── 实验性功能

chore/*
│
└── 工程配置、CI、依赖等维护工作
```

正常开发链路：

```text
feature/*
    ↓
   dev
    ↓
   main
    ↓
 Docker
    ↓
  GHCR
```

---

# 四、建立 dev 分支

首先判断远程和本地是否已经存在 dev。

如果远程不存在 dev：

基于最新 main 创建：

```bash
git switch main
git pull --ff-only origin main
git switch -c dev
```

之后：

```bash
git push -u origin dev
```

注意：

当前 Docker Workflow 应该只监听 main，因此创建和 push dev 不应该触发 Docker 发布。

如果实际 Workflow 并非如此：

先报告，不要盲目继续。

如果 dev 已存在：

不要重新创建。

同步：

```bash
git switch dev
git pull --ff-only origin dev
```

---

# 五、本次工程改造使用单独分支

从最新 dev 创建：

```bash
git switch dev
git pull --ff-only origin dev

git switch -c chore/repository-workflow
```

本任务涉及的所有文件修改都在：

```text
chore/repository-workflow
```

进行。

不要直接修改 main。

---

# 六、创建 CONTRIBUTING.md

在仓库根目录创建：

```text
CONTRIBUTING.md
```

它是整个团队的正式开发规范。

必须结合当前项目实际情况编写，而不是生成泛化模板。

至少包含以下内容。

## 分支定义

### main

定义：

- 稳定版本
- 可部署版本
- 不进行日常开发
- 原则上禁止直接 push
- 主要通过 dev PR 合并进入
- main 更新会触发 Docker / GHCR 发布

### dev

定义：

- 当前开发集成版本
- feature / fix 首先进入 dev
- 用于 Demo 集成测试
- 发布之前从 dev PR 到 main

### feature/*

用于功能开发。

例如：

```text
feature/problem-recommendation
feature/student-dashboard
feature/coach-dashboard
feature/recommend-agent
```

### fix/*

用于普通 Bug。

例如：

```text
fix/login-redirect
fix/agent-response-parser
```

### hotfix/*

只处理正式 main 的紧急问题。

### experiment/*

用于不确定是否采用的实验方案。

### chore/*

用于：

- CI
- Docker
- GitHub 配置
- 依赖
- 工程维护

---

# 七、CONTRIBUTING.md 中明确标准开发流程

必须给团队成员写出可以直接复制执行的命令。

例如开发新功能：

```bash
git switch dev
git pull origin dev

git switch -c feature/problem-recommendation
```

开发完成：

```bash
git status
git diff
```

执行测试。

然后：

```bash
git add .
git commit -m "feat: add problem recommendation"
git push -u origin feature/problem-recommendation
```

之后：

```text
feature/problem-recommendation
        ↓
        PR
        ↓
       dev
```

Demo / 版本整体验证通过：

```text
dev
 ↓
 PR
 ↓
main
```

禁止普通：

```text
feature → main
```

---

# 八、Commit 规范

在 CONTRIBUTING.md 中规定使用简单版 Conventional Commits：

```text
feat:
fix:
refactor:
test:
docs:
style:
chore:
```

例如：

```text
feat: add problem recommendation agent
fix: handle empty recommendation result
refactor: split recommendation service
test: add recommendation agent tests
docs: update deployment guide
chore: update github actions
```

不要要求过于复杂的 commit 规范。

当前团队规模较小，应以简单和可执行为优先。

---

# 九、加入 AI Agent / Codex 开发规范

这个项目大量使用 AI Agent，因此 CONTRIBUTING.md 必须专门增加：

```text
AI Agent Development
```

规则。

至少要求：

1. Agent 不得直接在 main 开发。
2. Agent 默认在 feature / fix / experiment / chore 分支工作。
3. Agent 修改前必须先检查相关代码。
4. Agent 不应无关重构。
5. Agent 不应自行 merge main。
6. Agent 不应自行发布生产环境。
7. Agent 修改后必须运行已有测试。
8. Agent 必须报告：
   - 修改了哪些文件
   - 做了什么
   - 为什么这么做
   - 测试结果
   - 已知问题
9. 最终 Merge 决定由项目成员完成。

---

# 十、README 增加贡献规范入口

检查 README.md。

不要大规模重写 README。

只增加简洁入口，例如：

```markdown
## 开发与贡献

参与项目开发前请阅读：

[CONTRIBUTING.md](./CONTRIBUTING.md)

核心开发流程：

feature/* → dev → main → Docker / GHCR
```

保持现有 README 风格。

---

# 十一、创建 Pull Request Template

创建：

```text
.github/pull_request_template.md
```

模板需要适合本项目。

至少包括：

```markdown
## 本次修改

描述本次 PR 做了什么。

## PR 类型

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] UI / Style
- [ ] Test
- [ ] Docs
- [ ] Chore
- [ ] Experiment

## 主要修改

描述核心修改。

## 测试情况

根据项目实际 package.json scripts 自动生成，不要虚构不存在的命令。

例如项目确实存在时：

- [ ] npm run lint
- [ ] npm test
- [ ] npm run build
- [ ] npm run test:e2e

## 人工验证

描述实际测试流程。

## 已知问题

如无：

无

## 合并目标

确认：

- [ ] feature / fix 通常进入 dev
- [ ] dev 完整验证后进入 main
- [ ] 未经验证的代码没有直接进入 main
```

注意：

必须先检查 package.json。

不存在的测试命令不要写进模板。

---

# 十二、拆分 GitHub CI 和 Docker Workflow

当前仓库已经存在一个：

```text
Build and publish Docker image
```

类型的 Workflow。

它目前大致包含：

```text
validate
↓
publish
```

并且 validate 包括：

```text
npm ci
npm run lint
npm test
npm run build
Playwright
npm run test:e2e
```

然后 publish Docker 到：

```text
ghcr.io/<owner>/acm-training-agent
```

你的任务是：

先完整阅读当前 Workflow。

不要直接套模板。

然后将职责拆分为两个 Workflow。

---

# 十三、CI Workflow

目标文件：

```text
.github/workflows/ci.yml
```

建议名称：

```yaml
name: CI
```

触发逻辑原则：

```text
PR → dev
PR → main
push → dev
```

都运行 CI。

普通 feature 分支 push 不需要反复运行完整 CI。

推荐：

```yaml
on:
  pull_request:
    branches:
      - dev
      - main

  push:
    branches:
      - dev

  workflow_dispatch:
```

但是必须结合当前仓库分析后再确定。

CI 内容应该从现有 validate Workflow 迁移。

例如实际存在：

```text
npm ci
npm run lint
npm test
npm run build
Playwright
npm run test:e2e
```

则保留。

如果实际 package.json 与这里不一致：

以实际项目为准。

Job ID 建议保持稳定：

```yaml
jobs:
  validate:
```

这样未来 main Ruleset 可以要求：

```text
CI / validate
```

通过。

继续保留失败时上传 Playwright Report 的功能。

---

# 十四、Docker Workflow

Docker Workflow 只负责：

```text
Docker Build
↓
GHCR Publish
```

不要再把普通 PR CI 全塞进去。

建议文件：

```text
.github/workflows/docker.yml
```

或者如果当前 Docker Workflow 文件名称合适，可以在原文件上修改。

最终不能留下两个重复的 Docker 发布 Workflow。

必须检查：

```text
.github/workflows/
```

避免旧 Workflow 和新 Workflow 同时发布。

---

# 十五、Docker Trigger

Docker 应主要在：

```text
push main
```

时运行。

正式 tag 可以运行：

```text
v*
```

保留：

```text
workflow_dispatch
```

推荐：

```yaml
on:
  push:
    branches:
      - main
    tags:
      - 'v*'

  workflow_dispatch:
```

不要继续使用：

```yaml
tags:
  - '*'
```

改成：

```yaml
tags:
  - 'v*'
```

避免随便一个 tag 都发布 Docker。

---

# 十六、防止手动在错误分支发布 Docker

workflow_dispatch 允许手动选择分支。

因此必须防止：

```text
手动选择 dev
↓
错误覆盖 latest
```

Docker publish job 应加入安全条件。

原则：

只允许：

```text
refs/heads/main
```

或者：

```text
refs/tags/v*
```

真正执行 publish。

例如使用适当的 job-level if。

请根据 GitHub Actions 正确语法实现。

结果必须满足：

```text
manual dispatch on main
→ 可以 publish

manual dispatch on dev
→ 不 publish Docker

push main
→ publish

push dev
→ 不 publish

push feature/*
→ 不 publish

push tag v0.1.0
→ publish
```

---

# 十七、保留现有 GHCR 能力

当前 Docker Workflow 中的重要能力原则上保留：

```text
docker/setup-qemu-action
docker/setup-buildx-action
docker/login-action
docker/metadata-action
docker/build-push-action
```

保留 multi-platform：

```text
linux/amd64
linux/arm64
```

保留 GitHub Actions Docker cache：

```text
cache-from: type=gha
cache-to: type=gha,mode=max
```

保留：

```text
packages: write
```

只给 publish job。

保持最小权限原则。

---

# 十八、Docker Tag

分析当前 metadata-action。

应保留类似：

```text
latest
sha-<commit>
v0.x.x
```

但是确保：

`latest` 不会被 dev / feature 的手动 workflow 错误覆盖。

如果发现当前写法存在此风险：

主动修复。

---

# 十九、不要擅自修改业务代码

本次任务原则上只修改：

```text
CONTRIBUTING.md
README.md
.github/**
```

以及为了 Workflow 必须修改的极少量工程配置。

不要修改：

```text
页面
业务逻辑
Agent
数据库
推荐算法
API
UI
```

除非发现现有 CI 根本无法运行，且某个非常小的工程修复确有必要。

如果需要：

先说明原因，再修改。

---

# 二十、检查 YAML 与 Workflow

修改完成后检查：

```text
.github/workflows/ci.yml
.github/workflows/docker.yml
```

至少确保：

1. YAML 格式正确
2. GitHub Actions 表达式正确
3. permissions 合理
4. trigger 没有重复
5. CI 不会发布 Docker
6. Docker 不会监听 dev / feature
7. 不存在旧 Workflow 重复发布
8. Docker publish 仍然有 packages: write
9. CI 只有 contents: read
10. concurrency 合理

如果本地存在 actionlint：

可以运行。

如果没有：

不要为了这个任务全局安装大量额外工具。

使用已有工具完成尽可能多的静态检查。

---

# 二十一、执行项目测试

根据 package.json 实际 scripts 执行。

原则上包括存在的：

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
```

如果 E2E 需要 Playwright Chromium：

根据当前操作系统正确处理。

不要在 macOS 上盲目执行 Linux 专用的系统依赖安装方式。

如果某测试由于当前环境无法执行：

不要伪造成功。

明确报告：

```text
未执行
原因
GitHub CI 中会如何执行
```

---

# 二十二、Git diff 审计

修改完后执行：

```bash
git status
git diff
```

认真检查：

- 是否有无关修改
- 是否误删文件
- 是否修改业务代码
- 是否泄漏 secret
- 是否出现 token
- 是否出现本地路径
- 是否出现密码
- 是否出现 API Key

如果发现敏感信息：

停止提交并报告。

---

# 二十三、Commit

如果测试通过，将本次工程化改造整理成一个合理 commit。

例如：

```bash
git add CONTRIBUTING.md README.md .github
git commit -m "chore: establish repository development workflow"
```

如果实际修改内容适合拆成多个 commit，也可以合理拆分。

但不要为了形式把一个简单任务拆成十几个 commit。

---

# 二十四、远程 Push 原则

允许 push：

```text
dev
chore/repository-workflow
```

禁止直接 push 修改到：

```text
main
```

第一次：

```bash
git push -u origin chore/repository-workflow
```

之后告诉我应该创建：

```text
chore/repository-workflow
→ dev
```

的 Pull Request。

不要自行：

```text
merge dev
merge main
```

除非我明确授权。

---

# 二十五、配置 GitHub main Ruleset

这一部分不是普通仓库文件。

先检查：

```bash
gh --version
gh auth status
```

如果：

- GitHub CLI 已安装
- 已登录正确账号
- 当前账号有仓库 Ruleset / Branch protection 管理权限

则分析能否使用：

```text
gh api
```

配置 main Ruleset。

但是：

## 第一次不要直接创建 Ruleset。

先把准备创建的：

- ruleset 名称
- target
- enforcement
- 具体 rules
- API 请求
- 是否影响管理员
- 是否可能把仓库锁住

完整展示给我确认。

只有我明确回复同意后，才执行 GitHub 服务端 Ruleset 修改。

如果没有 gh 或没有权限：

不要视为失败。

输出详细 GitHub 网页操作教程。

---

# 二十六、main Ruleset 的目标配置

Ruleset 建议名称：

```text
Protect main
```

目标：

```text
main
```

建议：

```text
Restrict deletions
Block force pushes
Require a pull request before merging
Require status checks to pass
```

当前团队很小。

不要强制要求多人审批。

如果 GitHub 设置允许：

```text
required approvals = 0
```

或者根据平台实际限制采用最接近的小团队方案。

如果未来需要审核人，再提高审批要求。

---

# 二十七、Required Status Check 注意事项

最终希望 main 合并要求：

```text
CI / validate
```

通过。

但是：

如果这个 CI check 从来没有在 GitHub 上执行过，GitHub Ruleset 页面可能暂时无法选择它。

这种情况下不要乱配置。

正确流程应该是：

```text
创建 ci.yml
↓
push chore 分支
↓
PR → dev
↓
CI 实际运行
↓
PR / dev 验证
↓
需要时再 PR → main
↓
让 CI check 出现在 GitHub
↓
配置 Required Status Check
```

请根据 GitHub 当前实际状态判断。

---

# 二十八、dev Ruleset

本轮主要目标是保护 main。

不要一开始把 dev 配得过度严格。

如果你认为需要保护 dev：

只给建议，不要自动创建第二套复杂 Ruleset。

当前优先：

```text
main = 严格保护
dev = 开发集成
```

保持小团队开发效率。

---

# 二十九、最终团队开发流程必须是

```text
开发新功能

dev
 ↓
feature/xxx
 ↓
开发 / 测试
 ↓
push feature
 ↓
PR → dev
 ↓
CI
 ↓
Merge dev

多个功能集成
 ↓
dev 完整验证
 ↓
PR → main
 ↓
CI
 ↓
Merge main
 ↓
Docker Workflow
 ↓
GHCR
```

Docker 不应该因为：

```text
feature push
dev push
README 普通开发
```

就发布生产镜像。

---

# 三十、最终报告

全部完成以后，不要只说“完成”。

给我一份结构化报告。

必须包含：

## 1. 原仓库状态

例如：

```text
当前分支
原 Workflow
原 trigger
原 Docker 发布逻辑
原有分支
```

## 2. 创建 / 修改文件

逐个列出：

```text
CONTRIBUTING.md
README.md
.github/pull_request_template.md
.github/workflows/ci.yml
.github/workflows/docker.yml
```

并说明每个文件的作用。

## 3. Git 分支

说明：

```text
main
dev
chore/repository-workflow
```

当前分别是什么状态。

## 4. CI 触发矩阵

用表格说明：

```text
事件                      CI
feature push              ?
PR feature → dev          ?
push dev                  ?
PR dev → main             ?
push main                 ?
```

## 5. Docker 触发矩阵

用表格说明：

```text
事件                      Docker Publish
feature push              ?
dev push                  ?
PR → dev                  ?
PR → main                 ?
merge main                ?
push v* tag               ?
manual main               ?
manual dev                ?
```

## 6. 测试结果

列出实际执行：

```text
lint
unit tests
build
e2e
YAML validation
```

每一个必须明确：

```text
PASS
FAIL
SKIPPED
```

不能伪造。

## 7. GitHub Ruleset 状态

明确：

```text
已配置
待我确认
需要网页手动配置
```

其中之一。

如果需要手动：

给我具体页面路径和每个选项应该怎么选。

## 8. 下一步

告诉我下一步应该：

```text
创建哪个 PR
base 是什么
compare 是什么
CI 应该看到什么
什么时候才能 merge
什么时候配置 Ruleset
什么时候 dev → main
```

## 9. 日常开发速查

最后给团队成员生成一段很短的使用说明：

```bash
git switch dev
git pull origin dev
git switch -c feature/xxx

# 开发

git add .
git commit -m "feat: ..."
git push -u origin feature/xxx
```

然后：

```text
GitHub PR:
feature/xxx → dev
```

版本完成后：

```text
dev → main
```

不要让我再自己从前面的输出里整理流程。

---

# 三十一、不要被本提示词机械限制

以上是目标和安全边界，不是要求你机械照抄实现。

你首先是一名高级 DevOps / Git / GitHub Actions 工程师。

请结合：

- 当前仓库真实结构
- 当前 package.json
- 当前 Workflow
- 当前 Dockerfile
- 当前测试体系
- 当前 Git 状态

判断是否存在比我描述更合理、更简单、更安全的实现。

如果发现我的方案中存在：

- GitHub Actions 逻辑问题
- Docker 发布风险
- 重复构建
- 分支管理问题
- Ruleset 死锁风险
- CI 重复执行
- GHCR latest 被错误覆盖风险
- 小团队不必要的复杂度

请主动指出，并采用更合理方案。

但是不要改变下面这些核心原则：

```text
main = 稳定 / 发布
dev = 开发集成
feature/* = 功能开发
feature → dev → main
main 不能成为日常开发分支
普通开发不能发布 Docker
CI 与 Docker 发布职责分离
未经我确认不要修改 GitHub 服务端 Ruleset
未经我确认不要 merge / push 业务修改到 main
```

现在开始。

第一步只进行：

1. 仓库审计
2. 输出当前状态
3. 给出计划

确认不存在未提交文件冲突后，再开始实施。
