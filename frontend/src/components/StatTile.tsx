import type { CSSProperties, ReactNode } from "react";
import { tint } from "../styles";
import { Card } from "./Card";
import { Dot } from "./Dot";
import { Sparkline } from "./Sparkline";

interface StatTileProps {
  /** Short name for what this tile shows - a signal name, an exchange code,
   * "Total value", etc. Rendered as the bold header text. */
  label: ReactNode;
  /** Small severity/status dot rendered before the label. */
  dotColor?: string;
  /** Right-aligned content on the header row - a status pill, a link, etc. */
  corner?: ReactNode;
  /** Muted line(s) directly under the header, before the big number - e.g.
   * an exchange's name/region, or a region's index name/ticker. */
  subcaption?: ReactNode;
  /** The big tabular-nums number this tile leads with. */
  value?: ReactNode;
  valueSize?: number;
  /** Inline content next to the value, usually a <DeltaPill>. */
  delta?: ReactNode;
  /** Muted line(s) below the value. */
  caption?: ReactNode;
  sparkline?: { data: number[]; color: string; showZero?: boolean };
  /** Bottom section - a "browse stocks" link, a countdown, etc. Renders
   * as-is, with no default border - add one in the passed content if needed. */
  footer?: ReactNode;
  onClick?: () => void;
  padding?: string;
  style?: CSSProperties;
}

// The one "label + big number + delta" card shape, used everywhere from
// Dashboard's signal grid to Portfolio's summary cards to Global Markets'
// exchange/region cards - previously reimplemented independently in each of
// those with slightly different spacing, font sizes, and header layouts.
export function StatTile({
  label,
  dotColor,
  corner,
  subcaption,
  value,
  valueSize = 24,
  delta,
  caption,
  sparkline,
  footer,
  onClick,
  padding = "16px 18px",
  style,
}: StatTileProps) {
  return (
    <Card
      padding={padding}
      onClick={onClick}
      style={{ display: "flex", flexDirection: "column", gap: 10, cursor: onClick ? "pointer" : "default", ...style }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          {dotColor && <Dot color={dotColor} size={7} />}
          <span
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>
        {corner}
      </div>

      {subcaption && <div style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: -6 }}>{subcaption}</div>}

      {value !== undefined && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: valueSize, fontWeight: 700, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums" }}>
            {value}
          </span>
          {delta}
        </div>
      )}

      {caption && <div style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: -6 }}>{caption}</div>}

      {sparkline && (
        <div style={{ height: 64 }}>
          <Sparkline data={sparkline.data} color={sparkline.color} showZero={sparkline.showZero} />
        </div>
      )}

      {footer}
    </Card>
  );
}

/** The colored "▲ 1.2%" badge next to a StatTile's value - the same delta
 * pill every portfolio/watchlist stat card shows next to a live price,
 * previously redefined per file with slightly different sizes/paddings. */
export function DeltaPill({
  pct,
  size = "sm",
  suffix = "%",
  precision = 1,
}: {
  pct: number;
  size?: "sm" | "md";
  suffix?: string;
  precision?: number;
}) {
  const color = pct >= 0 ? "var(--status-good)" : "var(--status-critical)";
  const arrow = pct >= 0 ? "▲" : "▼";
  return (
    <span
      style={{
        fontSize: size === "md" ? 12.5 : 11,
        fontWeight: 700,
        color,
        background: tint(color, 12),
        borderRadius: 999,
        padding: size === "md" ? "3px 9px" : "2px 7px",
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      {arrow} {Math.abs(pct).toFixed(precision)}
      {suffix}
    </span>
  );
}
