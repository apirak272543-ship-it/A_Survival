import { describe, expect, it } from "vitest";
import { createBlockWorld, setWorldBlock } from "../client/src/game/systems/blockWorldSystem";
import { createPlacedWorldBlock, findNearestReachableWorldBlock, getPlacementCandidates } from "../client/src/game/systems/blockInteractionSystem";

const block = (key: string, x: number, y: number, z: number, state: "intact" | "broken" = "intact") => ({
  key,
  blockId: "rock.obsidian.small",
  moduleId: "rock.cluster.obsidian",
  groupId: "test-group",
  x,
  y,
  z,
  state,
  hitPoints: 2,
  maxHitPoints: 2,
  solid: true,
  seed: 1,
});

describe("Obsidian block interaction controller", () => {
  it("finds only the nearest intact block within reach", () => {
    let world = createBlockWorld("obsidian-frontier", 9107);
    world = setWorldBlock(world, block("1:1:0", 1, 1, 0));
    world = setWorldBlock(world, block("2:1:0", 2, 1, 0));
    world = setWorldBlock(world, block("0:1:0", 0, 1, 0, "broken"));
    expect(findNearestReachableWorldBlock(world, { x: 0, y: 1, z: 0 }, 2.2)?.block.key).toBe("1:1:0");
    expect(findNearestReachableWorldBlock(world, { x: 0, y: 1, z: 0 }, 0.2)).toBeUndefined();
  });

  it("returns deterministic placement candidates above the ground and in facing direction", () => {
    expect(getPlacementCandidates({ x: 3, y: 2, z: 4 }, { x: 1, z: 0 }, 2)).toEqual([
      { x: 4, y: 3, z: 4 },
      { x: 4, y: 4, z: 4 },
      { x: 3, y: 3, z: 4 },
    ]);
  });

  it("creates a placeable WorldBlock with a coordinate key and definition health", () => {
    const placed = createPlacedWorldBlock({ blockId: "rock.obsidian.small", position: { x: 4, y: 3, z: 4 }, seed: 9107 });
    expect(placed).toMatchObject({ key: "4:3:4", blockId: "rock.obsidian.small", moduleId: "player.placed", groupId: "placed:4:3:4", hitPoints: 2, maxHitPoints: 2, solid: true });
    expect(createPlacedWorldBlock({ blockId: "unknown", position: { x: 0, y: 0, z: 0 }, seed: 1 })).toBeUndefined();
  });
});
