import { useEffect, useState } from "react";
import { api, type TradeGuidance, type WatchlistItemT } from "../api/client";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { AiCallCell, GuidanceFooter, GuidanceHeader } from "../components/GuidanceParts";
import { PageHeader } from "../components/PageHeader";
import { Table } from "../components/Table";
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
          <Table
            rows={items}
            rowKey={(item) => item.id}
            columns={[
              {
                header: "Ticker",
                cellStyle: { fontWeight: 600 },
                render: (item) => (
                  <>
                    {item.ticker}
                    {item.name && <div style={{ fontWeight: 400, fontSize: 11.5, color: "var(--text-muted)" }}>{item.name}</div>}
                  </>
                ),
              },
              { header: "Price", render: (item) => (item.price !== null ? formatPrice(item.price, item.ticker) : "-") },
              {
                header: "Change",
                render: (item) => (
                  <span
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
                  </span>
                ),
              },
              { header: "Technical zone", render: (item) => (item.zone ? <ZoneBadge zone={item.zone} /> : "-") },
              {
                header: "AI call",
                cellStyle: { maxWidth: 320 },
                render: (item) => <AiCallCell call={callByTicker.get(item.ticker)} />,
              },
              {
                header: "",
                render: (item) => (
                  <Button variant="danger" onClick={() => handleRemove(item.id)}>
                    Remove
                  </Button>
                ),
              },
            ]}
          />
        )}

        <GuidanceFooter guidance={guidance} />

        {error && <div style={{ ...errorTextStyle, marginTop: 10 }}>{error}</div>}
      </Card>
    </div>
  );
}
