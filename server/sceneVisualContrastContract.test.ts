import { describe, expect, it } from "vitest";
import { MAP_SCENE_TREATMENTS } from "../client/src/game/data/mapSceneTreatments";
import { validateSceneVisualContrast, validateSceneVisualContrastSet } from "./sceneVisualContrastContract";

describe("scene visual contrast contract", () => {
  it("accepts the active Obsidian treatment with terrain and light separation", () => {
    const result = validateSceneVisualContrast(MAP_SCENE_TREATMENTS["obsidian-frontier"]!);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.terrainSkyDistance).toBeGreaterThan(0.05);
    expect(result.terrainLightDistance).toBeGreaterThan(0.05);
  });

  it("reports the current low-contrast treatments deterministically", () => {
    const first = validateSceneVisualContrastSet(MAP_SCENE_TREATMENTS);
    const second = validateSceneVisualContrastSet(MAP_SCENE_TREATMENTS);

    expect(first).toEqual(second);
    expect(first.valid).toBe(false);
    expect(first.invalidMapIds).toEqual([
      "map-005-corrosive-acid-swamps",
      "map-007-frozen-obsidian-crevasses",
      "map-012-obsidian-spire-shelf",
      "map-014-magma-trench-bastion",
      "map-015-heart-of-the-crucible",
    ]);
  });

  it("rejects low contrast, invalid intensity and excessive glow", () => {
    const result = validateSceneVisualContrast({
      fogColor: "#000000",
      skyColor: "#101010",
      lightColor: "#111111",
      terrainColor: "#101010",
      lightIntensity: 2,
      glowIntensity: 0.8,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "LOW_TERRAIN_SKY_CONTRAST",
      "LOW_TERRAIN_LIGHT_CONTRAST",
      "INVALID_LIGHT_INTENSITY",
      "EXCESSIVE_GLOW",
    ]));
  });

  it("fails closed for malformed color input", () => {
    const result = validateSceneVisualContrast({
      fogColor: "transparent",
      skyColor: "#000000",
      lightColor: "#ffffff",
      terrainColor: "#111111",
      lightIntensity: 0.5,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({ code: "INVALID_COLOR", message: "fog, sky, light and terrain colors must be #RRGGBB values" });
  });
});
