import { getPerformanceBudget, normalizePerformanceTier, type PerformanceTier } from "../../client/src/game/systems/performanceProfile";
import type { RuntimePerformanceTelemetrySnapshot } from "../../client/src/game/systems/runtimePerformanceTelemetry";
import { shouldEnableRuntimeObject, type RuntimeVisibilityInput } from "../../client/src/game/systems/runtimeVisibilitySystem";
import { hashStableJson } from "./commonGeneratorApi";
import { analyzeRuntimePerformanceSnapshot, type RuntimeProfilerInput, type RuntimeProfilerOutput } from "./runtimePerformanceProfiler";

export const RUNTIME_PERFORMANCE_CONTRACT_RULES_VERSION = "runtime-performance-contract-rules.v1" as const;
export const RUNTIME_PERFORMANCE_CONTRACT_GENERATOR_ID = "runtime.performance-contract" as const;
export const RUNTIME_PERFORMANCE_CONTRACT_GENERATOR_VERSION = "1.0.0" as const;
export const RUNTIME_PERFORMANCE_CONTRACT_SCHEMA_VERSION = "a-survival.runtime-performance-contract.v1" as const;

export type RuntimePerformanceContractIssueCode =
  | "TELEMETRY_TIER_MISMATCH"
  | "TELEMETRY_TARGET_FPS_MISMATCH"
  | "TELEMETRY_TARGET_FPS_EXCEEDS_BUDGET"
  | "TELEMETRY_NEGATIVE_METRIC"
  | "TELEMETRY_ACTIVE_MESHES_EXCEED_TOTAL";

export type RuntimePerformanceContractIssue = {
  code: RuntimePerformanceContractIssueCode;
  detail: string;
};

export type RuntimePerformanceContractInput = {
  seed: string;
  tier?: unknown;
  requestedViewDistanceBlocks?: unknown;
  requestedTargetFps?: unknown;
  telemetrySnapshot?: RuntimePerformanceTelemetrySnapshot | null;
  rulesVersion?: string;
};

export type RuntimePerformanceContractOutput = {
  artifact: {
    generatorId: typeof RUNTIME_PERFORMANCE_CONTRACT_GENERATOR_ID;
    generatorVersion: typeof RUNTIME_PERFORMANCE_CONTRACT_GENERATOR_VERSION;
    schemaVersion: typeof RUNTIME_PERFORMANCE_CONTRACT_SCHEMA_VERSION;
    seed: string;
    rulesVersion: typeof RUNTIME_PERFORMANCE_CONTRACT_RULES_VERSION;
    contentHash: string;
  };
  budget: ReturnType<typeof getPerformanceBudget>;
  visibility: {
    input: RuntimeVisibilityInput;
    objectPolicy: {
      safetyPaddingBlocks: 0;
      brokenStateEnabled: false;
      malformedMetadata: "fail-open";
    };
    probe: {
      insideBudgetRadius: boolean;
      outsideBudgetRadius: boolean;
      brokenState: boolean;
      missingCoordinates: boolean;
    };
  };
  simulation: {
    mobSimulationRadiusMeters: number;
    animationRadiusMeters: number;
    physicsRadiusMeters: number;
    maxParticleCount: number;
    lodPolicy: "aggressive" | "balanced" | "detailed";
    shadowQuality: "off" | "low" | "high";
  };
  throttling: {
    effectiveTargetFps: number;
    targetFrameMs: number;
    callbackPolicy: "render-when-interval-elapsed";
    telemetryFlushResetsWindow: true;
  };
  telemetry: {
    provided: boolean;
    sourceTier: PerformanceTier | null;
    sourceEffectiveTargetFps: number | null;
    compatible: boolean;
    snapshot: RuntimePerformanceTelemetrySnapshot | null;
  };
  profiler: {
    previewOnly: true;
    input: RuntimeProfilerInput | null;
    output: RuntimeProfilerOutput | null;
  };
  validation: {
    valid: boolean;
    issues: RuntimePerformanceContractIssue[];
  };
  claims: {
    runtimeWrite: false;
    generatorCall: false;
    assetGeneration: false;
    cacheWrite: false;
    playerVisibleEffect: false;
    deviceBenchmark: false;
    adaptiveTierMutation: false;
  };
};

function finiteNonNegative(value: number, fallback = 0): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

function optionalMetric(value: number | null): number | null {
  return value === null ? null : roundMetric(finiteNonNegative(value));
}

function normalizeTelemetrySnapshot(snapshot: RuntimePerformanceTelemetrySnapshot): RuntimePerformanceTelemetrySnapshot {
  const totalMeshes = Math.floor(finiteNonNegative(snapshot.totalMeshes));
  return {
    tier: snapshot.tier,
    effectiveTargetFps: roundMetric(finiteNonNegative(snapshot.effectiveTargetFps)),
    sampleWindowMs: roundMetric(finiteNonNegative(snapshot.sampleWindowMs)),
    renderedFrames: Math.floor(finiteNonNegative(snapshot.renderedFrames)),
    throttledFrames: Math.floor(finiteNonNegative(snapshot.throttledFrames)),
    averageFrameMs: optionalMetric(snapshot.averageFrameMs),
    p95FrameMs: optionalMetric(snapshot.p95FrameMs),
    worstFrameMs: optionalMetric(snapshot.worstFrameMs),
    totalMeshes,
    activeMeshes: Math.min(totalMeshes, Math.floor(finiteNonNegative(snapshot.activeMeshes))),
  };
}

function collectTelemetryIssues(snapshot: RuntimePerformanceTelemetrySnapshot, budget: ReturnType<typeof getPerformanceBudget>) {
  const issues: RuntimePerformanceContractIssue[] = [];
  if (snapshot.tier !== budget.tier) {
    issues.push({ code: "TELEMETRY_TIER_MISMATCH", detail: `telemetry tier ${snapshot.tier} does not match normalized runtime tier ${budget.tier}` });
  }
  if (snapshot.effectiveTargetFps !== budget.targetFps) {
    issues.push({ code: "TELEMETRY_TARGET_FPS_MISMATCH", detail: `telemetry effective target FPS ${snapshot.effectiveTargetFps} does not match normalized budget ${budget.targetFps}` });
  }
  if (snapshot.effectiveTargetFps > budget.maxTargetFps) {
    issues.push({ code: "TELEMETRY_TARGET_FPS_EXCEEDS_BUDGET", detail: `telemetry effective target FPS ${snapshot.effectiveTargetFps} exceeds ${budget.tier} budget maximum ${budget.maxTargetFps}` });
  }
  const negativeMetrics = [
    ["effectiveTargetFps", snapshot.effectiveTargetFps],
    ["sampleWindowMs", snapshot.sampleWindowMs],
    ["renderedFrames", snapshot.renderedFrames],
    ["throttledFrames", snapshot.throttledFrames],
    ["totalMeshes", snapshot.totalMeshes],
    ["activeMeshes", snapshot.activeMeshes],
    ["averageFrameMs", snapshot.averageFrameMs],
    ["p95FrameMs", snapshot.p95FrameMs],
    ["worstFrameMs", snapshot.worstFrameMs],
  ].filter(([, value]) => typeof value === "number" && value < 0).map(([label]) => label);
  if (negativeMetrics.length > 0) issues.push({ code: "TELEMETRY_NEGATIVE_METRIC", detail: `telemetry contains negative metrics: ${negativeMetrics.join(", ")}` });
  if (snapshot.activeMeshes > snapshot.totalMeshes) issues.push({ code: "TELEMETRY_ACTIVE_MESHES_EXCEED_TOTAL", detail: `telemetry active mesh count ${snapshot.activeMeshes} exceeds total mesh count ${snapshot.totalMeshes}` });
  return issues;
}

function buildProfilerInput(budget: ReturnType<typeof getPerformanceBudget>, snapshot: RuntimePerformanceTelemetrySnapshot): RuntimeProfilerInput {
  return {
    tier: budget.tier,
    effectiveTargetFps: budget.targetFps,
    viewDistanceBlocks: budget.viewDistanceBlocks,
    sampleWindowMs: snapshot.sampleWindowMs,
    renderedFrames: snapshot.renderedFrames,
    throttledFrames: snapshot.throttledFrames,
    averageFrameMs: snapshot.averageFrameMs,
    p95FrameMs: snapshot.p95FrameMs,
    worstFrameMs: snapshot.worstFrameMs,
    totalMeshes: snapshot.totalMeshes,
    activeMeshes: snapshot.activeMeshes,
  };
}

export function buildRuntimePerformanceContract(input: RuntimePerformanceContractInput): RuntimePerformanceContractOutput {
  const rulesVersion = input.rulesVersion ?? RUNTIME_PERFORMANCE_CONTRACT_RULES_VERSION;
  if (rulesVersion !== RUNTIME_PERFORMANCE_CONTRACT_RULES_VERSION) throw new Error(`Unsupported runtime performance contract rules version: ${rulesVersion}`);
  if (!input.seed.trim() || input.seed.length > 128) throw new Error("seed must be 1–128 characters");

  const budget = getPerformanceBudget(normalizePerformanceTier(input.tier), input.requestedViewDistanceBlocks, input.requestedTargetFps);
  const visibilityInput: RuntimeVisibilityInput = {
    positionX: 0,
    positionZ: 0,
    viewDistanceBlocks: budget.viewDistanceBlocks,
    safetyPaddingBlocks: 0,
  };
  const telemetrySnapshot = input.telemetrySnapshot ? normalizeTelemetrySnapshot(input.telemetrySnapshot) : null;
  const issues = telemetrySnapshot && input.telemetrySnapshot ? collectTelemetryIssues(input.telemetrySnapshot, budget) : [];
  const profilerInput = telemetrySnapshot ? buildProfilerInput(budget, telemetrySnapshot) : null;
  const profilerOutput = profilerInput ? analyzeRuntimePerformanceSnapshot(profilerInput) : null;
  const canonicalPayload = {
    schemaVersion: RUNTIME_PERFORMANCE_CONTRACT_SCHEMA_VERSION,
    generatorId: RUNTIME_PERFORMANCE_CONTRACT_GENERATOR_ID,
    generatorVersion: RUNTIME_PERFORMANCE_CONTRACT_GENERATOR_VERSION,
    seed: input.seed,
    rulesVersion,
    budget,
    visibilityInput,
    telemetrySnapshot,
    issues,
  };
  const contentHash = hashStableJson(canonicalPayload as never);
  return {
    artifact: {
      generatorId: RUNTIME_PERFORMANCE_CONTRACT_GENERATOR_ID,
      generatorVersion: RUNTIME_PERFORMANCE_CONTRACT_GENERATOR_VERSION,
      schemaVersion: RUNTIME_PERFORMANCE_CONTRACT_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash,
    },
    budget,
    visibility: {
      input: visibilityInput,
      objectPolicy: { safetyPaddingBlocks: 0, brokenStateEnabled: false, malformedMetadata: "fail-open" },
      probe: {
        insideBudgetRadius: shouldEnableRuntimeObject({ x: budget.viewDistanceBlocks, z: 0 }, visibilityInput),
        outsideBudgetRadius: shouldEnableRuntimeObject({ x: budget.viewDistanceBlocks + 1, z: 0 }, visibilityInput),
        brokenState: shouldEnableRuntimeObject({ x: 0, z: 0, state: "broken" }, visibilityInput),
        missingCoordinates: shouldEnableRuntimeObject({}, visibilityInput),
      },
    },
    simulation: {
      mobSimulationRadiusMeters: budget.mobSimulationRadiusMeters,
      animationRadiusMeters: budget.animationRadiusMeters,
      physicsRadiusMeters: budget.physicsRadiusMeters,
      maxParticleCount: budget.maxParticleCount,
      lodPolicy: budget.lodPolicy,
      shadowQuality: budget.shadowQuality,
    },
    throttling: {
      effectiveTargetFps: budget.targetFps,
      targetFrameMs: roundMetric(1000 / budget.targetFps),
      callbackPolicy: "render-when-interval-elapsed",
      telemetryFlushResetsWindow: true,
    },
    telemetry: {
      provided: telemetrySnapshot !== null,
      sourceTier: telemetrySnapshot?.tier ?? null,
      sourceEffectiveTargetFps: telemetrySnapshot?.effectiveTargetFps ?? null,
      compatible: issues.length === 0,
      snapshot: telemetrySnapshot,
    },
    profiler: { previewOnly: true, input: profilerInput, output: profilerOutput },
    validation: { valid: issues.length === 0, issues },
    claims: {
      runtimeWrite: false,
      generatorCall: false,
      assetGeneration: false,
      cacheWrite: false,
      playerVisibleEffect: false,
      deviceBenchmark: false,
      adaptiveTierMutation: false,
    },
  };
}
