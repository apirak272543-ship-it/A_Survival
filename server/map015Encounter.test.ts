import { describe, expect, it } from "vitest";
import { MAP015_FORGE_SHRINE, MAP015_PRIMAL_ANVIL, initialMap015Encounter, resolveMap015Encounter } from "../client/src/game/map015/encounter";

describe("MAP_015 Heart of the Crucible encounter", () => {
  it("drains stamina during core pulses but shelters at Forge Shrine", () => {
    const outside = resolveMap015Encounter(initialMap015Encounter(), { x: 20, z: 20, health: 100, harvestedEmber: 0, defeatedMyrmidons: 0, interacted: false, now: 1_000 });
    const sheltered = resolveMap015Encounter(initialMap015Encounter(), { x: MAP015_FORGE_SHRINE.x, z: MAP015_FORGE_SHRINE.z, health: 100, harvestedEmber: 0, defeatedMyrmidons: 0, interacted: false, now: 1_000 });
    expect(outside.staminaDrainPerSecond).toBe(8);
    expect(sheltered.staminaDrainPerSecond).toBe(2);
    expect(outside.inventoryMutation).toBe(false);
  });

  it("requires elite and 10 Primal Ember before telegraphing The Crucible Overlord", () => {
    const elite = resolveMap015Encounter(initialMap015Encounter(), { x: 20, z: 20, health: 100, harvestedEmber: 5, defeatedMyrmidons: 0, interacted: false, now: 12_000 });
    const locked = resolveMap015Encounter(elite.memory, { x: MAP015_PRIMAL_ANVIL.x, z: MAP015_PRIMAL_ANVIL.z, health: 100, harvestedEmber: 9, defeatedMyrmidons: 0, interacted: true, now: 12_000 });
    const telegraph = resolveMap015Encounter(elite.memory, { x: MAP015_PRIMAL_ANVIL.x, z: MAP015_PRIMAL_ANVIL.z, health: 100, harvestedEmber: 10, defeatedMyrmidons: 0, interacted: true, now: 12_000 });
    const boss = resolveMap015Encounter(telegraph.memory, { x: MAP015_PRIMAL_ANVIL.x, z: MAP015_PRIMAL_ANVIL.z, health: 100, harvestedEmber: 10, defeatedMyrmidons: 0, interacted: false, now: 15_100 });
    expect(elite.activateElite).toBe(true);
    expect(locked.activateBoss).toBe(false);
    expect(telegraph.memory.state).toBe("boss-telegraph");
    expect(boss.activateBoss).toBe(true);
  });
});
