import { describe, expect, it } from "vitest";
import { MAP008_RUNE_TERMINAL, initialMap008Encounter, resolveMap008Encounter } from "../client/src/game/map008/encounter";

describe("MAP_008 Defense Sweep encounter", () => {
  it("applies laser damage outside the Rune Terminal and preserves temporary shield immunity inside", () => {
    const outside = resolveMap008Encounter(initialMap008Encounter(), { x: 0, z: 0, health: 100, harvestedRelics: 0, defeatedDrones: 0, interacted: false, now: 190_000 });
    const inside = resolveMap008Encounter(initialMap008Encounter(), { x: MAP008_RUNE_TERMINAL.x, z: MAP008_RUNE_TERMINAL.z, health: 100, harvestedRelics: 0, defeatedDrones: 0, interacted: false, now: 190_000 });
    expect(outside.sweepActive).toBe(true); expect(outside.laserDamagePerSecond).toBe(5); expect(inside.sheltered).toBe(true); expect(inside.laserDamagePerSecond).toBe(0); expect(inside.temporaryShieldActive).toBe(true);
  });

  it("reveals Ruin Guardian then telegraphs Matrix Overlord deterministically", () => {
    const elite = resolveMap008Encounter(initialMap008Encounter(), { x: 20, z: 20, health: 100, harvestedRelics: 3, defeatedDrones: 0, interacted: false, now: 100_000 });
    const telegraph = resolveMap008Encounter(elite.memory, { x: 32, z: 28, health: 100, harvestedRelics: 3, defeatedDrones: 0, interacted: true, now: 100_000 });
    const boss = resolveMap008Encounter(telegraph.memory, { x: 32, z: 28, health: 100, harvestedRelics: 3, defeatedDrones: 0, interacted: false, now: 102_700 });
    expect(elite.activateElite).toBe(true); expect(telegraph.memory.state).toBe("boss-telegraph"); expect(boss.activateBoss).toBe(true);
  });
});
