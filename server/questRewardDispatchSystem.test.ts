import { describe, expect, it } from "vitest";
import { createMapRewardInstance, createStarterInstance, getItemDefinition } from "../client/src/game/data/catalog";
import { createDefaultStoryProgressState, normalizeStoryProgressState } from "../client/src/game/systems/storyProgressionSystem";
import { dispatchQuestReward, type QuestRewardDispatchInput } from "../client/src/game/systems/questRewardDispatchSystem";
import { generateQuestProgression } from "./generators/questProgressionGenerator";

function questFixture(mapCount = 1) {
  return generateQuestProgression({ mapCount, seedLabel: "dispatch-test" }).quests;
}

function inputFor(overrides: Partial<QuestRewardDispatchInput> = {}): QuestRewardDispatchInput {
  const quest = questFixture()[0]!;
  return {
    mapId: "obsidian-frontier",
    state: createDefaultStoryProgressState(),
    inventory: [],
    discoveredItemIds: [],
    quest,
    now: 1234,
    sequenceBase: 50,
    ...overrides,
  };
}

describe("quest reward dispatch system", () => {
  it("applies an item reward and story completion atomically", () => {
    const result = dispatchQuestReward(inputFor({ quest: { ...questFixture()[0]!, rewards: [{ itemDefinitionId: "material-001", quantity: 3 }] } }));

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.state.completedQuestIds).toEqual(["story-map-001-quest-01"]);
    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0]).toMatchObject({ definitionId: "material-001", quantity: 3, provenance: { mapId: "obsidian-frontier", type: "reward", eventId: "quest-reward:story-map-001-quest-01:1" } });
    expect(result.appliedRewards[0]).toMatchObject({ definitionId: "material-001", quantity: 3, provenance: { type: "reward" } });
    expect(result.discoveredItemIds).toEqual(["material-001"]);
  });

  it("fails closed when the generated quest includes a reward type without an owner", () => {
    const result = dispatchQuestReward(inputFor());

    expect(result).toMatchObject({ accepted: false, code: "unsupported-reward" });
    expect(result.reason).toContain("reputation");
  });

  it("rejects malformed or over-capacity quantities before creating a reward instance", () => {
    const stackLimit = getItemDefinition("material-001")!.stackLimit;
    for (const quantity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, stackLimit + 1]) {
      const input = inputFor({ quest: { ...questFixture()[0]!, rewards: [{ itemDefinitionId: "material-001", quantity }] } });
      const result = dispatchQuestReward(input);
      expect(result).toMatchObject({ accepted: false, code: "invalid-reward-quantity" });
      expect(result.state).toBe(input.state);
      expect(result.inventory).toBe(input.inventory);
      expect(result.discoveredItemIds).toBe(input.discoveredItemIds);
    }
  });

  it("fails atomically when inventory capacity rejects the reward", () => {
    const originalInventory = Array.from({ length: 40 }, (_, index) => createStarterInstance("sword-001", index + 1));
    const input = inputFor({ inventory: originalInventory, quest: { ...questFixture()[0]!, rewards: [{ itemDefinitionId: "material-001", quantity: 3 }] } });
    const result = dispatchQuestReward(input);

    expect(result).toMatchObject({ accepted: false, code: "inventory-capacity" });
    expect(result.state).toBe(input.state);
    expect(result.inventory).toBe(input.inventory);
    expect(result.discoveredItemIds).toBe(input.discoveredItemIds);
  });

  it("does not mutate earlier item additions if a later reward is blocked", () => {
    const input = inputFor({
      quest: {
        ...questFixture()[0]!,
        rewards: [
          { itemDefinitionId: "material-001", quantity: 1 },
          { itemDefinitionId: "missing-definition", quantity: 1 },
        ],
      },
    });
    const result = dispatchQuestReward(input);

    expect(result).toMatchObject({ accepted: false, code: "reward-definition-missing" });
    expect(result.inventory).toBe(input.inventory);
    expect(result.state).toBe(input.state);
  });

  it("rejects future-map dispatch before story or inventory work", () => {
    const futureQuest = questFixture(2).find(quest => quest.mapIndex === 2)!;
    const input = inputFor({ mapId: "story-map-002", quest: futureQuest });
    const result = dispatchQuestReward(input);

    expect(result).toMatchObject({ accepted: false, code: "future-map" });
    expect(result.state).toBe(input.state);
    expect(result.inventory).toBe(input.inventory);
  });

  it("rejects the final quest ability until an ability runtime owner exists", () => {
    const quests = questFixture()[0] ? questFixture() : [];
    const finalQuest = quests[19]!;
    const state = normalizeStoryProgressState({ completedQuestIds: quests.slice(0, 19).map(quest => quest.id) });
    const input = inputFor({ state, quest: finalQuest });
    const result = dispatchQuestReward(input);

    expect(result).toMatchObject({ accepted: false, code: "ability-runtime-missing" });
    expect(result.reason).toContain("ability.story.001");
    expect(result.state).toBe(input.state);
    expect(result.inventory).toBe(input.inventory);
  });

  it("rejects duplicate reward provenance before writing a second item", () => {
    const existingReward = createMapRewardInstance("material-001", 50, "obsidian-frontier", "quest-reward:story-map-001-quest-01:1", "reward", 3);
    const input = inputFor({ inventory: [existingReward] });
    const result = dispatchQuestReward(input);

    expect(result).toMatchObject({ accepted: false, code: "duplicate-reward" });
    expect(result.inventory).toBe(input.inventory);
  });

  it("is deterministic for the same input and sequence base", () => {
    const input = inputFor();
    const first = dispatchQuestReward(input);
    const second = dispatchQuestReward(input);

    expect(second).toEqual(first);
  });
});
