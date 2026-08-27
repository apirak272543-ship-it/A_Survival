import { describe, expect, it } from "vitest";
import { buildProceduralContentCatalogDependencyGraph, PROCEDURAL_CONTENT_CATALOG_GRAPH_RULES_VERSION } from "./generators/proceduralContentCatalogDependencyGraph";

describe("procedural content catalog dependency graph", () => {
  it("is deterministic and keeps procedural weapon/catalog/asset references explicit", () => {
    const input = { seed: "procedural-catalog-seed", count: 8, category: "melee" as const, samplePerCategory: 8 };
    const first = buildProceduralContentCatalogDependencyGraph(input);
    const second = buildProceduralContentCatalogDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ generatorId: "content.generator", generatorVersion: "0.1.0", seed: "procedural-catalog-seed", weaponCount: 8, category: "melee" });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.catalogHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary.weaponCount).toBe(8);
    expect(new Set(first.summary.generatedWeaponIds).size).toBe(8);
    expect(first.summary.baseTypes.length).toBeGreaterThan(0);
    expect(first.summary.assetIds.length).toBeGreaterThan(0);
    expect(first.summary.catalogCategoryIds).toContain("weapon-sword");
    expect(first.nodes.some(node => node.key.startsWith("procedural-content:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("procedural-item:"))).toBe(true);
    expect(first.nodes.some(node => node.generatorId === "content.generator" && node.kind === "item")).toBe(true);
    expect(first.summary.unresolvedReferenceTypes["catalog-definition"]).toBe(8);
    expect(first.summary.unresolvedReferenceTypes["asset-binding"]).toBe(8);
    expect(first.summary.unresolvedReferenceCount).toBeGreaterThanOrEqual(16);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("retains magic category gaps as blockers instead of inventing catalog categories", () => {
    const result = buildProceduralContentCatalogDependencyGraph({ seed: "magic-catalog-seed", count: 8, category: "magic", samplePerCategory: 1 });

    expect(result.artifact.category).toBe("magic");
    expect(result.summary.weaponCount).toBe(8);
    expect(result.summary.baseTypes.every(baseType => ["staff", "wand", "spell-weapon"].includes(baseType))).toBe(true);
    expect(result.summary.unresolvedReferenceTypes["catalog-category"]).toBe(8);
    expect(result.unresolvedReferences.some(reference => reference.referenceType === "catalog-category" && reference.referenceId === "magic")).toBe(true);
    expect(result.graph.valid).toBe(false);
  });

  it("rejects unsupported rules, count, and catalog sample bounds", () => {
    expect(() => buildProceduralContentCatalogDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported procedural content catalog graph rules version");
    expect(() => buildProceduralContentCatalogDependencyGraph({ seed: "seed", count: 0 })).toThrow("count must be an integer from 1 to 8");
    expect(() => buildProceduralContentCatalogDependencyGraph({ seed: "seed", count: 9 })).toThrow("count must be an integer from 1 to 8");
    expect(() => buildProceduralContentCatalogDependencyGraph({ seed: "seed", samplePerCategory: 0 })).toThrow("samplePerCategory must be an integer from 1 to 8");
    expect(() => buildProceduralContentCatalogDependencyGraph({ seed: "seed", samplePerCategory: 9 })).toThrow("samplePerCategory must be an integer from 1 to 8");
    expect(PROCEDURAL_CONTENT_CATALOG_GRAPH_RULES_VERSION).toBe("procedural-content-catalog-graph-rules.v1");
  });
});
