import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import { KeeperConfig } from "./config";
import { STRATEGY_CONTROLLER_ABI, StrategyInfo } from "./contracts";
import { analyzeStrategies, AnalysisResult } from "./strategy-analyzer";
import { Logger } from "./logger";

const log = new Logger("Keeper");

export class ConfluxMindKeeper {
  private config: KeeperConfig;
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private controller: Contract;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isProcessing = false;

  constructor(config: KeeperConfig) {
    this.config = config;

    this.provider = new JsonRpcProvider(config.rpcUrl, config.chainId, {
      staticNetwork: true,
    });

    this.wallet = new Wallet(config.privateKey, this.provider);

    this.controller = new Contract(
      config.strategyControllerAddress,
      STRATEGY_CONTROLLER_ABI,
      this.wallet
    );

    log.info("Keeper initialized", {
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      controllerAddress: config.strategyControllerAddress,
      keeperAddress: this.wallet.address,
      pollIntervalMs: config.pollIntervalMs,
      rebalanceThresholdBps: config.rebalanceThresholdBps,
      dryRun: config.dryRun,
    });
  }

  /**
   * Starts the keeper polling loop.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn("Keeper is already running");
      return;
    }

    this.isRunning = true;
    log.info("Starting keeper polling loop", {
      intervalMs: this.config.pollIntervalMs,
    });

    // Run immediately on start
    await this.tick();

    // Then run on interval
    this.intervalHandle = setInterval(() => {
      this.tick().catch((err) => {
        log.error("Unhandled error in tick", {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      });
    }, this.config.pollIntervalMs);
  }

  /**
   * Stops the keeper gracefully.
   */
  async stop(): Promise<void> {
    log.info("Stopping keeper...");
    this.isRunning = false;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    // Wait for any in-progress tick to complete
    let waitCount = 0;
    while (this.isProcessing && waitCount < 30) {
      await sleep(1000);
      waitCount++;
    }

    if (this.isProcessing) {
      log.warn("Keeper did not finish processing within 30s shutdown window");
    }

    log.info("Keeper stopped");
  }

  /**
   * Single tick of the keeper loop: read state, analyze, maybe rebalance.
   */
  private async tick(): Promise<void> {
    if (this.isProcessing) {
      log.debug("Previous tick still processing, skipping");
      return;
    }

    this.isProcessing = true;
    const tickStart = Date.now();

    try {
      log.info("Tick started");

      // Step 1: Check gas price
      const feeData = await this.provider.getFeeData();
      const gasPriceGwei = feeData.gasPrice
        ? Number(ethers.formatUnits(feeData.gasPrice, "gwei"))
        : 0;

      if (gasPriceGwei > this.config.maxGasPriceGwei) {
        log.warn("Gas price exceeds maximum, skipping tick", {
          currentGwei: gasPriceGwei,
          maxGwei: this.config.maxGasPriceGwei,
        });
        return;
      }

      // Step 2: Read on-chain state
      const strategies = await this.readStrategies();
      if (strategies.length === 0) {
        log.info("No strategies registered on-chain, nothing to do");
        return;
      }

      const totalAssets = await this.readTotalAssets();
      log.info("On-chain state read", {
        strategyCount: strategies.length,
        totalAssets: totalAssets.toString(),
        gasPriceGwei,
      });

      for (const s of strategies) {
        log.debug("Strategy state", {
          address: s.address,
          type: s.type,
          apyBps: s.apyBps.toString(),
          currentWeightBps: s.currentWeight.toString(),
        });
      }

      // Step 3: Analyze and compute optimal weights
      const analysis = analyzeStrategies(
        strategies,
        this.config.strategyRiskConfigs,
        this.config.rebalanceThresholdBps
      );

      log.info("Analysis complete", {
        shouldRebalance: analysis.shouldRebalance,
        maxDeltaBps: analysis.maxDeltaBps.toString(),
        recommendedWeights: analysis.weights.map((w) => w.toString()),
      });

      log.debug("Analysis reasoning", { reasoning: analysis.reasoning });

      // Step 4: Execute rebalance if needed
      if (analysis.shouldRebalance) {
        await this.executeRebalance(analysis);
      } else {
        log.info("No rebalance needed at this time");
      }
    } catch (err) {
      log.error("Error during tick", {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      this.isProcessing = false;
      const elapsed = Date.now() - tickStart;
      log.info("Tick completed", { elapsedMs: elapsed });
    }
  }

  /**
   * Reads all strategy information from the StrategyController.
   */
  private async readStrategies(): Promise<StrategyInfo[]> {
    const [addresses, weights, apys] = await Promise.all([
      this.controller.getStrategies() as Promise<string[]>,
      this.controller.getWeights() as Promise<bigint[]>,
      this.controller.getStrategyAPYs() as Promise<bigint[]>,
    ]);

    const strategies: StrategyInfo[] = [];
    for (let i = 0; i < addresses.length; i++) {
      strategies.push({
        address: addresses[i],
        type: `strategy_${i}`, // Strategy type derived from index; name() can be called separately
        currentWeight: BigInt(weights[i] ?? 0n),
        apyBps: BigInt(apys[i] ?? 0n),
      });
    }

    return strategies;
  }

  /**
   * Reads total assets across all strategies.
   */
  private async readTotalAssets(): Promise<bigint> {
    const result = await this.controller.totalStrategyAssets();
    return BigInt(result);
  }

  /**
   * Submits a rebalance transaction to the StrategyController.
   */
  private async executeRebalance(analysis: AnalysisResult): Promise<void> {
    const weightsArray = analysis.weights;

    log.info("Executing rebalance", {
      weights: weightsArray.map((w) => w.toString()),
      reasoning: analysis.reasoning,
    });

    if (this.config.dryRun) {
      log.info("DRY RUN: Skipping transaction submission", {
        weights: weightsArray.map((w) => w.toString()),
      });
      return;
    }

    try {
      const tx = await this.controller.rebalance(weightsArray);
      log.info("Rebalance transaction submitted", {
        txHash: tx.hash,
        weights: weightsArray.map((w) => w.toString()),
      });

      const receipt = await tx.wait(1);
      if (receipt && receipt.status === 1) {
        log.info("Rebalance transaction confirmed", {
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        });
      } else {
        log.error("Rebalance transaction reverted", {
          txHash: tx.hash,
          status: receipt?.status,
        });
      }
    } catch (err) {
      log.error("Failed to execute rebalance transaction", {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
