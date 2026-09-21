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
from app.portfolio.technical import compute_technical_signals_for_tickers, format_technical_signals_md
from app.portfolio.watchlist import add_to_watchlist, list_watchlist, remove_from_watchlist
from app.signals.engine import latest_snapshot

logger = logging.getLogger("app.api.watchlist")

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])

DISCLAIMER = (
    "Generated from quantitative technical signals and macro data only. Not registered investment "
    "advice, not personalized to your full financial situation, and not a guarantee of future "
    "performance. You are solely responsible for your own trading decisions."
)


class WatchlistItemIn(BaseModel):
    ticker: str
    name: str = ""
    region: str = ""


class WatchlistItemOut(BaseModel):
    id: int
    ticker: str
    name: str
    region: str
    price: float | None = None
    rsi: float | None = None
    momentum_zscore: float | None = None
    score: float | None = None
    zone: str | None = None


class GuidanceOut(BaseModel):
    calls: list[TradeCall]
    overall_note: str
    disclaimer: str
    created_at: str | None


@router.get("", response_model=list[WatchlistItemOut])
def get_watchlist(db: Session = Depends(get_db)):
    items = list_watchlist(db)
    signals_by_ticker = {
        s["ticker"]: s for s in compute_technical_signals_for_tickers(db, [i.ticker for i in items])
    }
    out = []
    for item in items:
        signal = signals_by_ticker.get(item.ticker)
        out.append(
            WatchlistItemOut(
                id=item.id,
                ticker=item.ticker,
                name=item.name,
                region=item.region,
                price=signal["price"] if signal else None,
                rsi=signal["rsi"] if signal else None,
                momentum_zscore=signal["momentum_zscore"] if signal else None,
                score=signal["score"] if signal else None,
                zone=signal["zone"] if signal else None,
            )
        )
    return out


@router.post("", response_model=WatchlistItemOut)
def post_watchlist_item(payload: WatchlistItemIn, db: Session = Depends(get_db)):
    item = add_to_watchlist(db, payload.ticker, payload.name, payload.region)
    return WatchlistItemOut(id=item.id, ticker=item.ticker, name=item.name, region=item.region)


@router.delete("/{item_id}")
def delete_watchlist_item(item_id: int, db: Session = Depends(get_db)):
    if not remove_from_watchlist(db, item_id):
        raise HTTPException(status_code=404, detail="watchlist item not found")
    return {"status": "deleted"}


@router.get("/guidance", response_model=GuidanceOut)
def get_watchlist_guidance(db: Session = Depends(get_db)):
    row = (
        db.query(TradeGuidanceRecord)
        .filter(TradeGuidanceRecord.scope == "watchlist")
        .order_by(TradeGuidanceRecord.created_at.desc())
        .first()
    )
    if not row:
        return GuidanceOut(calls=[], overall_note="", disclaimer=DISCLAIMER, created_at=None)
    return GuidanceOut(
        calls=json.loads(row.calls_json),
        overall_note=row.overall_note,
        disclaimer=DISCLAIMER,
        created_at=row.created_at.isoformat(),
    )


@router.post("/guidance/refresh")
def post_watchlist_guidance_refresh(db: Session = Depends(get_db)):
    items = list_watchlist(db)
    technical_signals = compute_technical_signals_for_tickers(db, [i.ticker for i in items])
    if not technical_signals:
        raise HTTPException(
            status_code=400,
            detail="No watchlist tickers with enough price history yet - add some stocks first.",
        )

    signals = latest_snapshot(db)
    technical_signals_md = format_technical_signals_md(
        technical_signals, empty_message="No technical signals available for your watchlist yet."
    )

    try:
        generate_trade_guidance(
            db, signals, technical_signals_md, "No portfolio context - these are watchlist stocks, not owned holdings.",
            scope="watchlist",
        )
    except requests.HTTPError as exc:
        try:
            message = exc.response.json().get("detail", exc.response.text)
        except Exception:
            message = str(exc)
        if exc.response is not None and exc.response.status_code == 429:
            message = "Daily AI usage cap reached - try again tomorrow."
        logger.exception("watchlist guidance generation failed (proxy returned an error)")
        raise HTTPException(status_code=502, detail=message) from exc
    except requests.RequestException as exc:
        logger.exception("watchlist guidance generation failed (could not reach AI proxy)")
        raise HTTPException(status_code=502, detail=f"could not reach the AI service: {exc}") from exc

    return {"status": "ok"}
