import { describe, expect, it } from "vitest";
import { MAP012_SCOUT_OVERLOOK, MAP012_WIND_MONOLITH, initialMap012Encounter, resolveMap012Encounter } from "../client/src/game/map012/encounter";

describe("MAP_012 Obsidian Spire Shelf encounter", () => {
  it("reduces projectile range and damages outside Scout Overlook during ash gales", () => {
    const outside = resolveMap012Encounter(initialMap012Encounter(), { x: 0, z: 0, health: 100, harvestedGlass: 0, defeatedStalkers: 0, interacted: false, now: 1_000 });
    const sheltered = resolveMap012Encounter(initialMap012Encounter(), { x: MAP012_SCOUT_OVERLOOK.x, z: MAP012_SCOUT_OVERLOOK.z, health: 100, harvestedGlass: 0, defeatedStalkers: 0, interacted: false, now: 1_000 });
    expect(outside.projectileRangeMultiplier).toBe(0.6);
    expect(outside.ashDamagePerSecond).toBe(3);
    expect(sheltered.ashDamagePerSecond).toBe(0);
    expect(outside.inventoryMutation).toBe(false);
  });

  it("requires elite and 10 Razor Glass before telegraphing Gale-Terror Zephyr", () => {
    const elite = resolveMap012Encounter(initialMap012Encounter(), { x: 0, z: 0, health: 100, harvestedGlass: 5, defeatedStalkers: 0, interacted: false, now: 12_000 });
    const locked = resolveMap012Encounter(elite.memory, { x: MAP012_WIND_MONOLITH.x, z: MAP012_WIND_MONOLITH.z, health: 100, harvestedGlass: 9, defeatedStalkers: 0, interacted: true, now: 12_000 });
    const telegraph = resolveMap012Encounter(elite.memory, { x: MAP012_WIND_MONOLITH.x, z: MAP012_WIND_MONOLITH.z, health: 100, harvestedGlass: 10, defeatedStalkers: 0, interacted: true, now: 12_000 });
    const boss = resolveMap012Encounter(telegraph.memory, { x: MAP012_WIND_MONOLITH.x, z: MAP012_WIND_MONOLITH.z, health: 100, harvestedGlass: 10, defeatedStalkers: 0, interacted: false, now: 14_700 });
    expect(elite.activateElite).toBe(true);
    expect(locked.activateBoss).toBe(false);
    expect(telegraph.memory.state).toBe("boss-telegraph");
    expect(boss.activateBoss).toBe(true);
  });
});
