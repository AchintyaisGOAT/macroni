import logging

import yfinance as yf

from app.data_sources.base import retry

logger = logging.getLogger("app.data_sources.search")

# Quote types worth offering as portfolio holdings - excludes futures, currencies,
# options, etc. which aren't meaningful "add a position" targets for this app.
RELEVANT_QUOTE_TYPES = {"EQUITY", "ETF", "MUTUALFUND", "INDEX"}


def search_tickers(query: str, max_results: int = 8) -> list[dict]:
    query = query.strip()
    if not query:
        return []

    search = retry(lambda: yf.Search(query, max_results=max_results), attempts=2, base_delay=1.5)

    results = []
    for quote in search.quotes:
        quote_type = quote.get("quoteType", "")
        if quote_type not in RELEVANT_QUOTE_TYPES:
            continue
        symbol = quote.get("symbol")
        if not symbol:
            continue
        results.append(
            {
                "symbol": symbol,
                "name": quote.get("longname") or quote.get("shortname") or symbol,
                "exchange": quote.get("exchDisp") or quote.get("exchange") or "",
                "quote_type": quote_type,
                "sector": quote.get("sector"),
            }
        )
    return results
