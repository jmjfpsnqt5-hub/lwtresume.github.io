from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent
SOURCE_XLSX = ROOT / "AI短剧搜索结果4.23.xlsx"
OUTPUT_JS = ROOT / "data.js"
PICTURE_DIR = ROOT / "picture"


TOPIC_DEFS = [
    {
        "key": "market",
        "label": "行业爆发",
        "description": "市场扩张、爆款逻辑与出海增量",
        "keywords": [
            "爆发",
            "热度",
            "流量",
            "市场",
            "赛道",
            "出海",
            "收入",
            "增长",
            "规模",
            "爆款",
            "风口",
            "红利",
        ],
        "color": "#7bd3c7",
    },
    {
        "key": "tech",
        "label": "技术生产",
        "description": "模型迭代、制作效率与工业流程重构",
        "keywords": [
            "技术",
            "模型",
            "生成",
            "算力",
            "制作",
            "效率",
            "工具",
            "Sora",
            "可灵",
            "即梦",
            "仿真",
            "工作流",
        ],
        "color": "#91a8ff",
    },
    {
        "key": "governance",
        "label": "治理与版权",
        "description": "盗脸侵权、备案规范与平台治理升级",
        "keywords": [
            "侵权",
            "版权",
            "肖像",
            "声音",
            "监管",
            "治理",
            "备案",
            "下架",
            "规范",
            "合规",
            "黑名单",
            "维权",
            "盗用",
            "偷脸",
            "撞脸",
            "盗脸",
        ],
        "color": "#f39a63",
    },
    {
        "key": "platform",
        "label": "平台博弈",
        "description": "平台分发、榜单竞争与商业分账机制",
        "keywords": [
            "平台",
            "红果",
            "抖音",
            "榜单",
            "分账",
            "投流",
            "剧场",
            "播放量",
            "合作",
            "APP",
            "扶持",
            "账号",
        ],
        "color": "#5cb8ff",
    },
    {
        "key": "creator",
        "label": "创作者生态",
        "description": "从业者转型、岗位变化与创作门槛重估",
        "keywords": [
            "导演",
            "编剧",
            "演员",
            "创作者",
            "从业者",
            "团队",
            "岗位",
            "就业",
            "创作",
            "人才",
            "配音",
            "制作方",
        ],
        "color": "#c7a66b",
    },
    {
        "key": "content",
        "label": "内容风格",
        "description": "题材偏好、叙事爽点与作品案例观察",
        "keywords": [
            "漫剧",
            "真人",
            "题材",
            "玄幻",
            "修仙",
            "叙事",
            "作品",
            "海报",
            "角色",
            "精品",
            "霍去病",
            "菩提临世",
            "斩仙台",
            "大圣",
            "孙悟空",
            "爆款作品",
        ],
        "color": "#d7dce2",
    },
]


ROLE_DEFS = [
    ("平台", ["平台", "红果", "抖音", "快手", "字节", "剧场", "APP"]),
    ("创作者", ["导演", "编剧", "演员", "配音", "主创", "团队", "工作室"]),
    ("监管", ["广电", "监管", "治理", "备案", "下架", "合规", "规范"]),
    ("资本商业", ["收入", "分账", "变现", "融资", "资本", "投流", "商业"]),
    ("受众流量", ["观众", "用户", "流量", "热度", "播放量", "涨粉"]),
    ("技术工具", ["模型", "算力", "生成", "工具", "Sora", "可灵", "即梦"]),
]


KEYPHRASES = [
    "AI短剧",
    "微短剧",
    "AI漫剧",
    "AI真人短剧",
    "AI视频",
    "人工智能",
    "爆款",
    "流量",
    "出海",
    "红果短剧",
    "抖音",
    "快手",
    "广电总局",
    "备案",
    "监管",
    "治理",
    "版权",
    "侵权",
    "盗脸",
    "肖像权",
    "声音侵权",
    "演员",
    "编剧",
    "导演",
    "平台",
    "分账",
    "投流",
    "播放量",
    "热度",
    "赛道",
    "爆发",
    "市场",
    "风口",
    "技术",
    "算力",
    "模型",
    "Sora",
    "可灵AI",
    "即梦AI",
    "内容生产",
    "工作流",
    "仿真人",
    "角色一致性",
    "精品化",
    "洗牌",
    "工业化",
    "创作者",
    "配音演员",
    "肖像",
    "声音",
    "合规",
    "风险",
    "共治",
    "平台治理",
    "短剧出海",
    "高质量发展",
]


POSITIVE_WORDS = [
    "爆发",
    "突破",
    "增长",
    "升温",
    "走红",
    "热度",
    "利好",
    "成熟",
    "升级",
    "精品",
    "高质量",
    "创新",
    "赋能",
    "稳定",
    "跃升",
    "改善",
    "有序",
    "繁荣",
    "成功",
]


NEGATIVE_WORDS = [
    "侵权",
    "盗脸",
    "乱象",
    "风险",
    "争议",
    "下架",
    "黑名单",
    "粗制滥造",
    "偷脸",
    "野蛮生长",
    "灰色",
    "焦虑",
    "危机",
    "投诉",
    "违规",
    "偏差",
    "困境",
    "挤压",
    "缩水",
]


def count_hits(text: str, words: list[str]) -> int:
    return sum(text.count(word) for word in words)


def choose_topic(text: str) -> tuple[str, dict[str, int]]:
    scores = {topic["key"]: count_hits(text, topic["keywords"]) for topic in TOPIC_DEFS}
    best_key, best_score = max(scores.items(), key=lambda item: item[1])
    if best_score == 0:
        best_key = "content"
    return best_key, scores


def choose_sentiment(text: str) -> tuple[str, int]:
    pos = count_hits(text, POSITIVE_WORDS)
    neg = count_hits(text, NEGATIVE_WORDS)
    score = pos - neg
    if score >= 2:
        return "positive", score
    if score <= -2:
        return "negative", score
    return "neutral", score


def month_range(months: list[pd.Period]) -> list[str]:
    if not months:
        return []
    cursor = min(months)
    end = max(months)
    ordered = []
    while cursor <= end:
        ordered.append(str(cursor))
        cursor += 1
    return ordered


def build_network(article_keywords: list[list[str]], keyword_counts: Counter[str]) -> dict[str, list[dict]]:
    top_keywords = [name for name, _ in keyword_counts.most_common(14)]
    nodes = []
    for word in top_keywords:
        nodes.append(
            {
                "id": word,
                "label": word,
                "value": keyword_counts[word],
            }
        )

    pair_counter: Counter[tuple[str, str]] = Counter()
    for words in article_keywords:
        hits = [word for word in top_keywords if word in words]
        for i in range(len(hits)):
            for j in range(i + 1, len(hits)):
                pair = tuple(sorted((hits[i], hits[j])))
                pair_counter[pair] += 1

    links = []
    for (source, target), value in pair_counter.most_common(24):
        if value < 8:
            continue
        links.append({"source": source, "target": target, "value": value})

    return {"nodes": nodes, "links": links}


def main() -> None:
    df = pd.read_excel(SOURCE_XLSX).copy()
    df["发布时间"] = pd.to_datetime(df["发布时间"])
    df["标题"] = df["标题"].fillna("").astype(str).str.strip()
    df["正文内容"] = df["正文内容"].fillna("").astype(str).str.strip()
    df["链接"] = df["链接"].fillna("").astype(str)
    df["full_text"] = df["标题"] + " " + df["正文内容"]
    df["year"] = df["发布时间"].dt.year
    df["month"] = df["发布时间"].dt.to_period("M")
    df["weekday"] = df["发布时间"].dt.day_name()

    topic_lookup = {item["key"]: item for item in TOPIC_DEFS}
    topic_assignments = []
    topic_scores_per_row = []
    sentiment_labels = []
    sentiment_scores = []
    article_keywords = []
    keyword_counter: Counter[str] = Counter()

    for _, row in df.iterrows():
        text = row["full_text"]
        topic_key, topic_scores = choose_topic(text)
        topic_assignments.append(topic_key)
        topic_scores_per_row.append(topic_scores)

        sentiment_label, sentiment_score = choose_sentiment(text)
        sentiment_labels.append(sentiment_label)
        sentiment_scores.append(sentiment_score)

        matched_keywords = [phrase for phrase in KEYPHRASES if phrase in text]
        article_keywords.append(matched_keywords)
        keyword_counter.update(set(matched_keywords))

    df["topic_key"] = topic_assignments
    df["sentiment"] = sentiment_labels
    df["sentiment_score"] = sentiment_scores

    month_labels = month_range(list(df["month"]))
    month_counts = df.groupby("month").size().to_dict()
    monthly_series = [{"month": month, "value": int(month_counts.get(pd.Period(month), 0))} for month in month_labels]
    recent_months = month_labels[-18:]

    topic_summary = []
    for topic in TOPIC_DEFS:
        topic_df = df[df["topic_key"] == topic["key"]]
        sample_titles = topic_df["标题"].head(3).tolist()
        topic_summary.append(
            {
                "key": topic["key"],
                "label": topic["label"],
                "description": topic["description"],
                "value": int(len(topic_df)),
                "color": topic["color"],
                "samples": sample_titles,
            }
        )

    topic_summary.sort(key=lambda item: item["value"], reverse=True)

    trend_topics = [item["key"] for item in topic_summary[:4]]
    trend_series = []
    for key in trend_topics:
        counts = df[df["topic_key"] == key].groupby("month").size().to_dict()
        trend_series.append(
            {
                "key": key,
                "label": topic_lookup[key]["label"],
                "color": topic_lookup[key]["color"],
                "values": [int(counts.get(pd.Period(month), 0)) for month in recent_months],
            }
        )

    sentiment_order = ["positive", "neutral", "negative"]
    sentiment_labels_map = {"positive": "正向", "neutral": "中性", "negative": "负向"}
    sentiment_colors = {"positive": "#7bd3c7", "neutral": "#8e96a3", "negative": "#f39a63"}
    sentiment_counts = df["sentiment"].value_counts().to_dict()
    sentiment_summary = [
        {
            "key": key,
            "label": sentiment_labels_map[key],
            "value": int(sentiment_counts.get(key, 0)),
            "color": sentiment_colors[key],
        }
        for key in sentiment_order
    ]

    role_summary = []
    for label, words in ROLE_DEFS:
        role_counts = {key: 0 for key in sentiment_order}
        mention_total = 0
        for _, row in df.iterrows():
            text = row["full_text"]
            if any(word in text for word in words):
                mention_total += 1
                role_counts[row["sentiment"]] += 1
        role_summary.append(
            {
                "label": label,
                "value": int(mention_total),
                "breakdown": [int(role_counts[key]) for key in sentiment_order],
            }
        )

    role_summary.sort(key=lambda item: item["value"], reverse=True)

    keyword_stream = [
        {
            "label": word,
            "value": int(count),
        }
        for word, count in keyword_counter.most_common(36)
    ]

    network = build_network(article_keywords, keyword_counter)

    year_counts = df["year"].value_counts().sort_index().to_dict()
    peak_month = max(monthly_series, key=lambda item: item["value"])
    latest = df.sort_values("发布时间", ascending=False).head(8)

    recent_articles = []
    for _, row in latest.iterrows():
        excerpt = re.sub(r"\s+", " ", row["正文内容"])[:120]
        recent_articles.append(
            {
                "title": row["标题"],
                "date": row["发布时间"].strftime("%Y-%m-%d"),
                "url": row["链接"],
                "excerpt": excerpt,
                "topic": topic_lookup[row["topic_key"]]["label"],
                "sentiment": sentiment_labels_map[row["sentiment"]],
            }
        )

    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekday_map = {
        "Monday": "周一",
        "Tuesday": "周二",
        "Wednesday": "周三",
        "Thursday": "周四",
        "Friday": "周五",
        "Saturday": "周六",
        "Sunday": "周日",
    }
    weekday_counts = df["weekday"].value_counts().to_dict()
    weekday_summary = [{"label": weekday_map[name], "value": int(weekday_counts.get(name, 0))} for name in weekday_order]

    year_summary = [{"label": str(year), "value": int(year_counts[year])} for year in sorted(year_counts.keys())]

    latest_ratio = round((year_counts.get(2025, 0) + year_counts.get(2026, 0)) / len(df) * 100, 1)

    quote_lines = [
        "技术把制作门槛打薄，但没有把爆款标准变轻。",
        "AI短剧真正被讨论的，不只是速度，而是速度之后的内容秩序。",
        "当备案、侵权与平台分发同时升温，赛道开始从喧闹走向分层。",
    ]

    gallery_images = [f"picture/{path.name}" for path in sorted(PICTURE_DIR.glob("*")) if path.is_file()]

    payload = {
        "meta": {
            "title": "AI短剧 · 澎湃新闻叙事切片",
            "subtitle": "539篇澎湃新闻相关报道的时间、议题与情绪流向",
            "credit": "李婉婷整理",
            "dateRange": {
                "start": df["发布时间"].min().strftime("%Y-%m-%d"),
                "end": df["发布时间"].max().strftime("%Y-%m-%d"),
            },
        },
        "overview": {
            "total": int(len(df)),
            "latestRatio": latest_ratio,
            "peakMonth": peak_month["month"],
            "peakMonthValue": peak_month["value"],
            "averageLength": int(df["正文内容"].str.len().mean()),
            "yearSummary": year_summary,
            "weekdaySummary": weekday_summary,
            "monthlySeries": monthly_series,
            "recentMonths": recent_months,
        },
        "keywords": {
            "stream": keyword_stream,
        },
        "topics": {
            "summary": topic_summary,
            "trendMonths": recent_months,
            "trendSeries": trend_series,
        },
        "sentiment": {
            "summary": sentiment_summary,
        },
        "roles": {
            "summary": role_summary,
            "labels": [sentiment_labels_map[key] for key in sentiment_order],
            "colors": [sentiment_colors[key] for key in sentiment_order],
        },
        "network": network,
        "recentArticles": recent_articles,
        "quotes": quote_lines,
        "galleryImages": gallery_images,
    }

    OUTPUT_JS.write_text(
        "window.NEWS_ANALYSIS = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )

    print(f"Wrote {OUTPUT_JS.name} with {len(df)} records.")


if __name__ == "__main__":
    main()
