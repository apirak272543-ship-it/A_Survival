import { describe, expect, it } from "vitest";
import { buildStructureSpawnReconciliationDependencyGraph } from "./generators/structureSpawnReconciliationDependencyGraph";

const input = {
  seed: "structure-spawn-reconciliation-seed",
  radius: 32,
  blueprintIds: ["compound-frontier-farm"],
  sampleSpawnCount: 64,
};

describe("structure spawn reconciliation dependency graph", () => {
  it("compares real structure spawn intent with real world spawn points deterministically", () => {
    const first = buildStructureSpawnReconciliationDependencyGraph(input);
    const second = buildStructureSpawnReconciliationDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "structure-spawn-reconciliation-seed", worldGeneratorVersion: "0.1.0", structureGeneratorVersion: "1.0.0", structurePlacementCount: 1, sampledSpawnCount: 14 });
    expect(first.summary.structurePlacementCount).toBe(1);
    expect(first.summary.structureIntentCount).toBeGreaterThan(0);
    expect(first.summary.expectedSpeciesIds).toContain("field-tender");
    expect(first.records[0]?.expected).toContainEqual(expect.objectContaining({ id: "field-tender", role: "npc" }));
    expect(first.summary.unmatchedIntentCount).toBeGreaterThan(0);
    expect(first.summary.unresolvedReferenceTypes["species-mismatch"] + first.summary.unresolvedReferenceTypes["spawn-intent"]).toBeGreaterThan(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.nodes.some(node => node.generatorId === "structure.spawn.reconciliation")).toBe(true);
    expect(first.nodes.some(node => node.generatorId === "world.generator" && node.key.startsWith("spawn-reconciliation-source:"))).toBe(true);
  });

  it("keeps orphan structure context and species mismatches explicit instead of inventing mob/NPC definitions", () => {
    const result = buildStructureSpawnReconciliationDependencyGraph({ ...input, blueprintIds: ["building-magic-clock-tower"] });

    expect(result.summary.expectedSpeciesIds).toContain("village-keeper");
    expect(result.unresolvedReferences.some(reference => reference.referenceType === "species-mismatch" || reference.referenceType === "spawn-intent")).toBe(true);
    expect(result.graph.valid).toBe(false);
  });

  it("rejects unsupported rules and out-of-bounds samples", () => {
    expect(() => buildStructureSpawnReconciliationDependencyGraph({ ...input, rulesVersion: "wrong.v1" })).toThrow("Unsupported structure spawn reconciliation rules version");
    expect(() => buildStructureSpawnReconciliationDependencyGraph({ ...input, sampleSpawnCount: 0 })).toThrow("sampleSpawnCount must be an integer from 1 to 64");
    expect(() => buildStructureSpawnReconciliationDependencyGraph({ ...input, radius: 15 })).toThrow("radius must be an integer from 16 to 64");
  });
});
