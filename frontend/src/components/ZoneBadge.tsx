import { zoneColor, zoneLabel } from "../lib/zones";
import { pillStyle } from "../styles";

/** Trade-guidance zone (strong_buy/buy/neutral/hold/sell/strong_sell) pill.
 * Previously defined independently 3x (Watchlist, MarketStocks,
 * TradeGuidancePanel); the MarketStocks copy had silently drifted and was
 * missing the "hold" zone. */
export function ZoneBadge({ zone }: { zone: string }) {
  const color = zoneColor(zone);
  return <span style={pillStyle(color, { strong: zone.startsWith("strong"), pct: 16 })}>{zoneLabel(zone)}</span>;
}
