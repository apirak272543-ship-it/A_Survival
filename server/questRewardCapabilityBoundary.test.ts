import { describe, expect, it } from "vitest";
import { PLAYABLE_REWARD_MAP_ID, classifyQuestRewardCapabilities, type QuestRewardCapabilityReward } from "./generators/questRewardCapabilityBoundary";

const itemReward = (overrides: Partial<QuestRewardCapabilityReward> = {}): QuestRewardCapabilityReward => ({ itemDefinitionId: "material-001", quantity: 2, ...overrides });

describe("quest reward capability boundary", () => {
  it("accepts only item rewards for the playable map and leaves mutation/persistence to callers", () => {
    const result = classifyQuestRewardCapabilities({ mapId: PLAYABLE_REWARD_MAP_ID, rewards: [itemReward(), itemReward({ itemDefinitionId: "seed-plant-001", quantity: 1 })] });

    expect(result.accepted).toBe(true);
    expect(result.summary).toMatchObject({ rewardCount: 2, supportedItemCount: 2, blockedAbilityCount: 0, blockedReputationCount: 0, unsupportedCount: 0, issueCount: 0 });
    expect(result.rewards.every(reward => reward.reasonCode === "SUPPORTED_ITEM_REWARD")).toBe(true);
    expect(result.runtimeMutationAllowed).toBe(false);
    expect(result.persistenceAllowed).toBe(false);
    expect(result.previewOnly).toBe(true);
  });

  it("fails closed for ability and reputation rewards without fabricating owners", () => {
    const result = classifyQuestRewardCapabilities({
      mapId: PLAYABLE_REWARD_MAP_ID,
      rewards: [
        { abilityId: "dash" },
        { reputation: 5 },
        { itemDefinitionId: "material-001", abilityId: "dash" },
        {},
      ],
    });

    expect(result.accepted).toBe(false);
    expect(result.summary).toMatchObject({ rewardCount: 4, supportedItemCount: 0, blockedAbilityCount: 1, blockedReputationCount: 1, unsupportedCount: 2, issueCount: 4 });
    expect(result.rewards.map(reward => reward.reasonCode)).toEqual([
      "ABILITY_RUNTIME_OWNER_MISSING",
      "REPUTATION_RUNTIME_OWNER_MISSING",
      "AMBIGUOUS_REWARD_SHAPE",
      "UNSUPPORTED_REWARD_SHAPE",
    ]);
  });

  it("reports invalid numeric reward values deterministically", () => {
    const result = classifyQuestRewardCapabilities({
      mapId: PLAYABLE_REWARD_MAP_ID,
      rewards: [itemReward({ quantity: 0 }), { reputation: Number.NaN }, itemReward({ quantity: Number.POSITIVE_INFINITY })],
    });

    expect(result.accepted).toBe(false);
    expect(result.summary.unsupportedCount).toBe(3);
    expect(result.rewards.every(reward => reward.reasonCode === "INVALID_REWARD_VALUE")).toBe(true);
  });

  it("blocks future maps before inspecting reward capabilities", () => {
    const result = classifyQuestRewardCapabilities({ mapId: "map-002", rewards: [itemReward()] });

    expect(result.accepted).toBe(false);
    expect(result.rewards).toEqual([{ index: 0, capability: "unknown", status: "blocked", reasonCode: "FUTURE_MAP_NOT_ALLOWED", detail: "เฉพาะ obsidian-frontier ที่อนุญาตให้ตรวจ reward contract; map map-002 ยังเป็น planned" }]);
  });

  it("bounds the reward list and keeps identical inputs deterministic", () => {
    const rewards = Array.from({ length: 21 }, () => itemReward());
    const first = classifyQuestRewardCapabilities({ mapId: PLAYABLE_REWARD_MAP_ID, rewards });
    const second = classifyQuestRewardCapabilities({ mapId: PLAYABLE_REWARD_MAP_ID, rewards });

    expect(second).toEqual(first);
    expect(first.summary.rewardCount).toBe(21);
    expect(first.summary.supportedItemCount).toBe(20);
    expect(first.rewards.at(-1)).toEqual({ index: 20, capability: "unknown", status: "blocked", reasonCode: "REWARD_COUNT_BOUNDS_EXCEEDED", detail: "รับ reward ได้ไม่เกิน 20 รายการต่อหนึ่ง bounded preview" });
    expect(first.accepted).toBe(false);
  });
});
