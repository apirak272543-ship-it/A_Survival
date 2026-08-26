import { describe, expect, it } from "vitest";
import { isSafeBlockBreakPayload, isSafeBlockPlacePayload, isSafeUseItemPayload } from "./syncActionValidation";

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
