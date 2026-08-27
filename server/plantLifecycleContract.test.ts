import { describe, expect, it } from "vitest";
import { canReleaseMaturePlantOutputs, getPlantLifecycleStage, PLANT_STAGE_THRESHOLDS, validatePlantLifecycleProfile, type PlantLifecycleProfile } from "./plantLifecycleContract";

const profile: PlantLifecycleProfile = {
  plantId: "plant-crystal-fern",
  growthDurationMs: 120_000,
  matureOnlyReward: true,
  matureOnlyRepellent: true,
};

describe("plant lifecycle contract", () => {
  it("keeps deterministic seed, sprout, young and mature stage boundaries", () => {
    expect(validatePlantLifecycleProfile(profile)).toEqual({ valid: true, issues: [] });
    expect(getPlantLifecycleStage(profile, 0)).toBe("seed");
    expect(getPlantLifecycleStage(profile, profile.growthDurationMs * PLANT_STAGE_THRESHOLDS.sprout)).toBe("sprout");
    expect(getPlantLifecycleStage(profile, profile.growthDurationMs * PLANT_STAGE_THRESHOLDS.young)).toBe("young");
    expect(getPlantLifecycleStage(profile, profile.growthDurationMs)).toBe("mature");
    expect(getPlantLifecycleStage(profile, Number.NaN)).toBe("seed");
  });

  it("releases both reward and repellent output only at mature stage", () => {
    expect(canReleaseMaturePlantOutputs(profile, profile.growthDurationMs * 0.99)).toEqual({ stage: "young", rewardAvailable: false, repellentAvailable: false });
    expect(canReleaseMaturePlantOutputs(profile, profile.growthDurationMs)).toEqual({ stage: "mature", rewardAvailable: true, repellentAvailable: true });
  });

  it("rejects empty IDs, out-of-range durations and non-mature output policies", () => {
    const result = validatePlantLifecycleProfile({
      plantId: "",
      growthDurationMs: 1,
      matureOnlyReward: false,
      matureOnlyRepellent: false,
    });
    const codes = result.issues.map(issue => issue.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("INVALID_PLANT_ID");
    expect(codes).toContain("INVALID_DURATION");
    expect(codes).toContain("INVALID_THRESHOLDS");
  });
});
