/**
 * ConfluxMind AI Agent Logger
 *
 * Outputs timestamped JSON with a dedicated `reasoning` field
 * so judges can follow the agent's decision-making process.
 */

export interface ReasoningEntry {
  strategy: string;
  yieldRate: { value: string; score: number };
  utilizationRisk: { value: string; score: number };
  liquidityDepth: { value: string; score: number };
  composite: number;
}

export interface DecisionLog {
  timestamp: string;
  agent: string;
  phase: string;
  reasoning: ReasoningEntry[];
  decision: string;
  action: string;
  details?: Record<string, unknown>;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

export class Logger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  info(message: string, data?: Record<string, unknown>): void {
    const entry = {
      timestamp: formatTimestamp(),
      level: "INFO",
      component: this.component,
      message,
      ...data,
    };
    process.stdout.write(JSON.stringify(entry) + "\n");
  }

  warn(message: string, data?: Record<string, unknown>): void {
    const entry = {
      timestamp: formatTimestamp(),
      level: "WARN",
      component: this.component,
      message,
      ...data,
    };
    process.stdout.write(JSON.stringify(entry) + "\n");
  }

  error(message: string, data?: Record<string, unknown>): void {
    const entry = {
      timestamp: formatTimestamp(),
      level: "ERROR",
      component: this.component,
      message,
      ...data,
    };
    process.stderr.write(JSON.stringify(entry) + "\n");
  }

  debug(message: string, data?: Record<string, unknown>): void {
    const entry = {
      timestamp: formatTimestamp(),
      level: "DEBUG",
      component: this.component,
      message,
      ...data,
    };
    process.stdout.write(JSON.stringify(entry) + "\n");
  }

  /**
   * Outputs a rich reasoning log designed for hackathon judges.
   * This is the primary decision-visibility surface.
   */
  reasoning(log: DecisionLog): void {
    // Structured JSON for programmatic consumption
    process.stdout.write(JSON.stringify(log) + "\n");

    // Human-readable format for terminal readability
    const lines: string[] = [];
    lines.push("");
    lines.push(`[${log.timestamp}] ${log.agent} -- ${log.phase}`);
    lines.push("=".repeat(70));

    for (const r of log.reasoning) {
      lines.push(`  Strategy: ${r.strategy}`);
      lines.push(
        `    Yield Rate:       ${r.yieldRate.value} -> Score: ${r.yieldRate.score}/100`
      );
      lines.push(
        `    Utilization Risk: ${r.utilizationRisk.value} -> Score: ${r.utilizationRisk.score}/100 (${describeUtilRisk(r.utilizationRisk.score)})`
      );
      lines.push(
        `    Liquidity Depth:  ${r.liquidityDepth.value} -> Score: ${r.liquidityDepth.score}/100 (${describeLiqDepth(r.liquidityDepth.score)})`
      );
      lines.push(
        `    Composite: ${r.composite.toFixed(1)} (weight: 40% yield, 30% util, 30% liq)`
      );
      lines.push("");
    }

    lines.push(`  Decision: ${log.decision}`);
    lines.push(`  Action:   ${log.action}`);
    if (log.details) {
      for (const [k, v] of Object.entries(log.details)) {
        lines.push(`  ${k}: ${JSON.stringify(v)}`);
      }
    }
    lines.push("=".repeat(70));
    lines.push("");

    process.stdout.write(lines.join("\n") + "\n");
  }
}

function describeUtilRisk(score: number): string {
  if (score >= 80) return "low risk";
  if (score >= 60) return "moderate risk";
  if (score >= 40) return "elevated risk";
  return "high risk";
}

function describeLiqDepth(score: number): string {
  if (score >= 90) return "very deep";
  if (score >= 70) return "deep";
  if (score >= 50) return "adequate";
  if (score >= 30) return "shallow";
  return "very shallow";
}
