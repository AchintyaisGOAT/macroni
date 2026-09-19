import logging

import pandas as pd
from pandas_datareader import data as pdr

logger = logging.getLogger("app.data_sources.stooq")


def fetch_stooq_bars(ticker: str, lookback_days: int = 400) -> pd.DataFrame:
    """Fallback daily-bar fetch via Stooq (no API key). Returns a DataFrame with
    columns [date, open, high, low, close, volume], most recent last.
    """
    end = pd.Timestamp.today()
    start = end - pd.Timedelta(days=lookback_days)
    df = pdr.DataReader(ticker, "stooq", start=start, end=end)
    if df.empty:
        return df
    df = df.sort_index()
    df = df.rename(columns=str.lower)
    df = df.reset_index().rename(columns={"Date": "date", "date": "date"})
    return df[["date", "open", "high", "low", "close", "volume"]]
