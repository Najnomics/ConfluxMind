/**
 * ConfluxMind AI Agent — Entry Point
 *
 * An AIflux (Eliza-based) autonomous agent that optimizes DeFi yield
 * allocation across strategies on Conflux eSpace.
 *
 * Architecture:
 *   - Standalone polling loop (no full ElizaOS runtime required)
 *   - 3-factor scoring model (yield, utilization risk, liquidity depth)
 *   - On-chain rebalance execution via StrategyController
 *   - Rich reasoning logs for hackathon judge visibility
 */

import { loadConfig, AgentConfig } from "./config.js";
import { executeRebalanceAction, RebalanceResult } from "./actions/rebalanceYield.js";
import { Logger } from "./logger.js";

const log = new Logger("ConfluxMindAgent");

// ── Agent Character ────────────────────────────────────────────────────────

const AGENT_CHARACTER = {
  name: "ConfluxMind AI",
  bio: [
    "Autonomous DeFAI yield optimizer on Conflux eSpace.",
    "Analyzes lending, staking, and LP strategies using a 3-factor model:",
    "  (1) Yield Rate — on-chain APY",
    "  (2) Utilization Risk — pool utilization ratio",
    "  (3) Liquidity Depth — TVL from GeckoTerminal",
    "Executes rebalances via the StrategyController smart contract.",
    "Built for Global Hackfest 2026.",
  ],
  model: "rule-based-scoring", // Not an LLM agent — deterministic scoring
};

// ── Decision History ───────────────────────────────────────────────────────

interface DecisionRecord {
  timestamp: string;
  result: RebalanceResult;
}

const decisionHistory: DecisionRecord[] = [];

// ── Agent Loop ─────────────────────────────────────────────────────────────

async function runAgentCycle(config: AgentConfig): Promise<void> {
  log.info("--- Agent cycle starting ---");

  try {
    const result = await executeRebalanceAction(config);

    // Store in history for inspection
    decisionHistory.push({
      timestamp: new Date().toISOString(),
      result,
    });

    // Keep history bounded (last 100 decisions)
    if (decisionHistory.length > 100) {
      decisionHistory.shift();
    }

    log.info("Agent cycle complete", {
      shouldRebalance: result.shouldRebalance,
      maxDeltaBps: result.maxDeltaBps,
      txHash: result.txHash || "none",
      historyLength: decisionHistory.length,
    });
  } catch (err) {
    log.error("Agent cycle failed", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}

async function main(): Promise<void> {
  // Print agent identity
  log.info("=== ConfluxMind AI Agent Starting ===");
  log.info("Agent Character", {
    name: AGENT_CHARACTER.name,
    bio: AGENT_CHARACTER.bio.join(" "),
    model: AGENT_CHARACTER.model,
  });

  // Load configuration
  let config: AgentConfig;
  try {
    config = loadConfig();
  } catch (err) {
    log.error("Failed to load configuration", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  log.info("Configuration loaded", {
    rpcUrl: config.rpcUrl,
    chainId: config.chainId,
    strategyController: config.strategyControllerAddress,
    vault: config.vaultAddress,
    pollIntervalMs: config.pollIntervalMs,
    rebalanceThresholdBps: config.rebalanceThresholdBps,
    dryRun: config.dryRun,
  });

  // Graceful shutdown
  let running = true;
  const shutdown = (signal: string) => {
    log.info(`Received ${signal}, shutting down...`);
    running = false;
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    log.error("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  // Run first cycle immediately
  await runAgentCycle(config);

  // Then poll on interval
  log.info(`Entering polling loop (interval: ${config.pollIntervalMs}ms)`);
  while (running) {
    await sleep(config.pollIntervalMs);
    if (!running) break;
    await runAgentCycle(config);
  }

  log.info("Agent stopped.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Start ──────────────────────────────────────────────────────────────────

main().catch((err) => {
  log.error("Fatal error", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
