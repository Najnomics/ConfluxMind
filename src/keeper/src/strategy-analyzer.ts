import { StrategyInfo } from "./contracts";
import { StrategyRiskConfig } from "./config";
import { Logger } from "./logger";

const log = new Logger("StrategyAnalyzer");

export interface AnalysisResult {
  /** Recommended weights in basis points, indexed by strategy position. Sum = 10000. */
  weights: bigint[];
  /** Human-readable reasoning for the recommendation. */
  reasoning: string;
  /** Whether the new weights differ enough from current weights to warrant a rebalance. */
  shouldRebalance: boolean;
  /** Maximum weight delta across all strategies, in basis points. */
  maxDeltaBps: bigint;
}

interface ScoredStrategy {
  index: number;
  address: string;
  type: string;
  apyBps: bigint;
  riskWeight: number;
  score: number;
  minAllocationBps: number;
  maxAllocationBps: number;
}

/**
 * Finds the matching risk config for a strategy type.
 * Falls back to a conservative default if no match is found.
 */
function findRiskConfig(strategyType: string, riskConfigs: StrategyRiskConfig[]): StrategyRiskConfig {
  const normalized = strategyType.toLowerCase();
  const match = riskConfigs.find((c) => c.type.toLowerCase() === normalized);
  if (match) return match;

  log.warn(`No risk config found for strategy type "${strategyType}", using conservative defaults`);
  return {
    type: strategyType,
    riskWeight: 0.5,
    minAllocationBps: 0,
    maxAllocationBps: 3000,
  };
}

/**
 * Analyzes strategies and computes optimal allocation weights using a
 * risk-adjusted return model (Sharpe-like ratio).
 *
 * Score for each strategy = APY (bps) * riskWeight
 *
 * Weights are then derived by normalizing scores to sum to 10000 bps,
 * subject to per-strategy min/max allocation constraints.
 */
export function analyzeStrategies(
  strategies: StrategyInfo[],
  riskConfigs: StrategyRiskConfig[],
  rebalanceThresholdBps: number
): AnalysisResult {
  if (strategies.length === 0) {
    return {
      weights: [],
      reasoning: "No strategies registered. Nothing to rebalance.",
      shouldRebalance: false,
      maxDeltaBps: 0n,
    };
  }

  const reasoningParts: string[] = [];
  reasoningParts.push(`Analyzing ${strategies.length} strategies.`);

  // Step 1: Score each strategy
  const scored: ScoredStrategy[] = strategies.map((s, i) => {
    const riskConfig = findRiskConfig(s.type, riskConfigs);
    const apyNum = Number(s.apyBps);
    const score = apyNum * riskConfig.riskWeight;

    reasoningParts.push(
      `  Strategy[${i}] ${s.address.slice(0, 10)}... type=${s.type} APY=${apyNum}bps riskWeight=${riskConfig.riskWeight} score=${score.toFixed(2)}`
    );

    return {
      index: i,
      address: s.address,
      type: s.type,
      apyBps: s.apyBps,
      riskWeight: riskConfig.riskWeight,
      score,
      minAllocationBps: riskConfig.minAllocationBps,
      maxAllocationBps: riskConfig.maxAllocationBps,
    };
  });

  // Step 2: Normalize scores to raw weights
  const totalScore = scored.reduce((sum, s) => sum + s.score, 0);

  let rawWeights: number[];
  if (totalScore === 0) {
    // All scores are zero; distribute equally
    rawWeights = scored.map(() => 10000 / scored.length);
    reasoningParts.push("All strategy scores are zero. Distributing equally.");
  } else {
    rawWeights = scored.map((s) => (s.score / totalScore) * 10000);
  }

  // Step 3: Apply min/max constraints with iterative clamping
  const finalWeights = applyConstraints(scored, rawWeights);

  reasoningParts.push("Computed weights after constraint application:");
  for (let i = 0; i < finalWeights.length; i++) {
    reasoningParts.push(
      `  Strategy[${i}]: raw=${rawWeights[i].toFixed(1)}bps -> final=${finalWeights[i]}bps (min=${scored[i].minAllocationBps}, max=${scored[i].maxAllocationBps})`
    );
  }

  // Step 4: Convert to bigint
  const weightsBigInt = finalWeights.map((w) => BigInt(w));

  // Step 5: Determine if rebalance is needed
  let maxDelta = 0n;
  for (let i = 0; i < strategies.length; i++) {
    const delta = weightsBigInt[i] > strategies[i].currentWeight
      ? weightsBigInt[i] - strategies[i].currentWeight
      : strategies[i].currentWeight - weightsBigInt[i];
    if (delta > maxDelta) {
      maxDelta = delta;
    }
  }

  const shouldRebalance = maxDelta >= BigInt(rebalanceThresholdBps);

  if (shouldRebalance) {
    reasoningParts.push(
      `Max weight delta: ${maxDelta}bps >= threshold ${rebalanceThresholdBps}bps. Rebalance recommended.`
    );
  } else {
    reasoningParts.push(
      `Max weight delta: ${maxDelta}bps < threshold ${rebalanceThresholdBps}bps. No rebalance needed.`
    );
  }

  const reasoning = reasoningParts.join("\n");

  return {
    weights: weightsBigInt,
    reasoning,
    shouldRebalance,
    maxDeltaBps: maxDelta,
  };
}

/**
 * Applies min/max allocation constraints using iterative redistribution.
 * Returns integer weights in bps that sum to exactly 10000.
 */
function applyConstraints(scored: ScoredStrategy[], rawWeights: number[]): number[] {
  const n = scored.length;
  const result = [...rawWeights];
  const locked = new Array(n).fill(false);

  // Iterate to converge (max 20 passes to avoid infinite loops)
  for (let pass = 0; pass < 20; pass++) {
    let excess = 0;
    let unlockedCount = 0;

    for (let i = 0; i < n; i++) {
      if (locked[i]) continue;

      if (result[i] < scored[i].minAllocationBps) {
        excess -= scored[i].minAllocationBps - result[i];
        result[i] = scored[i].minAllocationBps;
        locked[i] = true;
      } else if (result[i] > scored[i].maxAllocationBps) {
        excess += result[i] - scored[i].maxAllocationBps;
        result[i] = scored[i].maxAllocationBps;
        locked[i] = true;
      } else {
        unlockedCount++;
      }
    }

    if (excess === 0 || unlockedCount === 0) break;

    // Redistribute excess proportionally among unlocked strategies
    const unlockedTotal = result.reduce((sum, w, i) => (locked[i] ? sum : sum + w), 0);
    if (unlockedTotal > 0) {
      for (let i = 0; i < n; i++) {
        if (!locked[i]) {
          result[i] += (result[i] / unlockedTotal) * excess;
        }
      }
    } else {
      // Edge case: distribute equally among unlocked
      const share = excess / unlockedCount;
      for (let i = 0; i < n; i++) {
        if (!locked[i]) {
          result[i] += share;
        }
      }
    }
  }

  // Round to integers ensuring they sum to 10000
  const intWeights = result.map((w) => Math.round(w));
  let sum = intWeights.reduce((a, b) => a + b, 0);
  let diff = 10000 - sum;

  // Adjust rounding error on the largest weight
  if (diff !== 0) {
    let targetIdx = 0;
    for (let i = 1; i < n; i++) {
      if (intWeights[i] > intWeights[targetIdx]) {
        targetIdx = i;
      }
    }
    intWeights[targetIdx] += diff;
  }

  return intWeights;
}
