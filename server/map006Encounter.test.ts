import { describe, expect, it } from "vitest";
import { MAP006_STABILIZER, initialMap006Encounter, resolveMap006Encounter } from "../client/src/game/map006/encounter";

describe("MAP_006 Magnetic Storm encounter", () => {
  it("jams HUD outside the stabilizer but never represents an inventory mutation", () => {
    const outside = resolveMap006Encounter(initialMap006Encounter(), { x: 0, z: 0, health: 100, harvestedMagnetite: 0, defeatedRays: 0, interacted: false, now: 210_000 });
    const inside = resolveMap006Encounter(initialMap006Encounter(), { x: MAP006_STABILIZER.x, z: MAP006_STABILIZER.z, health: 100, harvestedMagnetite: 0, defeatedRays: 0, interacted: false, now: 210_000 });
    expect(outside.stormActive).toBe(true); expect(outside.temporaryHudJammed).toBe(true); expect(inside.sheltered).toBe(true); expect(inside.temporaryHudJammed).toBe(false);
  });

  it("reveals Ironclad Golem then telegraphs Lodestone Colossus deterministically", () => {
    const elite = resolveMap006Encounter(initialMap006Encounter(), { x: 20, z: 20, health: 100, harvestedMagnetite: 3, defeatedRays: 0, interacted: false, now: 100_000 });
    const telegraph = resolveMap006Encounter(elite.memory, { x: 32, z: 28, health: 100, harvestedMagnetite: 3, defeatedRays: 0, interacted: true, now: 100_000 });
    const boss = resolveMap006Encounter(telegraph.memory, { x: 32, z: 28, health: 100, harvestedMagnetite: 3, defeatedRays: 0, interacted: false, now: 102_700 });
    expect(elite.activateElite).toBe(true); expect(telegraph.memory.state).toBe("boss-telegraph"); expect(boss.activateBoss).toBe(true);
  });
});
