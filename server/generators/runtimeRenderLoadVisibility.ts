import { getPerformanceBudget, normalizePerformanceTier } from "../../client/src/game/systems/performanceProfile";
import { getBlockRenderDistanceConfig } from "../../client/src/game/systems/renderDistance";
import { shouldEnableRuntimeObject } from "../../client/src/game/systems/runtimeVisibilitySystem";
import { getStreamingChunkKeys } from "../../client/src/game/systems/visibleRegionSystem";
import { hashStableJson } from "./commonGeneratorApi";

export const RUNTIME_RENDER_LOAD_VISIBILITY_RULES_VERSION = "runtime-render-load-visibility-rules.v1" as const;
export const RUNTIME_RENDER_LOAD_VISIBILITY_GENERATOR_ID = "runtime.render-load-visibility" as const;
export const RUNTIME_RENDER_LOAD_VISIBILITY_GENERATOR_VERSION = "1.0.0" as const;
export const RUNTIME_RENDER_LOAD_VISIBILITY_SCHEMA_VERSION = "a-survival.runtime-render-load-visibility.v1" as const;

const MAP_RADIUS_METERS = 500;
const CHUNK_WORLD_SIZE_METERS = 16;

export type RuntimeRenderLoadVisibilityInput = {
  seed: string;
  tier?: unknown;
  requestedViewDistanceBlocks?: unknown;
  requestedTargetFps?: unknown;
  playerPosition?: { x?: unknown; z?: unknown };
  safetyPaddingBlocks?: unknown;
  rulesVersion?: string;
};

export type RuntimeRenderLoadProbe = {
  insideBudgetEnabled: boolean;
  outsideBudgetEnabled: boolean;
  brokenObjectEnabled: boolean;
  malformedMetadataEnabled: boolean;
};

export type RuntimeRenderLoadVisibilityOutput = {
  artifact: {
    generatorId: typeof RUNTIME_RENDER_LOAD_VISIBILITY_GENERATOR_ID;
    generatorVersion: typeof RUNTIME_RENDER_LOAD_VISIBILITY_GENERATOR_VERSION;
    schemaVersion: typeof RUNTIME_RENDER_LOAD_VISIBILITY_SCHEMA_VERSION;
    seed: string;
    rulesVersion: typeof RUNTIME_RENDER_LOAD_VISIBILITY_RULES_VERSION;
    contentHash: string;
  };
  budget: ReturnType<typeof getPerformanceBudget>;
  renderDistance: {
    visibleRadiusMeters: number;
    prefetchRadiusMeters: number;
    label: string;
    preset: "near" | "balanced" | "far";
    mapRadiusMeters: typeof MAP_RADIUS_METERS;
  };
  streaming: {
    playerPosition: { x: number; z: number };
    chunkWorldSizeMeters: typeof CHUNK_WORLD_SIZE_METERS;
    visibleChunkCount: number;
    prefetchChunkCount: number;
    mapBoundaryChunkCount: number;
    visibleWithinPrefetch: true;
    clippedToMapBoundary: true;
  };
  runtimeGates: {
    terrainVisibilityRefreshOnViewChange: true;
    plantAnimationRadiusMeters: number;
    enemySleepWakeRadiusMeters: number;
    physicsRadiusMeters: number;
    objectPolicy: "euclidean-distance-with-broken-disable-and-malformed-fail-open";
  };
  visibilityProbe: RuntimeRenderLoadProbe;
  blockers: Array<{
    id: "controlled-device-load-benchmark" | "full-object-culling" | "object-pooling";
    required: true;
    status: "missing-evidence";
    owner: string;
    reason: string;
  }>;
  summary: {
    bounded: true;
    deterministic: true;
    visibleChunkCount: number;
    prefetchChunkCount: number;
    deviceBenchmark: false;
    mobileAcceptance: false;
  };
  claims: {
    runtimeWrite: false;
    generatorCall: false;
    assetGeneration: false;
    cacheWrite: false;
    futureMapEnabled: false;
    deviceBenchmark: false;
    gpuTiming: false;
    mobileAcceptance: false;
  };
};

function finiteOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boundedPosition(value: unknown) {
  return Math.max(-MAP_RADIUS_METERS, Math.min(MAP_RADIUS_METERS, finiteOr(value, 0)));
}

function validateSeed(seed: string) {
  if (!seed.trim() || seed.length > 128) throw new Error("seed must be 1–128 characters");
}

export function buildRuntimeRenderLoadVisibility(input: RuntimeRenderLoadVisibilityInput): RuntimeRenderLoadVisibilityOutput {
  const rulesVersion = input.rulesVersion ?? RUNTIME_RENDER_LOAD_VISIBILITY_RULES_VERSION;
  if (rulesVersion !== RUNTIME_RENDER_LOAD_VISIBILITY_RULES_VERSION) throw new Error(`Unsupported runtime render/load visibility rules version: ${rulesVersion}`);
  validateSeed(input.seed);

  const budget = getPerformanceBudget(normalizePerformanceTier(input.tier), input.requestedViewDistanceBlocks, input.requestedTargetFps);
  const playerPosition = {
    x: boundedPosition(input.playerPosition?.x),
    z: boundedPosition(input.playerPosition?.z),
  };
  const renderDistance = getBlockRenderDistanceConfig(budget.viewDistanceBlocks, MAP_RADIUS_METERS);
  const visibleChunkCount = getStreamingChunkKeys({
    positionX: playerPosition.x,
    positionZ: playerPosition.z,
    chunkWorldSize: CHUNK_WORLD_SIZE_METERS,
    visibleRadiusMeters: renderDistance.visibleRadiusMeters,
    mapRadiusMeters: MAP_RADIUS_METERS,
  }).size;
  const prefetchChunkCount = getStreamingChunkKeys({
    positionX: playerPosition.x,
    positionZ: playerPosition.z,
    chunkWorldSize: CHUNK_WORLD_SIZE_METERS,
    visibleRadiusMeters: renderDistance.prefetchRadiusMeters,
    mapRadiusMeters: MAP_RADIUS_METERS,
  }).size;
  const mapBoundaryChunkCount = getStreamingChunkKeys({
    positionX: playerPosition.x,
    positionZ: playerPosition.z,
    chunkWorldSize: CHUNK_WORLD_SIZE_METERS,
    visibleRadiusMeters: MAP_RADIUS_METERS,
    mapRadiusMeters: MAP_RADIUS_METERS,
  }).size;
  const visibilityInput = {
    positionX: playerPosition.x,
    positionZ: playerPosition.z,
    viewDistanceBlocks: budget.viewDistanceBlocks,
    safetyPaddingBlocks: Math.max(0, finiteOr(input.safetyPaddingBlocks, 0)),
  };
  const visibilityProbe = {
    insideBudgetEnabled: shouldEnableRuntimeObject({ x: playerPosition.x + budget.viewDistanceBlocks, z: playerPosition.z }, visibilityInput),
    outsideBudgetEnabled: shouldEnableRuntimeObject({ x: playerPosition.x + budget.viewDistanceBlocks + 1, z: playerPosition.z }, visibilityInput),
    brokenObjectEnabled: shouldEnableRuntimeObject({ x: playerPosition.x, z: playerPosition.z, state: "broken" }, visibilityInput),
    malformedMetadataEnabled: shouldEnableRuntimeObject({}, visibilityInput),
  };
  const blockers: RuntimeRenderLoadVisibilityOutput["blockers"] = [
    {
      id: "controlled-device-load-benchmark",
      required: true,
      status: "missing-evidence",
      owner: "docs/PERFORMANCE_OPTIMIZATION.md",
      reason: "local telemetry is directional only; no controlled real-device GPU, memory, thermal, battery, or WebView load benchmark is present",
    },
    {
      id: "full-object-culling",
      required: true,
      status: "missing-evidence",
      owner: "client/src/game/systems/runtimeVisibilitySystem.ts",
      reason: "the existing owner proves Euclidean distance activation but not complete frustum and occlusion culling for every object",
    },
    {
      id: "object-pooling",
      required: true,
      status: "missing-evidence",
      owner: "client/src/game/scene.ts",
      reason: "the current scene wiring does not provide a generic pooled object reuse contract for render/load acceptance",
    },
  ];
  const canonicalPayload = {
    schemaVersion: RUNTIME_RENDER_LOAD_VISIBILITY_SCHEMA_VERSION,
    generatorId: RUNTIME_RENDER_LOAD_VISIBILITY_GENERATOR_ID,
    generatorVersion: RUNTIME_RENDER_LOAD_VISIBILITY_GENERATOR_VERSION,
    seed: input.seed,
    rulesVersion,
    budget,
    playerPosition,
    renderDistance,
    streaming: { visibleChunkCount, prefetchChunkCount, mapBoundaryChunkCount },
    visibilityProbe,
    blockers,
  };
  const contentHash = hashStableJson(canonicalPayload as never);

  return {
    artifact: {
      generatorId: RUNTIME_RENDER_LOAD_VISIBILITY_GENERATOR_ID,
      generatorVersion: RUNTIME_RENDER_LOAD_VISIBILITY_GENERATOR_VERSION,
      schemaVersion: RUNTIME_RENDER_LOAD_VISIBILITY_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash,
    },
    budget,
    renderDistance: {
      visibleRadiusMeters: renderDistance.visibleRadiusMeters,
      prefetchRadiusMeters: renderDistance.prefetchRadiusMeters,
      label: renderDistance.label,
      preset: renderDistance.preset,
      mapRadiusMeters: MAP_RADIUS_METERS,
    },
    streaming: {
      playerPosition,
      chunkWorldSizeMeters: CHUNK_WORLD_SIZE_METERS,
      visibleChunkCount,
      prefetchChunkCount,
      mapBoundaryChunkCount,
      visibleWithinPrefetch: true,
      clippedToMapBoundary: true,
    },
    runtimeGates: {
      terrainVisibilityRefreshOnViewChange: true,
      plantAnimationRadiusMeters: budget.animationRadiusMeters,
      enemySleepWakeRadiusMeters: budget.mobSimulationRadiusMeters,
      physicsRadiusMeters: budget.physicsRadiusMeters,
      objectPolicy: "euclidean-distance-with-broken-disable-and-malformed-fail-open",
    },
    visibilityProbe,
    blockers,
    summary: {
      bounded: true,
      deterministic: true,
      visibleChunkCount,
      prefetchChunkCount,
      deviceBenchmark: false,
      mobileAcceptance: false,
    },
    claims: {
      runtimeWrite: false,
      generatorCall: false,
      assetGeneration: false,
      cacheWrite: false,
      futureMapEnabled: false,
      deviceBenchmark: false,
      gpuTiming: false,
      mobileAcceptance: false,
    },
  };
}
