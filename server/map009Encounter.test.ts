import { describe, expect, it } from "vitest";
import { MAP009_CANOPY_HAVEN, initialMap009Encounter, resolveMap009Encounter } from "../client/src/game/map009/encounter";

describe("MAP_009 Toxic Downpour encounter", () => {
  it("applies toxin damage outside the Canopy Haven and keeps canopy protection immune", () => {
    const outside = resolveMap009Encounter(initialMap009Encounter(), { x: 0, z: 0, health: 100, harvestedBlooms: 0, defeatedStalkers: 0, interacted: false, now: 110_000 });
    const inside = resolveMap009Encounter(initialMap009Encounter(), { x: MAP009_CANOPY_HAVEN.x, z: MAP009_CANOPY_HAVEN.z, health: 100, harvestedBlooms: 0, defeatedStalkers: 0, interacted: false, now: 110_000 });
    expect(outside.downpourActive).toBe(true); expect(outside.toxinDamagePerSecond).toBe(5); expect(inside.sheltered).toBe(true); expect(inside.toxinDamagePerSecond).toBe(0); expect(inside.canopyProtectionActive).toBe(true);
  });

  it("reveals Thornback Behemoth then telegraphs Verdant Hive Mind deterministically", () => {
    const elite = resolveMap009Encounter(initialMap009Encounter(), { x: 20, z: 20, health: 100, harvestedBlooms: 3, defeatedStalkers: 0, interacted: false, now: 200_000 });
    const telegraph = resolveMap009Encounter(elite.memory, { x: 32, z: 28, health: 100, harvestedBlooms: 3, defeatedStalkers: 0, interacted: true, now: 200_000 });
    const boss = resolveMap009Encounter(telegraph.memory, { x: 32, z: 28, health: 100, harvestedBlooms: 3, defeatedStalkers: 0, interacted: false, now: 202_700 });
    expect(elite.activateElite).toBe(true); expect(telegraph.memory.state).toBe("boss-telegraph"); expect(boss.activateBoss).toBe(true);
  });
});
