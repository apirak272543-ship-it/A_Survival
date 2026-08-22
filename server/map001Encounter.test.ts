import { describe, expect, it } from "vitest";
import { MAP001_TELEGRAPH_MS, initialMap001Encounter, resolveMap001Encounter } from "../client/src/game/map001/encounter";
import { createMapRewardInstance } from "../client/src/game/data/catalog";

describe("MAP_001 encounter contract", () => {
  it("keeps the Commander Koral safe zone and resets a defeated player without a reward event", () => {
    const safe = resolveMap001Encounter(initialMap001Encounter(), { x: 0, z: 0, health: 100, phase: "day", interacted: false, now: 1 });
    expect(safe.memory.state).toBe("safe-zone");
    const reset = resolveMap001Encounter(safe.memory, { x: 12, z: 3, health: 0, phase: "day", interacted: false, now: 2 });
    expect(reset).toMatchObject({ event: "safe-reset", spawnGlassStalkers: 0, activateVoidReaper: false });
  });

  it("telegraphs the Distress Pod Trap before spawning exactly three Glass Stalkers", () => {
    const telegraph = resolveMap001Encounter(initialMap001Encounter(), { x: 16, z: -11, health: 100, phase: "day", interacted: true, now: 10 });
    expect(telegraph).toMatchObject({ event: "distress-pod", spawnGlassStalkers: 0, warning: "DISTRESS POD SIGNAL UNSTABLE" });
    const spawned = resolveMap001Encounter(telegraph.memory, { x: 16, z: -11, health: 100, phase: "day", interacted: false, now: 10 + MAP001_TELEGRAPH_MS });
    expect(spawned).toMatchObject({ event: "distress-pod", spawnGlassStalkers: 3 });
  });

  it("only activates Void Reaper after the night telegraph at the Leyline Monolith", () => {
    const day = resolveMap001Encounter(initialMap001Encounter(), { x: 0, z: -18, health: 100, phase: "day", interacted: false, now: 20 });
    expect(day.activateVoidReaper).toBe(false);
    const telegraph = resolveMap001Encounter(day.memory, { x: 0, z: -18, health: 100, phase: "night", interacted: false, now: 30 });
    expect(telegraph.memory.state).toBe("boss-telegraph");
    const active = resolveMap001Encounter(telegraph.memory, { x: 0, z: -18, health: 100, phase: "night", interacted: false, now: 30 + MAP001_TELEGRAPH_MS });
    expect(active).toMatchObject({ event: "void-reaper", activateVoidReaper: true });
  });

  it("creates a provenance-bearing Ley Crystal reward with a map-scoped event identity", () => {
    const reward = createMapRewardInstance("material-003", 5001, "obsidian-frontier", "map001-ley-crystal-ley-crystal-0", "harvest");
    expect(reward).toMatchObject({ definitionId: "material-003", quantity: 1, provenance: { type: "harvest", mapId: "obsidian-frontier", eventId: "map001-ley-crystal-ley-crystal-0" } });
    expect(reward.instanceId).toContain("obsidian-frontier");
  });
});
