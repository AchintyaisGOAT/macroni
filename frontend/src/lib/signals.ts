import type { Signal } from "../api/client";

export type Severity = "good" | "elevated" | "extreme";

export const SEVERITY_COLOR: Record<Severity, string> = {
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

export function formatSignalName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatSignalValue(signal: Signal): string {
  const v = signal.value;
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(v) < 1) return v.toFixed(3);
  return v.toFixed(2);
}

// Green when the series has moved up over the visible window, red when down
// - lets the line itself say "which direction is this going" at a glance,
// independent of the severity dot (which says "how far from normal").
export function signalTrendColor(history: number[]): string {
  if (history.length < 2) return "var(--text-muted)";
  return history[history.length - 1] >= history[0] ? "var(--status-good)" : "var(--status-critical)";
}

// Percent change from the start to the end of the visible history window -
// the same "delta badge next to the number" every portfolio/watchlist stat
// card (Robinhood, Coinbase, Bloomberg) shows next to a live price.
export function signalDeltaPct(history: number[]): number | null {
  if (history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];
  if (first === 0) return null;
  return ((last - first) / Math.abs(first)) * 100;
}
