import { describe, expect, it } from "vitest";
import { isSafeBlockBreakPayload, isSafeBlockPlacePayload, isSafeHarvestWorldCropPayload, isSafePlantWorldSeedPayload, isSafeQuestRewardDispatchPayload, isSafeUseItemPayload } from "./syncActionValidation";

describe("use-item sync boundary", () => {
  it("accepts a bounded slot and well-formed item identifiers", () => {
    expect(isSafeUseItemPayload({ slot: 0, instanceId: "inst-seed-001-2", definitionId: "seed-001" })).toBe(true);
    expect(isSafeUseItemPayload({ slot: 5, instanceId: "profile-12-starter-1", definitionId: "structure-001" })).toBe(true);
  });

  it("rejects out-of-range slots and malformed identifiers", () => {
    expect(isSafeUseItemPayload({ slot: -1, instanceId: "inst-seed-001-2", definitionId: "seed-001" })).toBe(false);
    expect(isSafeUseItemPayload({ slot: 6, instanceId: "inst-seed-001-2", definitionId: "seed-001" })).toBe(false);
    expect(isSafeUseItemPayload({ slot: 0, instanceId: "inst seed", definitionId: "seed-001" })).toBe(false);
    expect(isSafeUseItemPayload({ slot: 0, instanceId: "inst-seed-001-2", definitionId: "unknown-001" })).toBe(false);
  });
});

describe("block action sync boundary", () => {
  it("accepts bounded Obsidian block actions only", () => {
    expect(isSafeBlockPlacePayload({ mapId: "obsidian-frontier", moduleId: "player.placed", itemInstanceId: "inst-structure-001-1", itemDefinitionId: "structure-001", coordinate: { x: 0, y: 1, z: 0 } })).toBe(true);
    expect(isSafeBlockBreakPayload({ mapId: "obsidian-frontier", moduleId: "obstacle.obsidian.slab", coordinate: { x: 0, y: 0, z: 2 } })).toBe(true);
  });

  it("rejects future maps, invalid modules, and out-of-range coordinates", () => {
    expect(isSafeBlockPlacePayload({ mapId: "map-002-ashen-obsidian-plains", moduleId: "player.placed", itemInstanceId: "inst-structure-001-1", itemDefinitionId: "structure-001", coordinate: { x: 0, y: 1, z: 0 } })).toBe(false);
    expect(isSafeBlockBreakPayload({ mapId: "obsidian-frontier", moduleId: "unknown", coordinate: { x: 0, y: 0, z: 2 } })).toBe(false);
    expect(isSafeBlockBreakPayload({ mapId: "obsidian-frontier", moduleId: "obstacle.obsidian.slab", coordinate: { x: 501, y: 0, z: 2 } })).toBe(false);
  });
});

describe("world farming sync boundary", () => {
  it("accepts bounded Obsidian planting and harvest actions", () => {
    expect(isSafePlantWorldSeedPayload({ mapId: "obsidian-frontier", plotId: "farm-plot-01", plantId: "world-plant-001", seedDefinitionId: "seed-001", seedInstanceId: "inst-seed-001-2", coordinate: { x: 3, y: 0, z: 1 }, plantedAt: 1000 })).toBe(true);
    expect(isSafeHarvestWorldCropPayload({ mapId: "obsidian-frontier", plotId: "farm-plot-01", rewardInstanceId: "inst-obsidian-frontier-world-harvest-farm-plot-01-1000-1", coordinate: { x: 3, y: 0, z: 1 }, harvestedAt: 1001 })).toBe(true);
  });

  it("rejects unknown plots and future-map farming actions", () => {
    expect(isSafePlantWorldSeedPayload({ mapId: "obsidian-frontier", plotId: "farm-plot-05", plantId: "world-plant-001", seedDefinitionId: "seed-001", seedInstanceId: "inst-seed-001-2", coordinate: { x: 3, y: 0, z: 1 }, plantedAt: 1000 })).toBe(false);
    expect(isSafeHarvestWorldCropPayload({ mapId: "map-002-ashen-obsidian-plains", plotId: "farm-plot-01", rewardInstanceId: "reward-1", coordinate: { x: 3, y: 0, z: 1 }, harvestedAt: 1001 })).toBe(false);
    expect(isSafePlantWorldSeedPayload({ mapId: "obsidian-frontier", plotId: "farm-plot-01", plantId: "world-plant-001", seedDefinitionId: "seed-001", seedInstanceId: "inst-seed-001-2", coordinate: { x: 3, y: 0, z: 1 }, plantedAt: "not-a-time" })).toBe(false);
  });
});

describe("world storage sync boundary", () => {
  it("accepts bounded Obsidian chest deposit and withdrawal payloads", async () => {
    const { isSafeStorageDepositPayload, isSafeStorageWithdrawPayload } = await import("./syncActionValidation");
    const payload = { mapId: "obsidian-frontier", chestId: "obsidian-chest-01", itemInstanceId: "inst-material-001-1", slot: 0, quantity: 1 };
    expect(isSafeStorageDepositPayload(payload)).toBe(true);
    expect(isSafeStorageWithdrawPayload(payload)).toBe(true);
  });

  it("rejects future-map, invalid chest, slot, quantity, and instance payloads", async () => {
    const { isSafeStorageDepositPayload } = await import("./syncActionValidation");
    const base = { mapId: "obsidian-frontier", chestId: "obsidian-chest-01", itemInstanceId: "inst-material-001-1", slot: 0, quantity: 1 };
    expect(isSafeStorageDepositPayload({ ...base, mapId: "map-002-ashen-obsidian-plains" })).toBe(false);
    expect(isSafeStorageDepositPayload({ ...base, chestId: "future-chest-01" })).toBe(false);
    expect(isSafeStorageDepositPayload({ ...base, slot: 27 })).toBe(false);
    expect(isSafeStorageDepositPayload({ ...base, quantity: 65 })).toBe(false);
    expect(isSafeStorageDepositPayload({ ...base, itemInstanceId: "bad id" })).toBe(false);
  });
});


describe("quest reward dispatch sync boundary", () => {
  const base = { mapId: "obsidian-frontier", questId: "story-map-001-quest-01", questOrder: 1, rewardEventIds: ["quest-reward:story-map-001-quest-01:1"], rewardInstanceIds: ["obsidian-frontier-material-001-4"], sequenceBase: 4 };

  it("accepts a bounded Obsidian MAP_001 item-only pending action", () => {
    expect(isSafeQuestRewardDispatchPayload(base)).toBe(true);
  });

  it("rejects future maps, malformed quest IDs, duplicate IDs and unbounded values", () => {
    expect(isSafeQuestRewardDispatchPayload({ ...base, mapId: "map-002-ashen-obsidian-plains" })).toBe(false);
    expect(isSafeQuestRewardDispatchPayload({ ...base, questId: "story-map-001-quest-20", questOrder: 20 })).toBe(true);
    expect(isSafeQuestRewardDispatchPayload({ ...base, questId: "story-map-002-quest-01" })).toBe(false);
    expect(isSafeQuestRewardDispatchPayload({ ...base, rewardEventIds: [base.rewardEventIds[0], base.rewardEventIds[0]], rewardInstanceIds: ["a", "b"] })).toBe(false);
    expect(isSafeQuestRewardDispatchPayload({ ...base, rewardEventIds: ["quest-reward:story-map-001-quest-01:0"] })).toBe(false);
    expect(isSafeQuestRewardDispatchPayload({ ...base, sequenceBase: 1_000_001 })).toBe(false);
  });
});
