import { MAP_REGISTRY, type MapDefinition } from "../../client/src/game/data/maps";
import { resolveDirectMapId, RUNTIME_MAP_ID, isRuntimeMapAllowed } from "../../client/src/game/routing/directRoute";
import { MAP_CACHE_NAME } from "../../client/src/game/storage/mapCache";
import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { buildStoryProgressionContractDependencyGraph, STORY_PROGRESSION_CONTRACT_GRAPH_RULES_VERSION, type StoryProgressionContractDependencyGraphOutput } from "./storyProgressionContractDependencyGraph";
import { STORY_PLAYABLE_MAP_ID, STORY_QUESTS_PER_MAP } from "../../client/src/game/systems/storyProgressionSystem";

export const STORY_MAP_CACHE_POLICY_GRAPH_RULES_VERSION = "story-map-cache-policy-graph-rules.v1" as const;
export const MAP_REGISTRY_VERSION = "1.0.0" as const;
export const MAP_REGISTRY_SCHEMA_VERSION = "a-survival.map-definition.v1" as const;
export const DIRECT_ROUTE_VERSION = "1.0.0" as const;
export const DIRECT_ROUTE_SCHEMA_VERSION = "a-survival.direct-route.v1" as const;
export const MAP_CACHE_POLICY_VERSION = "3.0.0" as const;
export const MAP_CACHE_POLICY_SCHEMA_VERSION = "a-survival.map-cache-policy.v1" as const;
export const STORY_MAP_CACHE_POLICY_VERSION = "1.0.0" as const;
export const STORY_MAP_CACHE_POLICY_SCHEMA_VERSION = "a-survival.story-map-cache-policy.v1" as const;
export const MAX_REQUESTED_MAP_IDS = 3 as const;

export type StoryMapCachePolicyDependencyGraphInput = {
  seed: string;
  requestedMapIds?: string[];
  completedQuestCount?: number;
  rulesVersion?: string;
};

type MapRequestAssessment = {
  requestedMapId: string;
  resolvedMapId: string;
  registryMap: MapDefinition | null;
  isRuntimeAllowed: boolean;
  selectionAllowed: boolean;
  cacheEligible: boolean;
  fallsBackToRuntimeMap: boolean;
  registryDefinitionAvailable: boolean;
};

export type StoryMapCachePolicyDependencyGraphOutput = {
  artifact: {
    runtimeMapId: typeof RUNTIME_MAP_ID;
    seed: string;
    requestedMapIds: string[];
    contentHash: string;
  };
  storyContract: StoryProgressionContractDependencyGraphOutput;
  requests: MapRequestAssessment[];
  summary: {
    runtimeMapId: typeof RUNTIME_MAP_ID;
    storyPlayableMapId: typeof STORY_PLAYABLE_MAP_ID;
    storyContractConsistent: boolean;
    requestedCount: number;
    selectionAllowedCount: number;
    cacheEligibleCount: number;
    fallbackCount: number;
    registryDefinitionMissingCount: number;
    runtimeDeniedCount: number;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: {
      "map-registry": number;
      "selection-boundary": number;
      "cache-boundary": number;
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
  if (values.length > MAX_REQUESTED_MAP_IDS) throw new Error(`requestedMapIds must contain at most ${MAX_REQUESTED_MAP_IDS} map IDs`);
  const normalized = values.map(value => value.trim()).filter(Boolean);
  if (normalized.length === 0) throw new Error("requestedMapIds must contain at least one non-empty map ID");
  if (new Set(normalized).size !== normalized.length) throw new Error("requestedMapIds must not contain duplicates");
  return normalized;
}

function buildMapRegistryNode(map: MapDefinition, seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `map-registry:${map.id}`,
    kind: "world",
    generatorId: "map.registry",
    generatorVersion: MAP_REGISTRY_VERSION,
    schemaVersion: MAP_REGISTRY_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson(map as never),
    dependencies: [],
  };
}

function buildDirectRouteNode(assessment: MapRequestAssessment, mapRegistryNode: DependencyGraphNode | undefined, storyContractNode: DependencyGraphNode, seed: string, rulesVersion: string): DependencyGraphNode {
  const dependencies: GeneratorDependency[] = [dependencyFor(storyContractNode)];
  if (mapRegistryNode) dependencies.push(dependencyFor(mapRegistryNode));
  else dependencies.push({ key: `map-registry:${assessment.requestedMapId}`, kind: "world", required: true, generatorId: "map.registry", generatorVersion: MAP_REGISTRY_VERSION });
  if (!assessment.isRuntimeAllowed) dependencies.push({ key: `runtime-map-approval:${assessment.requestedMapId}`, kind: "world", required: true, generatorId: "direct.route", generatorVersion: DIRECT_ROUTE_VERSION });
  return {
    key: `direct-route-map:${assessment.requestedMapId}`,
    kind: "world",
    generatorId: "direct.route",
    generatorVersion: DIRECT_ROUTE_VERSION,
    schemaVersion: DIRECT_ROUTE_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ requestedMapId: assessment.requestedMapId, resolvedMapId: assessment.resolvedMapId, runtimeMapId: RUNTIME_MAP_ID, selectionAllowed: assessment.selectionAllowed, fallsBackToRuntimeMap: assessment.fallsBackToRuntimeMap } as never),
    dependencies,
  };
}

function buildMapCacheNode(assessment: MapRequestAssessment, routeNode: DependencyGraphNode, mapRegistryNode: DependencyGraphNode | undefined, seed: string, rulesVersion: string): DependencyGraphNode {
  const dependencies: GeneratorDependency[] = [dependencyFor(routeNode)];
  if (mapRegistryNode) dependencies.push(dependencyFor(mapRegistryNode));
  return {
    key: `map-cache-policy:${assessment.requestedMapId}`,
    kind: "world",
    generatorId: "map.cache",
    generatorVersion: MAP_CACHE_POLICY_VERSION,
    schemaVersion: MAP_CACHE_POLICY_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ cacheName: MAP_CACHE_NAME, requestedMapId: assessment.requestedMapId, resolvedMapId: assessment.resolvedMapId, cacheEligible: assessment.cacheEligible, prepareInvoked: false } as never),
    dependencies,
  };
}

function buildBoundaryNode(requests: MapRequestAssessment[], storyContractNode: DependencyGraphNode, cacheNodes: DependencyGraphNode[], seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `story-map-cache-boundary:${hashStableJson(requests.map(request => ({ requestedMapId: request.requestedMapId, resolvedMapId: request.resolvedMapId, selectionAllowed: request.selectionAllowed, cacheEligible: request.cacheEligible })) as never)}`,
    kind: "quest",
    generatorId: "story.map-cache-policy",
    generatorVersion: STORY_MAP_CACHE_POLICY_VERSION,
    schemaVersion: STORY_MAP_CACHE_POLICY_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ runtimeMapId: RUNTIME_MAP_ID, storyPlayableMapId: STORY_PLAYABLE_MAP_ID, cacheName: MAP_CACHE_NAME, requests } as never),
    dependencies: [dependencyFor(storyContractNode), ...cacheNodes.map(dependencyFor)],
  };
}

export function buildStoryMapCachePolicyDependencyGraph(input: StoryMapCachePolicyDependencyGraphInput): StoryMapCachePolicyDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? STORY_MAP_CACHE_POLICY_GRAPH_RULES_VERSION;
  if (rulesVersion !== STORY_MAP_CACHE_POLICY_GRAPH_RULES_VERSION) throw new Error(`Unsupported story map cache policy graph rules version: ${rulesVersion}`);
  const requestedMapIds = boundedRequestedMapIds(input.requestedMapIds);
  const storyContract = buildStoryProgressionContractDependencyGraph({ seed: input.seed, completedQuestCount: input.completedQuestCount, rulesVersion: STORY_PROGRESSION_CONTRACT_GRAPH_RULES_VERSION });
  const storyContractNode = storyContract.nodes.find(node => node.key === "story-runtime-contract:obsidian-frontier")!;
  const availableMapIds = MAP_REGISTRY.map(map => map.id);
  const requests = requestedMapIds.map((requestedMapId): MapRequestAssessment => {
    const resolvedMapId = resolveDirectMapId(`?map=${encodeURIComponent(requestedMapId)}`, availableMapIds);
    const registryMap = MAP_REGISTRY.find(map => map.id === requestedMapId) ?? null;
    const isRuntimeAllowed = isRuntimeMapAllowed(requestedMapId);
    return {
      requestedMapId,
      resolvedMapId,
      registryMap,
      isRuntimeAllowed,
      selectionAllowed: isRuntimeAllowed && resolvedMapId === RUNTIME_MAP_ID,
      cacheEligible: isRuntimeAllowed && resolvedMapId === RUNTIME_MAP_ID,
      fallsBackToRuntimeMap: resolvedMapId !== requestedMapId,
      registryDefinitionAvailable: registryMap !== null,
    };
  });
  const registryNodes = requests.flatMap(request => request.registryMap ? [buildMapRegistryNode(request.registryMap, input.seed, rulesVersion)] : []);
  const registryNodeByMapId = new Map(registryNodes.map(node => [node.key.slice("map-registry:".length), node]));
  const routeNodes = requests.map(request => buildDirectRouteNode(request, registryNodeByMapId.get(request.requestedMapId), storyContractNode, input.seed, rulesVersion));
  const cacheNodes = requests.map((request, index) => buildMapCacheNode(request, routeNodes[index]!, registryNodeByMapId.get(request.requestedMapId), input.seed, rulesVersion));
  const boundaryNode = buildBoundaryNode(requests, storyContractNode, cacheNodes, input.seed, rulesVersion);
  const nodes = [...storyContract.nodes, ...registryNodes, ...routeNodes, ...cacheNodes, boundaryNode];
  const graph = validateGeneratorDependencyGraph(nodes);
  const storyContractConsistent = storyContract.summary.playableMapContractMatch && storyContract.summary.nextMapRuntimeImportAllowed === false && storyContract.summary.futureMapsRuntimeImportAllowed === false && storyContract.graph.valid;
  const unresolvedReferenceTypes = {
    "map-registry": requests.filter(request => !request.registryDefinitionAvailable).length,
    "selection-boundary": requests.filter(request => !request.selectionAllowed).length,
    "cache-boundary": requests.filter(request => !request.cacheEligible).length,
    "story-contract": storyContractConsistent ? 0 : 1,
  };
  return {
    artifact: { runtimeMapId: RUNTIME_MAP_ID, seed: input.seed, requestedMapIds, contentHash: hashStableJson({ requestedMapIds, requests, storyContractHash: storyContract.artifact.contentHash, rulesVersion } as never) },
    storyContract,
    requests,
    summary: {
      runtimeMapId: RUNTIME_MAP_ID,
      storyPlayableMapId: STORY_PLAYABLE_MAP_ID,
      storyContractConsistent,
      requestedCount: requests.length,
      selectionAllowedCount: requests.filter(request => request.selectionAllowed).length,
      cacheEligibleCount: requests.filter(request => request.cacheEligible).length,
      fallbackCount: requests.filter(request => request.fallsBackToRuntimeMap).length,
      registryDefinitionMissingCount: unresolvedReferenceTypes["map-registry"],
      runtimeDeniedCount: requests.filter(request => !request.isRuntimeAllowed).length,
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

export function getDefaultStoryMapCachePolicyInput(seed = "creator-story-map-cache-policy") {
  return { seed, requestedMapIds: [RUNTIME_MAP_ID, "story-map-002"], completedQuestCount: STORY_QUESTS_PER_MAP } satisfies StoryMapCachePolicyDependencyGraphInput;
}
