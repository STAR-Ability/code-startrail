# ACM 新生调查分析产物

入口：[研究报告](../../docs/research/freshman-survey-analysis-2026.md) · [产品规划](../../docs/product/personal-acm-agent-plan.md) · [下一轮研究](../../docs/research/next-research-plan.md) · [图表浏览](index.html) · [整套PDF](survey-charts.pdf)。

## 复现

在仓库根目录运行：

```bash
python3 -m venv .venv-analysis
.venv-analysis/bin/python -m pip install -r requirements-analysis.txt
.venv-analysis/bin/python scripts/analyze_freshman_survey.py
```

如果已有依赖，直接 `python3 scripts/analyze_freshman_survey.py`。脚本自动在仓库寻找精确文件名；存在多个候选时停止并要求指定 `--input path/to/file.xlsx`，不猜选。可用 `--output path` 更改表图输出目录，三篇Markdown报告仍写入固定的 `docs/` 路径（其相对图链接针对默认目录）。这是本问卷专用脚本与中文叙述，不是任意问卷通用报告生成器。

需要Python 3.11或更新版本（本次实测3.13.2）。依赖为pandas、numpy、openpyxl、scipy、matplotlib和Pillow；requirements锁定本次实际运行版本，也记录在[manifest.json](manifest.json)。安装依赖后，分析无需联网、模型API、jieba、wordcloud、数据库或Node开发服务。脚本使用非交互Agg绘图，可在无桌面环境运行。

自动查找SimHei、Hiragino Sans GB或Noto/Source Han CJK。此次字体 `SimHei.ttf`。其他环境可设 `SURVEY_CJK_FONT=/path/to/chinese-font.ttf`；不存在可用中文字体时明确报错，不生成乱码图。

脚本只读Excel；结束时验证输入SHA-256不变。源哈希 `451f87eb45403ba2021420d447cbd33ad1c63905b55a33d931600c6fa1a2ec87`。源表1个，78份答卷，25题，AI细节适用71人。不要从文件名推断人数。脚本会覆盖自身的衍生CSV/图/报告，原始Excel、原Prompt和应用代码不修改。

## 清洗与统计规则

- Q13–17的7个`(跳过)`是结构性缺失；仅适用的71人入分母。其他单/多选分母78。多选选项用`┋`拆分、去重；`其他〖附言〗`移除附言；Q19 Hint/思路别名统一。
- 系统序号、精确提交时间、来源/详情、IP/位置全部删除。时长只保留分档。开放原文不导出，只输出主题/内容状态；没有任何原始行号映射。研究编号按固定种子打散后编号。
- 5份互斥答案并选标为suspected，其余73份valid；0份invalid。主分析保留78份，附valid-only敏感性。短时长、Q19未入围不单独剔除；不依共享IP删人。主“有效率”应写清是保留率100%或valid率93.6%。
- Q22偏好不是同意书；`recording_preferences.csv`额外给拒绝长期记录优先的计数。
- 开放题32/38/41份有实质内容，多标签规则编码并逐条审阅。词云被文档频率短语图替代，不强制聚类、情绪分析或embedding。编码无双人一致性验证。
- 选择比例给95% Wilson区间；探索性二元比较用双侧Fisher、比例差及Newcombe区间，11项统一BH校正。区间不解决便利样本的代表性问题。非预注册，无因果解释。
- 前三痛点覆盖按受访者去重；共现同时输出人数/Jaccard/lift，不把选票总数当人群覆盖。不把跨题偏好当行为漏斗。

## 文件索引

| 文件 | 内容 |
| --- | --- |
| data_dictionary.csv | 31个源字段、题型、用途、隐私处理 |
| survey_cleaned.csv | 78行去标识微数据；包含质量标记、闭合题、开放题主题，无原文 |
| survey_summary.csv | 全部闭合题选项、人数、正确分母、比例、区间、排名 |
| training_pain_points.csv / ai_usage.csv / feature_demand.csv | 主题切片统计 |
| quality_summary.csv / quality_flags.csv / missingness.csv / duration_distribution.csv / selection_counts.csv | 质量审计、缺失、跳题、时长与选择数量 |
| sensitivity_analysis.csv | 78人主分析与排除5份suspected后的73人分析（AI另算适用分母） |
| open_question_topics.csv / open_topics_unique_respondents.csv | 各题主题次数与跨题独立人数 |
| open_text_coverage.csv / open_text_phrases.csv / topic_codebook.csv | 有效文本数、短语文档频率及编码规则 |
| skill_cross_tabs.csv / user_segments.csv | 自评基础分层，组内分母与人数 |
| pain_cooccurrence.csv / pain_coverage.csv | 共现及独立人数覆盖 |
| exploratory_tests.csv / behavior_overlaps.csv | 全部11项检验和描述性交集 |
| feature_preference_consistency.csv / recording_preferences.csv | 多选/唯一优先一致性；记录偏好的保守解释 |
| product_priorities.csv / evidence_ledger.csv | 优先级判断与数据证据链；估计不伪装成事实 |
| charts/ | 27张PNG和同名SVG；SVG中文字转路径，便于跨设备分享 |
| survey-charts.pdf / index.html | PDF图册与离线HTML索引 |
| visual-review-*.jpg | 三页缩略图，便于核对全套渲染 |
| validation.json / manifest.json | 数据一致性、隐私模式扫描、依赖、源文件与产物哈希 |

清洗微数据**不保证不可再识别**，仅供受控研究；对外优先发布汇总报告/图。自动手机号/IP/邮箱扫描不替代人工审阅，尤其无法识别所有姓名与组合身份。

## 图表取舍

保留分布、分层热图、共现、按人覆盖、偏好落差、开放主题和不确定区间；需求×成本图明确Y轴为产品估计。没有真实时序，不画Sankey；不做不同量纲雷达；样本不适合把算法聚类当自然人格；小文本用有计数的短语图代替词云。图表SVG、PNG和PDF使用相同统计源。

可视化检查是实际查看缩略图与关键原尺寸图；检查代码对数据总数、单选求和、AI跳题分母、所有PNG可解码、输入哈希与常见标识符进行了断言。应用代码未变化，因此未运行与本任务无关的前端测试。
