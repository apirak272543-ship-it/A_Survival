import { describe, expect, it } from "vitest";
import { buildWorldSpawnDependencyGraph, WORLD_SPAWN_GRAPH_RULES_VERSION } from "./generators/worldSpawnDependencyGraph";

describe("world spawn dependency graph", () => {
  it("is deterministic and links real spawn points to biome and structure context", () => {
    const input = { seed: "world-structure-seed", radius: 32, sampleSpawnCount: 16 };
    const first = buildWorldSpawnDependencyGraph(input);
    const second = buildWorldSpawnDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0" });
    expect(first.artifact.worldHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.spawnCount).toBeGreaterThan(0);
    expect(first.artifact.sampledSpawnCount).toBeLessThanOrEqual(16);
    expect(first.summary.biomeIds.length).toBeGreaterThan(1);
    expect(first.summary.structureIds.length).toBeGreaterThan(0);
    expect(first.summary.speciesIds.length).toBeGreaterThan(0);
    expect(Object.values(first.summary.roleCounts).reduce((total, count) => total + count, 0)).toBe(first.summary.sampledSpawnCount);
    expect(first.summary.structureLinkedSpawnCount).toBeGreaterThan(0);
    expect(first.nodes.some(node => node.key.startsWith("spawn:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("biome:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("world-structure:"))).toBe(true);
    expect(first.summary.unresolvedReferenceTypes["species-definition"]).toBe(first.summary.sampledSpawnCount);
    expect(first.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects unsupported rules, invalid radius, and spawn sample bounds", () => {
    expect(() => buildWorldSpawnDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported world spawn graph rules version");
    expect(() => buildWorldSpawnDependencyGraph({ seed: "seed", radius: 15 })).toThrow("radius must be an integer from 16 to 64");
    expect(() => buildWorldSpawnDependencyGraph({ seed: "seed", sampleSpawnCount: 0 })).toThrow("sampleSpawnCount must be an integer from 1 to 64");
    expect(() => buildWorldSpawnDependencyGraph({ seed: "seed", sampleSpawnCount: 65 })).toThrow("sampleSpawnCount must be an integer from 1 to 64");
    expect(WORLD_SPAWN_GRAPH_RULES_VERSION).toBe("world-spawn-graph-rules.v1");
  });
});
