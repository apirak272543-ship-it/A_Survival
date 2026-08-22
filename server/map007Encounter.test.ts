import { describe, expect, it } from "vitest";
import { MAP007_STEAM_VENT, initialMap007Encounter, resolveMap007Encounter } from "../client/src/game/map007/encounter";

describe("MAP_007 Blizzard encounter", () => {
  it("applies cold damage outside the steam vent and keeps shelter immune", () => {
    const outside = resolveMap007Encounter(initialMap007Encounter(), { x: 0, z: 0, health: 100, harvestedCrystals: 0, defeatedWeavers: 0, interacted: false, now: 170_000 });
    const inside = resolveMap007Encounter(initialMap007Encounter(), { x: MAP007_STEAM_VENT.x, z: MAP007_STEAM_VENT.z, health: 100, harvestedCrystals: 0, defeatedWeavers: 0, interacted: false, now: 170_000 });
    expect(outside.blizzardActive).toBe(true); expect(outside.coldDamagePerSecond).toBe(5); expect(inside.sheltered).toBe(true); expect(inside.coldDamagePerSecond).toBe(0);
  });

  it("reveals Cryo-Beast then telegraphs Glacial Terror deterministically", () => {
    const elite = resolveMap007Encounter(initialMap007Encounter(), { x: 20, z: 20, health: 100, harvestedCrystals: 3, defeatedWeavers: 0, interacted: false, now: 100_000 });
    const telegraph = resolveMap007Encounter(elite.memory, { x: 32, z: 28, health: 100, harvestedCrystals: 3, defeatedWeavers: 0, interacted: true, now: 100_000 });
    const boss = resolveMap007Encounter(telegraph.memory, { x: 32, z: 28, health: 100, harvestedCrystals: 3, defeatedWeavers: 0, interacted: false, now: 102_700 });
    expect(elite.activateElite).toBe(true); expect(telegraph.memory.state).toBe("boss-telegraph"); expect(boss.activateBoss).toBe(true);
  });
});
