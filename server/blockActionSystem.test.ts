import { describe, expect, it } from "vitest";
import { createStarterInstance, getItemDefinition } from "../client/src/game/data/catalog";
import { blockKey, getBlockToolForItem, parseBlockKey } from "../client/src/game/data/blockModules";
import { breakBlockAt, getWorldBlockAt, normalizeWorldBlockOverrides, placeBlockAt, placeBlockWithInventory } from "../client/src/game/systems/blockActionSystem";
import { defaultOfflineMapState, normalizeOfflineMapState } from "../client/src/game/storage/indexedDb";

describe("Obsidian block-first action rules", () => {
  it("exposes a 64-cap placeable block and a dedicated pickaxe tool", () => {
    expect(getItemDefinition("structure-001")?.stackLimit).toBe(64);
    expect(getItemDefinition("structure-001")?.equippable).toBe(false);
    expect(getBlockToolForItem("tool-001")).toBe("pickaxe");
    expect(getBlockToolForItem("sword-001")).toBeNull();
  });

  it("keeps independent integer coordinates and reads the deterministic base floor", () => {
    expect(blockKey(1.4, 0.2, -2.6)).toBe("1:0:-3");
    expect(parseBlockKey("1:0:-3")).toEqual({ x: 1, y: 0, z: -3 });
    expect(getWorldBlockAt({ x: 0, y: 0, z: 0 }, {})).toBe("terrain.ash");
    expect(getWorldBlockAt({ x: 0, y: 1, z: 0 }, {})).toBeNull();
  });

  it("returns a configured block only when the correct tool breaks it", () => {
    const correct = breakBlockAt({ moduleId: "obstacle.obsidian.slab", coordinate: { x: 0, y: 0, z: 2 }, tool: "pickaxe", overrides: {} });
    expect(correct.removed).toBe(true);
    expect(correct.droppedDefinitionId).toBe("structure-001");
    expect(correct.overrides["0:0:2"]).toBeNull();

    const wrong = breakBlockAt({ moduleId: "obstacle.obsidian.slab", coordinate: { x: 1, y: 0, z: 2 }, tool: "hand", overrides: {} });
    expect(wrong.removed).toBe(true);
    expect(wrong.droppedDefinitionId).toBeUndefined();
    expect(wrong.overrides["1:0:2"]).toBeNull();
  });

  it("requires solid support and an empty target before placement", () => {
    expect(placeBlockAt({ moduleId: "player.placed", coordinate: { x: 0, y: 1, z: 0 }, supportModuleId: "terrain.ash", existingModuleId: null, overrides: {} }).accepted).toBe(true);
    expect(placeBlockAt({ moduleId: "player.placed", coordinate: { x: 0, y: 1, z: 0 }, supportModuleId: null, existingModuleId: null, overrides: {} }).accepted).toBe(false);
    expect(placeBlockAt({ moduleId: "player.placed", coordinate: { x: 0, y: 1, z: 0 }, supportModuleId: "terrain.ash", existingModuleId: "obstacle.obsidian.slab", overrides: {} }).accepted).toBe(false);
  });

  it("consumes exactly one 64-cap block only after accepted placement", () => {
    const block = { ...createStarterInstance("structure-001", 90), quantity: 3 };
    const accepted = placeBlockWithInventory({ inventory: [block], instanceId: block.instanceId, coordinate: { x: 0, y: 1, z: 0 }, supportModuleId: "terrain.ash", existingModuleId: null, overrides: {} });
    expect(accepted.accepted).toBe(true);
    expect(accepted.inventory[0]?.quantity).toBe(2);
    expect(accepted.overrides["0:1:0"]).toBe("player.placed");

    const rejected = placeBlockWithInventory({ inventory: [block], instanceId: block.instanceId, coordinate: { x: 0, y: 2, z: 0 }, supportModuleId: null, existingModuleId: null, overrides: {} });
    expect(rejected.accepted).toBe(false);
    expect(rejected.inventory[0]?.quantity).toBe(3);
    expect(rejected.overrides).toEqual({});
  });

  it("normalizes only known block modules while retaining explicit removed cells", () => {
    expect(normalizeWorldBlockOverrides({ "0:0:0": null, "0:1:0": "player.placed", bad: "player.placed", "0:2:0": "unknown.module" })).toEqual({ "0:0:0": null, "0:1:0": "player.placed" });
  });
});

describe("map and player scoped block persistence", () => {
  it("uses mapId plus playerId as the state identity and keeps legacy defaults", () => {
    const empty = defaultOfflineMapState("obsidian-frontier", "Nova");
    expect(empty.mapId).toBe("obsidian-frontier");
    expect(empty.playerId).toBe("Nova");
    expect(empty.worldBlockOverrides).toEqual({});
    const normalized = normalizeOfflineMapState({ worldBlockOverrides: { "0:0:2": null, invalid: "x" } }, "obsidian-frontier", "Rider");
    expect(normalized.mapId).toBe("obsidian-frontier");
    expect(normalized.playerId).toBe("Rider");
    expect(normalized.worldBlockOverrides).toEqual({ "0:0:2": null });
  });
});
