import { describe, expect, it } from "vitest";
import { MAP013_THERON_BOARDWALK, MAP013_SULFUR_FALLS, initialMap013Encounter, resolveMap013Encounter } from "../client/src/game/map013/encounter";

describe("MAP_013 Brimstone Mire encounter", () => {
  it("corrodes outside Theron Boardwalk during sulfur geysers", () => {
    const outside = resolveMap013Encounter(initialMap013Encounter(), { x: 0, z: 0, health: 100, harvestedCrust: 0, defeatedLeapers: 0, interacted: false, now: 1_000 });
    const sheltered = resolveMap013Encounter(initialMap013Encounter(), { x: MAP013_THERON_BOARDWALK.x, z: MAP013_THERON_BOARDWALK.z, health: 100, harvestedCrust: 0, defeatedLeapers: 0, interacted: false, now: 1_000 });
    expect(outside.corrodeDamagePerSecond).toBe(4);
    expect(sheltered.corrodeDamagePerSecond).toBe(0);
    expect(outside.inventoryMutation).toBe(false);
  });

  it("requires elite and 10 Sulfur Crust before telegraphing Bile-Mother Vile", () => {
    const elite = resolveMap013Encounter(initialMap013Encounter(), { x: 0, z: 0, health: 100, harvestedCrust: 5, defeatedLeapers: 0, interacted: false, now: 12_000 });
    const locked = resolveMap013Encounter(elite.memory, { x: MAP013_SULFUR_FALLS.x, z: MAP013_SULFUR_FALLS.z, health: 100, harvestedCrust: 9, defeatedLeapers: 0, interacted: true, now: 12_000 });
    const telegraph = resolveMap013Encounter(elite.memory, { x: MAP013_SULFUR_FALLS.x, z: MAP013_SULFUR_FALLS.z, health: 100, harvestedCrust: 10, defeatedLeapers: 0, interacted: true, now: 12_000 });
    const boss = resolveMap013Encounter(telegraph.memory, { x: MAP013_SULFUR_FALLS.x, z: MAP013_SULFUR_FALLS.z, health: 100, harvestedCrust: 10, defeatedLeapers: 0, interacted: false, now: 14_700 });
    expect(elite.activateElite).toBe(true);
    expect(locked.activateBoss).toBe(false);
    expect(telegraph.memory.state).toBe("boss-telegraph");
    expect(boss.activateBoss).toBe(true);
  });
});
