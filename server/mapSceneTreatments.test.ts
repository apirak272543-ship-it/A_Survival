import { describe, expect, it } from "vitest";
import { MAP_SCENE_TREATMENTS } from "../client/src/game/data/mapSceneTreatments";

describe("MAP_002–MAP_010 scene identity", () => {
  it("covers exactly the nine curated prototype maps after MAP_001", () => {
    expect(Object.keys(MAP_SCENE_TREATMENTS)).toHaveLength(9);
    expect(Object.keys(MAP_SCENE_TREATMENTS)).not.toContain("obsidian-frontier");
    expect(Object.keys(MAP_SCENE_TREATMENTS)).not.toContain("map-011");
  });

  it("keeps treatment values mobile-safe and gives every map a unique landmark/event identity", () => {
    const treatments = Object.values(MAP_SCENE_TREATMENTS);
    expect(treatments.every(item => item.fogDensity > 0 && item.fogDensity <= 0.18 && item.lightIntensity <= 1.2)).toBe(true);
    expect(new Set(treatments.map(item => item.landmarkKind)).size).toBe(9);
    expect(treatments.every(item => item.hudPhrasing.length > 20 && item.ambientEvent.includes("·"))).toBe(true);
  });
});
