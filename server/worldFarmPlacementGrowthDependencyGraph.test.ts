import { describe, expect, it } from "vitest";
import {
  WORLD_FARM_FIXED_NOW,
  WORLD_FARM_PLACEMENT_GRAPH_RULES_VERSION,
  buildWorldFarmPlacementGrowthDependencyGraph,
  getDefaultWorldFarmPlacementGrowthDependencyGraphInput,
} from "./generators/worldFarmPlacementGrowthDependencyGraph";

describe("world farm placement and growth dependency graph", () => {
  it("audits the canonical 300-plant catalog and bounded Obsidian farm plots", () => {
    const result = buildWorldFarmPlacementGrowthDependencyGraph(getDefaultWorldFarmPlacementGrowthDependencyGraphInput());

    expect(result.summary.catalog).toMatchObject({
      expectedCount: 300,
      actualCount: 300,
      valid: true,
      issueCount: 0,
      biomeIds: ["obsidian-frontier"],
      playableSoilPlantCount: expect.any(Number),
      closedSoilPlantCount: expect.any(Number),
      seedLinksValid: true,
      harvestLinksValid: true,
      growthDurationsValid: true,
    });
    expect(result.summary.catalog.playableSoilPlantCount).toBeGreaterThan(0);
    expect(result.summary.catalog.closedSoilPlantCount).toBeGreaterThan(0);
    expect(result.summary.farmPlots).toMatchObject({ plotCount: 4, plotIds: ["farm-plot-01", "farm-plot-02", "farm-plot-03", "farm-plot-04"], boundedToPlayableMap: true, allowedSoilPlotCount: 4 });
    expect(result.summary.farmPlots.coordinateKeys).toEqual(["3:0:1", "4:0:1", "3:0:2", "4:0:2"]);
    expect(result.graph.valid).toBe(false);
  });

  it("previews soil/biome/occupancy/map planting gates and inventory-safe consumption", () => {
    const result = buildWorldFarmPlacementGrowthDependencyGraph();

    expect(result.summary.selectedPlant).toMatchObject({ seedDefinitionId: "seed-001", plantId: "plant-001", soilId: "terra-loam", biomeId: "obsidian-frontier", harvestDefinitionId: "material-002" });
    expect(result.summary.placementPreview).toEqual({ accepted: true, occupiedRejected: true, wrongSoilRejected: true, futureMapRejected: true, seedDefinitionLinkValid: true, plantDefinitionLinkValid: true, actionType: "plant-world-seed", writesPerformed: false });
    expect(result.summary.inventoryPreview).toEqual({ accepted: true, consumedExactlyOne: true, rejectedPlacementKeepsInventory: true, writesPerformed: false });
  });

  it("proves seed, sprout, young, mature progression and mature-only harvest reward", () => {
    const result = buildWorldFarmPlacementGrowthDependencyGraph();

    expect(result.summary.stagePolicy).toMatchObject({
      stages: ["empty", "seed", "sprout", "young", "mature"],
      matureOnlyHarvest: true,
      growthDurationBounded: true,
      snapshots: [
        { label: "empty", stage: "empty" },
        { label: "seed", stage: "seed" },
        { label: "sprout", stage: "sprout" },
        { label: "young", stage: "young" },
        { label: "mature", stage: "mature" },
      ],
    });
    expect(result.summary.harvestPreview).toMatchObject({ tooEarlyRejected: true, matureAccepted: true, rewardDefinitionId: "material-002", clearedPlot: true, actionType: "harvest-world-crop", writesPerformed: false });
  });

  it("normalizes farm state to the four canonical plots and exposes missing integration owners", () => {
    const result = buildWorldFarmPlacementGrowthDependencyGraph({ now: WORLD_FARM_FIXED_NOW + 1 });

    expect(result.summary.normalizationPreview).toEqual({ boundedPlotCount: 4, unknownPlantRemoved: true, foreignPlotRemoved: true, writesPerformed: false });
    expect(result.summary.owners).toEqual({ plantCatalog: true, farmPlotState: true, placementPolicy: true, growthPolicy: true, harvestPolicy: true, blockSurface: false, worldDistribution: false, persistenceCaller: false, playerUi: false });
    expect(result.summary.blockerCodes).toEqual(["farm-block-surface-owner-missing", "farm-world-distribution-owner-missing", "farm-persistence-caller-owner-missing"]);
    expect(result.graph.issues.filter(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toHaveLength(3);
    expect(result.summary.runtimeImportAllowed).toBe(false);
    expect(result.summary.playerVisible).toBe(false);
    expect(result.summary.cacheable).toBe(false);
  });

  it("is deterministic and rejects unsupported map, seed, time, and rules inputs fail-closed", () => {
    const input = { ...getDefaultWorldFarmPlacementGrowthDependencyGraphInput(), rulesVersion: WORLD_FARM_PLACEMENT_GRAPH_RULES_VERSION };
    const first = buildWorldFarmPlacementGrowthDependencyGraph(input);
    const second = buildWorldFarmPlacementGrowthDependencyGraph(input);
    const changed = buildWorldFarmPlacementGrowthDependencyGraph({ ...input, now: WORLD_FARM_FIXED_NOW + 1 });

    expect(first).toEqual(second);
    expect(first.artifact.contentHash).not.toBe(changed.artifact.contentHash);
    expect(() => buildWorldFarmPlacementGrowthDependencyGraph({ mapId: "future-map" })).toThrow(/Only obsidian-frontier/);
    expect(() => buildWorldFarmPlacementGrowthDependencyGraph({ seedDefinitionId: "seed-not-found" })).toThrow(/canonical world plant/);
    expect(() => buildWorldFarmPlacementGrowthDependencyGraph({ now: -1 })).toThrow(/now/);
    expect(() => buildWorldFarmPlacementGrowthDependencyGraph({ now: 1.5 })).toThrow(/now/);
    expect(() => buildWorldFarmPlacementGrowthDependencyGraph({ rulesVersion: "future-rules" })).toThrow(/Unsupported/);
  });
});
