import { describe, expect, it } from "vitest";
import { createStarterInstance } from "../client/src/game/data/catalog";
import { inspectSyncPayload, normalizePlayerId } from "./gameIntegrity";

describe("game sync integrity", () => {
  it("normalizes a Player ID before profile lookup", () => {
    expect(normalizePlayerId(" Nova Rider ")).toBe("nova-rider");
  });

  it("accepts a valid starter inventory and quarantines an invalid equippable stack from the safe payload", () => {
    const starter = createStarterInstance("sword-001", 1);
    expect(inspectSyncPayload({ inventory: [starter] }).accepted).toBe(true);
    const inspection = inspectSyncPayload({ inventory: [{ ...starter, quantity: 2 }] });
    expect(inspection.accepted).toBe(true);
    expect(inspection.safeInventory).toEqual([]);
    expect(inspection.quarantinedInstanceIds).toEqual([starter.instanceId]);
  });

  it("blocks payloads with no inventory relationship", () => {
    expect(inspectSyncPayload({ home: {} }).issues).toContain("Save payload does not contain an inventory array");
  });
});
