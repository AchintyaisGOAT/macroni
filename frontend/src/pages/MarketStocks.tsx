import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type MarketStock, type TickerSearchResult } from "../api/client";
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
  sell: "var(--status-critical)",
  strong_sell: "var(--status-critical)",
};

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
      {zone.replace("_", " ").toUpperCase()}
    </span>
  );
}

export function MarketStocks() {
  const { code } = useParams<{ code: string }>();
  const [stocks, setStocks] = useState<MarketStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedTickers, setAddedTickers] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TickerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!code) return;

    function load(isBackgroundRefresh = false) {
      if (!isBackgroundRefresh) setLoading(true);
      setError(null);
      api
        .marketStocks(code!)
        .then(setStocks)
        .catch((err) => setError(extractErrorDetail(err)))
        .finally(() => {
          if (!isBackgroundRefresh) setLoading(false);
        });
    }

    load();
    // Same reasoning as elsewhere: prices only move when the backend's 20-minute
    // refresh runs, but this page should reflect that without needing a re-visit.
    const interval = setInterval(() => load(true), 60_000);
    return () => clearInterval(interval);
  }, [code]);

  useEffect(() => {
    if (!code || !query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .searchMarketStocks(code, query.trim())
        .then(setSearchResults)
        .catch((err) => setError(extractErrorDetail(err)))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [code, query]);

  async function handleAdd(ticker: string, name: string) {
    try {
      await api.addToWatchlist(ticker, name, code ?? "");
      setAddedTickers((prev) => new Set(prev).add(ticker));
    } catch (err) {
      setError(extractErrorDetail(err));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link to="/markets" style={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 600, textDecoration: "none" }}>
        &larr; Back to Global Markets
      </Link>

      <Card padding="14px 20px">
        <div style={{ fontSize: 13, fontWeight: 600 }}>{code} - search & major stocks</div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
          Search reaches any stock listed on this market, small or large cap - not just the curated list
          below. Technical zones are computed directly from price history, no AI involved.
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${code} stocks by name or ticker...`}
          style={{
            marginTop: 12,
            width: "100%",
            background: "var(--page-plane)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            color: "var(--text-primary)",
            fontSize: 13.5,
          }}
        />
      </Card>

      {query.trim() && (
        <Card padding="16px 18px">
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>
            {searching ? "Searching..." : `Search results (${searchResults.length})`}
          </div>
          {!searching && searchResults.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No matches found in {code}.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.map((r) => {
                const added = addedTickers.has(r.symbol);
                return (
                  <div
                    key={r.symbol}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--gridline)" }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{r.symbol}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>{r.name}</span>
                    </div>
                    <button
                      onClick={() => handleAdd(r.symbol, r.name)}
                      disabled={added}
                      style={{
                        background: added ? "transparent" : "var(--brand-gradient)",
                        color: added ? "var(--text-muted)" : "#fff",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {added ? "Added" : "+ Watchlist"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Popular stocks</div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</div>
      ) : error ? (
        <div style={{ color: "var(--status-critical)", fontSize: 13 }}>{error}</div>
      ) : stocks.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No stocks available for this market.</div>
      ) : (
        <Card padding="18px 20px">
          <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 12 }}>
                <th style={{ paddingBottom: 6 }}>Stock</th>
                <th>Price</th>
                <th>Change</th>
                <th>Technical zone</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => {
                const changeColor =
                  s.change_pct === null ? "var(--text-muted)" : s.change_pct >= 0 ? "var(--status-good)" : "var(--status-critical)";
                const added = addedTickers.has(s.ticker);
                return (
                  <tr key={s.ticker} style={{ borderTop: "1px solid var(--gridline)" }}>
                    <td style={{ padding: "8px 0" }}>
                      <div style={{ fontWeight: 600 }}>{s.ticker}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{s.name}</div>
                    </td>
                    <td>{formatPrice(s.price, s.ticker)}</td>
                    <td style={{ color: changeColor, fontWeight: 600 }}>
                      {s.change_pct !== null ? `${s.change_pct >= 0 ? "+" : ""}${s.change_pct.toFixed(2)}%` : "-"}
                    </td>
                    <td>{s.zone ? <ZoneBadge zone={s.zone} /> : "-"}</td>
                    <td>
                      <button
                        onClick={() => handleAdd(s.ticker, s.name)}
                        disabled={added}
                        style={{
                          background: added ? "transparent" : "var(--brand-gradient)",
                          color: added ? "var(--text-muted)" : "#fff",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          padding: "6px 14px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {added ? "Added" : "+ Watchlist"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
