import { describe, expect, it } from "vitest";
import { MAP011_FORGE_CAMP, MAP011_SMELTER_ARCH, initialMap011Encounter, resolveMap011Encounter } from "../client/src/game/map011/encounter";

describe("MAP_011 Cinder Caldera encounter", () => {
  it("damages outside Forgemaster Camp during lava vents but shelters inside", () => {
    const outside = resolveMap011Encounter(initialMap011Encounter(), { x: 0, z: 0, health: 100, harvestedBloom: 0, defeatedCrawlers: 0, interacted: false, now: 1_000 });
    const sheltered = resolveMap011Encounter(initialMap011Encounter(), { x: MAP011_FORGE_CAMP.x, z: MAP011_FORGE_CAMP.z, health: 100, harvestedBloom: 0, defeatedCrawlers: 0, interacted: false, now: 1_000 });
    const menuOpen = resolveMap011Encounter(initialMap011Encounter(), { x: 0, z: 0, health: 100, harvestedBloom: 0, defeatedCrawlers: 0, interacted: false, menuOpen: true, now: 1_000 });
    expect(outside.ventDamagePerSecond).toBe(5);
    expect(sheltered.ventDamagePerSecond).toBe(0);
    expect(menuOpen.ventDamagePerSecond).toBe(0);
    expect(outside.inventoryMutation).toBe(false);
  });

  it("requires elite and 10 Cinder Bloom before telegraphing Ignis Colossus", () => {
    const elite = resolveMap011Encounter(initialMap011Encounter(), { x: 0, z: 0, health: 100, harvestedBloom: 5, defeatedCrawlers: 0, interacted: false, now: 12_000 });
    const locked = resolveMap011Encounter(elite.memory, { x: MAP011_SMELTER_ARCH.x, z: MAP011_SMELTER_ARCH.z, health: 100, harvestedBloom: 9, defeatedCrawlers: 0, interacted: true, now: 12_000 });
    const telegraph = resolveMap011Encounter(elite.memory, { x: MAP011_SMELTER_ARCH.x, z: MAP011_SMELTER_ARCH.z, health: 100, harvestedBloom: 10, defeatedCrawlers: 0, interacted: true, now: 12_000 });
    const boss = resolveMap011Encounter(telegraph.memory, { x: MAP011_SMELTER_ARCH.x, z: MAP011_SMELTER_ARCH.z, health: 100, harvestedBloom: 10, defeatedCrawlers: 0, interacted: false, now: 14_700 });
    expect(elite.activateElite).toBe(true);
    expect(locked.activateBoss).toBe(false);
    expect(telegraph.memory.state).toBe("boss-telegraph");
    expect(boss.activateBoss).toBe(true);
  });
});
