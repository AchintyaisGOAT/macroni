import type { RegimeReport, RegimeStatus } from "../api/client";

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
  aiConfigured: boolean;
}

export function RegimeNarrative({ report, status, onRefresh, refreshing, aiConfigured }: RegimeNarrativeProps) {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Macro regime</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>
            {report?.regime_label ?? (aiConfigured ? "Not generated yet" : "AI not configured")}
          </div>
        </div>
        {aiConfigured && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-primary)",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
            }}
          >
            {refreshing ? "Generating..." : "Regenerate"}
          </button>
        )}
      </div>

      {!aiConfigured && (
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 12 }}>
          Set GEMINI_API_KEY in your .env file to enable AI-generated regime narratives and alert
          explanations.
        </p>
      )}

      {aiConfigured && status?.status === "error" && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 6,
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
    </div>
  );
}
