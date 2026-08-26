import { describe, expect, it } from "vitest";
import { DEFAULT_IN_MAP_SETTINGS, VIEW_DISTANCE_BLOCKS, normalizeInMapSettings, TARGET_FPS_OPTIONS } from "../client/src/game/systems/cameraModes";

describe("in-map camera settings", () => {
  it("supports the three selectable camera modes and the bounded view-distance/FPS options", () => {
    expect(DEFAULT_IN_MAP_SETTINGS).toEqual({ cameraMode: "overhead", viewDistanceBlocks: 20, targetFps: 60 });
    expect(VIEW_DISTANCE_BLOCKS).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    expect(TARGET_FPS_OPTIONS).toEqual([5, 15, 30, 45, 60, 120]);
    expect(normalizeInMapSettings({ cameraMode: "first-person", viewDistanceBlocks: 50, targetFps: 120 })).toEqual({ cameraMode: "first-person", viewDistanceBlocks: 50, targetFps: 120 });
  });

  it("falls back safely for malformed legacy map settings", () => {
    expect(normalizeInMapSettings({ cameraMode: "unknown" as never, viewDistanceBlocks: 7 as never, targetFps: 999 as never })).toEqual(DEFAULT_IN_MAP_SETTINGS);
    expect(normalizeInMapSettings(undefined)).toEqual(DEFAULT_IN_MAP_SETTINGS);
  });
});
