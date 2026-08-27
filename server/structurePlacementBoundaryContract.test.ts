import { describe, expect, it } from "vitest";
import { evaluateStructurePlacementBoundary, getStarterStructureBlueprint } from "./structurePlacementBoundaryContract";
import type { StructurePlacementCandidate } from "./generators/structureGenerator";

function candidate(overrides: Partial<StructurePlacementCandidate["context"]> = {}, coordinates: Partial<Pick<StructurePlacementCandidate, "x" | "y" | "z">> = {}): StructurePlacementCandidate {
  return {
    x: coordinates.x ?? 0,
    y: coordinates.y ?? 0,
    z: coordinates.z ?? 0,
    context: {
      mapId: "obsidian-frontier",
      biome: "Obsidian Alien Frontier",
      terrain: "flat",
      climate: "temperate",
      slopeDegrees: 0,
      waterDepth: 0,
      groundY: 2,
      freeSpaceWidth: 4,
      freeSpaceLength: 4,
      roadDistance: 0,
      settlementDistance: 0,
      population: 0,
      supportRatio: 1,
      accessibleEntry: true,
      worldBounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
      occupiedFootprints: [],
      ...overrides,
    },
  };
}

describe("structure placement boundary contract", () => {
  it("accepts a canonical starter blueprint and exposes asset refs without generating assets", () => {
    const result = evaluateStructurePlacementBoundary({ blueprint: getStarterStructureBlueprint(), candidate: candidate() });

    expect(result.valid).toBe(true);
    expect(result.placementAccepted).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.score).toBe(100);
    expect(result.assetRefs).toEqual([{ assetId: "models.structure.frontier-lantern", kind: "model", source: "starter-authored" }]);
    expect(result.runtimePolicy).toEqual({ backendOnly: true, playerFacingGeneratorUi: false, assetGenerationAllowed: false, persistenceWritePerformed: false, futureMapPlayable: false });
  });

  it("repairs out-of-bounds coordinates deterministically before evaluation", () => {
    const result = evaluateStructurePlacementBoundary({ blueprint: getStarterStructureBlueprint(), candidate: candidate({}, { x: 99, y: 99, z: -99 }) });

    expect(result.valid).toBe(true);
    expect(result.placementAccepted).toBe(true);
    expect(result.repairs).toEqual(["x clamped to world bounds", "z clamped to world bounds", "y aligned to ground surface"]);
    expect(result.repairedCandidate).toMatchObject({ x: 9, y: 2, z: -10 });
  });

  it("reports placement rule blockers without turning the contract into an asset/runtime mutation", () => {
    const result = evaluateStructurePlacementBoundary({ blueprint: getStarterStructureBlueprint(), candidate: candidate({ waterDepth: 1 }) });

    expect(result.valid).toBe(true);
    expect(result.placementAccepted).toBe(false);
    expect(result.reasons).toContain("water is forbidden");
    expect(result.runtimePolicy.assetGenerationAllowed).toBe(false);
    expect(result.runtimePolicy.persistenceWritePerformed).toBe(false);
  });

  it("rejects invalid blueprint constraints and remains deterministic", () => {
    const blueprint = { ...getStarterStructureBlueprint(), footprint: { ...getStarterStructureBlueprint().footprint, width: 0 } };
    const first = evaluateStructurePlacementBoundary({ blueprint, candidate: candidate() });
    const second = evaluateStructurePlacementBoundary({ blueprint, candidate: candidate() });

    expect(second).toEqual(first);
    expect(first.valid).toBe(false);
    expect(first.issues).toContain("footprint.width must be between 1 and 512");
  });
});
