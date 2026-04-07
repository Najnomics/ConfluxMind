"use client";

import { useReadContract } from "wagmi";
import { ADDRESSES, STRATEGY_CONTROLLER_ABI, STRATEGY_NAMES } from "@/lib/contracts";

export default function RebalanceHistory() {
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

  const { data: lastRebalance } = useReadContract({
    address: ADDRESSES.strategyController,
    abi: STRATEGY_CONTROLLER_ABI,
    functionName: "lastRebalanceTime",
  });

  const { data: totalAssets } = useReadContract({
    address: ADDRESSES.strategyController,
    abi: STRATEGY_CONTROLLER_ABI,
    functionName: "totalStrategyAssets",
  });

  const wArr = (weights as bigint[]) ?? [];
  const aArr = (apys as bigint[]) ?? [];
  const lastTime = lastRebalance ? new Date(Number(lastRebalance as bigint) * 1000).toLocaleString() : "—";
  const total = totalAssets ? (Number(totalAssets as bigint) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "0";

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm">
      <div className="h-px -mt-5 mb-5 -mx-5 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Strategy Status</h3>
          <p className="text-xs text-slate-400">Live on-chain data from StrategyController</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Total Deployed</p>
          <p className="text-sm font-bold text-white">${total}</p>
        </div>
      </div>

      {/* Strategy table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="pb-3 text-xs font-medium text-slate-400">Strategy</th>
              <th className="pb-3 text-xs font-medium text-slate-400 text-right">Weight</th>
              <th className="pb-3 text-xs font-medium text-slate-400 text-right">APY</th>
            </tr>
          </thead>
          <tbody>
            {STRATEGY_NAMES.map((name, i) => (
              <tr key={name} className="border-b border-white/5 last:border-0">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: ["#6366f1", "#8b5cf6", "#a78bfa"][i] }}
                    />
                    <span className="text-sm text-white">{name}</span>
                  </div>
                </td>
                <td className="py-3 text-right text-sm text-slate-300">
                  {wArr[i] ? `${(Number(wArr[i]) / 100).toFixed(1)}%` : "0%"}
                </td>
                <td className="py-3 text-right text-sm text-emerald-400">
                  {aArr[i] ? `${(Number(aArr[i]) / 100).toFixed(2)}%` : "0%"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Last rebalance info */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-slate-400">
          Last rebalance: {lastTime}
        </span>
      </div>
    </div>
  );
}
