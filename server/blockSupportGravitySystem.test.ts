import { describe, expect, it } from "vitest";
import {
  canApplyHazardDamage,
  canPlaceBlock,
  intersectsBlockEntity,
  getUnsupportedGravityBlocks,
} from "../client/src/game/systems/blockPhysicsSystem";
import { getBlockDefinition, type WorldBlock } from "../client/src/game/data/blockModules";
import { createBlockWorld, setWorldBlock } from "../client/src/game/systems/blockWorldSystem";

const makeBlock = (blockId: string, x: number, y: number, z: number): WorldBlock => ({
  key: `${x}:${y}:${z}`,
  blockId,
  moduleId: "test.support-gravity",
  groupId: "test-group",
  x,
  y,
  z,
  state: "intact",
  hitPoints: 1,
  maxHitPoints: 1,
  solid: Boolean(getBlockDefinition(blockId)?.solid),
  seed: 9107,
});

const emptyWorld = () => createBlockWorld("obsidian-frontier", 9107);

const worldWith = (...blocks: WorldBlock[]) => blocks.reduce(setWorldBlock, emptyWorld());

describe("Obsidian support and gravity boundary", () => {
  it("accepts a non-floating block above solid support and rejects an occupied or unknown cell", () => {
    const world = worldWith(makeBlock("rock.obsidian.small", 0, 0, 0));
    expect(canPlaceBlock(world, "rock.obsidian.small", 0, 1, 0)).toEqual({ accepted: true, reason: "placed" });
    expect(canPlaceBlock(world, "rock.obsidian.small", 0, 0, 0)).toEqual({ accepted: false, reason: "occupied" });
    expect(canPlaceBlock(world, "missing.block", 0, 1, 1)).toEqual({ accepted: false, reason: "unknown-block" });
  });

  it("accepts horizontal support and an explicit terrain support callback", () => {
    const sideSupported = worldWith(makeBlock("rock.obsidian.small", 1, 0, 0));
    expect(canPlaceBlock(sideSupported, "rock.obsidian.small", 0, 0, 0)).toEqual({ accepted: true, reason: "placed" });

    const terrainSupported = emptyWorld();
    expect(canPlaceBlock(terrainSupported, "rock.obsidian.small", 4, 4, 4, (x, y, z) => x === 4 && y === 3 && z === 4)).toEqual({ accepted: true, reason: "placed" });
    expect(canPlaceBlock(terrainSupported, "rock.obsidian.small", 4, 4, 4)).toEqual({ accepted: false, reason: "requires-support" });
  });

  it("keeps definition-owned float and gravity flags distinct", () => {
    expect(getBlockDefinition("terrain.obsidian.sand")).toMatchObject({ gravityAffected: true, canFloat: false, requiresSupport: true });
    expect(getBlockDefinition("terrain.obsidian")).toMatchObject({ gravityAffected: false, canFloat: true, requiresSupport: false });

    expect(canPlaceBlock(emptyWorld(), "terrain.obsidian", 8, 8, 8)).toEqual({ accepted: true, reason: "placed" });
    expect(canPlaceBlock(emptyWorld(), "terrain.obsidian.sand", 8, 8, 8)).toEqual({ accepted: false, reason: "requires-support" });
  });

  it("reports only unsupported gravity-affected blocks", () => {
    const unsupported = makeBlock("terrain.obsidian.sand", 0, 1, 0);
    const supported = makeBlock("terrain.obsidian.sand", 2, 1, 0);
    const support = makeBlock("rock.obsidian.small", 2, 0, 0);
    const floatingAllowed = makeBlock("terrain.obsidian", 4, 4, 4);
    const world = worldWith(unsupported, supported, support, floatingAllowed);

    expect(getUnsupportedGravityBlocks(world).map(block => block.key)).toEqual(["0:1:0"]);
  });

  it("uses terrain support to clear an otherwise unsupported gravity block", () => {
    const block = makeBlock("terrain.obsidian.sand", 3, 2, 3);
    const world = worldWith(block);
    expect(getUnsupportedGravityBlocks(world)).toHaveLength(1);
    expect(getUnsupportedGravityBlocks(world, (x, y, z) => x === 3 && y === 1 && z === 3)).toEqual([]);
  });

  it("ignores broken blocks when looking for support", () => {
    const brokenSupport = { ...makeBlock("rock.obsidian.small", 0, 0, 0), state: "broken" as const };
    const world = worldWith(brokenSupport);
    expect(canPlaceBlock(world, "rock.obsidian.small", 0, 1, 0)).toEqual({ accepted: false, reason: "requires-support" });
    expect(getUnsupportedGravityBlocks(world)).toEqual([]);
  });

  it("fails closed on non-finite placement coordinates and hazard timestamps", () => {
    expect(canPlaceBlock(emptyWorld(), "terrain.obsidian", Number.NaN, 0, 0)).toEqual({ accepted: false, reason: "unknown-block" });
    const contact = {
      block: makeBlock("thorn.obsidian", 0, 0, 0),
      bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 },
      hazard: { kind: "thorn", damage: 1, cooldownSeconds: 1, affects: "all" as const },
    };
    expect(canApplyHazardDamage(contact, undefined, Number.NaN)).toBe(false);
    expect(canApplyHazardDamage(contact, Number.POSITIVE_INFINITY, 1000)).toBe(false);
    expect(canApplyHazardDamage({ ...contact, hazard: { ...contact.hazard, cooldownSeconds: Number.POSITIVE_INFINITY } }, undefined, 1000)).toBe(false);
  });

  it("ignores malformed entity bounds without affecting valid collision", () => {
    const world = worldWith(makeBlock("rock.obsidian.small", 0, 0, 0));
    expect(getUnsupportedGravityBlocks(world)).toEqual([]);
    expect(canPlaceBlock(world, "rock.obsidian.small", 0, 1, 0)).toEqual({ accepted: true, reason: "placed" });
    expect(intersectsBlockEntity(makeBlock("rock.obsidian.small", 0, 0, 0), { x: Number.NaN, y: 0.2, z: 0.5, radius: 0.25, height: 1 })).toBe(false);
    expect(intersectsBlockEntity(makeBlock("rock.obsidian.small", 0, 0, 0), { x: 0.5, y: 0.2, z: 0.5, radius: -1, height: 1 })).toBe(false);
  });
});
