import { describe, expect, it } from "vitest";
import { getItemDefinition } from "../client/src/game/data/catalog";
import { getWorldFarmCropStage, type WorldFarmPlot } from "../client/src/game/systems/worldFarmSystem";
import {
  PLANT_GROWTH_STAGE_GRAPH_RULES_VERSION,
  PLANT_GROWTH_STAGE_MAX_SAMPLE,
  buildPlantGrowthStageDependencyGraph,
  buildPlantGrowthStageDependencyGraphFromSources,
  readActivePlantGrowthStageSources,
} from "./generators/plantGrowthStageDependencyGraph";

describe("plant growth stage dependency graph", () => {
  it("audits the current 300-plant catalog deterministically and keeps the four stages ordered", () => {
    const input = { seed: "plant-growth-stage-seed", sampleCount: 32 };
    const first = buildPlantGrowthStageDependencyGraph(input);
    const second = buildPlantGrowthStageDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({
      generatorId: "plant.growth.stage",
      generatorVersion: "1.0.0",
      schemaVersion: "a-survival.plant-growth-stage.v1",
      seed: input.seed,
      rulesVersion: PLANT_GROWTH_STAGE_GRAPH_RULES_VERSION,
      plantCount: 300,
      plotCount: 4,
      sampleCount: 32,
    });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary).toMatchObject({
      plantCount: 300,
      plotCount: 4,
      sampleCount: 32,
      validRecordCount: 32,
      invalidRecordCount: 0,
      stageBoundaryViolationCount: 0,
      preMatureRewardViolationCount: 0,
      matureRewardViolationCount: 0,
      seedLinkViolationCount: 0,
      harvestLinkViolationCount: 0,
      catalogIntegrityViolationCount: 0,
      effectSafetyViolationCount: 0,
      mapScopeViolationCount: 0,
      unresolvedReferenceCount: 0,
    });
    expect(first.summary.observedStageCounts.seed).toBe(32);
    expect(first.summary.observedStageCounts.sprout).toBe(32);
    expect(first.summary.observedStageCounts.young).toBe(32);
    expect(first.summary.observedStageCounts.mature).toBe(32);
    expect(first.graph.valid).toBe(true);
    expect(first.graph.issues).toEqual([]);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.records.every(record => record.matureOnlyReward && record.rewardProvenanceType === "harvest")).toBe(true);
  });

  it("keeps stage threshold behavior explicit at 0%, 25%, 55%, and 100%", () => {
    const sources = readActivePlantGrowthStageSources();
    const plant = sources.plants[0]!;
    const plot: WorldFarmPlot = {
      ...sources.plots[0]!,
      plantId: plant.id,
      seedDefinitionId: plant.seedDefinitionId,
      seedInstanceId: "stage-boundary-seed",
      plantedAt: 1_700_000_000_000,
      growthDurationMs: plant.growthDurationMs,
      updatedAt: 1_700_000_000_000,
    };
    const start = plot.plantedAt!;

    expect(getWorldFarmCropStage(plot, start)).toBe("seed");
    expect(getWorldFarmCropStage(plot, start + Math.floor(plant.growthDurationMs * 0.25))).toBe("sprout");
    expect(getWorldFarmCropStage(plot, start + Math.floor(plant.growthDurationMs * 0.55))).toBe("young");
    expect(getWorldFarmCropStage(plot, start + plant.growthDurationMs)).toBe("mature");
  });

  it("blocks malformed links, unsafe effects, wrong map scope, and non-positive growth duration", () => {
    const sources = readActivePlantGrowthStageSources();
    const invalidPlant = {
      ...sources.plants[0]!,
      seedDefinitionId: "seed-missing",
      harvestDefinitionId: "material-missing",
      biomeId: "future-map" as "obsidian-frontier",
      growthDurationMs: 0,
      effect: { kind: "repel" as const, radius: 999, durationMs: 0, stackable: true as false, label: "unsafe" },
    };
    const output = buildPlantGrowthStageDependencyGraphFromSources(
      { seed: "plant-growth-invalid-seed", sampleCount: 1 },
      { ...sources, plants: [invalidPlant] },
    );

    expect(output.summary.invalidRecordCount).toBeGreaterThan(0);
    expect(output.summary.seedLinkViolationCount).toBeGreaterThan(0);
    expect(output.summary.harvestLinkViolationCount).toBeGreaterThan(0);
    expect(output.summary.effectSafetyViolationCount).toBeGreaterThan(0);
    expect(output.summary.mapScopeViolationCount).toBeGreaterThan(0);
    expect(output.summary.stageBoundaryViolationCount).toBeGreaterThan(0);
    expect(output.graph.valid).toBe(false);
    expect(output.unresolvedReferences.some(reference => reference.referenceType === "seed-link")).toBe(true);
    expect(output.unresolvedReferences.some(reference => reference.referenceType === "mature-reward")).toBe(true);
  });

  it("preserves mature-only reward semantics and canonical harvest definition links", () => {
    const sources = readActivePlantGrowthStageSources();
    const plant = sources.plants[1]!;
    const output = buildPlantGrowthStageDependencyGraphFromSources({ seed: "plant-growth-reward-seed", sampleCount: 2 }, { ...sources, plants: [plant] });
    const record = output.records[0]!;

    expect(record.preMatureHarvestAccepted).toBe(false);
    expect(record.matureHarvestAccepted).toBe(true);
    expect(record.matureOnlyReward).toBe(true);
    expect(record.rewardDefinitionId).toBe(plant.harvestDefinitionId);
    expect(record.rewardQuantity).toBeGreaterThan(0);
    expect(record.rewardProvenanceType).toBe("harvest");
    expect(getItemDefinition(plant.seedDefinitionId)?.category).toBe("seed");
    expect(getItemDefinition(plant.harvestDefinitionId)).toBeDefined();
  });

  it("changes hashes when seed, plant, plot, or sample input changes", () => {
    const sources = readActivePlantGrowthStageSources();
    const first = buildPlantGrowthStageDependencyGraphFromSources({ seed: "plant-growth-hash-a", sampleCount: 2 }, sources);
    const differentSeed = buildPlantGrowthStageDependencyGraphFromSources({ seed: "plant-growth-hash-b", sampleCount: 2 }, sources);
    const differentPlant = buildPlantGrowthStageDependencyGraphFromSources({ seed: "plant-growth-hash-a", sampleCount: 2 }, { ...sources, plants: [{ ...sources.plants[0]!, name: "Changed plant" }, ...sources.plants.slice(1)] });
    const differentPlot = buildPlantGrowthStageDependencyGraphFromSources({ seed: "plant-growth-hash-a", sampleCount: 2 }, { ...sources, plots: [{ ...sources.plots[0]!, soilId: "red-dune" }, ...sources.plots.slice(1)] });
    const differentSample = buildPlantGrowthStageDependencyGraphFromSources({ seed: "plant-growth-hash-a", sampleCount: 3 }, sources);

    expect(first.artifact.contentHash).not.toBe(differentSeed.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentPlant.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentPlot.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentSample.artifact.contentHash);
  });

  it("rejects unsupported rules, empty sources, invalid samples, and more than 300 plants", () => {
    const sources = readActivePlantGrowthStageSources();
    expect(() => buildPlantGrowthStageDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported plant growth stage graph rules version");
    expect(() => buildPlantGrowthStageDependencyGraph({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildPlantGrowthStageDependencyGraph({ seed: "seed", sampleCount: 0 })).toThrow(`sampleCount must be an integer from 1 to ${PLANT_GROWTH_STAGE_MAX_SAMPLE}`);
    expect(() => buildPlantGrowthStageDependencyGraphFromSources({ seed: "seed" }, { ...sources, plants: [] })).toThrow("plants must contain 1–300 definitions");
    expect(() => buildPlantGrowthStageDependencyGraphFromSources({ seed: "seed" }, { ...sources, plants: Array.from({ length: 301 }, (_, index) => ({ ...sources.plants[0]!, id: `plant-${String(index + 1).padStart(3, "0")}` })) })).toThrow("plants must contain 1–300 definitions");
    expect(() => buildPlantGrowthStageDependencyGraphFromSources({ seed: "seed", sampleCount: PLANT_GROWTH_STAGE_MAX_SAMPLE + 1 }, sources)).toThrow(`sampleCount must be an integer from 1 to ${PLANT_GROWTH_STAGE_MAX_SAMPLE}`);
    expect(() => buildPlantGrowthStageDependencyGraphFromSources({ seed: "seed" }, { ...sources, plots: [] })).toThrow("plots must contain at least one plot");
  });
});
