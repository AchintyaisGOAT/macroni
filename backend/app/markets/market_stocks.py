from sqlalchemy.orm import Session

from app.markets.constituents import CONSTITUENTS
from app.portfolio.exposures import ensure_price_history
from app.portfolio.technical import compute_technical_signal
from app.signals.data_access import load_price_series


def get_market_stocks(db: Session, region_code: str) -> list[dict] | None:
    stocks = CONSTITUENTS.get(region_code.upper())
    if stocks is None:
        return None

    results = []
    for stock in stocks:
        ensure_price_history(db, stock.ticker)
        prices = load_price_series(db, stock.ticker).dropna()
        if prices.empty:
            continue

        last_price = float(prices.iloc[-1])
        change_pct = None
        if prices.shape[0] > 1:
            change_pct = float(prices.iloc[-1] / prices.iloc[-2] - 1) * 100

        signal = compute_technical_signal(prices)

        results.append(
            {
                "ticker": stock.ticker,
                "name": stock.name,
                "price": last_price,
                "change_pct": change_pct,
                "zone": signal["zone"] if signal else None,
                "score": signal["score"] if signal else None,
            }
        )
    return results
