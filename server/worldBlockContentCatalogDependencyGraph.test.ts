import { describe, expect, it } from "vitest";
import { buildWorldBlockContentCatalogDependencyGraph, WORLD_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION } from "./generators/worldBlockContentCatalogDependencyGraph";

describe("world block content catalog dependency graph", () => {
  it("is deterministic and keeps real world/block/catalog references visible", () => {
    const input = { seed: "world-structure-seed", radius: 32, sampleBlockCount: 24, samplePerCategory: 8 };
    const first = buildWorldBlockContentCatalogDependencyGraph(input);
    const second = buildWorldBlockContentCatalogDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", sampledBlockCount: 24, worldGeneratorVersion: "0.1.0", catalogGeneratorVersion: "1.0.0" });
    expect(first.artifact.worldHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.catalogHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary.worldBlockCount).toBeGreaterThan(first.summary.sampledBlockCount);
    expect(first.summary.blockIds.length).toBeGreaterThan(0);
    expect(first.summary.resourceDefinitionIds).toContain("ore.aether.block");
    expect(first.nodes.some(node => node.key.startsWith("world:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("block-definition:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("world-block:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("world-resource:"))).toBe(true);
    expect(first.summary.unresolvedReferenceTypes["block-item-definition"]).toBeGreaterThan(0);
    expect(first.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects unsupported rules and out-of-bounds sampling before generation", () => {
    expect(() => buildWorldBlockContentCatalogDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported world block content catalog graph rules version");
    expect(() => buildWorldBlockContentCatalogDependencyGraph({ seed: "seed", radius: 15 })).toThrow("radius must be an integer from 16 to 64");
    expect(() => buildWorldBlockContentCatalogDependencyGraph({ seed: "seed", sampleBlockCount: 0 })).toThrow("sampleBlockCount must be an integer from 1 to 48");
    expect(() => buildWorldBlockContentCatalogDependencyGraph({ seed: "seed", sampleBlockCount: 49 })).toThrow("sampleBlockCount must be an integer from 1 to 48");
    expect(() => buildWorldBlockContentCatalogDependencyGraph({ seed: "seed", samplePerCategory: 9 })).toThrow("samplePerCategory must be an integer from 1 to 8");
    expect(WORLD_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION).toBe("world-block-content-catalog-graph-rules.v1");
  });
});
