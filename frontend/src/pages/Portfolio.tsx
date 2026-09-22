import { useEffect, useRef, useState } from "react";
import { api, type Exposures, type Holding, type LiveQuote, type TechnicalSignal, type TickerSearchResult } from "../api/client";
import { Card } from "../components/Card";
import { CategoryBreakdown } from "../components/CategoryBreakdown";
import { TickerSearchInput } from "../components/TickerSearchInput";
import { TradeGuidancePanel } from "../components/TradeGuidancePanel";
import { formatPrice, uniformCurrencySymbol } from "../currency";

const ASSET_CLASSES = ["equity", "bond", "commodity", "fx", "cash", "other"];

export function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [exposures, setExposures] = useState<Exposures | null>(null);
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>({});
  const [ticker, setTicker] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [assetClass, setAssetClass] = useState("equity");
  const [region, setRegion] = useState("US");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadAll() {
    const [h, e, s] = await Promise.all([api.holdings(), api.exposures(), api.technicalSignals()]);
    setHoldings(h);
    setExposures(e);
    setSignals(s);
  }

  useEffect(() => {
    loadAll();
    // Prices only actually move when the backend's own 20-minute market-data
    // refresh runs - this just makes sure an already-open Portfolio page picks
    // that up promptly instead of staying frozen at whatever price was current
    // when the page first loaded.
    const interval = setInterval(loadAll, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fast live-price layer, on top of the slower 60s cycle above (which handles
  // beta/weight/technical-zone, none of which change second to second). For
  // anything actually held via a connected Angel One account, the backend
  // serves this from its own real-time WebSocket feed - the exchange pushing
  // ticks the instant a trade happens, not us polling for one - so this can
  // afford to poll quite often; it's just an in-memory lookup on the backend
  // for those tickers, not a fresh external call each time. Anything not
  // covered by that (broker not connected, or a non-broker holding) falls back
  // to Yahoo's own delayed quote, same as Global Markets.
  useEffect(() => {
    function loadLiveQuotes() {
      api
        .portfolioLiveQuotes()
        .then((quotes) => {
          setLiveQuotes(Object.fromEntries(quotes.map((q) => [q.ticker, q])));
        })
        .catch(() => {
          // Best-effort - the slower 60s refresh will eventually catch up.
        });
    }
    loadLiveQuotes();
    const interval = setInterval(loadLiveQuotes, 2_000);
    return () => clearInterval(interval);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qty = parseFloat(quantity);
    if (!ticker.trim() || Number.isNaN(qty)) {
      setError("Enter a ticker and a numeric quantity");
      return;
    }
    try {
      await api.addHolding({ ticker: ticker.trim().toUpperCase(), quantity: qty, asset_class: assetClass, region });
      setTicker("");
      setSelectedName("");
      setQuantity("");
      await loadAll();
    } catch (err) {
      setError(String(err));
    }
  }

  function handleSelectTicker(result: TickerSearchResult) {
    setTicker(result.symbol);
    setSelectedName(result.name);
    if (result.quote_type === "EQUITY") {
      setAssetClass("equity");
    }
  }

  async function handleDelete(id: number) {
    await api.deleteHolding(id);
    await loadAll();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await api.importHoldingsCsv(file);
      await loadAll();
    } catch (err) {
      setError(String(err));
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-1)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 12px",
    color: "var(--text-primary)",
    fontSize: 13,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card padding="18px 20px">
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>Add holding</div>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <TickerSearchInput
            value={ticker}
            onChange={(v) => {
              setTicker(v);
              setSelectedName("");
            }}
            onSelect={handleSelectTicker}
          />
          <input style={inputStyle} placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <select style={inputStyle} value={assetClass} onChange={(e) => setAssetClass(e.target.value)}>
            {ASSET_CLASSES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input style={inputStyle} placeholder="Region (e.g. US)" value={region} onChange={(e) => setRegion(e.target.value)} />
          <button
            type="submit"
            style={{
              background: "var(--brand-gradient)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 4px 14px rgba(236, 72, 153, 0.28)",
            }}
          >
            Add
          </button>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>or</span>
          <input ref={fileInput} type="file" accept=".csv" onChange={handleImport} style={{ fontSize: 12 }} />
        </form>
        {selectedName && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
            Selected: <strong style={{ color: "var(--text-primary)" }}>{ticker}</strong> — {selectedName}
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          Type a company name or ticker above and pick from the dropdown, or import a CSV. CSV columns:
          ticker,quantity,asset_class,region (import replaces all holdings).
        </div>
        {error && <div style={{ color: "var(--status-critical)", fontSize: 12, marginTop: 8 }}>{error}</div>}
      </Card>

      <Card padding="18px 20px">
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>Holdings</div>
        {holdings.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No holdings yet.</div>
        ) : (
          <table style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 12 }}>
                <th style={{ paddingBottom: 6 }}>Ticker</th>
                <th>Quantity</th>
                <th>Asset class</th>
                <th>Region</th>
                <th>Value</th>
                <th>Day change</th>
                <th>Weight</th>
                <th>Beta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const detail = exposures?.holdings.find((d) => d.ticker === h.ticker);
                const signal = signals.find((s) => s.ticker === h.ticker);
                const live = liveQuotes[h.ticker];
                const value = live ? live.price * h.quantity : detail?.value;
                const changePct = live ? live.change_pct : signal?.change_pct;
                return (
                  <tr key={h.id} style={{ borderTop: "1px solid var(--gridline)" }}>
                    <td style={{ padding: "6px 0" }}>{h.ticker}</td>
                    <td>{h.quantity}</td>
                    <td>{h.asset_class}</td>
                    <td>{h.region}</td>
                    <td>{value ? formatPrice(value, h.ticker, 0) : "-"}</td>
                    <td
                      style={{
                        fontWeight: 600,
                        color:
                          changePct == null
                            ? "var(--text-muted)"
                            : changePct >= 0
                              ? "var(--status-good)"
                              : "var(--status-critical)",
                      }}
                    >
                      {changePct != null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : "-"}
                    </td>
                    <td>{detail?.weight ? `${(detail.weight * 100).toFixed(1)}%` : "-"}</td>
                    <td>{detail?.beta !== null && detail?.beta !== undefined ? detail.beta.toFixed(2) : "-"}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(h.id)}
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
      </Card>

      <TradeGuidancePanel />

      {exposures && exposures.total_value > 0 && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Card padding="16px 20px" style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total value</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
                {(() => {
                  const symbol = uniformCurrencySymbol(holdings.map((h) => h.ticker));
                  // Prefer the live quote's price where we have one, falling back to
                  // the slower exposures snapshot for anything the live layer hasn't
                  // returned yet - keeps the total moving with the per-row values above
                  // instead of jumping only once a minute.
                  const total = holdings.reduce((sum, h) => {
                    const live = liveQuotes[h.ticker];
                    if (live) return sum + live.price * h.quantity;
                    const detail = exposures.holdings.find((d) => d.ticker === h.ticker);
                    return sum + (detail?.value ?? 0);
                  }, 0);
                  const amount = total.toLocaleString(undefined, { maximumFractionDigits: 0 });
                  // Holdings across different currencies (e.g. a US stock and an Indian
                  // one) can't be summed into one meaningful total without an FX
                  // conversion this app doesn't do - flagging that plainly beats
                  // silently labeling a mixed-currency sum with one wrong symbol.
                  return symbol ? `${symbol}${amount}` : `${amount} (mixed currencies)`;
                })()}
              </div>
            </Card>
            <Card padding="16px 20px" style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Portfolio beta (vs SPY)</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
                {exposures.portfolio_beta !== null ? exposures.portfolio_beta.toFixed(2) : "n/a"}
              </div>
            </Card>
            <Card padding="16px 20px" style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Bond duration (approx.)</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
                {exposures.portfolio_duration_years !== null ? `${exposures.portfolio_duration_years.toFixed(1)}y` : "n/a"}
              </div>
            </Card>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <CategoryBreakdown title="By asset class" data={exposures.by_asset_class} />
            <CategoryBreakdown title="By region" data={exposures.by_region} />
            {Object.keys(exposures.by_sector).length > 0 && (
              <CategoryBreakdown title="By sector (equities)" data={exposures.by_sector} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
