import { describe, expect, it } from "vitest";
import { createStarterInstance } from "../client/src/game/data/catalog";
import { inspectInventoryIntegrity } from "../client/src/game/integrity/integrityVerdict";

describe("inventory integrity verdict", () => {
  it("keeps a valid unique starter instance usable", () => {
    const report = inspectInventoryIntegrity([createStarterInstance("sword-001", 1)]);
    expect(report).toMatchObject({ status: "clear", quarantinedInstanceIds: [], validInstanceCount: 1, canContinue: true });
  });

  it("quarantines duplicate UUIDs without blocking the rest of inventory", () => {
    const duplicated = createStarterInstance("sword-001", 1);
    const safe = createStarterInstance("seed-001", 2);
    const report = inspectInventoryIntegrity([duplicated, { ...duplicated }, safe]);
    expect(report.quarantinedInstanceIds).toEqual([duplicated.instanceId]);
    expect(report.validInstanceCount).toBe(1);
    expect(report.findings.some(item => item.code === "duplicate-instance-id")).toBe(true);
  });

  it("quarantines only an item with incomplete provenance", () => {
    const safe = createStarterInstance("sword-001", 1);
    const suspect = { ...createStarterInstance("seed-001", 2), provenance: { ...createStarterInstance("seed-001", 2).provenance, eventId: "", integrityHash: "" } };
    const report = inspectInventoryIntegrity([safe, suspect]);
    expect(report.quarantinedInstanceIds).toEqual([suspect.instanceId]);
    expect(report.validInstanceCount).toBe(1);
  });
});
