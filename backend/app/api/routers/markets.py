from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.data_sources.market_search import search_tickers
from app.db import get_db
from app.markets.constituents import CONSTITUENTS
from app.markets.hours import get_all_exchange_statuses
from app.markets.live_quotes import get_live_quotes
from app.markets.market_stocks import get_market_stocks
from app.markets.region_signals import compute_all_region_signals
from app.markets.regions import REGIONS

router = APIRouter(prefix="/api/markets", tags=["markets"])


@router.get("/hours")
def get_market_hours():
    return get_all_exchange_statuses()


@router.get("/regions")
def get_region_signals(db: Session = Depends(get_db)):
    return compute_all_region_signals(db)


@router.get("/{region_code}/stocks")
def get_stocks_for_market(region_code: str, db: Session = Depends(get_db)):
    stocks = get_market_stocks(db, region_code)
    if stocks is None:
        raise HTTPException(status_code=404, detail=f"unknown market '{region_code}'")
    return stocks


@router.get("/{region_code}/live-quotes")
def get_live_quotes_for_market(region_code: str):
    stocks = CONSTITUENTS.get(region_code.upper())
    if stocks is None:
        raise HTTPException(status_code=404, detail=f"unknown market '{region_code}'")
    return get_live_quotes([s.ticker for s in stocks])


@router.get("/{region_code}/search")
def search_stocks_in_market(region_code: str, q: str, limit: int = 15):
    if region_code.upper() not in {r.code for r in REGIONS}:
        raise HTTPException(status_code=404, detail=f"unknown market '{region_code}'")
    if not q or not q.strip():
        return []
    return search_tickers(q, max_results=limit, region_code=region_code)
