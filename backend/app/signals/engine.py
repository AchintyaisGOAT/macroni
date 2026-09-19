import logging

from sqlalchemy.orm import Session

from app.models.signals import SignalSnapshot
from app.signals.composite import inflation_trend, macro_surprise_composite, risk_on_off_composite
from app.signals.credit import credit_spread_proxy
from app.signals.fx import usd_trend
from app.signals.growth import growth_momentum_composite, labor_slack_trend
from app.signals.rates import policy_stance, real_10y_yield, yield_curve_slope
from app.signals.types import SignalResult
from app.signals.volatility import equity_vol_regime

logger = logging.getLogger("app.signals.engine")


def portfolio_beta_exposure(db: Session) -> SignalResult | None:
    from app.portfolio.exposures import compute_portfolio_exposures

    exposure = compute_portfolio_exposures(db)
    beta = exposure.get("portfolio_beta")
    total_value = exposure.get("total_value", 0.0)
    equity_value = exposure.get("by_asset_class", {}).get("equity", 0.0)
    if beta is None or total_value <= 0:
        return None
    equity_weight = equity_value / total_value
    value = beta * equity_weight
    label = "high equity-market sensitivity" if value > 0.7 else (
        "low equity-market sensitivity" if value < 0.3 else "moderate equity-market sensitivity"
    )
    return SignalResult(name="portfolio_beta_exposure", value=value, label=label)


SIGNAL_FUNCTIONS = [
    yield_curve_slope,
    real_10y_yield,
    policy_stance,
    growth_momentum_composite,
    labor_slack_trend,
    credit_spread_proxy,
    equity_vol_regime,
    usd_trend,
    inflation_trend,
    macro_surprise_composite,
    risk_on_off_composite,
    portfolio_beta_exposure,
]


def compute_all_signals(db: Session) -> list[SignalResult]:
    results: list[SignalResult] = []
    for fn in SIGNAL_FUNCTIONS:
        try:
            result = fn(db)
        except Exception:
            logger.exception("signal function %s raised", fn.__name__)
            continue
        if result is not None:
            results.append(result)
        else:
            logger.info("signal %s: insufficient data, skipped", fn.__name__)
    return results


def compute_and_store_signals(db: Session) -> list[SignalResult]:
    results = compute_all_signals(db)
    for r in results:
        db.add(
            SignalSnapshot(
                name=r.name,
                value=r.value,
                zscore=r.zscore,
                percentile=r.percentile,
                label=r.label,
            )
        )
    db.commit()
    return results


def latest_snapshot(db: Session) -> list[SignalSnapshot]:
    """Return the most recent stored snapshot for each signal name."""
    all_names = db.query(SignalSnapshot.name).distinct().all()
    latest_rows: list[SignalSnapshot] = []
    for (name,) in all_names:
        row = (
            db.query(SignalSnapshot)
            .filter(SignalSnapshot.name == name)
            .order_by(SignalSnapshot.computed_at.desc())
            .first()
        )
        if row:
            latest_rows.append(row)
    return latest_rows
