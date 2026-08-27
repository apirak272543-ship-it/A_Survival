import { normalizeTargetFps, normalizeViewDistanceBlocks, type TargetFps, type ViewDistanceBlocks } from "@/game/systems/renderDistance";

export const PERFORMANCE_TIERS = ["low", "balanced", "high"] as const;
export type PerformanceTier = (typeof PERFORMANCE_TIERS)[number];

export type PerformanceBudget = {
  tier: PerformanceTier;
  maxViewDistanceBlocks: ViewDistanceBlocks;
  maxTargetFps: TargetFps;
  mobSimulationRadiusMeters: number;
  animationRadiusMeters: number;
  physicsRadiusMeters: number;
  maxParticleCount: number;
  shadowQuality: "off" | "low" | "high";
  lodPolicy: "aggressive" | "balanced" | "detailed";
};

export const PERFORMANCE_BUDGETS: Record<PerformanceTier, PerformanceBudget> = {
  low: {
    tier: "low",
    maxViewDistanceBlocks: 15,
    maxTargetFps: 30,
    mobSimulationRadiusMeters: 24,
    animationRadiusMeters: 24,
    physicsRadiusMeters: 16,
    maxParticleCount: 80,
    shadowQuality: "off",
    lodPolicy: "aggressive",
  },
  balanced: {
    tier: "balanced",
    maxViewDistanceBlocks: 35,
    maxTargetFps: 60,
    mobSimulationRadiusMeters: 40,
    animationRadiusMeters: 48,
    physicsRadiusMeters: 32,
    maxParticleCount: 160,
    shadowQuality: "low",
    lodPolicy: "balanced",
  },
  high: {
    tier: "high",
    maxViewDistanceBlocks: 50,
    maxTargetFps: 120,
    mobSimulationRadiusMeters: 64,
    animationRadiusMeters: 96,
    physicsRadiusMeters: 64,
    maxParticleCount: 320,
    shadowQuality: "high",
    lodPolicy: "detailed",
  },
};

export function normalizePerformanceTier(value: unknown, fallback: PerformanceTier = "balanced"): PerformanceTier {
  return typeof value === "string" && PERFORMANCE_TIERS.includes(value as PerformanceTier) ? value as PerformanceTier : fallback;
}

export function getPerformanceBudget(tier: unknown, requestedViewDistanceBlocks?: unknown, requestedTargetFps?: unknown): PerformanceBudget & { viewDistanceBlocks: ViewDistanceBlocks; targetFps: TargetFps } {
  const profile = PERFORMANCE_BUDGETS[normalizePerformanceTier(tier)];
  const viewDistanceBlocks = normalizeViewDistanceBlocks(Math.min(profile.maxViewDistanceBlocks, Number(requestedViewDistanceBlocks ?? profile.maxViewDistanceBlocks)), profile.maxViewDistanceBlocks);
  const targetFps = normalizeTargetFps(Math.min(profile.maxTargetFps, Number(requestedTargetFps ?? profile.maxTargetFps)), profile.maxTargetFps);
  return { ...profile, viewDistanceBlocks, targetFps };
}

export function getPerformanceBudgetLabel(tier: unknown): string {
  const normalized = normalizePerformanceTier(tier);
  return normalized === "low" ? "ประหยัดอุปกรณ์" : normalized === "high" ? "คุณภาพสูง" : "สมดุล";
}
