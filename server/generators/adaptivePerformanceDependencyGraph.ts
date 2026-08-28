import {
  PERFORMANCE_BUDGETS,
  PERFORMANCE_TIERS,
  getPerformanceBudget,
  normalizePerformanceTier,
  type PerformanceTier,
} from "../../client/src/game/systems/performanceProfile";
import {
  advisePerformanceTier,
  type RuntimeCapabilityInput,
} from "../../client/src/game/systems/runtimePerformanceCapability";
import {
  createRuntimePerformanceSampler,
  DEFAULT_MAX_FRAME_SAMPLES,
  DEFAULT_PERFORMANCE_SAMPLE_WINDOW_MS,
} from "../../client/src/game/systems/runtimePerformanceTelemetry";
import { shouldEnableRuntimeObject } from "../../client/src/game/systems/runtimeVisibilitySystem";
import { getBlockRenderDistanceConfig } from "../../client/src/game/systems/renderDistance";
import { analyzeRuntimePerformanceSnapshot } from "./runtimePerformanceProfiler";
import { hashStableJson } from "./commonGeneratorApi";
import {
  validateGeneratorDependencyGraph,
  type DependencyGraphNode,
  type DependencyGraphValidation,
  type GeneratorDependency,
} from "./dependencyGraph";

export const ADAPTIVE_PERFORMANCE_GRAPH_RULES_VERSION = "adaptive-performance-graph-rules.v1" as const;
export const ADAPTIVE_PERFORMANCE_GRAPH_SCHEMA_VERSION = "a-survival.adaptive-performance-graph.v1" as const;
export const ADAPTIVE_PERFORMANCE_GRAPH_VERSION = "1.0.0" as const;
export const ADAPTIVE_PERFORMANCE_MAX_SAMPLE_WINDOW_MS = 10_000;
export const ADAPTIVE_PERFORMANCE_MAX_FRAME_SAMPLES = DEFAULT_MAX_FRAME_SAMPLES;

const DEFAULT_CAPABILITY_INPUT: RuntimeCapabilityInput = {
  webgl: true,
  webgl2: true,
  webgpu: false,
  hardwareConcurrency: 4,
  deviceMemoryGb: 4,
  storageQuotaGb: 2,
  maxTouchPoints: 0,
  viewportWidth: 1280,
  viewportHeight: 720,
};

const CAPABILITY_OWNER_KEY = "owner:performance:capability" as const;
const PROFILE_OWNER_KEY = "owner:performance:profile-budget" as const;
const VISIBILITY_OWNER_KEY = "owner:performance:runtime-visibility" as const;
const TELEMETRY_OWNER_KEY = "owner:performance:telemetry" as const;
const PROFILER_OWNER_KEY = "owner:performance:profiler" as const;
const ADAPTIVE_CONTROLLER_OWNER_KEY = "owner:performance:adaptive-controller" as const;
const LOD_RUNTIME_OWNER_KEY = "owner:performance:lod-runtime" as const;
const HYSTERESIS_OWNER_KEY = "owner:performance:hysteresis" as const;
const POOLING_OWNER_KEY = "owner:performance:pooling" as const;
const SLEEP_WAKE_OWNER_KEY = "owner:performance:sleep-wake" as const;

export type AdaptivePerformanceDependencyGraphInput = {
  tier?: unknown;
  requestedViewDistanceBlocks?: unknown;
  requestedTargetFps?: unknown;
  capability?: RuntimeCapabilityInput;
  sampleWindowMs?: number;
  maxFrameSamples?: number;
  rulesVersion?: string;
};

export type AdaptivePerformanceBlocker =
  | "adaptive-tier-controller-owner-missing"
  | "lod-runtime-owner-missing"
  | "hysteresis-owner-missing"
  | "pooling-owner-missing"
  | "sleep-wake-owner-missing";

export type AdaptivePerformanceDependencyGraphSummary = {
  configuredTierCount: number;
  configuredTiers: PerformanceTier[];
  selectedTier: PerformanceTier;
  selectedBudget: {
    maxViewDistanceBlocks: number;
    maxTargetFps: number;
    mobSimulationRadiusMeters: number;
    animationRadiusMeters: number;
    physicsRadiusMeters: number;
    maxParticleCount: number;
    shadowQuality: "off" | "low" | "high";
    lodPolicy: "aggressive" | "balanced" | "detailed";
  };
  capability: {
    recommendedTier: PerformanceTier;
    confidence: "conservative" | "heuristic";
    webgl: boolean;
    webgl2: boolean;
    webgpu: boolean;
    oneTimeProbe: true;
    adaptiveTiering: false;
    autoApplied: false;
    renderLoopCoupled: false;
    networkPersistence: false;
  };
  renderDistance: {
    viewDistanceBlocks: number;
    visibleRadiusMeters: number;
    prefetchRadiusMeters: number;
    preset: "near" | "balanced" | "far";
  };
  visibility: {
    nearObjectEnabled: boolean;
    farObjectDisabled: boolean;
    brokenObjectDisabled: boolean;
    cullingOwnerPresent: true;
  };
  telemetry: {
    sampleWindowMs: number;
    maxFrameSamples: number;
    renderedFrames: number;
    throttledFrames: number;
    averageFrameMs: number | null;
    p95FrameMs: number | null;
    worstFrameMs: number | null;
  };
  profiler: {
    status: "no-sample" | "watch" | "action";
    observedFps: number | null;
    deviceBenchmark: false;
    adaptiveTiering: false;
    playerRuntimeMutation: false;
    networkPersistence: false;
  };
  owners: {
    capability: true;
    staticBudgets: true;
    visibilityCulling: true;
    telemetry: true;
    profiler: true;
    lodPolicyConfigured: true;
    adaptiveTierController: false;
    lodRuntime: false;
    hysteresis: false;
    pooling: false;
    sleepWake: false;
  };
  blockerCodes: AdaptivePerformanceBlocker[];
  runtimeImportAllowed: false;
  playerVisible: false;
  cacheable: false;
};

export type AdaptivePerformanceDependencyGraphOutput = {
  summary: AdaptivePerformanceDependencyGraphSummary;
  blockers: AdaptivePerformanceBlocker[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedSampleWindow(value: number | undefined): number {
  const sampleWindowMs = value ?? DEFAULT_PERFORMANCE_SAMPLE_WINDOW_MS;
  if (!Number.isFinite(sampleWindowMs) || !Number.isInteger(sampleWindowMs) || sampleWindowMs < 1 || sampleWindowMs > ADAPTIVE_PERFORMANCE_MAX_SAMPLE_WINDOW_MS) {
    throw new Error(`sampleWindowMs must be an integer between 1 and ${ADAPTIVE_PERFORMANCE_MAX_SAMPLE_WINDOW_MS}`);
  }
  return sampleWindowMs;
}

function boundedFrameSamples(value: number | undefined): number {
  const maxFrameSamples = value ?? DEFAULT_MAX_FRAME_SAMPLES;
  if (!Number.isFinite(maxFrameSamples) || !Number.isInteger(maxFrameSamples) || maxFrameSamples < 1 || maxFrameSamples > ADAPTIVE_PERFORMANCE_MAX_FRAME_SAMPLES) {
    throw new Error(`maxFrameSamples must be an integer between 1 and ${ADAPTIVE_PERFORMANCE_MAX_FRAME_SAMPLES}`);
  }
  return maxFrameSamples;
}

function sourceNode(key: string, generatorId: string, source: string, rulesVersion: string): DependencyGraphNode {
  return {
    key,
    kind: "other",
    generatorId,
    generatorVersion: "1.0.0",
    schemaVersion: ADAPTIVE_PERFORMANCE_GRAPH_SCHEMA_VERSION,
    seed: "adaptive-performance",
    rulesVersion,
    contentHash: hashStableJson({ generatorId, source, rulesVersion } as never),
    dependencies: [],
  };
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return {
    key: node.key,
    kind: node.kind,
    required: true,
    generatorId: node.generatorId,
    generatorVersion: node.generatorVersion,
    contentHash: node.contentHash,
  };
}

function missingDependency(key: string, generatorId: string): GeneratorDependency {
  return { key, kind: "simulation", required: true, generatorId, generatorVersion: "1.0.0" };
}

export function buildAdaptivePerformanceDependencyGraph(
  input: AdaptivePerformanceDependencyGraphInput = {},
): AdaptivePerformanceDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? ADAPTIVE_PERFORMANCE_GRAPH_RULES_VERSION;
  if (rulesVersion !== ADAPTIVE_PERFORMANCE_GRAPH_RULES_VERSION) throw new Error(`Unsupported adaptive performance graph rules version: ${rulesVersion}`);
  const sampleWindowMs = boundedSampleWindow(input.sampleWindowMs);
  const maxFrameSamples = boundedFrameSamples(input.maxFrameSamples);
  const selectedTier = normalizePerformanceTier(input.tier);
  const selectedBudget = getPerformanceBudget(selectedTier, input.requestedViewDistanceBlocks, input.requestedTargetFps);
  const capabilityAdvice = advisePerformanceTier(input.capability ?? DEFAULT_CAPABILITY_INPUT);
  const renderDistance = getBlockRenderDistanceConfig(selectedBudget.viewDistanceBlocks);
  const visibilityInput = { positionX: 0, positionZ: 0, viewDistanceBlocks: selectedBudget.viewDistanceBlocks };
  const visibility = {
    nearObjectEnabled: shouldEnableRuntimeObject({ x: selectedBudget.viewDistanceBlocks, z: 0 }, visibilityInput),
    farObjectDisabled: !shouldEnableRuntimeObject({ x: selectedBudget.viewDistanceBlocks + 1, z: 0 }, visibilityInput),
    brokenObjectDisabled: !shouldEnableRuntimeObject({ x: 0, z: 0, state: "broken" }, visibilityInput),
  };

  const sampler = createRuntimePerformanceSampler({ tier: selectedTier, effectiveTargetFps: selectedBudget.targetFps, sampleWindowMs, maxFrameSamples });
  sampler.recordCallback(0, true);
  sampler.recordCallback(Math.max(1, Math.round(1000 / selectedBudget.targetFps)), false);
  sampler.recordCallback(Math.max(2, Math.round(2000 / selectedBudget.targetFps)), true);
  const telemetrySnapshot = sampler.flush(sampleWindowMs)!;
  const profiler = analyzeRuntimePerformanceSnapshot({
    viewDistanceBlocks: selectedBudget.viewDistanceBlocks,
    ...telemetrySnapshot,
  });
  const blockers: AdaptivePerformanceBlocker[] = [
    "adaptive-tier-controller-owner-missing",
    "lod-runtime-owner-missing",
    "hysteresis-owner-missing",
    "pooling-owner-missing",
    "sleep-wake-owner-missing",
  ];
  const summary: AdaptivePerformanceDependencyGraphSummary = {
    configuredTierCount: PERFORMANCE_TIERS.length,
    configuredTiers: [...PERFORMANCE_TIERS],
    selectedTier,
    selectedBudget: {
      maxViewDistanceBlocks: selectedBudget.maxViewDistanceBlocks,
      maxTargetFps: selectedBudget.maxTargetFps,
      mobSimulationRadiusMeters: selectedBudget.mobSimulationRadiusMeters,
      animationRadiusMeters: selectedBudget.animationRadiusMeters,
      physicsRadiusMeters: selectedBudget.physicsRadiusMeters,
      maxParticleCount: selectedBudget.maxParticleCount,
      shadowQuality: selectedBudget.shadowQuality,
      lodPolicy: selectedBudget.lodPolicy,
    },
    capability: {
      recommendedTier: capabilityAdvice.recommendedTier,
      confidence: capabilityAdvice.confidence,
      webgl: capabilityAdvice.snapshot.webgl,
      webgl2: capabilityAdvice.snapshot.webgl2,
      webgpu: capabilityAdvice.snapshot.webgpu,
      oneTimeProbe: true,
      adaptiveTiering: false,
      autoApplied: false,
      renderLoopCoupled: false,
      networkPersistence: false,
    },
    renderDistance: {
      viewDistanceBlocks: selectedBudget.viewDistanceBlocks,
      visibleRadiusMeters: renderDistance.visibleRadiusMeters,
      prefetchRadiusMeters: renderDistance.prefetchRadiusMeters,
      preset: renderDistance.preset,
    },
    visibility: { ...visibility, cullingOwnerPresent: true },
    telemetry: {
      sampleWindowMs: telemetrySnapshot.sampleWindowMs,
      maxFrameSamples,
      renderedFrames: telemetrySnapshot.renderedFrames,
      throttledFrames: telemetrySnapshot.throttledFrames,
      averageFrameMs: telemetrySnapshot.averageFrameMs,
      p95FrameMs: telemetrySnapshot.p95FrameMs,
      worstFrameMs: telemetrySnapshot.worstFrameMs,
    },
    profiler: {
      status: profiler.status,
      observedFps: profiler.observedFps,
      deviceBenchmark: false,
      adaptiveTiering: false,
      playerRuntimeMutation: false,
      networkPersistence: false,
    },
    owners: {
      capability: true,
      staticBudgets: true,
      visibilityCulling: true,
      telemetry: true,
      profiler: true,
      lodPolicyConfigured: true,
      adaptiveTierController: false,
      lodRuntime: false,
      hysteresis: false,
      pooling: false,
      sleepWake: false,
    },
    blockerCodes: blockers,
    runtimeImportAllowed: false,
    playerVisible: false,
    cacheable: false,
  };

  const capabilityNode = sourceNode(CAPABILITY_OWNER_KEY, "runtime.performance.capability", "client/src/game/systems/runtimePerformanceCapability.ts", rulesVersion);
  const profileNode = sourceNode(PROFILE_OWNER_KEY, "runtime.performance.profile-budget", "client/src/game/systems/performanceProfile.ts", rulesVersion);
  const visibilityNode = sourceNode(VISIBILITY_OWNER_KEY, "runtime.performance.visibility", "client/src/game/systems/runtimeVisibilitySystem.ts", rulesVersion);
  const telemetryNode = sourceNode(TELEMETRY_OWNER_KEY, "runtime.performance.telemetry", "client/src/game/systems/runtimePerformanceTelemetry.ts", rulesVersion);
  const profilerNode = sourceNode(PROFILER_OWNER_KEY, "runtime.performance.profiler", "server/generators/runtimePerformanceProfiler.ts", rulesVersion);
  const dependencies: GeneratorDependency[] = [capabilityNode, profileNode, visibilityNode, telemetryNode, profilerNode].map(dependencyFor);
  dependencies.push(missingDependency(ADAPTIVE_CONTROLLER_OWNER_KEY, "runtime.performance.adaptive-controller"));
  dependencies.push(missingDependency(LOD_RUNTIME_OWNER_KEY, "runtime.performance.lod-runtime"));
  dependencies.push(missingDependency(HYSTERESIS_OWNER_KEY, "runtime.performance.hysteresis"));
  dependencies.push(missingDependency(POOLING_OWNER_KEY, "runtime.performance.pooling"));
  dependencies.push(missingDependency(SLEEP_WAKE_OWNER_KEY, "runtime.performance.sleep-wake"));

  const auditNode: DependencyGraphNode = {
    key: `adaptive-performance:${selectedTier}:${selectedBudget.viewDistanceBlocks}:${selectedBudget.targetFps}:${sampleWindowMs}:${maxFrameSamples}`,
    kind: "simulation",
    generatorId: "runtime.performance.adaptive-audit",
    generatorVersion: ADAPTIVE_PERFORMANCE_GRAPH_VERSION,
    schemaVersion: ADAPTIVE_PERFORMANCE_GRAPH_SCHEMA_VERSION,
    seed: `${selectedTier}:${sampleWindowMs}:${maxFrameSamples}`,
    rulesVersion,
    contentHash: hashStableJson({ summary, dependencies } as never),
    dependencies,
  };
  const nodes = [capabilityNode, profileNode, visibilityNode, telemetryNode, profilerNode, auditNode];
  return { summary, blockers, nodes, graph: validateGeneratorDependencyGraph(nodes) };
}

export function getDefaultAdaptivePerformanceDependencyGraphInput(): AdaptivePerformanceDependencyGraphInput {
  return { tier: "balanced", requestedViewDistanceBlocks: 35, requestedTargetFps: 60, sampleWindowMs: DEFAULT_PERFORMANCE_SAMPLE_WINDOW_MS, maxFrameSamples: DEFAULT_MAX_FRAME_SAMPLES };
}
