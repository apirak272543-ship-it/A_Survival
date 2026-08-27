import { describe, expect, it } from "vitest";
import { canApplyInMapSettings, evaluateSettingsScopeBoundary, partitionSettings, validateSettingsScopeUpdate } from "./settingsScopeBoundaryContract";

describe("settings scope boundary contract", () => {
  it("partitions global settings from in-map camera/render settings", () => {
    const result = evaluateSettingsScopeBoundary({ language: "th", musicVolume: 70, cameraMode: "first-person", viewDistanceBlocks: 35, targetFps: 60 });

    expect(result.valid).toBe(true);
    expect(result.separate).toBe(true);
    expect(result.partition).toEqual({ global: { language: "th", musicVolume: 70 }, inMap: { cameraMode: "first-person", viewDistanceBlocks: 35, targetFps: 60 }, unknownKeys: [] });
    expect(result.runtimePolicy).toEqual({ globalWritePerformed: false, inMapWritePerformed: false, creatorControlExposed: false });
  });

  it("normalizes invalid in-map values while rejecting unknown keys", () => {
    const result = evaluateSettingsScopeBoundary({ cameraMode: "cinematic", viewDistanceBlocks: 999, targetFps: 999, experimentalGpuBoost: true });

    expect(result.valid).toBe(false);
    expect(result.partition.inMap).toEqual({ cameraMode: "overhead", viewDistanceBlocks: 20, targetFps: 60 });
    expect(result.partition.unknownKeys).toEqual(["experimentalGpuBoost"]);
    expect(result.issues).toEqual(["unknown settings key: experimentalGpuBoost"]);
  });

  it("allows keys only in their declared scope", () => {
    expect(validateSettingsScopeUpdate({ scope: "global", key: "musicVolume", value: 50 })).toMatchObject({ valid: true, issues: [] });
    expect(validateSettingsScopeUpdate({ scope: "in-map", key: "cameraMode", value: "side" })).toMatchObject({ valid: true, issues: [] });
    expect(validateSettingsScopeUpdate({ scope: "global", key: "cameraMode", value: "side" })).toMatchObject({ valid: false, issues: ["cameraMode is not allowed in global settings scope"] });
    expect(validateSettingsScopeUpdate({ scope: "in-map", key: "language", value: "en" })).toMatchObject({ valid: false, issues: ["language is not allowed in in-map settings scope"] });
  });

  it("applies in-map settings only from focused paused in-map screen", () => {
    expect(canApplyInMapSettings({ screen: "in-map", paused: true, focused: true })).toBe(true);
    expect(canApplyInMapSettings({ screen: "in-map", paused: false, focused: true })).toBe(false);
    expect(canApplyInMapSettings({ screen: "global", paused: true, focused: true })).toBe(false);
    expect(canApplyInMapSettings({ screen: "creator", paused: true, focused: true })).toBe(false);
    expect(partitionSettings(null).unknownKeys).toEqual([]);
  });
});
