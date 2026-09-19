import { useState } from "react";
import { api, type InvestmentTip, type RegimeStatus } from "../api/client";
import { Card } from "./Card";

const SEVERITY_COLOR: Record<string, string> = {
  low: "var(--status-good)",
  medium: "var(--status-warning)",
  high: "var(--status-critical)",
};

const CATEGORY_LABEL: Record<string, string> = {
  diversification: "Diversification",
  risk: "Risk",
  cost: "Cost",
  other: "Other",
};

interface InvestmentTipsProps {
  tips: InvestmentTip[];
  status: RegimeStatus | null;
  onRefresh: () => void;
}

export function InvestmentTips({ tips, status, onRefresh }: InvestmentTipsProps) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.refreshTips();
      onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            background: "var(--brand-gradient)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Investment tips
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            border: "none",
            background: "var(--page-plane)",
            color: "var(--text-primary)",
            borderRadius: "var(--radius-sm)",
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {refreshing ? "Generating..." : "Refresh"}
        </button>
      </div>

      {status?.status === "error" && (
        <div style={{ fontSize: 12, color: "var(--status-critical)", marginTop: 10 }}>{status.reason}</div>
      )}

      {tips.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
          {status?.status === "ok"
            ? "No notable tips right now - your portfolio looks reasonably balanced, or there isn't enough data yet."
            : "No tips generated yet."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {tips.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: SEVERITY_COLOR[t.severity] ?? "var(--text-muted)",
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {t.title}{" "}
                  <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>
                    · {CATEGORY_LABEL[t.category] ?? t.category}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>
                  {t.tip}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 14 }}>
        Educational observations, not personalized financial advice.
      </div>
    </Card>
  );
}
