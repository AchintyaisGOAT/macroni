import type { RegimeReport, RegimeStatus } from "../api/client";
import { Card } from "./Card";

const SEVERITY_COLOR: Record<string, string> = {
  low: "var(--status-good)",
  medium: "var(--status-warning)",
  high: "var(--status-critical)",
};

interface RegimeNarrativeProps {
  report: RegimeReport | null;
  status: RegimeStatus | null;
  onRefresh: () => void;
  refreshing: boolean;
}

export function RegimeNarrative({ report, status, onRefresh, refreshing }: RegimeNarrativeProps) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
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
              display: "inline-block",
            }}
          >
            Macro regime
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, letterSpacing: -0.3 }}>
            {report?.regime_label ?? "Not generated yet"}
          </div>
        </div>
        <button
          onClick={onRefresh}
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
          {refreshing ? "Generating..." : "Regenerate"}
        </button>
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
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Risk flags</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {report.risk_flags.map((flag, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: SEVERITY_COLOR[flag.severity] ?? "var(--text-muted)",
                        border: `1px solid ${SEVERITY_COLOR[flag.severity] ?? "var(--border)"}`,
                        borderRadius: 4,
                        padding: "1px 6px",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {flag.severity.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--text-primary)" }}>{flag.signal}:</strong> {flag.explanation}
                    </span>
                  </div>
                ))}
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
