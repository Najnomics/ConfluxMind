"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useReadContract } from "wagmi";
import { ADDRESSES, STRATEGY_CONTROLLER_ABI, STRATEGY_NAMES } from "@/lib/contracts";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string; apyBps: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{data.name}</p>
      <p className="text-xs text-slate-400">{data.value}% allocation</p>
      {data.payload.apyBps > 0 && (
        <p className="text-xs text-emerald-400">{(data.payload.apyBps / 100).toFixed(2)}% APY</p>
      )}
    </div>
  );
}

export default function StrategyChart() {
  const { data: weights } = useReadContract({
    address: ADDRESSES.strategyController,
    abi: STRATEGY_CONTROLLER_ABI,
    functionName: "getWeights",
  });

  const { data: apys } = useReadContract({
    address: ADDRESSES.strategyController,
    abi: STRATEGY_CONTROLLER_ABI,
    functionName: "getStrategyAPYs",
  });

  const wArr = (weights as bigint[]) ?? [];
  const aArr = (apys as bigint[]) ?? [];

  const strategies = STRATEGY_NAMES.map((name, i) => ({
    name,
    value: wArr[i] ? Number(wArr[i]) / 100 : 0, // bps to percentage
    color: COLORS[i % COLORS.length],
    apyBps: aArr[i] ? Number(aArr[i]) : 0,
  })).filter((s) => s.value > 0);

  // Fallback when no on-chain data yet
  const hasData = strategies.length > 0;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm">
      <div className="h-px -mt-5 mb-5 -mx-5 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <h3 className="text-sm font-semibold text-white mb-1">Strategy Allocation</h3>
      <p className="text-xs text-slate-400 mb-4">Live on-chain DeFAI-optimized distribution</p>

      {hasData ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={strategies}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {strategies.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-slate-500">Loading on-chain strategy data...</p>
        </div>
      )}
    </div>
  );
}
