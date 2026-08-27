import { describe, expect, it } from "vitest";
import {
  STRUCTURE_BLUEPRINT_LIBRARY,
  type StructureBlueprint,
} from "./generators/structureGenerator";
import {
  auditStructureGeneratorCoverage,
  STRUCTURE_GENERATOR_COVERAGE_VERSION,
} from "./structureGeneratorCoverageContract";

describe("structure generator coverage contract", () => {
  it("audits the canonical blueprint library across all structure levels", () => {
    const report = auditStructureGeneratorCoverage();

    expect(report.version).toBe(STRUCTURE_GENERATOR_COVERAGE_VERSION);
    expect(report.source).toBe("STRUCTURE_BLUEPRINT_LIBRARY");
    expect(report.totalBlueprints).toBe(STRUCTURE_BLUEPRINT_LIBRARY.length);
    expect(report.uniqueBlueprints).toBe(report.totalBlueprints);
    expect(Object.values(report.levelCounts).reduce((sum, count) => sum + count, 0)).toBe(report.totalBlueprints);
    expect(Object.values(report.levelCounts).every(count => count > 0)).toBe(true);
    expect(report.assetReferenceCount).toBeGreaterThan(0);
    expect(report.validation.valid).toBe(true);
  });

  it("keeps asset references and placement/generation checks source-derived", () => {
    const report = auditStructureGeneratorCoverage();

    expect(report.requiredChildReferenceCount).toBeGreaterThan(0);
    expect(report.optionalChildReferenceCount).toBeGreaterThan(0);
    expect(report.policy).toEqual({
      playerGeneratorUI: false,
      assetBytesGenerated: false,
      runtimeImportAllowed: false,
      persistenceWrite: false,
      outputIsAuditOnly: true,
    });
    expect(report.blockers.every(blocker => blocker.code === "unknown-child-reference")).toBe(true);
    expect(report.blockers.map(blocker => blocker.blueprintId)).toEqual([
      "building-magic-clock-tower",
      "compound-frontier-farm",
    ]);
    expect(report.status).toBe("blocked");
  });

  it("reports malformed blueprint rules deterministically without mutating caller input", () => {
    const malformed: StructureBlueprint = {
      ...STRUCTURE_BLUEPRINT_LIBRARY[0]!,
      id: "bad",
      name: "",
      footprint: { width: 0, length: 0, height: 0 },
      placement: { ...STRUCTURE_BLUEPRINT_LIBRARY[0]!.placement, maxSlopeDegrees: 91, minSupportRatio: 2, minFreeSpaceWidth: 0, minFreeSpaceLength: 0 },
      generation: { ...STRUCTURE_BLUEPRINT_LIBRARY[0]!.generation, requiredChildren: ["missing-child"], npcSpawns: [{ id: "", min: 2, max: 1 }] },
    };
    const blueprints = [malformed];
    const before = JSON.stringify(blueprints);
    const report = auditStructureGeneratorCoverage(blueprints);

    expect(JSON.stringify(blueprints)).toBe(before);
    expect(report.source).toBe("provided-blueprints");
    expect(report.status).toBe("blocked");
    expect(report.validation.valid).toBe(false);
    expect(report.blockers.filter(blocker => blocker.code === "invalid-blueprint-validation")).toHaveLength(9);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "invalid-generation-bound", blueprintId: "bad" }),
      expect.objectContaining({ code: "invalid-placement-bound", blueprintId: "bad" }),
      expect.objectContaining({ code: "unknown-child-reference", blueprintId: "bad" }),
    ]));
  });

  it("is deterministic for identical blueprint inputs", () => {
    const first = auditStructureGeneratorCoverage(STRUCTURE_BLUEPRINT_LIBRARY);
    const second = auditStructureGeneratorCoverage(STRUCTURE_BLUEPRINT_LIBRARY);

    expect(first).toEqual(second);
    expect(first.levelCounts).toEqual(second.levelCounts);
    expect(first.blockers).toEqual(second.blockers);
  });
});
