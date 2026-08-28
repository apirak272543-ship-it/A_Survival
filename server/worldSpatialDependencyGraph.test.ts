import { describe, expect, it } from "vitest";
import { buildWorldSpatialDependencyGraph, getDefaultWorldSpatialDependencyGraphInput } from "./generators/worldSpatialDependencyGraph";

describe("world spatial dependency graph", () => {
  it("connects the real Obsidian generator to its spatial validator deterministically", () => {
    const input = getDefaultWorldSpatialDependencyGraphInput(827364);
    const first = buildWorldSpatialDependencyGraph(input);
    const second = buildWorldSpatialDependencyGraph(input);

    expect(first.artifact).toEqual(second.artifact);
    expect(first.summary).toEqual(second.summary);
    expect(first.placementAssessments).toEqual(second.placementAssessments);
    expect(first.graph.valid).toBe(true);
    expect(first.validation).toMatchObject({ valid: true, rulesVersion: "obsidian-spatial-v1", issueCount: 0, errorCount: 0, repairableCount: 0, repairedCount: 0 });
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: 827364, radius: 20, generatorVersion: "0.1.0", spatialRulesVersion: "obsidian-spatial-v1" });
  });

  it("exposes bounded generated content counts and read-only graph policy", () => {
    const result = buildWorldSpatialDependencyGraph({ seed: 9107, radius: 12, placementSubjects: ["tree", "structure", "npc"] });
    expect(result.summary).toMatchObject({ mapId: "obsidian-frontier", blockCount: expect.any(Number), terrainCellCount: expect.any(Number), structureCount: expect.any(Number), spawnPointCount: expect.any(Number), validGeneratedWorld: true, placementSampleCount: 3, runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(result.summary.blockCount).toBeGreaterThan(0);
    expect(result.summary.terrainCellCount).toBeGreaterThan(0);
    expect(result.nodes.map(node => node.generatorId)).toEqual(["world.generator", "world.spatial"]);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(result.placementAssessments.map(sample => sample.subject)).toEqual(["tree", "structure", "npc"]);
  });

  it("reports placement acceptance and surface facts without mutating the generated world", () => {
    const result = buildWorldSpatialDependencyGraph({ seed: 827364, radius: 20, placementSubjects: ["terrain", "water", "tree", "animal", "monster"] });
    expect(result.placementAssessments).toHaveLength(5);
    expect(result.placementAssessments.every(sample => typeof sample.accepted === "boolean")).toBe(true);
    expect(result.placementAssessments.every(sample => sample.surface === undefined || (typeof sample.surface.surfaceY === "number" && typeof sample.surface.biome === "string"))).toBe(true);
    expect(result.summary.rejectedPlacementSampleCount + result.summary.acceptedPlacementSampleCount).toBe(5);
  });

  it("rejects unsupported map, radius, subject count and duplicate subject inputs", () => {
    expect(() => buildWorldSpatialDependencyGraph({ radius: 7 })).toThrow("radius must be between 8 and 64");
    expect(() => buildWorldSpatialDependencyGraph({ radius: 65 })).toThrow("radius must be between 8 and 64");
    expect(() => buildWorldSpatialDependencyGraph({ placementSubjects: ["tree", "tree"] })).toThrow("placementSubjects must be unique");
    expect(() => buildWorldSpatialDependencyGraph({ placementSubjects: ["terrain", "water", "tree", "sapling", "grass", "cactus", "rock", "ore", "structure", "npc", "animal", "monster", "boss"] })).toThrow("placementSubjects must contain between 1 and 12 subjects");
    expect(() => buildWorldSpatialDependencyGraph({ rulesVersion: "wrong.v1" })).toThrow("Unsupported world spatial graph rules version");
  });

  it("keeps seed bounds fail-closed", () => {
    expect(() => buildWorldSpatialDependencyGraph({ seed: 1.5 })).toThrow("seed must be a signed 32-bit integer");
    expect(() => buildWorldSpatialDependencyGraph({ seed: 2_147_483_648 })).toThrow("seed must be a signed 32-bit integer");
  });

  it("rejects unknown and malformed placement subjects before generation", () => {
    expect(() => buildWorldSpatialDependencyGraph({ placementSubjects: ["unknown-subject"] as never })).toThrow("placementSubjects contains unsupported subject");
    expect(() => buildWorldSpatialDependencyGraph({ placementSubjects: ["tree", 7] as never })).toThrow("placementSubjects contains unsupported subject");
    expect(() => buildWorldSpatialDependencyGraph({ placementSubjects: "tree" as never })).toThrow("placementSubjects must contain between 1 and 12 subjects");
  });
});
