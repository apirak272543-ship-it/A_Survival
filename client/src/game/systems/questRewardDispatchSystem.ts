import { createMapRewardInstance, getItemDefinition, type ItemInstance } from "@/game/data/catalog";
import { addItemToContainer, PLAYER_INVENTORY_SLOTS } from "@/game/systems/inventorySystem";
import { completeStoryQuest, STORY_PLAYABLE_MAP_ID, STORY_PLAYABLE_MAP_INDEX, type StoryProgressState } from "@/game/systems/storyProgressionSystem";

export type QuestRewardDispatchReward = {
  itemDefinitionId?: string;
  quantity?: number;
  abilityId?: string;
  reputation?: number;
};

export type QuestRewardDispatchQuest = {
  id: string;
  mapIndex: number;
  rewards: QuestRewardDispatchReward[];
};

export type QuestRewardDispatchInput = {
  mapId: string;
  state: StoryProgressState;
  inventory: ItemInstance[];
  discoveredItemIds: string[];
  quest: QuestRewardDispatchQuest;
  now: number;
  sequenceBase: number;
};

type QuestRewardDispatchFailureCode =
  | "future-map"
  | "quest-not-eligible"
  | "duplicate-reward"
  | "reward-definition-missing"
  | "inventory-capacity"
  | "ability-runtime-missing"
  | "invalid-reward-quantity"
  | "unsupported-reward";

export type QuestRewardDispatchResult =
  | {
      accepted: true;
      state: StoryProgressState;
      inventory: ItemInstance[];
      discoveredItemIds: string[];
      appliedRewards: ItemInstance[];
      rewardEventIds: string[];
      message: string;
    }
  | {
      accepted: false;
      state: StoryProgressState;
      inventory: ItemInstance[];
      discoveredItemIds: string[];
      reason: string;
      code: QuestRewardDispatchFailureCode;
    };

function failure(input: QuestRewardDispatchInput, code: QuestRewardDispatchFailureCode, reason: string): QuestRewardDispatchResult {
  return {
    accepted: false,
    state: input.state,
    inventory: input.inventory,
    discoveredItemIds: input.discoveredItemIds,
    reason,
    code,
  };
}

function eventIdFor(questId: string, rewardIndex: number) {
  return `quest-reward:${questId}:${rewardIndex + 1}`;
}

function normalizedSequenceBase(sequenceBase: number) {
  return Number.isFinite(sequenceBase) ? Math.max(0, Math.floor(sequenceBase)) : 0;
}

/**
 * Pure quest completion + item reward transition.
 *
 * The caller owns persistence and event emission. This function only returns a
 * cloned next state after every reward can be accepted atomically. Ability and
 * reputation rewards intentionally fail closed because no canonical runtime
 * owner exists yet. No future map is ever made playable by this transition.
 */
export function dispatchQuestReward(input: QuestRewardDispatchInput): QuestRewardDispatchResult {
  if (input.mapId !== STORY_PLAYABLE_MAP_ID || input.quest.mapIndex !== STORY_PLAYABLE_MAP_INDEX) {
    return failure(input, "future-map", "เควสหรือแผนที่นี้ยังเป็น planned และยังไม่อนุญาตให้ dispatch reward");
  }

  const completion = completeStoryQuest({ state: input.state, questId: input.quest.id, now: input.now });
  if (!completion.accepted) return failure(input, "quest-not-eligible", completion.reason);

  const rewards = input.quest.rewards;
  if (rewards.length === 0) return failure(input, "unsupported-reward", "เควสนี้ไม่มี reward contract ที่ตรวจสอบได้");

  const sequenceBase = normalizedSequenceBase(input.sequenceBase);
  let nextInventory = input.inventory.map(instance => ({ ...instance, provenance: { ...instance.provenance } }));
  const appliedRewards: ItemInstance[] = [];
  const rewardEventIds: string[] = [];

  for (let rewardIndex = 0; rewardIndex < rewards.length; rewardIndex += 1) {
    const reward = rewards[rewardIndex]!;
    const eventId = eventIdFor(input.quest.id, rewardIndex);
    if (input.inventory.some(instance => instance.provenance.eventId === eventId)) {
      return failure(input, "duplicate-reward", `reward ของ ${input.quest.id} ถูก dispatch ไปแล้ว`);
    }
    if (reward.abilityId) {
      return failure(input, "ability-runtime-missing", `ยังไม่มี ability runtime owner สำหรับ ${reward.abilityId}`);
    }
    if (reward.reputation !== undefined) {
      return failure(input, "unsupported-reward", "ยังไม่มี reputation runtime owner สำหรับ quest reward");
    }
    if (!reward.itemDefinitionId) {
      return failure(input, "unsupported-reward", "reward นี้ไม่มี item definition หรือ runtime owner ที่ตรวจสอบได้");
    }
    const definition = getItemDefinition(reward.itemDefinitionId);
    if (!definition) {
      return failure(input, "reward-definition-missing", `ไม่พบ item definition ของ ${reward.itemDefinitionId}`);
    }
    const quantity = reward.quantity ?? 1;
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1 || quantity > definition.stackLimit) {
      return failure(input, "invalid-reward-quantity", `จำนวน reward ของ ${reward.itemDefinitionId} ไม่อยู่ในขอบเขต stack ${definition.stackLimit}`);
    }

    const incoming = createMapRewardInstance(
      reward.itemDefinitionId,
      sequenceBase + rewardIndex,
      input.mapId,
      eventId,
      "reward",
      quantity,
    );
    const added = addItemToContainer(nextInventory, incoming, PLAYER_INVENTORY_SLOTS);
    if (!added.accepted || added.remainder) {
      return failure(input, "inventory-capacity", `กระเป๋าไม่พอรับ reward ของ ${input.quest.id}: ${added.message}`);
    }
    nextInventory = added.inventory;
    appliedRewards.push(incoming);
    rewardEventIds.push(eventId);
  }

  return {
    accepted: true,
    state: completion.state,
    inventory: nextInventory,
    discoveredItemIds: Array.from(new Set([...input.discoveredItemIds, ...appliedRewards.map(reward => reward.definitionId)])),
    appliedRewards,
    rewardEventIds,
    message: `${completion.message} · รับ reward แล้ว ${appliedRewards.length} รายการ`,
  };
}
