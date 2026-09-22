import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ExchangeStatus, type RegionSignal } from "../api/client";
import { Card } from "../components/Card";
import { Dot } from "../components/Dot";
import { PageHeader } from "../components/PageHeader";
import { loadingTextStyle, pillStyle, sectionLabelStyle } from "../styles";

function formatCountdown(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "any moment now";
  const totalMin = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const VOL_COLOR: Record<string, string> = {
  elevated: "var(--status-critical)",
  normal: "var(--status-warning)",
  subdued: "var(--status-good)",
};

function RegionCard({ r }: { r: RegionSignal }) {
  const returnColor =
    r.return_1m_pct === null ? "var(--text-muted)" : r.return_1m_pct >= 0 ? "var(--status-good)" : "var(--status-critical)";
  return (
    <Card padding="16px 18px">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>
            {r.index_name} ({r.index_ticker})
          </div>
        </div>
        {r.volatility_label && (
          <span style={{ ...pillStyle(VOL_COLOR[r.volatility_label] ?? "var(--text-muted)"), textTransform: "uppercase", fontSize: 10.5 }}>
            {r.volatility_label} vol
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 12, letterSpacing: -0.5 }}>
        {r.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
      <div style={{ fontSize: 12, marginTop: 6, display: "flex", gap: 12 }}>
        <span style={{ color: "var(--text-secondary)" }}>
          1m return:{" "}
          <strong style={{ color: returnColor }}>
            {r.return_1m_pct !== null ? `${r.return_1m_pct >= 0 ? "+" : ""}${r.return_1m_pct.toFixed(1)}%` : "n/a"}
          </strong>
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
        {r.volatility_source === "implied"
          ? `Implied volatility: ${r.volatility_value?.toFixed(1)}`
          : r.volatility_source === "realized_percentile"
            ? `Realized vol percentile (1y): ${r.volatility_value?.toFixed(0)}th`
            : ""}
      </div>
      <Link
        to={`/markets/${r.code}/stocks`}
        style={{
          display: "inline-block",
          marginTop: 12,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-primary)",
          textDecoration: "none",
          borderTop: "1px solid var(--gridline)",
          paddingTop: 10,
          width: "100%",
        }}
      >
        Browse stocks &rarr;
      </Link>
    </Card>
  );
}

export function GlobalMarkets() {
  const [exchanges, setExchanges] = useState<ExchangeStatus[]>([]);
  const [regions, setRegions] = useState<RegionSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [, forceTick] = useState(0);

  async function load() {
    const data = await api.marketHours();
    setExchanges(data);
    setLoading(false);
  }

  async function loadRegions() {
    const data = await api.regionSignals();
    setRegions(data);
    setRegionsLoading(false);
  }

  useEffect(() => {
    load();
    loadRegions();
    const dataInterval = setInterval(load, 60_000);
    const regionInterval = setInterval(loadRegions, 5 * 60_000);
    const tickInterval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(regionInterval);
      clearInterval(tickInterval);
    };
  }, []);

  const openCount = exchanges.filter((e) => e.is_open).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Global Markets" subtitle="Exchange hours and regional performance" />

      <Card padding="14px 20px">
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {loading ? "Loading..." : `${openCount} of ${exchanges.length} major markets open right now`}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
          Regular trading-session hours shown in each exchange's own local time. Public holidays and
          intraday lunch breaks (e.g. Tokyo, Hong Kong, Shanghai) aren't accounted for, so a market can
          briefly show "open" when it's actually on a local holiday.
        </div>
      </Card>

      {loading ? (
        <div style={loadingTextStyle}>Loading...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
          {exchanges.map((e) => (
            <Card key={e.code} padding="16px 18px">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{e.code}</div>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: e.is_open ? "var(--status-good)" : "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  <Dot color={e.is_open ? "var(--status-good)" : "var(--text-muted)"} size={7} />
                  {e.is_open ? "Open" : "Closed"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{e.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{e.region}</div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 12, letterSpacing: -0.5 }}>
                {new Date(e.local_time).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: e.timezone,
                })}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                {e.next_change_label === "opens" ? "Opens in " : "Closes in "}
                <strong style={{ color: "var(--text-primary)" }}>{formatCountdown(e.next_change_at)}</strong>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ ...sectionLabelStyle, marginTop: 6 }}>Regional performance</div>
      {regionsLoading ? (
        <div style={loadingTextStyle}>Loading...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
          {regions.map((r) => (
            <RegionCard key={r.code} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
