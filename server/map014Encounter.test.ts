import { describe, expect, it } from "vitest";
import { MAP014_CITADEL_GATE, MAP014_WARDEN_POST, initialMap014Encounter, resolveMap014Encounter } from "../client/src/game/map014/encounter";

describe("MAP_014 Magma Trench Bastion encounter", () => {
  it("damages on bridges during tremors but shelters at Warden Post", () => {
    const onBridge = resolveMap014Encounter(initialMap014Encounter(), { x: 4, z: -4, health: 100, harvestedMagma: 0, defeatedHounds: 0, interacted: false, now: 1_000 });
    const sheltered = resolveMap014Encounter(initialMap014Encounter(), { x: MAP014_WARDEN_POST.x, z: MAP014_WARDEN_POST.z, health: 100, harvestedMagma: 0, defeatedHounds: 0, interacted: false, now: 1_000 });
    expect(onBridge.trenchDamagePerSecond).toBe(7);
    expect(sheltered.trenchDamagePerSecond).toBe(0);
    expect(onBridge.inventoryMutation).toBe(false);
  });

  it("requires elite and 10 Hardened Magma before telegraphing Trench-Lord Baelrok", () => {
    const elite = resolveMap014Encounter(initialMap014Encounter(), { x: 0, z: 0, health: 100, harvestedMagma: 5, defeatedHounds: 0, interacted: false, now: 12_000 });
    const locked = resolveMap014Encounter(elite.memory, { x: MAP014_CITADEL_GATE.x, z: MAP014_CITADEL_GATE.z, health: 100, harvestedMagma: 9, defeatedHounds: 0, interacted: true, now: 12_000 });
    const telegraph = resolveMap014Encounter(elite.memory, { x: MAP014_CITADEL_GATE.x, z: MAP014_CITADEL_GATE.z, health: 100, harvestedMagma: 10, defeatedHounds: 0, interacted: true, now: 12_000 });
    const boss = resolveMap014Encounter(telegraph.memory, { x: MAP014_CITADEL_GATE.x, z: MAP014_CITADEL_GATE.z, health: 100, harvestedMagma: 10, defeatedHounds: 0, interacted: false, now: 14_700 });
    expect(elite.activateElite).toBe(true);
    expect(locked.activateBoss).toBe(false);
    expect(telegraph.memory.state).toBe("boss-telegraph");
    expect(boss.activateBoss).toBe(true);
  });
});
