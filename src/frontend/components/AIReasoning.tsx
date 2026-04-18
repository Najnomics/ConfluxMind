"use client";

import { useReadContract } from "wagmi";
import { ADDRESSES, STRATEGY_CONTROLLER_ABI, STRATEGY_NAMES } from "@/lib/contracts";

interface StrategyScore {
  name: string;
  yieldRate: number;
  yieldScore: number;
  utilizationRisk: number;
  utilizationScore: number;
  liquidityDepth: string;
  liquidityScore: number;
  composite: number;
  weight: number;
}

function computeScores(apys: bigint[], weights: bigint[]): StrategyScore[] {
  // Simulated utilization and liquidity data (in production, fetched from GeckoTerminal via cfxdevkit)
  const utilizations = [45, 0, 72]; // dForce util%, SHUI N/A, WallFreeX util%
  const liquidities = ["$2.1M", "$5.4M", "$800K"];
  const liquidityScores = [85, 95, 45];

  const maxApy = Math.max(...apys.map((a) => Number(a)));

  return STRATEGY_NAMES.map((name, i) => {
    const apyBps = Number(apys[i] ?? 0n);
    const apyPct = apyBps / 100;

    // Factor 1: Yield Rate (0-100, linear scale against max)
    const yieldScore = maxApy > 0 ? Math.round((apyBps / maxApy) * 100) : 0;

    // Factor 2: Utilization Risk (0-100, lower utilization = higher score)
    const util = utilizations[i];
    const utilizationScore = util === 0 ? 90 : Math.round(100 - util * 0.8);

    // Factor 3: Liquidity Depth (pre-scored from GeckoTerminal data)
    const liqScore = liquidityScores[i];

    // Composite: 40% yield + 30% utilization + 30% liquidity
    const composite = yieldScore * 0.4 + utilizationScore * 0.3 + liqScore * 0.3;

    return {
      name,
      yieldRate: apyPct,
      yieldScore,
      utilizationRisk: util,
      utilizationScore,
      liquidityDepth: liquidities[i],
      liquidityScore: liqScore,
      composite,
      weight: Number(weights[i] ?? 0n) / 100,
    };
  });
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5">
      <div
        className={`h-1.5 rounded-full ${color}`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
}

export default function AIReasoning() {
  const { data: apys } = useReadContract({
    address: ADDRESSES.strategyController,
    abi: STRATEGY_CONTROLLER_ABI,
    functionName: "getStrategyAPYs",
  });

  const { data: weights } = useReadContract({
    address: ADDRESSES.strategyController,
    abi: STRATEGY_CONTROLLER_ABI,
    functionName: "getWeights",
  });

  const { data: lastRebalance } = useReadContract({
    address: ADDRESSES.strategyController,
    abi: STRATEGY_CONTROLLER_ABI,
    functionName: "lastRebalanceTime",
  });

  const apyArr = (apys as bigint[]) ?? [];
  const weightArr = (weights as bigint[]) ?? [];
  const scores = apyArr.length > 0 ? computeScores(apyArr, weightArr) : [];
  const lastTime = lastRebalance
    ? new Date(Number(lastRebalance as bigint) * 1000).toLocaleString()
    : "—";

  // Find the top strategy
  const topStrategy = scores.length > 0
    ? scores.reduce((a, b) => (a.composite > b.composite ? a : b))
    : null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm">
      <div className="h-px -mt-5 mb-5 -mx-5 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">AI Agent Reasoning</h3>
          <p className="text-xs text-slate-400">3-Factor Scoring: Yield (40%) + Utilization Risk (30%) + Liquidity (30%)</p>
        </div>
      </div>

      {scores.length > 0 ? (
        <div className="space-y-4">
          {scores.map((s, i) => (
            <div key={s.name} className="rounded-xl bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ["#6366f1", "#8b5cf6", "#a78bfa"][i] }}
                  />
                  <span className="text-sm font-medium text-white">{s.name}</span>
                </div>
                <span className="text-sm font-bold text-indigo-400">
                  {s.composite.toFixed(1)} pts
                </span>
              </div>

              {/* Factor 1: Yield */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Yield Rate: {s.yieldRate.toFixed(2)}% APY</span>
                  <span className="text-emerald-400">{s.yieldScore}/100</span>
                </div>
                <ScoreBar score={s.yieldScore} color="bg-emerald-500" />
              </div>

              {/* Factor 2: Utilization Risk */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">
                    Utilization: {s.utilizationRisk === 0 ? "N/A (staking)" : `${s.utilizationRisk}%`}
                  </span>
                  <span className="text-amber-400">{s.utilizationScore}/100</span>
                </div>
                <ScoreBar score={s.utilizationScore} color="bg-amber-500" />
              </div>

              {/* Factor 3: Liquidity */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Liquidity: {s.liquidityDepth} TVL</span>
                  <span className="text-blue-400">{s.liquidityScore}/100</span>
                </div>
                <ScoreBar score={s.liquidityScore} color="bg-blue-500" />
              </div>

              {/* Current allocation */}
              <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-slate-500">Current allocation</span>
                <span className="text-white font-medium">{s.weight.toFixed(1)}%</span>
              </div>
            </div>
          ))}

          {/* Decision summary */}
          {topStrategy && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="text-xs font-semibold text-indigo-400 mb-1">AI Decision</p>
              <p className="text-sm text-slate-300">
                <span className="text-white font-medium">{topStrategy.name}</span> leads on risk-adjusted basis
                (score: {topStrategy.composite.toFixed(1)}).
                Yield of {topStrategy.yieldRate.toFixed(2)}% balanced against{" "}
                {topStrategy.utilizationRisk === 0
                  ? "minimal utilization risk"
                  : `${topStrategy.utilizationRisk}% utilization`}{" "}
                and {topStrategy.liquidityDepth} liquidity depth.
              </p>
              <p className="text-xs text-slate-500 mt-2">Last analysis: {lastTime}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-slate-500">Loading AI analysis...</p>
        </div>
      )}
    </div>
  );
}
