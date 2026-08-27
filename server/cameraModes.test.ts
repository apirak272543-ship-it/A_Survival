import { describe, expect, it } from "vitest";
import { cameraRelativeMovement, CAMERA_MODE_OPTIONS, DEFAULT_IN_MAP_SETTINGS, getCameraModeOption, normalizeCameraMode, normalizeInMapSettings, TARGET_FPS_OPTIONS, VIEW_DISTANCE_BLOCKS } from "../client/src/game/systems/cameraModes";

describe("camera mode contract", () => {
  it("exposes player-selectable overhead, first-person and side modes", () => {
    expect(CAMERA_MODE_OPTIONS.map(option => option.id)).toEqual(["overhead", "first-person", "side"]);
    expect(getCameraModeOption("first-person").shortLabel).toBe("FIRST PERSON");
    expect(getCameraModeOption("unknown").id).toBe("overhead");
    expect(normalizeCameraMode("side")).toBe("side");
    expect(normalizeCameraMode("invalid")).toBe("overhead");
  });

  it("keeps movement camera-relative without changing the player coordinate contract", () => {
    const overheadForward = cameraRelativeMovement("overhead", 0, 1);
    expect(overheadForward.x).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(overheadForward.z).toBeCloseTo(Math.SQRT1_2, 5);
    const sideForward = cameraRelativeMovement("side", 0, 1);
    expect(sideForward.x).toBeCloseTo(0, 5);
    expect(sideForward.z).toBeCloseTo(1, 5);
    const firstPersonForward = cameraRelativeMovement("first-person", 0, 1, Math.PI / 2);
    expect(firstPersonForward.x).toBeCloseTo(1, 5);
    expect(firstPersonForward.z).toBeCloseTo(0, 5);
  });

  it("supports bounded in-map view-distance and FPS settings", () => {
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
