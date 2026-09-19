import type { AlertEvent } from "../api/client";

const SEVERITY_COLOR: Record<string, string> = {
  low: "var(--status-good)",
  medium: "var(--status-warning)",
  high: "var(--status-critical)",
};

export function AlertItem({ alert }: { alert: AlertEvent }) {
  const color = SEVERITY_COLOR[alert.severity] ?? "var(--text-muted)";
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: "12px 14px",
        opacity: alert.active ? 1 : 0.55,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: "uppercase" }}>
            {alert.severity}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{alert.rule_id.replace(/_/g, " ")}</span>
          {!alert.active && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>resolved</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {new Date(alert.created_at).toLocaleString()}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
        {alert.signal_name} = {alert.value.toFixed(4)}
      </div>
      {alert.explanation && (
        <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 8, marginBottom: 0 }}>
          {alert.explanation}
        </p>
      )}
    </div>
  );
}
