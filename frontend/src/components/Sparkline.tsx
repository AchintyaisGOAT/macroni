import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
}

export function Sparkline({ data, color = "var(--series-1)" }: SparklineProps) {
  if (data.length < 2) {
    return <div style={{ height: 32 }} />;
  }
  const points = data.map((value, i) => ({ i, value }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
