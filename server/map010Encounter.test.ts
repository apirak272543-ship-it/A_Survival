import { describe, expect, it } from "vitest";
import { MAP010_SINGULARITY_GATE, MAP010_STABLE_PYLON, initialMap010Encounter, resolveMap010Encounter } from "../client/src/game/map010/encounter";

describe("MAP_010 Void Pulse encounter", () => {
  it("damages outside the Stable Rift Pylon but preserves health while pylon-shielded or menu-open", () => {
    const outside = resolveMap010Encounter(initialMap010Encounter(), { x: 0, z: 0, health: 100, harvestedEssence: 0, defeatedLarvae: 0, interacted: false, now: 1_000 });
    const protectedState = resolveMap010Encounter(initialMap010Encounter(), { x: MAP010_STABLE_PYLON.x, z: MAP010_STABLE_PYLON.z, health: 100, harvestedEssence: 0, defeatedLarvae: 0, interacted: false, now: 1_000 });
    const menuOpen = resolveMap010Encounter(initialMap010Encounter(), { x: 0, z: 0, health: 100, harvestedEssence: 0, defeatedLarvae: 0, interacted: false, menuOpen: true, now: 1_000 });
    expect(outside.voidDamagePerSecond).toBe(6); expect(protectedState.voidDamagePerSecond).toBe(0); expect(menuOpen.voidDamagePerSecond).toBe(0); expect(outside.inventoryMutation).toBe(false);
  });

  it("requires elite state and 10 Void Essence before telegraphing Void Singularity", () => {
    const elite = resolveMap010Encounter(initialMap010Encounter(), { x: 0, z: 0, health: 100, harvestedEssence: 5, defeatedLarvae: 0, interacted: false, now: 12_000 });
    const locked = resolveMap010Encounter(elite.memory, { x: MAP010_SINGULARITY_GATE.x, z: MAP010_SINGULARITY_GATE.z, health: 100, harvestedEssence: 9, defeatedLarvae: 0, interacted: true, now: 12_000 });
    const telegraph = resolveMap010Encounter(elite.memory, { x: MAP010_SINGULARITY_GATE.x, z: MAP010_SINGULARITY_GATE.z, health: 100, harvestedEssence: 10, defeatedLarvae: 0, interacted: true, now: 12_000 });
    const boss = resolveMap010Encounter(telegraph.memory, { x: MAP010_SINGULARITY_GATE.x, z: MAP010_SINGULARITY_GATE.z, health: 100, harvestedEssence: 10, defeatedLarvae: 0, interacted: false, now: 14_700 });
    expect(elite.activateElite).toBe(true); expect(locked.activateBoss).toBe(false); expect(telegraph.memory.state).toBe("boss-telegraph"); expect(boss.activateBoss).toBe(true);
  });
});
