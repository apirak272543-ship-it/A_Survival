import { describe, expect, it } from "vitest";
import { MAP002_PYROCLASTIC_ALTAR, MAP002_STORM_DURATION_MS, MAP002_TELEGRAPH_MS, initialMap002Encounter, resolveMap002Encounter } from "../client/src/game/map002/encounter";

describe("MAP_002 Ash Storm encounter", () => {
  it("starts deterministic storm conditions with speed and rare-drop modifiers", () => {
    const result = resolveMap002Encounter(initialMap002Encounter(), { x: 9, z: 4, health: 100, harvestedResources: 0, defeatedAshCrawlers: 0, interacted: false, now: 1 });
    expect(result).toMatchObject({ event: "ash-storm", stormActive: true, spawnAshCrawlers: 2, enemySpeedMultiplier: 1.2, rareDropMultiplier: 2 });
  });

  it("awakens the elite after resource threshold without treating distinct instances as duplicates", () => {
    const result = resolveMap002Encounter(initialMap002Encounter(), { x: 4, z: 9, health: 100, harvestedResources: 3, defeatedAshCrawlers: 0, interacted: false, now: MAP002_STORM_DURATION_MS + 1 });
    expect(result).toMatchObject({ event: "elite-awakened", activateElite: true, stormActive: false });
  });

  it("requires storm altar interaction and a telegraph before the boss becomes active", () => {
    const start = resolveMap002Encounter(initialMap002Encounter(), { x: MAP002_PYROCLASTIC_ALTAR.x, z: MAP002_PYROCLASTIC_ALTAR.z, health: 100, harvestedResources: 0, defeatedAshCrawlers: 0, interacted: true, now: 10 });
    const active = resolveMap002Encounter(start.memory, { x: MAP002_PYROCLASTIC_ALTAR.x, z: MAP002_PYROCLASTIC_ALTAR.z, health: 100, harvestedResources: 0, defeatedAshCrawlers: 0, interacted: false, now: 10 + MAP002_TELEGRAPH_MS });
    expect(start.activateBoss).toBe(false);
    expect(active).toMatchObject({ event: "pyroclastic-behemoth", activateBoss: true });
  });

  it("keeps the active boss encounter alive after the telegraph tick has completed", () => {
    const memory = { ...initialMap002Encounter(), state: "boss-active" as const, eliteAwakened: true };
    const result = resolveMap002Encounter(memory, { x: 60, z: 60, health: 100, harvestedResources: 0, defeatedAshCrawlers: 0, interacted: false, now: MAP002_STORM_DURATION_MS + 1 });
    expect(result).toMatchObject({ activateBoss: true, activateElite: true, warning: "PYROCLASTIC BEHEMOTH ENGAGED · keep moving" });
    expect(result.memory.state).toBe("boss-active");
  });
});
