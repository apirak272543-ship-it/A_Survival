import { describe, expect, it } from "vitest";
import { PLANT_CATALOG } from "../client/src/game/data/plantCatalog";
import { buildPlantCatalogCoverageReport } from "./plantCatalogCoverageContract";

describe("plant catalog coverage contract", () => {
  it("proves the canonical catalog has 300 structurally complete records across real categories", () => {
    const report = buildPlantCatalogCoverageReport();

    expect(report).toMatchObject({
      schemaVersion: "a-survival.plant-catalog-coverage.v1",
      auditOnly: true,
      exportOnly: true,
      publishReady: false,
      catalogCount: 300,
      expectedCount: 300,
      valid: true,
      coverage: {
        biomeTags: {
          temperate: expect.any(Number),
          wetland: expect.any(Number),
          tropical: expect.any(Number),
          dry: expect.any(Number),
          desert: expect.any(Number),
          alpine: expect.any(Number),
          volcanic: expect.any(Number),
          arcane: expect.any(Number),
          void: expect.any(Number),
        },
        soils: {
          "terra-loam": expect.any(Number),
          "ashen-volcanic": expect.any(Number),
          "red-dune": expect.any(Number),
          "verdant-humus": expect.any(Number),
          "aether-crystal": expect.any(Number),
        },
        families: {
          crop: expect.any(Number),
          herb: expect.any(Number),
          flower: expect.any(Number),
          tree: expect.any(Number),
          fungus: expect.any(Number),
          crystal: expect.any(Number),
        },
        effects: {
          food: expect.any(Number),
          healing: expect.any(Number),
          repellent: expect.any(Number),
          aether: expect.any(Number),
          crafting: expect.any(Number),
        },
        growthStages: { completeFourStageRecords: 300, expectedStages: ["seed", "sprout", "young", "mature"] },
        assets: { recordCount: 300, uniqueAssetIdCount: expect.any(Number), missingAssetIdCount: 0 },
      },
      issues: [],
    });
    for (const biome of ["temperate", "wetland", "tropical", "dry", "alpine", "volcanic", "arcane", "void"] as const) expect(report.coverage.biomeTags[biome]).toBeGreaterThan(0);
    expect(report.coverage.biomeTags.desert).toBe(0);
    for (const count of Object.values(report.coverage.soils)) expect(count).toBeGreaterThan(0);
    for (const family of ["crop", "herb", "flower", "tree", "fungus"] as const) expect(report.coverage.families[family]).toBeGreaterThan(0);
    expect(report.coverage.families.crystal).toBe(0);
    for (const count of Object.values(report.coverage.effects)) expect(count).toBeGreaterThan(0);
    expect(report.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps the coverage hash deterministic and changes it when catalog content changes", () => {
    const first = buildPlantCatalogCoverageReport({ catalog: PLANT_CATALOG });
    const second = buildPlantCatalogCoverageReport({ catalog: PLANT_CATALOG });
    const changed = buildPlantCatalogCoverageReport({ catalog: PLANT_CATALOG.map((plant, index) => index === 0 ? { ...plant, assetId: "items.seed.changed" } : plant) });

    expect(first).toEqual(second);
    expect(changed.contentSha256).not.toBe(first.contentSha256);
    expect(changed.coverage.assets.uniqueAssetIdCount).toBe(first.coverage.assets.uniqueAssetIdCount + 1);
  });

  it("fails closed for malformed records and records the exact structural blockers", () => {
    const malformed = [{
      id: "plant-001",
      seedItemId: "seed-001",
      biomeTags: ["not-a-biome"],
      compatibleSoils: ["not-a-soil"],
      family: "not-a-family",
      effect: { kind: "not-an-effect" },
      growthStages: ["seed"],
      growthSeconds: 0,
      yieldItemId: "",
      yieldQuantity: [0, -1],
      referenceSource: "unknown",
    }];
    const report = buildPlantCatalogCoverageReport({ catalog: malformed, expectedCount: 1 });

    expect(report.valid).toBe(false);
    expect(report.catalogCount).toBe(1);
    expect(report.expectedCount).toBe(1);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "UNSUPPORTED_BIOME_TAG",
      "UNSUPPORTED_SOIL",
      "UNSUPPORTED_FAMILY",
      "UNSUPPORTED_EFFECT",
      "MISSING_ASSET_ID",
      "INVALID_GROWTH_STAGES",
      "INVALID_GROWTH_DURATION",
      "INVALID_YIELD",
      "UNSUPPORTED_REFERENCE_SOURCE",
    ]));
    expect(report.blockers.every(blocker => blocker.status === "missing-evidence")).toBe(true);
  });

  it("does not claim binary generation, registry writes, cache writes, runtime import, or gameplay mutation", () => {
    const report = buildPlantCatalogCoverageReport({ catalog: [] });

    expect(report.claims).toEqual({
      binaryAssetGeneration: false,
      registryWrite: false,
      cacheWrite: false,
      runtimeImport: false,
      playerVisible: false,
      growthSimulation: false,
      harvestMutation: false,
      activeManifestBinding: false,
    });
    expect(report.blockers.map(blocker => blocker.id)).toEqual(["active-manifest-binding", "runtime-distribution", "growth-harvest-playtest"]);
  });
});
