import type { Signal } from "../api/client";
import { Sparkline } from "./Sparkline";

interface StatTileProps {
  signal: Signal;
  history: number[];
}

function severityColor(signal: Signal): string {
  const magnitude = Math.abs(signal.zscore ?? 0);
  const pct = signal.percentile;
  const extreme = magnitude > 1.5 || (pct !== null && (pct > 0.9 || pct < 0.1));
  const elevated = magnitude > 0.75 || (pct !== null && (pct > 0.75 || pct < 0.25));
  if (extreme) return "var(--status-serious)";
  if (elevated) return "var(--status-warning)";
  return "var(--status-good)";
}

function formatSignalName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(signal: Signal): string {
  const v = signal.value;
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(v) < 1) return v.toFixed(3);
  return v.toFixed(2);
}

export function StatTile({ signal, history }: StatTileProps) {
  const dotColor = severityColor(signal);
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          aria-hidden
          style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }}
        />
        <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{formatSignalName(signal.name)}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{formatValue(signal)}</div>
      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
        {signal.label}
        {signal.zscore !== null ? ` · z=${signal.zscore.toFixed(2)}` : ""}
      </div>
      <Sparkline data={history} color="var(--series-1)" />
    </div>
  );
}
