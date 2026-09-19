import logging

import requests
from apscheduler.schedulers.background import BackgroundScheduler

from app.ai.interpreter import generate_regime_report
from app.alerts.explainer import explain_new_alerts
from app.alerts.rule_engine import evaluate_rules
from app.config import settings
from app.data_sources.fred_client import refresh_all_series
from app.data_sources.market_yfinance import TRACKED_TICKERS, refresh_tickers
from app.data_sources.news_rss import refresh_all_feeds
from app.db import SessionLocal
from app.models.news import NewsItem
from app.models.portfolio import Holding
from app.portfolio.exposures import compute_portfolio_exposures, format_exposure_summary_md
from app.signals.engine import compute_and_store_signals, latest_snapshot

logger = logging.getLogger("app.scheduler")

# Last regime generation outcome, surfaced via /api/status so a silent scheduled
# failure (e.g. billing, rate limit) is visible in the UI without digging through logs.
_last_regime_status: dict = {"status": "never_run", "reason": None}


def get_last_regime_status() -> dict:
    return _last_regime_status


def _portfolio_tickers(db) -> list[str]:
    return [h.ticker for h in db.query(Holding.ticker).distinct()]


def run_signal_and_alert_pipeline() -> None:
    db = SessionLocal()
    try:
        compute_and_store_signals(db)
        fired = evaluate_rules(db)
        if fired:
            logger.info("alerts fired: %s", [e.rule_id for e in fired])
            explain_new_alerts(db, fired)
    except Exception:
        logger.exception("signal/alert pipeline failed")
    finally:
        db.close()


def refresh_market_data() -> None:
    db = SessionLocal()
    try:
        tickers = list(dict.fromkeys(TRACKED_TICKERS + _portfolio_tickers(db)))
        results = refresh_tickers(db, tickers)
        logger.info("market data refresh: %s", results)
    except Exception:
        logger.exception("market data refresh failed")
    finally:
        db.close()
    run_signal_and_alert_pipeline()


def refresh_fred_data() -> None:
    if not settings.has_fred_key:
        logger.info("FRED_API_KEY not configured; skipping macro data refresh")
        return
    db = SessionLocal()
    try:
        results = refresh_all_series(db)
        logger.info("FRED refresh: %s", results)
    except Exception:
        logger.exception("FRED data refresh failed")
    finally:
        db.close()
    run_signal_and_alert_pipeline()


def refresh_news() -> None:
    db = SessionLocal()
    try:
        results = refresh_all_feeds(db)
        logger.info("news refresh: %s", results)
    except Exception:
        logger.exception("news refresh failed")
    finally:
        db.close()


def refresh_regime_report() -> dict:
    global _last_regime_status

    db = SessionLocal()
    try:
        signals = latest_snapshot(db)
        news_items = db.query(NewsItem).order_by(NewsItem.published_at.desc()).limit(10).all()
        exposure = compute_portfolio_exposures(db)
        portfolio_summary_md = format_exposure_summary_md(exposure)
        generate_regime_report(db, signals, news_items, portfolio_summary_md)
        logger.info("regime report generated")
        _last_regime_status = {"status": "ok", "reason": None}
    except requests.HTTPError as exc:
        logger.exception("regime report generation failed (proxy returned an error)")
        try:
            message = exc.response.json().get("detail", exc.response.text)
        except Exception:
            message = str(exc)
        if exc.response is not None and exc.response.status_code == 429:
            message = "Daily AI usage cap reached - try again tomorrow."
        _last_regime_status = {"status": "error", "reason": message}
    except requests.RequestException as exc:
        logger.exception("regime report generation failed (could not reach AI proxy)")
        _last_regime_status = {"status": "error", "reason": f"Could not reach the AI service: {exc}"}
    except Exception as exc:
        logger.exception("regime report generation failed")
        _last_regime_status = {"status": "error", "reason": str(exc)}
    finally:
        db.close()

    return _last_regime_status


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(refresh_market_data, "interval", minutes=settings.market_refresh_minutes, id="market_refresh")
    scheduler.add_job(refresh_fred_data, "interval", hours=settings.fred_refresh_hours, id="fred_refresh")
    scheduler.add_job(refresh_news, "interval", minutes=settings.news_refresh_minutes, id="news_refresh")
    scheduler.add_job(
        refresh_regime_report, "interval", minutes=settings.regime_report_minutes, id="regime_report"
    )
    return scheduler


def run_startup_refresh() -> None:
    """Kick off an immediate refresh at app startup so the dashboard isn't empty."""
    refresh_market_data()
    refresh_fred_data()
    refresh_news()
    refresh_regime_report()
