import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.macro_series import FredObservation
from app.models.market_data import PriceBar


def load_price_series(db: Session, ticker: str, field: str = "close") -> pd.Series:
    stmt = (
        select(PriceBar.date, getattr(PriceBar, field))
        .where(PriceBar.ticker == ticker)
        .order_by(PriceBar.date)
    )
    rows = db.execute(stmt).all()
    if not rows:
        return pd.Series(dtype=float)
    dates, values = zip(*rows)
    return pd.Series(values, index=pd.to_datetime(list(dates)), name=ticker)


def load_fred_series(db: Session, series_id: str) -> pd.Series:
    stmt = (
        select(FredObservation.date, FredObservation.value)
        .where(FredObservation.series_id == series_id)
        .order_by(FredObservation.date)
    )
    rows = db.execute(stmt).all()
    if not rows:
        return pd.Series(dtype=float)
    dates, values = zip(*rows)
    return pd.Series(values, index=pd.to_datetime(list(dates)), name=series_id)


def rolling_zscore(series: pd.Series, window: int, min_periods: int | None = None) -> pd.Series:
    min_periods = min_periods or max(2, window // 3)
    mean = series.rolling(window, min_periods=min_periods).mean()
    std = series.rolling(window, min_periods=min_periods).std()
    return (series - mean) / std.replace(0, pd.NA)


def latest(series: pd.Series) -> float | None:
    clean = series.dropna()
    if clean.empty:
        return None
    return float(clean.iloc[-1])
