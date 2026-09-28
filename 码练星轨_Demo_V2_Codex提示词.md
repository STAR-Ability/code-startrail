# Codex 任务：实现「码练星轨 codeStartrail」Demo V2

## 0. 项目信息

项目名：

> **码练星轨**

英文名：

> **codeStartrail**

当前版本：

> **Demo V2**

本轮目标不是做完整商业平台。

本轮只需要实现一个稳定、可真实演示的最小产品闭环：

> **系统推荐一道程序训练题 → 用户真实做题并提交 → Judge 真实判题 → 用户卡住时获得 Agent 辅助 → 完成训练 → 系统推荐下一道题。**

同时提供一个非常简单的教练端，用于展示团队训练数据。

---

# 1. 最重要的产品约束

整个 Demo V2 只突出：

# 程序训练 + Agent 辅助

不要在首页突出：

- ACM；
- ICPC；
- 408；
- 面试；
- 求职；
- 新生培训；
- LeetCode；
- 教练平台；
- OJ 平台。

这些未来都可以成为使用场景，但当前 UI 不应拆成多个专区。

普通用户第一次进入只需要知道：

> **这里会给我推荐下一道适合训练的题，我可以直接做题、提交，卡住时让 Agent 帮助我。**

---

# 2. 用户范围

产品理论上可以面向：

- 任何程序设计学习者；
- 个人学习者；
- 班级；
- 课程；
- 培训团队；
- 竞赛队；
- 教练；
- 教师。

但是：

> **场景差异只能影响训练策略，不允许把首页拆成多个业务入口。**

---

# 3. 本轮开发方式

请先分析当前仓库 Demo V1 和已有文档。

重点参考：

- 当前 Demo V1；
- 仓库中的产品方案；
- 仓库中的调研文档；
- 教练端相关 PRD；
- 当前技术栈；
- Docker 配置。

然后直接实现 Demo V2。

允许大幅修改 Demo V1。

如果 V1 中某些页面、功能、导航已经不适合新定位，可以删除、隐藏或重构。

不要为了兼容旧 Demo 保留无价值复杂度。

---

# 4. Demo V2 的核心闭环

必须完整实现：

```text
学生进入系统
    ↓
看到系统推荐的一道题
    ↓
查看推荐原因
    ↓
进入题目
    ↓
阅读题面
    ↓
编写 C++17
    ↓
运行样例
    ↓
提交
    ↓
真实 Judge
    ↓
AC / WA / TLE / RE / CE
    ↓
如果卡住：Agent 辅助
    ↓
继续修改
    ↓
再次提交
    ↓
AC
    ↓
记录训练结果
    ↓
系统推荐下一道题
```

这是最高优先级。

任何不能帮助这个流程的功能都要谨慎添加。

---

# 5. 普通用户信息架构

主导航最多：

```text
训练
记录
我的
```

默认首页：

```text
/training
```

不要设计传统复杂 Dashboard。

---

# 6. 学生端 `/training`

页面重点只放：

## 当前训练目标

示例：

```text
当前目标：数据结构与算法基础
```

## 系统推荐

一次只推荐 **一道题**。

例如：

```text
推荐训练

数组中的第二大值

难度：2 / 5
预计：20 分钟

为什么推荐：
上一题你已独立完成数组遍历，
本题增加一次状态维护，
难度小幅提升。

[开始训练]
```

下面允许弱化显示：

- 最近一次训练；
- 连续训练天数；
- 最近错误类型。

不要做复杂能力雷达图。

---

# 7. 推荐算法

本轮不需要真正 ML / AI 推荐。

直接实现一个可解释的规则推荐器。

输入至少考虑：

```text
当前训练目标
已 AC 的题
最近提交结果
最近题目难度
Hint 使用等级
题目标签
```

简单规则：

```text
1. 永远不推荐已经 AC 的题。

2. 如果用户没有任何记录：
   推荐 difficulty = 1 的基础题。

3. 如果上一题 AC 且未使用 Hint：
   优先推荐同级或 +1 难度。

4. 如果上一题 AC 但使用 Hint 3/4：
   保持当前难度。

5. 如果连续两次 WA / TLE：
   推荐相同标签、更低或相同难度。

6. 如果某标签连续错误：
   提高该标签的推荐权重。

7. 推荐结果必须给出“推荐原因”。
```

不要伪装成真正机器学习。

代码中明确使用类似：

```text
DemoRecommendationEngine
```

的命名。

---

# 8. 题目数据库

创建至少：

# 24 道题

建议 24~30 道。

题目直接通过 Seed 写入数据库。

不要依赖外部题库 API。

每道题包含：

```text
id
slug
title
description
inputDescription
outputDescription
samples
difficulty
tags
timeLimitMs
memoryLimitMb
hint1
hint2
hint3
solutionOutline
```

隐藏测试点单独存储。

---

# 9. 题目范围

覆盖基础到简单算法：

## Level 1

- A+B
- 奇偶判断
- 最大值
- 求和
- 简单循环

## Level 2

- 数组最大/次大
- 数组去重
- 字符串统计
- 排序
- 前缀和

## Level 3

- 二分
- 哈希计数
- 栈
- 队列
- 简单 BFS
- 简单 DFS

## Level 4

- 简单贪心
- 简单 DP
- 区间问题
- 简单图遍历

不要设计非常难的竞赛题。

---

# 10. 每道题必须有真实测试数据

每道题至少：

- 1~2 组公开样例；
- 5 组以上隐藏测试；
- 覆盖边界；
- 覆盖普通情况。

不要只用样例判题。

---

# 11. 数据库

优先使用：

# PostgreSQL

如果当前项目已经使用 ORM，继续沿用。

否则推荐：

- Prisma；
或
- Drizzle。

不要同时引入两个 ORM。

数据库至少有：

```text
User
Problem
ProblemTestCase
Submission
TrainingRecord
Recommendation
AgentSession
Team
TeamMember
```

---

# 12. Demo 用户

不需要完整注册系统。

创建 Demo 用户即可。

例如：

```text
Student Demo
Coach Demo
```

允许通过：

```text
Demo Role Switcher
```

切换。

但是普通用户主导航中不要长期显示教练功能。

---

# 13. 题目页 `/problem/[id]`

页面需要：

## 左侧

- 题目标题；
- 难度；
- 标签；
- 题目描述；
- 输入；
- 输出；
- 样例。

## 右侧

代码编辑器。

第一版只支持：

# C++17

默认模板：

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
```

可以用 Monaco Editor。

如果 Monaco 增加明显复杂度，可以使用轻量代码编辑器。

---

# 14. 运行样例

必须真实执行用户代码。

按钮：

```text
运行样例
```

只运行公开 Sample。

结果展示：

```text
Sample 1
Expected:
...

Actual:
...

Status:
Passed / Failed
```

---

# 15. 提交

按钮：

```text
提交
```

提交后：

- 创建 Submission；
- 发送 Judge；
- 执行全部隐藏测试；
- 保存结果；
- 返回最终 Verdict。

支持：

```text
AC
WA
TLE
RE
CE
```

如果容易实现，可以增加：

```text
MLE
```

但不是必须。

---

# 16. Judge 必须是真实的

不能前端假判。

推荐实现一个独立：

```text
judge-service
```

建议：

```text
Python
FastAPI
g++
```

主 Web：

```text
Next.js
```

通过内部 API 调用 Judge。

---

# 17. Judge V1 安全要求

本 Demo 只面向受控演示环境。

至少做到：

- 编译和运行不能使用 root 用户；
- 临时工作目录；
- 每次提交独立目录；
- 编译超时；
- 运行超时；
- 输出长度限制；
- 内存限制；
- 执行完清理临时文件；
- Judge Service 不直接暴露公网；
- Web 通过 Docker 内网访问 Judge。

如果可行，增加：

- 无网络运行；
- `setrlimit` / resource limit；
- process group kill；
- 防 fork bomb。

README 必须明确：

> 当前 Judge 是 Demo / 内部测试级，不能直接作为公网不可信代码执行平台。

不要假装它已经是生产级安全沙箱。

---

# 18. Agent

本轮不要接真实 LLM。

直接规则化 / 硬编码。

按钮：

```text
我卡住了
```

点击后：

```text
你现在卡在哪里？
```

选项：

- 题意没看懂；
- 不知道怎么开始；
- 有思路但不会写；
- 编译错误；
- WA；
- TLE；
- 想确认思路；
- 其他。

---

# 19. Agent Hint

每道题数据库中已有：

```text
hint1
hint2
hint3
solutionOutline
```

Agent 根据：

```text
问题类型
+
当前 Hint Level
+
最近 Judge 结果
```

返回内容。

例如：

```text
Hint 1
→ 思考方向

Hint 2
→ 关键观察

Hint 3
→ 实现结构

结束独立思考
→ solutionOutline
```

不要默认直接展示完整代码。

---

# 20. Agent 界面

Agent 不要作为全局聊天页。

必须出现在题目页中。

推荐：

```text
右侧 Drawer
或
底部 Panel
```

让 Agent 始终知道：

> 当前正在做哪道题。

---

# 21. 训练结束

当用户 AC：

显示：

```text
训练完成
```

包括：

- 总耗时；
- 提交次数；
- 是否使用 Hint；
- 最高 Hint Level；
- 主要错误类型；
- 简短复盘。

然后：

```text
[推荐下一道题]
```

调用规则推荐器。

---

# 22. `/history`

简单展示：

```text
时间
题目
难度
结果
提交次数
Hint 使用
耗时
```

不要做复杂 BI。

---

# 23. `/profile`

只需要：

- 当前训练目标；
- 当前推荐难度；
- 每日训练时间；
- 训练语言：C++17；
- 团队状态。

Demo 可以允许切换训练目标，但不要做多个专区。

---

# 24. 教练端定位

教练端属于：

# Team / Coach 升级能力

Demo 中可以通过角色切换访问。

不要放进普通学生主导航。

---

# 25. `/coach`

只需要简单实现。

## 团队概览

显示：

- 成员数量；
- 今天训练人数；
- 今日 AC 数；
- 今日提交；
- 最近 Agent 求助次数。

## 最近问题

显示：

- 高频 WA 题；
- 高频错误类型；
- Agent 使用最多的题；
- 未训练成员。

## 下一步建议

规则化生成：

```text
建议：
下一次团队训练优先安排数组边界和二分基础。
```

Demo 里可以硬编码。

---

# 26. `/coach/students`

显示 5~10 个 Demo 学员。

每个：

- 最近训练；
- AC；
- 提交；
- Hint；
- 当前推荐题。

---

# 27. `/coach/student/[id]`

显示：

- 最近提交；
- 最近训练；
- 最近 Agent 使用；
- 当前推荐；
- 简单训练状态。

不要做复杂能力画像。

---

# 28. 视觉设计

品牌：

```text
码练星轨
codeStartrail
```

风格：

- 简洁；
- 专注；
- 程序训练感；
- 不要像大型 SaaS；
- 不要堆卡片；
- 不要大量发光；
- 不要大面积复杂渐变；
- 保证桌面端优先；
- 手机端可基本使用。

---

# 29. 首页

可以保留非常简单 Landing。

Hero：

> 码练星轨

主标题：

> **下一道题，练得更准确。**

副标题：

> 根据你的训练过程推荐下一道程序题，卡住时由 Agent 给你恰到好处的帮助。

按钮：

```text
开始训练
```

第二按钮可以：

```text
体验 Demo
```

首页不要展示 ACM、408、面试、求职等多个业务卡片。

---

# 30. 技术栈

优先：

## Web

```text
Next.js
TypeScript
Tailwind CSS
```

## Database

```text
PostgreSQL
```

## ORM

沿用现有，或选：

```text
Prisma
```

## Judge

```text
Python
FastAPI
g++
```

## Deployment

```text
Docker
Docker Compose
```

---

# 31. Docker Compose

最终至少：

```text
web
db
judge
```

例如：

```text
web:
  Next.js

db:
  PostgreSQL

judge:
  FastAPI + g++
```

Judge 只在 Docker 内部网络暴露。

---

# 32. Seed

创建：

```text
npm run db:seed
```

或当前 ORM 对应 Seed。

Seed 内容：

- Demo 用户；
- Demo Coach；
- Demo Team；
- 24+ Problem；
- Test Cases；
- 少量历史 Submission；
- 教练端模拟数据。

---

# 33. Docker 部署

必须支持：

```bash
docker compose up -d --build
```

然后：

```text
http://localhost:3000
```

Web Health：

```text
/api/health
```

Judge Health：

```text
/health
```

---

# 34. 学校服务器

保留或修复现有：

```text
GitHub Actions
GHCR
```

如果当前项目已有 Docker CI，不要无意义重写。

目标：

```text
git push
↓
GitHub Actions
↓
Docker Image
↓
GHCR
↓
学校服务器 docker pull
↓
docker compose up -d
```

---

# 35. README

Demo V2 README 必须写：

- 产品定位；
- Demo V2 做什么；
- Demo V2 不做什么；
- 技术栈；
- 本地运行；
- Docker；
- Seed；
- Judge；
- Demo 用户；
- 演示流程；
- 当前 Judge 安全边界。

---

# 36. Demo 演示流程

README 给出一个 3~5 分钟演示流程：

```text
1. 打开码练星轨
2. 进入训练页
3. 查看系统推荐的一道题
4. 查看为什么推荐
5. 开始训练
6. 写一份错误代码
7. 提交得到 WA / CE
8. 点击“我卡住了”
9. 获取 Agent Hint
10. 修正代码
11. 再次提交
12. AC
13. 查看系统推荐的下一道题
14. 切换 Coach Demo
15. 查看刚刚这次训练产生的数据
```

---

# 37. 推荐算法和 Agent 必须标记为 Demo

代码和 UI 都不要假装是真 AI。

可以写：

```text
Demo Recommendation
Demo Agent
```

README 明确：

> 当前推荐算法和 Agent 采用规则引擎与预设内容，用于验证产品流程。

未来再替换为真实推荐系统、LLM 和 Training Policy。

---

# 38. 不要做的东西

这次明确禁止主动扩展：

- RAG；
- Vector DB；
- Redis（除非当前已有且删除反而更复杂）；
- Kafka；
- 微服务体系；
- Kubernetes；
- AI 自动出题；
- 多模型 Gateway；
- 支付；
- 社区；
- 排行榜；
- 大规模管理后台；
- 全国学校体系；
- 完整课程系统；
- 复杂通知系统；
- 多语言 Judge；
- WebSocket 实时判题；
- 分布式 Judge。

如果不是 Demo 核心闭环需要，就不要做。

---

# 39. 开发顺序

严格按照：

## Phase 1
- 分析 V1；
- 确定保留代码；
- 数据模型；
- Docker 架构。

## Phase 2
- PostgreSQL；
- Problem；
- TestCase；
- Seed 24+ 题。

## Phase 3
- Judge Service；
- C++17；
- Run Sample；
- Submit；
- Verdict。

## Phase 4
- Student Training；
- Recommendation；
- Problem Page；
- Agent。

## Phase 5
- History；
- Profile。

## Phase 6
- Coach Minimal Demo。

## Phase 7
- Docker；
- Build；
- Tests；
- README；
- UI Polish。

不要反过来先做漂亮页面。

---

# 40. 测试

至少验证：

## Judge
- 正确代码 → AC；
- 错误答案 → WA；
- 编译错误 → CE；
- 无限循环 → TLE；
- 崩溃 → RE。

## 推荐
- 不推荐已经 AC 的题；
- AC 后能获得下一题；
- 连续失败不会无限提升难度。

## Agent
- 每题 Hint 正确；
- Hint Level 逐渐增加；
- 不默认显示 solutionOutline。

## Web
- `/training`
- `/problem/[id]`
- `/history`
- `/profile`
- `/coach`

---

# 41. 质量检查

完成后运行：

```bash
npm run lint
npm run build
```

如果有测试：

```bash
npm test
```

启动：

```bash
docker compose up -d --build
```

检查：

```bash
curl http://localhost:3000/api/health
```

以及：

```bash
docker compose logs
```

并真实提交至少：

- 1 次 AC；
- 1 次 WA；
- 1 次 CE；
- 1 次 TLE。

---

# 42. 最终交付

最终回复必须包含：

1. Demo V1 分析；
2. Demo V2 改动摘要；
3. 文件列表；
4. 数据库结构；
5. 24+ 题数量；
6. Judge 实现方式；
7. Judge 安全边界；
8. 推荐规则；
9. Agent 规则；
10. 页面列表；
11. Docker 启动方式；
12. Demo 账号；
13. 3~5 分钟演示步骤；
14. 已完成验证；
15. 当前未实现项。

---

# 43. 最终验收标准

Demo V2 最低必须做到：

```text
推荐一道题
↓
真实写代码
↓
真实运行样例
↓
真实提交
↓
真实 Judge
↓
得到 Verdict
↓
调用 Agent Hint
↓
再次提交
↓
AC
↓
记录训练
↓
推荐下一题
```

同时：

```text
Coach Demo
↓
能够看到学生刚刚产生的训练记录
```

只要这个闭环稳定、界面干净、Docker 可以直接部署：

> Demo V2 就达到目标。

现在开始分析当前仓库并实现，不要主动扩展到上述范围之外。
