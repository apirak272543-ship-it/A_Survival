import { describe, expect, it } from "vitest";
import { evaluateWorldGeneratorOutput, MAX_GENERATOR_RADIUS } from "./worldGeneratorOutputContract";

describe("world generator output contract", () => {
  it("returns deterministic bounded output with canonical world domain coverage", () => {
    const result = evaluateWorldGeneratorOutput({ radius: 10, seed: 9107 });

    expect(result.valid).toBe(true);
    expect(result.deterministic).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.summary).toMatchObject({
      blockCount: expect.any(Number),
      terrainCellCount: 441,
      waterCellCount: expect.any(Number),
      caveCount: expect.any(Number),
      resourceCount: expect.any(Number),
      structureCount: expect.any(Number),
      spawnPointCount: expect.any(Number),
      structureKinds: ["boss-room", "npc-camp", "ruin", "safe-zone", "shop"],
      spawnRoles: ["animal", "boss", "npc", "regular"],
    });
    expect(result.world.worldHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.world.blocks.every(block => Math.abs(block.x) <= 10 && Math.abs(block.z) <= 10)).toBe(true);
    expect(result.runtimePolicy).toEqual({ backendOnly: true, playerFacingWorldGenerationUi: false, renderLoopGenerationAllowed: false, futureMapPlayable: false, persistenceWritePerformed: false });
  });

  it("changes the output hash for a different seed while keeping the contract bounded", () => {
    const first = evaluateWorldGeneratorOutput({ radius: 10, seed: 9107 });
    const second = evaluateWorldGeneratorOutput({ radius: 10, seed: 9108 });

    expect(second.world.worldHash).not.toBe(first.world.worldHash);
    expect(second.summary.terrainCellCount).toBe(first.summary.terrainCellCount);
    expect(second.runtimePolicy.futureMapPlayable).toBe(false);
  });

  it("rejects future maps and unbounded generator radius before generation", () => {
    expect(() => evaluateWorldGeneratorOutput({ mapId: "map-002-ashen-obsidian-plains" })).toThrow("world generator output only accepts obsidian-frontier");
    expect(() => evaluateWorldGeneratorOutput({ radius: 0 })).toThrow("generator radius must be an integer from 1 to 64");
    expect(() => evaluateWorldGeneratorOutput({ radius: MAX_GENERATOR_RADIUS + 1 })).toThrow("generator radius must be an integer from 1 to 64");
  });

  it("keeps the same output for repeated evaluation of the same seed/config", () => {
    const first = evaluateWorldGeneratorOutput({ radius: 8, seed: 1731, difficulty: "hard" });
    const second = evaluateWorldGeneratorOutput({ radius: 8, seed: 1731, difficulty: "hard" });

    expect(second.world).toEqual(first.world);
    expect(second.summary).toEqual(first.summary);
    expect(second.issues).toEqual(first.issues);
  });
});
