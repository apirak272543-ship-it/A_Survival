import { describe, expect, it } from "vitest";
import { MAP_SCENE_TREATMENTS } from "../client/src/game/data/mapSceneTreatments";

describe("Arcane Frontier scene identity", () => {
  it("covers all curated prototype map treatments including Obsidian Frontier", () => {
    expect(Object.keys(MAP_SCENE_TREATMENTS)).toHaveLength(15);
    expect(Object.keys(MAP_SCENE_TREATMENTS)).toContain("obsidian-frontier");
  });

  it("keeps treatment values mobile-safe and gives every map a unique landmark/event identity", () => {
    const treatments = Object.values(MAP_SCENE_TREATMENTS);
    expect(treatments.every(item => item.fogDensity > 0 && item.fogDensity <= 0.18 && item.lightIntensity <= 1.2)).toBe(true);
    expect(new Set(treatments.map(item => item.landmarkKind)).size).toBe(9);
    expect(treatments.every(item => item.hudPhrasing.length > 20 && item.ambientEvent.includes("·"))).toBe(true);
  });
});
