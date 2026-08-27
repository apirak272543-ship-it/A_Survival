import { getPerformanceBudget } from "../client/src/game/systems/performanceProfile";
import { resolveAnimationMotionPolicy, type AnimationMotionInput, type AnimationMotionDecision } from "../client/src/game/systems/animationMotionPolicy";

export const ANIMATION_MOTION_PROFILE_CONTRACT_VERSION = "animation-motion-profile.v1" as const;

export type AnimationMotionProfileResult = {
  contractVersion: typeof ANIMATION_MOTION_PROFILE_CONTRACT_VERSION;
  valid: boolean;
  issues: string[];
  decision: AnimationMotionDecision;
  profile: {
    tier: AnimationMotionDecision["tier"];
    mode: AnimationMotionDecision["mode"];
    radiusMeters: number;
    updateIntervalMs: number | null;
    assetPolicy: AnimationMotionDecision["assetPolicy"];
    reusesExistingClip: boolean;
    generatedInRenderLoop: false;
    binaryAssetGenerated: false;
    deviceBenchmark: false;
  };
};

function expectedMode(decision: AnimationMotionDecision) {
  if (decision.reasons.includes("not-visible") || decision.reasons.includes("outside-radius")) return "sleep" as const;
  if (decision.reasons.includes("dead-state")) return "static" as const;
  if (decision.reasons.includes("reduced-motion") || decision.reasons.includes("far-visible")) return "reduced" as const;
  return "full" as const;
}

export function evaluateAnimationMotionProfile(input: AnimationMotionInput): AnimationMotionProfileResult {
  const decision = resolveAnimationMotionPolicy(input);
  const issues: string[] = [];
  const budget = getPerformanceBudget(decision.tier);
  if (decision.animationRadiusMeters !== budget.animationRadiusMeters) issues.push("animation radius does not match canonical performance budget");
  if (decision.mode !== expectedMode(decision)) issues.push(`animation mode is inconsistent with reasons: ${decision.mode}`);
  if (decision.mode === "full" && (decision.updateIntervalMs !== 16 || decision.animationLod !== "full")) issues.push("full animation mode must use 16ms/full LOD");
  if (decision.mode === "reduced" && (decision.updateIntervalMs !== 66 || decision.animationLod !== "reduced")) issues.push("reduced animation mode must use 66ms/reduced LOD");
  if ((decision.mode === "sleep" || decision.mode === "static") && (decision.updateIntervalMs !== null || decision.animationLod !== "static")) issues.push("sleep/static animation mode must not schedule animation updates");
  if (decision.claims.binaryAssetGenerated || decision.claims.generatedInRenderLoop || decision.claims.skeletonRetargeted || decision.claims.windSimulated || decision.claims.adaptiveTiering || decision.claims.deviceBenchmark || decision.claims.playerRuntimeMutation) issues.push("animation motion profile contains a forbidden capability claim");
  return {
    contractVersion: ANIMATION_MOTION_PROFILE_CONTRACT_VERSION,
    valid: issues.length === 0,
    issues,
    decision,
    profile: {
      tier: decision.tier,
      mode: decision.mode,
      radiusMeters: decision.animationRadiusMeters,
      updateIntervalMs: decision.updateIntervalMs,
      assetPolicy: decision.assetPolicy,
      reusesExistingClip: decision.assetPolicy === "reuse-clip",
      generatedInRenderLoop: false,
      binaryAssetGenerated: false,
      deviceBenchmark: false,
    },
  };
}
