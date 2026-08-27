import { describe, expect, it } from "vitest";
import { buildWorldBiomeResourceContentCatalogDependencyGraph, WORLD_BIOME_RESOURCE_CONTENT_CATALOG_GRAPH_RULES_VERSION } from "./generators/worldBiomeResourceContentCatalogDependencyGraph";

describe("world biome resource content catalog dependency graph", () => {
  it("is deterministic and keeps real biome/resource references visible", () => {
    const input = { seed: "world-structure-seed", radius: 32, sampleResourceCount: 16, samplePerCategory: 8 };
    const first = buildWorldBiomeResourceContentCatalogDependencyGraph(input);
    const second = buildWorldBiomeResourceContentCatalogDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0", catalogGeneratorVersion: "1.0.0", sampledResourceCount: 16 });
    expect(first.artifact.worldHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.catalogHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary.biomeIds).toEqual(expect.arrayContaining(["ash-hills"]));
    expect(first.summary.biomeIds.length).toBeGreaterThan(1);
    expect(first.summary.resourceCount).toBeGreaterThan(0);
    expect(first.summary.sampledResourceCount).toBe(16);
    expect(first.summary.resourceDefinitionIds).toEqual(["ore.aether.block"]);
    expect(first.summary.biomeCellCounts[first.summary.biomeIds[0]!]).toBeGreaterThan(0);
    expect(first.nodes.some(node => node.key === "world:obsidian-frontier:" + first.artifact.worldHash)).toBe(true);
    expect(first.nodes.some(node => node.key === `biome:${first.summary.biomeIds[0]}`)).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("resource:resource-"))).toBe(true);
    expect(first.summary.unresolvedReferenceTypes["biome-definition"]).toBe(first.summary.biomeIds.length);
    expect(first.summary.unresolvedReferenceTypes["resource-definition"]).toBe(first.summary.sampledResourceCount);
    expect(first.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects unsupported rules, invalid radius, resource sample, and catalog sample bounds", () => {
    expect(() => buildWorldBiomeResourceContentCatalogDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported world biome resource content catalog graph rules version");
    expect(() => buildWorldBiomeResourceContentCatalogDependencyGraph({ seed: "seed", radius: 15 })).toThrow("radius must be an integer from 16 to 64");
    expect(() => buildWorldBiomeResourceContentCatalogDependencyGraph({ seed: "seed", sampleResourceCount: 0 })).toThrow("sampleResourceCount must be an integer from 1 to 64");
    expect(() => buildWorldBiomeResourceContentCatalogDependencyGraph({ seed: "seed", sampleResourceCount: 65 })).toThrow("sampleResourceCount must be an integer from 1 to 64");
    expect(() => buildWorldBiomeResourceContentCatalogDependencyGraph({ seed: "seed", samplePerCategory: 9 })).toThrow("samplePerCategory must be an integer from 1 to 8");
    expect(WORLD_BIOME_RESOURCE_CONTENT_CATALOG_GRAPH_RULES_VERSION).toBe("world-biome-resource-content-catalog-graph-rules.v1");
  });
});
