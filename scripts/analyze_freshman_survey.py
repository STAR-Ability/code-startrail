#!/usr/bin/env python3
"""Reproducible, local-only survey analysis. Never writes to the source workbook.

Run: python3 scripts/analyze_freshman_survey.py
See artifacts/survey/README.md for denominators, privacy and methods.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import importlib.metadata
import itertools
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import textwrap

sys.dont_write_bytecode = True
os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "freshman-survey-mpl"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.backends.backend_pdf import PdfPages
from PIL import Image, ImageOps, ImageDraw
import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
TARGET = "386540716_按文本_新生培训情况与 AI 使用情况匿名调查问卷_79_78.xlsx"
MULTI = {5, 7, 9, 10, 13, 14, 17, 18, 22}
OPEN = {11, 24, 25}
AI_DETAILS = {13, 14, 15, 16, 17}
EMPTY = {"", "(空)", "（空）"}
NO_CONTENT = {"没有", "无", "暂无", "我不清楚", "挺好的", "没有啊（我才不想匿名嘻嘻哈哈）"}
SKILL_ORDER = ["基本没有接触", "会输入输出、变量、判断、循环", "会数组、字符串、函数等基础内容", "能独立完成一些基础程序设计题", "已经掌握部分常见算法和数据结构", "有较系统的算法竞赛训练经验"]
GROUPS = ["尚未接触", "基础语法", "数组及以上"]
ALIASES = {"遇到不会的题时逐步给 Hint": "遇到不会的题时逐步给思路"}
NONE_OPTIONS = {9: "我基本没有这方面顾虑", 10: "上面这些情况基本没有出现过", 17: "暂时没有明显问题", 22: "我不希望系统长期记录"}
COLORS = ["#236C92", "#218B80", "#D58A3C", "#A25967", "#6D6D97"]

# Multi-label, conservative semantic coding; short phrases are reviewed in context.
# No raw response text, respondent identifiers or external NLP services are used in outputs.
TOPICS = {
    "teaching_pace": ("授课节奏与消化时间", r"讲.*慢|进度|速度|语速|跟不上|自我思考的时间|减慢|慢一点|讲的有点快"),
    "teaching_clarity": ("讲解方式与细致程度", r"更.*清楚|讲.*清晰|吐字|声音|听不|听得|理解的方式|朗诵|念PPT|讲细|详细|讲的细|讲解方式|有点乱|不能以我们理解"),
    "practice_feedback": ("讲练结合与作业反馈", r"做过的题讲解|题写完了要再讲|讲课的时候让我们做点题|上次留的题|多练|直接写题|敲代码|写代码时间|题目的讲解|讲题的时候多做|多讲点题|讲竞赛题|在课上通过|预习|减少军训"),
    "knowledge_gap": ("基础语法与知识缺口", r"基础|特殊名词|每个字符|一个知识点不会|知识点越卡顿|没学|语法|概念"),
    "learning_path": ("学习路线、目标与计划", r"顺序|途径|计划|方案|系统的知识|系统学习|阶段该|该怎么学习|没有头绪|明确的目标|明确的学习目标|学习目标|入队|目标|规划|训练学习内容|推荐学习内容|学习好迷茫"),
    "problem_recommendation": ("适配题目与迁移练习", r"刷基础题|类似题型|练习题|现阶段的习题|目标和题目|逐步增加难度|出一些运用"),
    "progressive_hint": ("逐步引导与保留思考", r"逐步(?:给|提供|讲解|分析)|一步一步|不给|不直接|不要给完整|引导|辅助自己思考|帮助学习思考|起到点的作用"),
    "debugging": ("错误定位与原因解释", r"错误|错在哪里|代码错|bug|debug|纠错|代码问题|检查问题|wa|出错"),
    "algorithm_explanation": ("解题思路与知识解释", r"算法|思路|解题能力|分析应如何入手|知识点并详解|知识点讲解|逐步讲解|给出知识点|解题但|基础的东西还没讲|基础知识|每个字符|基础的编程"),
    "problem_comprehension": ("题意理解与表达", r"题目.*清晰|解释题目|题意|题目描述"),
    "review": ("错题复习与巩固", r"错题|做错|巩固|反复|知识点.*总结|知识点 并总结"),
    "personalization": ("个人水平与薄弱点", r"每个人|个人能力|不同水平|我的水平|什么水平|记录.*薄弱|了解薄弱|分层|根据情况|根据成员"),
    "human_help": ("真人答疑与求助负担", r"麻烦学长|来解答|互相指导|学长下来"),
    "organization_access": ("时间地点与组织安排", r"寝室|网上学习|网课，每次|太远|报销|放假|军训|时间合理分配"),
    "motivation": ("信心、乐趣与参与动力", r"零基础能学会|乐趣|可能acm就是这样"),
    "challenge_level": ("更高难度与竞赛目标", r"过于简单|问难题|ICPC|竞赛中获得奖项|竞赛题和算法"),
    "ai_boundaries": ("AI 使用边界与资源", r"依赖ai|Token|人性化"),
}
PHRASES = {
    "授课节奏": r"进度|讲.*慢|速度|语速|跟不上|减慢",
    "基础知识": r"基础|语法|概念|特殊名词|每个字符",
    "讲解清晰": r"清楚|清晰|详细|讲细|讲的细|理解的方式|吐字",
    "学习路线": r"顺序|途径|系统学习|知识体系|学习.*规划|规划.*学习|学习方案",
    "训练计划": r"计划|方案|规划",
    "学习目标": r"目标|阶段该|入队",
    "讲练结合": r"多练|做点题|写代码时间|敲代码|直接写题|讲竞赛题|在课上通过",
    "作业讲评": r"上次留的题|做过的题|题写完|题目的讲解",
    "错误定位": r"错误|bug|debug|纠错|代码问题|错在哪里|出错",
    "解题思路": r"思路|算法执行|分析应如何入手",
    "逐步提示": r"逐步(?:给|提供|讲解|分析)|一步一步|引导|不给|不要给完整|不直接",
    "推荐题目": r"习题|练习题|类似题型|刷基础题|目标和题目",
    "薄弱知识点": r"薄弱|知识点经常|知识点不会",
    "错题复习": r"错题|做错|巩固",
    "个性化": r"每个人|个人能力|不同水平|分层|根据情况",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def split_options(value: str) -> list[str]:
    if value in EMPTY or value == "(跳过)":
        return []
    # Free-text 'other' payloads can contain identity clues; retain the category only.
    value = re.sub(r"其他〖.*?〗", "其他", value)
    return list(dict.fromkeys(ALIASES.get(s.strip(), s.strip()) for s in value.split("┋") if s.strip()))


def wilson(k: int, n: int) -> tuple[float, float]:
    if not n:
        return float("nan"), float("nan")
    z = stats.norm.ppf(.975)
    p = k / n
    mid = (p + z*z/(2*n)) / (1+z*z/n)
    half = z*math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / (1+z*z/n)
    return 100*(mid-half), 100*(mid+half)


def bh_adjust(pvalues: list[float]) -> np.ndarray:
    p = np.asarray(pvalues)
    order = np.argsort(p)
    ranked = p[order] * len(p) / np.arange(1, len(p)+1)
    adjusted = np.minimum.accumulate(ranked[::-1])[::-1].clip(0, 1)
    output = np.empty_like(adjusted)
    output[order] = adjusted
    return output


def md_table(frame: pd.DataFrame) -> str:
    def esc(x):
        if isinstance(x, float):
            return "—" if math.isnan(x) else f"{x:.1f}"
        return str(x).replace("|", "／").replace("\n", " ")
    return "\n".join(["| " + " | ".join(map(str, frame.columns)) + " |", "| " + " | ".join(["---"]*len(frame.columns)) + " |"] + ["| " + " | ".join(esc(v) for v in row) + " |" for row in frame.itertuples(index=False, name=None)])


class Analysis:
    def __init__(self, path: Path, output: Path):
        self.path, self.output = path, output
        self.charts = output / "charts"
        self.charts.mkdir(parents=True, exist_ok=True)
        self.original_hash = digest(path)
        self.sheets = pd.read_excel(path, sheet_name=None, dtype=str, keep_default_na=False)
        survey_sheets = [name for name, frame in self.sheets.items() if any(re.match(r"1、", str(c)) for c in frame.columns)]
        if len(survey_sheets) != 1:
            raise ValueError("Expected one response sheet; inspect schema before pooling sheets.")
        self.sheet = survey_sheets[0]
        self.raw = self.sheets[self.sheet].copy()
        self.fields = {int(re.match(r"(\d+)、", c)[1]): c for c in self.raw.columns if re.match(r"(\d+)、", c)}
        assert set(self.fields) == set(range(1, 26)), "Questionnaire schema changed"
        self.q = {k: self.raw[c].str.strip() for k, c in self.fields.items()}
        self.n = len(self.raw)
        self.multi = {k: self.q[k].map(split_options) for k in MULTI}
        self.eligible = self.q[12].isin(["经常使用", "偶尔使用", "很少使用"])
        self.group = self.q[2].map(lambda x: GROUPS[0] if x == SKILL_ORDER[0] else GROUPS[1] if x == SKILL_ORDER[1] else GROUPS[2])
        self.figures: list[dict] = []
        self.tables: dict[str, pd.DataFrame] = {}
        self.setup_font()

    def setup_font(self):
        candidates = [os.environ.get("SURVEY_CJK_FONT", ""), str(Path.home()/"Library/Fonts/SimHei.ttf"), "/System/Library/Fonts/Hiragino Sans GB.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "C:/Windows/Fonts/msyh.ttc"]
        candidates += [f.fname for f in font_manager.fontManager.ttflist if any(x in f.name for x in ["Noto Sans CJK", "Source Han Sans", "SimHei", "Microsoft YaHei", "PingFang"])]
        self.font_path = next((p for p in candidates if p and Path(p).is_file()), None)
        if not self.font_path:
            raise RuntimeError("Chinese font required: install Noto Sans CJK or set SURVEY_CJK_FONT to a font path")
        font_manager.fontManager.addfont(self.font_path)
        family = font_manager.FontProperties(fname=self.font_path).get_name()
        plt.rcParams.update({"font.family": family, "axes.unicode_minus": False, "font.size": 11, "axes.spines.top": False, "axes.spines.right": False, "axes.spines.left": False, "axes.titleweight": "bold", "axes.titlepad": 16, "svg.fonttype": "path", "svg.hashsalt": "freshman-survey-2026", "figure.facecolor": "white", "savefig.facecolor": "white"})

    def save_csv(self, name: str, rows) -> pd.DataFrame:
        frame = rows if isinstance(rows, pd.DataFrame) else pd.DataFrame(rows)
        # CSV formula-injection protection for any future free-text-derived categories.
        for c in frame.select_dtypes(include=["object", "string"]):
            frame[c] = frame[c].map(lambda x: "'"+x if isinstance(x, str) and x.startswith(("=", "+", "-", "@", "\t", "\r")) else x)
        frame.to_csv(self.output/f"{name}.csv", index=False, encoding="utf-8-sig", float_format="%.6f")
        self.tables[name] = frame
        return frame

    def has(self, k: int, option: str) -> pd.Series:
        return self.multi[k].map(lambda values: option in values)

    def stat(self, k: int, option: str) -> dict:
        rows = self.tables["survey_summary"]
        row = rows[(rows.question_id == k) & (rows.option == option)]
        if len(row) != 1:
            raise ValueError((k, option))
        return row.iloc[0].to_dict()

    def fmt(self, k: int, option: str) -> str:
        s = self.stat(k, option)
        return f"{int(s['count'])}/{int(s['denominator'])}（{s['percent']:.1f}%）"

    def quality(self):
        duration = pd.to_numeric(self.raw["所用时间"].str.extract(r"^(\d+)秒$")[0], errors="coerce")
        assert duration.notna().all(), "Unexpected duration format"
        self.duration = duration
        labels = ["<60秒", "60–<90秒", "90–<150秒", "150–<300秒", "300–600秒", ">600秒"]
        self.duration_band = pd.cut(duration, [-1, 59, 89, 149, 299, 600, np.inf], labels=labels)
        self.reasons = pd.Series([[] for _ in range(self.n)], dtype=object)
        self.review_flags = pd.Series([[] for _ in range(self.n)], dtype=object)
        self.conflicts = {}
        for k, none in NONE_OPTIONS.items():
            mask = self.has(k, none) & self.multi[k].map(len).gt(1)
            self.conflicts[k] = mask
            for i in mask[mask].index:
                self.reasons[i].append(f"q{k}_exclusive_conflict")
        skip_violations = pd.Series(False, index=self.raw.index)
        for k in AI_DETAILS:
            skip_violations |= self.q[k].eq("(跳过)").eq(self.eligible)
        for i in skip_violations[skip_violations].index:
            self.reasons[i].append("ai_skip_logic_conflict")
        self.top_mismatch = pd.Series([ALIASES.get(top, top) not in options for top, options in zip(self.q[19], self.multi[18])])
        for i in self.raw.index:
            if duration[i] < 90:
                self.review_flags[i].append("duration_under_90_seconds_not_exclusion")
            if self.top_mismatch[i]:
                self.review_flags[i].append("top_priority_outside_q18_not_exclusion")
        self.status = self.reasons.map(lambda xs: "suspected" if xs else "valid")
        self.core = self.status.eq("valid")
        self.save_csv("duration_distribution", [{"duration_band": b, "count": int(self.duration_band.eq(b).sum()), "denominator": self.n, "percent": 100*self.duration_band.eq(b).mean()} for b in labels])
        rows = []
        for k,c in self.fields.items():
            values = self.q[k]
            rows.append({"question_id": k, "question": c, "respondents": self.n, "literal_empty": int(values.isin(EMPTY).sum()), "structural_skip": int(values.eq("(跳过)").sum()), "no_substantive_open_text": int(values.isin(NO_CONTENT).sum()) if k in OPEN else 0, "eligible_denominator": int(self.eligible.sum()) if k in AI_DETAILS else self.n})
        self.save_csv("missingness", rows)
        self.quality_info = {"total": self.n, "valid": int(self.core.sum()), "suspected": int((~self.core).sum()), "invalid": 0, "retained": self.n, "ai_eligible": int(self.eligible.sum()), "ai_structural_skips": int((~self.eligible).sum()), "skip_violations": int(skip_violations.sum()), "exact_duplicate_rows": int(self.raw.duplicated().sum()), "question_duplicate_rows": int(self.raw[list(self.fields.values())].duplicated().sum()), "unique_network_values": int(self.raw["来自IP"].nunique()), "duration_median_seconds": float(duration.median()), "duration_min_seconds": float(duration.min()), "duration_max_seconds": float(duration.max()), "top_priority_mismatch": int(self.top_mismatch.sum()), "exclusive_conflicts": {str(k):int(v.sum()) for k,v in self.conflicts.items()}}
        self.save_csv("quality_summary", [{"metric":k,"value":json.dumps(v,ensure_ascii=False) if isinstance(v,dict) else v} for k,v in self.quality_info.items()])

    def describe(self):
        dictionary = []
        for c in self.raw.columns:
            match = re.match(r"(\d+)、", c)
            k = int(match[1]) if match else None
            dictionary.append({"field": f"q{k:02}" if k else c, "question": c if k else "系统字段", "question_type": "open_text" if k in OPEN else "multiple_choice" if k in MULTI else "single_choice" if k else "system", "description": "┋分隔，多标签；其他附言删除" if k in MULTI else "开放原文仅本地读取，输出主题标签，不输出原文" if k in OPEN else "填写时长只保留分档" if c == "所用时间" else "删除：序号/时间/来源/IP等元数据" if not k else "单一分类值；未收集客观能力或学习成效", "analysis_usage": "AI细节仅71名适用者；(跳过)为结构性缺失" if k in AI_DETAILS else "主题编码与短语文档频率" if k in OPEN else "主分析含valid及suspected；附valid-only敏感性" if k else "仅质量审计"})
        self.save_csv("data_dictionary", dictionary)
        summary = []
        for k in sorted(set(self.fields)-OPEN):
            eligible = self.eligible if k in AI_DETAILS else pd.Series(True,index=self.raw.index)
            values = self.multi[k] if k in MULTI else self.q[k].map(lambda s:[ALIASES.get(s,s)] if s not in EMPTY and s != "(跳过)" else [])
            answered = eligible & values.map(bool)
            options = sorted(set(itertools.chain.from_iterable(values[answered])))
            for option in options:
                picked = values.map(lambda xs:option in xs)
                count = int((answered & picked).sum()); n=int(answered.sum())
                lo,hi = wilson(count,n)
                summary.append({"question_id":k, "question":self.fields[k], "option":option, "count":count, "denominator":n, "percent":100*count/n, "ci95_low":lo,"ci95_high":hi, "all_sample_percent":100*count/self.n, "selection_total":int(values[answered].map(len).sum()), "multiple_choice":k in MULTI})
        summary=pd.DataFrame(summary).sort_values(["question_id","count","option"],ascending=[True,False,True])
        summary["rank"]=summary.groupby("question_id")["count"].rank(method="min",ascending=False).astype(int)
        self.save_csv("survey_summary",summary)
        self.save_csv("training_pain_points",summary[summary.question_id.eq(5)].copy())
        self.save_csv("ai_usage",summary[summary.question_id.between(12,17)].copy())
        self.save_csv("feature_demand",summary[summary.question_id.isin([18,19])].copy())
        self.save_csv("selection_counts",[{"question_id":k,"selected_options":int(n),"count":int(c),"denominator":int((self.eligible if k in AI_DETAILS else pd.Series(True,index=self.raw.index)).sum())} for k in sorted(MULTI) for n,c in self.multi[k][self.eligible if k in AI_DETAILS else pd.Series(True,index=self.raw.index)].map(len).value_counts().sort_index().items()])
        sensitivity = []
        for row in summary.itertuples():
            mask = self.has(row.question_id,row.option) if row.question_id in MULTI else self.q[row.question_id].replace(ALIASES).eq(row.option)
            eligibility = self.eligible if row.question_id in AI_DETAILS else pd.Series(True,index=self.raw.index)
            n=int((self.core & eligibility).sum()); count=int((self.core & eligibility & mask).sum())
            sensitivity.append({"question_id":row.question_id,"option":row.option,"main_count":row.count,"main_n":row.denominator,"main_percent":row.percent,"valid_only_count":count,"valid_only_n":n,"valid_only_percent":100*count/n,"difference_pp":100*count/n-row.percent})
        self.save_csv("sensitivity_analysis",sensitivity)

    def texts(self):
        self.text_codes = {}
        self.text_status = {}
        for k in sorted(OPEN):
            self.text_status[k] = self.q[k].map(lambda s:"empty" if s in EMPTY else "no_substantive_content" if s in NO_CONTENT else "substantive")
            self.text_codes[k] = self.q[k].map(lambda s: [tag for tag,(_,pattern) in TOPICS.items() if re.search(pattern,s,re.I)] if s not in EMPTY|NO_CONTENT else [])
            # Ambiguous but meaningful responses are preserved as unclassified, not forced into a theme.
            self.text_codes[k] = pd.Series([tags or (["unspecified"] if status=="substantive" else []) for tags,status in zip(self.text_codes[k],self.text_status[k])])
        TOPICS_ALL={**TOPICS,"unspecified":("诉求不够具体","")}
        topic_rows=[]
        for k in sorted(OPEN):
            n=int(self.text_status[k].eq("substantive").sum())
            for tag,(label,_) in TOPICS_ALL.items():
                count=int(self.text_codes[k].map(lambda tags:tag in tags).sum())
                topic_rows.append({"question_id":k,"topic":tag,"label":label,"count":count,"substantive_n":n,"percent_substantive":100*count/n if n else 0,"percent_all":100*count/self.n})
        self.save_csv("open_question_topics",topic_rows)
        union=[]
        for tag,(label,_) in TOPICS_ALL.items():
            mask=pd.concat([self.text_codes[k].map(lambda tags:tag in tags) for k in sorted(OPEN)],axis=1).any(axis=1)
            union.append({"topic":tag,"label":label,"unique_respondents":int(mask.sum()),"denominator":self.n,"percent_all":100*mask.mean()})
        self.save_csv("open_topics_unique_respondents",union)
        self.save_csv("open_text_coverage",[{"question_id":k,"empty":int(self.text_status[k].eq("empty").sum()),"no_substantive_content":int(self.text_status[k].eq("no_substantive_content").sum()),"substantive":int(self.text_status[k].eq("substantive").sum()),"uncategorized":int(self.text_codes[k].map(lambda t:t==["unspecified"]).sum())} for k in sorted(OPEN)])
        self.save_csv("topic_codebook",[{"topic":tag,"label":label,"pattern":pattern,"method":"reviewed_regex_multilabel","limitation":"单分析者编码；未估计编码者一致性；未按推测补标签"} for tag,(label,pattern) in TOPICS_ALL.items()])
        phrases=[]
        for k in sorted(OPEN):
            n=int(self.text_status[k].eq("substantive").sum())
            for phrase,pattern in PHRASES.items():
                count=int((self.q[k].str.contains(pattern,case=False,regex=True)&self.text_status[k].eq("substantive")).sum())
                phrases.append({"question_id":k,"phrase":phrase,"document_count":count,"substantive_n":n,"percent":100*count/n if n else 0,"regex":pattern})
        self.save_csv("open_text_phrases",phrases)

    def relationships(self):
        rows=[]
        for k in [5,9,10,17,18,19]:
            for group in GROUPS:
                eligible=self.group.eq(group)&(self.eligible if k in AI_DETAILS else True)
                n=int(eligible.sum())
                for option in self.tables["survey_summary"].loc[lambda d:d.question_id.eq(k),"option"]:
                    picked=self.has(k,option) if k in MULTI else self.q[k].replace(ALIASES).eq(option)
                    count=int((eligible&picked).sum())
                    rows.append({"group":group,"question_id":k,"option":option,"count":count,"denominator":n,"percent":100*count/n})
        self.save_csv("skill_cross_tabs",rows)
        pairs=[]
        options=self.tables["training_pain_points"].option.tolist()
        for a,b in itertools.combinations(options,2):
            x,y=self.has(5,a),self.has(5,b)
            together=int((x&y).sum()); union=int((x|y).sum())
            pairs.append({"pain_a":a,"pain_b":b,"cooccurrence":together,"count_a":int(x.sum()),"count_b":int(y.sum()),"support_percent":100*together/self.n,"jaccard":together/union,"lift":together*self.n/(int(x.sum())*int(y.sum()))})
        self.save_csv("pain_cooccurrence",pd.DataFrame(pairs).sort_values(["cooccurrence","lift"],ascending=False))
        covered=pd.Series(False,index=self.raw.index); coverage=[]
        for i,option in enumerate(options,1):
            before=int(covered.sum());covered|=self.has(5,option)
            coverage.append({"rank":i,"option_added":option,"selected_count":int(self.has(5,option).sum()),"new_people":int(covered.sum())-before,"unique_people_covered":int(covered.sum()),"denominator":self.n,"coverage_percent":100*covered.mean()})
        self.save_csv("pain_coverage",coverage)

        comparisons=[]
        frequent=self.q[12].eq("经常使用")
        low_skill=self.q[2].isin(SKILL_ORDER[:2])
        high_hours=self.q[4].isin(["10～20小时","20小时以上"])
        any_mask=pd.Series(True,index=self.raw.index)
        specs=[
            ("经常使用AI → 未真正掌握",frequent,self.has(17,"使用 AI 后虽然题做出来了，但自己没有真正掌握"),self.eligible),
            ("经常使用AI → 答案过早抑制思考",frequent,self.has(17,"AI 直接把完整答案告诉我，导致自己缺少思考"),self.eligible),
            ("经常使用AI → 遇到错误答案",frequent,self.has(17,"AI 给出了错误答案"),self.eligible),
            ("经常使用AI → 通常验证答案",frequent,self.q[16].isin(["基本都会验证","大多数时候会验证"]),self.eligible),
            ("常有未提问 → 经常使用AI",self.q[8].isin(["经常","偶尔"]),frequent,any_mask),
            ("语法及以下 → 需要水平适配题目",low_skill,self.has(18,"根据我的水平推荐题目"),any_mask),
            ("语法及以下 → 题解懂但写不出",low_skill,self.has(10,"看完题解感觉懂了，但是自己还是写不出来"),any_mask),
            ("每周10小时以上 → 不懂卡在哪里",high_hours,self.has(10,"一道题卡很久但不知道自己卡在哪里"),self.q[4].ne("目前没有固定学习时间")),
            ("不知如何描述问题 → 不知如何问AI",self.has(9,"不知道应该怎么描述自己的问题"),self.has(17,"不知道应该怎么向 AI 提问"),self.eligible),
            ("看懂题解写不出 → AI后未真正掌握",self.has(10,"看完题解感觉懂了，但是自己还是写不出来"),self.has(17,"使用 AI 后虽然题做出来了，但自己没有真正掌握"),self.eligible),
            ("通常验证答案 → AI后未真正掌握",self.q[16].isin(["基本都会验证","大多数时候会验证"]),self.has(17,"使用 AI 后虽然题做出来了，但自己没有真正掌握"),self.eligible),
        ]
        for name,x,y,e in specs:
            counts=np.array([[int((e&x&y).sum()),int((e&x&~y).sum())],[int((e&~x&y).sum()),int((e&~x&~y).sum())]])
            a,b,c,d=counts.ravel();n1=a+b;n0=c+d
            odds,p=stats.fisher_exact(counts)
            l1,u1=wilson(a,n1);l0,u0=wilson(c,n0)
            diff=100*(a/n1-c/n0)
            # Newcombe hybrid Wilson interval for difference of two independent proportions.
            lower=diff-math.sqrt((100*a/n1-l1)**2+(u0-100*c/n0)**2)
            upper=diff+math.sqrt((u1-100*a/n1)**2+(100*c/n0-l0)**2)
            comparisons.append({"comparison":name,"group1_event":int(a),"group1_n":int(n1),"group0_event":int(c),"group0_n":int(n0),"total_n":int(counts.sum()),"difference_pp":diff,"difference_ci95_low":lower,"difference_ci95_high":upper,"odds_ratio":odds,"p_fisher_two_sided":p})
        comparisons=pd.DataFrame(comparisons);comparisons["q_bh"]=bh_adjust(comparisons.p_fisher_two_sided.tolist())
        self.save_csv("exploratory_tests",comparisons)
        # Additional descriptive overlaps are product-discovery prompts, not further significance tests.
        overlap_specs={
            "wants_hint_or_socratic":self.has(18,"遇到不会的题时逐步给思路")|self.has(18,"通过提问引导我自己找到答案，而不是直接给完整代码"),
            "basic_barrier_but_not_basic_qa_feature":self.has(9,"觉得问题太基础，不好意思问")&~self.has(18,"随时回答“不好意思问别人”的基础问题"),
            "no_ai_details_but_ai_coping":~self.eligible&self.has(7,"使用 ChatGPT、DeepSeek 等 AI"),
            "frequent_ai_and_nonmastery":frequent&self.has(17,"使用 AI 后虽然题做出来了，但自己没有真正掌握"),
            "usually_verifies_and_nonmastery":self.q[16].isin(["基本都会验证","大多数时候会验证"])&self.has(17,"使用 AI 后虽然题做出来了，但自己没有真正掌握"),
            "refuses_longterm_recording":self.has(22,"我不希望系统长期记录"),
            "requests_full_code_or_minor_edit":self.q[15].isin(["稍微修改后提交","直接复制提交"]),
            "high_hours_and_nonmastery":high_hours&self.has(10,"看完题解感觉懂了，但是自己还是写不出来"),
        }
        self.overlaps={name:int(mask.sum()) for name,mask in overlap_specs.items()}
        self.save_csv("behavior_overlaps",[{"metric":name,"count":count,"denominator":self.n,"note":"描述性交集，分母为全样本；条件概率需另算"} for name,count in self.overlaps.items()])
        preference=[]
        for option in self.tables["survey_summary"].loc[lambda d:d.question_id.eq(18),"option"]:
            votes=self.has(18,option);top=self.q[19].replace(ALIASES).eq(option)
            preference.append({"feature":option,"multi_count":int(votes.sum()),"top_choice_count":int(top.sum()),"top_choice_within_multi":int((votes&top).sum()),"top_choice_outside_multi":int((~votes&top).sum()),"denominator":self.n})
        self.save_csv("feature_preference_consistency",preference)
        consent=[]
        refusal=self.has(22,NONE_OPTIONS[22])
        for option in self.tables["survey_summary"].loc[lambda d:d.question_id.eq(22),"option"]:
            count=int(self.has(22,option).sum())
            conservative=int((self.has(22,option)&~refusal).sum()) if option != NONE_OPTIONS[22] else count
            consent.append({"option":option,"literal_count":count,"refusal_precedence_count":conservative,"denominator":self.n,"note":"问卷偏好不等于上线产品授权；拒绝长期记录优先"})
        self.save_csv("recording_preferences",consent)
        profile=[]
        for group in GROUPS:
            mask=self.group.eq(group)
            profile.append({"group":group,"count":int(mask.sum()),"percent":100*mask.mean(),"frequent_ai":int((mask&frequent).sum()),"no_fixed_hours":int((mask&self.q[4].eq("目前没有固定学习时间")).sum()),"hours_10plus":int((mask&high_hours).sum()),"nonmastery_after_solution":int((mask&self.has(10,"看完题解感觉懂了，但是自己还是写不出来")).sum())})
        self.save_csv("user_segments",profile)
        priority_specs=[
            ("分级入门题单",[(18,"根据我的水平推荐题目")],"P0",3,1,"先人工标注20–30题；规则匹配，短诊断，周内3题；不构建推荐模型"),
            ("提问式渐进提示",[(18,"遇到不会的题时逐步给思路"),(18,"通过提问引导我自己找到答案，而不是直接给完整代码")],"P0",3,2,"固定题单专家提示为基线；LLM只调整解释；保留用户请求和跳过权"),
            ("错误定位与迁移复测",[(18,"帮我检查代码中的问题"),(18,"自动分析我的 WA、TLE、RE")],"P0",3,2,"有限题库与外部OJ/人工验证；错误原因结构化；无答案相邻题检测掌握"),
            ("动态长期训练计划",[(18,"自动制定阶段训练计划")],"P1",2,2,"先验证短题单；有连续表现证据后再调整阶段计划"),
            ("自动薄弱点诊断",[(18,"判断我在哪些知识点比较薄弱")],"P1",2,3,"模型输出须与复测证据对齐；避免用自报或AC次数制造精确能力分"),
            ("自动复习",[(18,"自动安排复习")],"P1",2,1,"MVP只做一次人工指定迁移复测；验证遗忘后再安排多轮复习"),
            ("完整能力画像",[(18,"根据历史做题记录生成能力画像")],"P2",2,3,"展示已验证证据；暂缓复杂可视化与多维评分"),
            ("教练共同薄弱点后台",[(18,"根据全队训练情况帮助教练发现共同薄弱点"),(18,"将集训队高频问题整理后提供给教练")],"P2",2,3,"先交一页去标识汇总；另访谈教练，不从学生低票判断教练无需求"),
        ]
        priority=[]
        for name,features,p,impact,cost,note in priority_specs:
            picked=pd.Series(False,index=self.raw.index)
            for k,opt in features:picked |= self.has(k,opt)
            priority.append({"capability":name,"demand_count_unique":int(picked.sum()),"denominator":self.n,"demand_percent":100*picked.mean(),"priority":p,"learning_value_estimate_1to3":impact,"cost_estimate_1to3":cost,"judgment":note,"evidence_note":"需求频率为观察值；训练价值、成本与优先级为产品判断，未做收益测量"})
        self.save_csv("product_priorities",priority)

    def cleaned(self):
        clean=pd.DataFrame({"duration_band":self.duration_band.astype(str),"quality_status":self.status,"quality_reasons":self.reasons.map(lambda xs:";".join(xs)),"review_flags":self.review_flags.map(lambda xs:";".join(xs)),"skill_group":self.group})
        for k in sorted(self.fields):
            if k in OPEN:
                clean[f"q{k:02}_text_status"]=self.text_status[k]
                clean[f"q{k:02}_topics"]=self.text_codes[k].map(lambda xs:";".join(xs))
            elif k in MULTI:
                clean[f"q{k:02}"]=self.multi[k].map(lambda xs:"┋".join(xs))
            else:
                clean[f"q{k:02}"]=self.q[k].replace(ALIASES).replace({"(跳过)":""})
        clean["ai_detail_eligible"]=self.eligible
        clean["recording_refusal_precedence"]=self.has(22,NONE_OPTIONS[22])
        # No raw row number or identifying metadata, no row-key mapping; reproducibly shuffled.
        clean=clean.sample(frac=1,random_state=20260927).reset_index(drop=True)
        clean.insert(0,"analysis_id",[f"R{i:03}" for i in range(1,len(clean)+1)])
        self.save_csv("survey_cleaned",clean)
        self.save_csv("quality_flags",clean[["analysis_id","quality_status","quality_reasons","review_flags"]].copy())

    def save_fig(self,fig,name,title,note):
        fig.text(.015,.015,note,fontsize=9,color="#555555",va="bottom")
        fig.tight_layout(rect=(0,.06,1,.96))
        for ext in ["png","svg"]:
            fig.savefig(self.charts/f"{name}.{ext}",dpi=180,**({"metadata":{"Date":None}} if ext=="svg" else {}))
        self.pdf.savefig(fig)
        plt.close(fig)
        self.figures.append({"name":name,"title":title,"note":note})

    def bar(self,k,name,title,limit=None,order=None):
        frame=self.tables["survey_summary"].loc[lambda d:d.question_id.eq(k)].copy()
        if order is not None:
            frame=frame.set_index("option").reindex(order).dropna().reset_index()
        if limit:
            frame=frame.head(limit)
        fig,ax=plt.subplots(figsize=(12,max(4.5,.43*len(frame)+1.7)))
        labels=[textwrap.fill(s,30) for s in frame.option]
        y=np.arange(len(frame));ax.barh(y,frame.percent,color=COLORS[0],height=.65)
        ax.set_yticks(y,labels);ax.invert_yaxis()
        ax.set_xlim(0,max(105,frame.percent.max()+20));ax.set_xlabel("选择比例（%）")
        ax.set_title(title,loc="left");ax.grid(axis="x",alpha=.16);ax.set_axisbelow(True)
        for yi,row in enumerate(frame.itertuples()):
            ax.text(row.percent+1.2,yi,f"{row.count}/{row.denominator}  ·  {row.percent:.1f}%",va="center",fontsize=10)
        note=f"分母：{'适用的 AI 使用者' if k in AI_DETAILS else '全部答卷'} n={int(frame.denominator.iloc[0])}；{'多选，比例不求和为100%' if k in MULTI else '单选'}；自报数据。"
        self.save_fig(fig,name,title,note)

    def heat(self,k,name,title,top=10):
        options=self.tables["survey_summary"].loc[lambda d:d.question_id.eq(k),"option"].head(top).tolist()
        frame=self.tables["skill_cross_tabs"].loc[lambda d:d.question_id.eq(k)]
        mat=frame.pivot(index="option",columns="group",values="percent").loc[options,GROUPS]
        nums=frame.pivot(index="option",columns="group",values="count").loc[options,GROUPS]
        fig,ax=plt.subplots(figsize=(11,max(5,.51*len(options)+1.8)))
        im=ax.imshow(mat,vmin=0,vmax=100,cmap="Blues",aspect="auto")
        ax.set_yticks(range(len(options)),[textwrap.fill(s,26) for s in options]);ax.set_xticks(range(3),[f"{g}\nn={int(self.group.eq(g).sum())}" for g in GROUPS])
        for i in range(len(options)):
            for j in range(3):
                ax.text(j,i,f"{int(nums.iloc[i,j])}人 · {mat.iloc[i,j]:.0f}%",ha="center",va="center",color="white" if mat.iloc[i,j]>58 else "#203040",fontsize=10)
        fig.colorbar(im,ax=ax,pad=.03,label="组内选择比例（%）");ax.set_title(title,loc="left")
        self.save_fig(fig,name,title,"按自评基础进行业务分层；描述性比较，不代表能力测试，也不证明组间差异稳定。")

    def plots(self):
        with PdfPages(self.output/"survey-charts.pdf",metadata={"Title":"ACM Freshman Survey 2026","CreationDate":None,"ModDate":None}) as self.pdf:
            self.bar(2,"01_programming_experience","超过半数仍处于语法入门阶段",order=SKILL_ORDER)
            self.bar(5,"02_training_pain_points","直接困难：基础、算法选择与代码错误")
            self.bar(9,"03_help_seeking_barriers","求助障碍：基础羞耻感之外，还有问题表达")
            self.bar(12,"04_ai_usage_frequency","AI 已经进入多数人的学习过程",order=["经常使用","偶尔使用","很少使用","听说过，但基本没有使用","从来没有使用"])
            self.bar(14,"05_ai_usage_scenarios","普通 AI 的主要角色是解释知识与题意")
            self.bar(17,"06_ai_usage_problems","答案可靠性与真正掌握，是两种不同的问题")
            self.bar(18,"07_agent_feature_demand","需求多选：适配题目最普遍，提示与计划次之")
            self.bar(19,"08_top_priority_feature","唯一优先项：推荐题目与提问引导接近")
            self.heat(5,"09_pain_point_heatmap","不同基础的困难组合 · 组内比例")
            self.heat(18,"10_feature_by_skill_level","不同基础的功能偏好 · 组内比例")
            for k,name,title in [(11,"11_phrases_training_questions","匿名提问中的具体短语"),(25,"12_phrases_agent_expectations","理想助手中的具体短语"),(24,"13_phrases_training_changes","培训改进反馈中的具体短语")]:
                frame=self.tables["open_text_phrases"].loc[lambda d:d.question_id.eq(k)&d.document_count.gt(0)].sort_values("document_count",ascending=False)
                fig,ax=plt.subplots(figsize=(10,6.4));y=np.arange(len(frame))
                ax.barh(y,frame.document_count,color=COLORS[1]);ax.set_yticks(y,frame.phrase);ax.invert_yaxis();ax.set_xlim(0,frame.document_count.max()+5)
                for i,r in enumerate(frame.itertuples()):ax.text(r.document_count+.2,i,str(r.document_count),va="center")
                ax.set_title(title,loc="left");ax.set_xlabel("包含该短语类别的回答数（每份回答每类至多计1次）")
                self.save_fig(fig,name,title,f"Q{k} 有实质反馈 n={int(frame.substantive_n.iloc[0])}；领域短语归并，多标签；替代词云，不能推算全样本需求。")
            self.bar(10,"14_learning_breakdowns","最大断点：看懂题解之后仍无法独立实现")
            self.bar(7,"15_current_alternatives","卡题时的真实替代方案：AI、学长与独立思考")
            self.bar(20,"16_intervention_timing","介入时机分散，适合由学习者控制")
            self.bar(21,"17_answer_style","提问引导比完整答案更受欢迎")
            self.bar(22,"18_recording_preferences","愿意记录错误主题，不等于愿意保存全部对话")
            self.bar(4,"19_training_hours","训练投入需要分档看待：无固定时间不等于零投入",order=["目前没有固定学习时间","少于2小时","2～5小时","5～10小时","10～20小时","20小时以上"])

            frame=self.tables["feature_preference_consistency"].head(10).iloc[::-1]
            fig,ax=plt.subplots(figsize=(12,7))
            y=np.arange(len(frame));ax.hlines(y,frame.top_choice_count,frame.multi_count,color="#B6C6CF",linewidth=3)
            ax.scatter(frame.multi_count,y,label="多选入围",s=65,color=COLORS[0]);ax.scatter(frame.top_choice_count,y,label="唯一优先",s=65,color=COLORS[2])
            for i,r in enumerate(frame.itertuples()):
                ax.text(r.multi_count+1,i,str(r.multi_count),va="center");ax.text(r.top_choice_count-1,i,str(r.top_choice_count),va="center",ha="right")
            ax.set_yticks(y,[textwrap.fill(x,25) for x in frame.feature]);ax.set_xlim(-1,67);ax.set_xlabel("人数（n=78）");ax.legend(loc="lower right");ax.set_title("愿意使用与唯一优先：推荐题目广，引导思考更集中",loc="left")
            self.save_fig(fig,"20_feature_priority_gap","功能入围与唯一优先的落差",f"两个不同问题，不能把落差当流失率；{int(self.top_mismatch.sum())}人单选不在其多选列表中（已统一 Hint/思路措辞）。")

            options=self.tables["training_pain_points"].option.head(8).tolist()
            mat=np.array([[int((self.has(5,a)&self.has(5,b)).sum()) for b in options] for a in options])
            fig,ax=plt.subplots(figsize=(11,9));im=ax.imshow(mat,cmap="YlGnBu")
            ax.set_xticks(range(8),[textwrap.fill(s,10) for s in options],rotation=40,ha="right");ax.set_yticks(range(8),[textwrap.fill(s,18) for s in options])
            for i in range(8):
                for j in range(8):ax.text(j,i,str(mat[i,j]),ha="center",va="center",color="white" if mat[i,j]>26 else "#172935")
            ax.set_title("高频困难的共同出现 · 人数",loc="left");fig.colorbar(im,ax=ax,label="共同选择人数")
            self.save_fig(fig,"21_pain_cooccurrence","困难共现矩阵","n=78；对角线为单项人数；原始共现受边际频率与潜在选项上限影响，不代表因果或强关联。")

            cov=self.tables["pain_coverage"].head(8)
            fig,ax=plt.subplots(figsize=(11,6));ax.plot(cov["rank"],cov.coverage_percent,marker="o",linewidth=2.5,color=COLORS[1])
            for r in cov.itertuples():ax.annotate(f"{r.unique_people_covered}/78",(r.rank,r.coverage_percent),xytext=(0,10),textcoords="offset points",ha="center")
            short_labels=["基础不熟练","算法选择","代码Bug","训练计划","理解题意","算法实现","数学基础","数据结构"]
            ax.set_ylim(0,108);ax.set_xticks(cov["rank"],short_labels);ax.set_ylabel("累计覆盖独立受访者（%）");ax.set_title("前三项困难覆盖多少人？按人去重，而非累计多选票数",loc="left");ax.grid(axis="y",alpha=.2)
            self.save_fig(fig,"22_unique_pain_coverage","痛点累计覆盖（独立人数）","按单项频率降序累加；覆盖只表示至少选择其中一项，不表示解决了其全部困难。")

            test=self.tables["exploratory_tests"].iloc[:4]
            fig,ax=plt.subplots(figsize=(11,5));y=np.arange(len(test))
            ax.errorbar(test.difference_pp,y,xerr=np.vstack([test.difference_pp-test.difference_ci95_low,test.difference_ci95_high-test.difference_pp]),fmt="o",color=COLORS[0],capsize=4)
            ax.axvline(0,color="#777777",linestyle="--");ax.set_yticks(y,[r.comparison.split(" → ")[1] for r in test.itertuples()]);ax.invert_yaxis();ax.set_xlabel("经常使用组 - 偶尔/很少组（百分点；95% Newcombe 区间）");ax.set_title("AI 使用更多，风险是否更高？当前差异仍不确定",loc="left")
            self.save_fig(fig,"23_ai_frequency_uncertainty","AI频率关联及不确定性","n=71（32 vs 39）；Fisher双侧检验；全11项探索性比较统一BH校正；无因果解释。")

            topic=self.tables["open_question_topics"]
            labels=topic.groupby("label")["count"].sum().sort_values(ascending=False).head(10).index
            mat=topic.pivot(index="label",columns="question_id",values="count").loc[labels,[11,24,25]]
            fig,ax=plt.subplots(figsize=(9,7));im=ax.imshow(mat,cmap="Greens",aspect="auto")
            ax.set_yticks(range(len(labels)),labels);ax.set_xticks(range(3),[f"Q{k}\n{int(self.text_status[k].eq('substantive').sum())}份实质反馈" for k in [11,24,25]])
            for i in range(len(labels)):
                for j in range(3):ax.text(j,i,str(mat.iloc[i,j]),ha="center",va="center",color="white" if mat.iloc[i,j]>.55*mat.to_numpy().max() else "#203040")
            ax.set_title("开放题主题：培训改进与助手期待并不相同",loc="left");fig.colorbar(im,ax=ax,label="提及该主题的回答数")
            self.save_fig(fig,"24_open_topic_comparison","三道开放题的主题差异","多标签人工审阅规则编码；跨问题可来自同一人；图为回答数，不是独立人数总和。")

            dur=self.tables["duration_distribution"]
            fig,ax=plt.subplots(figsize=(10,5));ax.bar(dur.duration_band,dur["count"],color=COLORS[0]);ax.set_title("填写时长分布：短时长只触发复核",loc="left");ax.set_ylabel("人数")
            for i,c in enumerate(dur["count"]):ax.text(i,c+.4,str(c),ha="center")
            self.save_fig(fig,"25_data_quality_duration","答卷时长质量检查","n=78；边界采用[60,90)、[90,150)、[150,300)、[300,600]，不因时长单独删除答卷。")

            fig,axes=plt.subplots(1,2,figsize=(15,6.5))
            for ax,k,title in [(axes[0],15,"收到完整代码后"),(axes[1],16,"是否验证 AI 答案")]:
                frame=self.tables["survey_summary"].loc[lambda d:d.question_id.eq(k)]
                y=np.arange(len(frame));ax.barh(y,frame.percent,color=COLORS[1]);ax.set_yticks(y,[textwrap.fill(s,11) for s in frame.option]);ax.invert_yaxis();ax.set_xlim(0,85);ax.set_title(title,loc="left");ax.set_xlabel("AI使用者比例（%）")
                for i,r in enumerate(frame.itertuples()):ax.text(r.percent+1,i,f"{r.count}人",va="center")
            self.save_fig(fig,"26_ai_code_and_verification","代码使用与验证习惯","n=71；自报倾向，不是实际提交日志；“通常验证”不能证明已学会独立实现。")

            frame=self.tables["product_priorities"]
            fig,ax=plt.subplots(figsize=(12,7))
            for i,r in enumerate(frame.itertuples()):
                jitter=(i%3-1)*.065
                ax.scatter(r.demand_percent,r.cost_estimate_1to3+jitter,s=150 if r.priority=="P0" else 80,color=COLORS[0] if r.priority=="P0" else COLORS[2])
                offset=(6,-32) if i==7 else (6,9 if i%2==0 else -16)
                ax.annotate(f"{r.capability}（{r.priority}）",(r.demand_percent,r.cost_estimate_1to3+jitter),xytext=offset,textcoords="offset points",fontsize=10,**({"arrowprops":{"arrowstyle":"-","color":"#aaaaaa"}} if i==7 else {}))
            ax.set_xlim(-2,103);ax.set_ylim(.7,3.45);ax.set_yticks([1,2,3],["低（估计）","中（估计）","高（估计）"]);ax.set_xlabel("问卷中选择相关功能的人数占比（合并功能按人去重）");ax.set_ylabel("实现成本 · 产品判断");ax.set_title("需求与成本：先用小题单验证三个学习环节",loc="left");ax.grid(alpha=.18)
            self.save_fig(fig,"27_demand_cost_matrix","需求频率与估计成本","n=78；Y轴为当前实现范围的相对估计，不是测量值或工期；纵向微偏移仅防遮挡；P0并非单按票数。")

    def gallery(self):
        cards=[]
        for f in self.figures:
            cards.append(f'<article><h2>{html.escape(f["title"])}</h2><a href="charts/{f["name"]}.png"><img loading="lazy" src="charts/{f["name"]}.png" alt="{html.escape(f["title"])}"></a><p>{html.escape(f["note"])}</p><a href="charts/{f["name"]}.svg">下载 SVG</a></article>')
        document='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ACM 新生问卷 · 图表集</title><style>body{max-width:1200px;margin:40px auto;padding:0 20px;font:17px/1.7 system-ui,sans-serif;color:#203040;background:#f6f8fa}h1{font-size:30px}article{background:white;padding:20px;margin:24px 0;border-radius:12px;box-shadow:0 2px 12px #20304012}h2{font-size:22px}img{width:100%;height:auto}a{color:#236c92}p{color:#53616b}</style><h1>ACM 新生培训与 AI 使用 · 图表集</h1><p>78 份答卷；AI 细节题 n=71。所有图来自本地可复现分析。图表为汇总，未包含身份字段或开放原文。</p><p><a href="survey-charts.pdf">下载整套 PDF</a> · <a href="../../docs/research/freshman-survey-analysis-2026.md">研究报告</a> · <a href="../../docs/product/personal-acm-agent-plan.md">产品规划</a></p>'''+"\n".join(cards)+"</html>"
        (self.output/"index.html").write_text(document,encoding="utf-8")
        thumbs=[]
        for f in self.figures:
            im=Image.open(self.charts/f"{f['name']}.png").convert("RGB")
            im.thumbnail((600,440));thumb=Image.new("RGB",(640,480),"#eef2f5");thumb.paste(im,((640-im.width)//2,20));ImageDraw.Draw(thumb).text((15,455),f["name"],fill="#203040");thumbs.append(thumb)
        for page,start in enumerate(range(0,len(thumbs),9),1):
            contact=Image.new("RGB",(1920,1440),"white")
            for j,thumb in enumerate(thumbs[start:start+9]):contact.paste(thumb,((j%3)*640,(j//3)*480))
            contact.save(self.output/f"visual-review-{page}.jpg",quality=90)

    def validate(self):
        assert digest(self.path)==self.original_hash,"Source workbook changed"
        cleaned=pd.read_csv(self.output/"survey_cleaned.csv",keep_default_na=False)
        assert len(cleaned)==self.n and cleaned.analysis_id.is_unique
        assert not set(["序号","提交答卷时间","来源","来源详情","来自IP","所用时间"])&set(cleaned.columns)
        summary=self.tables["survey_summary"]
        for k in set(self.fields)-OPEN:
            frame=summary[summary.question_id.eq(k)]
            expected=int(self.eligible.sum()) if k in AI_DETAILS else self.n
            assert frame.denominator.eq(expected).all()
            if k not in MULTI:assert frame["count"].sum()==expected
            assert frame["count"].le(expected).all()
        assert self.tables["duration_distribution"]["count"].sum()==self.n
        assert self.quality_info["valid"]+self.quality_info["suspected"]+self.quality_info["invalid"]==self.n
        assert self.tables["pain_coverage"].unique_people_covered.iloc[-1]==self.n
        for row in summary.itertuples():
            values=cleaned[f"q{row.question_id:02}"].str.split("┋")
            exported_count=int(values.map(lambda xs:row.option in xs).sum())
            assert exported_count==row.count,("Cleaned data cannot reproduce summary",row.question_id,row.option)
        for row in self.tables["open_question_topics"].itertuples():
            values=cleaned[f"q{row.question_id:02}_topics"].str.split(";")
            assert int(values.map(lambda xs:row.topic in xs).sum())==row.count
        for f in self.figures:
            with Image.open(self.charts/f"{f['name']}.png") as im:im.verify()
        # Scan delivery text for phone, IP and email patterns; source remains outside deliverables.
        patterns=[r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])",r"(?<!\d)1[3-9]\d{9}(?!\d)",r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"]
        reports=[ROOT/"docs/research/freshman-survey-analysis-2026.md",ROOT/"docs/research/next-research-plan.md",ROOT/"docs/product/personal-acm-agent-plan.md"]
        for p in list(self.output.rglob("*"))+reports:
            if p.suffix not in {".csv",".md",".html"}:continue
            text=p.read_text(encoding="utf-8-sig")
            assert not any(re.search(pattern,text) for pattern in patterns),f"Potential identifier in {p.name}"
            if p.suffix==".md" and self.output==ROOT/"artifacts/survey":
                for target in re.findall(r"\]\(([^)]+)\)",text):
                    if "://" not in target and not target.startswith("#"):
                        assert (p.parent/target.split("#")[0]).resolve().exists(),f"Broken link: {target} in {p.name}"
        checks={"source_sha256_unchanged":True,"row_count":self.n,"single_choice_totals_match":True,"ai_denominators_match":True,"duration_bins_sum":True,"summary_and_topics_recomputed_from_cleaned_csv":True,"png_files_decode":len(self.figures),"report_links_resolve":True,"identifier_pattern_scan":"passed (patterns plus manual review; not an anonymity guarantee)","no_raw_open_text_or_system_metadata_exported":True}
        (self.output/"validation.json").write_text(json.dumps(checks,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    def manifest(self):
        data={"source":str(self.path.relative_to(ROOT)) if self.path.is_relative_to(ROOT) else self.path.name,"source_sha256":self.original_hash,"target_matches":[str(p.relative_to(ROOT)) for p in sorted(ROOT.rglob(TARGET))],"sheets":[{"name":name,"rows":len(df),"columns":len(df.columns),"usage":"response analysis" if name==self.sheet else "inventory only"} for name,df in self.sheets.items()],"quality":self.quality_info,"dependencies":{name:importlib.metadata.version(name) for name in ["pandas","numpy","openpyxl","scipy","matplotlib","Pillow"]},"font":Path(self.font_path).name,"random_seed":20260927,"figures":self.figures,"files":[{"file":str(p.relative_to(self.output)),"bytes":p.stat().st_size,"sha256":digest(p)} for p in sorted(self.output.rglob("*")) if p.is_file() and p.name!="manifest.json"]}
        data["analysis_sources"]=[{"file":str(p.relative_to(ROOT)),"sha256":digest(p)} for p in [ROOT/"scripts/analyze_freshman_survey.py",ROOT/"scripts/survey_report.py",ROOT/"prompts/codex_freshman_survey_advanced_analysis_prompt.md",ROOT/"requirements-analysis.txt"]]
        data["python_version"]=sys.version.split()[0]
        data["reports"]=[{"file":str(p.relative_to(ROOT)),"sha256":digest(p)} for p in [ROOT/"docs/research/freshman-survey-analysis-2026.md",ROOT/"docs/research/next-research-plan.md",ROOT/"docs/product/personal-acm-agent-plan.md"]]
        (self.output/"manifest.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input",type=Path)
    parser.add_argument("--output",type=Path,default=ROOT/"artifacts/survey")
    args=parser.parse_args()
    paths=sorted(ROOT.rglob(TARGET)) if args.input is None else [args.input.resolve()]
    if len(paths)!=1:raise SystemExit(f"Found {len(paths)} target files; pass --input after checking duplicates")
    a=Analysis(paths[0],args.output.resolve())
    a.quality();a.describe();a.texts();a.relationships();a.cleaned();a.plots();a.gallery()
    from survey_report import write_reports
    write_reports(a,ROOT)
    a.validate();a.manifest()
    print(json.dumps({"source_unchanged":digest(a.path)==a.original_hash,"quality":a.quality_info,"csv_tables":len(a.tables),"figures":len(a.figures),"output":str(a.output)},ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
