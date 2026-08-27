import { describe, expect, it } from "vitest";
import { createDefaultSeparatedSettings, splitSettingsRecord, validateSettingsSeparation } from "./settingsSeparationContract";

describe("settings separation contract", () => {
  it("keeps global and in-map settings in separate deterministic records", () => {
    const separated = createDefaultSeparatedSettings();

    expect(separated.unknownKeys).toEqual([]);
    expect(Object.keys(separated.global).sort()).toEqual([
      "cameraDefaultMode",
      "effectIntensity",
      "language",
      "musicVolume",
      "performanceTier",
      "quality",
      "reducedMotion",
      "renderDistance",
      "sfxVolume",
      "touchOpacity",
      "touchPreference",
      "touchScale",
    ]);
    expect(Object.keys(separated.inMap).sort()).toEqual(["cameraMode", "targetFps", "viewDistanceBlocks"]);
    expect(validateSettingsSeparation(separated)).toEqual({ valid: true, issues: [] });
  });

  it("preserves unknown keys for explicit review instead of silently assigning them", () => {
    const separated = splitSettingsRecord({ language: "th", cameraMode: "side", creatorSecret: true });

    expect(separated.global).toEqual({ language: "th" });
    expect(separated.inMap).toEqual({ cameraMode: "side" });
    expect(separated.unknownKeys).toEqual(["creatorSecret"]);
  });

  it("rejects global records that contain in-map settings and vice versa", () => {
    const result = validateSettingsSeparation({
      global: { language: "th", cameraMode: "side", targetFps: 120 },
      inMap: { viewDistanceBlocks: 25, quality: "high" },
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      { key: "cameraMode", expected: "in-map", actual: "global", message: "cameraMode belongs to in-map settings" },
      { key: "targetFps", expected: "in-map", actual: "global", message: "targetFps belongs to in-map settings" },
      { key: "quality", expected: "global", actual: "in-map", message: "quality belongs to global settings" },
    ]);
  });
});
