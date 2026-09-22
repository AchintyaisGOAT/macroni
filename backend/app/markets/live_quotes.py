"""Fast, ephemeral price quotes for frequent polling - deliberately separate from
the slower daily-bar pipeline (data_sources/market_yfinance.py, refreshed every
20 minutes and stored in PriceBar for technical/historical analysis).

yfinance's fast_info is a lightweight quote lookup (a few hundred ms, vs 1-2s+ to
pull years of daily history) - fast enough to poll every few seconds for a
"live-feeling" price, though it's still Yahoo Finance's free, exchange-delayed
quote, not a true real-time tick feed (that requires a paid market-data license
no free source, including this one, provides). Nothing here touches the
database - nothing should depend on this for anything besides immediate display.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

import yfinance as yf

logger = logging.getLogger("app.markets.live_quotes")


def _quote_for_ticker(ticker: str) -> dict | None:
    try:
        fi = yf.Ticker(ticker).fast_info
        last = fi["lastPrice"]
        prev = fi["previousClose"]
        if last is None or not prev:
            return None
        return {
            "ticker": ticker,
            "price": float(last),
            "change_pct": float((last - prev) / prev * 100),
        }
    except Exception:
        logger.debug("live quote failed for %s", ticker, exc_info=True)
        return None


def get_live_quotes(tickers: list[str]) -> list[dict]:
    if not tickers:
        return []
    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=min(10, len(tickers))) as pool:
        futures = [pool.submit(_quote_for_ticker, t) for t in tickers]
        for future in as_completed(futures):
            quote = future.result()
            if quote is not None:
                results.append(quote)
    return results
