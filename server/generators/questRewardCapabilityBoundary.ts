import { hashStableJson } from "./commonGeneratorApi";

export const QUEST_REWARD_CAPABILITY_BOUNDARY_VERSION = "0.1.0" as const;
export const PLAYABLE_REWARD_MAP_ID = "obsidian-frontier" as const;
const MAX_REWARDS = 20;

type QuestRewardCapability = "item" | "ability" | "reputation" | "unknown";
export type QuestRewardCapabilityReasonCode =
  | "SUPPORTED_ITEM_REWARD"
  | "ABILITY_RUNTIME_OWNER_MISSING"
  | "REPUTATION_RUNTIME_OWNER_MISSING"
  | "UNSUPPORTED_REWARD_SHAPE"
  | "AMBIGUOUS_REWARD_SHAPE"
  | "INVALID_REWARD_VALUE"
  | "FUTURE_MAP_NOT_ALLOWED"
  | "REWARD_COUNT_BOUNDS_EXCEEDED";

export type QuestRewardCapabilityReward = {
  itemDefinitionId?: string;
  quantity?: number;
  abilityId?: string;
  reputation?: number;
};

export type QuestRewardCapabilityResult = {
  index: number;
  capability: QuestRewardCapability;
  status: "supported" | "blocked";
  reasonCode: QuestRewardCapabilityReasonCode;
  detail: string;
};

export type QuestRewardCapabilityBoundaryOutput = {
  previewOnly: true;
  validatorVersion: typeof QUEST_REWARD_CAPABILITY_BOUNDARY_VERSION;
  mapId: string;
  runtimeMutationAllowed: false;
  persistenceAllowed: false;
  accepted: boolean;
  contractHash: string;
  summary: {
    rewardCount: number;
    supportedItemCount: number;
    blockedAbilityCount: number;
    blockedReputationCount: number;
    unsupportedCount: number;
    issueCount: number;
  };
  rewards: QuestRewardCapabilityResult[];
};

function classifyReward(reward: QuestRewardCapabilityReward, index: number): QuestRewardCapabilityResult {
  const hasItem = Boolean(reward.itemDefinitionId?.trim());
  const hasAbility = Boolean(reward.abilityId?.trim());
  const hasReputation = reward.reputation !== undefined;
  const capabilityCount = Number(hasItem) + Number(hasAbility) + Number(hasReputation);

  if (capabilityCount > 1) {
    return { index, capability: "unknown", status: "blocked", reasonCode: "AMBIGUOUS_REWARD_SHAPE", detail: "reward must declare exactly one capability" };
  }
  if (hasAbility) {
    return { index, capability: "ability", status: "blocked", reasonCode: "ABILITY_RUNTIME_OWNER_MISSING", detail: `ยังไม่มี ability runtime owner สำหรับ ${reward.abilityId}` };
  }
  if (hasReputation) {
    if (!Number.isFinite(reward.reputation)) return { index, capability: "reputation", status: "blocked", reasonCode: "INVALID_REWARD_VALUE", detail: "reputation reward ต้องเป็นตัวเลข finite" };
    return { index, capability: "reputation", status: "blocked", reasonCode: "REPUTATION_RUNTIME_OWNER_MISSING", detail: "ยังไม่มี reputation runtime owner สำหรับ quest reward" };
  }
  if (hasItem) {
    if (reward.quantity !== undefined && (!Number.isFinite(reward.quantity) || reward.quantity <= 0)) return { index, capability: "item", status: "blocked", reasonCode: "INVALID_REWARD_VALUE", detail: "item reward quantity ต้องเป็นตัวเลข finite ที่มากกว่า 0" };
    return { index, capability: "item", status: "supported", reasonCode: "SUPPORTED_ITEM_REWARD", detail: `item reward ${reward.itemDefinitionId} ส่งต่อให้ canonical item/inventory owner ตรวจต่อ` };
  }
  return { index, capability: "unknown", status: "blocked", reasonCode: "UNSUPPORTED_REWARD_SHAPE", detail: "reward ไม่มี item definition, ability หรือ reputation owner ที่ตรวจสอบได้" };
}

export function classifyQuestRewardCapabilities(input: { mapId: string; rewards: readonly QuestRewardCapabilityReward[] }): QuestRewardCapabilityBoundaryOutput {
  const mapBlocked = input.mapId !== PLAYABLE_REWARD_MAP_ID;
  const countBlocked = input.rewards.length > MAX_REWARDS;
  const rewards = input.rewards.slice(0, MAX_REWARDS).map((reward, index) => {
    if (mapBlocked) return { index, capability: "unknown" as const, status: "blocked" as const, reasonCode: "FUTURE_MAP_NOT_ALLOWED" as const, detail: `เฉพาะ ${PLAYABLE_REWARD_MAP_ID} ที่อนุญาตให้ตรวจ reward contract; map ${input.mapId} ยังเป็น planned` };
    return classifyReward(reward, index);
  });
  if (countBlocked) rewards.push({ index: MAX_REWARDS, capability: "unknown", status: "blocked", reasonCode: "REWARD_COUNT_BOUNDS_EXCEEDED", detail: `รับ reward ได้ไม่เกิน ${MAX_REWARDS} รายการต่อหนึ่ง bounded preview` });

  const supportedItemCount = rewards.filter(reward => reward.capability === "item" && reward.status === "supported").length;
  const blockedAbilityCount = rewards.filter(reward => reward.reasonCode === "ABILITY_RUNTIME_OWNER_MISSING").length;
  const blockedReputationCount = rewards.filter(reward => reward.reasonCode === "REPUTATION_RUNTIME_OWNER_MISSING").length;
  const unsupportedCount = rewards.filter(reward => reward.capability === "unknown" || reward.reasonCode === "INVALID_REWARD_VALUE").length;
  const issueCount = rewards.filter(reward => reward.status === "blocked").length;
  const contractHash = hashStableJson({ mapId: input.mapId, rewards: input.rewards } as never);

  return {
    previewOnly: true,
    validatorVersion: QUEST_REWARD_CAPABILITY_BOUNDARY_VERSION,
    mapId: input.mapId,
    runtimeMutationAllowed: false,
    persistenceAllowed: false,
    accepted: !mapBlocked && !countBlocked && rewards.length > 0 && rewards.every(reward => reward.status === "supported"),
    contractHash,
    summary: { rewardCount: input.rewards.length, supportedItemCount, blockedAbilityCount, blockedReputationCount, unsupportedCount, issueCount },
    rewards,
  };
}
