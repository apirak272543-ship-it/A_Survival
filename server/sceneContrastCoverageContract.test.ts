import { describe, expect, it } from "vitest";
import { MAP_SCENE_TREATMENTS } from "../client/src/game/data/mapSceneTreatments";
import {
  auditSceneContrastCoverage,
  MIN_SCENE_CONTRAST_RATIO,
  SCENE_CONTRAST_COVERAGE_VERSION,
} from "./sceneContrastCoverageContract";

describe("scene contrast coverage contract", () => {
  it("audits the canonical map scene treatments in stable map-id order", () => {
    const report = auditSceneContrastCoverage();

    expect(report.version).toBe(SCENE_CONTRAST_COVERAGE_VERSION);
    expect(report.source).toBe("MAP_SCENE_TREATMENTS");
    expect(report.totalScenes).toBe(Object.keys(MAP_SCENE_TREATMENTS).length);
    expect(report.snapshots.map(snapshot => snapshot.mapId)).toEqual([...Object.keys(MAP_SCENE_TREATMENTS)].sort());
    expect(report.snapshots.find(snapshot => snapshot.mapId === "obsidian-frontier")).toMatchObject({ colorsValid: true });
    expect(report.minimumObserved.terrainSkyContrast).toBeGreaterThanOrEqual(0);
    expect(report.minimumObserved.terrainFogContrast).toBeGreaterThanOrEqual(0);
    expect(report.minimumObserved.lightIntensity).toBeGreaterThanOrEqual(0);
    expect(report.blockers.every(blocker => blocker.code === "insufficient-terrain-sky-contrast" || blocker.code === "insufficient-terrain-fog-contrast")).toBe(true);
    expect(MIN_SCENE_CONTRAST_RATIO).toBe(1.15);
  });

  it("keeps the audit source-level and explicitly denies runtime side effects", () => {
    const report = auditSceneContrastCoverage();

    expect(report.policy).toEqual({
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      runtimeScreenshot: false,
      deviceAcceptance: false,
    });
    expect(report.snapshots.every(snapshot => Number.isFinite(snapshot.terrainSkyContrast ?? 0))).toBe(true);
    expect(report.snapshots.every(snapshot => Number.isFinite(snapshot.terrainFogContrast ?? 0))).toBe(true);
    expect(report.snapshots.every(snapshot => Number.isFinite(snapshot.lightIntensity ?? 0))).toBe(true);
  });

  it("reports malformed scene colors and light intensity as blockers", () => {
    const treatments = {
      fixture: {
        ...MAP_SCENE_TREATMENTS["obsidian-frontier"],
        terrainColor: "not-a-color",
        lightIntensity: -1,
      },
    };
    const report = auditSceneContrastCoverage(treatments);

    expect(report.source).toBe("provided-treatments");
    expect(report.status).toBe("blocked");
    expect(report.snapshots).toEqual([
      { mapId: "fixture", terrainSkyContrast: null, terrainFogContrast: null, lightIntensity: null, colorsValid: false },
    ]);
    expect(report.blockers.map(blocker => blocker.code)).toEqual(["invalid-color", "invalid-light-intensity"]);
  });

  it("is deterministic and does not mutate caller-owned treatments", () => {
    const treatments = { "fixture-b": MAP_SCENE_TREATMENTS["map-002-ashen-obsidian-plains"], "fixture-a": MAP_SCENE_TREATMENTS["obsidian-frontier"] };
    const before = JSON.stringify(treatments);
    const first = auditSceneContrastCoverage(treatments);
    const second = auditSceneContrastCoverage(treatments);

    expect(JSON.stringify(treatments)).toBe(before);
    expect(first).toEqual(second);
    expect(first.snapshots.map(snapshot => snapshot.mapId)).toEqual(["fixture-a", "fixture-b"]);
  });
});
