import { describe, expect, it } from "vitest";
import { buildWorldSpawnLootDependencyGraph, WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION } from "./generators/worldSpawnLootDependencyGraph";

describe("world spawn loot dependency graph", () => {
  it("is deterministic and links real procedural loot to sampled world spawns", () => {
    const input = { seed: "world-structure-seed", radius: 32, sampleSpawnCount: 16 };
    const first = buildWorldSpawnLootDependencyGraph(input);
    const second = buildWorldSpawnLootDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0", lootGeneratorVersion: "0.1.0" });
    expect(first.artifact.worldHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.spawnCount).toBeGreaterThan(0);
    expect(first.artifact.sampledSpawnCount).toBeLessThanOrEqual(16);
    expect(first.artifact.lootCount).toBeGreaterThan(0);
    expect(first.artifact.dropCount).toBeGreaterThan(first.artifact.lootCount);
    expect(first.summary.lootSourceSpawnCount).toBeGreaterThan(0);
    expect(first.summary.dropItemIds.length).toBe(first.summary.dropCount);
    expect(first.summary.structureLinkedSpawnCount).toBeGreaterThan(0);
    expect(first.nodes.some(node => node.key.startsWith("loot:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("loot-item:"))).toBe(true);
    expect(first.nodes.some(node => node.generatorId === "content.generator" && node.kind === "loot")).toBe(true);
    expect(first.summary.unresolvedReferenceTypes["species-definition"]).toBe(first.summary.sampledSpawnCount);
    expect(first.summary.unresolvedReferenceTypes["asset-binding"]).toBe(first.summary.dropCount);
    expect(first.summary.unresolvedReferenceCount).toBe(first.summary.sampledSpawnCount + first.summary.dropCount);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects unsupported rules, invalid radius, and spawn sample bounds", () => {
    expect(() => buildWorldSpawnLootDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported world spawn loot graph rules version");
    expect(() => buildWorldSpawnLootDependencyGraph({ seed: "seed", radius: 15 })).toThrow("radius must be an integer from 16 to 64");
    expect(() => buildWorldSpawnLootDependencyGraph({ seed: "seed", sampleSpawnCount: 0 })).toThrow("sampleSpawnCount must be an integer from 1 to 64");
    expect(() => buildWorldSpawnLootDependencyGraph({ seed: "seed", sampleSpawnCount: 65 })).toThrow("sampleSpawnCount must be an integer from 1 to 64");
    expect(WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION).toBe("world-spawn-loot-graph-rules.v1");
  });
});
