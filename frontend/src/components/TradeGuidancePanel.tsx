import { useEffect, useState } from "react";
import { api, type TechnicalSignal, type TradeGuidance } from "../api/client";
import { Card } from "../components/Card";
import { formatPrice } from "../currency";
import { extractErrorDetail } from "../lib/errors";
import { emptyTextStyle, errorTextStyle, loadingTextStyle } from "../styles";
import { AiCallCell, GuidanceFooter, GuidanceHeader } from "./GuidanceParts";
import { ZoneBadge } from "./ZoneBadge";

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
      <GuidanceHeader
        title="Technical signals & AI trade guidance"
        subtitle="Zone badges are computed directly from price history (RSI, momentum, trend) - no AI involved. The AI call column needs a refresh."
        onRefresh={handleRefresh}
        refreshing={refreshing}
        disabled={signals.length === 0}
      />

      {loading ? (
        <div style={loadingTextStyle}>Loading...</div>
      ) : signals.length === 0 ? (
        <div style={emptyTextStyle}>No equity holdings with enough price history yet - add holdings or sync your broker first.</div>
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
                    <AiCallCell call={call} />
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{call?.confidence ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <GuidanceFooter guidance={guidance} />

      {error && <div style={{ ...errorTextStyle, marginTop: 10 }}>{error}</div>}
    </Card>
  );
}
