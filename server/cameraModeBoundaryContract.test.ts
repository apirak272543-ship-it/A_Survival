import { describe, expect, it } from "vitest";
import { evaluateCameraModeBoundary } from "./cameraModeBoundaryContract";

describe("camera mode boundary contract", () => {
  it("exposes all canonical camera modes with stable poses", () => {
    const overhead = evaluateCameraModeBoundary({ mode: "overhead", settings: { cameraMode: "overhead", viewDistanceBlocks: 20, targetFps: 60 } });
    const firstPerson = evaluateCameraModeBoundary({ mode: "first-person", settings: { cameraMode: "first-person", viewDistanceBlocks: 50, targetFps: 120 } });
    const side = evaluateCameraModeBoundary({ mode: "side", settings: { cameraMode: "side", viewDistanceBlocks: 10, targetFps: 30 } });

    expect(overhead).toMatchObject({ valid: true, mode: "overhead", usedModeFallback: false, usedSettingsFallback: false, settings: { cameraMode: "overhead", viewDistanceBlocks: 20, targetFps: 60 } });
    expect(firstPerson).toMatchObject({ valid: true, mode: "first-person", settings: { cameraMode: "first-person", viewDistanceBlocks: 50, targetFps: 120 } });
    expect(side).toMatchObject({ valid: true, mode: "side", settings: { cameraMode: "side", viewDistanceBlocks: 10, targetFps: 30 } });
    expect(overhead.supportedModes).toEqual(["overhead", "first-person", "side"]);
    expect(firstPerson.pose.radius).toBe(0.35);
    expect(side.pose.radius).toBe(15);
  });

  it("falls back safely for unknown mode and unsupported in-map values", () => {
    const result = evaluateCameraModeBoundary({ mode: "cinematic", settings: { cameraMode: "cinematic", viewDistanceBlocks: 999, targetFps: 999 } });

    expect(result.valid).toBe(true);
    expect(result.usedModeFallback).toBe(true);
    expect(result.usedSettingsFallback).toBe(true);
    expect(result.mode).toBe("overhead");
    expect(result.settings).toEqual({ cameraMode: "overhead", viewDistanceBlocks: 20, targetFps: 60 });
    expect(result.warnings).toEqual(["camera mode normalized to overhead", "in-map settings normalized to supported values"]);
  });

  it("keeps partial valid settings and default mode deterministic", () => {
    const first = evaluateCameraModeBoundary({ mode: undefined, settings: { viewDistanceBlocks: 35, targetFps: 45 } });
    const second = evaluateCameraModeBoundary({ mode: undefined, settings: { viewDistanceBlocks: 35, targetFps: 45 } });

    expect(second).toEqual(first);
    expect(first.mode).toBe("overhead");
    expect(first.settings).toEqual({ cameraMode: "overhead", viewDistanceBlocks: 35, targetFps: 45 });
  });

  it("normalizes malformed settings containers without throwing", () => {
    const result = evaluateCameraModeBoundary({ mode: null, settings: ["invalid"] });

    expect(result.valid).toBe(true);
    expect(result.usedModeFallback).toBe(true);
    expect(result.usedSettingsFallback).toBe(true);
    expect(result.settings).toEqual({ cameraMode: "overhead", viewDistanceBlocks: 20, targetFps: 60 });
  });
});
