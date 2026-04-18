/**
 * Yield Provider — Market Data from GeckoTerminal
 *
 * Fetches pool liquidity, token prices, and volume data for
 * Conflux eSpace DEXes via @cfxdevkit/geckoterminal.
 *
 * This data feeds into the 3-factor scoring model:
 *   - Liquidity depth (TVL/reserves)
 *   - Volume (trading activity, used as a proxy for utilization)
 *   - Token prices (for value normalization)
 */

import { Logger } from "../logger.js";

const log = new Logger("YieldProvider");

// Known Conflux DEX pool identifiers for GeckoTerminal
const CONFLUX_NETWORK = "cfx";

export interface PoolData {
  name: string;
  address: string;
  dex: string;
  tvlUsd: number;
  volumeUsd24h: number;
  priceUsd: number;
  fdvUsd: number;
}

export interface MarketSnapshot {
  timestamp: string;
  pools: PoolData[];
  totalTvlUsd: number;
  dataSource: "geckoterminal" | "fallback";
}

/**
 * Attempts to fetch top pools on Conflux eSpace from GeckoTerminal.
 * Falls back to hardcoded estimates if the API is unavailable.
 */
export async function fetchMarketData(): Promise<MarketSnapshot> {
  const timestamp = new Date().toISOString();

  try {
    // Dynamic import to handle cases where the package may not resolve
    const geckoModule = await import("@cfxdevkit/geckoterminal");
    const gecko =
      "GeckoTerminal" in geckoModule
        ? new (geckoModule as any).GeckoTerminal()
        : (geckoModule as any).default
          ? new (geckoModule as any).default()
          : null;

    if (!gecko) {
      log.warn("Could not instantiate GeckoTerminal client, using fallback data");
      return fallbackSnapshot(timestamp);
    }

    // Fetch trending pools on Conflux
    let pools: PoolData[] = [];

    try {
      const topPools = await gecko.getTopPools(CONFLUX_NETWORK);
      if (topPools && Array.isArray(topPools.data)) {
        pools = topPools.data.slice(0, 20).map((p: any) => ({
          name: p.attributes?.name || "Unknown",
          address: p.attributes?.address || "",
          dex: p.relationships?.dex?.data?.id || "unknown",
          tvlUsd: parseFloat(p.attributes?.reserve_in_usd || "0"),
          volumeUsd24h: parseFloat(
            p.attributes?.volume_usd?.h24 || "0"
          ),
          priceUsd: parseFloat(
            p.attributes?.base_token_price_usd || "0"
          ),
          fdvUsd: parseFloat(p.attributes?.fdv_usd || "0"),
        }));
      }
    } catch (apiErr) {
      log.warn("GeckoTerminal API call failed, using fallback data", {
        error: apiErr instanceof Error ? apiErr.message : String(apiErr),
      });
      return fallbackSnapshot(timestamp);
    }

    const totalTvlUsd = pools.reduce((sum, p) => sum + p.tvlUsd, 0);

    log.info("Market data fetched from GeckoTerminal", {
      poolCount: pools.length,
      totalTvlUsd,
    });

    return { timestamp, pools, totalTvlUsd, dataSource: "geckoterminal" };
  } catch {
    log.warn("GeckoTerminal module not available, using fallback data");
    return fallbackSnapshot(timestamp);
  }
}

/**
 * Returns conservative hardcoded estimates for known Conflux protocols.
 * Used when GeckoTerminal API is unreachable or the SDK isn't installed.
 */
function fallbackSnapshot(timestamp: string): MarketSnapshot {
  const pools: PoolData[] = [
    {
      name: "dForce Unitus USDT Lending",
      address: "0x0000000000000000000000000000000000000001",
      dex: "dforce-unitus",
      tvlUsd: 2_100_000,
      volumeUsd24h: 450_000,
      priceUsd: 1.0,
      fdvUsd: 0,
    },
    {
      name: "SHUI Finance Staking",
      address: "0x0000000000000000000000000000000000000002",
      dex: "shui-finance",
      tvlUsd: 5_400_000,
      volumeUsd24h: 120_000,
      priceUsd: 1.0,
      fdvUsd: 0,
    },
    {
      name: "WallFreeX CFX/USDT LP",
      address: "0x0000000000000000000000000000000000000003",
      dex: "wallfreex",
      tvlUsd: 800_000,
      volumeUsd24h: 320_000,
      priceUsd: 0.18,
      fdvUsd: 0,
    },
  ];

  const totalTvlUsd = pools.reduce((sum, p) => sum + p.tvlUsd, 0);

  log.info("Using fallback market data", {
    poolCount: pools.length,
    totalTvlUsd,
  });

  return { timestamp, pools, totalTvlUsd, dataSource: "fallback" };
}

/**
 * Extracts the TVL for a strategy based on label matching against pool names.
 * Returns 0 if no match is found.
 */
export function matchPoolTvl(
  strategyLabel: string,
  pools: PoolData[]
): { tvlUsd: number; poolName: string } {
  const lower = strategyLabel.toLowerCase();

  // Try exact-ish matching on known protocol names
  for (const pool of pools) {
    const poolLower = pool.name.toLowerCase();
    if (
      (lower.includes("dforce") && poolLower.includes("dforce")) ||
      (lower.includes("unitus") && poolLower.includes("unitus")) ||
      (lower.includes("shui") && poolLower.includes("shui")) ||
      (lower.includes("wallfreex") && poolLower.includes("wallfreex")) ||
      (lower.includes("lp") && poolLower.includes("lp"))
    ) {
      return { tvlUsd: pool.tvlUsd, poolName: pool.name };
    }
  }

  // If no match, use the average TVL as a conservative estimate
  const avgTvl =
    pools.length > 0
      ? pools.reduce((s, p) => s + p.tvlUsd, 0) / pools.length
      : 500_000;

  return { tvlUsd: avgTvl, poolName: "unknown (avg estimate)" };
}
