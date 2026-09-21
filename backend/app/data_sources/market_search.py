import logging

import yfinance as yf

from app.data_sources.base import retry

logger = logging.getLogger("app.data_sources.search")

# Quote types worth offering as portfolio holdings - excludes futures, currencies,
# options, etc. which aren't meaningful "add a position" targets for this app.
RELEVANT_QUOTE_TYPES = {"EQUITY", "ETF", "MUTUALFUND", "INDEX"}


# Yahoo Finance's own exchange short-codes (as returned by yf.Search), mapped to this
# app's region codes (backend/app/markets/regions.py) - verified directly against
# live search results, not assumed. Lets a market's "browse stocks" search be scoped
# to just that market instead of returning matches from anywhere in the world.
EXCHANGE_TO_REGION = {
    "NYQ": "US", "NMS": "US", "NGM": "US", "ASE": "US", "PCX": "US", "BTS": "US",
    "NSI": "IN", "BSE": "IN",
    "JPX": "JP",
    "LSE": "UK",
    "HKG": "HK",
    "GER": "DE",
}


def search_tickers(query: str, max_results: int = 8, region_code: str | None = None) -> list[dict]:
    query = query.strip()
    if not query:
        return []

    # Cast a wider net than max_results when filtering by region, since most raw
    # matches for a query will be outside the requested market and get dropped.
    raw_limit = max_results if region_code is None else max(max_results * 4, 20)
    search = retry(lambda: yf.Search(query, max_results=raw_limit), attempts=2, base_delay=1.5)

    results = []
    for quote in search.quotes:
        quote_type = quote.get("quoteType", "")
        if quote_type not in RELEVANT_QUOTE_TYPES:
            continue
        symbol = quote.get("symbol")
        if not symbol:
            continue
        exchange_code = quote.get("exchange") or ""
        if region_code is not None and EXCHANGE_TO_REGION.get(exchange_code) != region_code.upper():
            continue
        results.append(
            {
                "symbol": symbol,
                "name": quote.get("longname") or quote.get("shortname") or symbol,
                "exchange": quote.get("exchDisp") or exchange_code,
                "quote_type": quote_type,
                "sector": quote.get("sector"),
            }
        )
        if len(results) >= max_results:
            break
    return results
