import json
import logging

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.interpreter import generate_trade_guidance
from app.ai.schemas import TradeCall
from app.db import get_db
from app.models.trade_guidance import TradeGuidanceRecord
from app.portfolio.exposures import compute_portfolio_exposures, format_exposure_summary_md
from app.portfolio.technical import compute_portfolio_technical_signals, format_technical_signals_md
from app.signals.engine import latest_snapshot

logger = logging.getLogger("app.api.trade_guidance")

router = APIRouter(prefix="/api/trade-guidance", tags=["trade-guidance"])

# Fixed, non-AI-generated disclaimer shown alongside every response - we don't rely
# on the model to remember to add this, and it applies regardless of what it says.
DISCLAIMER = (
    "Generated from quantitative technical signals and macro data only. Not registered investment "
    "advice, not personalized to your full financial situation, and not a guarantee of future "
    "performance. You are solely responsible for your own trading decisions."
)


class TradeGuidanceOut(BaseModel):
    calls: list[TradeCall]
    overall_note: str
    disclaimer: str
    created_at: str | None


@router.get("", response_model=TradeGuidanceOut)
def get_trade_guidance(db: Session = Depends(get_db)):
    row = (
        db.query(TradeGuidanceRecord)
        .filter(TradeGuidanceRecord.scope == "portfolio")
        .order_by(TradeGuidanceRecord.created_at.desc())
        .first()
    )
    if not row:
        return TradeGuidanceOut(calls=[], overall_note="", disclaimer=DISCLAIMER, created_at=None)
    return TradeGuidanceOut(
        calls=json.loads(row.calls_json),
        overall_note=row.overall_note,
        disclaimer=DISCLAIMER,
        created_at=row.created_at.isoformat(),
    )


@router.get("/technical-signals")
def get_technical_signals(db: Session = Depends(get_db)):
    return compute_portfolio_technical_signals(db)


@router.post("/refresh")
def post_trade_guidance_refresh(db: Session = Depends(get_db)):
    technical_signals = compute_portfolio_technical_signals(db)
    if not technical_signals:
        raise HTTPException(
            status_code=400,
            detail="No equity holdings with enough price history yet - add holdings or sync your broker first.",
        )

    signals = latest_snapshot(db)
    exposure = compute_portfolio_exposures(db)
    portfolio_summary_md = format_exposure_summary_md(exposure)
    technical_signals_md = format_technical_signals_md(technical_signals)

    try:
        generate_trade_guidance(db, signals, technical_signals_md, portfolio_summary_md, scope="portfolio")
    except requests.HTTPError as exc:
        try:
            message = exc.response.json().get("detail", exc.response.text)
        except Exception:
            message = str(exc)
        if exc.response is not None and exc.response.status_code == 429:
            message = "Daily AI usage cap reached - try again tomorrow."
        logger.exception("trade guidance generation failed (proxy returned an error)")
        raise HTTPException(status_code=502, detail=message) from exc
    except requests.RequestException as exc:
        logger.exception("trade guidance generation failed (could not reach AI proxy)")
        raise HTTPException(status_code=502, detail=f"could not reach the AI service: {exc}") from exc

    return {"status": "ok"}
