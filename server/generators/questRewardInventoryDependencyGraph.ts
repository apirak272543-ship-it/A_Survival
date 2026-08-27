import {
  createMapRewardInstance,
  createStarterInstance,
  getItemDefinition,
} from "../../client/src/game/data/catalog";
import {
  addItemToContainer,
  PLAYER_INVENTORY_SLOTS,
} from "../../client/src/game/systems/inventorySystem";
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

export const QUEST_REWARD_INVENTORY_GRAPH_RULES_VERSION = "quest-reward-inventory-graph-rules.v1" as const;
export const QUEST_REWARD_INVENTORY_GRAPH_VERSION = "1.0.0" as const;
export const QUEST_REWARD_INVENTORY_GRAPH_SCHEMA_VERSION = "a-survival.quest-reward-inventory-graph.v1" as const;
export const INVENTORY_RUNTIME_CONTRACT_VERSION = "1.0.0" as const;
export const INVENTORY_RUNTIME_CONTRACT_SCHEMA_VERSION = "a-survival.inventory-runtime-contract.v1" as const;
export const MAX_QUEST_REWARD_INVENTORY_SAMPLE = QUESTS_PER_MAP;

export type QuestRewardInventoryDependencyGraphInput = {
  seed: string;
  sampleQuestCount?: number;
  completedQuestCount?: number;
  inventoryUsedSlots?: number;
  rulesVersion?: string;
};

export type QuestRewardInventoryAssessment = {
  questId: string;
  rewardIndex: number;
  itemDefinitionId?: string;
  quantity?: number;
  abilityId?: string;
  reputation?: number;
  itemDefinitionAvailable: boolean;
  rewardInstanceFactoryAvailable: boolean;
  inventoryDryRunAccepted: boolean;
  inventoryMessage: string;
  rewardHandlerOwner: "ArcaneFrontier/rewardHandler";
  questRewardDispatchOwner?: string;
  abilityRuntimeOwner?: string;
  supported: boolean;
  reason: string;
};

export type QuestRewardInventoryDependencyGraphOutput = {
  artifact: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    seed: string;
    sampleQuestCount: number;
    completedQuestCount: number;
    inventoryUsedSlots: number;
    inventoryCapacity: number;
    contentHash: string;
  };
  assessments: QuestRewardInventoryAssessment[];
  summary: {
    mapId: typeof PLAYABLE_STORY_MAP_ID;
    sampleQuestCount: number;
    completedQuestCount: number;
    inventoryUsedSlots: number;
    inventoryCapacity: number;
    rewardCount: number;
    itemDefinitionAvailableCount: number;
    missingItemDefinitionCount: number;
    rewardInstanceFactoryAvailableCount: number;
    inventoryDryRunAcceptedCount: number;
    inventoryCapacityBlockedCount: number;
    questRewardDispatchBridgeMissingCount: number;
    abilityRewardCount: number;
    abilityRuntimeOwnerMissingCount: number;
    supportedRewardCount: number;
    unsupportedRewardCount: number;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: {
      "reward-item-definition": number;
      "reward-instance-factory": number;
      "inventory-capacity": number;
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

const REWARD_HANDLER_OWNER = "ArcaneFrontier/rewardHandler" as const;

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number, label: string) {
  const normalized = Math.trunc(value ?? fallback);
  if (normalized < minimum || normalized > maximum) throw new Error(`${label} must be between ${minimum} and ${maximum}`);
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

function inventoryRuntimeNode(seed: string, rulesVersion: string, inventoryUsedSlots: number): DependencyGraphNode {
  return {
    key: `inventory.runtime:${PLAYABLE_STORY_MAP_ID}`,
    kind: "simulation",
    generatorId: "inventory.runtime",
    generatorVersion: INVENTORY_RUNTIME_CONTRACT_VERSION,
    schemaVersion: INVENTORY_RUNTIME_CONTRACT_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, inventoryUsedSlots, inventoryCapacity: PLAYER_INVENTORY_SLOTS, addOwner: "inventorySystem/addItemToContainer", writeInvoked: false } as never),
    dependencies: [],
  };
}

function rewardContractNode(seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `reward-runtime-contract:${PLAYABLE_STORY_MAP_ID}`,
    kind: "simulation",
    generatorId: "quest.reward-runtime",
    generatorVersion: INVENTORY_RUNTIME_CONTRACT_VERSION,
    schemaVersion: "a-survival.reward-runtime-contract.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, rewardHandlerOwner: REWARD_HANDLER_OWNER, rewardInstanceFactoryOwner: "catalog/createMapRewardInstance", questRewardDispatchOwner: null, abilityRuntimeOwner: null } as never),
    dependencies: [],
  };
}

function buildDryRunInventory(inventoryUsedSlots: number) {
  return Array.from({ length: inventoryUsedSlots }, (_, index) => createStarterInstance("sword-001", 9000 + index));
}

function previewReward(quest: QuestDefinition, reward: QuestReward, rewardIndex: number) {
  if (!reward.itemDefinitionId || !getItemDefinition(reward.itemDefinitionId)) return null;
  try {
    return createMapRewardInstance(reward.itemDefinitionId, quest.order * 100 + rewardIndex, PLAYABLE_STORY_MAP_ID, `quest-reward-inventory-preview:${quest.id}:${rewardIndex}`, "reward", reward.quantity ?? 1);
  } catch {
    return null;
  }
}

function assessReward(quest: QuestDefinition, reward: QuestReward, rewardIndex: number, inventory: ReturnType<typeof buildDryRunInventory>): QuestRewardInventoryAssessment {
  const itemDefinitionAvailable = Boolean(reward.itemDefinitionId && getItemDefinition(reward.itemDefinitionId));
  const rewardInstance = previewReward(quest, reward, rewardIndex);
  const rewardInstanceFactoryAvailable = Boolean(rewardInstance);
  const inventoryTransfer = rewardInstance ? addItemToContainer(inventory, rewardInstance, PLAYER_INVENTORY_SLOTS) : null;
  const inventoryDryRunAccepted = Boolean(inventoryTransfer?.accepted && !inventoryTransfer.remainder);
  const inventoryMessage = inventoryTransfer?.message ?? "ยังสร้าง reward instance ไม่ได้ จึงยังตรวจ inventory transfer ไม่ได้";
  const reason = !itemDefinitionAvailable
    ? "quest reward อ้าง item definition ที่ catalog runtime ไม่พบ"
    : !rewardInstanceFactoryAvailable
      ? "catalog reward-instance factory ไม่สามารถสร้าง instance ที่มี provenance reward ได้"
      : !inventoryDryRunAccepted
        ? "inventory runtime รับ reward นี้แบบ atomic ไม่ได้จากจำนวนช่องที่จำลอง"
        : "inventory รับ reward แบบ dry-run ได้ แต่ยังไม่มี caller ที่ dispatch reward จาก completeStoryQuest เข้า ArcaneFrontier/rewardHandler";
  return {
    questId: quest.id,
    rewardIndex,
    itemDefinitionId: reward.itemDefinitionId,
    quantity: reward.quantity,
    abilityId: reward.abilityId,
    reputation: reward.reputation,
    itemDefinitionAvailable,
    rewardInstanceFactoryAvailable,
    inventoryDryRunAccepted,
    inventoryMessage,
    rewardHandlerOwner: REWARD_HANDLER_OWNER,
    supported: false,
    reason,
  };
}

function rewardNode(assessment: QuestRewardInventoryAssessment, questNode: DependencyGraphNode, itemNode: DependencyGraphNode, inventoryNode: DependencyGraphNode, contractNode: DependencyGraphNode, seed: string, rulesVersion: string): DependencyGraphNode {
  const dependencies: GeneratorDependency[] = [dependencyFor(questNode), dependencyFor(itemNode), dependencyFor(inventoryNode), dependencyFor(contractNode)];
  if (!assessment.itemDefinitionAvailable) dependencies.push({ key: `reward-item-definition:${assessment.itemDefinitionId ?? "missing"}`, kind: "item", required: true, generatorId: "item.catalog", generatorVersion: "1.0.0" });
  if (!assessment.rewardInstanceFactoryAvailable) dependencies.push({ key: `reward-instance-factory:${assessment.questId}:${assessment.rewardIndex}`, kind: "simulation", required: true, generatorId: "quest.reward-runtime", generatorVersion: INVENTORY_RUNTIME_CONTRACT_VERSION });
  if (!assessment.inventoryDryRunAccepted) dependencies.push({ key: `inventory-capacity:${assessment.questId}:${assessment.rewardIndex}`, kind: "simulation", required: true, generatorId: "inventory.runtime", generatorVersion: INVENTORY_RUNTIME_CONTRACT_VERSION });
  dependencies.push({ key: `quest-reward-dispatch:${assessment.questId}:${assessment.rewardIndex}`, kind: "simulation", required: true, generatorId: "quest.reward-runtime", generatorVersion: INVENTORY_RUNTIME_CONTRACT_VERSION });
  if (assessment.abilityId) dependencies.push({ key: `ability-runtime-owner:${assessment.abilityId}`, kind: "simulation", required: true, generatorId: "ability.runtime", generatorVersion: "1.0.0" });
  return {
    key: `quest-reward-inventory:${assessment.questId}:${assessment.rewardIndex}`,
    kind: "simulation",
    generatorId: "quest.reward-inventory",
    generatorVersion: QUEST_REWARD_INVENTORY_GRAPH_VERSION,
    schemaVersion: QUEST_REWARD_INVENTORY_GRAPH_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ assessment, writeInvoked: false } as never),
    dependencies,
  };
}

export function buildQuestRewardInventoryDependencyGraph(input: QuestRewardInventoryDependencyGraphInput): QuestRewardInventoryDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? QUEST_REWARD_INVENTORY_GRAPH_RULES_VERSION;
  if (rulesVersion !== QUEST_REWARD_INVENTORY_GRAPH_RULES_VERSION) throw new Error(`Unsupported quest reward inventory graph rules version: ${rulesVersion}`);
  const sampleQuestCount = boundedInteger(input.sampleQuestCount, 8, 1, MAX_QUEST_REWARD_INVENTORY_SAMPLE, "sampleQuestCount");
  const completedQuestCount = boundedInteger(input.completedQuestCount, 0, 0, QUESTS_PER_MAP, "completedQuestCount");
  const inventoryUsedSlots = boundedInteger(input.inventoryUsedSlots, 0, 0, PLAYER_INVENTORY_SLOTS, "inventoryUsedSlots");
  const progression = generateQuestProgression({ mapCount: 1, questsPerMap: QUESTS_PER_MAP, seedLabel: input.seed });
  const quests = progression.quests.slice(0, sampleQuestCount);
  const questNode = questProgressionNode(input.seed, rulesVersion, sampleQuestCount, completedQuestCount);
  const itemDefinitionIds = Array.from(new Set(quests.flatMap(quest => quest.rewards.map(reward => reward.itemDefinitionId).filter((value): value is string => Boolean(value))))).sort();
  const itemNode = itemDefinitionNode(input.seed, rulesVersion, itemDefinitionIds);
  const inventoryNode = inventoryRuntimeNode(input.seed, rulesVersion, inventoryUsedSlots);
  const contractNode = rewardContractNode(input.seed, rulesVersion);
  const dryRunInventory = buildDryRunInventory(inventoryUsedSlots);
  const assessments = quests.flatMap(quest => quest.rewards.map((reward, rewardIndex) => assessReward(quest, reward, rewardIndex, dryRunInventory)));
  const rewardNodes = assessments.map(assessment => rewardNode(assessment, questNode, itemNode, inventoryNode, contractNode, input.seed, rulesVersion));
  const boundaryNode: DependencyGraphNode = {
    key: `quest-reward-inventory-boundary:${PLAYABLE_STORY_MAP_ID}`,
    kind: "quest",
    generatorId: "quest.reward-inventory",
    generatorVersion: QUEST_REWARD_INVENTORY_GRAPH_VERSION,
    schemaVersion: QUEST_REWARD_INVENTORY_GRAPH_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, sampleQuestCount, completedQuestCount, inventoryUsedSlots, assessmentIds: assessments.map(assessment => `${assessment.questId}:${assessment.rewardIndex}`) } as never),
    dependencies: [dependencyFor(questNode), dependencyFor(itemNode), dependencyFor(inventoryNode), dependencyFor(contractNode), ...rewardNodes.map(dependencyFor)],
  };
  const nodes = [questNode, itemNode, inventoryNode, contractNode, ...rewardNodes, boundaryNode];
  const graph = validateGeneratorDependencyGraph(nodes);
  const missingItemDefinitionCount = assessments.filter(assessment => !assessment.itemDefinitionAvailable).length;
  const rewardInstanceFactoryMissingCount = assessments.filter(assessment => !assessment.rewardInstanceFactoryAvailable).length;
  const inventoryCapacityBlockedCount = assessments.filter(assessment => !assessment.inventoryDryRunAccepted).length;
  const questRewardDispatchBridgeMissingCount = assessments.filter(assessment => !assessment.questRewardDispatchOwner).length;
  const abilityRewardCount = assessments.filter(assessment => Boolean(assessment.abilityId)).length;
  const abilityRuntimeOwnerMissingCount = assessments.filter(assessment => Boolean(assessment.abilityId) && !assessment.abilityRuntimeOwner).length;
  const unresolvedReferenceTypes = {
    "reward-item-definition": missingItemDefinitionCount,
    "reward-instance-factory": rewardInstanceFactoryMissingCount,
    "inventory-capacity": inventoryCapacityBlockedCount,
    "quest-reward-dispatch": questRewardDispatchBridgeMissingCount,
    "ability-runtime-owner": abilityRuntimeOwnerMissingCount,
  };
  return {
    artifact: {
      mapId: PLAYABLE_STORY_MAP_ID,
      seed: input.seed,
      sampleQuestCount,
      completedQuestCount,
      inventoryUsedSlots,
      inventoryCapacity: PLAYER_INVENTORY_SLOTS,
      contentHash: hashStableJson({ mapId: PLAYABLE_STORY_MAP_ID, seed: input.seed, sampleQuestCount, completedQuestCount, inventoryUsedSlots, assessments } as never),
    },
    assessments,
    summary: {
      mapId: PLAYABLE_STORY_MAP_ID,
      sampleQuestCount,
      completedQuestCount,
      inventoryUsedSlots,
      inventoryCapacity: PLAYER_INVENTORY_SLOTS,
      rewardCount: assessments.length,
      itemDefinitionAvailableCount: assessments.filter(assessment => assessment.itemDefinitionAvailable).length,
      missingItemDefinitionCount,
      rewardInstanceFactoryAvailableCount: assessments.filter(assessment => assessment.rewardInstanceFactoryAvailable).length,
      inventoryDryRunAcceptedCount: assessments.filter(assessment => assessment.inventoryDryRunAccepted).length,
      inventoryCapacityBlockedCount,
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

export function getDefaultQuestRewardInventoryDependencyGraphInput(seed = "creator-quest-reward-inventory") {
  return { seed, sampleQuestCount: 8, completedQuestCount: 0, inventoryUsedSlots: 0, rulesVersion: QUEST_REWARD_INVENTORY_GRAPH_RULES_VERSION } satisfies QuestRewardInventoryDependencyGraphInput;
}
