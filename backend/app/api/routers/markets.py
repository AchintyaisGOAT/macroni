from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.markets.hours import get_all_exchange_statuses
from app.markets.region_signals import compute_all_region_signals

router = APIRouter(prefix="/api/markets", tags=["markets"])


@router.get("/hours")
def get_market_hours():
    return get_all_exchange_statuses()


@router.get("/regions")
def get_region_signals(db: Session = Depends(get_db)):
    return compute_all_region_signals(db)
