const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];

interface CategoryBreakdownProps {
  title: string;
  data: Record<string, number>;
}

export function CategoryBreakdown({ title, data }: CategoryBreakdownProps) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>{title}</div>
      {entries.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No data</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map(([category, value], i) => {
          const pct = total > 0 ? (value / total) * 100 : 0;
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          return (
            <div key={category}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 3,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    aria-hidden
                    style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }}
                  />
                  {category}
                </span>
                <span>{pct.toFixed(1)}%</span>
              </div>
              <div style={{ background: "var(--gridline)", borderRadius: 4, height: 8 }}>
                <div
                  style={{
                    width: `${pct}%`,
                    background: color,
                    height: 8,
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
