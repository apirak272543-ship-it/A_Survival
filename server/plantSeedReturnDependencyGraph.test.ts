import { describe, expect, it } from "vitest";
import { getItemDefinition, type ItemDefinition } from "../client/src/game/data/catalog";
import { PLANT_CATALOG } from "../client/src/game/data/plantCatalog";
import {
  PLANT_SEED_RETURN_MAX_QUANTITY,
  buildPlantSeedReturnDependencyGraph,
  buildPlantSeedReturnDependencyGraphFromSources,
  readActivePlantSeedReturnSources,
  type PlantSeedReturnSource,
} from "./generators/plantSeedReturnDependencyGraph";

function validReturnSource(plantId: string): PlantSeedReturnSource {
  const plant = PLANT_CATALOG.find(candidate => candidate.id === plantId)!;
  return {
    plantId: plant.id,
    seedDefinitionId: plant.seedItemId,
    harvestDefinitionId: plant.yieldItemId,
    returnedSeedDefinitionId: plant.seedItemId,
    returnedSeedQuantity: 1,
    harvestProvenanceType: "harvest",
    replantable: true,
    atomicConsumeRequired: true,
  };
}

describe("plant seed return dependency graph", () => {
  it("audits all 300 canonical plant records and exposes the missing seed-return chain", () => {
    const first = buildPlantSeedReturnDependencyGraph({ seed: "f06-canonical", sampleCount: PLANT_CATALOG.length });
    const second = buildPlantSeedReturnDependencyGraph({ seed: "f06-canonical", sampleCount: PLANT_CATALOG.length });

    expect(first.summary).toMatchObject({
      catalogCount: 300,
      sampleCount: 300,
      uniquePlantIdCount: 300,
      validRecordCount: 0,
      invalidRecordCount: 300,
      seedLinkedCount: 300,
      harvestLinkedCount: 300,
      returnedSeedCount: 0,
      replantableCount: 0,
      atomicConsumeRequiredCount: 300,
      missingReturnSeedCount: 300,
      itemDefinitionCount: 300,
      behavior: {
        returnMustBeHarvestProvenance: true,
        returnedSeedMustMatchPlantedSeed: true,
        returnedSeedMustBeReplantable: true,
        plantingConsumeMustBeAtomic: true,
        outputIsAuditOnly: true,
      },
    });
    expect(first.summary.issueCounts["return-seed-missing"]).toBe(300);
    expect(first.summary.issueCounts["replantable-false"]).toBe(300);
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("accepts a harvest-provenance return of the same seed with atomic replant requirements", () => {
    const plants = PLANT_CATALOG.map(plant => validReturnSource(plant.id));
    const itemDefinitions = plants.map(source => getItemDefinition(source.seedDefinitionId)).filter((item): item is ItemDefinition => Boolean(item));
    const output = buildPlantSeedReturnDependencyGraphFromSources(
      { seed: "f06-valid", sampleCount: 2 },
      { plants, itemDefinitions },
    );

    expect(output.summary).toMatchObject({
      catalogCount: 300,
      sampleCount: 2,
      uniquePlantIdCount: 300,
      validRecordCount: 300,
      invalidRecordCount: 0,
      seedLinkedCount: 300,
      harvestLinkedCount: 300,
      returnedSeedCount: 300,
      replantableCount: 300,
      atomicConsumeRequiredCount: 300,
      missingReturnSeedCount: 0,
      issueCounts: {},
    });
    expect(output.graph.valid).toBe(true);
  });

  it("turns duplicate, seed/harvest mismatch, wrong return item, provenance, quantity, and atomicity violations into blockers", () => {
    const base = validReturnSource("plant-001");
    const invalid: PlantSeedReturnSource = {
      ...base,
      seedDefinitionId: "seed-plant-002",
      harvestDefinitionId: "sword-001",
      returnedSeedDefinitionId: "sword-001",
      returnedSeedQuantity: PLANT_SEED_RETURN_MAX_QUANTITY + 1,
      harvestProvenanceType: "drop",
      replantable: false,
      atomicConsumeRequired: false,
    };
    const output = buildPlantSeedReturnDependencyGraphFromSources(
      { seed: "f06-invalid", sampleCount: 2 },
      { plants: [base, base, invalid], itemDefinitions: [] },
    );

    expect(output.graph.valid).toBe(false);
    expect(output.summary.uniquePlantIdCount).toBe(1);
    expect(output.summary.issueCounts["duplicate-plant-id"]).toBe(2);
    expect(output.summary.issueCounts["seed-link-mismatch"]).toBe(1);
    expect(output.summary.issueCounts["harvest-link-mismatch"]).toBe(1);
    expect(output.summary.issueCounts["return-seed-mismatch"]).toBe(1);
    expect(output.summary.issueCounts["return-seed-category-invalid"]).toBe(1);
    expect(output.summary.issueCounts["return-quantity-invalid"]).toBe(1);
    expect(output.summary.issueCounts["provenance-invalid"]).toBe(1);
    expect(output.summary.issueCounts["replantable-false"]).toBe(1);
    expect(output.summary.issueCounts["atomic-consume-required"]).toBe(1);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("detects missing returned seed definitions and invalid item categories", () => {
    const base = validReturnSource("plant-003");
    const missing: PlantSeedReturnSource = { ...base, returnedSeedDefinitionId: "seed-does-not-exist" };
    const wrongCategory: PlantSeedReturnSource = { ...base, returnedSeedDefinitionId: "sword-001" };
    const output = buildPlantSeedReturnDependencyGraphFromSources(
      { seed: "f06-item-blockers", sampleCount: 2 },
      { plants: [missing, wrongCategory], itemDefinitions: [] },
    );

    expect(output.summary.issueCounts["return-seed-mismatch"]).toBe(2);
    expect(output.summary.issueCounts["return-seed-definition-missing"]).toBe(1);
    expect(output.summary.issueCounts["return-seed-category-invalid"]).toBe(1);
    expect(output.graph.valid).toBe(false);
  });

  it("changes the artifact hash when source data changes and rejects invalid bounds", () => {
    const base = validReturnSource("plant-004");
    const original = buildPlantSeedReturnDependencyGraphFromSources({ seed: "f06-hash", sampleCount: 1 }, { plants: [base], itemDefinitions: [] });
    const changed = buildPlantSeedReturnDependencyGraphFromSources({ seed: "f06-hash", sampleCount: 1 }, { plants: [{ ...base, returnedSeedQuantity: 2 }], itemDefinitions: [] });
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildPlantSeedReturnDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildPlantSeedReturnDependencyGraph({ seed: "f06", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildPlantSeedReturnDependencyGraph({ seed: "f06", sampleCount: PLANT_CATALOG.length + 1 })).toThrow(/sampleCount/);
  });

  it("keeps source and graph creation bounded for partial catalogs", () => {
    const base = validReturnSource("plant-005");
    const output = buildPlantSeedReturnDependencyGraphFromSources({ seed: "f06-partial", sampleCount: 1 }, { plants: [base], itemDefinitions: [] });
    expect(output.summary.catalogCount).toBe(1);
    expect(output.summary.sampleCount).toBe(1);
    expect(output.summary.issueCounts["catalog-size"]).toBe(1);
    expect(output.graph.valid).toBe(false);
  });
});
