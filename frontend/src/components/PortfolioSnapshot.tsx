import { Link } from "react-router-dom";
import type { Exposures, Holding, LiveQuote } from "../api/client";
import { uniformCurrencySymbol } from "../currency";
import { Card } from "./Card";
import { DeltaPill, StatTile } from "./StatTile";

interface PortfolioSnapshotProps {
  holdings: Holding[];
  exposures: Exposures | null;
  liveQuotes: Record<string, LiveQuote>;
  loading: boolean;
}

// The thing a portfolio app's home screen is supposed to lead with - total
// value and today's move - which previously only existed on the separate
// Portfolio page. Reuses the same live-quote-preferred, mixed-currency-safe
// total calculation Portfolio.tsx already established.
export function PortfolioSnapshot({ holdings, exposures, liveQuotes, loading }: PortfolioSnapshotProps) {
  if (loading) {
    return (
      <Card padding="18px 22px">
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading portfolio...</div>
      </Card>
    );
  }

  if (holdings.length === 0 || !exposures) {
    return (
      <Card padding="18px 22px">
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          No holdings yet.{" "}
          <Link to="/portfolio" style={{ fontWeight: 700 }}>
            Add some on the Portfolio page
          </Link>{" "}
          to see your value and day change here.
        </div>
      </Card>
    );
  }

  const symbol = uniformCurrencySymbol(holdings.map((h) => h.ticker));
  let total = 0;
  let weightedDayChangeValue = 0; // sum(value * pct/100), used for both the % and (currency-safe) $ change
  for (const h of holdings) {
    const live = liveQuotes[h.ticker];
    const detail = exposures.holdings.find((d) => d.ticker === h.ticker);
    const value = live ? live.price * h.quantity : (detail?.value ?? 0);
    total += value;
    if (live) weightedDayChangeValue += value * (live.change_pct / 100);
  }
  const dayChangePct = total > 0 ? (weightedDayChangeValue / total) * 100 : 0;
  const totalLabel = symbol
    ? `${symbol}${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : `${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} (mixed currencies)`;

  return (
    <StatTile
      padding="18px 22px"
      label="Portfolio value"
      value={totalLabel}
      valueSize={30}
      delta={Object.keys(liveQuotes).length > 0 ? <DeltaPill pct={dayChangePct} size="md" suffix="% today" /> : null}
      corner={
        <Link to="/portfolio" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--brand-blue)", whiteSpace: "nowrap" }}>
          {holdings.length} holding{holdings.length === 1 ? "" : "s"} · View portfolio →
        </Link>
      }
    />
  );
}
