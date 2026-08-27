import { getPerformanceBudget, type PerformanceTier } from "./performanceProfile";
import type { TargetFps, ViewDistanceBlocks } from "./renderDistance";

export const RUNTIME_PERFORMANCE_CONTRACT_VERSION = "0.1.0" as const;

export type RuntimePerformanceContract = Readonly<{
  contractVersion: typeof RUNTIME_PERFORMANCE_CONTRACT_VERSION;
  tier: PerformanceTier;
  budget: Readonly<ReturnType<typeof getPerformanceBudget>>;
  visibility: Readonly<{
    viewDistanceBlocks: ViewDistanceBlocks;
    safetyPaddingBlocks: 0;
  }>;
  telemetry: Readonly<{
    tier: PerformanceTier;
    effectiveTargetFps: TargetFps;
  }>;
  profiler: Readonly<{
    tier: PerformanceTier;
    effectiveTargetFps: TargetFps;
    viewDistanceBlocks: ViewDistanceBlocks;
  }>;
  claims: Readonly<{
    deviceBenchmark: false;
    adaptiveTiering: false;
    playerRuntimeMutation: false;
    networkPersistence: false;
  }>;
}>;

/**
 * Derives one immutable budget for the three existing runtime consumers.
 * This is a pure adapter; it does not start sampling, alter runtime state, or persist data.
 */
export function buildRuntimePerformanceContract(
  tier: unknown,
  requestedViewDistanceBlocks?: unknown,
  requestedTargetFps?: unknown,
): RuntimePerformanceContract {
  const budget = Object.freeze(getPerformanceBudget(tier, requestedViewDistanceBlocks, requestedTargetFps));
  const claims = Object.freeze({
    deviceBenchmark: false as const,
    adaptiveTiering: false as const,
    playerRuntimeMutation: false as const,
    networkPersistence: false as const,
  });

  return Object.freeze({
    contractVersion: RUNTIME_PERFORMANCE_CONTRACT_VERSION,
    tier: budget.tier,
    budget,
    visibility: Object.freeze({
      viewDistanceBlocks: budget.viewDistanceBlocks,
      safetyPaddingBlocks: 0 as const,
    }),
    telemetry: Object.freeze({
      tier: budget.tier,
      effectiveTargetFps: budget.targetFps,
    }),
    profiler: Object.freeze({
      tier: budget.tier,
      effectiveTargetFps: budget.targetFps,
      viewDistanceBlocks: budget.viewDistanceBlocks,
    }),
    claims,
  });
}
