import { Area, AreaChart, ReferenceDot, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  /** When the series naturally crosses zero, draws a faint reference line at
   * it. The y-domain always autoscales to the data's own min/max - forcing
   * zero into the domain for a series that never goes near it (a level like
   * 203,250 or 3.63) would squash its real, smaller fluctuations into a
   * sliver instead of showing them. */
  showZero?: boolean;
}

// A unique-enough id per mount so multiple sparklines on one page don't
// collide on the same <linearGradient> id (SVG defs are document-global).
let gradientSeq = 0;

export function Sparkline({ data, color = "var(--series-1)", showZero = false }: SparklineProps) {
  if (data.length < 2) {
    return <div style={{ width: "100%", height: "100%" }} />;
  }
  const points = data.map((value, i) => ({ i, value }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const crossesZero = showZero && min < 0 && max > 0;
  const gradientId = `spark-fill-${(gradientSeq++).toString(36)}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 6, right: 4, bottom: 2, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        {crossesZero && <ReferenceLine y={0} stroke="var(--gridline)" strokeDasharray="3 3" />}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
        {/* Emphasized current-value point, the way Robinhood/Coinbase-style
            trend charts mark "here" at the end of the line. */}
        <ReferenceDot x={points[points.length - 1].i} y={points[points.length - 1].value} r={3} fill={color} stroke="var(--surface-1)" strokeWidth={1.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
