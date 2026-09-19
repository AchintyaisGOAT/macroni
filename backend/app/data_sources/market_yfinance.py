import logging

import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session

from app.data_sources.base import retry, upsert_rows
from app.data_sources.market_stooq import fetch_stooq_bars
from app.models.market_data import PriceBar

logger = logging.getLogger("app.data_sources.market")

# Core macro-relevant instruments. User portfolio tickers are appended at refresh time.
TRACKED_TICKERS = [
    "SPY",  # US equities
    "^VIX",  # equity volatility regime
    "HYG",  # high-yield credit
    "LQD",  # investment-grade credit
    "IEF",  # 7-10y treasuries
    "TLT",  # 20y+ treasuries
    "SHY",  # 1-3y treasuries
    "UUP",  # USD index proxy (ETF, more reliable via yfinance than DX-Y.NYB)
    "GLD",  # gold
    "DBC",  # broad commodities
]


def _fetch_yfinance_bars(ticker: str, period: str = "2y") -> pd.DataFrame:
    df = yf.Ticker(ticker).history(period=period, interval="1d", auto_adjust=False)
    if df.empty:
        raise ValueError(f"yfinance returned no data for {ticker}")
    df = df.reset_index()
    df = df.rename(
        columns={
            "Date": "date",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        }
    )
    df["date"] = pd.to_datetime(df["date"]).dt.date
    return df[["date", "open", "high", "low", "close", "volume"]]


def fetch_bars_with_fallback(ticker: str) -> tuple[pd.DataFrame, str]:
    try:
        df = retry(lambda: _fetch_yfinance_bars(ticker), attempts=2, base_delay=2.0)
        return df, "yfinance"
    except Exception as exc:
        logger.warning("yfinance failed for %s (%s); falling back to Stooq", ticker, exc)
        df = fetch_stooq_bars(ticker)
        if df.empty:
            raise
        return df, "stooq"


def refresh_ticker(db: Session, ticker: str) -> int:
    df, source = fetch_bars_with_fallback(ticker)
    rows = [
        {
            "ticker": ticker,
            "date": row.date,
            "open": float(row.open),
            "high": float(row.high),
            "low": float(row.low),
            "close": float(row.close),
            "volume": float(row.volume) if pd.notna(row.volume) else 0.0,
            "source": source,
        }
        for row in df.itertuples(index=False)
    ]
    return upsert_rows(
        db,
        PriceBar,
        rows,
        conflict_columns=["ticker", "date"],
        update_columns=["open", "high", "low", "close", "volume", "source", "fetched_at"],
    )


def refresh_tickers(db: Session, tickers: list[str]) -> dict[str, int]:
    results: dict[str, int] = {}
    for ticker in tickers:
        try:
            results[ticker] = refresh_ticker(db, ticker)
        except Exception:
            logger.exception("failed to refresh %s from both yfinance and Stooq", ticker)
            results[ticker] = -1
    return results
