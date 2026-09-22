import { useEffect, useMemo, useState } from "react";
import {
  api,
  type Exposures,
  type Holding,
  type InvestmentTip,
  type LiveQuote,
  type RegimeReport,
  type Signal,
  type Status,
} from "../api/client";
import { FreshnessBar } from "../components/FreshnessBar";
import { InvestmentTips } from "../components/InvestmentTips";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { PortfolioSnapshot } from "../components/PortfolioSnapshot";
import { RegimeNarrative } from "../components/RegimeNarrative";
import { Sparkline } from "../components/Sparkline";
import { DeltaPill, StatTile } from "../components/StatTile";
import {
  CATEGORY_ORDER,
  formatSignalName,
  formatSignalValue,
  SEVERITY_COLOR,
  signalCategory,
  signalDeltaPct,
  signalSeverity,
  signalTrendColor,
  type Severity,
} from "../lib/signals";

const SEVERITY_RANK: Record<Severity, number> = { extreme: 0, elevated: 1, good: 2 };

const LEGEND: { severity: Severity; label: string }[] = [
  { severity: "good", label: "Normal" },
  { severity: "elevated", label: "Elevated" },
  { severity: "extreme", label: "Extreme" },
];

const LEGEND_COLOR: Record<Severity, string> = {
  good: "var(--status-good)",
  elevated: "var(--status-warning)",
  extreme: "var(--status-serious)",
};

const HISTORY_OPTIONS = [30, 60, 120];

// The one composite signal that already encodes a risk-on/neutral/risk-off
// read (see backend/app/signals/composite.py) - reused here instead of
// guessing sentiment from the narrative's prose, which would be fragile.
function regimeBadge(signals: Signal[]): { text: string; color: string } | null {
  const risk = signals.find((s) => s.name === "risk_on_off_composite");
  if (!risk) return null;
  const color = risk.value > 0.15 ? "var(--status-good)" : risk.value < -0.15 ? "var(--status-critical)" : "var(--text-secondary)";
  return { text: formatSignalName(risk.label || "Neutral"), color };
}

export function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [regime, setRegime] = useState<RegimeReport | null>(null);
  const [tips, setTips] = useState<InvestmentTip[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [exposures, setExposures] = useState<Exposures | null>(null);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [dataRefreshing, setDataRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [historyLimit, setHistoryLimit] = useState(60);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  async function loadAll(limit: number) {
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
      signalsData.map((s) => api.signalHistory(s.name, limit).then((h) => [s.name, h.map((x) => x.value)] as const))
    );
    setHistory(Object.fromEntries(histories));
  }

  useEffect(() => {
    loadAll(historyLimit);
    const interval = setInterval(() => loadAll(historyLimit), 60_000);
    return () => clearInterval(interval);
  }, [historyLimit]);

  async function loadPortfolio() {
    const [h, e] = await Promise.all([api.holdings(), api.exposures()]);
    setHoldings(h);
    setExposures(e);
    setPortfolioLoading(false);
  }

  useEffect(() => {
    loadPortfolio();
    const interval = setInterval(loadPortfolio, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Same fast poll cadence as Portfolio.tsx - cheap enough to hit every few
  // seconds, layered on top of the slower cycle above.
  useEffect(() => {
    function loadLiveQuotes() {
      api
        .portfolioLiveQuotes()
        .then((quotes) => setLiveQuotes(Object.fromEntries(quotes.map((q) => [q.ticker, q]))))
        .catch(() => {});
    }
    loadLiveQuotes();
    const interval = setInterval(loadLiveQuotes, 5_000);
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
      await Promise.all([loadAll(historyLimit), loadPortfolio()]);
    } finally {
      setDataRefreshing(false);
    }
  }

  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = { extreme: 0, elevated: 0, good: 0 };
    for (const s of signals) counts[signalSeverity(s)]++;
    return counts;
  }, [signals]);

  const groupedSignals = useMemo(() => {
    const visible = attentionOnly ? signals.filter((s) => signalSeverity(s) !== "good") : signals;
    const groups = new Map<string, Signal[]>();
    for (const s of visible) {
      const cat = signalCategory(s);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(s);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => SEVERITY_RANK[signalSeverity(a)] - SEVERITY_RANK[signalSeverity(b)]);
    }
    return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => [cat, groups.get(cat)!] as const);
  }, [signals, attentionOnly]);

  const badge = useMemo(() => regimeBadge(signals), [signals]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Dashboard"
        subtitle="Your portfolio, the macro regime, and the signals behind them"
        actions={
          <FreshnessBar lastUpdated={status?.last_updated ?? null} onRefresh={handleDataRefresh} refreshing={dataRefreshing} />
        }
      />

      <PortfolioSnapshot holdings={holdings} exposures={exposures} liveQuotes={liveQuotes} loading={portfolioLoading} />

      <div className="grid-primary-secondary">
        <RegimeNarrative
          report={regime}
          status={status?.last_regime_status ?? null}
          onRefresh={handleRefreshRegime}
          refreshing={refreshing}
          badge={badge}
        />
        <InvestmentTips tips={tips} status={status?.last_tips_status ?? null} onRefresh={handleRefreshTips} />
      </div>

      {status && !status.fred_configured && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>FRED_API_KEY not set</strong> — macro signals (inflation,
          growth, yield curve, etc.) will appear once it's configured in your <code>.env</code>. Market-based
          signals (credit, volatility, risk-on/off) already work.
        </div>
      )}

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Signals</span>
            {!loading && signals.length > 0 && (
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                {severityCounts.extreme > 0 && <span style={{ color: LEGEND_COLOR.extreme, fontWeight: 700 }}>{severityCounts.extreme} extreme</span>}
                {severityCounts.extreme > 0 && (severityCounts.elevated > 0 || severityCounts.good > 0) && " · "}
                {severityCounts.elevated > 0 && <span style={{ color: LEGEND_COLOR.elevated, fontWeight: 700 }}>{severityCounts.elevated} elevated</span>}
                {severityCounts.elevated > 0 && severityCounts.good > 0 && " · "}
                {severityCounts.good > 0 && `${severityCounts.good} normal`}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)" }}>
              {LEGEND.map(({ severity, label }) => (
                <span key={severity} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: LEGEND_COLOR[severity] }} />
                  {label}
                </span>
              ))}
            </div>

            <PillToggle
              options={[
                { value: false, label: "All" },
                { value: true, label: "Needs attention" },
              ]}
              value={attentionOnly}
              onChange={setAttentionOnly}
            />

            <PillToggle
              options={HISTORY_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
              value={historyLimit}
              onChange={setHistoryLimit}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", marginTop: 12 }}>Loading...</div>
        ) : signals.length === 0 ? (
          <div style={{ color: "var(--text-muted)", marginTop: 12 }}>
            No signals yet - the app fetches data on startup, this can take a minute on first run.
          </div>
        ) : groupedSignals.length === 0 ? (
          <div style={{ color: "var(--text-muted)", marginTop: 12 }}>Nothing needs attention right now.</div>
        ) : (
          groupedSignals.map(([category, list]) => (
            <div key={category} style={{ marginTop: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
                {category}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {list.map((s) => {
                  const h = history[s.name] ?? [];
                  const delta = signalDeltaPct(h);
                  return (
                    <StatTile
                      key={s.name}
                      padding="16px"
                      dotColor={SEVERITY_COLOR[signalSeverity(s)]}
                      label={formatSignalName(s.name)}
                      value={formatSignalValue(s)}
                      delta={delta !== null && Math.abs(delta) >= 0.01 ? <DeltaPill pct={delta} /> : null}
                      caption={
                        <>
                          {s.label}
                          {s.zscore !== null ? ` · z=${s.zscore.toFixed(2)}` : ""}
                        </>
                      }
                      sparkline={{ data: h, color: signalTrendColor(h), showZero: true }}
                      onClick={() => setSelectedSignal(s)}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedSignal && (
        <SignalDetailModal signal={selectedSignal} history={history[selectedSignal.name] ?? []} onClose={() => setSelectedSignal(null)} />
      )}
    </div>
  );
}

function PillToggle<T extends string | number | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 2, background: "var(--page-plane)", borderRadius: "var(--radius-sm)", padding: 2 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              border: "none",
              background: active ? "var(--surface-1)" : "transparent",
              boxShadow: active ? "var(--shadow-card)" : "none",
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              borderRadius: 6,
              padding: "4px 9px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SignalDetailModal({ signal, history, onClose }: { signal: Signal; history: number[]; onClose: () => void }) {
  const color = history.length >= 2 && history[history.length - 1] < history[0] ? "var(--status-critical)" : "var(--status-good)";
  return (
    <Modal title={formatSignalName(signal.name)} onClose={onClose}>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.6, fontVariantNumeric: "tabular-nums" }}>
        {signal.value.toLocaleString(undefined, { maximumFractionDigits: 3 })}
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{signal.label}</div>

      <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 12.5, color: "var(--text-secondary)" }}>
        {signal.zscore !== null && <span>z-score: <strong style={{ color: "var(--text-primary)" }}>{signal.zscore.toFixed(2)}</strong></span>}
        {signal.percentile !== null && <span>percentile: <strong style={{ color: "var(--text-primary)" }}>{Math.round(signal.percentile * 100)}th</strong></span>}
      </div>

      <div style={{ height: 180, marginTop: 18 }}>
        <Sparkline data={history} color={color} showZero />
      </div>

      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>
        Computed {new Date(signal.computed_at).toLocaleString()} · {history.length} points shown
      </div>
    </Modal>
  );
}
