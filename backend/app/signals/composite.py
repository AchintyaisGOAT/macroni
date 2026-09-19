from sqlalchemy.orm import Session

from app.signals.credit import credit_spread_proxy
from app.signals.data_access import latest, load_fred_series, load_price_series, rolling_zscore
from app.signals.growth import growth_momentum_composite, labor_slack_trend
from app.signals.types import SignalResult


def inflation_trend(db: Session) -> SignalResult | None:
    cpi = load_fred_series(db, "CPIAUCSL")
    if cpi.dropna().shape[0] < 25:
        return None
    yoy = cpi.pct_change(12) * 100.0
    z = rolling_zscore(yoy, window=60, min_periods=24)
    z_latest = latest(z)
    yoy_latest = latest(yoy)
    if z_latest is None or yoy_latest is None:
        return None
    label = "inflation accelerating vs trend" if z_latest > 0.5 else (
        "inflation decelerating vs trend" if z_latest < -0.5 else "inflation near trend"
    )
    return SignalResult(name="inflation_trend", value=yoy_latest, zscore=z_latest, label=label)


def macro_surprise_composite(db: Session) -> SignalResult | None:
    """Average of growth momentum, easing labor slack, and disinflation z-scores.

    Sign convention: a HIGHER value means a more favorable growth/inflation mix
    (growth accelerating, labor market not deteriorating, inflation cooling) -
    NOT "the economy is overheating". Labor slack and inflation z-scores are
    inverted below so all three components point the same direction.
    """
    growth = growth_momentum_composite(db)
    labor = labor_slack_trend(db)
    inflation = inflation_trend(db)
    components = [s.zscore for s in (growth, labor, inflation) if s is not None and s.zscore is not None]
    if len(components) < 2:
        return None

    signed = []
    if growth and growth.zscore is not None:
        signed.append(growth.zscore)
    if labor and labor.zscore is not None:
        signed.append(-labor.zscore)  # rising slack z = cooling labor market = unfavorable
    if inflation and inflation.zscore is not None:
        signed.append(-inflation.zscore)  # rising inflation z = unfavorable

    composite = sum(signed) / len(signed)
    label = "favorable macro mix" if composite > 0.5 else (
        "unfavorable macro mix" if composite < -0.5 else "mixed/neutral macro backdrop"
    )
    return SignalResult(name="macro_surprise_composite", value=composite, zscore=composite, label=label)


def risk_on_off_composite(db: Session) -> SignalResult | None:
    spy = load_price_series(db, "SPY")
    vix = load_price_series(db, "^VIX")
    credit = credit_spread_proxy(db)

    components = []
    if not spy.empty and spy.dropna().shape[0] > 40:
        spy_ret20 = spy.pct_change(20)
        z = latest(rolling_zscore(spy_ret20, window=252, min_periods=60))
        if z is not None:
            components.append(z)
    if not vix.empty and vix.dropna().shape[0] > 40:
        vix_chg20 = vix.diff(20)
        z = latest(rolling_zscore(vix_chg20, window=252, min_periods=60))
        if z is not None:
            components.append(-z)  # rising VIX = risk-off, so invert
    if credit is not None and credit.zscore is not None:
        components.append(credit.zscore)

    if len(components) < 2:
        return None

    composite = sum(components) / len(components)
    label = "risk-on" if composite > 0.5 else ("risk-off" if composite < -0.5 else "neutral")
    return SignalResult(name="risk_on_off_composite", value=composite, zscore=composite, label=label)
