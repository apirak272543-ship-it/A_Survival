import { hashStableJson } from "./commonGeneratorApi";
import { createQuestProgressionRegistry, type QuestProgressionInput, type QuestProgressionOutput } from "./questProgressionGenerator";
import { buildContentCatalogDependencyGraph } from "./contentCatalogDependencyGraph";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation } from "./dependencyGraph";

export const QUEST_CONTENT_GRAPH_RULES_VERSION = "quest-content-graph-rules.v1" as const;

export type QuestContentCatalogDependencyGraphInput = {
  seed: string;
  mapCount?: number;
  sampleQuestCount?: number;
  rulesVersion?: string;
};

export type QuestContentCatalogDependencyGraphOutput = {
  artifact: {
    generatorId: string;
    generatorVersion: string;
    seed: string;
    contentHash: string;
    mapCount: number;
    questCount: number;
  };
  summary: {
    sampledQuestCount: number;
    referencedContentCount: number;
    unresolvedReferenceCount: number;
    futureMapNodeCount: number;
  };
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedMapCount(value: number | undefined) {
  const mapCount = value ?? 1;
  if (!Number.isInteger(mapCount) || mapCount < 1 || mapCount > 100) throw new Error("mapCount must be an integer from 1 to 100");
  return mapCount;
}

function boundedQuestCount(value: number | undefined) {
  const questCount = value ?? 4;
  if (!Number.isInteger(questCount) || questCount < 1 || questCount > 20) throw new Error("sampleQuestCount must be an integer from 1 to 20");
  return questCount;
}

function nodeBase(input: { key: string; kind: DependencyGraphNode["kind"]; schemaVersion: string; seed: string; rulesVersion: string; generatorId: string; generatorVersion: string; contentHash: string; dependencies: DependencyGraphNode["dependencies"] }): DependencyGraphNode {
  return input;
}

function addDependency(dependencies: DependencyGraphNode["dependencies"], dependency: DependencyGraphNode["dependencies"][number]) {
  if (!dependencies.some(existing => existing.key === dependency.key)) dependencies.push(dependency);
}

function buildQuestNodes(output: QuestProgressionOutput, artifact: { generatorId: string; generatorVersion: string; seed: string; contentHash: string }, catalogNodes: DependencyGraphNode[], sampleQuestCount: number, rulesVersion: string) {
  const catalogByKey = new Map(catalogNodes.map(node => [node.key, node]));
  const sampledQuests = output.quests.slice(0, sampleQuestCount);
  const rootKey = `quest-progression:${artifact.contentHash}`;
  const catalogRoot = catalogNodes.find(node => node.key.startsWith("content-catalog:"));
  const root = nodeBase({ key: rootKey, kind: "quest", generatorId: artifact.generatorId, generatorVersion: artifact.generatorVersion, schemaVersion: output.schemaVersion, seed: artifact.seed, rulesVersion, contentHash: artifact.contentHash, dependencies: catalogRoot ? [{ key: catalogRoot.key, kind: catalogRoot.kind, required: true, generatorId: catalogRoot.generatorId, generatorVersion: catalogRoot.generatorVersion, contentHash: catalogRoot.contentHash }] : [] });
  const mapByIndex = new Map(output.maps.map(map => [map.mapIndex, map]));
  const mapNodes: DependencyGraphNode[] = output.maps.map(map => {
    return nodeBase({
      key: `map:${map.mapId}`,
      kind: "world",
      generatorId: artifact.generatorId,
      generatorVersion: artifact.generatorVersion,
      schemaVersion: output.schemaVersion,
      seed: artifact.seed,
      rulesVersion,
      contentHash: hashStableJson(map as never),
      dependencies: [{ key: root.key, kind: root.kind, required: true, generatorId: root.generatorId, generatorVersion: root.generatorVersion, contentHash: root.contentHash }],
    });
  });
  const questNodes: DependencyGraphNode[] = sampledQuests.map(quest => {
    const dependencies: DependencyGraphNode["dependencies"] = [];
    const map = mapByIndex.get(quest.mapIndex);
    if (map) addDependency(dependencies, { key: `map:${map.mapId}`, kind: "world", required: true, generatorId: artifact.generatorId, generatorVersion: artifact.generatorVersion, contentHash: mapNodes.find(node => node.key === `map:${map.mapId}`)?.contentHash });
    for (const prerequisite of quest.prerequisites) addDependency(dependencies, { key: `quest:${prerequisite}`, kind: "quest", required: true, generatorId: artifact.generatorId, generatorVersion: artifact.generatorVersion });
    for (const objective of quest.objectives) addDependency(dependencies, { key: `content:${objective.targetId}`, kind: "item", required: true });
    for (const reward of quest.rewards) if (reward.itemDefinitionId) addDependency(dependencies, { key: `content:${reward.itemDefinitionId}`, kind: "item", required: true });
    return nodeBase({ key: `quest:${quest.id}`, kind: "quest", generatorId: artifact.generatorId, generatorVersion: artifact.generatorVersion, schemaVersion: output.schemaVersion, seed: artifact.seed, rulesVersion, contentHash: hashStableJson(quest as never), dependencies });
  });
  const normalizedQuestDependencies = questNodes.map(node => ({
    ...node,
    dependencies: node.dependencies.map(dependency => {
      const target = catalogByKey.get(dependency.key) ?? questNodes.find(candidate => candidate.key === dependency.key) ?? mapNodes.find(candidate => candidate.key === dependency.key) ?? (dependency.key === root.key ? root : undefined);
      return target ? { ...dependency, kind: target.kind, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash } : dependency;
    }),
  }));
  return { root, mapNodes, questNodes: normalizedQuestDependencies, sampledQuests };
}

export function buildQuestContentCatalogDependencyGraph(input: QuestContentCatalogDependencyGraphInput): QuestContentCatalogDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? QUEST_CONTENT_GRAPH_RULES_VERSION;
  if (rulesVersion !== QUEST_CONTENT_GRAPH_RULES_VERSION) throw new Error(`Unsupported quest content graph rules version: ${rulesVersion}`);
  const mapCount = boundedMapCount(input.mapCount);
  const sampleQuestCount = boundedQuestCount(input.sampleQuestCount);
  const questInput: QuestProgressionInput = { mapCount, questsPerMap: 20, seedLabel: input.seed };
  const questRegistry = createQuestProgressionRegistry();
  const artifact = questRegistry.generate<QuestProgressionInput, QuestProgressionOutput>("quest.progression", questInput, { seed: input.seed, generatedAt: 0 });
  const catalogGraph = buildContentCatalogDependencyGraph({ seed: input.seed, samplePerCategory: 8 });
  const questGraph = buildQuestNodes(artifact.output, artifact, catalogGraph.nodes, sampleQuestCount, rulesVersion);
  const nodes = [...catalogGraph.nodes, questGraph.root, ...questGraph.mapNodes, ...questGraph.questNodes];
  const referencedContentKeys = questGraph.questNodes.flatMap(node => node.dependencies.filter(dependency => dependency.key.startsWith("content:")).map(dependency => dependency.key));
  const unresolvedReferenceCount = new Set(referencedContentKeys.filter(key => !nodes.some(node => node.key === key))).size;
  const futureMapNodeCount = questGraph.mapNodes.filter(node => {
    const mapId = node.key.slice("map:".length);
    return artifact.output.maps.find(map => map.mapId === mapId)?.runtimeImportAllowed === false;
  }).length;
  return {
    artifact: { generatorId: artifact.generatorId, generatorVersion: artifact.generatorVersion, seed: artifact.seed, contentHash: artifact.contentHash, mapCount: artifact.output.maps.length, questCount: artifact.output.quests.length },
    summary: { sampledQuestCount: questGraph.sampledQuests.length, referencedContentCount: new Set(referencedContentKeys).size, unresolvedReferenceCount, futureMapNodeCount },
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
