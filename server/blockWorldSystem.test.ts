import { describe, expect, it } from "vitest";
import { generateBlockGroup } from "../client/src/game/systems/blockWorldSystem";

describe("block world grouped records", () => {
  it("keeps one first-wins WorldBlock record per rounded coordinate key", () => {
    const group = generateBlockGroup({
      moduleId: "fixture.group",
      groupId: "fixture-group",
      seed: 44,
      offsets: [
        { x: 1, y: 2, z: 3, blockId: "terrain.obsidian" },
        { x: 1, y: 2, z: 3, blockId: "player.placed" },
        { x: 2, y: 2, z: 3, blockId: "rock.obsidian.small" },
      ],
    });

    expect(group.blocks).toHaveLength(2);
    expect(group.blocks.map(block => block.key)).toEqual(["1:2:3", "2:2:3"]);
    expect(group.blocks[0]).toMatchObject({ key: "1:2:3", blockId: "terrain.obsidian", moduleId: "fixture.group", groupId: "fixture-group", seed: 44 });
    expect(new Set(group.blocks.map(block => block.key)).size).toBe(group.blocks.length);
  });

  it("normalizes fractional offsets so record coordinates match the rounded key", () => {
    const group = generateBlockGroup({
      moduleId: "fixture.group",
      groupId: "fractional-group",
      seed: 12,
      offsets: [{ x: 1.4, y: 2.6, z: -3.4, blockId: "terrain.obsidian" }],
    });

    expect(group.blocks[0]).toMatchObject({ key: "1:3:-3", x: 1, y: 3, z: -3 });
  });

  it("keeps grouped output deterministic for the same offsets and seed", () => {
    const input = {
      moduleId: "fixture.group",
      groupId: "fixture-group",
      seed: 91,
      offsets: [
        { x: 0, y: 0, z: 0, blockId: "terrain.ash" },
        { x: 0, y: 1, z: 0, blockId: "wood.obsidian.log" },
        { x: 0, y: 1, z: 0, blockId: "leaves.obsidian" },
      ],
      state: "mature" as const,
    };

    expect(generateBlockGroup(input)).toEqual(generateBlockGroup(input));
  });
});
