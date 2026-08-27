import type { WorldPlantStage } from "../client/src/game/systems/worldFarmingSystem";

export const PLANT_STAGE_THRESHOLDS = {
  sprout: 0.25,
  young: 0.55,
  mature: 1,
} as const;

export type PlantLifecycleProfile = {
  plantId: string;
  growthDurationMs: number;
  matureOnlyReward: true;
  matureOnlyRepellent: true;
};

type PlantLifecycleIssueCode = "INVALID_PLANT_ID" | "INVALID_DURATION" | "INVALID_THRESHOLDS";

export type PlantLifecycleIssue = {
  code: PlantLifecycleIssueCode;
  message: string;
};

export type PlantLifecycleValidation = {
  valid: boolean;
  issues: PlantLifecycleIssue[];
};

export function validatePlantLifecycleProfile(profile: PlantLifecycleProfile): PlantLifecycleValidation {
  const issues: PlantLifecycleIssue[] = [];
  if (typeof profile.plantId !== "string" || profile.plantId.trim().length === 0) {
    issues.push({ code: "INVALID_PLANT_ID", message: "plantId must be a non-empty string" });
  }
  if (!Number.isFinite(profile.growthDurationMs) || profile.growthDurationMs < 30_000 || profile.growthDurationMs > 30 * 60 * 1000) {
    issues.push({ code: "INVALID_DURATION", message: "growthDurationMs must be between 30000 and 1800000" });
  }
  if (PLANT_STAGE_THRESHOLDS.sprout <= 0 || PLANT_STAGE_THRESHOLDS.sprout >= PLANT_STAGE_THRESHOLDS.young || PLANT_STAGE_THRESHOLDS.young >= PLANT_STAGE_THRESHOLDS.mature) {
    issues.push({ code: "INVALID_THRESHOLDS", message: "plant stage thresholds must be strictly increasing" });
  }
  if (profile.matureOnlyReward !== true || profile.matureOnlyRepellent !== true) {
    issues.push({ code: "INVALID_THRESHOLDS", message: "rewards and repellents must remain mature-only" });
  }
  return { valid: issues.length === 0, issues };
}

export function getPlantLifecycleStage(profile: PlantLifecycleProfile, elapsedMs: number): WorldPlantStage {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const progress = safeElapsed / Math.max(1, profile.growthDurationMs);
  if (progress < PLANT_STAGE_THRESHOLDS.sprout) return "seed";
  if (progress < PLANT_STAGE_THRESHOLDS.young) return "sprout";
  if (progress < PLANT_STAGE_THRESHOLDS.mature) return "young";
  return "mature";
}

export function canReleaseMaturePlantOutputs(profile: PlantLifecycleProfile, elapsedMs: number) {
  const stage = getPlantLifecycleStage(profile, elapsedMs);
  return { stage, rewardAvailable: profile.matureOnlyReward && stage === "mature", repellentAvailable: profile.matureOnlyRepellent && stage === "mature" };
}
