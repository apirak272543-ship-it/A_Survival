import { getPerformanceBudget, normalizePerformanceTier, type PerformanceTier } from "../../client/src/game/systems/performanceProfile";
import { DEFAULT_MAX_FRAME_SAMPLES, DEFAULT_PERFORMANCE_SAMPLE_WINDOW_MS } from "../../client/src/game/systems/runtimePerformanceTelemetry";
import { shouldEnableRuntimeObject } from "../../client/src/game/systems/runtimeVisibilitySystem";
import { getStreamingChunkKeys } from "../../client/src/game/systems/visibleRegionSystem";
import { hashStableJson } from "./commonGeneratorApi";
import { RUNTIME_PROFILER_VERSION } from "./runtimePerformanceProfiler";

export const RUNTIME_PERFORMANCE_CAPABILITY_RULES_VERSION = "runtime-performance-capability-rules.v1" as const;
export const RUNTIME_PERFORMANCE_CAPABILITY_GENERATOR_ID = "runtime.performance-capability" as const;
export const RUNTIME_PERFORMANCE_CAPABILITY_GENERATOR_VERSION = "1.0.0" as const;
export const RUNTIME_PERFORMANCE_CAPABILITY_SCHEMA_VERSION = "a-survival.runtime-performance-capability.v1" as const;

export type RuntimePerformanceCapabilityStatus = "verified" | "missing-evidence";

export type RuntimePerformanceCapabilityId =
  | "explicit-performance-tiers"
  | "tier-budget-clamping"
  | "discrete-view-and-fps-options"
  | "distance-visibility-policy"
  | "bounded-chunk-streaming"
  | "bounded-runtime-telemetry"
  | "preview-only-profiler"
  | "render-callback-throttling"
  | "device-capability-detection"
  | "real-device-benchmark"
  | "adaptive-tiering"
  | "hysteresis-controller"
  | "frustum-culling"
  | "occlusion-culling"
  | "object-pooling"
  | "full-lod-controller"
  | "persistent-profiler-history";

export type RuntimePerformanceCapabilityRecord = {
  id: RuntimePerformanceCapabilityId;
  status: RuntimePerformanceCapabilityStatus;
  required: boolean;
  owner: string;
  reason: string;
};

export type RuntimePerformanceCapabilityInput = {
  seed: string;
  tier?: unknown;
  requestedViewDistanceBlocks?: unknown;
  requestedTargetFps?: unknown;
  rulesVersion?: string;
};

export type RuntimePerformanceCapabilityOutput = {
  artifact: {
    generatorId: typeof RUNTIME_PERFORMANCE_CAPABILITY_GENERATOR_ID;
    generatorVersion: typeof RUNTIME_PERFORMANCE_CAPABILITY_GENERATOR_VERSION;
    schemaVersion: typeof RUNTIME_PERFORMANCE_CAPABILITY_SCHEMA_VERSION;
    seed: string;
    rulesVersion: typeof RUNTIME_PERFORMANCE_CAPABILITY_RULES_VERSION;
    contentHash: string;
  };
  budget: ReturnType<typeof getPerformanceBudget>;
  visibility: {
    viewDistanceBlocks: number;
    chunkWorldSize: 16;
    mapRadiusMeters: 500;
    visibleChunkCount: number;
    insideBudgetObjectEnabled: boolean;
    outsideBudgetObjectEnabled: boolean;
    brokenObjectEnabled: boolean;
    malformedMetadataEnabled: boolean;
  };
  telemetry: {
    sampleWindowMs: number;
    maxFrameSamples: number;
    storesOnlyCurrentWindow: true;
    meshCountsSampledOnFlush: true;
    networkUpload: false;
  };
  profiler: {
    version: string;
    previewOnly: true;
    deviceBenchmark: false;
    adaptiveTierMutation: false;
    persistentHistory: false;
  };
  capabilities: RuntimePerformanceCapabilityRecord[];
  blockers: RuntimePerformanceCapabilityRecord[];
  summary: {
    verifiedCapabilityCount: number;
    requiredBlockerCount: number;
    bounded: true;
    deterministic: true;
    deviceBenchmark: false;
    mobileAcceptance: false;
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

const VERIFIED_CAPABILITIES: readonly RuntimePerformanceCapabilityRecord[] = [
  { id: "explicit-performance-tiers", status: "verified", required: false, owner: "client/src/game/systems/performanceProfile.ts", reason: "low, balanced, and high are explicit data-driven budgets" },
  { id: "tier-budget-clamping", status: "verified", required: false, owner: "client/src/game/systems/performanceProfile.ts", reason: "requested view distance and target FPS are clamped to the selected tier" },
  { id: "discrete-view-and-fps-options", status: "verified", required: false, owner: "client/src/game/systems/renderDistance.ts", reason: "view distance and target FPS normalize to finite discrete options" },
  { id: "distance-visibility-policy", status: "verified", required: false, owner: "client/src/game/systems/runtimeVisibilitySystem.ts", reason: "distance-based object activation is pure and broken objects are disabled" },
  { id: "bounded-chunk-streaming", status: "verified", required: false, owner: "client/src/game/systems/visibleRegionSystem.ts", reason: "streaming chunk output is deterministic and clipped to the 500m map boundary" },
  { id: "bounded-runtime-telemetry", status: "verified", required: false, owner: "client/src/game/systems/runtimePerformanceTelemetry.ts", reason: "telemetry is limited to one window and a bounded frame-interval buffer" },
  { id: "preview-only-profiler", status: "verified", required: false, owner: "server/generators/runtimePerformanceProfiler.ts", reason: "snapshot analysis is pure preview output and does not mutate runtime or persist data" },
  { id: "render-callback-throttling", status: "verified", required: false, owner: "client/src/components/GameCanvas.tsx", reason: "render callbacks use the effective target FPS interval before scene.render" },
];

const REQUIRED_BLOCKERS: readonly RuntimePerformanceCapabilityRecord[] = [
  { id: "device-capability-detection", status: "missing-evidence", required: true, owner: "client/src/game/systems/performanceProfile.ts", reason: "no WebGL/WebGPU/CPU/GPU/RAM capability detector is owned by the current runtime slice" },
  { id: "real-device-benchmark", status: "missing-evidence", required: true, owner: "docs/PERFORMANCE_PROFILE.md", reason: "no real-device FPS, memory, thermal, battery, or WebView benchmark evidence is present" },
  { id: "adaptive-tiering", status: "missing-evidence", required: true, owner: "client/src/game/systems/performanceProfile.ts", reason: "tier is user-selected and no automatic tier switcher is implemented" },
  { id: "hysteresis-controller", status: "missing-evidence", required: true, owner: "client/src/game/systems/performanceProfile.ts", reason: "no hysteresis or cooldown controller exists for adaptive tier transitions" },
  { id: "frustum-culling", status: "missing-evidence", required: true, owner: "client/src/game/systems/runtimeVisibilitySystem.ts", reason: "the current policy is distance activation and does not prove frustum culling for every object" },
  { id: "occlusion-culling", status: "missing-evidence", required: true, owner: "client/src/game/systems/runtimeVisibilitySystem.ts", reason: "no occlusion culling implementation or evidence is owned by the current slice" },
  { id: "object-pooling", status: "missing-evidence", required: true, owner: "client/src/game/scene.ts", reason: "no generic runtime object-pooling contract is proven by the current slice" },
  { id: "full-lod-controller", status: "missing-evidence", required: true, owner: "client/src/game/systems/performanceProfile.ts", reason: "lodPolicy is a budget label; a full LOD controller is not proven" },
  { id: "persistent-profiler-history", status: "missing-evidence", required: true, owner: "server/generators/runtimePerformanceProfiler.ts", reason: "profiler output is preview-only and has no durable history owner" },
];

function finiteNonNegative(value: number, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function validateSeed(seed: string) {
  if (!seed.trim() || seed.length > 128) throw new Error("seed must be 1–128 characters");
}

export function buildRuntimePerformanceCapability(input: RuntimePerformanceCapabilityInput): RuntimePerformanceCapabilityOutput {
  const rulesVersion = input.rulesVersion ?? RUNTIME_PERFORMANCE_CAPABILITY_RULES_VERSION;
  if (rulesVersion !== RUNTIME_PERFORMANCE_CAPABILITY_RULES_VERSION) throw new Error(`Unsupported runtime performance capability rules version: ${rulesVersion}`);
  validateSeed(input.seed);

  const budget = getPerformanceBudget(normalizePerformanceTier(input.tier), input.requestedViewDistanceBlocks, input.requestedTargetFps);
  const visibleChunkCount = getStreamingChunkKeys({
    positionX: 0,
    positionZ: 0,
    chunkWorldSize: 16,
    visibleRadiusMeters: budget.viewDistanceBlocks,
    mapRadiusMeters: 500,
  }).size;
  const insideBudgetObjectEnabled = shouldEnableRuntimeObject({ x: budget.viewDistanceBlocks, z: 0 }, { positionX: 0, positionZ: 0, viewDistanceBlocks: budget.viewDistanceBlocks });
  const outsideBudgetObjectEnabled = shouldEnableRuntimeObject({ x: budget.viewDistanceBlocks + 1, z: 0 }, { positionX: 0, positionZ: 0, viewDistanceBlocks: budget.viewDistanceBlocks });
  const brokenObjectEnabled = shouldEnableRuntimeObject({ x: 0, z: 0, state: "broken" }, { positionX: 0, positionZ: 0, viewDistanceBlocks: budget.viewDistanceBlocks });
  const malformedMetadataEnabled = shouldEnableRuntimeObject({}, { positionX: 0, positionZ: 0, viewDistanceBlocks: budget.viewDistanceBlocks });
  const capabilities = VERIFIED_CAPABILITIES.map(capability => ({ ...capability }));
  const blockers = REQUIRED_BLOCKERS.map(blocker => ({ ...blocker }));
  const canonicalPayload = {
    schemaVersion: RUNTIME_PERFORMANCE_CAPABILITY_SCHEMA_VERSION,
    generatorId: RUNTIME_PERFORMANCE_CAPABILITY_GENERATOR_ID,
    generatorVersion: RUNTIME_PERFORMANCE_CAPABILITY_GENERATOR_VERSION,
    seed: input.seed,
    rulesVersion,
    budget,
    visibility: { visibleChunkCount, insideBudgetObjectEnabled, outsideBudgetObjectEnabled, brokenObjectEnabled, malformedMetadataEnabled },
    telemetry: { sampleWindowMs: DEFAULT_PERFORMANCE_SAMPLE_WINDOW_MS, maxFrameSamples: DEFAULT_MAX_FRAME_SAMPLES },
    profilerVersion: RUNTIME_PROFILER_VERSION,
    capabilities,
    blockers,
  };
  const contentHash = hashStableJson(canonicalPayload as never);
  return {
    artifact: {
      generatorId: RUNTIME_PERFORMANCE_CAPABILITY_GENERATOR_ID,
      generatorVersion: RUNTIME_PERFORMANCE_CAPABILITY_GENERATOR_VERSION,
      schemaVersion: RUNTIME_PERFORMANCE_CAPABILITY_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash,
    },
    budget,
    visibility: {
      viewDistanceBlocks: budget.viewDistanceBlocks,
      chunkWorldSize: 16,
      mapRadiusMeters: 500,
      visibleChunkCount,
      insideBudgetObjectEnabled,
      outsideBudgetObjectEnabled,
      brokenObjectEnabled,
      malformedMetadataEnabled,
    },
    telemetry: {
      sampleWindowMs: Math.max(1, Math.round(finiteNonNegative(DEFAULT_PERFORMANCE_SAMPLE_WINDOW_MS))),
      maxFrameSamples: Math.max(1, Math.floor(finiteNonNegative(DEFAULT_MAX_FRAME_SAMPLES))),
      storesOnlyCurrentWindow: true,
      meshCountsSampledOnFlush: true,
      networkUpload: false,
    },
    profiler: {
      version: RUNTIME_PROFILER_VERSION,
      previewOnly: true,
      deviceBenchmark: false,
      adaptiveTierMutation: false,
      persistentHistory: false,
    },
    capabilities,
    blockers,
    summary: {
      verifiedCapabilityCount: capabilities.length,
      requiredBlockerCount: blockers.filter(blocker => blocker.required).length,
      bounded: true,
      deterministic: true,
      deviceBenchmark: false,
      mobileAcceptance: false,
    },
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
