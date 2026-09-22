import type { Signal } from "../api/client";
import { Card } from "./Card";
import { Sparkline } from "./Sparkline";

export type Severity = "good" | "elevated" | "extreme";

const SEVERITY_COLOR: Record<Severity, string> = {
  good: "var(--status-good)",
  elevated: "var(--status-warning)",
  extreme: "var(--status-serious)",
};

// Mirrors backend/app/signals/{rates,fx,credit,growth,volatility,composite}.py -
// the API doesn't return a category field, but every signal name is fixed and
// known, so the grouping lives here rather than guessing from the name shape.
const SIGNAL_CATEGORY: Record<string, string> = {
  yield_curve_slope: "Rates",
  real_10y_yield: "Rates",
  policy_stance: "Rates",
  usd_trend: "FX",
  credit_spread_momentum: "Credit",
  growth_momentum: "Growth & Inflation",
  labor_slack_trend: "Growth & Inflation",
  macro_surprise_composite: "Growth & Inflation",
  inflation_trend: "Growth & Inflation",
  equity_vol_regime: "Volatility & Risk",
  risk_on_off_composite: "Volatility & Risk",
  portfolio_beta_exposure: "Portfolio",
};

export const CATEGORY_ORDER = ["Volatility & Risk", "Rates", "Credit", "FX", "Growth & Inflation", "Portfolio"];

export function signalCategory(signal: Signal): string {
  return SIGNAL_CATEGORY[signal.name] ?? "Other";
}

export function signalSeverity(signal: Signal): Severity {
  const magnitude = Math.abs(signal.zscore ?? 0);
  const pct = signal.percentile;
  const extreme = magnitude > 1.5 || (pct !== null && (pct > 0.9 || pct < 0.1));
  const elevated = magnitude > 0.75 || (pct !== null && (pct > 0.75 || pct < 0.25));
  if (extreme) return "extreme";
  if (elevated) return "elevated";
  return "good";
}

function formatSignalName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(signal: Signal): string {
  const v = signal.value;
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(v) < 1) return v.toFixed(3);
  return v.toFixed(2);
}

// Green when the series has moved up over the visible window, red when down
// - lets the line itself say "which direction is this going" at a glance,
// independent of the severity dot (which says "how far from normal").
function trendColor(history: number[]): string {
  if (history.length < 2) return "var(--text-muted)";
  return history[history.length - 1] >= history[0] ? "var(--status-good)" : "var(--status-critical)";
}

interface Delta {
  pct: number;
  color: string;
  arrow: string;
}

// Percent change from the start to the end of the visible history window -
// the same "delta badge next to the number" every portfolio/watchlist stat
// card (Robinhood, Coinbase, Bloomberg) shows next to a live price.
function computeDelta(history: number[]): Delta | null {
  if (history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];
  if (first === 0) return null;
  const pct = ((last - first) / Math.abs(first)) * 100;
  return {
    pct,
    color: pct >= 0 ? "var(--status-good)" : "var(--status-critical)",
    arrow: pct >= 0 ? "▲" : "▼",
  };
}

interface StatTileProps {
  signal: Signal;
  history: number[];
  /** "tile" (default): a standalone card. "row": a compact line for a list
   * inside a shared container - used on the Dashboard's Signals panel so
   * a dozen signals read as one scannable table instead of a dozen cards. */
  variant?: "tile" | "row";
  /** Tile variant only: makes the card clickable (e.g. to open a detail view). */
  onClick?: () => void;
}

export function StatTile({ signal, history, variant = "tile", onClick }: StatTileProps) {
  const dotColor = SEVERITY_COLOR[signalSeverity(signal)];
  const delta = computeDelta(history);

  if (variant === "row") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px" }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            width: 200,
            flexShrink: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatSignalName(signal.name)}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {signal.label}
          {signal.zscore !== null ? ` · z=${signal.zscore.toFixed(2)}` : ""}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            width: 72,
            textAlign: "right",
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatValue(signal)}
        </span>
        <span style={{ width: 72, height: 28, flexShrink: 0 }}>
          <Sparkline data={history} color={trendColor(history)} />
        </span>
      </div>
    );
  }

  return (
    <Card
      padding="16px"
      style={{ display: "flex", flexDirection: "column", gap: 10, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        <span
          style={{
            color: "var(--text-secondary)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatSignalName(signal.name)}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums" }}>
          {formatValue(signal)}
        </span>
        {delta && Math.abs(delta.pct) >= 0.01 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: delta.color,
              background: `color-mix(in srgb, ${delta.color} 12%, transparent)`,
              borderRadius: 999,
              padding: "2px 7px",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {delta.arrow} {Math.abs(delta.pct).toFixed(1)}%
          </span>
        )}
      </div>

      <div style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: -6 }}>
        {signal.label}
        {signal.zscore !== null ? ` · z=${signal.zscore.toFixed(2)}` : ""}
      </div>

      <div style={{ height: 64 }}>
        <Sparkline data={history} color={trendColor(history)} showZero />
      </div>
    </Card>
  );
}
