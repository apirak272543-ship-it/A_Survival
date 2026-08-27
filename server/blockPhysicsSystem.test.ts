import { describe, expect, it } from "vitest";
import { createBlockWorld, setWorldBlock } from "../client/src/game/systems/blockWorldSystem";
import {
  canApplyHazardDamage,
  getBlockShapeBounds,
  getBlockingContacts,
  getHazardContacts,
} from "../client/src/game/systems/blockPhysicsSystem";
import type { WorldBlock } from "../client/src/game/data/blockModules";

const makeBlock = (blockId: string, x = 0, y = 0, z = 0): WorldBlock => ({
  key: `${x}:${y}:${z}`,
  blockId,
  moduleId: "test.physics",
  groupId: "test-group",
  x,
  y,
  z,
  state: "intact",
  hitPoints: 1,
  maxHitPoints: 1,
  solid: blockId !== "flora.obsidian.thorn-cactus" && blockId !== "flora.obsidian.sprout",
  seed: 9107,
});

const worldWith = (block: WorldBlock) => setWorldBlock(createBlockWorld("obsidian-frontier", 9107), block);

const playerAt = (x: number, y = 0.1, z = 0.5) => ({
  x,
  y,
  z,
  radius: 0.12,
  height: 1.7,
});

describe("Obsidian block physics contract", () => {
  it("uses the canonical half-height slab bounds for partial solid occupancy", () => {
    expect(getBlockShapeBounds(makeBlock("obstacle.obsidian.slab"))).toEqual({
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 0.5,
      minZ: 0,
      maxZ: 1,
    });
    expect(getBlockingContacts(worldWith(makeBlock("obstacle.obsidian.slab")), {
      x: 0.5,
      y: 0.1,
      z: 0.5,
      radius: 0.12,
      height: 1.7,
    })).toHaveLength(1);
  });

  it("keeps a thin non-solid plant pass-through while retaining its thin shape", () => {
    const plant = makeBlock("flora.obsidian.sprout");
    expect(getBlockShapeBounds(plant)).toMatchObject({ minX: 0.25, maxX: 0.75, minZ: 0.25, maxZ: 0.75 });
    expect(getBlockingContacts(worldWith(plant), playerAt(0.5))).toHaveLength(0);
  });

  it("does not report a thin plant contact outside its occupied footprint", () => {
    const plant = makeBlock("flora.obsidian.sprout");
    expect(getBlockingContacts(worldWith(plant), playerAt(0.05, 0.1, 0.05))).toHaveLength(0);
    expect(getHazardContacts(worldWith(plant), playerAt(0.5), "player")).toHaveLength(0);
  });

  it("reports canonical cactus damage for players and creatures without making it solid", () => {
    const cactus = makeBlock("flora.obsidian.thorn-cactus");
    const world = worldWith(cactus);
    const entity = playerAt(0.5);
    expect(getBlockingContacts(world, entity)).toHaveLength(0);
    expect(getHazardContacts(world, entity, "player")).toMatchObject([
      { block: { blockId: "flora.obsidian.thorn-cactus" }, hazard: { damage: 6, cooldownSeconds: 0.5, affects: "all" } },
    ]);
    expect(getHazardContacts(world, entity, "creature")).toHaveLength(1);
  });

  it("applies hazard damage immediately, then only after the canonical cooldown", () => {
    const contact = getHazardContacts(worldWith(makeBlock("flora.obsidian.thorn-cactus")), playerAt(0.5), "player")[0];
    expect(contact).toBeDefined();
    expect(canApplyHazardDamage(contact, undefined, 1_000)).toBe(true);
    expect(canApplyHazardDamage(contact, 1_000, 1_499)).toBe(false);
    expect(canApplyHazardDamage(contact, 1_000, 1_500)).toBe(true);
  });

  it("ignores broken blocks for both blocking and hazard contact", () => {
    const broken = { ...makeBlock("flora.obsidian.thorn-cactus"), state: "broken" as const };
    const world = worldWith(broken);
    const entity = playerAt(0.5);
    expect(getBlockingContacts(world, entity)).toHaveLength(0);
    expect(getHazardContacts(world, entity, "player")).toHaveLength(0);
  });
});
