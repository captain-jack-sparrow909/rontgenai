"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PulseChartSpec } from "@/lib/api";

const COLORS = ["#34d399", "#2dd4bf", "#22d3ee", "#a78bfa", "#fbbf24", "#f472b6"];

export function PulseChart({ chart }: { chart: PulseChartSpec }) {
  if (!chart?.data?.length) return null;

  const common = (
    <>
      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
      <XAxis
        dataKey={chart.xKey}
        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
        axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        width={40}
      />
      <Tooltip
        contentStyle={{
          background: "#0a1210",
          border: "1px solid rgba(52,211,153,0.25)",
          borderRadius: 12,
          fontSize: 12,
        }}
        labelStyle={{ color: "rgba(255,255,255,0.7)" }}
      />
    </>
  );

  return (
    <div className="rounded-xl border border-emerald-400/15 bg-black/30 p-3">
      <p className="mb-3 text-xs font-medium text-emerald-200/80">{chart.title}</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "line" ? (
            <LineChart data={chart.data}>
              {common}
              <Line
                type="monotone"
                dataKey={chart.yKey}
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3, fill: "#34d399" }}
              />
            </LineChart>
          ) : chart.type === "area" ? (
            <AreaChart data={chart.data}>
              {common}
              <Area
                type="monotone"
                dataKey={chart.yKey}
                stroke="#2dd4bf"
                fill="rgba(45,212,191,0.2)"
                strokeWidth={2}
              />
            </AreaChart>
          ) : chart.type === "pie" ? (
            <PieChart>
              <Pie
                data={chart.data}
                dataKey={chart.yKey}
                nameKey={chart.xKey}
                outerRadius={90}
                label={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
              >
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0a1210",
                  border: "1px solid rgba(52,211,153,0.25)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={chart.data}>
              {common}
              <Bar dataKey={chart.yKey} fill="#34d399" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
