import { describe, expect, it } from "vitest";
import { getPlantDefinition } from "../client/src/game/data/plantCatalog";
import { evaluatePlantEcology } from "../client/src/game/systems/plantEcologyPolicy";

describe("plant ecology policy", () => {
  it("accepts a catalog plant when soil and biome match and returns a bounded advisory", () => {
    const plant = getPlantDefinition("plant-001")!;
    const assessment = evaluatePlantEcology({ plantId: plant.id, soilId: plant.compatibleSoils[0], biome: plant.biomeTags[0], stage: "sprout", waterScore: 0.8, nutrientScore: 0.7, pestPressure: 0.1, season: "rainwake", seasonScore: 0.9 });
    expect(assessment).toMatchObject({ policyVersion: "plant-ecology-policy.v1", plantId: plant.id, displayName: plant.displayName, family: plant.family, soilId: plant.compatibleSoils[0], biome: plant.biomeTags[0], compatibility: { soilCompatible: true, biomeCompatible: true, accepted: true }, lifecycle: { stage: "sprout", stageIndex: 1, progress01: 0.333, growthSeconds: plant.growthSeconds, matureOnlyHarvest: true }, advisory: { status: "eligible" } });
    expect(assessment.advisory.proposedGrowthMultiplier).toBeGreaterThanOrEqual(0.5);
    expect(assessment.advisory.proposedGrowthMultiplier).toBeLessThanOrEqual(1.1);
    expect(assessment.effect.power).toBeLessThanOrEqual(8);
  });

  it("rejects incompatible soil or biome without proposing a growth adjustment", () => {
    const plant = getPlantDefinition("plant-001")!;
    const assessment = evaluatePlantEcology({ plantId: plant.id, soilId: "aether-crystal", biome: "void", stage: "seed", waterScore: 1, nutrientScore: 1, pestPressure: 0, season: "ashfall", seasonScore: 1 });
    expect(assessment.compatibility).toEqual({ soilCompatible: false, biomeCompatible: false, accepted: false });
    expect(assessment.advisory).toMatchObject({ status: "incompatible", proposedGrowthMultiplier: null });
    expect(assessment.advisory.reason).toContain("compatibleSoils");
  });

  it("keeps missing fictional factors fail-closed and names the absent runtime owners", () => {
    const plant = getPlantDefinition("plant-002")!;
    const assessment = evaluatePlantEcology({ plantId: plant.id, soilId: plant.compatibleSoils[0], biome: plant.biomeTags[0], stage: "mature" });
    expect(assessment).toMatchObject({ compatibility: { accepted: true }, advisory: { status: "missing-factors", proposedGrowthMultiplier: null }, factors: { waterScore: null, nutrientScore: null, pestPressure: null, season: null, seasonScore: null }, runtimePolicy: { generatedOnce: true, runtimeMutationAllowed: false, playerVisible: false, cacheable: false, networkPersistence: false } });
    expect(assessment.missingRuntimeOwners).toEqual(["nutrient-system", "pest-system", "season-system"]);
    expect(assessment.advisory.reason).toContain("no runtime growth adjustment");
  });

  it("normalizes factor values and preserves mature-only lifecycle semantics", () => {
    const plant = getPlantDefinition("plant-003")!;
    const assessment = evaluatePlantEcology({ plantId: plant.seedItemId, soilId: plant.compatibleSoils[0], biome: plant.biomeTags[0], stage: "mature", waterScore: 2, nutrientScore: -1, pestPressure: 0.4, season: "embertide", seasonScore: 0.6 });
    expect(assessment.plantId).toBe(plant.id);
    expect(assessment.lifecycle).toMatchObject({ stage: "mature", stageIndex: 3, progress01: 1, matureOnlyHarvest: true });
    expect(assessment.factors).toMatchObject({ waterScore: 1, nutrientScore: 0, pestPressure: 0.4, season: "embertide", seasonScore: 0.6 });
  });

  it("fails closed for unknown plants, stages and malformed enum values", () => {
    expect(() => evaluatePlantEcology({ plantId: "future-plant-999", stage: "seed" })).toThrow("Unknown plant definition");
    expect(() => evaluatePlantEcology({ plantId: "plant-001", stage: "flowering" })).toThrow("stage must be one of seed, sprout, young or mature");
    const assessment = evaluatePlantEcology({ plantId: "plant-001", soilId: "future-soil", biome: "future-biome", stage: "seed", season: "future-season", waterScore: "fast", nutrientScore: Infinity, pestPressure: null, seasonScore: NaN });
    expect(assessment).toMatchObject({ soilId: null, biome: null, compatibility: { soilCompatible: false, biomeCompatible: false, accepted: false }, factors: { waterScore: null, nutrientScore: null, pestPressure: null, season: null, seasonScore: null } });
  });

  it("does not claim real ecology simulation or state writes", () => {
    const assessment = evaluatePlantEcology({ plantId: "plant-001", soilId: "terra-loam", biome: "temperate", stage: "young", waterScore: 0.5, nutrientScore: 0.5, pestPressure: 0.5, season: "frostveil", seasonScore: 0.5 });
    expect(assessment.runtimePolicy).toEqual({ generatedOnce: true, runtimeMutationAllowed: false, playerVisible: false, cacheable: false, networkPersistence: false });
    expect(assessment.missingRuntimeOwners).toHaveLength(3);
  });
});
