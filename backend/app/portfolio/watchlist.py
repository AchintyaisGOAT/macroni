from sqlalchemy.orm import Session

from app.models.watchlist import WatchlistItem


def list_watchlist(db: Session) -> list[WatchlistItem]:
    return db.query(WatchlistItem).order_by(WatchlistItem.added_at.desc()).all()


def add_to_watchlist(db: Session, ticker: str, name: str = "", region: str = "") -> WatchlistItem:
    ticker = ticker.upper().strip()
    existing = db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker).first()
    if existing:
        return existing
    item = WatchlistItem(ticker=ticker, name=name, region=region)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def remove_from_watchlist(db: Session, item_id: int) -> bool:
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True
