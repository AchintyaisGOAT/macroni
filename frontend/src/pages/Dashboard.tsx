import { useEffect, useState } from "react";
import { api, type InvestmentTip, type RegimeReport, type Signal, type Status } from "../api/client";
import { FreshnessBar } from "../components/FreshnessBar";
import { InvestmentTips } from "../components/InvestmentTips";
import { RegimeNarrative } from "../components/RegimeNarrative";
import { StatTile } from "../components/StatTile";

export function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [regime, setRegime] = useState<RegimeReport | null>(null);
  const [tips, setTips] = useState<InvestmentTip[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataRefreshing, setDataRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const [signalsData, regimeData, tipsData, statusData] = await Promise.all([
      api.signals(),
      api.regime(),
      api.tips(),
      api.status(),
    ]);
    setSignals(signalsData);
    setRegime(regimeData);
    setTips(tipsData.tips);
    setStatus(statusData);
    setLoading(false);

    const histories = await Promise.all(
      signalsData.map((s) => api.signalHistory(s.name, 60).then((h) => [s.name, h.map((x) => x.value)] as const))
    );
    setHistory(Object.fromEntries(histories));
  }

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function handleRefreshRegime() {
    setRefreshing(true);
    try {
      const result = await api.refreshRegime();
      const updated = await api.regime();
      setRegime(updated);
      setStatus((prev) => (prev ? { ...prev, last_regime_status: result } : prev));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRefreshTips() {
    const [updated, statusData] = await Promise.all([api.tips(), api.status()]);
    setTips(updated.tips);
    setStatus(statusData);
  }

  async function handleDataRefresh() {
    setDataRefreshing(true);
    try {
      await api.refreshData();
      await loadAll();
    } finally {
      setDataRefreshing(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <FreshnessBar lastUpdated={status?.last_updated ?? null} onRefresh={handleDataRefresh} refreshing={dataRefreshing} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        <RegimeNarrative
          report={regime}
          status={status?.last_regime_status ?? null}
          onRefresh={handleRefreshRegime}
          refreshing={refreshing}
        />
        <InvestmentTips tips={tips} status={status?.last_tips_status ?? null} onRefresh={handleRefreshTips} />
      </div>

      {status && !status.fred_configured && (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          FRED_API_KEY is not configured - macro signals (inflation, growth, yield curve, etc.) will
          appear once it's set in your .env file. Market-based signals (credit, volatility, risk-on/off)
          work already.
        </div>
      )}

      <div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>Signals</div>
        {loading ? (
          <div style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : signals.length === 0 ? (
          <div style={{ color: "var(--text-muted)" }}>
            No signals yet - the app fetches data on startup, this can take a minute on first run.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {signals.map((s) => (
              <StatTile key={s.name} signal={s} history={history[s.name] ?? []} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
