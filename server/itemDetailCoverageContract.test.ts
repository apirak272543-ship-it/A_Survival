import { describe, expect, it } from "vitest";
import { ALL_ITEMS, type ItemDefinition } from "../client/src/game/data/catalog";
import {
  auditItemDetailCoverage,
  ITEM_DETAIL_COVERAGE_VERSION,
} from "./itemDetailCoverageContract";

describe("item detail coverage contract", () => {
  it("audits every canonical definition and preserves category counts", () => {
    const report = auditItemDetailCoverage();

    expect(report.version).toBe(ITEM_DETAIL_COVERAGE_VERSION);
    expect(report.source).toBe("ALL_ITEMS");
    expect(report.totalDefinitions).toBe(ALL_ITEMS.length);
    expect(Object.values(report.categoryCounts).reduce((sum, count) => sum + count, 0)).toBe(ALL_ITEMS.length);
    expect(report.categoryCounts.weapon).toBeGreaterThan(0);
    expect(report.categoryCounts.tool).toBeGreaterThan(0);
    expect(report.categoryCounts.plant).toBeGreaterThan(0);
    expect(report.categoryCounts.block).toBeGreaterThan(0);
    expect(report.categoryCounts.material).toBeGreaterThan(0);
    expect(report.categoryCounts.structure).toBeGreaterThan(0);
  });

  it("keeps missing weapon damage explicit instead of fabricating a combat number", () => {
    const report = auditItemDetailCoverage();
    const weaponBlockers = report.blockers.filter(blocker => blocker.category === "weapon");

    expect(report.status).toBe("complete");
    expect(weaponBlockers).toHaveLength(0);
    expect(report.unavailableFactCounts["attack-damage"]).toBe(report.categoryCounts.weapon);
    expect(report.blockers).toHaveLength(0);
  });

  it("confirms canonical non-weapon category facts without adding extra blockers", () => {
    const report = auditItemDetailCoverage();

    expect(report.definitionsWithCompleteFacts).toBe(report.totalDefinitions);
    expect(report.blockers).toEqual([]);
    expect(report.policy).toEqual({
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      persistenceWrite: false,
    });
  });

  it("reports duplicate and missing source facts deterministically without mutating input", () => {
    const malformed: ItemDefinition = {
      id: "fixture-weapon",
      category: "sword",
      name: "Fixture weapon",
      tier: "common",
      stackLimit: 0,
      equippable: true,
      tags: ["sword"],
      effect: "",
    };
    const definitions = [malformed, { ...malformed }];
    const before = JSON.stringify(definitions);
    const report = auditItemDetailCoverage(definitions);

    expect(JSON.stringify(definitions)).toBe(before);
    expect(report.source).toBe("provided-definitions");
    expect(report.totalDefinitions).toBe(2);
    expect(report.blockers.map(blocker => blocker.code)).toEqual([
      "duplicate-definition-id",
      "invalid-stack-limit",
      "invalid-stack-limit",
      "missing-usage-fact",
      "missing-usage-fact",
    ]);
    expect(report.status).toBe("blocked");
    expect(report.unavailableFactCounts["attack-damage"]).toBe(2);
  });
});
