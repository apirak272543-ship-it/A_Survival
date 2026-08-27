import { MAP_REGISTRY } from "../../client/src/game/data/maps";
import { resolveDirectMapId, RUNTIME_MAP_ID, isRuntimeMapAllowed } from "../../client/src/game/routing/directRoute";
import { defaultOfflineMapState, normalizeOfflineMapState } from "../../client/src/game/storage/indexedDb";
import { STORY_QUESTS_PER_MAP } from "../../client/src/game/systems/storyProgressionSystem";
import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { buildStoryMapCachePolicyDependencyGraph, STORY_MAP_CACHE_POLICY_GRAPH_RULES_VERSION, type StoryMapCachePolicyDependencyGraphOutput } from "./storyMapCachePolicyDependencyGraph";

export const STORY_OFFLINE_MAP_STATE_GRAPH_RULES_VERSION = "story-offline-map-state-graph-rules.v1" as const;
export const OFFLINE_MAP_STATE_VERSION = "1.0.0" as const;
export const OFFLINE_MAP_STATE_SCHEMA_VERSION = "a-survival.offline-map-state.v1" as const;
export const STORY_OFFLINE_MAP_STATE_VERSION = "1.0.0" as const;
export const STORY_OFFLINE_MAP_STATE_SCHEMA_VERSION = "a-survival.story-offline-map-state.v1" as const;
export const MAX_OFFLINE_MAP_STATE_REQUESTS = 3 as const;
export const DEFAULT_OFFLINE_PREVIEW_PLAYER_ID = "creator-preview-player" as const;

export type StoryOfflineMapStateDependencyGraphInput = {
  seed: string;
  playerId?: string;
  requestedMapIds?: string[];
  completedQuestCount?: number;
  rulesVersion?: string;
};

type OfflineMapStateAssessment = {
  requestedMapId: string;
  resolvedMapId: string;
  playerId: string;
  registryDefinitionAvailable: boolean;
  selectionAllowed: boolean;
  cacheEligible: boolean;
  offlineStateNamespaceAllowed: boolean;
  normalizationPreservesIdentity: boolean;
  futureMapWriteBlocked: boolean;
  persistedStateKeys: string[];
};

export type StoryOfflineMapStateDependencyGraphOutput = {
  artifact: {
    runtimeMapId: typeof RUNTIME_MAP_ID;
    seed: string;
    playerId: string;
    requestedMapIds: string[];
    contentHash: string;
  };
  mapCachePolicy: StoryMapCachePolicyDependencyGraphOutput;
  assessments: OfflineMapStateAssessment[];
  summary: {
    runtimeMapId: typeof RUNTIME_MAP_ID;
    requestedCount: number;
    selectableCount: number;
    cacheEligibleCount: number;
    offlineStateNamespaceAllowedCount: number;
    futureMapWriteBlockedCount: number;
    registryDefinitionMissingCount: number;
    runtimeDeniedCount: number;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: {
      "map-registry": number;
      "selection-boundary": number;
      "cache-boundary": number;
      "offline-state-boundary": number;
      "story-contract": number;
    };
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return { key: node.key, kind: node.kind, required: true, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

function boundedRequestedMapIds(requestedMapIds: string[] | undefined) {
  const values = requestedMapIds && requestedMapIds.length > 0 ? requestedMapIds : [RUNTIME_MAP_ID, "story-map-002"];
  if (values.length > MAX_OFFLINE_MAP_STATE_REQUESTS) throw new Error(`requestedMapIds must contain at most ${MAX_OFFLINE_MAP_STATE_REQUESTS} map IDs`);
  const normalized = values.map(value => value.trim()).filter(Boolean);
  if (normalized.length === 0) throw new Error("requestedMapIds must contain at least one non-empty map ID");
  if (new Set(normalized).size !== normalized.length) throw new Error("requestedMapIds must not contain duplicates");
  return normalized;
}

function normalizedPlayerId(playerId: string | undefined) {
  const value = playerId?.trim() || DEFAULT_OFFLINE_PREVIEW_PLAYER_ID;
  if (value.length > 64) throw new Error("playerId must contain at most 64 characters");
  return value;
}

function buildOfflineStateNode(assessment: OfflineMapStateAssessment, cacheNode: DependencyGraphNode, seed: string, rulesVersion: string): DependencyGraphNode {
  const dependencies: GeneratorDependency[] = [dependencyFor(cacheNode)];
  if (!assessment.offlineStateNamespaceAllowed) {
    dependencies.push({
      key: `offline-state-runtime-approval:${assessment.requestedMapId}`,
      kind: "world",
      required: true,
      generatorId: "offline.map-state",
      generatorVersion: OFFLINE_MAP_STATE_VERSION,
    });
  }
  return {
    key: `offline-map-state:${assessment.requestedMapId}:${assessment.playerId}`,
    kind: "world",
    generatorId: "offline.map-state",
    generatorVersion: OFFLINE_MAP_STATE_VERSION,
    schemaVersion: OFFLINE_MAP_STATE_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({
      requestedMapId: assessment.requestedMapId,
      resolvedMapId: assessment.resolvedMapId,
      playerId: assessment.playerId,
      namespaceAllowed: assessment.offlineStateNamespaceAllowed,
      persistedStateKeys: assessment.persistedStateKeys,
      writeInvoked: false,
    } as never),
    dependencies,
  };
}

function buildBoundaryNode(assessments: OfflineMapStateAssessment[], storyContractNode: DependencyGraphNode, stateNodes: DependencyGraphNode[], seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `story-offline-map-state-boundary:${hashStableJson(assessments.map(assessment => ({ requestedMapId: assessment.requestedMapId, playerId: assessment.playerId, resolvedMapId: assessment.resolvedMapId, namespaceAllowed: assessment.offlineStateNamespaceAllowed })) as never)}`,
    kind: "quest",
    generatorId: "story.offline-map-state",
    generatorVersion: STORY_OFFLINE_MAP_STATE_VERSION,
    schemaVersion: STORY_OFFLINE_MAP_STATE_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ runtimeMapId: RUNTIME_MAP_ID, assessments, writeInvoked: false } as never),
    dependencies: [dependencyFor(storyContractNode), ...stateNodes.map(dependencyFor)],
  };
}

export function buildStoryOfflineMapStateDependencyGraph(input: StoryOfflineMapStateDependencyGraphInput): StoryOfflineMapStateDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? STORY_OFFLINE_MAP_STATE_GRAPH_RULES_VERSION;
  if (rulesVersion !== STORY_OFFLINE_MAP_STATE_GRAPH_RULES_VERSION) throw new Error(`Unsupported story offline map state graph rules version: ${rulesVersion}`);
  const playerId = normalizedPlayerId(input.playerId);
  const requestedMapIds = boundedRequestedMapIds(input.requestedMapIds);
  const mapCachePolicy = buildStoryMapCachePolicyDependencyGraph({
    seed: input.seed,
    requestedMapIds,
    completedQuestCount: input.completedQuestCount ?? STORY_QUESTS_PER_MAP,
    rulesVersion: STORY_MAP_CACHE_POLICY_GRAPH_RULES_VERSION,
  });
  const availableMapIds = MAP_REGISTRY.map(map => map.id);
  const storyContractNode = mapCachePolicy.nodes.find(node => node.key === "story-runtime-contract:obsidian-frontier")!;
  const assessments = requestedMapIds.map((requestedMapId): OfflineMapStateAssessment => {
    const cacheRequest = mapCachePolicy.requests.find(request => request.requestedMapId === requestedMapId)!;
    const resolvedMapId = resolveDirectMapId(`?map=${encodeURIComponent(requestedMapId)}`, availableMapIds);
    const state = normalizeOfflineMapState(defaultOfflineMapState(requestedMapId, playerId), requestedMapId, playerId);
    const persistedStateKeys = Object.keys(state).sort();
    const selectionAllowed = isRuntimeMapAllowed(requestedMapId) && resolvedMapId === RUNTIME_MAP_ID && cacheRequest.selectionAllowed;
    const cacheEligible = isRuntimeMapAllowed(requestedMapId) && resolvedMapId === RUNTIME_MAP_ID && cacheRequest.cacheEligible;
    return {
      requestedMapId,
      resolvedMapId,
      playerId,
      registryDefinitionAvailable: cacheRequest.registryDefinitionAvailable,
      selectionAllowed,
      cacheEligible,
      offlineStateNamespaceAllowed: cacheEligible && state.mapId === requestedMapId && state.playerId === playerId,
      normalizationPreservesIdentity: state.mapId === requestedMapId && state.playerId === playerId,
      futureMapWriteBlocked: !cacheEligible,
      persistedStateKeys,
    };
  });
  const stateNodes = assessments.map((assessment, index) => {
    const cacheNode = mapCachePolicy.nodes.find(node => node.key === `map-cache-policy:${assessment.requestedMapId}`)!;
    return buildOfflineStateNode(assessment, cacheNode, input.seed, rulesVersion);
  });
  const boundaryNode = buildBoundaryNode(assessments, storyContractNode, stateNodes, input.seed, rulesVersion);
  const nodes = [...mapCachePolicy.nodes, ...stateNodes, boundaryNode];
  const graph = validateGeneratorDependencyGraph(nodes);
  const storyContractConsistent = mapCachePolicy.summary.storyContractConsistent && mapCachePolicy.storyContract.graph.valid;
  const unresolvedReferenceTypes = {
    "map-registry": assessments.filter(assessment => !assessment.registryDefinitionAvailable).length,
    "selection-boundary": assessments.filter(assessment => !assessment.selectionAllowed).length,
    "cache-boundary": assessments.filter(assessment => !assessment.cacheEligible).length,
    "offline-state-boundary": assessments.filter(assessment => !assessment.offlineStateNamespaceAllowed).length,
    "story-contract": storyContractConsistent ? 0 : 1,
  };
  return {
    artifact: {
      runtimeMapId: RUNTIME_MAP_ID,
      seed: input.seed,
      playerId,
      requestedMapIds,
      contentHash: hashStableJson({ playerId, requestedMapIds, assessments, mapCacheHash: mapCachePolicy.artifact.contentHash, rulesVersion } as never),
    },
    mapCachePolicy,
    assessments,
    summary: {
      runtimeMapId: RUNTIME_MAP_ID,
      requestedCount: assessments.length,
      selectableCount: assessments.filter(assessment => assessment.selectionAllowed).length,
      cacheEligibleCount: assessments.filter(assessment => assessment.cacheEligible).length,
      offlineStateNamespaceAllowedCount: assessments.filter(assessment => assessment.offlineStateNamespaceAllowed).length,
      futureMapWriteBlockedCount: assessments.filter(assessment => assessment.futureMapWriteBlocked).length,
      registryDefinitionMissingCount: unresolvedReferenceTypes["map-registry"],
      runtimeDeniedCount: assessments.filter(assessment => !isRuntimeMapAllowed(assessment.requestedMapId)).length,
      unresolvedReferenceCount: Object.values(unresolvedReferenceTypes).reduce((total, count) => total + count, 0),
      unresolvedReferenceTypes,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    },
    nodes,
    graph,
  };
}

export function getDefaultStoryOfflineMapStateDependencyGraphInput(seed = "creator-story-offline-map-state") {
  return { seed, playerId: DEFAULT_OFFLINE_PREVIEW_PLAYER_ID, requestedMapIds: [RUNTIME_MAP_ID, "story-map-002"], completedQuestCount: STORY_QUESTS_PER_MAP } satisfies StoryOfflineMapStateDependencyGraphInput;
}
