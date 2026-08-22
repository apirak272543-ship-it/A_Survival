import { describe, expect, it } from "vitest";
import { MAP003_BLOOM_OFFSET_MS, MAP003_BLOOM_PERIOD_MS, MAP003_EMPRESS_SHRINE, MAP003_TELEGRAPH_MS, initialMap003Encounter, resolveMap003Encounter } from "../client/src/game/map003/encounter";

describe("MAP_003 Spore Bloom encounter", () => {
  const bloomNow = MAP003_BLOOM_PERIOD_MS - MAP003_BLOOM_OFFSET_MS;

  it("starts deterministic bloom modifiers with healing and enraged beetle reinforcements", () => {
    const result = resolveMap003Encounter(initialMap003Encounter(), { x: 1, z: 1, health: 100, harvestedCrystals: 0, defeatedBeetles: 0, interacted: false, now: bloomNow });
    expect(result).toMatchObject({ event: "spore-bloom", bloomActive: true, spawnBeetles: 2, healPerSecond: 5, enemySpeedMultiplier: 1.25 });
  });

  it("reveals the elite from distinct resource/combat progress without duplicate inventory assumptions", () => {
    const result = resolveMap003Encounter(initialMap003Encounter(), { x: 2, z: 2, health: 100, harvestedCrystals: 2, defeatedBeetles: 0, interacted: false, now: 1 });
    expect(result).toMatchObject({ event: "elite-revealed", activateElite: true });
  });

  it("requires bloom shrine telegraph and keeps the boss active after it begins", () => {
    const start = resolveMap003Encounter(initialMap003Encounter(), { x: MAP003_EMPRESS_SHRINE.x, z: MAP003_EMPRESS_SHRINE.z, health: 100, harvestedCrystals: 0, defeatedBeetles: 0, interacted: true, now: bloomNow });
    const active = resolveMap003Encounter(start.memory, { x: 30, z: 30, health: 100, harvestedCrystals: 0, defeatedBeetles: 0, interacted: false, now: bloomNow + MAP003_TELEGRAPH_MS });
    const persisted = resolveMap003Encounter(active.memory, { x: 44, z: -22, health: 100, harvestedCrystals: 0, defeatedBeetles: 0, interacted: false, now: bloomNow + MAP003_TELEGRAPH_MS + 5000 });
    expect(start.activateBoss).toBe(false);
    expect(active.activateBoss).toBe(true);
    expect(persisted.memory.state).toBe("boss-active");
  });
});
