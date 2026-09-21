"""Curated per-market stock lists for browsing.

Not an exhaustive listing of every tradable security on each exchange - yfinance
has no bulk symbol-directory endpoint, and scraping each exchange's own listing
files would mean 8 separate, fragile, exchange-specific ingestion pipelines to
build and maintain. This is instead a hand-picked set of well-known, large-cap
constituents per market (roughly its major index), verified individually against
yfinance - a practical "see what's trading in this market" view, not a full
screener. Region codes match backend/app/markets/regions.py.
"""

from dataclasses import dataclass


@dataclass
class MarketStock:
    ticker: str
    name: str


CONSTITUENTS: dict[str, list[MarketStock]] = {
    "US": [
        MarketStock("AAPL", "Apple"),
        MarketStock("MSFT", "Microsoft"),
        MarketStock("GOOGL", "Alphabet"),
        MarketStock("AMZN", "Amazon"),
        MarketStock("NVDA", "NVIDIA"),
        MarketStock("META", "Meta Platforms"),
        MarketStock("TSLA", "Tesla"),
        MarketStock("JPM", "JPMorgan Chase"),
        MarketStock("V", "Visa"),
        MarketStock("WMT", "Walmart"),
        MarketStock("JNJ", "Johnson & Johnson"),
        MarketStock("PG", "Procter & Gamble"),
        MarketStock("HD", "Home Depot"),
        MarketStock("MA", "Mastercard"),
        MarketStock("DIS", "Disney"),
        MarketStock("KO", "Coca-Cola"),
        MarketStock("PEP", "PepsiCo"),
        MarketStock("XOM", "Exxon Mobil"),
        MarketStock("CVX", "Chevron"),
        MarketStock("BAC", "Bank of America"),
    ],
    "IN": [
        MarketStock("RELIANCE.NS", "Reliance Industries"),
        MarketStock("TCS.NS", "Tata Consultancy Services"),
        MarketStock("HDFCBANK.NS", "HDFC Bank"),
        MarketStock("ICICIBANK.NS", "ICICI Bank"),
        MarketStock("INFY.NS", "Infosys"),
        MarketStock("HINDUNILVR.NS", "Hindustan Unilever"),
        MarketStock("ITC.NS", "ITC"),
        MarketStock("SBIN.NS", "State Bank of India"),
        MarketStock("BHARTIARTL.NS", "Bharti Airtel"),
        MarketStock("KOTAKBANK.NS", "Kotak Mahindra Bank"),
        MarketStock("LT.NS", "Larsen & Toubro"),
        MarketStock("AXISBANK.NS", "Axis Bank"),
        MarketStock("BAJFINANCE.NS", "Bajaj Finance"),
        MarketStock("ASIANPAINT.NS", "Asian Paints"),
        MarketStock("MARUTI.NS", "Maruti Suzuki"),
        MarketStock("SUNPHARMA.NS", "Sun Pharma"),
        MarketStock("TITAN.NS", "Titan Company"),
        MarketStock("WIPRO.NS", "Wipro"),
        MarketStock("ULTRACEMCO.NS", "UltraTech Cement"),
        MarketStock("NESTLEIND.NS", "Nestle India"),
    ],
    "JP": [
        MarketStock("7203.T", "Toyota Motor"),
        MarketStock("6758.T", "Sony Group"),
        MarketStock("9984.T", "SoftBank Group"),
        MarketStock("8306.T", "Mitsubishi UFJ Financial"),
        MarketStock("6861.T", "Keyence"),
        MarketStock("9432.T", "NTT"),
        MarketStock("7267.T", "Honda Motor"),
        MarketStock("6098.T", "Recruit Holdings"),
        MarketStock("4063.T", "Shin-Etsu Chemical"),
        MarketStock("8035.T", "Tokyo Electron"),
        MarketStock("9433.T", "KDDI"),
        MarketStock("6501.T", "Hitachi"),
        MarketStock("7974.T", "Nintendo"),
        MarketStock("8058.T", "Mitsubishi Corp"),
    ],
    "UK": [
        MarketStock("SHEL.L", "Shell"),
        MarketStock("AZN.L", "AstraZeneca"),
        MarketStock("HSBA.L", "HSBC Holdings"),
        MarketStock("ULVR.L", "Unilever"),
        MarketStock("BP.L", "BP"),
        MarketStock("GSK.L", "GSK"),
        MarketStock("DGE.L", "Diageo"),
        MarketStock("RIO.L", "Rio Tinto"),
        MarketStock("REL.L", "RELX"),
        MarketStock("BATS.L", "British American Tobacco"),
        MarketStock("NG.L", "National Grid"),
        MarketStock("BARC.L", "Barclays"),
        MarketStock("VOD.L", "Vodafone"),
        MarketStock("TSCO.L", "Tesco"),
    ],
    "HK": [
        MarketStock("0700.HK", "Tencent Holdings"),
        MarketStock("9988.HK", "Alibaba Group"),
        MarketStock("0941.HK", "China Mobile"),
        MarketStock("0005.HK", "HSBC Holdings"),
        MarketStock("1299.HK", "AIA Group"),
        MarketStock("3690.HK", "Meituan"),
        MarketStock("0388.HK", "Hong Kong Exchanges & Clearing"),
        MarketStock("0883.HK", "CNOOC"),
        MarketStock("1398.HK", "ICBC"),
        MarketStock("0016.HK", "Sun Hung Kai Properties"),
    ],
    "DE": [
        MarketStock("SAP.DE", "SAP"),
        MarketStock("SIE.DE", "Siemens"),
        MarketStock("ALV.DE", "Allianz"),
        MarketStock("DTE.DE", "Deutsche Telekom"),
        MarketStock("MBG.DE", "Mercedes-Benz Group"),
        MarketStock("BMW.DE", "BMW"),
        MarketStock("VOW3.DE", "Volkswagen"),
        MarketStock("BAS.DE", "BASF"),
        MarketStock("MUV2.DE", "Munich Re"),
        MarketStock("DBK.DE", "Deutsche Bank"),
        MarketStock("ADS.DE", "Adidas"),
        MarketStock("BAYN.DE", "Bayer"),
        MarketStock("IFX.DE", "Infineon Technologies"),
    ],
}
