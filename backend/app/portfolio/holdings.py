from sqlalchemy.orm import Session

from app.models.portfolio import Holding

VALID_ASSET_CLASSES = {"equity", "bond", "commodity", "fx", "cash", "other"}


def list_holdings(db: Session) -> list[Holding]:
    return db.query(Holding).order_by(Holding.ticker).all()


def add_holding(db: Session, ticker: str, quantity: float, asset_class: str, region: str) -> Holding:
    holding = Holding(
        ticker=ticker.upper().strip(),
        quantity=quantity,
        asset_class=asset_class if asset_class in VALID_ASSET_CLASSES else "other",
        region=region or "US",
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


def delete_holding(db: Session, holding_id: int) -> bool:
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        return False
    db.delete(holding)
    db.commit()
    return True


def replace_all_holdings(db: Session, holdings: list[dict]) -> list[Holding]:
    db.query(Holding).delete()
    created = []
    for h in holdings:
        holding = Holding(
            ticker=h["ticker"].upper().strip(),
            quantity=float(h["quantity"]),
            asset_class=h.get("asset_class") if h.get("asset_class") in VALID_ASSET_CLASSES else "other",
            region=h.get("region") or "US",
        )
        db.add(holding)
        created.append(holding)
    db.commit()
    for h in created:
        db.refresh(h)
    return created
