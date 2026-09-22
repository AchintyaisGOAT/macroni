import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type MarketStock, type TickerSearchResult } from "../api/client";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ZoneBadge } from "../components/ZoneBadge";
import { formatPrice } from "../currency";
import { extractErrorDetail } from "../lib/errors";
import { emptyTextStyle, errorTextStyle, inputStyle, loadingTextStyle, sectionLabelStyle } from "../styles";

// A quiet icon-only toggle, not a loud gradient CTA - this repeats down every
// row of a table (sometimes 20+ times), so the "add one item" action needs
// to read as routine, not as 20 competing calls-to-action stacked on top of
// each other.
function AddToWatchlistButton({ added, onClick }: { added: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={added}
      title={added ? "Already on your watchlist" : "Add to watchlist"}
      aria-label={added ? "Already on your watchlist" : "Add to watchlist"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        background: added ? "transparent" : "var(--page-plane)",
        color: added ? "var(--status-good)" : "var(--brand-pink)",
        border: "none",
        borderRadius: "var(--radius-sm)",
        flexShrink: 0,
      }}
    >
      {added ? <Check size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
    </button>
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
    // Technical zones only need the slower 20-minute-refresh cycle - RSI/trend
    // don't meaningfully change second to second.
    const interval = setInterval(() => load(true), 60_000);
    return () => clearInterval(interval);
  }, [code]);

  // Fast live-price layer: fast_info is a lightweight quote lookup (a few hundred
  // ms for a whole market's worth of tickers), unlike the full daily-history pull
  // above, so it's cheap enough to poll every few seconds for a genuinely
  // live-feeling price - still Yahoo's free, exchange-delayed quote underneath,
  // not a true real-time tick feed, but far closer to "live" than a 20-minute
  // refresh. Only touches price/change_pct - zone/score stay on the slower cycle.
  useEffect(() => {
    if (!code) return;

    function loadLiveQuotes() {
      api
        .marketLiveQuotes(code!)
        .then((quotes) => {
          const byTicker = new Map(quotes.map((q) => [q.ticker, q]));
          setStocks((prev) =>
            prev.map((s) => {
              const q = byTicker.get(s.ticker);
              return q ? { ...s, price: q.price, change_pct: q.change_pct } : s;
            })
          );
        })
        .catch(() => {
          // Best-effort - the slower 60s refresh above will eventually catch up.
        });
    }

    const interval = setInterval(loadLiveQuotes, 5_000);
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
      <PageHeader
        title={`${code} stocks`}
        subtitle="Search reaches any listed stock, not just the curated list below"
        actions={
          <Link to="/markets" style={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 600, textDecoration: "none" }}>
            &larr; Back to Global Markets
          </Link>
        }
      />

      <Card padding="14px 20px">
        <div style={{ fontSize: 13, fontWeight: 600 }}>{code} - search & major stocks</div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
          Technical zones are computed directly from price history, no AI involved.
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${code} stocks by name or ticker...`}
          style={{ ...inputStyle, marginTop: 12, width: "100%", fontSize: 13.5 }}
        />
      </Card>

      {query.trim() && (
        <Card padding="16px 18px">
          <div style={{ ...sectionLabelStyle, fontSize: 12, marginBottom: 10 }}>
            {searching ? "Searching..." : `Search results (${searchResults.length})`}
          </div>
          {!searching && searchResults.length === 0 ? (
            <div style={emptyTextStyle}>No matches found in {code}.</div>
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
                    <AddToWatchlistButton added={added} onClick={() => handleAdd(r.symbol, r.name)} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <div style={sectionLabelStyle}>Popular stocks</div>

      {loading ? (
        <div style={loadingTextStyle}>Loading...</div>
      ) : error ? (
        <div style={errorTextStyle}>{error}</div>
      ) : stocks.length === 0 ? (
        <div style={emptyTextStyle}>No stocks available for this market.</div>
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
                      <AddToWatchlistButton added={added} onClick={() => handleAdd(s.ticker, s.name)} />
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
