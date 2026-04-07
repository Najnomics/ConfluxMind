import { loadConfig } from "./config";
import { ConfluxMindKeeper } from "./keeper";
import { Logger, setLogLevel } from "./logger";

const log = new Logger("Main");

async function main(): Promise<void> {
  log.info("ConfluxMind AI Keeper starting...");

  // Load configuration
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    log.error("Failed to load configuration", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  setLogLevel(config.logLevel);

  log.info("Configuration loaded", {
    rpcUrl: config.rpcUrl,
    chainId: config.chainId,
    controllerAddress: config.strategyControllerAddress,
    pollIntervalMs: config.pollIntervalMs,
    rebalanceThresholdBps: config.rebalanceThresholdBps,
    dryRun: config.dryRun,
    strategyTypes: config.strategyRiskConfigs.map((c) => c.type),
  });

  // Create keeper instance
  const keeper = new ConfluxMindKeeper(config);

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, initiating graceful shutdown...`);
    await keeper.stop();
    log.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    log.error("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on("uncaughtException", (err) => {
    log.error("Uncaught exception", {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

  // Start the keeper
  await keeper.start();

  log.info("Keeper is running. Press Ctrl+C to stop.");
}

main().catch((err) => {
  log.error("Fatal error during startup", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
