import { useState } from "react";
import { api, type InvestmentTip, type RegimeStatus } from "../api/client";
import { severityColor } from "../lib/severity";
import { errorTextStyle } from "../styles";
import { Button } from "./Button";
import { Card } from "./Card";
import { Dot } from "./Dot";

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
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Investment tips
        </div>
        <Button variant="ghost" onClick={handleRefresh} disabled={refreshing} style={{ padding: "7px 14px" }} fontSize={12}>
          {refreshing ? "Generating..." : "Refresh"}
        </Button>
      </div>

      {status?.status === "error" && <div style={{ ...errorTextStyle, marginTop: 10 }}>{status.reason}</div>}

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
              <span style={{ marginTop: 5 }}>
                <Dot color={severityColor(t.severity)} />
              </span>
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
