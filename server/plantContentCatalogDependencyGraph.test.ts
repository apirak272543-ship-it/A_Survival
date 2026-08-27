import { describe, expect, it } from "vitest";
import { buildPlantContentCatalogDependencyGraph, PLANT_CONTENT_CATALOG_GRAPH_RULES_VERSION } from "./generators/plantContentCatalogDependencyGraph";

describe("plant content catalog dependency graph", () => {
  it("is deterministic and links the real 300-entry plant owner to catalog category assets", () => {
    const input = { seed: "plant-catalog-seed", samplePlantCount: 16, samplePerCategory: 8 };
    const first = buildPlantContentCatalogDependencyGraph(input);
    const second = buildPlantContentCatalogDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ generatorId: "plant.catalog", generatorVersion: "1.0.0", seed: "plant-catalog-seed", plantCount: 300, sampledPlantCount: 16 });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.catalogHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary.plantCount).toBe(300);
    expect(first.summary.sampledPlantCount).toBe(16);
    expect(first.summary.familyIds.length).toBeGreaterThan(1);
    expect(first.summary.biomeIds).toEqual(["obsidian-frontier"]);
    expect(first.summary.soilIds.length).toBeGreaterThan(1);
    expect(first.summary.seedDefinitionIds).toHaveLength(16);
    expect(first.summary.harvestDefinitionIds).toHaveLength(16);
    expect(first.nodes.some(node => node.key.startsWith("plant-catalog:"))).toBe(true);
    expect(first.nodes.some(node => node.key.startsWith("plant:plant-001"))).toBe(true);
    expect(first.nodes.some(node => node.key === "asset:a-survival.content.plant")).toBe(true);
    expect(first.nodes.some(node => node.key === "asset:a-survival.content.seed")).toBe(true);
    expect(first.summary.unresolvedReferenceTypes["biome-context"]).toBe(16);
    expect(first.summary.unresolvedReferenceTypes["soil-context"]).toBe(16);
    expect(first.summary.unresolvedReferenceTypes["seed-definition"]).toBe(16);
    expect(first.summary.unresolvedReferenceTypes["harvest-definition"]).toBe(16);
    expect(first.summary.unresolvedReferenceTypes["plant-asset"]).toBe(16);
    expect(first.summary.unresolvedReferenceTypes["seed-asset"]).toBe(16);
    expect(first.summary.unresolvedReferenceCount).toBe(96);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("keeps unsupported plant rules and sampling outside the bounded preview contract", () => {
    expect(() => buildPlantContentCatalogDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported plant content catalog graph rules version");
    expect(() => buildPlantContentCatalogDependencyGraph({ seed: "seed", samplePlantCount: 0 })).toThrow("samplePlantCount must be an integer from 1 to 32");
    expect(() => buildPlantContentCatalogDependencyGraph({ seed: "seed", samplePlantCount: 33 })).toThrow("samplePlantCount must be an integer from 1 to 32");
    expect(() => buildPlantContentCatalogDependencyGraph({ seed: "seed", samplePerCategory: 0 })).toThrow("samplePerCategory must be an integer from 1 to 8");
    expect(() => buildPlantContentCatalogDependencyGraph({ seed: "seed", samplePerCategory: 9 })).toThrow("samplePerCategory must be an integer from 1 to 8");
    expect(PLANT_CONTENT_CATALOG_GRAPH_RULES_VERSION).toBe("plant-content-catalog-graph-rules.v1");
  });
});
