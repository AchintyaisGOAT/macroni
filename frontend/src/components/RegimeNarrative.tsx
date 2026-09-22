import type { RegimeReport, RegimeStatus } from "../api/client";
import { severityColor } from "../lib/severity";
import { eyebrowGradientStyle, pillStyle } from "../styles";
import { Button } from "./Button";
import { Card } from "./Card";

interface StatusBadge {
  text: string;
  color: string;
}

interface RegimeNarrativeProps {
  report: RegimeReport | null;
  status: RegimeStatus | null;
  onRefresh: () => void;
  refreshing: boolean;
  /** A one-glance risk-on/neutral/risk-off read, shown next to the regime
   * label so a viewer doesn't have to read the paragraph to get the gist. */
  badge?: StatusBadge | null;
}

export function RegimeNarrative({ report, status, onRefresh, refreshing, badge }: RegimeNarrativeProps) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={eyebrowGradientStyle}>Macro regime</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4 }}>
              {report?.regime_label ?? "Not generated yet"}
            </div>
            {badge && <span style={{ ...pillStyle(badge.color), letterSpacing: 0.3 }}>{badge.text}</span>}
          </div>
        </div>
        <Button variant="ghost" onClick={onRefresh} disabled={refreshing} style={{ padding: "7px 14px" }} fontSize={12}>
          {refreshing ? "Generating..." : "Regenerate"}
        </Button>
      </div>

      {status?.status === "error" && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            border: `1px solid var(--status-critical)`,
            background: "var(--page-plane)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--status-critical)" }}>
            Last generation attempt failed
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{status.reason}</div>
        </div>
      )}

      {report && (
        <>
          <p style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6, marginTop: 14, whiteSpace: "pre-wrap" }}>
            {report.narrative}
          </p>

          {report.risk_flags.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Risk flags</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.risk_flags.map((flag, i) => {
                  const color = severityColor(flag.severity);
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        borderLeft: `3px solid ${color}`,
                        background: `color-mix(in srgb, ${color} 9%, var(--surface-1))`,
                      }}
                    >
                      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color }}>
                        {flag.severity.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        <strong style={{ color: "var(--text-primary)" }}>{flag.signal}:</strong> {flag.explanation}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {report.portfolio_commentary && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Portfolio commentary</div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {report.portfolio_commentary}
              </p>
            </div>
          )}

          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 14 }}>
            Generated {new Date(report.created_at).toLocaleString()} · research aid, not a trade recommendation
          </div>
        </>
      )}
    </Card>
  );
}
