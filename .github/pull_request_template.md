## 本次修改

说明解决的问题、修改后的行为及原因。

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

列出核心文件与改动；涉及训练、Hint、账户或教练视图时，说明受影响的流程。

## 测试情况

只勾选实际通过的检查；未执行或失败请写明原因。

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run typecheck`（build 后执行）
- [ ] `npm run test:e2e`（先安装 Chromium，或本机使用 `PLAYWRIGHT_CHANNEL=chrome`）

Demo V2 若包含 `test:judge` script，还需记录真实 Judge 集成测试结果；V1 不适用。

## 人工验证

记录实际操作、预期与实际结果；UI 改动检查桌面和 390px 手机布局，注意浏览器控制台错误。

## 已知问题

无（如有请替换，并标明风险或后续工作）。

## 合并目标

- [ ] feature / fix / experiment / chore 首先进入 `dev`
- [ ] `dev` 完整验证后才进入 `main`；紧急 `hotfix/* → main` 已说明原因和回灌计划
- [ ] 未经验证的代码没有直接进入 `main`，没有夹带其他人的未提交改动
- [ ] 未提交密钥、环境文件、数据库或本机路径
- [ ] 最终合并与发布由项目成员决定；Agent 没有自行合并或部署
