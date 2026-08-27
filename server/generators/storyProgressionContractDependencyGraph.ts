import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation } from "./dependencyGraph";
import { createQuestProgressionRegistry, PLAYABLE_STORY_MAP_ID, PLAYABLE_STORY_MAP_INDEX, QUEST_PROGRESSION_SCHEMA_VERSION, QUEST_PROGRESSION_VERSION, QUESTS_PER_MAP, type QuestProgressionOutput } from "./questProgressionGenerator";
import { completeStoryQuest, createDefaultStoryProgressState, getNextStoryQuestId, getRuntimeStoryMapId, getStoryMapRuntimeStatus, getStoryProgressSummary, normalizeStoryProgressState, STORY_PLAYABLE_MAP_ID, STORY_PLAYABLE_MAP_INDEX, STORY_QUESTS_PER_MAP, type StoryProgressState } from "../../client/src/game/systems/storyProgressionSystem";

export const STORY_PROGRESSION_CONTRACT_GRAPH_RULES_VERSION = "story-progression-contract-graph-rules.v1" as const;
export const STORY_PROGRESSION_RUNTIME_VERSION = "1.0.0" as const;
export const STORY_PROGRESSION_RUNTIME_SCHEMA_VERSION = "a-survival.story-progress.v1" as const;

export type StoryProgressionContractDependencyGraphInput = {
  seed: string;
  completedQuestCount?: number;
  rulesVersion?: string;
};

export type StoryProgressionContractDependencyGraphOutput = {
  artifact: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    seed: string;
    questGeneratorVersion: typeof QUEST_PROGRESSION_VERSION;
    runtimeStoryVersion: typeof STORY_PROGRESSION_RUNTIME_VERSION;
    completedQuestCount: number;
    questCount: number;
    contentHash: string;
  };
  runtimeState: StoryProgressState;
  runtimeSummary: ReturnType<typeof getStoryProgressSummary>;
  generated: {
    playableMap: QuestProgressionOutput["maps"][number];
    nextMap: QuestProgressionOutput["maps"][number];
    currentQuestId: string | null;
    questIds: string[];
  };
  summary: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    completedQuestCount: number;
    questsPerPlayableMap: number;
    currentQuestMatch: boolean;
    completedQuestPrefixMatch: boolean;
    playableMapContractMatch: boolean;
    nextMapReadyIndex: number | null;
    nextMapRuntimeImportAllowed: false;
    futureMapsRuntimeImportAllowed: false;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: { "runtime-state": number; "quest-contract": number; "runtime-map-boundary": number };
  };
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedCompletedQuestCount(value: number | undefined) {
  const completedQuestCount = value ?? 0;
  if (!Number.isInteger(completedQuestCount) || completedQuestCount < 0 || completedQuestCount > STORY_QUESTS_PER_MAP) throw new Error(`completedQuestCount must be an integer from 0 to ${STORY_QUESTS_PER_MAP}`);
  return completedQuestCount;
}

function dependencyFor(node: DependencyGraphNode) {
  return { key: node.key, kind: node.kind, required: true as const, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

function completeSequentialQuests(completedQuestCount: number): StoryProgressState {
  let state = normalizeStoryProgressState(createDefaultStoryProgressState());
  for (let order = 1; order <= completedQuestCount; order += 1) {
    const questId = getNextStoryQuestId(state);
    if (!questId) throw new Error(`runtime story state has no quest for order ${order}`);
    const result = completeStoryQuest({ state, questId, now: 0 });
    if (!result.accepted) throw new Error(`runtime story state could not complete ${questId}`);
    state = result.state;
  }
  return state;
}

export function buildStoryProgressionContractDependencyGraph(input: StoryProgressionContractDependencyGraphInput): StoryProgressionContractDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? STORY_PROGRESSION_CONTRACT_GRAPH_RULES_VERSION;
  if (rulesVersion !== STORY_PROGRESSION_CONTRACT_GRAPH_RULES_VERSION) throw new Error(`Unsupported story progression contract graph rules version: ${rulesVersion}`);
  const completedQuestCount = boundedCompletedQuestCount(input.completedQuestCount);
  const runtimeState = completeSequentialQuests(completedQuestCount);
  const runtimeSummary = getStoryProgressSummary(runtimeState);
  const registry = createQuestProgressionRegistry();
  const questArtifact = registry.generate<{ mapCount: number; questsPerMap: number; seedLabel: string }, QuestProgressionOutput>("quest.progression", { mapCount: 2, questsPerMap: QUESTS_PER_MAP, seedLabel: input.seed }, { seed: input.seed, generatedAt: 0 });
  const playableMap = questArtifact.output.maps.find(map => map.mapIndex === PLAYABLE_STORY_MAP_INDEX)!;
  const nextMap = questArtifact.output.maps.find(map => map.mapIndex === PLAYABLE_STORY_MAP_INDEX + 1)!;
  const playableQuestIds = questArtifact.output.quests.filter(quest => quest.mapIndex === PLAYABLE_STORY_MAP_INDEX).sort((left, right) => left.order - right.order).map(quest => quest.id);
  const questRoot: DependencyGraphNode = {
    key: `quest-progression:${questArtifact.contentHash}`,
    kind: "quest",
    generatorId: "quest.progression",
    generatorVersion: QUEST_PROGRESSION_VERSION,
    schemaVersion: QUEST_PROGRESSION_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: questArtifact.contentHash,
    dependencies: [],
  };
  const playableMapNode: DependencyGraphNode = {
    key: `quest-map:${playableMap.mapId}`,
    kind: "world",
    generatorId: "quest.progression",
    generatorVersion: QUEST_PROGRESSION_VERSION,
    schemaVersion: QUEST_PROGRESSION_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson(playableMap as never),
    dependencies: [dependencyFor(questRoot)],
  };
  const nextMapNode: DependencyGraphNode = {
    key: `quest-map:${nextMap.mapId}`,
    kind: "world",
    generatorId: "quest.progression",
    generatorVersion: QUEST_PROGRESSION_VERSION,
    schemaVersion: QUEST_PROGRESSION_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson(nextMap as never),
    dependencies: [dependencyFor(questRoot)],
  };
  const runtimeStateNode: DependencyGraphNode = {
    key: `story-runtime-state:${hashStableJson(runtimeState as never)}`,
    kind: "quest",
    generatorId: "story.progression.runtime",
    generatorVersion: STORY_PROGRESSION_RUNTIME_VERSION,
    schemaVersion: STORY_PROGRESSION_RUNTIME_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson({ state: runtimeState, summary: runtimeSummary } as never),
    dependencies: [dependencyFor(questRoot), dependencyFor(playableMapNode)],
  };
  const runtimeContractNode: DependencyGraphNode = {
    key: "story-runtime-contract:obsidian-frontier",
    kind: "quest",
    generatorId: "story.progression.runtime",
    generatorVersion: STORY_PROGRESSION_RUNTIME_VERSION,
    schemaVersion: STORY_PROGRESSION_RUNTIME_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson({ playableMapId: STORY_PLAYABLE_MAP_ID, playableMapIndex: STORY_PLAYABLE_MAP_INDEX, questsPerMap: STORY_QUESTS_PER_MAP, futureMapsRuntimeImportAllowed: false } as never),
    dependencies: [dependencyFor(runtimeStateNode), dependencyFor(playableMapNode), dependencyFor(nextMapNode)],
  };
  const unresolvedReferences: Array<{ sourceKey: string; referenceType: "runtime-state" | "quest-contract" | "runtime-map-boundary"; referenceId: string; reason: string }> = [];
  const expectedCompletedQuestIds = playableQuestIds.slice(0, completedQuestCount);
  if (runtimeState.completedQuestIds.join("|") !== expectedCompletedQuestIds.join("|")) unresolvedReferences.push({ sourceKey: runtimeStateNode.key, referenceType: "runtime-state", referenceId: "completedQuestIds", reason: "runtime story state is not the contiguous prefix expected from the quest progression owner" });
  const expectedCurrentQuestId = completedQuestCount < playableQuestIds.length ? playableQuestIds[completedQuestCount] ?? null : null;
  if (runtimeSummary.currentQuestId !== expectedCurrentQuestId) unresolvedReferences.push({ sourceKey: runtimeContractNode.key, referenceType: "quest-contract", referenceId: "currentQuestId", reason: `runtime current quest ${runtimeSummary.currentQuestId ?? "null"} does not match generated quest ${expectedCurrentQuestId ?? "null"}` });
  if (playableMap.mapId !== STORY_PLAYABLE_MAP_ID || playableMap.mapIndex !== STORY_PLAYABLE_MAP_INDEX || playableMap.runtimeStatus !== "playable" || !playableMap.runtimeImportAllowed || getStoryMapRuntimeStatus(playableMap.mapIndex) !== "playable" || getRuntimeStoryMapId(playableMap.mapIndex) !== STORY_PLAYABLE_MAP_ID) unresolvedReferences.push({ sourceKey: runtimeContractNode.key, referenceType: "runtime-map-boundary", referenceId: playableMap.mapId, reason: "Obsidian Frontier must be the only playable/runtime-importable story map" });
  if (nextMap.runtimeStatus !== "planned" || nextMap.runtimeImportAllowed || getStoryMapRuntimeStatus(nextMap.mapIndex) !== "planned" || getRuntimeStoryMapId(nextMap.mapIndex) !== null) unresolvedReferences.push({ sourceKey: runtimeContractNode.key, referenceType: "runtime-map-boundary", referenceId: nextMap.mapId, reason: "the next story map must remain planned and have no runtime map ID" });
  const unresolvedReferenceTypes = {
    "runtime-state": unresolvedReferences.filter(reference => reference.referenceType === "runtime-state").length,
    "quest-contract": unresolvedReferences.filter(reference => reference.referenceType === "quest-contract").length,
    "runtime-map-boundary": unresolvedReferences.filter(reference => reference.referenceType === "runtime-map-boundary").length,
  };
  const nodes = [questRoot, playableMapNode, nextMapNode, runtimeStateNode, runtimeContractNode];
  return {
    artifact: { mapId: PLAYABLE_STORY_MAP_ID, seed: input.seed, questGeneratorVersion: QUEST_PROGRESSION_VERSION, runtimeStoryVersion: STORY_PROGRESSION_RUNTIME_VERSION, completedQuestCount, questCount: questArtifact.output.quests.length, contentHash: hashStableJson({ questHash: questArtifact.contentHash, runtimeState, rulesVersion } as never) },
    runtimeState,
    runtimeSummary,
    generated: { playableMap, nextMap, currentQuestId: expectedCurrentQuestId, questIds: playableQuestIds },
    summary: {
      mapId: PLAYABLE_STORY_MAP_ID,
      completedQuestCount,
      questsPerPlayableMap: QUESTS_PER_MAP,
      currentQuestMatch: runtimeSummary.currentQuestId === expectedCurrentQuestId,
      completedQuestPrefixMatch: runtimeState.completedQuestIds.join("|") === expectedCompletedQuestIds.join("|"),
      playableMapContractMatch: playableMap.mapId === STORY_PLAYABLE_MAP_ID && playableMap.runtimeStatus === "playable" && playableMap.runtimeImportAllowed,
      nextMapReadyIndex: runtimeSummary.nextMapReadyIndex,
      nextMapRuntimeImportAllowed: false,
      futureMapsRuntimeImportAllowed: false,
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
