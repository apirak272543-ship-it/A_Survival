import {
  createMapRewardInstance,
  getItemDefinition,
} from "../../client/src/game/data/catalog";
import {
  generateQuestProgression,
  PLAYABLE_STORY_MAP_ID,
  QUEST_PROGRESSION_SCHEMA_VERSION,
  QUEST_PROGRESSION_VERSION,
  QUESTS_PER_MAP,
  type QuestDefinition,
  type QuestReward,
} from "./questProgressionGenerator";
import { hashStableJson } from "./commonGeneratorApi";
import {
  validateGeneratorDependencyGraph,
  type DependencyGraphNode,
  type DependencyGraphValidation,
  type GeneratorDependency,
} from "./dependencyGraph";

export const QUEST_REWARD_RUNTIME_GRAPH_RULES_VERSION = "quest-reward-runtime-graph-rules.v1" as const;
export const QUEST_REWARD_RUNTIME_GRAPH_VERSION = "1.0.0" as const;
export const QUEST_REWARD_RUNTIME_GRAPH_SCHEMA_VERSION = "a-survival.quest-reward-runtime-graph.v1" as const;
export const REWARD_RUNTIME_CONTRACT_VERSION = "1.0.0" as const;
export const REWARD_RUNTIME_CONTRACT_SCHEMA_VERSION = "a-survival.reward-runtime-contract.v1" as const;
export const MAX_QUEST_REWARD_RUNTIME_SAMPLE = QUESTS_PER_MAP;

export type QuestRewardRuntimeDependencyGraphInput = {
  seed: string;
  sampleQuestCount?: number;
  completedQuestCount?: number;
  rulesVersion?: string;
};

export type QuestRewardRuntimeAssessment = {
  questId: string;
  rewardIndex: number;
  itemDefinitionId?: string;
  quantity?: number;
  abilityId?: string;
  reputation?: number;
  itemDefinitionAvailable: boolean;
  rewardInstanceFactoryAvailable: boolean;
  rewardHandlerOwner: "ArcaneFrontier/rewardHandler";
  questRewardDispatchOwner?: string;
  abilityRuntimeOwner?: string;
  supported: boolean;
  reason: string;
};

export type QuestRewardRuntimeDependencyGraphOutput = {
  artifact: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    seed: string;
    sampleQuestCount: number;
    completedQuestCount: number;
    contentHash: string;
  };
  assessments: QuestRewardRuntimeAssessment[];
  summary: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    sampleQuestCount: number;
    completedQuestCount: number;
    rewardCount: number;
    itemDefinitionAvailableCount: number;
    missingItemDefinitionCount: number;
    rewardInstanceFactoryAvailableCount: number;
    questRewardDispatchBridgeMissingCount: number;
    abilityRewardCount: number;
    abilityRuntimeOwnerMissingCount: number;
    supportedRewardCount: number;
    unsupportedRewardCount: number;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: {
      "reward-item-definition": number;
      "quest-reward-dispatch": number;
      "ability-runtime-owner": number;
    };
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

const REWARD_RUNTIME_OWNER = "ArcaneFrontier/rewardHandler" as const;

function boundedSampleCount(value: number | undefined) {
  const normalized = Math.trunc(value ?? 8);
  if (normalized < 1 || normalized > MAX_QUEST_REWARD_RUNTIME_SAMPLE) throw new Error(`sampleQuestCount must be between 1 and ${MAX_QUEST_REWARD_RUNTIME_SAMPLE}`);
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

function itemDefinitionNode(seed: string, rulesVersion: string, itemDefinitionIds: string[]): DependencyGraphNode {
  const definitions = itemDefinitionIds.map(definitionId => {
    const definition = getItemDefinition(definitionId);
    return definition ? { id: definition.id, category: definition.category, stackLimit: definition.stackLimit, equippable: definition.equippable, isBlockItem: definition.isBlockItem ?? false } : { id: definitionId, missing: true };
  });
  return {
    key: `item.definitions:${PLAYABLE_STORY_MAP_ID}`,
    kind: "item",
    generatorId: "item.catalog",
    generatorVersion: "1.0.0",
    schemaVersion: "a-survival.item-catalog.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, definitions } as never),
    dependencies: [],
  };
}

function rewardContractNode(seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `reward-runtime-contract:${PLAYABLE_STORY_MAP_ID}`,
    kind: "simulation",
    generatorId: "quest.reward-runtime",
    generatorVersion: REWARD_RUNTIME_CONTRACT_VERSION,
    schemaVersion: REWARD_RUNTIME_CONTRACT_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({
      mapId: PLAYABLE_STORY_MAP_ID,
      rewardHandlerOwner: REWARD_RUNTIME_OWNER,
      rewardInstanceFactoryOwner: "catalog/createMapRewardInstance",
      questRewardDispatchOwner: null,
      abilityRuntimeOwner: null,
      source: ["ArcaneFrontier", "catalog"],
    } as never),
    dependencies: [],
  };
}

function previewRewardInstance(quest: QuestDefinition, reward: QuestReward, rewardIndex: number) {
  if (!reward.itemDefinitionId || !getItemDefinition(reward.itemDefinitionId)) return null;
  try {
    return createMapRewardInstance(reward.itemDefinitionId, quest.order * 100 + rewardIndex, PLAYABLE_STORY_MAP_ID, `quest-reward-preview:${quest.id}:${rewardIndex}`, "reward", reward.quantity ?? 1);
  } catch {
    return null;
  }
}

function assessReward(quest: QuestDefinition, reward: QuestReward, rewardIndex: number): QuestRewardRuntimeAssessment {
  const itemDefinitionAvailable = Boolean(reward.itemDefinitionId && getItemDefinition(reward.itemDefinitionId));
  const rewardInstanceFactoryAvailable = Boolean(previewRewardInstance(quest, reward, rewardIndex));
  const abilityReward = Boolean(reward.abilityId);
  const reason = !itemDefinitionAvailable
    ? "quest reward อ้าง item definition ที่ catalog runtime ไม่พบ"
    : !rewardInstanceFactoryAvailable
      ? "catalog reward-instance factory ไม่สามารถสร้าง instance ที่มี provenance reward ได้"
      : abilityReward
        ? "สร้าง reward item ได้ แต่ยังไม่มี quest reward dispatch หรือ ability runtime owner"
        : "สร้าง reward item ได้ แต่ยังไม่มี caller ที่ dispatch reward จาก completeStoryQuest เข้า ArcaneFrontier/rewardHandler";
  return {
    questId: quest.id,
    rewardIndex,
    itemDefinitionId: reward.itemDefinitionId,
    quantity: reward.quantity,
    abilityId: reward.abilityId,
    reputation: reward.reputation,
    itemDefinitionAvailable,
    rewardInstanceFactoryAvailable,
    rewardHandlerOwner: REWARD_RUNTIME_OWNER,
    supported: false,
    reason,
  };
}

function rewardNode(assessment: QuestRewardRuntimeAssessment, questNode: DependencyGraphNode, itemNode: DependencyGraphNode, contractNode: DependencyGraphNode, seed: string, rulesVersion: string): DependencyGraphNode {
  const dependencies: GeneratorDependency[] = [dependencyFor(questNode), dependencyFor(itemNode), dependencyFor(contractNode)];
  if (!assessment.itemDefinitionAvailable) {
    dependencies.push({ key: `reward-item-definition:${assessment.itemDefinitionId ?? "missing"}`, kind: "item", required: true, generatorId: "item.catalog", generatorVersion: "1.0.0" });
  }
  dependencies.push({ key: `quest-reward-dispatch:${assessment.questId}:${assessment.rewardIndex}`, kind: "simulation", required: true, generatorId: "quest.reward-runtime", generatorVersion: REWARD_RUNTIME_CONTRACT_VERSION });
  if (assessment.abilityId) dependencies.push({ key: `ability-runtime-owner:${assessment.abilityId}`, kind: "simulation", required: true, generatorId: "ability.runtime", generatorVersion: "1.0.0" });
  return {
    key: `quest-reward:${assessment.questId}:${assessment.rewardIndex}`,
    kind: "simulation",
    generatorId: "quest.reward-runtime",
    generatorVersion: QUEST_REWARD_RUNTIME_GRAPH_VERSION,
    schemaVersion: REWARD_RUNTIME_CONTRACT_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ assessment, writeInvoked: false } as never),
    dependencies,
  };
}

export function buildQuestRewardRuntimeDependencyGraph(input: QuestRewardRuntimeDependencyGraphInput): QuestRewardRuntimeDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? QUEST_REWARD_RUNTIME_GRAPH_RULES_VERSION;
  if (rulesVersion !== QUEST_REWARD_RUNTIME_GRAPH_RULES_VERSION) throw new Error(`Unsupported quest reward runtime graph rules version: ${rulesVersion}`);
  const sampleQuestCount = boundedSampleCount(input.sampleQuestCount);
  const completedQuestCount = boundedCompletedQuestCount(input.completedQuestCount);
  const progression = generateQuestProgression({ mapCount: 1, questsPerMap: QUESTS_PER_MAP, seedLabel: input.seed });
  const quests = progression.quests.slice(0, sampleQuestCount);
  const questNode = questProgressionNode(input.seed, rulesVersion, sampleQuestCount, completedQuestCount);
  const itemDefinitionIds = Array.from(new Set(quests.flatMap(quest => quest.rewards.map(reward => reward.itemDefinitionId).filter((value): value is string => Boolean(value))))).sort();
  const itemNode = itemDefinitionNode(input.seed, rulesVersion, itemDefinitionIds);
  const contractNode = rewardContractNode(input.seed, rulesVersion);
  const assessments = quests.flatMap(quest => quest.rewards.map((reward, rewardIndex) => assessReward(quest, reward, rewardIndex)));
  const rewardNodes = assessments.map(assessment => rewardNode(assessment, questNode, itemNode, contractNode, input.seed, rulesVersion));
  const boundaryNode: DependencyGraphNode = {
    key: `quest-reward-runtime-boundary:${PLAYABLE_STORY_MAP_ID}`,
    kind: "quest",
    generatorId: "quest.reward-runtime",
    generatorVersion: QUEST_REWARD_RUNTIME_GRAPH_VERSION,
    schemaVersion: QUEST_REWARD_RUNTIME_GRAPH_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, sampleQuestCount, completedQuestCount, assessmentIds: assessments.map(assessment => `${assessment.questId}:${assessment.rewardIndex}`) } as never),
    dependencies: [dependencyFor(questNode), dependencyFor(itemNode), dependencyFor(contractNode), ...rewardNodes.map(dependencyFor)],
  };
  const nodes = [questNode, itemNode, contractNode, ...rewardNodes, boundaryNode];
  const graph = validateGeneratorDependencyGraph(nodes);
  const missingItemDefinitionCount = assessments.filter(assessment => !assessment.itemDefinitionAvailable).length;
  const questRewardDispatchBridgeMissingCount = assessments.filter(assessment => !assessment.questRewardDispatchOwner).length;
  const abilityRewardCount = assessments.filter(assessment => Boolean(assessment.abilityId)).length;
  const abilityRuntimeOwnerMissingCount = assessments.filter(assessment => Boolean(assessment.abilityId) && !assessment.abilityRuntimeOwner).length;
  const unresolvedReferenceTypes = {
    "reward-item-definition": missingItemDefinitionCount,
    "quest-reward-dispatch": questRewardDispatchBridgeMissingCount,
    "ability-runtime-owner": abilityRuntimeOwnerMissingCount,
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
      rewardCount: assessments.length,
      itemDefinitionAvailableCount: assessments.filter(assessment => assessment.itemDefinitionAvailable).length,
      missingItemDefinitionCount,
      rewardInstanceFactoryAvailableCount: assessments.filter(assessment => assessment.rewardInstanceFactoryAvailable).length,
      questRewardDispatchBridgeMissingCount,
      abilityRewardCount,
      abilityRuntimeOwnerMissingCount,
      supportedRewardCount: assessments.filter(assessment => assessment.supported).length,
      unsupportedRewardCount: assessments.filter(assessment => !assessment.supported).length,
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

export function getDefaultQuestRewardRuntimeDependencyGraphInput(seed = "creator-quest-reward-runtime") {
  return { seed, sampleQuestCount: 8, completedQuestCount: 0, rulesVersion: QUEST_REWARD_RUNTIME_GRAPH_RULES_VERSION } satisfies QuestRewardRuntimeDependencyGraphInput;
}
