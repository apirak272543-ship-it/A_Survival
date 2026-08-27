import { describe, expect, it } from "vitest";
import { buildMap001EncounterDependencyGraph } from "./generators/map001EncounterDependencyGraph";

const input = { seed: "map001-encounter-graph-seed", radius: 32, sampleSpawnCount: 64 };

describe("MAP_001 encounter dependency graph", () => {
  it("connects real encounter events to sampled world spawn/loot nodes deterministically", () => {
    const first = buildMap001EncounterDependencyGraph(input);
    const second = buildMap001EncounterDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: input.seed, worldGeneratorVersion: "0.1.0", encounterOwnerVersion: "1.0.0", lootGeneratorVersion: "0.1.0", triggerCount: 2 });
    expect(first.summary.sampledSpawnCount).toBe(14);
    expect(first.summary.eventIds).toEqual(["distress-pod-glass-stalkers", "leyline-monolith-void-reaper"]);
    expect(first.summary.eventKinds).toEqual(["distress-pod", "void-reaper"]);
    expect(first.summary.expectedSpeciesIds).toEqual(["glass-stalker", "void-reaper"]);
    expect(first.events.every(event => event.triggered)).toBe(true);
    expect(first.nodes.some(node => node.generatorId === "map001.encounter" && node.key.startsWith("map001-encounter-profile:"))).toBe(true);
    expect(first.nodes.some(node => node.generatorId === "map001.encounter" && node.key.startsWith("map001-encounter-trigger:"))).toBe(true);
    expect(first.nodes.some(node => node.generatorId === "map001.encounter" && node.key.startsWith("map001-encounter-output:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("loot:"))).toBe(true);
    expect(first.summary.missingSpawnCount).toBeGreaterThan(0);
    expect(first.summary.unresolvedReferenceTypes["spawn-coverage"]).toBeGreaterThan(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("keeps encounter output blocked when sampled spawn coverage or loot context is absent", () => {
    const result = buildMap001EncounterDependencyGraph({ ...input, sampleSpawnCount: 1 });

    expect(result.summary.sampledSpawnCount).toBe(1);
    expect(result.summary.missingSpawnCount).toBeGreaterThan(0);
    expect(result.unresolvedReferences.some(reference => reference.referenceType === "spawn-coverage")).toBe(true);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.key.startsWith("map001-encounter-output:"))).toBe(true);
  });

  it("rejects unsupported rules and out-of-bounds preview inputs", () => {
    expect(() => buildMap001EncounterDependencyGraph({ ...input, rulesVersion: "wrong.v1" })).toThrow("Unsupported MAP_001 encounter graph rules version");
    expect(() => buildMap001EncounterDependencyGraph({ ...input, radius: 8 })).toThrow("radius must be an integer from 16 to 64");
    expect(() => buildMap001EncounterDependencyGraph({ ...input, sampleSpawnCount: 65 })).toThrow("sampleSpawnCount must be an integer from 1 to 64");
  });
});
