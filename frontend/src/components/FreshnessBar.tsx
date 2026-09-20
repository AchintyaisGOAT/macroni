import { useEffect, useState } from "react";

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

interface FreshnessBarProps {
  lastUpdated: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}

export function FreshnessBar({ lastUpdated, onRefresh, refreshing }: FreshnessBarProps) {
  // Re-render periodically so "2m ago" keeps advancing without needing new data.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Data last updated: {refreshing ? "refreshing..." : relativeTime(lastUpdated)}
      </span>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "5px 12px",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {refreshing ? "Refreshing..." : "Refresh now"}
      </button>
    </div>
  );
}
