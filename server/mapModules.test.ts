import { describe, expect, it } from "vitest";
import { MAP_REGISTRY, getMapDefinition } from "../client/src/game/data/maps";
import { getWorldLighting } from "../client/src/game/data/worldTime";

describe("Arcane Frontier curated map modules", () => {
  const firstTen = MAP_REGISTRY.slice(0, 10);

  it("keeps the first ten expeditions unique, selectable, and inside the required radius", () => {
    expect(firstTen).toHaveLength(10);
    expect(new Set(firstTen.map(map => map.id)).size).toBe(10);
    firstTen.forEach(map => {
      expect(map.status).toBe("prototype");
      expect(map.radiusMeters).toBeGreaterThanOrEqual(1000);
      expect(map.radiusMeters).toBeLessThanOrEqual(1500);
      expect(map.keyArt).toMatch(/^\/manus-storage\//);
    });
  });

  it("requires a complete expedition roster for every curated map", () => {
    firstTen.forEach(map => {
      expect(map.content.npc).not.toHaveLength(0);
      expect(map.content.monsters.map(monster => monster.role).sort()).toEqual(["elite", "event-boss", "regular"]);
      expect(map.eventBossName).toBe(map.content.monsters.find(monster => monster.role === "event-boss")?.name);
    });
  });

  it("uses the module time mode for cave and void exceptions", () => {
    expect(getMapDefinition("map-003-bioluminescent-caverns")?.timeMode).toBe("void");
    expect(getWorldLighting("map-003-bioluminescent-caverns").ambience).toBe("void-hum");
    expect(getWorldLighting("map-010-void-infused-rift").phase).toBe("night");
  });
});
