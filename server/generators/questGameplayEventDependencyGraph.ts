import { generateQuestProgression, PLAYABLE_STORY_MAP_ID, QUEST_PROGRESSION_SCHEMA_VERSION, QUEST_PROGRESSION_VERSION, QUESTS_PER_MAP, type QuestDefinition, type QuestObjectiveKind } from "./questProgressionGenerator";
import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const QUEST_GAMEPLAY_EVENT_GRAPH_RULES_VERSION = "quest-gameplay-event-graph-rules.v1" as const;
export const GAMEPLAY_EVENT_CONTRACT_VERSION = "1.0.0" as const;
export const GAMEPLAY_EVENT_CONTRACT_SCHEMA_VERSION = "a-survival.gameplay-event-contract.v1" as const;
export const QUEST_GAMEPLAY_EVENT_GRAPH_VERSION = "1.0.0" as const;
export const QUEST_GAMEPLAY_EVENT_GRAPH_SCHEMA_VERSION = "a-survival.quest-gameplay-event-graph.v1" as const;
export const MAX_QUEST_GAMEPLAY_EVENT_SAMPLE = QUESTS_PER_MAP;

export type QuestGameplayEventDependencyGraphInput = {
  seed: string;
  sampleQuestCount?: number;
  completedQuestCount?: number;
  rulesVersion?: string;
};

type EventContract = {
  objectiveKind: QuestObjectiveKind;
  runtimeEventType?: string;
  owner?: string;
  targetBinding?: string;
  requiredPayloadFields: string[];
  supported: boolean;
  reason: string;
};

export type QuestGameplayEventAssessment = {
  questId: string;
  objectiveId: string;
  objectiveKind: QuestObjectiveKind;
  targetId: string;
  required: number;
  runtimeEventType?: string;
  owner?: string;
  targetBinding?: string;
  requiredPayloadFields: string[];
  supported: boolean;
  reason: string;
};

export type QuestGameplayEventDependencyGraphOutput = {
  artifact: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    seed: string;
    sampleQuestCount: number;
    completedQuestCount: number;
    contentHash: string;
  };
  assessments: QuestGameplayEventAssessment[];
  summary: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    sampleQuestCount: number;
    completedQuestCount: number;
    objectiveKindCounts: Record<QuestObjectiveKind, number>;
    supportedObjectiveCount: number;
    unsupportedObjectiveCount: number;
    missingRuntimeEventCount: number;
    missingTargetBindingCount: number;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: {
      "gameplay-event-owner": number;
      "gameplay-target-binding": number;
      "quest-contract": number;
    };
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

const EVENT_CONTRACTS: Record<QuestObjectiveKind, EventContract> = {
  visit: { objectiveKind: "visit", requiredPayloadFields: [], supported: false, reason: "runtime has no canonical visit event owner" },
  collect: { objectiveKind: "collect", requiredPayloadFields: [], supported: false, reason: "runtime has no canonical collect event owner with target identity" },
  mine: { objectiveKind: "mine", runtimeEventType: "block-break", owner: "ArcaneFrontier/blockWorldSystem", targetBinding: "missing:drop-definition", requiredPayloadFields: ["mapId", "moduleId", "coordinate"], supported: false, reason: "block-break exists but its runtime payload does not carry the mined target/drop identity required by the quest" },
  harvest: { objectiveKind: "harvest", runtimeEventType: "harvest-world-crop", owner: "worldFarmSystem/ArcaneFrontier", targetBinding: "payload.plantId", requiredPayloadFields: ["mapId", "plotId", "plantId", "rewardInstanceId", "coordinate"], supported: false, reason: "harvest action owner exists, but the runtime pending-action bridge omits plantId so exact quest target matching is not complete" },
  "place-block": { objectiveKind: "place-block", runtimeEventType: "block-place", owner: "ArcaneFrontier/blockWorldSystem", targetBinding: "payload.itemDefinitionId", requiredPayloadFields: ["mapId", "moduleId", "itemInstanceId", "itemDefinitionId", "coordinate"], supported: false, reason: "block-place exists but the generated quest target is not proven to match the runtime itemDefinitionId contract" },
  talk: { objectiveKind: "talk", requiredPayloadFields: [], supported: false, reason: "runtime has no canonical talk event owner" },
  craft: { objectiveKind: "craft", requiredPayloadFields: [], supported: false, reason: "runtime has no canonical craft event owner" },
  defeat: { objectiveKind: "defeat", requiredPayloadFields: [], supported: false, reason: "runtime has no canonical combat/defeat event owner" },
};

function boundedSampleCount(value: number | undefined) {
  const normalized = Math.trunc(value ?? 8);
  if (normalized < 1 || normalized > MAX_QUEST_GAMEPLAY_EVENT_SAMPLE) throw new Error(`sampleQuestCount must be between 1 and ${MAX_QUEST_GAMEPLAY_EVENT_SAMPLE}`);
  return normalized;
}

function boundedCompletedQuestCount(value: number | undefined) {
  const normalized = Math.trunc(value ?? 0);
  if (normalized < 0 || normalized > QUESTS_PER_MAP) throw new Error(`completedQuestCount must be between 0 and ${QUESTS_PER_MAP}`);
  return normalized;
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return { key: node.key, kind: node.kind, required: true, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

function questProgressionNode(seed: string, rulesVersion: string, sampleQuestCount: number, completedQuestCount: number): DependencyGraphNode {
  return {
    key: `quest.progression:${PLAYABLE_STORY_MAP_ID}`,
    kind: "quest",
    generatorId: "quest.progression",
    generatorVersion: QUEST_PROGRESSION_VERSION,
    schemaVersion: QUEST_PROGRESSION_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, sampleQuestCount, completedQuestCount, source: "generateQuestProgression", runtimeImportAllowed: false } as never),
    dependencies: [],
  };
}

function gameplayActionOwnerNode(seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `gameplay-actions:${PLAYABLE_STORY_MAP_ID}`,
    kind: "simulation",
    generatorId: "gameplay.action",
    generatorVersion: GAMEPLAY_EVENT_CONTRACT_VERSION,
    schemaVersion: GAMEPLAY_EVENT_CONTRACT_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, eventTypes: ["block-break", "block-place", "plant-world-seed", "harvest-world-crop", "storage-deposit", "storage-withdraw", "use-item"], source: ["ArcaneFrontier", "syncActionValidation"] } as never),
    dependencies: [],
  };
}

function objectiveNode(quest: QuestDefinition, questNode: DependencyGraphNode, seed: string, rulesVersion: string): DependencyGraphNode {
  const objective = quest.objectives[0]!;
  return {
    key: `quest-objective:${objective.id}`,
    kind: "quest",
    generatorId: "quest.progression",
    generatorVersion: QUEST_PROGRESSION_VERSION,
    schemaVersion: QUEST_PROGRESSION_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ questId: quest.id, objective } as never),
    dependencies: [dependencyFor(questNode)],
  };
}

function gameplayBindingNode(assessment: QuestGameplayEventAssessment, objectiveNodeValue: DependencyGraphNode, actionOwnerNodeValue: DependencyGraphNode, seed: string, rulesVersion: string): DependencyGraphNode {
  const dependencies: GeneratorDependency[] = [dependencyFor(objectiveNodeValue), dependencyFor(actionOwnerNodeValue)];
  if (!assessment.runtimeEventType) {
    dependencies.push({ key: `gameplay-event-owner:${assessment.objectiveKind}`, kind: "simulation", required: true, generatorId: "gameplay.action", generatorVersion: GAMEPLAY_EVENT_CONTRACT_VERSION });
  }
  if (!assessment.supported) {
    dependencies.push({ key: `gameplay-target-binding:${assessment.objectiveId}`, kind: "simulation", required: true, generatorId: "gameplay.action", generatorVersion: GAMEPLAY_EVENT_CONTRACT_VERSION });
  }
  return {
    key: `quest-gameplay-binding:${assessment.objectiveId}`,
    kind: "simulation",
    generatorId: "quest.gameplay-event",
    generatorVersion: QUEST_GAMEPLAY_EVENT_GRAPH_VERSION,
    schemaVersion: GAMEPLAY_EVENT_CONTRACT_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ assessment, writeInvoked: false } as never),
    dependencies,
  };
}

export function buildQuestGameplayEventDependencyGraph(input: QuestGameplayEventDependencyGraphInput): QuestGameplayEventDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? QUEST_GAMEPLAY_EVENT_GRAPH_RULES_VERSION;
  if (rulesVersion !== QUEST_GAMEPLAY_EVENT_GRAPH_RULES_VERSION) throw new Error(`Unsupported quest gameplay event graph rules version: ${rulesVersion}`);
  const sampleQuestCount = boundedSampleCount(input.sampleQuestCount);
  const completedQuestCount = boundedCompletedQuestCount(input.completedQuestCount);
  const progression = generateQuestProgression({ mapCount: 1, questsPerMap: QUESTS_PER_MAP, seedLabel: input.seed });
  const quests = progression.quests.slice(0, sampleQuestCount);
  const questNode = questProgressionNode(input.seed, rulesVersion, sampleQuestCount, completedQuestCount);
  const actionOwnerNode = gameplayActionOwnerNode(input.seed, rulesVersion);
  const assessments = quests.map((quest): QuestGameplayEventAssessment => {
    const objective = quest.objectives[0]!;
    const contract = EVENT_CONTRACTS[objective.kind];
    return {
      questId: quest.id,
      objectiveId: objective.id,
      objectiveKind: objective.kind,
      targetId: objective.targetId,
      required: objective.required,
      runtimeEventType: contract.runtimeEventType,
      owner: contract.owner,
      targetBinding: contract.targetBinding,
      requiredPayloadFields: contract.requiredPayloadFields,
      supported: contract.supported,
      reason: contract.reason,
    };
  });
  const objectiveNodes = quests.map(quest => objectiveNode(quest, questNode, input.seed, rulesVersion));
  const bindingNodes = assessments.map((assessment, index) => gameplayBindingNode(assessment, objectiveNodes[index]!, actionOwnerNode, input.seed, rulesVersion));
  const boundaryNode: DependencyGraphNode = {
    key: `quest-gameplay-boundary:${PLAYABLE_STORY_MAP_ID}`,
    kind: "quest",
    generatorId: "quest.gameplay-event",
    generatorVersion: QUEST_GAMEPLAY_EVENT_GRAPH_VERSION,
    schemaVersion: QUEST_GAMEPLAY_EVENT_GRAPH_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, sampleQuestCount, completedQuestCount, assessmentIds: assessments.map(assessment => assessment.objectiveId) } as never),
    dependencies: [dependencyFor(questNode), dependencyFor(actionOwnerNode), ...bindingNodes.map(dependencyFor)],
  };
  const nodes = [questNode, actionOwnerNode, ...objectiveNodes, ...bindingNodes, boundaryNode];
  const graph = validateGeneratorDependencyGraph(nodes);
  const objectiveKindCounts = Object.fromEntries((Object.keys(EVENT_CONTRACTS) as QuestObjectiveKind[]).map(kind => [kind, assessments.filter(assessment => assessment.objectiveKind === kind).length])) as Record<QuestObjectiveKind, number>;
  const missingRuntimeEventCount = assessments.filter(assessment => !assessment.runtimeEventType).length;
  const missingTargetBindingCount = assessments.filter(assessment => !assessment.supported).length;
  const unresolvedReferenceTypes = {
    "gameplay-event-owner": missingRuntimeEventCount,
    "gameplay-target-binding": missingTargetBindingCount,
    "quest-contract": progression.constraints.futureMapsRuntimeImportAllowed ? 1 : 0,
  };
  return {
    artifact: {
      mapId: PLAYABLE_STORY_MAP_ID,
      seed: input.seed,
      sampleQuestCount,
      completedQuestCount,
      contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, seed: input.seed, sampleQuestCount, completedQuestCount, assessments } as never),
    },
    assessments,
    summary: {
      mapId: PLAYABLE_STORY_MAP_ID,
      sampleQuestCount,
      completedQuestCount,
      objectiveKindCounts,
      supportedObjectiveCount: assessments.filter(assessment => assessment.supported).length,
      unsupportedObjectiveCount: assessments.filter(assessment => !assessment.supported).length,
      missingRuntimeEventCount,
      missingTargetBindingCount,
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

export function getDefaultQuestGameplayEventDependencyGraphInput(seed = "creator-quest-gameplay-event") {
  return { seed, sampleQuestCount: 8, completedQuestCount: 0, rulesVersion: QUEST_GAMEPLAY_EVENT_GRAPH_RULES_VERSION } satisfies QuestGameplayEventDependencyGraphInput;
}
