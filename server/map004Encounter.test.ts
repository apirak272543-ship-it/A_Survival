import { describe, expect, it } from "vitest";
import { MAP004_ARCHON_DAIS, MAP004_LASER_OFFSET_MS, MAP004_LASER_PERIOD_MS, MAP004_REFRACTOR_NODE, MAP004_TELEGRAPH_MS, initialMap004Encounter, resolveMap004Encounter } from "../client/src/game/map004/encounter";

describe("MAP_004 Reflection Laser encounter", () => {
  const laserNow = MAP004_LASER_PERIOD_MS - MAP004_LASER_OFFSET_MS;
  it("starts deterministic laser pressure with a visible speed/damage modifier", () => {
    const result = resolveMap004Encounter(initialMap004Encounter(), { x: 12, z: 12, health: 100, harvestedShards: 0, defeatedGnats: 0, interacted: false, now: laserNow });
    expect(result).toMatchObject({ event: "laser-field", laserActive: true, laserDamagePerSecond: 5, playerSpeedMultiplier: 0.72, spawnGnats: 2 });
  });
  it("lets interaction at the refractor clear the active laser without deleting encounter progress", () => {
    const result = resolveMap004Encounter(initialMap004Encounter(), { x: MAP004_REFRACTOR_NODE.x, z: MAP004_REFRACTOR_NODE.z, health: 100, harvestedShards: 0, defeatedGnats: 0, interacted: true, now: laserNow });
    expect(result).toMatchObject({ laserActive: false, laserDamagePerSecond: 0, playerSpeedMultiplier: 1 });
  });
  it("requires elite progress and telegraph before a persistent Archon boss state", () => {
    const elite = resolveMap004Encounter(initialMap004Encounter(), { x: 1, z: 1, health: 100, harvestedShards: 3, defeatedGnats: 0, interacted: false, now: 1 });
    const telegraph = resolveMap004Encounter(elite.memory, { x: MAP004_ARCHON_DAIS.x, z: MAP004_ARCHON_DAIS.z, health: 100, harvestedShards: 3, defeatedGnats: 0, interacted: true, now: 1 });
    const active = resolveMap004Encounter(telegraph.memory, { x: 5, z: 5, health: 100, harvestedShards: 3, defeatedGnats: 0, interacted: false, now: 1 + MAP004_TELEGRAPH_MS });
    expect(active.activateBoss).toBe(true);
    expect(resolveMap004Encounter(active.memory, { x: 5, z: 5, health: 100, harvestedShards: 3, defeatedGnats: 0, interacted: false, now: 8000 }).memory.state).toBe("boss-active");
  });
});
