from datetime import date, timedelta

import numpy as np
import pandas as pd
import pytest

from app.data_sources.market_yfinance import _drop_incomplete_bars, refresh_ticker
from app.models.market_data import PriceBar


def _bars_df(n: int, unsettled_last: bool = False) -> pd.DataFrame:
    start = date(2026, 1, 1)
    rows = []
    for i in range(n):
        close = np.nan if (unsettled_last and i == n - 1) else 100.0 + i
        rows.append(
            {
                "date": start + timedelta(days=i),
                "open": 100.0 + i,
                "high": 101.0 + i,
                "low": 99.0 + i,
                "close": close,
                "volume": 1000.0,
            }
        )
    return pd.DataFrame(rows)


def test_drop_incomplete_bars_removes_nan_close_rows():
    df = _bars_df(5, unsettled_last=True)
    result = _drop_incomplete_bars(df, "^HSI")
    assert len(result) == 4
    assert not result["close"].isna().any()


def test_drop_incomplete_bars_keeps_complete_rows_untouched():
    df = _bars_df(5, unsettled_last=False)
    result = _drop_incomplete_bars(df, "^HSI")
    assert len(result) == 5


def test_refresh_ticker_persists_history_despite_unsettled_session(db, monkeypatch):
    df = _bars_df(5, unsettled_last=True)
    monkeypatch.setattr(
        "app.data_sources.market_yfinance.fetch_bars_with_fallback",
        lambda ticker: (df, "yfinance"),
    )

    affected = refresh_ticker(db, "^HSI")

    assert affected == 4
    stored = db.query(PriceBar).filter_by(ticker="^HSI").all()
    assert len(stored) == 4
    assert all(bar.close is not None for bar in stored)


def test_refresh_ticker_raises_without_the_fix_if_nan_reaches_upsert(db, monkeypatch):
    """Guards the failure mode itself: an unfiltered NaN-close row should
    still violate the NOT NULL constraint if it ever reaches the upsert -
    i.e. this confirms _drop_incomplete_bars is load-bearing, not incidental.
    """
    df = _bars_df(5, unsettled_last=True)
    monkeypatch.setattr(
        "app.data_sources.market_yfinance.fetch_bars_with_fallback",
        lambda ticker: (df, "yfinance"),
    )
    monkeypatch.setattr(
        "app.data_sources.market_yfinance._drop_incomplete_bars",
        lambda df, ticker: df,
    )

    with pytest.raises(Exception, match="NOT NULL"):
        refresh_ticker(db, "^HSI")
