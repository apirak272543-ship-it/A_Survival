import { describe, expect, it } from "vitest";
import {
  auditWorldSpatialCoverage,
  WORLD_SPATIAL_COVERAGE_VERSION,
} from "./worldSpatialCoverageContract";

describe("world spatial coverage contract", () => {
  it("audits the real Obsidian graph with the default bounded subject set", () => {
    const report = auditWorldSpatialCoverage();

    expect(report.version).toBe(WORLD_SPATIAL_COVERAGE_VERSION);
    expect(report.source).toBe("world-spatial-dependency-graph");
    expect(report.input).toMatchObject({ seed: expect.any(Number), radius: 20 });
    expect(report.input.placementSubjects).toHaveLength(7);
    expect(report.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: report.input.seed, radius: report.input.radius });
    expect(report.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(report.validation).toMatchObject({ valid: true, issueCount: 0, errorCount: 0, repairableCount: 0 });
    expect(report.graph).toMatchObject({ valid: true, nodeCount: 2, generatorIds: ["world.generator", "world.spatial"] });
    expect(report.blockers).toEqual([]);
    expect(report.status).toBe("complete");
  });

  it("covers all bounded placement subjects without claiming universal coverage", () => {
    const report = auditWorldSpatialCoverage({
      seed: 9107,
      radius: 12,
      placementSubjects: ["terrain", "water", "tree", "sapling", "grass", "cactus", "rock", "ore", "structure", "npc", "animal", "monster"],
    });

    expect(report.input.placementSubjects).toHaveLength(12);
    expect(report.placement.sampleCount).toBe(12);
    expect(report.placement.acceptedCount + report.placement.rejectedCount).toBe(12);
    expect(report.placement.rejectedSubjects).toEqual([...report.placement.rejectedSubjects].sort());
    expect(report.graph.topologicalOrder).toHaveLength(2);
    expect(report.policy).toEqual({
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      persistenceWrite: false,
    });
  });

  it("is deterministic for the same seed, radius and subject inputs", () => {
    const input = { seed: 827364, radius: 20, placementSubjects: ["tree", "structure", "npc"] as const };
    const first = auditWorldSpatialCoverage(input);
    const second = auditWorldSpatialCoverage(input);

    expect(first).toEqual(second);
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.input.placementSubjects).toEqual(["tree", "structure", "npc"]);
  });

  it("fails closed at the existing graph boundary for invalid input", () => {
    expect(() => auditWorldSpatialCoverage({ radius: 7 })).toThrow("radius must be between 8 and 64");
    expect(() => auditWorldSpatialCoverage({ placementSubjects: ["tree", "tree"] })).toThrow("placementSubjects must be unique");
    expect(() => auditWorldSpatialCoverage({ rulesVersion: "wrong.v1" })).toThrow("Unsupported world spatial graph rules version");
  });
});
