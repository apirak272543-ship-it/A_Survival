import { describe, expect, it } from "vitest";
import { createStarterInstance } from "../client/src/game/data/catalog";
import { inspectSyncPayload, normalizePlayerId } from "./gameIntegrity";

describe("game sync integrity", () => {
  it("normalizes a Player ID before profile lookup", () => {
    expect(normalizePlayerId(" Nova Rider ")).toBe("nova-rider");
  });

  it("accepts a valid starter inventory and blocks an invalid equippable stack", () => {
    const starter = createStarterInstance("sword-001", 1);
    expect(inspectSyncPayload({ inventory: [starter] }).accepted).toBe(true);
    expect(inspectSyncPayload({ inventory: [{ ...starter, quantity: 2 }] }).accepted).toBe(false);
  });

  it("blocks payloads with no inventory relationship", () => {
    expect(inspectSyncPayload({ home: {} }).issues).toContain("Save payload does not contain an inventory array");
  });
});
