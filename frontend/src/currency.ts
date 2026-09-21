// Ticker suffix -> currency symbol, matching the exchange suffixes used throughout
// this app (backend/app/broker/angel_one.py's map_to_yahoo_ticker, backend/app/
// markets/constituents.py). A bare ticker with no recognized suffix (US stocks,
// SPY, AAPL, etc.) defaults to USD, since that's every non-suffixed ticker here.
const CURRENCY_BY_SUFFIX: [suffix: string, symbol: string][] = [
  [".NS", "₹"], // India (NSE) - rupee
  [".BO", "₹"], // India (BSE) - rupee
  [".T", "¥"], // Japan (TSE) - yen
  [".L", "£"], // UK (LSE) - pound
  [".HK", "HK$"], // Hong Kong (HKEX)
  [".DE", "€"], // Germany (Xetra) - euro
];

export function currencySymbolForTicker(ticker: string): string {
  const upper = ticker.toUpperCase();
  const match = CURRENCY_BY_SUFFIX.find(([suffix]) => upper.endsWith(suffix));
  return match ? match[1] : "$";
}

export function formatPrice(price: number, ticker: string, maximumFractionDigits = 2): string {
  const symbol = currencySymbolForTicker(ticker);
  return `${symbol}${price.toLocaleString(undefined, { maximumFractionDigits, minimumFractionDigits: 0 })}`;
}

/** Currency symbol for a set of tickers, if they all share one - otherwise null,
 * since summing/labeling mixed-currency values with a single symbol would be
 * silently wrong rather than just imprecise. */
export function uniformCurrencySymbol(tickers: string[]): string | null {
  if (tickers.length === 0) return null;
  const symbols = new Set(tickers.map(currencySymbolForTicker));
  return symbols.size === 1 ? [...symbols][0] : null;
}
