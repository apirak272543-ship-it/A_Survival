import { describe, expect, it } from "vitest";
import { OBSIDIAN_BLOCKS } from "../client/src/game/data/blockModules";
import { buildBlockHazardPlacementCoverageReport } from "./blockHazardPlacementCoverageContract";

describe("block hazard and placement coverage contract", () => {
  it("audits canonical occupancy, collision shapes, support flags, and cactus hazard metadata", () => {
    const report = buildBlockHazardPlacementCoverageReport();

    expect(report).toMatchObject({
      schemaVersion: "a-survival.block-hazard-placement-coverage.v1",
      contractVersion: "1.0.0",
      auditOnly: true,
      readOnly: true,
      exportOnly: true,
      publishReady: false,
      valid: true,
      sampledBlockCount: Object.keys(OBSIDIAN_BLOCKS).length,
      canonicalBlockCount: Object.keys(OBSIDIAN_BLOCKS).length,
      occupancy: { solidCount: expect.any(Number), nonSolidCount: expect.any(Number), partialCollisionCount: expect.any(Number), noCollisionCount: expect.any(Number) },
      hazards: { hazardBlockCount: 1, hazardBlockIds: ["flora.obsidian.thorn-cactus"], maxDamage: 6, maxCooldownSeconds: 0.5, invalidHazardCount: 0, cactus: { present: true, solid: false, collisionShape: "thin", damage: 6, affects: "all" } },
      issues: [],
    });
    expect(report.occupancy.solidCount + report.occupancy.nonSolidCount).toBe(report.sampledBlockCount);
    expect(report.occupancy.partialCollisionCount).toBeGreaterThan(0);
    expect(report.occupancy.noCollisionCount).toBeGreaterThan(0);
    expect(report.support.invalidGravityFloatCombinationCount).toBe(0);
    expect(report.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps placement projections deterministic and separates accepted, occupied, unsupported, floatable, and unknown decisions", () => {
    const first = buildBlockHazardPlacementCoverageReport();
    const second = buildBlockHazardPlacementCoverageReport();

    expect(first).toEqual(second);
    expect(first.placement).toMatchObject({ probeCount: 5, acceptedCount: 2, rejectedCount: 3, rejectionReasons: { occupied: 1, "requires-support": 1, "unknown-block": 1 } });
  });

  it("fails closed for malformed block samples and invalid placement probes", () => {
    const report = buildBlockHazardPlacementCoverageReport({ blockIds: ["flora.obsidian.thorn-cactus", "missing.block", null], placementProbes: [{ id: "bad" }, "invalid-probe"] });

    expect(report.valid).toBe(false);
    expect(report.sampledBlockCount).toBe(1);
    expect(report.hazards.hazardBlockCount).toBe(1);
    expect(report.placement.probeCount).toBe(0);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["BLOCK_SAMPLE_INVALID", "UNKNOWN_BLOCK_DEFINITION", "PLACEMENT_PROBE_INVALID"]));
  });

  it("bounds sample sizes and makes no damage, combat, placement, inventory, storage, or player claims", () => {
    const report = buildBlockHazardPlacementCoverageReport({ blockIds: Array.from({ length: 257 }, () => "terrain.ash"), placementProbes: Array.from({ length: 65 }, () => ({ id: "probe", moduleId: "terrain.ash", supportModuleId: "terrain.ash" })) });

    expect(report.sampledBlockCount).toBe(256);
    expect(report.placement.probeCount).toBe(64);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["BLOCK_SAMPLE_TRUNCATED", "PLACEMENT_PROBE_TRUNCATED"]));
    expect(report.claims).toEqual({ damageCaller: false, combatEffect: false, placementMutation: false, inventoryMutation: false, storageWrite: false, playerVisible: false });
    expect(report.blockers.map(blocker => blocker.id)).toEqual(["runtime-damage-caller", "world-occupancy-integration", "player-hazard-playtest"]);
  });
});
