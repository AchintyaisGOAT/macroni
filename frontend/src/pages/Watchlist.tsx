import { useEffect, useState } from "react";
import { api, type TradeGuidance, type WatchlistItemT } from "../api/client";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { AiCallCell, GuidanceFooter, GuidanceHeader } from "../components/GuidanceParts";
import { PageHeader } from "../components/PageHeader";
import { ZoneBadge } from "../components/ZoneBadge";
import { formatPrice } from "../currency";
import { extractErrorDetail } from "../lib/errors";
import { emptyTextStyle, errorTextStyle, inputStyle, loadingTextStyle } from "../styles";

export function Watchlist() {
  const [items, setItems] = useState<WatchlistItemT[]>([]);
  const [guidance, setGuidance] = useState<TradeGuidance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadAll(isBackgroundRefresh = false) {
    if (!isBackgroundRefresh) setLoading(true);
    try {
      const [i, g] = await Promise.all([api.watchlist(), api.watchlistGuidance()]);
      setItems(i);
      setGuidance(g);
    } catch (err) {
      if (!isBackgroundRefresh) setError(extractErrorDetail(err));
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => loadAll(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    setError(null);
    try {
      await api.addToWatchlist(ticker.trim().toUpperCase());
      setTicker("");
      await loadAll();
    } catch (err) {
      setError(extractErrorDetail(err));
    }
  }

  async function handleRemove(id: number) {
    try {
      await api.removeFromWatchlist(id);
      await loadAll();
    } catch (err) {
      setError(extractErrorDetail(err));
    }
  }

  async function handleGuidanceRefresh() {
    setError(null);
    setRefreshing(true);
    try {
      await api.refreshWatchlistGuidance();
      const g = await api.watchlistGuidance();
      setGuidance(g);
    } catch (err) {
      setError(extractErrorDetail(err));
    } finally {
      setRefreshing(false);
    }
  }

  const callByTicker = new Map(guidance?.calls.map((c) => [c.ticker, c]) ?? []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Watchlist" subtitle="Stocks you're tracking - separate from your actual Portfolio holdings" />

      <Card padding="16px 18px">
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Ticker, e.g. AAPL, RELIANCE.NS, 7203.T"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
          />
          <Button type="submit" disabled={!ticker.trim()}>
            Add
          </Button>
        </form>
      </Card>

      <Card padding="18px 20px">
        <GuidanceHeader
          title={`Your watchlist (${items.length})`}
          onRefresh={handleGuidanceRefresh}
          refreshing={refreshing}
          disabled={items.length === 0}
        />

        {loading ? (
          <div style={loadingTextStyle}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={emptyTextStyle}>
            Nothing here yet - add a ticker above, or browse a market under Global Markets and add stocks
            from there.
          </div>
        ) : (
          <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 12 }}>
                <th style={{ paddingBottom: 6 }}>Ticker</th>
                <th>Price</th>
                <th>Change</th>
                <th>Technical zone</th>
                <th>AI call</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const call = callByTicker.get(item.ticker);
                return (
                  <tr key={item.id} style={{ borderTop: "1px solid var(--gridline)", verticalAlign: "top" }}>
                    <td style={{ padding: "8px 0", fontWeight: 600 }}>
                      {item.ticker}
                      {item.name && <div style={{ fontWeight: 400, fontSize: 11.5, color: "var(--text-muted)" }}>{item.name}</div>}
                    </td>
                    <td>{item.price !== null ? formatPrice(item.price, item.ticker) : "-"}</td>
                    <td
                      style={{
                        fontWeight: 600,
                        color:
                          item.change_pct === null
                            ? "var(--text-muted)"
                            : item.change_pct >= 0
                              ? "var(--status-good)"
                              : "var(--status-critical)",
                      }}
                    >
                      {item.change_pct !== null ? `${item.change_pct >= 0 ? "+" : ""}${item.change_pct.toFixed(2)}%` : "-"}
                    </td>
                    <td>{item.zone ? <ZoneBadge zone={item.zone} /> : "-"}</td>
                    <td style={{ maxWidth: 320 }}>
                      <AiCallCell call={call} />
                    </td>
                    <td>
                      <Button variant="danger" onClick={() => handleRemove(item.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <GuidanceFooter guidance={guidance} />

        {error && <div style={{ ...errorTextStyle, marginTop: 10 }}>{error}</div>}
      </Card>
    </div>
  );
}
