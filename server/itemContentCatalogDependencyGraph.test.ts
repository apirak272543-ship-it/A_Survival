import { describe, expect, it } from "vitest";
import { buildItemContentCatalogDependencyGraph } from "./generators/itemContentCatalogDependencyGraph";

describe("item content catalog dependency graph", () => {
  it("derives a deterministic item artifact and catalog references from real generators", () => {
    const first = buildItemContentCatalogDependencyGraph({ seed: "item-catalog-seed", itemId: "obsidian-rift-blade", samplePerCategory: 1 });
    const second = buildItemContentCatalogDependencyGraph({ seed: "item-catalog-seed", itemId: "obsidian-rift-blade", samplePerCategory: 1 });

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ generatorId: "item.universal", generatorVersion: "1.0.0", seed: "item-catalog-seed", itemId: "obsidian-rift-blade", category: "weapon-sword" });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.balanceScore).toBeLessThanOrEqual(100);
    expect(first.summary.catalogDefinitionCount).toBeGreaterThan(0);
    expect(first.summary.sampledCatalogNodeCount).toBeGreaterThan(0);
    expect(first.summary.referenceCount).toBeGreaterThan(0);
    expect(first.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(first.unresolvedReferences).toEqual(expect.arrayContaining([expect.objectContaining({ dependencyKey: "content:obsidian-shard", source: "item.resources.mining" })]));
    expect(first.graph.valid).toBe(false);
    expect(first.graph.nodes.some(node => node.key.startsWith("item:obsidian-rift-blade:"))).toBe(true);
    expect(first.graph.nodes.some(node => node.key === "content:weapon-sword-001")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("keeps rules, sample, budget and item-id bounds explicit", () => {
    expect(() => buildItemContentCatalogDependencyGraph({ seed: "item-catalog-seed", rulesVersion: "item-content-catalog-graph-rules.v2" })).toThrow("Unsupported item content catalog graph rules version");
    expect(() => buildItemContentCatalogDependencyGraph({ seed: "item-catalog-seed", samplePerCategory: 0 })).toThrow("samplePerCategory");
    expect(() => buildItemContentCatalogDependencyGraph({ seed: "item-catalog-seed", maxPowerBudget: 101 })).toThrow("maxPowerBudget");
    expect(() => buildItemContentCatalogDependencyGraph({ seed: "item-catalog-seed", itemId: "Bad Item" })).toThrow("itemId");
  });
});
