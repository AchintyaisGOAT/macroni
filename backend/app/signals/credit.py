from sqlalchemy.orm import Session

from app.signals.data_access import latest, load_price_series, rolling_zscore
from app.signals.types import SignalResult


def credit_spread_proxy(db: Session) -> SignalResult | None:
    hyg = load_price_series(db, "HYG")
    ief = load_price_series(db, "IEF")
    if hyg.empty or ief.empty:
        return None

    ratio = (hyg / ief).dropna()
    if ratio.shape[0] < 40:
        return None

    roc20 = ratio.pct_change(20)
    z = rolling_zscore(roc20, window=252, min_periods=60)
    z_latest = latest(z)
    roc_latest = latest(roc20)
    if z_latest is None or roc_latest is None:
        return None

    label = "credit stress building" if z_latest < -1.0 else (
        "credit conditions loosening" if z_latest > 1.0 else "credit conditions stable"
    )
    return SignalResult(name="credit_spread_momentum", value=roc_latest, zscore=z_latest, label=label)
