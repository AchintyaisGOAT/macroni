import { useEffect, useRef, useState } from "react";
import { api, type Exposures, type Holding, type TickerSearchResult } from "../api/client";
import { Card } from "../components/Card";
import { CategoryBreakdown } from "../components/CategoryBreakdown";
import { TickerSearchInput } from "../components/TickerSearchInput";

const ASSET_CLASSES = ["equity", "bond", "commodity", "fx", "cash", "other"];

export function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [exposures, setExposures] = useState<Exposures | null>(null);
  const [ticker, setTicker] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [assetClass, setAssetClass] = useState("equity");
  const [region, setRegion] = useState("US");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadAll() {
    const [h, e] = await Promise.all([api.holdings(), api.exposures()]);
    setHoldings(h);
    setExposures(e);
  }

  useEffect(() => {
    loadAll();
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
                <th>Weight</th>
                <th>Beta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const detail = exposures?.holdings.find((d) => d.ticker === h.ticker);
                return (
                  <tr key={h.id} style={{ borderTop: "1px solid var(--gridline)" }}>
                    <td style={{ padding: "6px 0" }}>{h.ticker}</td>
                    <td>{h.quantity}</td>
                    <td>{h.asset_class}</td>
                    <td>{h.region}</td>
                    <td>{detail?.value ? `$${detail.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}</td>
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

      {exposures && exposures.total_value > 0 && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Card padding="16px 20px" style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total value</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
                ${exposures.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
