import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { buildMap001EncounterDependencyGraph, MAP001_ENCOUNTER_OWNER_VERSION } from "./map001EncounterDependencyGraph";
import { createQuestProgressionRegistry, QUEST_PROGRESSION_SCHEMA_VERSION, QUEST_PROGRESSION_VERSION, PLAYABLE_STORY_MAP_ID, PLAYABLE_STORY_MAP_INDEX, QUESTS_PER_MAP, type QuestDefinition, type QuestProgressionOutput, type StoryMapProgression } from "./questProgressionGenerator";
import { getRuntimeStoryMapId, getStoryMapRuntimeStatus, STORY_PLAYABLE_MAP_ID, STORY_PLAYABLE_MAP_INDEX, STORY_QUESTS_PER_MAP } from "../../client/src/game/systems/storyProgressionSystem";

export const MAP001_STORY_GATE_GRAPH_RULES_VERSION = "map001-story-gate-graph-rules.v1" as const;

export type Map001StoryGateDependencyGraphInput = {
  seed: string;
  mapCount?: number;
  rulesVersion?: string;
};

export type Map001StoryGateUnresolvedReference = {
  sourceKey: string;
  referenceType: "encounter-completion" | "story-gate" | "runtime-map-boundary";
  referenceId: string;
  reason: string;
};

export type Map001StoryGateDependencyGraphOutput = {
  artifact: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    seed: string;
    mapCount: number;
    questCount: number;
    playableMapIndex: number;
    nextMapIndex: number | null;
    nextMapRuntimeImportAllowed: false;
    questGeneratorVersion: string;
    encounterOwnerVersion: string;
    contentHash: string;
  };
  summary: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    playableMapIndex: number;
    playableMapQuestCount: number;
    nextMapIndex: number | null;
    nextMapId: string | null;
    nextMapPrerequisiteCount: number;
    encounterEventCount: number;
    encounterCompletionSupported: false;
    gateReady: false;
    futureMapRuntimeImportAllowed: false;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<Map001StoryGateUnresolvedReference["referenceType"], number>;
  };
  storyMaps: Array<Pick<StoryMapProgression, "mapIndex" | "mapId" | "runtimeStatus" | "runtimeImportAllowed" | "questIds" | "unlockRequiresQuestIds">>;
  gate: {
    id: "map001-to-map002";
    requiredQuestIds: string[];
    encounterEventIds: string[];
    completionState: "not-represented";
    ready: false;
  };
  unresolvedReferences: Map001StoryGateUnresolvedReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return normalized;
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return { key: target.key, kind: target.kind, required: true, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function questNodeKey(questId: string) {
  return `story-quest:${questId}`;
}

function storyMapNodeKey(mapId: string) {
  return `story-map:${mapId}`;
}

function buildQuestNode(quest: QuestDefinition, mapNode: DependencyGraphNode, previousQuestNode: DependencyGraphNode | undefined, previousMapQuestNodes: DependencyGraphNode[], rootNode: DependencyGraphNode, seed: string, rulesVersion: string) {
  const dependencies = [dependencyFor(rootNode), dependencyFor(mapNode)];
  if (previousQuestNode) dependencies.push(dependencyFor(previousQuestNode));
  dependencies.push(...previousMapQuestNodes.map(dependencyFor));
  return {
    key: questNodeKey(quest.id),
    kind: "quest" as const,
    generatorId: "quest.progression",
    generatorVersion: QUEST_PROGRESSION_VERSION,
    schemaVersion: QUEST_PROGRESSION_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson(quest as never),
    dependencies,
  } satisfies DependencyGraphNode;
}

function buildMapNode(map: StoryMapProgression, rootNode: DependencyGraphNode, seed: string, rulesVersion: string) {
  return {
    key: storyMapNodeKey(map.mapId),
    kind: "quest" as const,
    generatorId: "quest.progression",
    generatorVersion: QUEST_PROGRESSION_VERSION,
    schemaVersion: QUEST_PROGRESSION_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson(map as never),
    dependencies: [dependencyFor(rootNode)],
  } satisfies DependencyGraphNode;
}

export function buildMap001StoryGateDependencyGraph(input: Map001StoryGateDependencyGraphInput): Map001StoryGateDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? MAP001_STORY_GATE_GRAPH_RULES_VERSION;
  if (rulesVersion !== MAP001_STORY_GATE_GRAPH_RULES_VERSION) throw new Error(`Unsupported MAP_001 story gate graph rules version: ${rulesVersion}`);
  const mapCount = boundedInteger(input.mapCount, 2, 2, 3, "mapCount");
  const encounterGraph = buildMap001EncounterDependencyGraph({ seed: input.seed, radius: 32, sampleSpawnCount: 64 });
  const encounterNodes = encounterGraph.nodes.map(node => ({ ...node, rulesVersion }));
  const questRegistry = createQuestProgressionRegistry();
  const questArtifact = questRegistry.generate<
    { mapCount: number; questsPerMap: number; seedLabel: string },
    QuestProgressionOutput
  >("quest.progression", { mapCount, questsPerMap: STORY_QUESTS_PER_MAP, seedLabel: input.seed }, { seed: input.seed, generatedAt: 0 });
  const questOutput = questArtifact.output;
  const questRoot: DependencyGraphNode = {
    key: `story-progression:${questArtifact.contentHash}`,
    kind: "quest",
    generatorId: "quest.progression",
    generatorVersion: QUEST_PROGRESSION_VERSION,
    schemaVersion: QUEST_PROGRESSION_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: questArtifact.contentHash,
    dependencies: [],
  };
  const mapNodes = questOutput.maps.map(map => buildMapNode(map, questRoot, input.seed, rulesVersion));
  const mapNodeByIndex = new Map(questOutput.maps.map((map, index) => [map.mapIndex, mapNodes[index]! ]));
  const questNodes: DependencyGraphNode[] = [];
  const questNodeById = new Map<string, DependencyGraphNode>();
  for (const quest of questOutput.quests) {
    const mapNode = mapNodeByIndex.get(quest.mapIndex)!;
    const previousQuestNode = quest.order > 1 ? questNodeById.get(questOutput.quests.find(candidate => candidate.mapIndex === quest.mapIndex && candidate.order === quest.order - 1)?.id ?? "") : undefined;
    const previousMapQuestNodes = quest.mapIndex > PLAYABLE_STORY_MAP_INDEX && quest.order === 1
      ? questOutput.quests.filter(candidate => candidate.mapIndex === quest.mapIndex - 1).map(candidate => questNodeById.get(candidate.id)).filter((node): node is DependencyGraphNode => Boolean(node))
      : [];
    const questNode = buildQuestNode(quest, mapNode, previousQuestNode, previousMapQuestNodes, questRoot, input.seed, rulesVersion);
    questNodes.push(questNode);
    questNodeById.set(quest.id, questNode);
  }
  const playableMap = questOutput.maps.find(map => map.mapIndex === PLAYABLE_STORY_MAP_INDEX)!;
  const nextMap = questOutput.maps.find(map => map.mapIndex === PLAYABLE_STORY_MAP_INDEX + 1);
  const nextMapNode = nextMap ? mapNodeByIndex.get(nextMap.mapIndex) : undefined;
  const encounterOutputNodes = encounterNodes.filter(node => node.key.startsWith("map001-encounter-output:"));
  const encounterCompletionKey = "map001-encounter-completion:boss-defeated";
  const unresolvedReferences: Map001StoryGateUnresolvedReference[] = [{
    sourceKey: "story-gate:map001-to-map002",
    referenceType: "encounter-completion",
    referenceId: encounterCompletionKey,
    reason: "MAP_001 encounter owner exposes boss-active state but no boss-defeated completion event/API; completion must not be inferred for the story gate",
  }];
  if (nextMap && (getStoryMapRuntimeStatus(nextMap.mapIndex) !== "planned" || getRuntimeStoryMapId(nextMap.mapIndex) !== null)) unresolvedReferences.push({ sourceKey: "story-gate:map001-to-map002", referenceType: "runtime-map-boundary", referenceId: nextMap.mapId, reason: "next story map must remain planned and have no runtime map ID" });
  const requiredQuestIds = nextMap?.unlockRequiresQuestIds ?? [];
  const requiredQuestNodes = requiredQuestIds.map(id => questNodeById.get(id)).filter((node): node is DependencyGraphNode => Boolean(node));
  const gateDependencies: GeneratorDependency[] = [dependencyFor(questRoot), ...requiredQuestNodes.map(dependencyFor), ...encounterOutputNodes.map(dependencyFor), missingDependency(encounterCompletionKey, "other")];
  if (nextMapNode) gateDependencies.push(dependencyFor(nextMapNode));
  const gateNode: DependencyGraphNode = {
    key: "story-gate:map001-to-map002",
    kind: "quest",
    generatorId: "story.progression",
    generatorVersion: "1.0.0",
    schemaVersion: "a-survival.map001-story-gate.v1",
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson({ id: "map001-to-map002", requiredQuestIds, encounterEventIds: encounterOutputNodes.map(node => node.key), completionState: "not-represented" } as never),
    dependencies: gateDependencies,
  };
  const nodes = [...encounterNodes, questRoot, ...mapNodes, ...questNodes, gateNode];
  const unresolvedReferenceTypes = {
    "encounter-completion": unresolvedReferences.filter(reference => reference.referenceType === "encounter-completion").length,
    "story-gate": unresolvedReferences.filter(reference => reference.referenceType === "story-gate").length,
    "runtime-map-boundary": unresolvedReferences.filter(reference => reference.referenceType === "runtime-map-boundary").length,
  } satisfies Record<Map001StoryGateUnresolvedReference["referenceType"], number>;
  return {
    artifact: {
      mapId: PLAYABLE_STORY_MAP_ID,
      seed: input.seed,
      mapCount,
      questCount: questOutput.quests.length,
      playableMapIndex: PLAYABLE_STORY_MAP_INDEX,
      nextMapIndex: nextMap?.mapIndex ?? null,
      nextMapRuntimeImportAllowed: false,
      questGeneratorVersion: QUEST_PROGRESSION_VERSION,
      encounterOwnerVersion: MAP001_ENCOUNTER_OWNER_VERSION,
      contentHash: hashStableJson({ questHash: questArtifact.contentHash, encounterHash: encounterGraph.artifact.worldHash, requiredQuestIds, rulesVersion } as never),
    },
    summary: {
      mapId: PLAYABLE_STORY_MAP_ID,
      playableMapIndex: PLAYABLE_STORY_MAP_INDEX,
      playableMapQuestCount: playableMap?.questIds.length ?? 0,
      nextMapIndex: nextMap?.mapIndex ?? null,
      nextMapId: nextMap?.mapId ?? null,
      nextMapPrerequisiteCount: requiredQuestIds.length,
      encounterEventCount: encounterOutputNodes.length,
      encounterCompletionSupported: false,
      gateReady: false,
      futureMapRuntimeImportAllowed: false,
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    storyMaps: questOutput.maps.map(map => ({ mapIndex: map.mapIndex, mapId: map.mapId, runtimeStatus: map.runtimeStatus, runtimeImportAllowed: map.runtimeImportAllowed, questIds: map.questIds, unlockRequiresQuestIds: map.unlockRequiresQuestIds })),
    gate: { id: "map001-to-map002", requiredQuestIds, encounterEventIds: encounterOutputNodes.map(node => node.key).sort(), completionState: "not-represented", ready: false },
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
