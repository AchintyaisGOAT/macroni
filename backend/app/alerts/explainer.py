import logging

from sqlalchemy.orm import Session

from app.ai.client import GeminiNotConfigured
from app.ai.interpreter import generate_alert_explanation
from app.models.alerts import AlertEvent
from app.models.news import NewsItem

logger = logging.getLogger("app.alerts.explainer")


def explain_new_alerts(db: Session, events: list[AlertEvent]) -> None:
    if not events:
        return
    recent_news = db.query(NewsItem).order_by(NewsItem.published_at.desc()).limit(6).all()

    for event in events:
        try:
            result = generate_alert_explanation(
                rule_id=event.rule_id,
                signal_name=event.signal_name,
                value=event.value,
                severity=event.severity,
                news_items=recent_news,
            )
            event.explanation = result.explanation
        except GeminiNotConfigured:
            event.explanation = "AI explanation unavailable: GEMINI_API_KEY is not configured."
        except Exception:
            logger.exception("failed to generate AI explanation for alert %s", event.rule_id)
            event.explanation = "AI explanation failed to generate; see logs."
    db.commit()
