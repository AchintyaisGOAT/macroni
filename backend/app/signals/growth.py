from sqlalchemy.orm import Session

from app.signals.data_access import latest, load_fred_series, rolling_zscore
from app.signals.types import SignalResult


def growth_momentum_composite(db: Session) -> SignalResult | None:
    indpro = load_fred_series(db, "INDPRO")
    payems = load_fred_series(db, "PAYEMS")
    if indpro.dropna().shape[0] < 12 or payems.dropna().shape[0] < 12:
        return None

    indpro_mom = indpro.pct_change()
    payems_mom = payems.pct_change()

    indpro_z = latest(rolling_zscore(indpro_mom, window=36, min_periods=12))
    payems_z = latest(rolling_zscore(payems_mom, window=36, min_periods=12))
    if indpro_z is None or payems_z is None:
        return None

    composite = (indpro_z + payems_z) / 2.0
    label = "accelerating" if composite > 0.5 else ("decelerating" if composite < -0.5 else "steady")
    return SignalResult(name="growth_momentum", value=composite, zscore=composite, label=label)


def labor_slack_trend(db: Session) -> SignalResult | None:
    icsa = load_fred_series(db, "ICSA")
    if icsa.dropna().shape[0] < 20:
        return None
    ma4 = icsa.rolling(4, min_periods=2).mean()
    z = rolling_zscore(ma4, window=52, min_periods=13)
    z_latest = latest(z)
    ma4_latest = latest(ma4)
    if z_latest is None or ma4_latest is None:
        return None
    label = "labor market cooling" if z_latest > 0.5 else (
        "labor market tightening" if z_latest < -0.5 else "labor market stable"
    )
    return SignalResult(name="labor_slack_trend", value=ma4_latest, zscore=z_latest, label=label)
