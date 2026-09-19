from sqlalchemy.orm import Session

from app.signals.data_access import latest, load_price_series
from app.signals.types import SignalResult


def equity_vol_regime(db: Session) -> SignalResult | None:
    vix = load_price_series(db, "^VIX")
    if vix.dropna().shape[0] < 40:
        return None

    window = min(252, vix.shape[0])
    pct_rank = vix.rolling(window, min_periods=40).rank(pct=True)
    pct_latest = latest(pct_rank)
    vix_latest = latest(vix)
    if pct_latest is None or vix_latest is None:
        return None

    if pct_latest > 0.75:
        label = "stressed"
    elif pct_latest < 0.25:
        label = "complacent"
    else:
        label = "normal"
    return SignalResult(name="equity_vol_regime", value=vix_latest, percentile=pct_latest, label=label)
