import { getPerformanceBudget, normalizePerformanceTier, type PerformanceTier } from "../../client/src/game/systems/performanceProfile";
import { getRenderDistanceConfig } from "../../client/src/game/systems/renderDistance";
import { getStreamingChunkKeys } from "../../client/src/game/systems/visibleRegionSystem";
import { shouldEnableRuntimeObject } from "../../client/src/game/systems/runtimeVisibilitySystem";
import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { analyzeRuntimePerformanceSnapshot, type RuntimeProfilerInput, type RuntimeProfilerOutput } from "./runtimePerformanceProfiler";

export const RUNTIME_VISIBILITY_GRAPH_RULES_VERSION = "runtime-visibility-graph-rules.v1" as const;
export const RUNTIME_VISIBILITY_GRAPH_SCHEMA_VERSION = "a-survival.runtime-visibility-graph.v1" as const;
export const RUNTIME_VISIBILITY_GRAPH_VERSION = "1.0.0" as const;
export const RUNTIME_VISIBILITY_DEFAULT_MAP_ID = "obsidian-frontier" as const;
export const RUNTIME_VISIBILITY_DEFAULT_MAP_RADIUS_METERS = 500;
export const RUNTIME_VISIBILITY_DEFAULT_CHUNK_WORLD_SIZE = 16;
export const RUNTIME_VISIBILITY_MAX_SAFETY_PADDING_BLOCKS = 16;

const MAX_POSITION_METERS = RUNTIME_VISIBILITY_DEFAULT_MAP_RADIUS_METERS;
const TELEMETRY_DEFAULTS: Omit<RuntimeProfilerInput, "tier" | "effectiveTargetFps" | "viewDistanceBlocks"> = {
  sampleWindowMs: 0,
  renderedFrames: 0,
  throttledFrames: 0,
  averageFrameMs: null,
  p95FrameMs: null,
  worstFrameMs: null,
  totalMeshes: 0,
  activeMeshes: 0,
};

type RuntimeVisibilityTelemetryInput = Partial<RuntimeProfilerInput> | null | undefined;

export type RuntimeVisibilityDependencyGraphInput = {
  mapId?: unknown;
  performanceTier?: unknown;
  requestedViewDistanceBlocks?: unknown;
  requestedTargetFps?: unknown;
  positionX?: unknown;
  positionZ?: unknown;
  safetyPaddingBlocks?: unknown;
  chunkWorldSize?: unknown;
  mapRadiusMeters?: unknown;
  telemetry?: RuntimeVisibilityTelemetryInput;
  rulesVersion?: unknown;
};

type RuntimeVisibilityIssue = {
  code: "MAP_NOT_PLAYABLE" | "RULES_VERSION_UNSUPPORTED";
  detail: string;
};

type RuntimeVisibilityGraphNode = DependencyGraphNode & {
  dependencies: GeneratorDependency[];
};

export type RuntimeVisibilityDependencyGraphOutput = {
  artifact: {
    mapId: typeof RUNTIME_VISIBILITY_DEFAULT_MAP_ID;
    requestedMapId: string;
    performanceTier: PerformanceTier;
    viewDistanceBlocks: number;
    targetFps: number;
    contentHash: string;
  };
  summary: {
    mapId: typeof RUNTIME_VISIBILITY_DEFAULT_MAP_ID;
    requestedMapId: string;
    mapRadiusMeters: number;
    positionX: number;
    positionZ: number;
    chunkWorldSize: number;
    performanceTier: PerformanceTier;
    viewDistanceBlocks: number;
    targetFps: number;
    visibleRadiusMeters: number;
    prefetchRadiusMeters: number;
    safetyPaddingBlocks: number;
    visibleChunkCount: number;
    mapChunkRadius: number;
    objectVisibility: {
      inRangeEnabled: boolean;
      paddedRangeEnabled: boolean;
      outOfRangeEnabled: boolean;
      brokenObjectEnabled: boolean;
    };
    telemetryPreview: Pick<RuntimeProfilerOutput, "status" | "observedFps" | "activeMeshRatio" | "previewOnly">;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
  issues: RuntimeVisibilityIssue[];
  nodes: RuntimeVisibilityGraphNode[];
  graph: DependencyGraphValidation;
  claims: {
    staticPolicyProjected: true;
    runtimeRenderApplied: false;
    adaptiveTiering: false;
    deviceBenchmark: false;
    playerRuntimeMutation: false;
    networkPersistence: false;
    visualAcceptance: false;
  };
  contentHash: string;
};

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)));
}

function boundedPosition(value: unknown): number {
  return Number(Number(boundedNumber(value, 0, -MAX_POSITION_METERS, MAX_POSITION_METERS)).toFixed(2));
}

function boundedMapRadius(value: unknown): number {
  return Number(Number(boundedNumber(value, RUNTIME_VISIBILITY_DEFAULT_MAP_RADIUS_METERS, 1, RUNTIME_VISIBILITY_DEFAULT_MAP_RADIUS_METERS)).toFixed(2));
}

function boundedChunkWorldSize(value: unknown): number {
  return Number(Number(boundedNumber(value, RUNTIME_VISIBILITY_DEFAULT_CHUNK_WORLD_SIZE, 1, 64)).toFixed(2));
}

function boundedSafetyPadding(value: unknown): number {
  return Number(Number(boundedNumber(value, 0, 0, RUNTIME_VISIBILITY_MAX_SAFETY_PADDING_BLOCKS)).toFixed(2));
}

function requestedMapId(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : RUNTIME_VISIBILITY_DEFAULT_MAP_ID;
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

function buildNode(params: {
  key: string;
  generatorId: string;
  seed: string;
  rulesVersion: string;
  content: unknown;
  dependencies?: GeneratorDependency[];
}): RuntimeVisibilityGraphNode {
  return {
    key: params.key,
    kind: "simulation",
    generatorId: params.generatorId,
    generatorVersion: RUNTIME_VISIBILITY_GRAPH_VERSION,
    schemaVersion: RUNTIME_VISIBILITY_GRAPH_SCHEMA_VERSION,
    seed: params.seed,
    rulesVersion: params.rulesVersion,
    contentHash: hashStableJson(params.content as never),
    dependencies: params.dependencies ?? [],
  };
}

function telemetryInput(input: RuntimeVisibilityTelemetryInput, tier: PerformanceTier, viewDistanceBlocks: number, targetFps: number): RuntimeProfilerInput {
  const telemetry = input ?? {};
  return {
    tier,
    effectiveTargetFps: finiteNumber(telemetry.effectiveTargetFps, targetFps),
    viewDistanceBlocks: finiteNumber(telemetry.viewDistanceBlocks, viewDistanceBlocks),
    sampleWindowMs: finiteNumber(telemetry.sampleWindowMs, TELEMETRY_DEFAULTS.sampleWindowMs),
    renderedFrames: finiteNumber(telemetry.renderedFrames, TELEMETRY_DEFAULTS.renderedFrames),
    throttledFrames: finiteNumber(telemetry.throttledFrames, TELEMETRY_DEFAULTS.throttledFrames),
    averageFrameMs: telemetry.averageFrameMs === null || typeof telemetry.averageFrameMs === "number" ? telemetry.averageFrameMs ?? TELEMETRY_DEFAULTS.averageFrameMs : TELEMETRY_DEFAULTS.averageFrameMs,
    p95FrameMs: telemetry.p95FrameMs === null || typeof telemetry.p95FrameMs === "number" ? telemetry.p95FrameMs ?? TELEMETRY_DEFAULTS.p95FrameMs : TELEMETRY_DEFAULTS.p95FrameMs,
    worstFrameMs: telemetry.worstFrameMs === null || typeof telemetry.worstFrameMs === "number" ? telemetry.worstFrameMs ?? TELEMETRY_DEFAULTS.worstFrameMs : TELEMETRY_DEFAULTS.worstFrameMs,
    totalMeshes: finiteNumber(telemetry.totalMeshes, TELEMETRY_DEFAULTS.totalMeshes),
    activeMeshes: finiteNumber(telemetry.activeMeshes, TELEMETRY_DEFAULTS.activeMeshes),
  };
}

export function buildRuntimeVisibilityDependencyGraph(input: RuntimeVisibilityDependencyGraphInput = {}): RuntimeVisibilityDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? RUNTIME_VISIBILITY_GRAPH_RULES_VERSION;
  const issues: RuntimeVisibilityIssue[] = [];
  if (rulesVersion !== RUNTIME_VISIBILITY_GRAPH_RULES_VERSION) issues.push({ code: "RULES_VERSION_UNSUPPORTED", detail: `Unsupported runtime visibility graph rules version: ${String(rulesVersion)}` });

  const requested = requestedMapId(input.mapId);
  const mapId = RUNTIME_VISIBILITY_DEFAULT_MAP_ID;
  if (requested !== mapId) issues.push({ code: "MAP_NOT_PLAYABLE", detail: `Runtime visibility projection is restricted to ${mapId}; ${requested} remains non-playable and is not opened by this audit` });

  const tier = normalizePerformanceTier(input.performanceTier);
  const budget = getPerformanceBudget(tier, input.requestedViewDistanceBlocks, input.requestedTargetFps);
  const positionX = boundedPosition(input.positionX);
  const positionZ = boundedPosition(input.positionZ);
  const mapRadiusMeters = boundedMapRadius(input.mapRadiusMeters);
  const chunkWorldSize = boundedChunkWorldSize(input.chunkWorldSize);
  const safetyPaddingBlocks = boundedSafetyPadding(input.safetyPaddingBlocks);
  const renderDistance = getRenderDistanceConfig("balanced", budget.viewDistanceBlocks, mapRadiusMeters);
  const visibleChunks = getStreamingChunkKeys({ positionX, positionZ, chunkWorldSize, visibleRadiusMeters: renderDistance.visibleRadiusMeters, mapRadiusMeters });
  const mapChunkRadius = Math.max(0, Math.ceil(mapRadiusMeters / chunkWorldSize));
  const telemetry = analyzeRuntimePerformanceSnapshot(telemetryInput(input.telemetry, budget.tier, budget.viewDistanceBlocks, budget.targetFps));
  const objectVisibilityInput = { positionX, positionZ, viewDistanceBlocks: budget.viewDistanceBlocks, safetyPaddingBlocks };
  const objectVisibility = {
    inRangeEnabled: shouldEnableRuntimeObject({ x: positionX + Math.max(0, budget.viewDistanceBlocks - 0.01), z: positionZ }, objectVisibilityInput),
    paddedRangeEnabled: shouldEnableRuntimeObject({ x: positionX + budget.viewDistanceBlocks + Math.max(0, safetyPaddingBlocks - 0.01), z: positionZ }, objectVisibilityInput),
    outOfRangeEnabled: shouldEnableRuntimeObject({ x: positionX + budget.viewDistanceBlocks + safetyPaddingBlocks + 1, z: positionZ }, objectVisibilityInput),
    brokenObjectEnabled: shouldEnableRuntimeObject({ x: positionX, z: positionZ, state: "broken" }, objectVisibilityInput),
  };

  const seed = `${mapId}:${positionX}:${positionZ}:${budget.viewDistanceBlocks}:${budget.targetFps}:${chunkWorldSize}:${mapRadiusMeters}`;
  const budgetNode = buildNode({
    key: `runtime-budget:${mapId}:${tier}:${budget.viewDistanceBlocks}:${budget.targetFps}`,
    generatorId: "runtime.performance-budget",
    seed,
    rulesVersion: RUNTIME_VISIBILITY_GRAPH_RULES_VERSION,
    content: { mapId, tier, viewDistanceBlocks: budget.viewDistanceBlocks, targetFps: budget.targetFps, lodPolicy: budget.lodPolicy, mobSimulationRadiusMeters: budget.mobSimulationRadiusMeters, animationRadiusMeters: budget.animationRadiusMeters, physicsRadiusMeters: budget.physicsRadiusMeters },
  });
  const streamNode = buildNode({
    key: `runtime-stream:${mapId}:${positionX}:${positionZ}:${chunkWorldSize}:${mapRadiusMeters}`,
    generatorId: "runtime.chunk-stream",
    seed,
    rulesVersion: RUNTIME_VISIBILITY_GRAPH_RULES_VERSION,
    content: { mapId, positionX, positionZ, chunkWorldSize, mapRadiusMeters, visibleRadiusMeters: renderDistance.visibleRadiusMeters, prefetchRadiusMeters: renderDistance.prefetchRadiusMeters, visibleChunkCount: visibleChunks.size, mapChunkRadius },
    dependencies: [dependencyFor(budgetNode)],
  });
  const objectNode = buildNode({
    key: `runtime-object-visibility:${mapId}:${positionX}:${positionZ}:${budget.viewDistanceBlocks}:${safetyPaddingBlocks}`,
    generatorId: "runtime.object-visibility",
    seed,
    rulesVersion: RUNTIME_VISIBILITY_GRAPH_RULES_VERSION,
    content: { mapId, positionX, positionZ, viewDistanceBlocks: budget.viewDistanceBlocks, safetyPaddingBlocks, objectVisibility },
    dependencies: [dependencyFor(budgetNode), dependencyFor(streamNode)],
  });
  const telemetryNode = buildNode({
    key: `runtime-telemetry:${mapId}:${tier}:${budget.targetFps}`,
    generatorId: "runtime.performance-telemetry",
    seed,
    rulesVersion: RUNTIME_VISIBILITY_GRAPH_RULES_VERSION,
    content: { mapId, tier, targetFps: budget.targetFps, telemetryPreview: { status: telemetry.status, observedFps: telemetry.observedFps, activeMeshRatio: telemetry.activeMeshRatio, previewOnly: telemetry.previewOnly } },
    dependencies: [dependencyFor(budgetNode), dependencyFor(objectNode)],
  });
  const nodes = [budgetNode, streamNode, objectNode, telemetryNode];
  const graph = validateGeneratorDependencyGraph(nodes);
  const summary = {
    mapId,
    requestedMapId: requested,
    mapRadiusMeters,
    positionX,
    positionZ,
    chunkWorldSize,
    performanceTier: budget.tier,
    viewDistanceBlocks: budget.viewDistanceBlocks,
    targetFps: budget.targetFps,
    visibleRadiusMeters: renderDistance.visibleRadiusMeters,
    prefetchRadiusMeters: renderDistance.prefetchRadiusMeters,
    safetyPaddingBlocks,
    visibleChunkCount: visibleChunks.size,
    mapChunkRadius,
    objectVisibility,
    telemetryPreview: { status: telemetry.status, observedFps: telemetry.observedFps, activeMeshRatio: telemetry.activeMeshRatio, previewOnly: telemetry.previewOnly },
    runtimeImportAllowed: false as const,
    playerVisible: false as const,
    cacheable: false as const,
  };
  const artifact = {
    mapId,
    requestedMapId: requested,
    performanceTier: budget.tier,
    viewDistanceBlocks: budget.viewDistanceBlocks,
    targetFps: budget.targetFps,
    contentHash: hashStableJson({ mapId, requestedMapId: requested, summary, nodeHashes: nodes.map(node => ({ key: node.key, contentHash: node.contentHash })) } as never),
  };
  const contentHash = hashStableJson({ artifact, summary, issues, graph } as never);
  return {
    artifact,
    summary,
    issues,
    nodes,
    graph,
    claims: { staticPolicyProjected: true, runtimeRenderApplied: false, adaptiveTiering: false, deviceBenchmark: false, playerRuntimeMutation: false, networkPersistence: false, visualAcceptance: false },
    contentHash,
  };
}
