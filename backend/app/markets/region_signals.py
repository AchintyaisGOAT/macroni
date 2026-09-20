import pandas as pd
from sqlalchemy.orm import Session

from app.data_sources.market_yfinance import refresh_ticker
from app.markets.regions import REGIONS, Region
from app.signals.data_access import load_price_series, rolling_zscore


def _ensure_history(db: Session, ticker: str) -> None:
    series = load_price_series(db, ticker)
    if series.empty:
        try:
            refresh_ticker(db, ticker)
        except Exception:
            pass


def _realized_vol_percentile(returns: pd.Series, window: int = 252) -> float | None:
    """Annualized 20-day realized vol, expressed as a percentile of its own trailing
    year - used for regions without a dedicated implied-vol index (most of them).
    """
    vol = (returns.rolling(20).std() * (252**0.5)).dropna()
    if vol.shape[0] < 60:
        return None
    recent = vol.tail(window)
    latest = recent.iloc[-1]
    return float((recent < latest).mean() * 100)


def compute_region_signal(db: Session, region: Region) -> dict | None:
    _ensure_history(db, region.index_ticker)
    prices = load_price_series(db, region.index_ticker).dropna()
    if prices.shape[0] < 60:
        return None

    last_price = float(prices.iloc[-1])
    returns = prices.pct_change().dropna()

    return_1m_pct = None
    if prices.shape[0] > 21:
        return_1m_pct = float(prices.iloc[-1] / prices.iloc[-22] - 1) * 100

    momentum_series = rolling_zscore(prices, window=20).dropna()
    momentum_zscore = float(momentum_series.iloc[-1]) if not momentum_series.empty else None

    vol_value = None
    vol_label = None
    vol_source = None
    if region.vol_ticker:
        _ensure_history(db, region.vol_ticker)
        vol_series = load_price_series(db, region.vol_ticker).dropna()
        if not vol_series.empty:
            vol_value = float(vol_series.iloc[-1])
            vol_source = "implied"
            vol_z = rolling_zscore(vol_series, window=252).dropna()
            if not vol_z.empty:
                z = vol_z.iloc[-1]
                vol_label = "elevated" if z > 1 else ("subdued" if z < -1 else "normal")
    if vol_value is None:
        pct = _realized_vol_percentile(returns)
        if pct is not None:
            vol_value = pct
            vol_source = "realized_percentile"
            vol_label = "elevated" if pct > 80 else ("subdued" if pct < 20 else "normal")

    return {
        "code": region.code,
        "name": region.name,
        "index_ticker": region.index_ticker,
        "index_name": region.index_name,
        "price": last_price,
        "return_1m_pct": return_1m_pct,
        "momentum_zscore": momentum_zscore,
        "volatility_value": vol_value,
        "volatility_label": vol_label,
        "volatility_source": vol_source,
    }


def compute_all_region_signals(db: Session) -> list[dict]:
    results = []
    for region in REGIONS:
        signal = compute_region_signal(db, region)
        if signal is not None:
            results.append(signal)
    return results
