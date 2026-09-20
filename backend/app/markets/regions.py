from dataclasses import dataclass


@dataclass
class Region:
    code: str
    name: str
    index_ticker: str
    index_name: str
    # Dedicated implied-volatility index ticker, when one is reliably available via
    # yfinance. Regions without one fall back to realized volatility instead.
    vol_ticker: str | None


REGIONS: list[Region] = [
    Region("US", "United States", "SPY", "S&P 500", "^VIX"),
    Region("IN", "India", "^NSEI", "Nifty 50", "^INDIAVIX"),
    Region("JP", "Japan", "^N225", "Nikkei 225", None),
    Region("UK", "United Kingdom", "^FTSE", "FTSE 100", None),
    Region("HK", "Hong Kong", "^HSI", "Hang Seng", None),
    Region("DE", "Germany", "^GDAXI", "DAX", None),
]
