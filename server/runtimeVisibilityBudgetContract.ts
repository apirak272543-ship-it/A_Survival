import { getPerformanceBudget, type PerformanceTier } from "../client/src/game/systems/performanceProfile";

export const RUNTIME_VISIBILITY_BUDGET_VERSION = "runtime-visibility-budget.v1" as const;

export type RuntimeVisibilityBudgetInput = {
  tier: PerformanceTier;
  requestedViewDistanceBlocks?: number;
  requestedTargetFps?: number;
  visibleObjectCount?: number;
  particleCount?: number;
};

export type RuntimeVisibilityBudgetResult = {
  contractVersion: typeof RUNTIME_VISIBILITY_BUDGET_VERSION;
  valid: boolean;
  issues: string[];
  tier: PerformanceTier;
  budget: ReturnType<typeof getPerformanceBudget>;
  observed: {
    visibleObjectCount: number | null;
    particleCount: number | null;
  };
  runtimePolicy: {
    renderLoopGeneratorCallsAllowed: false;
    assetGenerationAllowed: false;
    cacheWriteAllowed: false;
    sleepOutsideRadius: true;
    lodPolicy: ReturnType<typeof getPerformanceBudget>["lodPolicy"];
    shadowQuality: ReturnType<typeof getPerformanceBudget>["shadowQuality"];
  };
};

function observedCount(value: number | undefined, field: string, issues: string[]) {
  if (value === undefined) return null;
  if (!Number.isInteger(value) || value < 0) {
    issues.push(`${field} must be a non-negative integer`);
    return null;
  }
  return value;
}

export function evaluateRuntimeVisibilityBudget(input: RuntimeVisibilityBudgetInput): RuntimeVisibilityBudgetResult {
  const issues: string[] = [];
  const budget = getPerformanceBudget(input.tier, input.requestedViewDistanceBlocks, input.requestedTargetFps);
  const visibleObjectCount = observedCount(input.visibleObjectCount, "visibleObjectCount", issues);
  const particleCount = observedCount(input.particleCount, "particleCount", issues);
  if (particleCount !== null && particleCount > budget.maxParticleCount) issues.push(`particleCount exceeds ${budget.tier} budget: ${particleCount} > ${budget.maxParticleCount}`);
  if (budget.viewDistanceBlocks > budget.maxViewDistanceBlocks) issues.push("viewDistanceBlocks exceeds tier budget");
  if (budget.targetFps > budget.maxTargetFps) issues.push("targetFps exceeds tier budget");
  return {
    contractVersion: RUNTIME_VISIBILITY_BUDGET_VERSION,
    valid: issues.length === 0,
    issues,
    tier: budget.tier,
    budget,
    observed: { visibleObjectCount, particleCount },
    runtimePolicy: {
      renderLoopGeneratorCallsAllowed: false,
      assetGenerationAllowed: false,
      cacheWriteAllowed: false,
      sleepOutsideRadius: true,
      lodPolicy: budget.lodPolicy,
      shadowQuality: budget.shadowQuality,
    },
  };
}
