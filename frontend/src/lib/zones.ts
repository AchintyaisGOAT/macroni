// Trade-guidance "zone" (buy/sell call) color + label, shared by every place
// that renders a ZoneBadge (Watchlist, MarketStocks, TradeGuidancePanel).
// Previously redefined independently 3x, and the MarketStocks copy had
// silently drifted (missing "hold") - exactly the bug a shared source fixes.
export const ZONE_COLOR: Record<string, string> = {
  strong_buy: "var(--status-good)",
  buy: "var(--status-good)",
  neutral: "var(--status-warning)",
  hold: "var(--status-warning)",
  sell: "var(--status-critical)",
  strong_sell: "var(--status-critical)",
};

export function zoneLabel(zone: string): string {
  return zone.replace("_", " ").toUpperCase();
}

export function zoneColor(zone: string): string {
  return ZONE_COLOR[zone] ?? "var(--text-muted)";
}
