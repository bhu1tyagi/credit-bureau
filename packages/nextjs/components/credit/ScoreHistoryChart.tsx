"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RISK_TIER_COLORS, getRiskTier } from "~~/types/credit";

interface ScoreHistoryChartProps {
  data: { score: number; timestamp: number }[];
  timeRange: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  const tier = getRiskTier(score);
  const tierColor = RISK_TIER_COLORS[tier];

  return (
    <div className="rounded-lg border border-[#2A2F4D] bg-[#111631] p-3 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-mono font-bold text-white">{score}</p>
      <p className="text-xs font-medium" style={{ color: tierColor }}>
        {tier === "VeryPoor" ? "Very Poor" : tier}
      </p>
    </div>
  );
}

export default function ScoreHistoryChart({ data, timeRange }: ScoreHistoryChartProps) {
  const chartData = data.map(d => ({
    ...d,
    date: formatDate(d.timestamp),
  }));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Score History</h3>
        <span className="text-xs text-gray-400">{timeRange}</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2F4D" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6B7280", fontSize: 11 }}
            axisLine={{ stroke: "#2A2F4D" }}
            tickLine={false}
          />
          <YAxis domain={[300, 850]} tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#scoreGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#3B82F6",
              stroke: "#0A0E27",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
