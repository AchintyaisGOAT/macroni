import { useEffect, useState } from "react";
import { api, type TradeGuidance, type WatchlistItemT } from "../api/client";
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

const inputStyle: React.CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
};

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
      <Card padding="14px 20px">
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Stocks you're tracking, from any market - separate from your Portfolio, which reflects what you
          actually own (synced from your broker). Adding something here doesn't buy it or affect your real
          holdings in any way.
        </div>
      </Card>

      <Card padding="16px 18px">
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Ticker, e.g. AAPL, RELIANCE.NS, 7203.T"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
          />
          <button
            type="submit"
            disabled={!ticker.trim()}
            style={{
              background: "var(--brand-gradient)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Add
          </button>
        </form>
      </Card>

      <Card padding="18px 20px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
            Your watchlist ({items.length})
          </div>
          <button
            onClick={handleGuidanceRefresh}
            disabled={refreshing || items.length === 0}
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
        ) : items.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
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
                    <td>
                      <button
                        onClick={() => handleRemove(item.id)}
                        style={{ background: "transparent", border: "none", color: "var(--status-critical)", fontSize: 12 }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {guidance?.overall_note && (
          <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 14, lineHeight: 1.6 }}>{guidance.overall_note}</p>
        )}

        {error && <div style={{ color: "var(--status-critical)", fontSize: 12, marginTop: 10 }}>{error}</div>}

        {items.length > 0 && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--gridline)", lineHeight: 1.5 }}>
            {guidance?.disclaimer ??
              "Generated from quantitative technical signals and macro data only. Not registered investment advice, not personalized to your full financial situation, and not a guarantee of future performance. You are solely responsible for your own trading decisions."}
          </p>
        )}
      </Card>
    </div>
  );
}
