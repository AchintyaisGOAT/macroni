from datetime import date, timedelta

import numpy as np

from app.models.macro_series import FredObservation
from app.models.market_data import PriceBar
from app.signals.credit import credit_spread_proxy
from app.signals.data_access import load_fred_series, rolling_zscore
from app.signals.rates import yield_curve_slope
from app.signals.volatility import equity_vol_regime


def _add_fred_series(db, series_id: str, values: list[float], start: date):
    for i, v in enumerate(values):
        db.add(FredObservation(series_id=series_id, date=start + timedelta(days=i), value=v))
    db.commit()


def _add_price_series(db, ticker: str, closes: list[float], start: date):
    for i, c in enumerate(closes):
        db.add(
            PriceBar(
                ticker=ticker,
                date=start + timedelta(days=i),
                open=c,
                high=c,
                low=c,
                close=c,
                volume=1000,
            )
        )
    db.commit()


def test_yield_curve_slope_inverted(db):
    _add_fred_series(db, "T10Y2Y", [0.5, 0.2, -0.1, -0.4], date(2023, 6, 1))
    result = yield_curve_slope(db)
    assert result is not None
    assert result.value == -0.4
    assert result.label == "inverted"


def test_yield_curve_slope_normal(db):
    _add_fred_series(db, "T10Y2Y", [0.1, 0.3, 0.6], date(2024, 1, 1))
    result = yield_curve_slope(db)
    assert result.label == "normal"


def test_yield_curve_slope_missing_data_returns_none(db):
    assert yield_curve_slope(db) is None


def test_rolling_zscore_matches_manual_calculation():
    import pandas as pd

    series = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dtype=float)
    z = rolling_zscore(series, window=5, min_periods=5)
    window = series.iloc[1:6]
    expected = (series.iloc[5] - window.mean()) / window.std()
    assert np.isclose(z.iloc[5], expected)


def test_equity_vol_regime_labels_stressed_when_at_high_percentile(db):
    # 60 low values then a spike - the spike should rank near the top percentile.
    closes = [15.0] * 60 + [45.0]
    _add_price_series(db, "^VIX", closes, date(2024, 1, 1))
    result = equity_vol_regime(db)
    assert result is not None
    assert result.label == "stressed"
    assert result.percentile > 0.9


def test_credit_spread_proxy_detects_stress(db):
    start = date(2023, 1, 1)
    n = 300
    # Flat ratio for the first 280 days, then a sharp 10-day decline (credit stress).
    hyg = [100.0] * (n - 20) + list(np.linspace(100.0, 90.0, 20))
    ief = [100.0] * n
    _add_price_series(db, "HYG", hyg, start)
    _add_price_series(db, "IEF", ief, start)
    result = credit_spread_proxy(db)
    assert result is not None
    assert result.zscore is not None
    assert result.zscore < 0  # ratio falling = credit stress building


def test_load_fred_series_returns_empty_for_unknown_series(db):
    series = load_fred_series(db, "DOES_NOT_EXIST")
    assert series.empty
