"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const tooltipStyle = {
  background: "#1e3247",
  border: "1px solid #2b3f56",
  borderRadius: 8,
  color: "#f0f6fc",
} as const;

export function EvolutionChart({
  data,
}: {
  data: Array<{ label: string; foco: number | null }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="#2b3f56" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="#7e94aa" fontSize={12} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          stroke="#7e94aa"
          fontSize={12}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: "#7e94aa" }}
          formatter={(value) => [`${value}%`, "Foco"]}
        />
        <Line
          type="monotone"
          dataKey="foco"
          stroke="#38bdf8"
          strokeWidth={2}
          dot={{ fill: "#38bdf8", r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
