import json
import logging

from google.genai import types
from sqlalchemy.orm import Session

from app.ai.client import get_client
from app.ai.prompts import (
    ALERT_SYSTEM_PROMPT,
    REGIME_SYSTEM_PROMPT,
    build_alert_user_prompt,
    build_regime_user_prompt,
)
from app.ai.schemas import AlertExplanation, RegimeReport
from app.config import settings
from app.models.news import NewsItem
from app.models.regime import RegimeReportRecord
from app.models.signals import SignalSnapshot

logger = logging.getLogger("app.ai.interpreter")


def format_signal_table(signals: list[SignalSnapshot]) -> str:
    if not signals:
        return "No signals available yet."
    lines = ["| Signal | Value | Z-score | Percentile | Label |", "|---|---|---|---|---|"]
    for s in signals:
        z = f"{s.zscore:.2f}" if s.zscore is not None else "-"
        p = f"{s.percentile:.2f}" if s.percentile is not None else "-"
        lines.append(f"| {s.name} | {s.value:.4f} | {z} | {p} | {s.label} |")
    return "\n".join(lines)


def format_news_excerpts(news_items: list[NewsItem], limit: int = 8) -> str:
    if not news_items:
        return "No recent news available."
    lines = []
    for item in news_items[:limit]:
        published = item.published_at.strftime("%Y-%m-%d") if item.published_at else "unknown date"
        summary = (item.summary or "").strip()
        lines.append(f"- [{item.source}, {published}] {item.title}: {summary[:300]}")
    return "\n".join(lines)


def generate_regime_report(
    db: Session,
    signals: list[SignalSnapshot],
    news_items: list[NewsItem],
    portfolio_summary_md: str = "No portfolio configured.",
) -> RegimeReport:
    client = get_client()
    signal_table_md = format_signal_table(signals)
    news_excerpts_md = format_news_excerpts(news_items)
    user_prompt = build_regime_user_prompt(signal_table_md, news_excerpts_md, portfolio_summary_md)

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=REGIME_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=RegimeReport,
        ),
    )
    report = response.parsed
    if report is None:
        raise ValueError(f"Gemini did not return a schema-conforming response: {response.text!r}")

    db.add(
        RegimeReportRecord(
            regime_label=report.regime_label,
            narrative=report.narrative,
            risk_flags_json=json.dumps([f.model_dump() for f in report.risk_flags]),
            portfolio_commentary=report.portfolio_commentary,
        )
    )
    db.commit()
    return report


def generate_alert_explanation(
    rule_id: str,
    signal_name: str,
    value: float,
    severity: str,
    news_items: list[NewsItem],
) -> AlertExplanation:
    client = get_client()
    news_excerpts_md = format_news_excerpts(news_items, limit=4)
    user_prompt = build_alert_user_prompt(rule_id, signal_name, value, severity, news_excerpts_md)

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=ALERT_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=AlertExplanation,
        ),
    )
    if response.parsed is None:
        raise ValueError(f"Gemini did not return a schema-conforming response: {response.text!r}")
    return response.parsed
