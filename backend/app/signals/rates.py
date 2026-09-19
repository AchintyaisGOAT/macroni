from sqlalchemy.orm import Session

from app.signals.data_access import latest, load_fred_series, rolling_zscore
from app.signals.types import SignalResult


def yield_curve_slope(db: Session) -> SignalResult | None:
    series = load_fred_series(db, "T10Y2Y")
    value = latest(series)
    if value is None:
        return None
    label = "inverted" if value < 0 else ("flat" if value < 0.25 else "normal")
    return SignalResult(name="yield_curve_slope", value=value, label=label)


def real_10y_yield(db: Session) -> SignalResult | None:
    dgs10 = load_fred_series(db, "DGS10")
    pce = load_fred_series(db, "PCEPILFE")
    dgs10_latest = latest(dgs10)
    if dgs10_latest is None or pce.dropna().shape[0] < 13:
        return None
    pce_yoy = pce.pct_change(12) * 100.0
    pce_yoy_latest = latest(pce_yoy)
    if pce_yoy_latest is None:
        return None
    value = dgs10_latest - pce_yoy_latest
    label = "negative real yield" if value < 0 else "positive real yield"
    return SignalResult(name="real_10y_yield", value=value, label=label)


def policy_stance(db: Session) -> SignalResult | None:
    fedfunds = load_fred_series(db, "FEDFUNDS")
    if fedfunds.dropna().shape[0] < 12:
        return None
    z = rolling_zscore(fedfunds, window=36, min_periods=12)
    z_latest = latest(z)
    value_latest = latest(fedfunds)
    if z_latest is None or value_latest is None:
        return None
    label = "restrictive vs own history" if z_latest > 0.5 else (
        "accommodative vs own history" if z_latest < -0.5 else "neutral vs own history"
    )
    return SignalResult(name="policy_stance", value=value_latest, zscore=z_latest, label=label)
