import { describe, expect, it } from "vitest";
import { WORLD_PLANT_CATALOG } from "../client/src/game/tools/plantCatalogGenerator";
import { buildWorldFarmPlacementCoverageReport } from "./worldFarmPlacementCoverageContract";

describe("world farm placement coverage contract", () => {
  it("audits the canonical Obsidian plots and all canonical seed compatibility projections", () => {
    const report = buildWorldFarmPlacementCoverageReport();

    expect(report).toMatchObject({
      schemaVersion: "a-survival.world-farm-placement-coverage.v1",
      contractVersion: "1.0.0",
      auditOnly: true,
      readOnly: true,
      exportOnly: true,
      publishReady: false,
      valid: true,
      mapId: "obsidian-frontier",
      plotCount: 4,
      seedSampleCount: 300,
      canonicalPlayableBiomeMatches: 300,
      coverage: {
        plotsBySoil: { "terra-loam": 2, "ashen-volcanic": 2, "red-dune": 0, "verdant-humus": 0, "aether-crystal": 0 },
        acceptedPlacementProjectionCount: expect.any(Number),
        rejectedPlacementProjectionCount: expect.any(Number),
        compatibilityMismatches: 0,
      },
      issues: [],
    });
    expect(report.coverage.acceptedPlacementProjectionCount).toBeGreaterThan(0);
    expect(report.coverage.rejectedPlacementProjectionCount).toBeGreaterThan(0);
    expect(report.coverage.acceptedPlacementProjectionCount + report.coverage.rejectedPlacementProjectionCount).toBe(300 * 4);
    expect(report.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps equal seed samples deterministic and changes the hash when the sample changes", () => {
    const sample = WORLD_PLANT_CATALOG.slice(0, 3).map(plant => plant.seedDefinitionId);
    const first = buildWorldFarmPlacementCoverageReport({ seedDefinitionIds: sample, now: 1234 });
    const second = buildWorldFarmPlacementCoverageReport({ seedDefinitionIds: sample, now: 1234 });
    const changed = buildWorldFarmPlacementCoverageReport({ seedDefinitionIds: [...sample, WORLD_PLANT_CATALOG[3]!.seedDefinitionId], now: 1234 });

    expect(first).toEqual(second);
    expect(first.seedSampleCount).toBe(3);
    expect(first.contentSha256).not.toBe(changed.contentSha256);
    expect(first.coverage.acceptedPlacementProjectionCount).not.toBe(changed.coverage.acceptedPlacementProjectionCount);
  });

  it("fails closed for unsupported maps, malformed seeds, and soil incompatibility", () => {
    const incompatibleSeed = WORLD_PLANT_CATALOG.find(plant => plant.soilId === "red-dune")!.seedDefinitionId;
    const report = buildWorldFarmPlacementCoverageReport({ mapId: "map-002-ashen-obsidian-plains", seedDefinitionIds: [incompatibleSeed, "not-a-seed", null], now: 10 });

    expect(report.valid).toBe(false);
    expect(report.mapId).toBe("map-002-ashen-obsidian-plains");
    expect(report.seedSampleCount).toBe(2);
    expect(report.coverage.acceptedPlacementProjectionCount).toBe(0);
    expect(report.coverage.rejectionReasons["unsupported-map"]).toBe(4);
    expect(report.coverage.rejectionReasons["invalid-seed"]).toBe(4);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["SEED_SAMPLE_INVALID", "UNRESOLVED_SEED_DEFINITION"]));
    expect(report.issues.some(issue => issue.code === "MAP_ID_NORMALIZED")).toBe(true);

    const soilMismatch = buildWorldFarmPlacementCoverageReport({ seedDefinitionIds: [incompatibleSeed], now: 10 });
    expect(soilMismatch.valid).toBe(true);
    expect(soilMismatch.coverage.acceptedPlacementProjectionCount).toBe(0);
    expect(soilMismatch.coverage.rejectionReasons["soil-mismatch"]).toBe(4);
  });

  it("bounds sample count and records no inventory, reward, harvest, growth, storage, or player mutation claims", () => {
    const report = buildWorldFarmPlacementCoverageReport({ seedDefinitionIds: Array.from({ length: 301 }, (_, index) => `seed-${index}`) });

    expect(report.seedSampleCount).toBe(300);
    expect(report.issues.some(issue => issue.code === "SEED_SAMPLE_TRUNCATED")).toBe(true);
    expect(report.claims).toEqual({ inventoryMutation: false, rewardGrant: false, harvestMutation: false, growthMutation: false, storageWrite: false, playerVisible: false });
    expect(report.blockers.map(blocker => blocker.id)).toEqual(["inventory-atomic-consume", "authoritative-farm-persistence", "runtime-biome-distribution-playtest"]);
  });
});
