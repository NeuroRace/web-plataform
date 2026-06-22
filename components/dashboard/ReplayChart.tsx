"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { SeriesPoint } from "@/lib/metrics";

const tooltipStyle = {
  background: "#1e3247",
  border: "1px solid #2b3f56",
  borderRadius: 8,
  color: "#f0f6fc",
} as const;

export function ReplayChart({ series }: { series: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#2b3f56" strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          stroke="#7e94aa"
          fontSize={12}
          tickLine={false}
          tickFormatter={(v: number) => `${v}s`}
        />
        <YAxis
          domain={[0, 100]}
          stroke="#7e94aa"
          fontSize={12}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: "#7e94aa" }}
          labelFormatter={(v) => `${v}s`}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#c9d6e3" }} />
        <Area
          type="monotone"
          dataKey="attention"
          name="Atenção"
          stroke="#38bdf8"
          strokeWidth={2}
          fill="url(#attFill)"
          connectNulls
        />
        <Area
          type="monotone"
          dataKey="meditation"
          name="Meditação"
          stroke="#bf46f3"
          strokeWidth={1.5}
          fill="transparent"
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
