import { useEffect, useState } from "react";
import { api, type TechnicalSignal, type TradeGuidance } from "../api/client";
import { Card } from "../components/Card";
import { formatPrice } from "../currency";

function extractErrorDetail(err: unknown): string {
  const message = String(err instanceof Error ? err.message : err);
  const jsonStart = message.indexOf("{");
  if (jsonStart === -1) return message;
  try {
    const parsed = JSON.parse(message.slice(jsonStart));
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // fall through to raw message
  }
  return message;
}

const ZONE_COLOR: Record<string, string> = {
  strong_buy: "var(--status-good)",
  buy: "var(--status-good)",
  neutral: "var(--status-warning)",
  hold: "var(--status-warning)",
  sell: "var(--status-critical)",
  strong_sell: "var(--status-critical)",
};

function zoneLabel(zone: string): string {
  return zone.replace("_", " ").toUpperCase();
}

function ZoneBadge({ zone }: { zone: string }) {
  const color = ZONE_COLOR[zone] ?? "var(--text-muted)";
  const strong = zone.startsWith("strong");
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: strong ? 800 : 600,
        color,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
      }}
    >
      {zoneLabel(zone)}
    </span>
  );
}

export function TradeGuidancePanel() {
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [guidance, setGuidance] = useState<TradeGuidance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAll(isBackgroundRefresh = false) {
    if (!isBackgroundRefresh) setLoading(true);
    try {
      const [s, g] = await Promise.all([api.technicalSignals(), api.tradeGuidance()]);
      setSignals(s);
      setGuidance(g);
    } catch (err) {
      if (!isBackgroundRefresh) setError(extractErrorDetail(err));
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // Prices only actually change when the backend's own 20-minute market-data
    // refresh runs - this just makes sure an already-open page picks that up
    // promptly instead of showing a stale snapshot until the user navigates away
    // and back (which was the actual bug: this page never re-fetched at all).
    const interval = setInterval(() => loadAll(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  async function handleRefresh() {
    setError(null);
    setRefreshing(true);
    try {
      await api.refreshTradeGuidance();
      const g = await api.tradeGuidance();
      setGuidance(g);
    } catch (err) {
      setError(extractErrorDetail(err));
    } finally {
      setRefreshing(false);
    }
  }

  const callByTicker = new Map(guidance?.calls.map((c) => [c.ticker, c]) ?? []);

  return (
    <Card padding="18px 20px">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Technical signals & AI trade guidance</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
            Zone badges are computed directly from price history (RSI, momentum, trend) - no AI involved. The AI
            call column needs a refresh.
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || signals.length === 0}
          style={{
            flexShrink: 0,
            background: "var(--brand-gradient)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            boxShadow: "0 4px 14px rgba(236, 72, 153, 0.28)",
          }}
        >
          {refreshing ? "Asking AI..." : "Get AI Guidance"}
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</div>
      ) : signals.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          No equity holdings with enough price history yet - add holdings or sync your broker first.
        </div>
      ) : (
        <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 12 }}>
              <th style={{ paddingBottom: 6 }}>Ticker</th>
              <th>Price</th>
              <th>Change</th>
              <th>RSI(14)</th>
              <th>Technical zone</th>
              <th>AI call</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => {
              const call = callByTicker.get(s.ticker);
              return (
                <tr key={s.ticker} style={{ borderTop: "1px solid var(--gridline)", verticalAlign: "top" }}>
                  <td style={{ padding: "8px 0", fontWeight: 600 }}>{s.ticker}</td>
                  <td>{formatPrice(s.price, s.ticker)}</td>
                  <td
                    style={{
                      fontWeight: 600,
                      color:
                        s.change_pct === null
                          ? "var(--text-muted)"
                          : s.change_pct >= 0
                            ? "var(--status-good)"
                            : "var(--status-critical)",
                    }}
                  >
                    {s.change_pct !== null ? `${s.change_pct >= 0 ? "+" : ""}${s.change_pct.toFixed(2)}%` : "-"}
                  </td>
                  <td>{s.rsi !== null ? s.rsi.toFixed(0) : "-"}</td>
                  <td>
                    <ZoneBadge zone={s.zone} />
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    {call ? (
                      <div>
                        <ZoneBadge zone={call.call} />
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                          {call.rationale}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Not requested yet</span>
                    )}
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{call?.confidence ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {guidance?.overall_note && (
        <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 14, lineHeight: 1.6 }}>
          {guidance.overall_note}
        </p>
      )}

      {error && <div style={{ color: "var(--status-critical)", fontSize: 12, marginTop: 10 }}>{error}</div>}

      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--gridline)", lineHeight: 1.5 }}>
        {guidance?.disclaimer ??
          "Generated from quantitative technical signals and macro data only. Not registered investment advice, not personalized to your full financial situation, and not a guarantee of future performance. You are solely responsible for your own trading decisions."}
      </p>
    </Card>
  );
}
