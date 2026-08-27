import { describe, expect, it } from "vitest";
import { ALL_ITEMS, type ItemDefinition } from "../client/src/game/data/catalog";
import { getPlantsForBiome, getPlantsForSoil, PLANT_CATALOG, PLANT_ITEMS, type PlantDefinition } from "../client/src/game/data/plantCatalog";
import {
  PLANT_CATALOG_COVERAGE_MAX_PLANTS,
  PLANT_CATALOG_COVERAGE_MAX_SAMPLE,
  PLANT_CATALOG_COVERAGE_RULES_VERSION,
  buildPlantCatalogCoverageDependencyGraph,
  buildPlantCatalogCoverageDependencyGraphFromSources,
  readActivePlantCatalogCoverageSources,
} from "./generators/plantCatalogCoverageDependencyGraph";

describe("plant catalog coverage dependency graph", () => {
  it("audits the current 300-plant catalog deterministically and keeps biome/soil coverage data-driven", () => {
    const input = { seed: "plant-catalog-coverage-seed", sampleCount: 48 };
    const first = buildPlantCatalogCoverageDependencyGraph(input);
    const second = buildPlantCatalogCoverageDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({
      generatorId: "plant.catalog.coverage",
      generatorVersion: "1.0.0",
      schemaVersion: "a-survival.plant-catalog-coverage.v1",
      seed: input.seed,
      rulesVersion: PLANT_CATALOG_COVERAGE_RULES_VERSION,
      plantCount: 300,
      plantItemCount: 300,
      allItemCount: ALL_ITEMS.length,
      sampleCount: 48,
    });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary).toMatchObject({
      plantCount: 300,
      plantItemCount: 300,
      sampleCount: 48,
      validRecordCount: 48,
      invalidRecordCount: 0,
      uniquePlantIdCount: 300,
      uniqueSeedIdCount: 300,
      unresolvedReferenceCount: 1,
    });
    expect(first.summary.biomeCounts.desert).toBe(0);
    expect(first.summary.issueCounts["distribution-gap"]).toBe(1);
    expect(Object.entries(first.summary.biomeCounts).every(([biome, count]) => biome === "desert" ? count === 0 : count > 0)).toBe(true);
    expect(Object.values(first.summary.soilCounts).every(count => count > 0)).toBe(true);
    expect(first.summary.biomeCounts.volcanic).toBe(getPlantsForBiome("volcanic").length);
    expect(first.summary.biomeCounts.arcane).toBe(getPlantsForBiome("arcane").length);
    expect(first.summary.soilCounts["ashen-volcanic"]).toBe(getPlantsForSoil("ashen-volcanic").length);
    expect(first.summary.soilCounts["aether-crystal"]).toBe(getPlantsForSoil("aether-crystal").length);
    expect(first.summary.assetIdCounts["items.seed"]).toBeGreaterThan(0);
    expect(first.summary.assetIdCounts["art.obsidian.crystal-fern"]).toBeGreaterThan(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("preserves canonical seed item links, stages, yield ranges, and logical asset references", () => {
    const output = buildPlantCatalogCoverageDependencyGraph({ seed: "plant-catalog-link-seed", sampleCount: 64 });

    expect(PLANT_CATALOG).toHaveLength(300);
    expect(PLANT_ITEMS).toHaveLength(300);
    expect(output.records.every(record => record.seedItemId.startsWith("seed-plant-") && record.growthStages.join("/") === "seed/sprout/young/mature")).toBe(true);
    expect(output.records.every(record => record.compatibleSoils.length > 0 && record.biomeTags.length > 0 && record.yieldItemId.length > 0 && record.assetId.length > 0)).toBe(true);
    expect(output.summary.familyCounts.crop).toBeGreaterThan(0);
    expect(output.summary.familyCounts.herb).toBeGreaterThan(0);
    expect(output.summary.familyCounts.flower).toBeGreaterThan(0);
    expect(output.summary.familyCounts.tree).toBeGreaterThan(0);
    expect(output.summary.familyCounts.fungus).toBeGreaterThan(0);
  });

  it("blocks malformed ids, distribution fields, seed links, stage data, yields, effects, and assets", () => {
    const sources = readActivePlantCatalogCoverageSources();
    const invalidPlant: PlantDefinition = {
      ...sources.plants[0]!,
      id: "bad-plant" as PlantDefinition["id"],
      seedItemId: "seed-missing",
      displayName: "",
      botanicalReference: "",
      biomeTags: ["not-a-biome" as PlantDefinition["biomeTags"][number]],
      compatibleSoils: [],
      growthStages: ["mature", "seed", "young", "sprout"],
      growthSeconds: 0,
      yieldQuantity: [0, 0],
      assetId: "",
      seedStackLimit: 65,
      effect: { ...sources.plants[0]!.effect, power: 0 },
    };
    const invalidSeedItem: ItemDefinition = { ...sources.plantItems[0]!, id: "other-item" };
    const output = buildPlantCatalogCoverageDependencyGraphFromSources(
      { seed: "plant-catalog-invalid-seed", sampleCount: 1 },
      { plants: [invalidPlant], plantItems: [invalidSeedItem], allItems: sources.allItems },
    );

    expect(output.summary.invalidRecordCount).toBeGreaterThan(0);
    expect(output.summary.issueCounts["invalid-plant-id"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["invalid-seed-id"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["missing-display"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["missing-reference"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["invalid-biome"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["missing-soil"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["invalid-stages"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["invalid-growth"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["invalid-yield"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["invalid-effect"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["missing-asset"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["missing-seed-item"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["invalid-seed-item"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["distribution-gap"]).toBeGreaterThan(0);
    expect(output.graph.valid).toBe(false);
    expect(output.unresolvedReferences.some(reference => reference.referenceType === "missing-seed-item")).toBe(true);
  });

  it("blocks duplicate plant and seed IDs and detects seed soil/stack mismatches", () => {
    const sources = readActivePlantCatalogCoverageSources();
    const duplicate: PlantDefinition = { ...sources.plants[0]!, compatibleSoils: ["red-dune"], seedItemId: sources.plants[0]!.seedItemId };
    const mismatchedSeed: ItemDefinition = { ...sources.plantItems[0]!, soilId: "aether-crystal", stackLimit: 1 };
    const output = buildPlantCatalogCoverageDependencyGraphFromSources(
      { seed: "plant-catalog-duplicate-seed", sampleCount: 2 },
      { ...sources, plants: [sources.plants[0]!, duplicate], plantItems: [mismatchedSeed] },
    );

    expect(output.summary.uniquePlantIdCount).toBe(1);
    expect(output.summary.uniqueSeedIdCount).toBe(1);
    expect(output.summary.issueCounts["duplicate-plant-id"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["duplicate-seed-id"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["seed-soil-mismatch"]).toBeGreaterThan(0);
    expect(output.summary.issueCounts["seed-stack-mismatch"]).toBeGreaterThan(0);
    expect(output.graph.valid).toBe(false);
  });

  it("changes hashes when seed, plant, seed-item, all-item, or sample input changes", () => {
    const sources = readActivePlantCatalogCoverageSources();
    const first = buildPlantCatalogCoverageDependencyGraphFromSources({ seed: "plant-catalog-hash-a", sampleCount: 2 }, sources);
    const differentSeed = buildPlantCatalogCoverageDependencyGraphFromSources({ seed: "plant-catalog-hash-b", sampleCount: 2 }, sources);
    const differentPlant = buildPlantCatalogCoverageDependencyGraphFromSources({ seed: "plant-catalog-hash-a", sampleCount: 2 }, { ...sources, plants: [{ ...sources.plants[0]!, displayName: "Changed plant" }, ...sources.plants.slice(1)] });
    const differentSeedItem = buildPlantCatalogCoverageDependencyGraphFromSources({ seed: "plant-catalog-hash-a", sampleCount: 2 }, { ...sources, plantItems: [{ ...sources.plantItems[0]!, name: "Changed seed" }, ...sources.plantItems.slice(1)] });
    const differentAllItem = buildPlantCatalogCoverageDependencyGraphFromSources({ seed: "plant-catalog-hash-a", sampleCount: 2 }, { ...sources, allItems: [{ ...sources.allItems[0]!, name: "Changed item" }, ...sources.allItems.slice(1)] });
    const differentSample = buildPlantCatalogCoverageDependencyGraphFromSources({ seed: "plant-catalog-hash-a", sampleCount: 3 }, sources);

    expect(first.artifact.contentHash).not.toBe(differentSeed.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentPlant.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentSeedItem.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentAllItem.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentSample.artifact.contentHash);
  });

  it("rejects unsupported rules, invalid samples, empty sources, and unbounded catalogs", () => {
    const sources = readActivePlantCatalogCoverageSources();
    expect(() => buildPlantCatalogCoverageDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported plant catalog coverage rules version");
    expect(() => buildPlantCatalogCoverageDependencyGraph({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildPlantCatalogCoverageDependencyGraph({ seed: "seed", sampleCount: 0 })).toThrow(`sampleCount must be an integer from 1 to ${PLANT_CATALOG_COVERAGE_MAX_SAMPLE}`);
    expect(() => buildPlantCatalogCoverageDependencyGraphFromSources({ seed: "seed" }, { ...sources, plants: [] })).toThrow("plants must contain 1–512 definitions");
    expect(() => buildPlantCatalogCoverageDependencyGraphFromSources({ seed: "seed" }, { ...sources, plants: Array.from({ length: PLANT_CATALOG_COVERAGE_MAX_PLANTS + 1 }, (_, index) => ({ ...sources.plants[0]!, id: `plant-${String(index + 1).padStart(3, "0")}` })) })).toThrow("plants must contain 1–512 definitions");
    expect(() => buildPlantCatalogCoverageDependencyGraphFromSources({ seed: "seed" }, { ...sources, plantItems: Array.from({ length: PLANT_CATALOG_COVERAGE_MAX_PLANTS + 1 }, (_, index) => ({ ...sources.plantItems[0]!, id: `seed-over-${index}` })) })).toThrow("plantItems must contain at most 512 definitions");
  });
});
