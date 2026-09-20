import json
import logging

from sqlalchemy.orm import Session

from app.ai.client import call_proxy
from app.ai.schemas import AlertExplanation, ChatMessage, InvestmentTipsResponse, RegimeReport, TradeGuidanceResponse
from app.models.news import NewsItem
from app.models.regime import RegimeReportRecord
from app.models.signals import SignalSnapshot
from app.models.tips import InvestmentTipsRecord
from app.models.trade_guidance import TradeGuidanceRecord

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
    data = call_proxy(
        "/v1/regime",
        {
            "signal_table_md": format_signal_table(signals),
            "news_excerpts_md": format_news_excerpts(news_items),
            "portfolio_summary_md": portfolio_summary_md,
        },
    )
    report = RegimeReport.model_validate(data)

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
    data = call_proxy(
        "/v1/alert-explanation",
        {
            "rule_id": rule_id,
            "signal_name": signal_name,
            "value": value,
            "severity": severity,
            "news_excerpts_md": format_news_excerpts(news_items, limit=4),
        },
    )
    return AlertExplanation.model_validate(data)


def generate_investment_tips(
    db: Session,
    signals: list[SignalSnapshot],
    portfolio_summary_md: str = "No portfolio configured.",
) -> InvestmentTipsResponse:
    data = call_proxy(
        "/v1/investment-tips",
        {
            "signal_table_md": format_signal_table(signals),
            "portfolio_summary_md": portfolio_summary_md,
        },
    )
    tips = InvestmentTipsResponse.model_validate(data)

    db.add(InvestmentTipsRecord(tips_json=json.dumps([t.model_dump() for t in tips.tips])))
    db.commit()
    return tips


def generate_chat_response(
    question: str,
    history: list[ChatMessage],
    signals: list[SignalSnapshot],
    news_items: list[NewsItem],
    portfolio_summary_md: str = "No portfolio configured.",
) -> str:
    data = call_proxy(
        "/v1/chat",
        {
            "question": question,
            "signal_table_md": format_signal_table(signals),
            "news_excerpts_md": format_news_excerpts(news_items),
            "portfolio_summary_md": portfolio_summary_md,
            "history": [m.model_dump() for m in history],
        },
    )
    return data["answer"]


def generate_trade_guidance(
    db: Session,
    signals: list[SignalSnapshot],
    technical_signals_md: str,
    portfolio_summary_md: str = "No portfolio configured.",
) -> TradeGuidanceResponse:
    data = call_proxy(
        "/v1/trade-guidance",
        {
            "signal_table_md": format_signal_table(signals),
            "technical_signals_md": technical_signals_md,
            "portfolio_summary_md": portfolio_summary_md,
        },
    )
    result = TradeGuidanceResponse.model_validate(data)

    db.add(
        TradeGuidanceRecord(
            calls_json=json.dumps([c.model_dump() for c in result.calls]),
            overall_note=result.overall_note,
        )
    )
    db.commit()
    return result
