import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.data_sources.market_search import search_tickers
from app.db import get_db
from app.markets.live_quotes import get_live_quotes
from app.portfolio.csv_import import parse_holdings_csv
from app.portfolio.exposures import compute_portfolio_exposures
from app.portfolio.holdings import add_holding, delete_holding, list_holdings, replace_all_holdings

logger = logging.getLogger("app.api.portfolio")

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


class HoldingIn(BaseModel):
    ticker: str
    quantity: float
    asset_class: str = "equity"
    region: str = "US"


class HoldingOut(BaseModel):
    id: int
    ticker: str
    quantity: float
    asset_class: str
    region: str


@router.get("/holdings", response_model=list[HoldingOut])
def get_holdings(db: Session = Depends(get_db)):
    return [
        HoldingOut(id=h.id, ticker=h.ticker, quantity=h.quantity, asset_class=h.asset_class, region=h.region)
        for h in list_holdings(db)
    ]


@router.post("/holdings", response_model=HoldingOut)
def post_holding(payload: HoldingIn, db: Session = Depends(get_db)):
    h = add_holding(db, payload.ticker, payload.quantity, payload.asset_class, payload.region)
    return HoldingOut(id=h.id, ticker=h.ticker, quantity=h.quantity, asset_class=h.asset_class, region=h.region)


@router.delete("/holdings/{holding_id}")
def delete_holding_endpoint(holding_id: int, db: Session = Depends(get_db)):
    if not delete_holding(db, holding_id):
        raise HTTPException(status_code=404, detail="holding not found")
    return {"status": "deleted"}


@router.post("/import")
async def import_holdings_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        rows = parse_holdings_csv(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    holdings = replace_all_holdings(db, rows)
    return {"status": "ok", "imported": len(holdings)}


@router.get("/exposures")
def get_exposures(db: Session = Depends(get_db)):
    return compute_portfolio_exposures(db)


@router.get("/live-quotes")
def get_portfolio_live_quotes(db: Session = Depends(get_db)):
    tickers = [h.ticker for h in list_holdings(db)]
    return get_live_quotes(tickers)


@router.get("/search")
def search_stocks(q: str, limit: int = 8):
    if not q or not q.strip():
        return []
    try:
        return search_tickers(q, max_results=limit)
    except Exception:
        logger.exception("ticker search failed for query=%r", q)
        return []
