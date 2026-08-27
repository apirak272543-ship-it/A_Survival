import { describe, expect, it } from "vitest";
import { PLANT_CATALOG } from "../client/src/game/data/plantCatalog";
import {
  PLANT_REPEL_DURATION_CAP_MS,
  PLANT_REPEL_MAX_DELTA_SECONDS,
  PLANT_REPEL_RADIUS_CAP_METERS,
  buildPlantRepelBehaviorDependencyGraph,
  buildPlantRepelBehaviorDependencyGraphFromSources,
  readActivePlantRepelSources,
  resolveRepelStep,
  selectStrongestRepellentAura,
  type RepellentAuraSource,
} from "./generators/plantRepelBehaviorDependencyGraph";

const safeAuras: RepellentAuraSource[] = [
  { id: "aura:plant-001", plantId: "plant-001", x: 0, z: 0, radiusMeters: 4, power: 4, activeFromMs: 100, durationMs: 30_000, stackable: false, label: "แรงผลักสมมติ · ไม่ทำลายมอนสเตอร์" },
  { id: "aura:plant-002", plantId: "plant-002", x: 0, z: 0, radiusMeters: 6, power: 5, activeFromMs: 100, durationMs: 30_000, stackable: false, label: "แรงผลักสมมติ · ไม่ทำลายมอนสเตอร์" },
];

describe("plant repel behavior dependency graph", () => {
  it("audits the canonical repellent projection and exposes the missing duration boundary", () => {
    const first = buildPlantRepelBehaviorDependencyGraph({ seed: "f05-canonical", sampleCount: PLANT_CATALOG.length });
    const second = buildPlantRepelBehaviorDependencyGraph({ seed: "f05-canonical", sampleCount: PLANT_CATALOG.length });

    expect(first.summary).toMatchObject({
      catalogPlantCount: 300,
      canonicalRepellentPlantCount: 60,
      auraCount: 60,
      sampledAuraCount: 60,
      uniqueAuraIdCount: 60,
      durationRuleCount: 0,
      activeDurationCount: 0,
      stackableAuraCount: 0,
      maxObservedRadiusMeters: 6,
      maxObservedPower: 3,
      behavior: {
        selectionIsStrongestOnly: true,
        equalPowerTieBreakIsDeterministic: true,
        expiredAuraIsIgnored: true,
        healthIsUnchanged: true,
        displacementIsCappedByDelta: true,
      },
    });
    expect(first.summary.issueCounts).toEqual({ "duration-missing": 60 });
    expect(first.graph.valid).toBe(false);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("selects only the strongest active aura with deterministic equal-power tie breaking", () => {
    const selected = selectStrongestRepellentAura({ x: 1, z: 0 }, safeAuras, 100);
    expect(selected).toMatchObject({ aura: { id: "aura:plant-002", power: 5 }, distanceMeters: 1 });
    const tied: RepellentAuraSource[] = [{ ...safeAuras[1]!, power: 4 }, { ...safeAuras[0]!, id: "aura:plant-000" }];
    expect(selectStrongestRepellentAura({ x: 1, z: 0 }, tied, 100)?.aura.id).toBe("aura:plant-000");
    expect(selectStrongestRepellentAura({ x: 1, z: 0 }, safeAuras, 30)).toBeUndefined();
    expect(selectStrongestRepellentAura({ x: 20, z: 0 }, safeAuras, 100)).toBeUndefined();
  });

  it("repels without changing health, never stacks displacement, and caps delta time", () => {
    const result = resolveRepelStep({ enemy: { x: 1, z: 0, health: 34 }, auras: safeAuras, now: 100, deltaSeconds: 10 });
    expect(result).toMatchObject({ repelled: true, auraId: "aura:plant-002", health: 34, displacementMeters: 0.3375 });
    expect(result.x).toBeCloseTo(1.3375);
    expect(result.z).toBe(0);
    const expired = resolveRepelStep({ enemy: { x: 1, z: 0, health: 34 }, auras: safeAuras, now: 100 + PLANT_REPEL_DURATION_CAP_MS, deltaSeconds: 0.1 });
    expect(expired).toMatchObject({ repelled: false, health: 34, reason: "no-active-aura" });
    expect(PLANT_REPEL_MAX_DELTA_SECONDS).toBe(0.25);
  });

  it("accepts a bounded duration-aware source and keeps its graph valid", () => {
    const output = buildPlantRepelBehaviorDependencyGraphFromSources(
      { seed: "f05-safe", sampleCount: safeAuras.length },
      { catalogPlantCount: 300, canonicalRepellentPlantCount: safeAuras.length, auras: safeAuras },
    );
    expect(output.summary).toMatchObject({ auraCount: 2, sampledAuraCount: 2, durationRuleCount: 2, activeDurationCount: 2, stackableAuraCount: 0, issueCounts: {} });
    expect(output.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(output.graph.valid).toBe(true);
  });

  it("turns radius, power, duration, stackability, label, identity, and count violations into blockers", () => {
    const unsafe: RepellentAuraSource = {
      id: "bad-aura",
      plantId: "future-plant",
      x: Number.NaN,
      z: 0,
      radiusMeters: PLANT_REPEL_RADIUS_CAP_METERS + 1,
      power: 99,
      activeFromMs: -1,
      durationMs: PLANT_REPEL_DURATION_CAP_MS + 1,
      stackable: true,
      label: "ฆ่ามอนสเตอร์",
    };
    const output = buildPlantRepelBehaviorDependencyGraphFromSources(
      { seed: "f05-invalid", sampleCount: 1 },
      { catalogPlantCount: 1, canonicalRepellentPlantCount: 0, auras: [unsafe, unsafe] },
    );
    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts["catalog-count"]).toBe(1);
    expect(output.summary.issueCounts["repellent-count-mismatch"]).toBe(1);
    expect(output.summary.issueCounts["duplicate-aura-id"]).toBe(1);
    expect(output.summary.issueCounts["invalid-aura-id"]).toBe(2);
    expect(output.summary.issueCounts["invalid-plant-id"]).toBe(2);
    expect(output.summary.issueCounts["position-invalid"]).toBe(2);
    expect(output.summary.issueCounts["radius-invalid"]).toBe(2);
    expect(output.summary.issueCounts["power-invalid"]).toBe(2);
    expect(output.summary.issueCounts["active-from-invalid"]).toBe(2);
    expect(output.summary.issueCounts["duration-invalid"]).toBe(2);
    expect(output.summary.issueCounts["stackable"]).toBe(2);
    expect(output.summary.issueCounts["label-disclosure"]).toBe(2);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("changes the artifact hash when source data changes and rejects invalid input bounds", () => {
    const source = readActivePlantRepelSources();
    const original = buildPlantRepelBehaviorDependencyGraphFromSources({ seed: "f05-hash", sampleCount: 2 }, { ...source, auras: safeAuras });
    const changed = buildPlantRepelBehaviorDependencyGraphFromSources({ seed: "f05-hash", sampleCount: 2 }, { ...source, auras: [{ ...safeAuras[0]!, power: 1 }, safeAuras[1]!] });
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildPlantRepelBehaviorDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildPlantRepelBehaviorDependencyGraph({ seed: "f05", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildPlantRepelBehaviorDependencyGraph({ seed: "f05", sampleCount: PLANT_CATALOG.length + 1 })).toThrow(/sampleCount/);
  });
});
