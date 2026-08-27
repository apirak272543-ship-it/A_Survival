import { describe, expect, it } from "vitest";
import { PLANT_CATALOG } from "../client/src/game/data/plantCatalog";
import { buildPlantEffectCoverageReport, FICTIONAL_PLANT_EFFECT_POWER_CAP, FICTIONAL_REPELLENT_RADIUS_CAP_METERS } from "./plantEffectCoverageContract";

describe("plant effect coverage contract", () => {
  it("audits all canonical effect kinds and keeps fictional powers/radii within caps", () => {
    const report = buildPlantEffectCoverageReport();

    expect(report).toMatchObject({
      schemaVersion: "a-survival.plant-effect-coverage.v1",
      contractVersion: "1.0.0",
      auditOnly: true,
      readOnly: true,
      exportOnly: true,
      publishReady: false,
      valid: true,
      catalogPlantCount: PLANT_CATALOG.length,
      sampledPlantCount: PLANT_CATALOG.length,
      catalogDuplicateIdCount: 0,
      cappedPowerCount: 0,
      cappedRadiusCount: 0,
      healingPowerCap: FICTIONAL_PLANT_EFFECT_POWER_CAP,
      fictionalRepellentRadiusCapMeters: FICTIONAL_REPELLENT_RADIUS_CAP_METERS,
      unsupportedEffectKinds: ["buff", "damage"],
      issues: [],
    });
    expect(report.effectKindCounts.food).toBeGreaterThan(0);
    expect(report.effectKindCounts.healing).toBeGreaterThan(0);
    expect(report.effectKindCounts.repellent).toBeGreaterThan(0);
    expect(report.effectKindCounts.aether).toBeGreaterThan(0);
    expect(report.effectKindCounts.crafting).toBeGreaterThan(0);
    expect(Object.values(report.maxPowerByKind).every(power => power <= FICTIONAL_PLANT_EFFECT_POWER_CAP)).toBe(true);
    expect(Object.values(report.maxRadiusByKindMeters).every(radius => radius <= FICTIONAL_REPELLENT_RADIUS_CAP_METERS)).toBe(true);
    expect(report.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("supports a deterministic bounded plant sample and reports its effect projection", () => {
    const input = { plantIds: [PLANT_CATALOG[0]!.id, PLANT_CATALOG[1]!.id, PLANT_CATALOG[0]!.id] };
    const first = buildPlantEffectCoverageReport(input);
    const second = buildPlantEffectCoverageReport(input);

    expect(first).toEqual(second);
    expect(first.valid).toBe(true);
    expect(first.sampledPlantCount).toBe(2);
    expect(Object.values(first.effectKindCounts).reduce((total, count) => total + count, 0)).toBe(2);
  });

  it("fails closed for malformed, unknown, truncated, and over-cap effect inputs", () => {
    const malformed = buildPlantEffectCoverageReport({ plantIds: [PLANT_CATALOG[0]!.id, "missing-plant", null] });
    expect(malformed.valid).toBe(false);
    expect(malformed.sampledPlantCount).toBe(1);
    expect(malformed.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["UNKNOWN_PLANT_ID", "PLANT_ID_INVALID"]));

    const tooMany = buildPlantEffectCoverageReport({ plantIds: Array.from({ length: 257 }, () => PLANT_CATALOG[0]!.id) });
    expect(tooMany.valid).toBe(false);
    expect(tooMany.sampledPlantCount).toBe(1);
    expect(tooMany.issues.map(issue => issue.code)).toContain("PLANT_IDS_TRUNCATED");
  });

  it("keeps effect application, medical outcome, damage, repel, hazard, and gameplay claims false", () => {
    const report = buildPlantEffectCoverageReport({ plantIds: [PLANT_CATALOG[0]!.id] });

    expect(report.claims).toEqual({ effectApplied: false, healingGranted: false, damageApplied: false, repelApplied: false, cactusHazardApplied: false, medicalOutcome: false, gameplayMutation: false, playerVisible: false });
    expect(report.blockers.map(blocker => blocker.id)).toEqual(["runtime-effect-caller", "damage-effect-owner", "cactus-hazard-owner", "medical-safety-validation"]);
    expect(report.unsupportedEffectReason).toContain("does not invent");
  });
});
