from sqlalchemy.orm import Session

from app.signals.data_access import latest, load_fred_series, rolling_zscore
from app.signals.types import SignalResult


def usd_trend(db: Session) -> SignalResult | None:
    usd = load_fred_series(db, "DTWEXBGS")
    if usd.dropna().shape[0] < 80:
        return None

    roc60 = usd.pct_change(60)
    z = rolling_zscore(roc60, window=252, min_periods=80)
    z_latest = latest(z)
    roc_latest = latest(roc60)
    if z_latest is None or roc_latest is None:
        return None

    label = "USD strengthening" if z_latest > 0.5 else (
        "USD weakening" if z_latest < -0.5 else "USD range-bound"
    )
    return SignalResult(name="usd_trend", value=roc_latest, zscore=z_latest, label=label)
