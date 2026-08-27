import { describe, expect, it } from "vitest";
import { buildStructureBlockContentCatalogDependencyGraph, STRUCTURE_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION } from "./generators/structureBlockContentCatalogDependencyGraph";

describe("structure block content catalog dependency graph", () => {
  it("is deterministic and links real structure, block, and catalog owners", () => {
    const input = { seed: "world-structure-seed", radius: 32, blueprintIds: ["compound-frontier-farm", "object-frontier-lantern"], sampleBlockCount: 24, samplePerCategory: 8 };
    const first = buildStructureBlockContentCatalogDependencyGraph(input);
    const second = buildStructureBlockContentCatalogDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0", structureGeneratorVersion: "1.0.0", catalogGeneratorVersion: "1.0.0", sampledBlockCount: 24 });
    expect(first.artifact.worldHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.structureHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.catalogHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary.structureCount).toBeGreaterThan(0);
    expect(first.summary.sampledBlockCount).toBeGreaterThan(0);
    expect(first.summary.blockIds).toContain("obstacle.obsidian.slab");
    expect(first.summary.structureIds.length).toBe(first.summary.structureCount);
    expect(first.nodes.some(node => node.key === "structure-blueprint:compound-frontier-farm")).toBe(true);
    expect(first.nodes.some(node => node.key === "structure-blueprint:object-frontier-lantern")).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("world-structure-blocks:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("structure-block:"))).toBe(true);
    expect(first.summary.unresolvedReferenceTypes.asset).toBeGreaterThan(0);
    expect(first.summary.unresolvedReferenceTypes["block-item-definition"]).toBeGreaterThan(0);
    expect(first.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects unsupported rules, unknown blueprints, and out-of-bounds sampling before generation", () => {
    expect(() => buildStructureBlockContentCatalogDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported structure block content catalog graph rules version");
    expect(() => buildStructureBlockContentCatalogDependencyGraph({ seed: "seed", radius: 15 })).toThrow("radius must be an integer from 16 to 64");
    expect(() => buildStructureBlockContentCatalogDependencyGraph({ seed: "seed", sampleBlockCount: 0 })).toThrow("sampleBlockCount must be an integer from 1 to 48");
    expect(() => buildStructureBlockContentCatalogDependencyGraph({ seed: "seed", blueprintIds: ["unknown-blueprint"] })).toThrow("Unknown structure blueprint");
    expect(() => buildStructureBlockContentCatalogDependencyGraph({ seed: "seed", blueprintIds: Array.from({ length: 6 }, (_, index) => `blueprint-${index}`) })).toThrow("blueprintIds must contain at most 5 unique blueprints");
    expect(STRUCTURE_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION).toBe("structure-block-content-catalog-graph-rules.v1");
  });
});
