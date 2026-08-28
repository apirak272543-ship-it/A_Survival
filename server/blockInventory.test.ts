import { describe, expect, it } from "vitest";
import { createMapRewardInstance } from "../client/src/game/data/catalog";
import { blockKey, getBlockDefinition, type WorldBlock } from "../client/src/game/data/blockModules";
import { resolveBlockBreak } from "../client/src/game/systems/blockActionSystem";
import { generateRockBlocks, generateTreeBlocks } from "../client/src/game/systems/blockWorldSystem";
import { OBSIDIAN_TERRAIN_MAX_HEIGHT, sampleObsidianTerrainHeight } from "../client/src/game/systems/terrainHeight";
import { canApplyHazardDamage, canPlaceBlock, getBlockShapeBounds, getHazardContacts, getUnsupportedGravityBlocks, intersectsBlockEntity } from "../client/src/game/systems/blockPhysicsSystem";
import { createBlockWorld, generateBlockGroup, setWorldBlock } from "../client/src/game/systems/blockWorldSystem";
import { addItemToContainer, createWorldStorage, depositToWorldStorage, PLAYER_INVENTORY_SLOTS, withdrawFromWorldStorage } from "../client/src/game/systems/inventorySystem";

const block = (blockId: string): WorldBlock => ({
  key: blockKey(2, 1, 3),
  blockId,
  moduleId: "test-module",
  x: 2,
  y: 1,
  z: 3,
  state: "intact",
  hitPoints: 2,
  maxHitPoints: 2,
  solid: true,
  seed: 7,
});

describe("block drops and bounded storage", () => {
  it("drops no block item when a generic tool breaks a block", () => {
    const result = resolveBlockBreak(block("wood.obsidian.log"), "pickaxe");
    expect(result.accepted).toBe(true);
    expect(result.removed).toBe(true);
    expect(result.dropKind).toBe("none");
    expect(result.dropDefinitionId).toBeUndefined();
  });

  it("drops a placeable block item when the tool matches", () => {
    const result = resolveBlockBreak(block("wood.obsidian.log"), "axe");
    expect(result.usedCorrectTool).toBe(true);
    expect(result.dropKind).toBe("block-item");
    expect(result.dropDefinitionId).toBe("block-obsidian-log");
    expect(getBlockDefinition("wood.obsidian.log")?.requiredToolTag).toBe("axe");
  });

  it("stacks a block drop up to 64 in one player slot", () => {
    const existing = createMapRewardInstance("block-obsidian-stone", 1, "obsidian-frontier", "test-stone", "drop");
    existing.quantity = 63;
    const incoming = createMapRewardInstance("block-obsidian-stone", 2, "obsidian-frontier", "test-stone-2", "drop");
    incoming.quantity = 4;
    const result = addItemToContainer([existing], incoming, 1);
    expect(PLAYER_INVENTORY_SLOTS).toBe(40);
    expect(result.inventory[0]?.quantity).toBe(64);
    expect(result.remainder?.quantity).toBe(3);
    expect(result.addedQuantity).toBe(1);
  });

  it("rejects non-finite or non-integer quantity and capacity before allocation", () => {
    const incoming = createMapRewardInstance("block-obsidian-stone", 9, "obsidian-frontier", "invalid-input", "drop", 1);
    for (const quantity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = addItemToContainer([], { ...incoming, quantity }, 1);
      expect(result.accepted).toBe(false);
      expect(result.inventory).toEqual([]);
      expect(result.addedQuantity).toBe(0);
      expect(result.remainder?.quantity).toBe(quantity);
    }

    const invalidCapacity = addItemToContainer([], incoming, Number.NaN);
    expect(invalidCapacity).toMatchObject({ accepted: false, inventory: [], addedQuantity: 0, message: "ความจุคลังไม่ถูกต้อง" });
    expect(invalidCapacity.remainder).toEqual(incoming);
  });

  it("keeps world storage separate and allows carry-over after withdrawal", () => {
    const storage = createWorldStorage("obsidian-frontier", "starter-chest");
    const incoming = createMapRewardInstance("block-obsidian-stone", 3, "obsidian-frontier", "chest-stone", "drop");
    incoming.quantity = 8;
    const deposited = depositToWorldStorage(storage, incoming);
    expect(deposited.accepted).toBe(true);
    expect(deposited.storage.slots[0]?.quantity).toBe(8);
    const withdrawn = withdrawFromWorldStorage(deposited.storage, "block-obsidian-stone", 8, []);
    expect(withdrawn.accepted).toBe(true);
    expect(withdrawn.inventory[0]?.quantity).toBe(8);
    expect(withdrawn.storage.slots).toHaveLength(0);
  });

  it("uses unique IDs when a large drop is split across fresh stacks", () => {
    const incoming = createMapRewardInstance("block-obsidian-stone", 4, "obsidian-frontier", "large-drop", "drop", 64);
    const result = addItemToContainer([], { ...incoming, quantity: 64 }, 2);
    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0]?.quantity).toBe(64);
    const overflow = addItemToContainer(result.inventory, { ...incoming, quantity: 64 }, 3);
    expect(overflow.inventory).toHaveLength(2);
    expect(new Set(overflow.inventory.map(item => item.instanceId)).size).toBe(2);
  });

  it("keeps Obsidian terrain deterministic and within the declared height bound", () => {
    const samples = Array.from({ length: 25 }, (_, index) => sampleObsidianTerrainHeight(index * 7 - 84, ((index * 11) % 25) - 84));
    expect(samples).toEqual(samples.map((_, index) => sampleObsidianTerrainHeight(index * 7 - 84, ((index * 11) % 25) - 84)));
    expect(samples.every(height => height >= 0 && height <= OBSIDIAN_TERRAIN_MAX_HEIGHT)).toBe(true);
    expect(new Set(samples.map(height => height * 2)).size).toBeGreaterThan(1);
  });

  it("generates grounded trees and rocks as independent bounded blocks", () => {
    const tree = generateTreeBlocks({ x: 3, z: -2, seed: 99, baseY: 2 });
    const rock = generateRockBlocks({ x: -4, z: 5, seed: 123, baseY: 1 });
    expect(new Set(tree.blocks.map(block => block.key)).size).toBe(tree.blocks.length);
    expect(new Set(rock.blocks.map(block => block.key)).size).toBe(rock.blocks.length);
    expect(tree.blocks.every(block => block.y >= 2)).toBe(true);
    expect(rock.blocks.every(block => block.y >= 1)).toBe(true);
    expect(tree.blocks.some(block => block.blockId === "wood.obsidian.log")).toBe(true);
    expect(tree.blocks.some(block => block.blockId === "leaves.obsidian")).toBe(true);
    expect(generateTreeBlocks({ x: 3, z: -2, seed: 99, baseY: 2 })).toEqual(tree);
    expect(generateRockBlocks({ x: -4, z: 5, seed: 123, baseY: 1 })).toEqual(rock);
    expect(Math.max(...tree.blocks.map(block => block.y)) - 2).toBeLessThanOrEqual(7);
    expect(rock.blocks.length).toBeLessThanOrEqual(12);
  });

  it("separates grid occupancy from partial collision and hazard shape", () => {
    const cactus = generateBlockGroup({ moduleId: "flora.test", groupId: "cactus", seed: 1, offsets: [{ x: 0, y: 0, z: 0, blockId: "flora.obsidian.thorn-cactus" }] }).blocks[0]!;
    const sprout = generateBlockGroup({ moduleId: "flora.test", groupId: "sprout", seed: 2, offsets: [{ x: 2, y: 0, z: 0, blockId: "flora.obsidian.sprout" }] }).blocks[0]!;
    expect(getBlockShapeBounds(cactus)).toEqual({ minX: 0.25, maxX: 0.75, minY: 0, maxY: 1, minZ: 0.25, maxZ: 0.75 });
    expect(getBlockShapeBounds(sprout)).toEqual({ minX: 2.25, maxX: 2.75, minY: 0, maxY: 1, minZ: 0.25, maxZ: 0.75 });
    expect(intersectsBlockEntity(cactus, { x: 0.5, y: 0, z: 0.5, radius: 0.2, height: 1 })).toBe(true);
    expect(intersectsBlockEntity(cactus, { x: 0.05, y: 0, z: 0.05, radius: 0.1, height: 1 })).toBe(false);
    expect(getHazardContacts(createBlockWorldWith(cactus), { x: 0.5, y: 0, z: 0.5, radius: 0.2, height: 1 }, "player")).toHaveLength(1);
  });

  it("requires support for placed gravity blocks but permits explicit floating blocks", () => {
    const empty = createBlockWorld("obsidian-frontier", 1);
    expect(canPlaceBlock(empty, "terrain.obsidian.sand", 4, 8, 4)).toEqual({ accepted: false, reason: "requires-support" });
    expect(canPlaceBlock(empty, "terrain.obsidian", 4, 8, 4)).toEqual({ accepted: true, reason: "placed" });
    const supported = setWorldBlock(empty, generateBlockGroup({ moduleId: "terrain.test", groupId: "support", seed: 3, offsets: [{ x: 4, y: 7, z: 4, blockId: "terrain.obsidian" }] }).blocks[0]!);
    expect(canPlaceBlock(supported, "terrain.obsidian.sand", 4, 8, 4)).toEqual({ accepted: true, reason: "placed" });
    const unsupportedSand = generateBlockGroup({ moduleId: "terrain.test", groupId: "sand", seed: 4, offsets: [{ x: 6, y: 9, z: 6, blockId: "terrain.obsidian.sand" }] }).blocks[0]!;
    expect(getUnsupportedGravityBlocks(setWorldBlock(empty, unsupportedSand))).toEqual([unsupportedSand]);
  });

  it("enforces cactus damage cooldown instead of damaging every render tick", () => {
    const cactus = generateBlockGroup({ moduleId: "flora.test", groupId: "cactus-cooldown", seed: 5, offsets: [{ x: 0, y: 0, z: 0, blockId: "flora.obsidian.thorn-cactus" }] }).blocks[0]!;
    const contact = getHazardContacts(createBlockWorldWith(cactus), { x: 0.5, y: 0, z: 0.5, radius: 0.2, height: 1 }, "player")[0]!;
    expect(canApplyHazardDamage(contact, undefined, 1000)).toBe(true);
    expect(canApplyHazardDamage(contact, 1000, 1200)).toBe(false);
    expect(canApplyHazardDamage(contact, 1000, 1600)).toBe(true);
  });
});

function createBlockWorldWith(blockValue: WorldBlock) {
  return setWorldBlock(createBlockWorld("obsidian-frontier", 1), blockValue);
}
