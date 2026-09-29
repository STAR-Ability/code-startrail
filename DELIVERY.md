# Demo V1 历史交付记录

> 本文件保留 2026-09-25 的历史状态，页面、品牌、架构和启动说明不适用于当前 V2。当前交付见 [Demo V2 交付与验证](docs/DEMO_V2_DELIVERY.md) 和 [README](README.md)。

2026-09-25。基于 `CODEX_DEMO_PROMPT.md`，按最新反馈扩展产品方向、重做视觉与个人中心。

## 本次改动

- 产品展示名称为 **练序 CodePath**，面向日常算法、竞赛、面试、考研 408 算法设计、编程入门及课堂培训。仓库、镜像与健康检查标识继续使用 `acm-training-agent`。
- 全白页面、卡片与代码编辑器；通过阴影、边框和少量文字色区分层次，提供悬停反馈与减少动态效果选项。
- 首页以“下一题”为主要操作，接入方向选择、今日练习、收藏、真实本地完成记录与教学入口。原需求的方法对比、优势和闭环保留在可展开模块中。
- 桌面侧栏可以收缩并记住选择；手机使用完整抽屉导航，支持焦点限制和 Escape 返回菜单按钮。
- 新增个人中心：概览、昵称 / 简介 / 头像 / 身份、学习方向、每日目标、默认语言、动效偏好、收藏、个人笔记、分享设置、个人 JSON 导出、确认清除学习记录。
- 个人进度默认不进入教学热力图、聚合指标与关注名单；主动分享后显示能力与完成情况。个人笔记和代码不出现在教学概览。个人导出、清除均限定当前体验账户，保留其他模拟学员。
- 六种方向复用现有 12 道题与训练页；竞赛方向沿用原自适应策略。草稿支持 C++17、Python 3、Java 17 模板。
- 未增加 npm 依赖。复用方向选择、头像、标题、图表与确认弹窗；账户状态单独订阅，输入延迟保存，计时降低持久化频率。

## 页面和技术栈

Next.js 16.3.6、App Router、React 19、TypeScript、普通 CSS、Lucide、本地 SVG 图表。

主页面：`/`、`/student`、`/student/session/1` 至 `/student/session/12`、`/coach`、`/account`、`/innovation`。健康检查：`/api/health`。

## 验证

- `npm run lint`：通过，无警告。
- `npm test`：6 项通过，包括各方向题单、个人导出隔离和原训练业务边界。
- `npm run build`、`npm run typecheck`：通过。
- `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`：12 项通过。
- 浏览器覆盖 1440×900、1366×768、390×844，全部页面及账户分类无横向溢出；无外部资源请求和页面脚本错误。
- 个人中心测试验证资料保存与刷新、语言模板、草稿保留、收藏、笔记、导出内容、清除确认及其他学员记录不受影响。
- 两套 Compose 配置验证通过。`docker build -t acm-training-agent:test .` 实际构建成功，最终镜像 ID 为 `1b063fcf7172`。
- Chrome 实际访问容器中的六个主页面及账户分类：HTTP 200、无脚本错误；手机布局无横向溢出。截图位于 `test-results/container/`。
- 最终镜像已标记为 `acm-training-agent:latest` 并通过 Compose 启动；容器 `acm-training-agent-web-1` 为 `healthy`，`GET /api/health` 返回正常。

## 启动与部署

本地：`npm install` → `npm run dev`。生产：`npm run build` → `npm run start`。

Docker：`docker compose up -d --build`。本次已实际更新并启动，访问 <http://localhost:3000> 即可体验。停止使用 `docker compose down`。

学校服务器：GitHub Actions 发布镜像并将 GHCR Package 设置为 public 后运行：

```bash
ACM_AGENT_IMAGE=ghcr.io/<github-user>/acm-training-agent:latest \
docker compose -f docker-compose.prod.yml up -d
```

完整部署、Docker run、镜像更新、校园网排查、Nginx 与未来架构见 [README.md](README.md)。

## Demo 边界

这是浏览器本地体验账户，没有真实身份验证、服务端权限控制或加密存储。分享开关演示视图范围，不构成生产权限边界。资料和学习记录保存在当前浏览器，应用无上传个人数据的接口。

题目、历史画像、教学指标、AI Hint 与能力评估仍是模拟内容，没有连接 OJ、大模型或判题执行服务。408 方向仅演示数据结构与算法设计部分。后续优先接入真实账户与数据访问控制，再导入授权的 OJ 记录。

GHCR 工作流保留，尚未在远程执行；本次未推送代码或发布远程镜像。

## 本次新增文件

- `src/app/account/page.tsx`
- `src/app/workspace.css`
- `src/components/account-center.tsx`
- `src/components/learning-controls.tsx`
- `src/components/learning-home.tsx`
- `src/data/learning-tracks.ts`
- `src/lib/account-store.ts`
- `src/lib/learning.ts`
- `src/types/account.ts`
- `tests/learning.test.ts`
- `tests/browser/account.spec.ts`

## 本次修改文件

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/coach/page.tsx`
- `src/app/innovation/page.tsx`
- `src/components/app-shell.tsx`
- `src/components/student-dashboard.tsx`
- `src/components/training-session.tsx`
- `src/components/coach-dashboard.tsx`
- `src/components/policy-demo.tsx`
- `src/data/weekly-plan.ts`
- `src/lib/demo-store.ts`
- `src/types/training.ts`
- `public/icon.svg`
- `scripts/verify-container.mjs`
- `tests/browser/demo.spec.ts`
- `README.md`
- `DELIVERY.md`

删除 `src/app/readability.css`，已合并到统一样式中。Dockerfile、两套 Compose 和 GHCR 工作流继续复用并重新验证配置；原需求文档与 AGPL 许可保持原有内容。


## 后续修复：本地 Compose 启动与默认姓名

- 复现了 `docker compose up -d --build` 在预渲染 `/student` 时的 `undefined.id` 错误。原因是模拟学员 ID 已改动，初始账户仍固定引用旧 ID。
- 默认账户、训练状态与初始策略统一使用模拟数据中的首位学员；查找学员时提供有效默认值。
- 主账户姓名统一为陈欣，ID 使用 `chen-xin`，避免与陈予安的 `chen` 冲突；全部 12 个模拟学员 ID 唯一。
- 兼容旧账户 ID、旧默认昵称与教学历史中的旧称呼；迁移保留学习记录、草稿、收藏和个人偏好，不混入其他学员数据。
- 修复后 lint、6 项业务测试、build、TypeScript、13 项浏览器全量测试通过；随后追加的旧昵称处理也通过了 3 项账户相关回归测试。
- `buildx` 缺失警告会回退传统构建器；本次启动失败的原因是应用预渲染错误。
- 已实际执行 `docker compose up -d --build` 成功构建并启动，最新镜像为 `56d685636f98`，容器健康状态为 `healthy`。容器内浏览器验证：旧昵称自动更新为陈欣，12 个学员选项均无旧姓名。
